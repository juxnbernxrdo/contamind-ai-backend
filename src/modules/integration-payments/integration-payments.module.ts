import { Module } from '@nestjs/common';
import { IntegrationPaymentsService } from './integration-payments.service';

@Module({
  providers: [IntegrationPaymentsService]
})
export class IntegrationPaymentsModule {}
