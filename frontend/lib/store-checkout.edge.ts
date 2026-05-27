import { randomUUID } from "crypto";
import type { getSql } from "@/lib/db";
import { postMarketplaceSale } from "@/lib/accounting-integration";
import { catalogForApi, findCatalogItem } from "@/lib/store-catalog";

type Sql = ReturnType<typeof getSql>;

type CheckoutLine = { sku: string; quantity: number };

export function getStoreCatalogResponse() {
  return { items: catalogForApi(), currency: "PHP" };
}

function resolveLines(items: CheckoutLine[]) {
  let vendorCode: string | null = null;
  let grossAmount = 0;
  let salesAmount = 0;
  let vendorPayableAmount = 0;
  let cogsAmount = 0;
  let patronageAmount = 0;
  const lines: Array<{
    sku: string;
    name: string;
    quantity: number;
    unitPrice: number;
    lineGross: number;
  }> = [];

  for (const item of items) {
    const catalog = findCatalogItem(item.sku);
    if (!catalog) {
      throw new Error(`Unknown product SKU: ${item.sku}`);
    }
    if (vendorCode && vendorCode !== catalog.vendorCode) {
      throw new Error("Checkout supports one vendor per order — split carts by vendor");
    }
    vendorCode = catalog.vendorCode;
    const qty = item.quantity;
    const lineGross = catalog.unitPrice * qty;
    grossAmount += lineGross;
    salesAmount += catalog.salesPerUnit * qty;
    vendorPayableAmount += catalog.vendorPayablePerUnit * qty;
    cogsAmount += catalog.cogsPerUnit * qty;
    patronageAmount += catalog.patronagePerUnit * qty;
    lines.push({
      sku: catalog.sku,
      name: catalog.name,
      quantity: qty,
      unitPrice: catalog.unitPrice,
      lineGross,
    });
  }

  if (!vendorCode || grossAmount <= 0) {
    throw new Error("Cart is empty");
  }

  const memo = `Coop store — ${lines.map((l) => `${l.quantity}× ${l.name}`).join(", ")}`;
  return { vendorCode, lines, grossAmount, salesAmount, vendorPayableAmount, cogsAmount, patronageAmount, memo };
}

export async function memberStoreCheckout(
  sql: Sql,
  emailRaw: string,
  items: CheckoutLine[],
  firebaseUid: string | null,
) {
  const email = emailRaw.trim().toLowerCase();
  const rows = await sql`
    SELECT id, email, "firebaseUid", "memberIdNo"
    FROM "Participant"
    WHERE email = ${email}
    LIMIT 1
  `;
  const participant = rows[0] as
    | { id: string; email: string; firebaseUid: string | null; memberIdNo: string | null }
    | undefined;
  if (!participant) {
    throw new Error("NOT_FOUND: Member record not found — complete PMES sync first");
  }
  if (firebaseUid && participant.firebaseUid && participant.firebaseUid !== firebaseUid) {
    throw new Error("UNAUTHORIZED: Firebase account does not match member record");
  }

  const { vendorCode, lines, grossAmount, salesAmount, vendorPayableAmount, cogsAmount, patronageAmount, memo } =
    resolveLines(items);

  const orderId = randomUUID();
  const externalId = `order:${orderId}`;

  await sql`
    INSERT INTO "StoreOrder" (
      id, "externalId", "participantId", "vendorCode",
      "grossAmount", "salesAmount", "vendorPayableAmount",
      currency, status, "lineItems", memo, metadata
    ) VALUES (
      ${orderId},
      ${externalId},
      ${participant.id},
      ${vendorCode},
      ${grossAmount.toFixed(2)},
      ${salesAmount.toFixed(2)},
      ${vendorPayableAmount.toFixed(2)},
      'PHP',
      'FAILED',
      ${JSON.stringify(lines)}::jsonb,
      ${memo},
      ${JSON.stringify({
        channel: "member_portal",
        memberIdNo: participant.memberIdNo ?? undefined,
        email: participant.email,
        cogsAmount: cogsAmount.toFixed(2),
        patronageAmount: patronageAmount.toFixed(2),
      })}::jsonb
    )
  `;

  const accountingResult = await postMarketplaceSale({
    externalId,
    occurredAt: new Date().toISOString(),
    currency: "PHP",
    grossAmount,
    salesAmount,
    vendorPayableAmount,
    cogsAmount,
    patronageAmount,
    vendorCode,
    buyerParticipantId: participant.id,
    memo,
    metadata: { orderId, lineItems: lines, memberIdNo: participant.memberIdNo ?? undefined },
  });

  const status = accountingResult.ok ? "POSTED" : "FAILED";
  await sql`
    UPDATE "StoreOrder"
    SET status = ${status}::"StoreOrderStatus"
    WHERE id = ${orderId}
  `;

  if (!accountingResult.ok) {
    throw new Error(accountingResult.error ?? "Accounting post failed");
  }

  return {
    orderId,
    externalId,
    status,
    grossAmount: grossAmount.toFixed(2),
    currency: "PHP",
    accounting: accountingResult.body,
  };
}

export type StoreWebhookBody = {
  externalId: string;
  vendorCode: string;
  grossAmount: number;
  salesAmount: number;
  vendorPayableAmount: number;
  cogsAmount?: number;
  patronageAmount?: number;
  buyerParticipantId?: string;
  buyerEmail?: string;
  occurredAt?: string;
  memo?: string;
  metadata?: Record<string, unknown>;
};

export async function webhookStoreCheckout(sql: Sql, dto: StoreWebhookBody) {
  const gross = dto.grossAmount;
  const sales = dto.salesAmount;
  const payable = dto.vendorPayableAmount;
  const cogs = Number(dto.cogsAmount ?? 0);
  const patronage = Number(dto.patronageAmount ?? 0);
  if (Math.abs(gross - (sales + payable)) > 0.009) {
    throw new Error("grossAmount must equal salesAmount + vendorPayableAmount");
  }

  let participantId = dto.buyerParticipantId ?? null;
  if (!participantId && dto.buyerEmail?.trim()) {
    const rows = await sql`
      SELECT id FROM "Participant"
      WHERE email = ${dto.buyerEmail.trim().toLowerCase()}
      LIMIT 1
    `;
    participantId = (rows[0] as { id: string } | undefined)?.id ?? null;
  }

  const existingRows = await sql`
    SELECT id, status FROM "StoreOrder" WHERE "externalId" = ${dto.externalId} LIMIT 1
  `;
  const existing = existingRows[0] as { id: string; status: string } | undefined;
  if (existing?.status === "POSTED") {
    return { status: "already_posted", orderId: existing.id, externalId: dto.externalId };
  }

  const orderId = existing?.id ?? randomUUID();
  const lineItems =
    dto.metadata?.lineItems ?? [{ note: "external webhook", gross, sales, payable, cogs, patronage }];

  if (existing) {
    await sql`
      UPDATE "StoreOrder"
      SET
        "participantId" = ${participantId},
        "vendorCode" = ${dto.vendorCode.trim()},
        "grossAmount" = ${gross.toFixed(2)},
        "salesAmount" = ${sales.toFixed(2)},
        "vendorPayableAmount" = ${payable.toFixed(2)},
        "lineItems" = ${JSON.stringify(lineItems)}::jsonb,
        memo = ${dto.memo ?? null},
        metadata = ${JSON.stringify(dto.metadata ?? {})}::jsonb
      WHERE id = ${existing.id}
    `;
  } else {
    await sql`
      INSERT INTO "StoreOrder" (
        id, "externalId", "participantId", "vendorCode",
        "grossAmount", "salesAmount", "vendorPayableAmount",
        currency, status, "lineItems", memo, metadata
      ) VALUES (
        ${orderId},
        ${dto.externalId},
        ${participantId},
        ${dto.vendorCode.trim()},
        ${gross.toFixed(2)},
        ${sales.toFixed(2)},
        ${payable.toFixed(2)},
        'PHP',
        'FAILED',
        ${JSON.stringify(lineItems)}::jsonb,
        ${dto.memo ?? null},
        ${JSON.stringify({ ...(dto.metadata ?? {}), channel: "store_webhook" })}::jsonb
      )
    `;
  }

  const accountingResult = await postMarketplaceSale({
    externalId: dto.externalId,
    occurredAt: dto.occurredAt ?? new Date().toISOString(),
    currency: "PHP",
    grossAmount: gross,
    salesAmount: sales,
    vendorPayableAmount: payable,
    cogsAmount: cogs,
    patronageAmount: patronage,
    vendorCode: dto.vendorCode.trim(),
    buyerParticipantId: participantId ?? undefined,
    memo: dto.memo,
    metadata: dto.metadata,
  });

  const status = accountingResult.ok ? "POSTED" : "FAILED";
  await sql`
    UPDATE "StoreOrder"
    SET status = ${status}::"StoreOrderStatus"
    WHERE id = ${orderId}
  `;

  if (!accountingResult.ok) {
    throw new Error(accountingResult.error ?? "Accounting post failed");
  }

  return {
    status: accountingResult.created ? "created" : "already_posted",
    orderId,
    externalId: dto.externalId,
    accounting: accountingResult.body,
  };
}
