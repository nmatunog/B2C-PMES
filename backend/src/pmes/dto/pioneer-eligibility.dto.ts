import { IsOptional, IsString, MaxLength, MinLength } from "class-validator";

/**
 * Pioneer reclaim: match roster row by full name (same order as legacy import) + normalized TIN.
 * Use TIN `000000000` when the sheet had no TIN (must match how the row was imported).
 */
export class PioneerEligibilityDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  firstName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  middleName?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  lastName!: string;

  /** Digits only after normalization; missing-on-sheet rows use nine zeroes. */
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  tinNo!: string;
}
