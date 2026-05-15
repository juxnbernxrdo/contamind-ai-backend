import { Module } from '@nestjs/common';
import { AccountsPayableService } from './accounts-payable.service';

@Module({
  providers: [AccountsPayableService]
})
export class AccountsPayableModule {}
