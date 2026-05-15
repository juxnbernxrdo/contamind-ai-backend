import { Module } from '@nestjs/common';
import { ContactsService } from './contacts.service';

@Module({
  providers: [ContactsService]
})
export class ContactsModule {}
