import { z } from 'zod';

export const REDIRECT_STATUS_CODES = [301, 302] as const;
export type RedirectStatusCode = (typeof REDIRECT_STATUS_CODES)[number];

/**
 * Las rutas se guardan normalizadas —barra inicial, sin barra final, en minúsculas— para que
 * `/Servicios/` y `/servicios` no sean dos redirecciones distintas que se contradigan.
 */
export const normalizePath = (value: string): string => {
  const trimmed = value.trim().toLowerCase();
  const withLeading = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  const withoutTrailing = withLeading.replace(/\/+$/, '');
  return withoutTrailing === '' ? '/' : withoutTrailing;
};

const pathSchema = z
  .string()
  .min(1)
  .max(512)
  .transform(normalizePath)
  .refine((value) => !value.includes('..'), 'La ruta no puede subir de directorio');

export const RedirectInputSchema = z
  .strictObject({
    fromPath: pathSchema,
    toPath: pathSchema,
    statusCode: z.union([z.literal(301), z.literal(302)]).default(301),
  })
  // Una redirección a sí misma es un bucle infinito servido a cada visita.
  .refine((value) => value.fromPath !== value.toPath, {
    message: 'El origen y el destino no pueden ser la misma ruta',
    path: ['toPath'],
  });

export type RedirectInput = z.infer<typeof RedirectInputSchema>;

export interface RedirectPrimitives {
  readonly id: string;
  readonly fromPath: string;
  readonly toPath: string;
  readonly statusCode: RedirectStatusCode;
  readonly createdAt: string;
}

export class Redirect {
  constructor(
    public readonly id: string,
    public readonly fromPath: string,
    public readonly toPath: string,
    public readonly statusCode: RedirectStatusCode,
    public readonly createdAt: Date,
  ) {}

  public toPrimitives(): RedirectPrimitives {
    return {
      id: this.id,
      fromPath: this.fromPath,
      toPath: this.toPath,
      statusCode: this.statusCode,
      createdAt: this.createdAt.toISOString(),
    };
  }
}

/**
 * Colapsa las cadenas. Si A→B y luego B pasa a C, A tiene que apuntar a C y no a B: encadenar
 * saltos gasta rastreo, pierde señal en cada salto y, si alguien cierra el círculo, deja al
 * visitante rebotando.
 *
 * Devuelve las redirecciones ya existentes que hay que reapuntar al nuevo destino.
 */
export const chainsToCollapse = (
  existing: readonly Redirect[],
  newFrom: string,
  newTo: string,
): readonly Redirect[] =>
  existing.filter(
    (redirect) => redirect.toPath === newFrom && redirect.fromPath !== newTo,
  );

/**
 * Si el destino ya redirige a otra parte, se salta el intermedio: A→B donde B→C se guarda
 * directamente como A→C.
 */
export const resolveFinalTarget = (
  existing: readonly Redirect[],
  toPath: string,
  maxHops = 10,
): string => {
  let target = toPath;
  const seen = new Set<string>([target]);

  for (let hop = 0; hop < maxHops; hop += 1) {
    const next = existing.find((redirect) => redirect.fromPath === target);
    if (next === undefined || seen.has(next.toPath)) {
      break;
    }
    target = next.toPath;
    seen.add(target);
  }
  return target;
};

// Crear A→B cuando ya existe B→A dejaría al visitante rebotando entre las dos.
export const wouldCycle = (
  existing: readonly Redirect[],
  fromPath: string,
  toPath: string,
): boolean => fromPath === toPath || resolveFinalTarget(existing, toPath) === fromPath;
