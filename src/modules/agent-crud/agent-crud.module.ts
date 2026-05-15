import { Module } from '@nestjs/common';
import { AgentCrudService } from './agent-crud.service';

@Module({
  providers: [AgentCrudService]
})
export class AgentCrudModule {}
