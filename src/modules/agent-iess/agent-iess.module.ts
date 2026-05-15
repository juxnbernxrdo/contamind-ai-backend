import { Module } from '@nestjs/common';
import { AgentIessService } from './agent-iess.service';

@Module({
  providers: [AgentIessService]
})
export class AgentIessModule {}
