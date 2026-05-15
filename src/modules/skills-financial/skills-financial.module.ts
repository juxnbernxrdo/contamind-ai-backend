import { Module } from '@nestjs/common';
import { SkillsFinancialService } from './skills-financial.service';

@Module({
  providers: [SkillsFinancialService]
})
export class SkillsFinancialModule {}
