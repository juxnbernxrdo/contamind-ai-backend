import { Module } from '@nestjs/common';
import { PurchasesService } from './purchases.service';

@Module({
  providers: [PurchasesService]
})
export class PurchasesModule {}
