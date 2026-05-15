import { Module } from '@nestjs/common';
import { IntegrationBceService } from './integration-bce.service';

@Module({
  providers: [IntegrationBceService]
})
export class IntegrationBceModule {}
