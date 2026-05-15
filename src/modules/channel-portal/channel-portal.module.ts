import { Module } from '@nestjs/common';
import { ChannelPortalService } from './channel-portal.service';

@Module({
  providers: [ChannelPortalService]
})
export class ChannelPortalModule {}
