import { ConflictError } from '@/shared/domain/ConflictError';
import { NotFoundError } from '@/shared/domain/NotFoundError';
import { UnprocessableEntityError } from '@/shared/domain/UnprocessableEntityError';

export class DemoNotFoundError extends NotFoundError {
  constructor() {
    super('Esa demo no existe.');
    this.name = 'DemoNotFoundError';
  }
}

export class ProspectNotFoundError extends NotFoundError {
  constructor() {
    super('Ese prospecto no existe.');
    this.name = 'ProspectNotFoundError';
  }
}

// Lo lanza el repositorio cuando otra operación ganó la carrera por la misma dirección.
export class DemoAddressTakenError extends ConflictError {
  constructor(tenantSlug: string) {
    super(`Ya existe un sitio en "${tenantSlug}".`);
    this.name = 'DemoAddressTakenError';
  }
}

// Fallar sin pista obliga a probar nombres a ciegas; la respuesta trae el siguiente libre.
export class DemoSlugTakenError extends ConflictError {
  constructor(
    public readonly slug: string,
    public readonly suggestedSlug: string | null,
  ) {
    super(
      suggestedSlug === null
        ? `Ya existe una demo en "demo-${slug}". Elige otro nombre.`
        : `Ya existe una demo en "demo-${slug}". Prueba con "${suggestedSlug}".`,
    );
    this.name = 'DemoSlugTakenError';
  }
}

// Convertida, descartada o borrada: el pedido tiene sentido, pero no sobre esta demo.
export class DemoClosedError extends UnprocessableEntityError {
  constructor(message: string) {
    super(message);
    this.name = 'DemoClosedError';
  }
}

export class DemoNeverExpiresError extends UnprocessableEntityError {
  constructor() {
    super(
      'Esta demo no vence, así que no hay plazo que extender. Si quieres que venza, cámbiale el vencimiento.',
    );
    this.name = 'DemoNeverExpiresError';
  }
}
