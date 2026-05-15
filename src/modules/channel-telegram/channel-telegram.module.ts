import { Module } from '@nestjs/common';
import { ChannelTelegramService } from './channel-telegram.service';

@Module({
  providers: [ChannelTelegramService]
})
export class ChannelTelegramModule {}
