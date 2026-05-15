import { Injectable } from '@nestjs/common';

/**
 * Interfaz base para los canales de comunicación (WhatsApp, Telegram, Email, etc.)
 */
export interface IChannelGateway {
  sendMessage(to: string, message: string): Promise<void>;
  onMessage(callback: (from: string, message: string) => void): void;
}

/**
 * Clase abstracta que define la estructura de un Gateway de comunicación
 */
@Injectable()
export abstract class ChannelGateway implements IChannelGateway {
  abstract sendMessage(to: string, message: string): Promise<void>;
  abstract onMessage(callback: (from: string, message: string) => void): void;
}

@Injectable()
export class ChannelsService {
  private gateways = new Map<string, ChannelGateway>();

  /**
   * Registra un nuevo gateway de comunicación
   * @param name Nombre del canal (ej: 'whatsapp', 'telegram')
   * @param gateway Instancia del gateway
   */
  registerGateway(name: string, gateway: ChannelGateway) {
    this.gateways.set(name, gateway);
  }

  /**
   * Envía un mensaje a través de un canal específico
   * @param channelName Nombre del canal registrado
   * @param to Destinatario
   * @param message Contenido del mensaje
   */
  async sendMessage(channelName: string, to: string, message: string): Promise<void> {
    const gateway = this.gateways.get(channelName);
    if (!gateway) {
      throw new Error(`Canal de comunicación '${channelName}' no está registrado`);
    }
    await gateway.sendMessage(to, message);
  }
}
