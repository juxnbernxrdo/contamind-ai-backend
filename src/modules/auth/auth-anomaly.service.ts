import { Injectable } from '@nestjs/common';

@Injectable()
export class AuthAnomalyService {
  calculateScore(context: any): number {
    // Dummy logic for scoring
    return 0;
  }
}
