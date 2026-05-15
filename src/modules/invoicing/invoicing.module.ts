import { Module } from '@nestjs/common';
import { InvoicingService } from './invoicing.service';

@Module({
  providers: [InvoicingService]
})
export class InvoicingModule {}
