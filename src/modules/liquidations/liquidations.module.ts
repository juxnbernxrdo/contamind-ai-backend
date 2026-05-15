import { Module } from '@nestjs/common';
import { LiquidationsService } from './liquidations.service';

@Module({
  providers: [LiquidationsService]
})
export class LiquidationsModule {}
