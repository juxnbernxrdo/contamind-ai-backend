import { Module } from '@nestjs/common';
import { ChannelsService } from './channels.service';

@Module({
  providers: [ChannelsService]
})
export class ChannelsModule {}
