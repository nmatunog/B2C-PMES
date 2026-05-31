import { IsIn, IsOptional, IsString, IsUUID, Matches } from "class-validator";

/** Treasurer records recurring membership fee or monthly share capital in Accounting. */
export class RecordMembershipPaymentDto {
  @IsUUID()
  participantId!: string;

  @IsIn(["annual_fee", "share_capital"])
  paymentType!: "annual_fee" | "share_capital";

  /** Calendar year (annual_fee) or YYYY-MM (share_capital). Defaults to current period. */
  @IsOptional()
  @IsString()
  @Matches(/^(\d{4}|\d{4}-\d{2})$/)
  period?: string;
}
