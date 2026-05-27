import {
  IsEmail,
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from "class-validator";

/** External store (e.g. Versa) → WebApp → Accounting marketplace-sale. */
export class StoreWebhookDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(256)
  externalId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  vendorCode!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  grossAmount!: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  salesAmount!: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  vendorPayableAmount!: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  cogsAmount?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  patronageAmount?: number;

  @IsOptional()
  @IsUUID()
  buyerParticipantId?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(320)
  buyerEmail?: string;

  @IsOptional()
  @IsISO8601()
  occurredAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  memo?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
