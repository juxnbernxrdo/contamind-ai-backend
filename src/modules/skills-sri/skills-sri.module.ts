import { Module } from '@nestjs/common';
import { SkillsSriService } from './skills-sri.service';

@Module({
  providers: [SkillsSriService]
})
export class SkillsSriModule {}
