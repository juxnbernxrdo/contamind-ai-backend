import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class DeviceFingerprintUtil {
  generate(context: any): string {
    const str = `${context.userAgent}-${context.ip}`;
    return crypto.createHash('sha256').update(str).digest('hex');
  }
}
