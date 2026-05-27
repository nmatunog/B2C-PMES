import { Body, Controller, Get, Headers, Post, Req } from "@nestjs/common";
import type { Request } from "express";
import { AuthService } from "../auth/auth.service";
import { MemberCheckoutDto } from "./dto/member-checkout.dto";
import { StoreWebhookDto } from "./dto/store-webhook.dto";
import { StoreService } from "./store.service";

@Controller()
export class StoreController {
  constructor(
    private readonly store: StoreService,
    private readonly auth: AuthService,
  ) {}

  @Get("store/catalog")
  getCatalog() {
    return this.store.getCatalog();
  }

  @Post("store/checkout")
  async memberCheckout(
    @Body() dto: MemberCheckoutDto,
    @Headers("authorization") authorization: string | undefined,
  ) {
    const firebaseUid = await this.auth.verifyMemberEmailBearer(authorization, dto.email);
    return this.store.checkoutMember(dto, firebaseUid);
  }

  /** External store webhook (Versa / future checkout) → accounting marketplace-sale. */
  @Post("integrations/store/checkout")
  checkoutWebhook(
    @Body() dto: StoreWebhookDto,
    @Headers("x-store-webhook-secret") secret: string | undefined,
    @Req() req: Request,
  ) {
    const fromNamedHeader = String(secret ?? req.headers["x-store-webhook-secret"] ?? "").trim();
    const headerSecret =
      fromNamedHeader ||
      String(req.headers.authorization ?? "")
        .replace(/^Bearer\s+/i, "")
        .trim();
    this.store.assertWebhookAuthorized(headerSecret);
    return this.store.checkoutWebhook(dto);
  }
}
