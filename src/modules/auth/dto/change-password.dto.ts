import { IsString, MinLength, Matches } from 'class-validator';
export class ChangePasswordDto {
  @IsString() currentPassword!: string;
  @IsString() @MinLength(12)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
  newPassword!: string;
  @IsString() newPasswordConfirm!: string;
}
