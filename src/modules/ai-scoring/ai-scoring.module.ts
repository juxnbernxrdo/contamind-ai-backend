import { Module } from '@nestjs/common';
import { AiScoringService } from './ai-scoring.service';

@Module({
  providers: [AiScoringService]
})
export class AiScoringModule {}
