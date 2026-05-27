import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";

class CheckoutLineDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  sku!: string;

  @IsInt()
  @Min(1)
  @Max(99)
  quantity!: number;
}

export class MemberCheckoutDto {
  @IsEmail()
  @MaxLength(320)
  email!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CheckoutLineDto)
  items!: CheckoutLineDto[];
}
