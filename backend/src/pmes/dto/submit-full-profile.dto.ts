import { Type } from "class-transformer";
import { IsEmail, IsInt, IsOptional, IsString, Min, MinLength } from "class-validator";

/** Full B2C membership form as JSON string (nested sections from the official sheet). */
export class SubmitFullProfileDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(4)
  profileJson!: string;

  @IsOptional()
  @IsString()
  sheetFileName?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  /**
   * Last `profileRecordVersion` from GET /pmes/membership-lifecycle. When set, submit fails with 409 if the
   * row changed meanwhile (another tab, session, or staff edit).
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  expectedProfileRecordVersion?: number;
}
