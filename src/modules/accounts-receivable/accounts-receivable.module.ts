import { Module } from '@nestjs/common';
import { AccountsReceivableService } from './accounts-receivable.service';

@Module({
  providers: [AccountsReceivableService]
})
export class AccountsReceivableModule {}
