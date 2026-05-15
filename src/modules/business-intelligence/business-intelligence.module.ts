import { Module } from '@nestjs/common';
import { BusinessIntelligenceService } from './business-intelligence.service';

@Module({
  providers: [BusinessIntelligenceService]
})
export class BusinessIntelligenceModule {}
