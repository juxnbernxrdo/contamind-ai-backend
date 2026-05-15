import { Module } from '@nestjs/common';
import { AiAssistantService } from './ai-assistant.service';

@Module({
  providers: [AiAssistantService]
})
export class AiAssistantModule {}
