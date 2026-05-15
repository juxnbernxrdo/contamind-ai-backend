import { Module } from '@nestjs/common';
import { RemissionGuidesService } from './remission-guides.service';

@Module({
  providers: [RemissionGuidesService]
})
export class RemissionGuidesModule {}
