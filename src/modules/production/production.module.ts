import { Module } from '@nestjs/common';
import { ProductionService } from './production.service';

@Module({
  providers: [ProductionService]
})
export class ProductionModule {}
