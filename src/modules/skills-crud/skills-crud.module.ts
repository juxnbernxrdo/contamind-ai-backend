import { Module } from '@nestjs/common';
import { SkillsCrudService } from './skills-crud.service';

@Module({
  providers: [SkillsCrudService]
})
export class SkillsCrudModule {}
