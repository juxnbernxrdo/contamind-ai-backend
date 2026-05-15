import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { chromium, Browser, Page } from 'playwright';

/**
 * Clase base para todos los agentes autónomos que utilizan Playwright.
 * Los agentes específicos como AgentSRI o AgentIESS deben heredar de esta clase.
 */
@Injectable()
export abstract class AgentOrchestrator implements OnModuleDestroy {
  protected browser: Browser | null = null;

  /**
   * Inicializa el navegador para el agente
   */
  protected async initBrowser(): Promise<Browser> {
    if (!this.browser) {
      this.browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
    }
    return this.browser;
  }

  /**
   * Crea una nueva página en el navegador con un contexto limpio
   */
  protected async createPage(): Promise<Page> {
    const browser = await this.initBrowser();
    const context = await browser.newContext();
    return await context.newPage();
  }

  /**
   * Cierra el navegador al destruir el módulo para liberar recursos
   */
  async onModuleDestroy() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Método abstracto que define la lógica de ejecución del agente
   * @param params Parámetros necesarios para la tarea
   */
  abstract execute(params: unknown): Promise<unknown>;
}

@Injectable()
export class AgentsService {
  /**
   * El servicio de orquestación central se encargará de coordinar 
   * las ejecuciones de los agentes específicos.
   */
  constructor() {}
}
