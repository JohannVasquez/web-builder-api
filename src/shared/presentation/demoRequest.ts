import type { Response } from 'express';

// Qué enlace abrió una demo de prospecto. Vive en el kernel compartido y no en el módulo Demo
// porque lo consultan módulos de los que Demo depende (Tenant, Contact, Store...): así ninguno
// tiene que importar a Demo y no se arma un ciclo.
export type DemoRequestKind = 'prospect' | 'team';

export interface DemoRequestAccess {
  readonly demoId: string;
  readonly kind: DemoRequestKind;
}

// Sin enlace válido una demo responde lo mismo que un recurso que no existe: ni un 403, ni un
// código propio, ni el nombre del negocio. Cualquier otra respuesta confirmaría que ahí hay algo.
export const NOT_FOUND_MESSAGE = 'No encontramos lo que buscas.';

export const markDemoRequest = (res: Response, access: DemoRequestAccess): void => {
  (res.locals as { demoAccess?: DemoRequestAccess }).demoAccess = access;
};

export const getDemoRequestAccess = (res: Response): DemoRequestAccess | null =>
  (res.locals as { demoAccess?: DemoRequestAccess }).demoAccess ?? null;

// La única pregunta que una acción pública tiene que hacerse antes de tener efectos fuera de
// la plataforma (mandar un correo, cobrar, guardar a alguien en una lista): en una demo, nada
// de eso ocurre de verdad, pero la respuesta tiene que verse igual que si hubiera ocurrido.
export const isDemoRequest = (res: Response): boolean =>
  getDemoRequestAccess(res) !== null;
