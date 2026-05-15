import { SetMetadata } from '@nestjs/common';

export const Require2FA = () => SetMetadata('require2FA', true);
