import { Module } from '@nestjs/common';
import { SubcontractorsService } from './subcontractors.service';

@Module({
  providers: [SubcontractorsService]
})
export class SubcontractorsModule {}
