import { Controller, Get, Delete, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { JwtGuard } from './guards/jwt.guard';
import { CurrentUser } from './decorators/user.decorator';
import { AuthSessionService } from './auth-session.service';

@Controller('auth/sessions')
@UseGuards(JwtGuard)
export class AuthSessionController {
  constructor(private readonly sessionService: AuthSessionService) {}

  @Get()
  async listSessions(@CurrentUser() user: any) {
    return this.sessionService.listActiveSessions(user.id);
  }

  @Delete(':sessionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeSession(@CurrentUser() user: any, @Param('sessionId') sessionId: string) {
    return this.sessionService.revokeSessionById(user.id, sessionId);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeAllSessions(@CurrentUser() user: any) {
    return this.sessionService.revokeAllSessions(user.id);
  }
}
