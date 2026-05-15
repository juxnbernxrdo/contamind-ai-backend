import { Module } from '@nestjs/common';
import { IntegrationBanksService } from './integration-banks.service';

@Module({
  providers: [IntegrationBanksService]
})
export class IntegrationBanksModule {}
