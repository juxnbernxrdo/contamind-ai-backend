import { IsString, Length } from 'class-validator';
export class Setup2FADto {
  @IsString() @Length(6, 6) token!: string; // TOTP token de 6 dígitos
}
