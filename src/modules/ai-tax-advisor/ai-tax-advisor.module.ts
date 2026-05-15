import { Module } from '@nestjs/common';
import { AiTaxAdvisorService } from './ai-tax-advisor.service';

@Module({
  providers: [AiTaxAdvisorService]
})
export class AiTaxAdvisorModule {}
