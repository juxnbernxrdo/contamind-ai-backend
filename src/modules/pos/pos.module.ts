import { Module } from '@nestjs/common';
import { PosService } from './pos.service';

@Module({
  providers: [PosService]
})
export class PosModule {}
