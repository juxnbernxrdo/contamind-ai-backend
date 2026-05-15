import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';

/**
 * Interfaz base para el servicio de AI
 */
export interface IAIService {
  generateText(prompt: string): Promise<string>;
  processImage(prompt: string, imageBuffer: Buffer, mimeType: string): Promise<string>;
}

@Injectable()
export abstract class AIService implements IAIService {
  abstract generateText(prompt: string): Promise<string>;
  abstract processImage(prompt: string, imageBuffer: Buffer, mimeType: string): Promise<string>;
}

@Injectable()
export class GeminiService extends AIService {
  private genAI: GoogleGenerativeAI;
  private model: GenerativeModel;

  constructor(private configService: ConfigService) {
    super();
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not defined in environment variables');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
  }

  async generateText(prompt: string): Promise<string> {
    const result = await this.model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  }

  async processImage(prompt: string, imageBuffer: Buffer, mimeType: string): Promise<string> {
    const result = await this.model.generateContent([
      prompt,
      {
        inlineData: {
          data: imageBuffer.toString('base64'),
          mimeType,
        },
      },
    ]);
    const response = await result.response;
    return response.text();
  }
}
