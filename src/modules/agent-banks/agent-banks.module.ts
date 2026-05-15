import { Module } from '@nestjs/common';
import { AgentBanksService } from './agent-banks.service';

@Module({
  providers: [AgentBanksService]
})
export class AgentBanksModule {}
