import { Module } from '@nestjs/common';
import { ChannelWhatsappService } from './channel-whatsapp.service';

@Module({
  providers: [ChannelWhatsappService]
})
export class ChannelWhatsappModule {}
