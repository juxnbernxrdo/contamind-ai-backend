import { Controller, Post, Body, UseGuards, Param, Patch } from '@nestjs/common';
import { AuthDelegationService } from './auth-delegation.service';
import { JwtGuard } from './guards/jwt.guard';
import { CurrentUser } from './decorators/user.decorator';
import { AuthM2MService } from './auth-m2m.service';

@Controller('auth/delegation')
export class AuthDelegationController {
  constructor(
    private readonly delegationService: AuthDelegationService,
    private readonly m2mService: AuthM2MService,
  ) {}

  @Post('grants')
  @UseGuards(JwtGuard)
  async createGrant(
    @CurrentUser() user: any,
    @Body('agentName') agentName: string,
    @Body('actionScope') actionScope: string,
    @Body('contextMetadata') contextMetadata: any,
  ) {
    return this.delegationService.createPendingGrant(
      user.tenantId,
      user.id,
      agentName,
      actionScope,
      contextMetadata,
    );
  }

  @Patch('grants/:grantId/sign')
  @UseGuards(JwtGuard)
  async signGrant(
    @CurrentUser() user: any,
    @Param('grantId') grantId: string,
    @Body('totpToken') totpToken: string,
  ) {
    return this.delegationService.signGrantWithMFA(user.id, grantId, totpToken);
  }

  // This endpoint would normally be called by the Agent, authenticated with an ApiKey or similar,
  // but for testing the MVP, we just accept the agent's ID and a 'secretKey'.
  @Post('m2m/token')
  async getAgentToken(
    @Body('agentId') agentId: string,
    @Body('secretKey') secretKey: string,
    @Body('grantId') grantId: string,
  ) {
    const token = await this.m2mService.issueAgentToken(agentId, secretKey, grantId);
    return { accessToken: token };
  }
}
