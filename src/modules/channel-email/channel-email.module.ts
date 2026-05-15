import { Module } from '@nestjs/common';
import { ChannelEmailService } from './channel-email.service';

@Module({
  providers: [ChannelEmailService]
})
export class ChannelEmailModule {}
