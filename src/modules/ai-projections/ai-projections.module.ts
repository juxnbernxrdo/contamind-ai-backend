import { Module } from '@nestjs/common';
import { AiProjectionsService } from './ai-projections.service';

@Module({
  providers: [AiProjectionsService]
})
export class AiProjectionsModule {}
