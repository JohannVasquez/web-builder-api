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

// Al convertir, el slug definitivo del cliente ya lo usa otro sitio. Trae el siguiente libre,
// igual que al crear la demo.
export class ClientSlugTakenError extends ConflictError {
  constructor(
    public readonly slug: string,
    public readonly suggestedSlug: string | null,
  ) {
    super(
      suggestedSlug === null
        ? `Ya existe un sitio en "${slug}". Elige otro slug para el cliente.`
        : `Ya existe un sitio en "${slug}". Prueba con "${suggestedSlug}".`,
    );
    this.name = 'ClientSlugTakenError';
  }
}

// El dueño que se indica al convertir entra como `client`, limitado a su sitio. Si el correo
// ya es de alguien de la agencia, reutilizarlo le bajaría el rol o le sumaría un alcance que
// no significa nada para el equipo; mejor que lo decida una persona.
export class DemoOwnerNotClientError extends UnprocessableEntityError {
  constructor() {
    super(
      'Ese correo ya es de una persona del equipo de la agencia. Usa el correo del dueño del negocio.',
    );
    this.name = 'DemoOwnerNotClientError';
  }
}

export class DemoOwnerDisabledError extends UnprocessableEntityError {
  constructor() {
    super(
      'Ese correo es de una cuenta de cliente desactivada. Reactívala en /api/admin/users antes de convertir, o usa otro correo.',
    );
    this.name = 'DemoOwnerDisabledError';
  }
}

// La tarea diaria eligió la demo para borrar, pero antes de borrarla alguien la extendió o la
// recuperó. No es un fallo: simplemente ya no le toca.
export class DemoNoLongerDueError extends DemoClosedError {
  constructor() {
    super('Esa demo ya no está para borrarse: alguien la extendió o la recuperó recién.');
    this.name = 'DemoNoLongerDueError';
  }
}
