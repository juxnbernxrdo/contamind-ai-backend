import { Module } from '@nestjs/common';
import { CrmService } from './crm.service';

@Module({
  providers: [CrmService]
})
export class CrmModule {}
