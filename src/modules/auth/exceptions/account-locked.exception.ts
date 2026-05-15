import { UnauthorizedException } from '@nestjs/common';

export class AccountLockedException extends UnauthorizedException {
  constructor() {
    super('Account locked due to multiple failed login attempts');
  }
}
