import { IsString, MaxLength, MinLength } from "class-validator";

export class AdminLoginDto {
  @IsString()
  @MinLength(4)
  @MaxLength(128)
  code!: string;
}
