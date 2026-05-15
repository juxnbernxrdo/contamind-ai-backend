import { Module } from '@nestjs/common';
import { PurchaseSettlementsService } from './purchase-settlements.service';

@Module({
  providers: [PurchaseSettlementsService]
})
export class PurchaseSettlementsModule {}
