import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { PgPoolService } from './src/common/database/pg-pool.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const pgPool = app.get(PgPoolService);

  try {
    const res = await pgPool.query('SELECT version()');
    console.log('PG Pool Connection Success:', res.rows[0].version);
  } catch (err) {
    console.error('PG Pool Connection Failed:', err);
    process.exit(1);
  } finally {
    await app.close();
  }
}

bootstrap();
