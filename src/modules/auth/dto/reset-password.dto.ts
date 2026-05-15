import { IsString, IsEmail } from 'class-validator';
export class RequestPasswordResetDto {
  @IsEmail() email!: string;
}
export class ConfirmPasswordResetDto {
  @IsString() token!: string;
  @IsString() newPassword!: string;
}
