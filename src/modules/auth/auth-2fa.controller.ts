import {
  Controller,
  Post,
  Delete,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { Auth2FAService } from './auth-2fa.service';
import { JwtGuard } from './guards/jwt.guard';
import { CurrentUser } from './decorators/user.decorator';
import { Setup2FADto } from './dto/setup-2fa.dto';
import { Verify2FADto } from './dto/verify-2fa.dto';

@Controller('auth/2fa')
export class Auth2FAController {
  constructor(private readonly twoFaService: Auth2FAService) {}

  /**
   * POST /auth/2fa/setup
   * Retorna secreto TOTP + QR para que el usuario configure 2FA
   */
  @Post('setup')
  @UseGuards(JwtGuard)
  async setupTotp(@CurrentUser() user: any) {
    return this.twoFaService.generateSetup(user.id);
  }

  /**
   * POST /auth/2fa/activate
   * Activa 2FA verificando el token TOTP (user escaneó el QR)
   */
  @Post('activate')
  @UseGuards(JwtGuard)
  @HttpCode(HttpStatus.OK)
  async activateTotp(
    @CurrentUser() user: any,
    @Body() dto: Setup2FADto,
  ) {
    // dto.token es el código de 6 dígitos
    // Generamos backup codes en el servicio
    const setupData = await this.twoFaService.generateSetup(user.id);
    const backupCodes = setupData.backupCodes;
    
    try {
      await this.twoFaService.activateTotp(user.id, dto.token, backupCodes);
    } catch (err) {
      throw new UnauthorizedException('Invalid TOTP token. Please try again.');
    }

    return {
      message: '2FA activated successfully',
      backupCodes, // Mostrar al usuario una sola vez
    };
  }

  /**
   * POST /auth/2fa/verify
   * Verifica un TOTP o backup code (para login con 2FA)
   */
  @Post('verify')
  @UseGuards(JwtGuard)
  @HttpCode(HttpStatus.OK)
  async verifyToken(
    @CurrentUser() user: any,
    @Body() dto: Verify2FADto,
  ) {
    if (dto.totpToken) {
      const isValid = await this.twoFaService.verifyTotp(user.id, dto.totpToken);
      if (!isValid) {
        throw new UnauthorizedException('Invalid TOTP token');
      }
      return { verified: true, method: 'totp' };
    }

    if (dto.backupCode) {
      const isValid = await this.twoFaService.verifyBackupCode(user.id, dto.backupCode);
      if (!isValid) {
        throw new UnauthorizedException('Invalid or already-used backup code');
      }
      return { verified: true, method: 'backup_code' };
    }

    throw new BadRequestException('Provide either totpToken or backupCode');
  }

  /**
   * DELETE /auth/2fa
   * Desactiva 2FA (requiere verificación actual)
   */
  @Delete()
  @UseGuards(JwtGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async disable2FA(
    @CurrentUser() user: any,
    @Body() dto: Setup2FADto, // Reutiliza para recibir token de verificación
  ) {
    try {
      await this.twoFaService.disable2FA(user.id, dto.token, {});
    } catch (err) {
      throw new UnauthorizedException('Could not disable 2FA. Verify your token.');
    }

    return { message: '2FA disabled' };
  }
}
