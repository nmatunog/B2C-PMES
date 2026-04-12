import { IsEmail } from "class-validator";

export class UpdateMemberLoginEmailDto {
  /** Current Firebase / Participant email (must match ID token). */
  @IsEmail()
  email!: string;

  @IsEmail()
  newEmail!: string;
}
