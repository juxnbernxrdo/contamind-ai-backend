import { Module } from '@nestjs/common';
import { TaxCalendarService } from './tax-calendar.service';

@Module({
  providers: [TaxCalendarService]
})
export class TaxCalendarModule {}
