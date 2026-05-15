import { Module } from '@nestjs/common';
import { BenchmarkingService } from './benchmarking.service';

@Module({
  providers: [BenchmarkingService]
})
export class BenchmarkingModule {}
