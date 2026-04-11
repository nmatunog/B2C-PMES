import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

/** Body for POST /auth/sync-member — Firebase identity → PostgreSQL Participant row. */
export class SyncMemberDto {
  @IsString()
  @MinLength(10)
  @MaxLength(128)
  uid!: string;

  @IsEmail()
  @MaxLength(320)
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  fullName?: string;
}
