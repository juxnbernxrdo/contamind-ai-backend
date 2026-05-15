import { Module } from '@nestjs/common';
import { TimesheetsService } from './timesheets.service';

@Module({
  providers: [TimesheetsService]
})
export class TimesheetsModule {}
