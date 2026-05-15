import { Module } from '@nestjs/common';
import { AgentStudioService } from './agent-studio.service';

@Module({
  providers: [AgentStudioService]
})
export class AgentStudioModule {}
