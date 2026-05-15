import { Module } from '@nestjs/common';
import { AiAnomalyDetectionService } from './ai-anomaly-detection.service';

@Module({
  providers: [AiAnomalyDetectionService]
})
export class AiAnomalyDetectionModule {}
