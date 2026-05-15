import { Module } from '@nestjs/common';
import { SkillsCommunicationService } from './skills-communication.service';

@Module({
  providers: [SkillsCommunicationService]
})
export class SkillsCommunicationModule {}
