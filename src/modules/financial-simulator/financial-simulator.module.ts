import { Module } from '@nestjs/common';
import { FinancialSimulatorService } from './financial-simulator.service';

@Module({
  providers: [FinancialSimulatorService]
})
export class FinancialSimulatorModule {}
