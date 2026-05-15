import { Module } from '@nestjs/common';
import { EmployeesService } from './employees.service';

@Module({
  providers: [EmployeesService]
})
export class EmployeesModule {}
