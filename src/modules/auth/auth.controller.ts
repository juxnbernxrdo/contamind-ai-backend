import { Controller, Post, Body, UseGuards, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { JwtGuard } from './guards/jwt.guard';
import { RequireReauthGuard } from './guards/require-reauth.guard';
import { CurrentUser } from './decorators/user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() registerDto: RegisterDto, @Req() req: any) {
    const ip = req.ip;
    const userAgent = req.headers['user-agent'] || '';
    return this.authService.register(registerDto, { ip, userAgent });
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto, @Req() req: any) {
    const ip = req.ip;
    const userAgent = req.headers['user-agent'] || '';
    return this.authService.login(loginDto, { ip, userAgent });
  }

  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() refreshDto: RefreshDto, @CurrentUser() user: any, @Req() req: any) {
    const ip = req.ip;
    const userAgent = req.headers['user-agent'] || '';
    return this.authService.refresh(user, refreshDto, { ip, userAgent });
  }

  @UseGuards(JwtGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@CurrentUser() user: any, @Body() body: any) {
    return this.authService.logout(user.id, body.refreshToken, { jti: user.jti, exp: user.exp });
  }

  /**
   * Emite un reauthToken de corta vida (5 min) previa verificación de password.
   * El cliente debe adjuntar este token en el body de operaciones sensibles
   * protegidas por RequireReauthGuard.
   *
   * Body: { password: "currentPassword" }
   * Response: { reauthToken: "eyJ..." }
   */
  @UseGuards(JwtGuard)
  @Post('reauth')
  @HttpCode(HttpStatus.OK)
  async reauth(@CurrentUser() user: any, @Body() body: { password: string }, @Req() req: any) {
    const context = { ip: req.ip, userAgent: req.headers['user-agent'] || '' };
    return this.authService.generateReauthToken(user.id, body.password, context);
  }

  /**
   * Cambia la contraseña del usuario.
   * Requiere: JWT válido + reauthToken (5 min) emitido por POST /auth/reauth.
   *
   * Body: { reauthToken, currentPassword, newPassword, newPasswordConfirm }
   */
  @UseGuards(JwtGuard, RequireReauthGuard)
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(@CurrentUser() user: any, @Body() dto: ChangePasswordDto, @Req() req: any) {
    const context = { ip: req.ip, userAgent: req.headers['user-agent'] || '' };
    return this.authService.changePassword(user.id, dto, context);
  }
}
