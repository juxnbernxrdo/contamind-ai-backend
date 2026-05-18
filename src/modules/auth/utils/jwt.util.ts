import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class JwtUtil {
  private readonly keyVersion: string;

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {
    this.keyVersion = this.configService.get<string>('JWT_KEY_VERSION', 'v1');
  }

  generateAccessToken(payload: any): string {
    return this.jwtService.sign(
      { ...payload, jti: uuidv4(), kv: this.keyVersion },
      {
        algorithm: 'RS256',
        expiresIn: '15m',
      },
    );
  }

  generateRefreshToken(payload: any): string {
    return this.jwtService.sign(
      { ...payload, jti: uuidv4(), kv: this.keyVersion },
      {
        algorithm: 'RS256',
        expiresIn: '30d',
      },
    );
  }

  async verifyToken(token: string): Promise<any> {
    const decoded = this.jwtService.decode(token) as any;
    const kv = decoded?.kv || 'v1';

    // In a production environment, we would fetch the public key for 'kv' from a Secret Manager or Registry.
    // For this remediation, we expect JWT_PUBLIC_KEY to be the current one.
    // To support rotation, we could check for JWT_PUBLIC_KEY_${kv.toUpperCase()}
    const publicKey = this.configService.get<string>(`JWT_PUBLIC_KEY_${kv.toUpperCase()}`) || 
                      this.configService.get<string>('JWT_PUBLIC_KEY');

    if (!publicKey) {
      throw new InternalServerErrorException('Public key not found for version: ' + kv);
    }

    return this.jwtService.verifyAsync(token, {
      publicKey,
      algorithms: ['RS256'],
    });
  }
}
