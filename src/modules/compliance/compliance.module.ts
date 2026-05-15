import { Module } from '@nestjs/common';
import { ComplianceService } from './compliance.service';

@Module({
  providers: [ComplianceService]
})
export class ComplianceModule {}
