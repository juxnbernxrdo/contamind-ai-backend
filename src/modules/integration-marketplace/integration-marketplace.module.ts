import { Module } from '@nestjs/common';
import { IntegrationMarketplaceService } from './integration-marketplace.service';

@Module({
  providers: [IntegrationMarketplaceService]
})
export class IntegrationMarketplaceModule {}
