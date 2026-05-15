import { Module } from '@nestjs/common';
import { FixedAssetsService } from './fixed-assets.service';

@Module({
  providers: [FixedAssetsService]
})
export class FixedAssetsModule {}
