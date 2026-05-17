import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class JwtUtil {
  constructor(private jwtService: JwtService) {}

  generateAccessToken(payload: any): string {
    return this.jwtService.sign({ ...payload, jti: uuidv4() }, { expiresIn: '15m' });
  }

  generateRefreshToken(payload: any): string {
    return this.jwtService.sign({ ...payload, jti: uuidv4() }, { expiresIn: '30d' });
  }

  async verifyToken(token: string): Promise<any> {
    return this.jwtService.verifyAsync(token);
  }
}
