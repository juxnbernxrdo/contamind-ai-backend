import { Module } from '@nestjs/common';
import { PersonalFinanceService } from './personal-finance.service';

@Module({
  providers: [PersonalFinanceService]
})
export class PersonalFinanceModule {}
