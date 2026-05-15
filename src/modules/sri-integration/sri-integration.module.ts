import { Module } from '@nestjs/common';
import { SriIntegrationService } from './sri-integration.service';

@Module({
  providers: [SriIntegrationService]
})
export class SriIntegrationModule {}
