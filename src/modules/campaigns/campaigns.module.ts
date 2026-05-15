import { Module } from '@nestjs/common';
import { CampaignsService } from './campaigns.service';

@Module({
  providers: [CampaignsService]
})
export class CampaignsModule {}
