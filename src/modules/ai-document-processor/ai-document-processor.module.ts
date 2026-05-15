import { Module } from '@nestjs/common';
import { AiDocumentProcessorService } from './ai-document-processor.service';

@Module({
  providers: [AiDocumentProcessorService]
})
export class AiDocumentProcessorModule {}
