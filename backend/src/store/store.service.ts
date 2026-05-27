import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Prisma, StoreOrderStatus } from "@prisma/client";
import { randomUUID } from "crypto";
import { AccountingClientService } from "../integrations/accounting-client.service";
import { PrismaService } from "../prisma/prisma.service";
import type { MemberCheckoutDto } from "./dto/member-checkout.dto";
import type { StoreWebhookDto } from "./dto/store-webhook.dto";
import { catalogForApi, findCatalogItem } from "./store-catalog";

type ResolvedLine = {
  sku: string;
  name: string;
  quantity: number;
  unitPrice: number;
  lineGross: number;
  lineSales: number;
  linePayable: number;
  lineCogs: number;
  linePatronage: number;
};

@Injectable()
export class StoreService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accounting: AccountingClientService,
    private readonly config: ConfigService,
  ) {}

  getCatalog() {
    return {
      storeMode: "native_dev",
      items: catalogForApi(),
      currency: "PHP",
      note:
        "Native B2C Coop Store for development — checkout posts to accounting. Do not use Versa for ledger tests.",
    };
  }

  assertWebhookAuthorized(headerSecret: string | undefined) {
    const expected = String(this.config.get<string>("STORE_CHECKOUT_WEBHOOK_SECRET") ?? "").trim();
    if (!expected) {
      throw new UnauthorizedException("Store webhook is not configured (STORE_CHECKOUT_WEBHOOK_SECRET)");
    }
    const provided = String(headerSecret ?? "").trim();
    if (!provided || provided !== expected) {
      throw new UnauthorizedException("Invalid store webhook secret");
    }
  }

  async checkoutMember(dto: MemberCheckoutDto, firebaseUid: string | null) {
    const email = dto.email.trim().toLowerCase();
    const participant = await this.prisma.participant.findUnique({ where: { email } });
    if (!participant) {
      throw new NotFoundException("Member record not found — complete PMES sync first");
    }
    if (firebaseUid && participant.firebaseUid && participant.firebaseUid !== firebaseUid) {
      throw new UnauthorizedException("Firebase account does not match member record");
    }

    const { vendorCode, lines, grossAmount, salesAmount, vendorPayableAmount, cogsAmount, patronageAmount, memo } =
      this.resolveCatalogLines(dto.items);

    const orderId = randomUUID();
    const externalId = `order:${orderId}`;
    const lineItems = lines.map((l) => ({
      sku: l.sku,
      name: l.name,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      lineGross: l.lineGross,
      lineCogs: l.lineCogs,
      linePatronage: l.linePatronage,
    }));

    const existing = await this.prisma.storeOrder.findUnique({ where: { externalId } });
    if (existing) {
      throw new ConflictException("Duplicate checkout — retry with a new cart");
    }

    const order = await this.prisma.storeOrder.create({
      data: {
        id: orderId,
        externalId,
        participantId: participant.id,
        vendorCode,
        grossAmount,
        salesAmount,
        vendorPayableAmount,
        lineItems: lineItems as Prisma.InputJsonValue,
        memo,
        metadata: {
          channel: "member_portal",
          memberIdNo: participant.memberIdNo ?? undefined,
          email: participant.email,
        } as Prisma.InputJsonValue,
        status: StoreOrderStatus.FAILED,
      },
    });

    const accountingResult = await this.accounting.postMarketplaceSale({
      externalId,
      occurredAt: new Date().toISOString(),
      currency: "PHP",
      grossAmount: Number(grossAmount),
      salesAmount: Number(salesAmount),
      vendorPayableAmount: Number(vendorPayableAmount),
      cogsAmount: Number(cogsAmount),
      patronageAmount: Number(patronageAmount),
      vendorCode,
      buyerParticipantId: participant.id,
      memo,
      metadata: {
        orderId: order.id,
        lineItems,
        memberIdNo: participant.memberIdNo ?? undefined,
        cogsAmount: cogsAmount.toFixed(2),
        patronageAmount: patronageAmount.toFixed(2),
      },
    });

    const status = accountingResult.ok ? StoreOrderStatus.POSTED : StoreOrderStatus.FAILED;
    const updated = await this.prisma.storeOrder.update({
      where: { id: order.id },
      data: { status },
    });

    if (!accountingResult.ok) {
      throw new BadRequestException(
        accountingResult.error ?? "Accounting post failed — order saved as FAILED for retry",
      );
    }

    return {
      orderId: updated.id,
      externalId: updated.externalId,
      status: updated.status,
      grossAmount: updated.grossAmount.toFixed(2),
      currency: updated.currency,
      accounting: accountingResult.body,
    };
  }

  async checkoutWebhook(dto: StoreWebhookDto) {
    const gross = dto.grossAmount;
    const sales = dto.salesAmount;
    const payable = dto.vendorPayableAmount;
    const cogs = Number(dto.cogsAmount ?? 0);
    const patronage = Number(dto.patronageAmount ?? 0);
    if (Math.abs(gross - (sales + payable)) > 0.009) {
      throw new BadRequestException("grossAmount must equal salesAmount + vendorPayableAmount");
    }

    let participantId = dto.buyerParticipantId ?? null;
    if (!participantId && dto.buyerEmail?.trim()) {
      const p = await this.prisma.participant.findUnique({
        where: { email: dto.buyerEmail.trim().toLowerCase() },
        select: { id: true },
      });
      participantId = p?.id ?? null;
    }

    const existing = await this.prisma.storeOrder.findUnique({ where: { externalId: dto.externalId } });
    if (existing?.status === StoreOrderStatus.POSTED) {
      return {
        status: "already_posted",
        orderId: existing.id,
        externalId: existing.externalId,
      };
    }

    const orderId = existing?.id ?? randomUUID();
    const lineItems =
      (dto.metadata?.lineItems as unknown) ??
      [{ note: "external webhook", gross, sales, payable, cogs, patronage }];

    const order = existing
      ? await this.prisma.storeOrder.update({
          where: { id: existing.id },
          data: {
            participantId,
            vendorCode: dto.vendorCode.trim(),
            grossAmount: gross,
            salesAmount: sales,
            vendorPayableAmount: payable,
            lineItems: lineItems as Prisma.InputJsonValue,
            memo: dto.memo ?? null,
            metadata: (dto.metadata ?? {}) as Prisma.InputJsonValue,
          },
        })
      : await this.prisma.storeOrder.create({
          data: {
            id: orderId,
            externalId: dto.externalId,
            participantId,
            vendorCode: dto.vendorCode.trim(),
            grossAmount: gross,
            salesAmount: sales,
            vendorPayableAmount: payable,
            lineItems: lineItems as Prisma.InputJsonValue,
            memo: dto.memo ?? null,
            metadata: {
              ...(dto.metadata ?? {}),
              channel: "store_webhook",
            } as Prisma.InputJsonValue,
            status: StoreOrderStatus.FAILED,
          },
        });

    const accountingResult = await this.accounting.postMarketplaceSale({
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

    const status = accountingResult.ok ? StoreOrderStatus.POSTED : StoreOrderStatus.FAILED;
    await this.prisma.storeOrder.update({
      where: { id: order.id },
      data: { status },
    });

    if (!accountingResult.ok) {
      throw new BadRequestException(accountingResult.error ?? "Accounting post failed");
    }

    return {
      status: accountingResult.created ? "created" : "already_posted",
      orderId: order.id,
      externalId: order.externalId,
      accounting: accountingResult.body,
    };
  }

  private resolveCatalogLines(items: MemberCheckoutDto["items"]) {
    const lines: ResolvedLine[] = [];
    let vendorCode: string | null = null;
    let grossAmount = 0;
    let salesAmount = 0;
    let vendorPayableAmount = 0;
    let cogsAmount = 0;
    let patronageAmount = 0;

    for (const item of items) {
      const catalog = findCatalogItem(item.sku);
      if (!catalog) {
        throw new BadRequestException(`Unknown product SKU: ${item.sku}`);
      }
      if (vendorCode && vendorCode !== catalog.vendorCode) {
        throw new BadRequestException(
          "Checkout supports one vendor per order — split carts by vendor",
        );
      }
      vendorCode = catalog.vendorCode;

      const qty = item.quantity;
      const lineGross = catalog.unitPrice * qty;
      const lineSales = catalog.salesPerUnit * qty;
      const linePayable = catalog.vendorPayablePerUnit * qty;
      const lineCogs = catalog.cogsPerUnit * qty;
      const linePatronage = catalog.patronagePerUnit * qty;

      grossAmount += lineGross;
      salesAmount += lineSales;
      vendorPayableAmount += linePayable;
      cogsAmount += lineCogs;
      patronageAmount += linePatronage;

      lines.push({
        sku: catalog.sku,
        name: catalog.name,
        quantity: qty,
        unitPrice: catalog.unitPrice,
        lineGross,
        lineSales,
        linePayable,
        lineCogs,
        linePatronage,
      });
    }

    if (!vendorCode || grossAmount <= 0) {
      throw new BadRequestException("Cart is empty");
    }

    const names = lines.map((l) => `${l.quantity}× ${l.name}`).join(", ");
    return {
      vendorCode,
      lines,
      grossAmount: new Prisma.Decimal(grossAmount.toFixed(2)),
      salesAmount: new Prisma.Decimal(salesAmount.toFixed(2)),
      vendorPayableAmount: new Prisma.Decimal(vendorPayableAmount.toFixed(2)),
      cogsAmount: new Prisma.Decimal(cogsAmount.toFixed(2)),
      patronageAmount: new Prisma.Decimal(patronageAmount.toFixed(2)),
      memo: `Coop store — ${names}`,
    };
  }
}
