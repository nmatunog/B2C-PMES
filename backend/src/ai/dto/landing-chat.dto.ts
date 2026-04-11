import { IsIn, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class LandingChatDto {
  @IsString()
  @MinLength(1)
  @MaxLength(1200)
  message!: string;

  @IsOptional()
  @IsIn(["en", "ceb"])
  language?: "en" | "ceb";
}
