import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AIService, GeminiService } from './ai.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: AIService,
      useClass: GeminiService,
    },
  ],
  exports: [AIService],
})
export class AiModule {}
