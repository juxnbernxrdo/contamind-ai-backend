import { Module } from '@nestjs/common';
import { AiReconciliationService } from './ai-reconciliation.service';

@Module({
  providers: [AiReconciliationService]
})
export class AiReconciliationModule {}
