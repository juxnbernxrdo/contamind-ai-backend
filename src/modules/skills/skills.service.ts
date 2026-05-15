import { Injectable, Type } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';

/**
 * Interfaz que deben implementar todas las skills del sistema
 */
export interface ISkill {
  execute(params: unknown): Promise<unknown>;
}

@Injectable()
export class SkillsService {
  private skills = new Map<string, Type<ISkill>>();

  constructor(private moduleRef: ModuleRef) {}

  /**
   * Registra una nueva skill en el sistema
   * @param name Nombre único de la skill
   * @param skillClass Clase que implementa la interfaz ISkill
   */
  registerSkill(name: string, skillClass: Type<ISkill>) {
    this.skills.set(name, skillClass);
  }

  /**
   * Despacha y ejecuta una skill por su nombre
   * @param name Nombre de la skill a ejecutar
   * @param params Parámetros para la ejecución
   */
  async executeSkill(name: string, params: unknown): Promise<unknown> {
    const skillClass = this.skills.get(name);
    if (!skillClass) {
      throw new Error(`Skill '${name}' no encontrada en el registro`);
    }

    // Resolvemos la instancia desde el contenedor de NestJS
    const skillInstance = await this.moduleRef.get(skillClass, { strict: false });
    return skillInstance.execute(params);
  }

  /**
   * Retorna todas las skills registradas
   */
  getRegisteredSkills(): string[] {
    return Array.from(this.skills.keys());
  }
}
