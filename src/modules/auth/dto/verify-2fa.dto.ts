import { IsString, IsOptional, Length } from 'class-validator';
export class Verify2FADto {
  @IsString() @IsOptional() @Length(6, 6) totpToken?: string;
  @IsString() @IsOptional() backupCode?: string;
}
