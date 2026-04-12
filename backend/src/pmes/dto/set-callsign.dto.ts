import { IsEmail, IsOptional, IsString, MaxLength } from "class-validator";

export class SetCallsignDto {
  @IsEmail()
  email!: string;

  /** Empty or null clears callsign and falls back to last-name alternate. */
  @IsOptional()
  @IsString()
  @MaxLength(32)
  callsign?: string;
}
