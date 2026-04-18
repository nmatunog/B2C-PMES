import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

/** Staff (admin or superuser): patch core `Participant` fields for support / corrections. */
export class AdminUpdateParticipantDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  fullName?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(320)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  dob?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  gender?: string;

  /** Digits only after normalize; empty clears when allowed */
  @IsOptional()
  @IsString()
  @MaxLength(32)
  tinNo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  mailingAddress?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  civilStatus?: string;
}
