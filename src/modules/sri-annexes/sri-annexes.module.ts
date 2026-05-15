import { Module } from '@nestjs/common';
import { SriAnnexesService } from './sri-annexes.service';

@Module({
  providers: [SriAnnexesService]
})
export class SriAnnexesModule {}
