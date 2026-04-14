import { IsEmail } from "class-validator";

export class PromoteStaffSuperuserDto {
  @IsEmail()
  email!: string;
}
