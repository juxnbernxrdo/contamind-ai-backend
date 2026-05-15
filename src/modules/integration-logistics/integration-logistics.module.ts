import { Module } from '@nestjs/common';
import { IntegrationLogisticsService } from './integration-logistics.service';

@Module({
  providers: [IntegrationLogisticsService]
})
export class IntegrationLogisticsModule {}
