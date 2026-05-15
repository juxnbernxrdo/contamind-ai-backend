import { Global, Module } from '@nestjs/common';
import { PgPoolService } from './pg-pool.service';

@Global()
@Module({
  providers: [PgPoolService],
  exports: [PgPoolService],
})
export class DatabaseModule {}
