import { Module } from '@nestjs/common';
import { RegulatoryAlertsService } from './regulatory-alerts.service';

@Module({
  providers: [RegulatoryAlertsService]
})
export class RegulatoryAlertsModule {}
