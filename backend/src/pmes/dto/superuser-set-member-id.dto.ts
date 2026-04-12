import { IsNotEmpty, IsString, MaxLength, MinLength } from "class-validator";

/** Superuser override for auto-generated cooperative member ID (e.g. wrong cohort digit). */
export class SuperuserSetMemberIdDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(4)
  @MaxLength(80)
  memberIdNo!: string;
}
