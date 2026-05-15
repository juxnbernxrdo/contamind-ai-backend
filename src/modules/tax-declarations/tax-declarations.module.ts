import { Module } from '@nestjs/common';
import { TaxDeclarationsService } from './tax-declarations.service';

@Module({
  providers: [TaxDeclarationsService]
})
export class TaxDeclarationsModule {}
