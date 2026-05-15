import { Module } from '@nestjs/common';
import { AgentSriService } from './agent-sri.service';

@Module({
  providers: [AgentSriService]
})
export class AgentSriModule {}
