import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { Pool, QueryResult, QueryResultRow } from 'pg';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PgPoolService implements OnModuleInit, OnModuleDestroy {
  private pool: Pool;
  private readonly logger = new Logger(PgPoolService.name);

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const connectionString = this.configService.get<string>('DIRECT_URL');
    
    this.pool = new Pool({
      connectionString,
      max: 10, // Máximo 10 conexiones reales
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    this.pool.on('error', (err) => {
      this.logger.error('Unexpected error on idle client', err.stack);
    });

    this.logger.log('Raw PG Pool initialized (Session Mode)');
  }

  async onModuleDestroy() {
    await this.pool.end();
    this.logger.log('Raw PG Pool closed');
  }

  /**
   * Raw Query - for performance-critical operations
   */
  async query<T extends QueryResultRow = any>(text: string, values?: any[]): Promise<QueryResult<T>> {
    return this.pool.query<T>(text, values);
  }

  /**
   * Transaction - for multi-query operations
   */
  async transaction<T>(callback: (client: any) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}
