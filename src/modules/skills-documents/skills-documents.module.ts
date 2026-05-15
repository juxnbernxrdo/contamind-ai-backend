import { Module } from '@nestjs/common';
import { SkillsDocumentsService } from './skills-documents.service';

@Module({
  providers: [SkillsDocumentsService]
})
export class SkillsDocumentsModule {}
