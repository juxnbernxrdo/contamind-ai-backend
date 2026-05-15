import { Module } from '@nestjs/common';
import { AgentSuperciasService } from './agent-supercias.service';

@Module({
  providers: [AgentSuperciasService]
})
export class AgentSuperciasModule {}
