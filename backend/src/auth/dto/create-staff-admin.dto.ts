import { IsEmail, IsString, MaxLength, MinLength } from "class-validator";

export class CreateStaffAdminDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;
}
