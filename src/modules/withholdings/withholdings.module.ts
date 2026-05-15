import { Module } from '@nestjs/common';
import { WithholdingsService } from './withholdings.service';

@Module({
  providers: [WithholdingsService]
})
export class WithholdingsModule {}
