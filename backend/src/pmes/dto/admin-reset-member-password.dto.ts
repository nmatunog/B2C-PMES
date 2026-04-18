import { IsString, MaxLength, MinLength } from "class-validator";

export class AdminResetMemberPasswordDto {
  @IsString()
  @MinLength(6)
  @MaxLength(128)
  newPassword!: string;
}
