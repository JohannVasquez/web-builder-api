/**
 * Cuánto se conserva cada tipo de dato personal. La Ley 21.719 exige que un dato no se guarde
 * más de lo que hace falta para lo que se recogió, y la propia política de privacidad que
 * entregamos lo promete: sin este proceso, la promesa era falsa.
 *
 * Los plazos son los de partida, pensados para Chile. Cada cliente puede acortarlos; alargar
 * el de un pedido por debajo del mínimo tributario no tendría sentido, así que no se admite.
 */
export interface RetentionPolicy {
  /** Mensajes del formulario de contacto, desde que llegaron. */
  readonly contactMessageDays: number;
  /** Suscriptores dados de baja, desde la baja. Los activos no caducan. */
  readonly unsubscribedSubscriberDays: number;
  /** Pedidos, desde que se crearon. No se borran: se anonimizan. */
  readonly orderDays: number;
}

/*
 * Los registros de consentimiento NO caducan aquí a propósito. Son la prueba de que un
 * tratamiento estuvo autorizado, y la carga de esa prueba es del responsable: borrarlos
 * dejaría sin respaldo justo lo que hay que poder acreditar. Se eliminan cuando el titular
 * ejerce su derecho de supresión, no por el paso del tiempo.
 */

/**
 * Seis años para los pedidos: es el plazo que exige conservar respaldo tributario, y por eso
 * el mínimo admitido. Un año para lo demás, que es lo que dura un seguimiento comercial
 * razonable.
 */
export const DEFAULT_RETENTION: RetentionPolicy = {
  contactMessageDays: 365,
  unsubscribedSubscriberDays: 365,
  orderDays: 365 * 6,
};

export const MINIMUM_ORDER_DAYS = 365 * 6;

const MAX_DAYS = 365 * 20;

const clamp = (value: number | undefined, fallback: number, minimum: number): number => {
  if (value === undefined || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.min(Math.max(Math.trunc(value), minimum), MAX_DAYS);
};

// Un plazo mal configurado no puede borrar antes de tiempo: se acota, no se obedece a ciegas.
export const resolveRetention = (
  overrides: Partial<RetentionPolicy> = {},
): RetentionPolicy => ({
  contactMessageDays: clamp(
    overrides.contactMessageDays,
    DEFAULT_RETENTION.contactMessageDays,
    1,
  ),
  unsubscribedSubscriberDays: clamp(
    overrides.unsubscribedSubscriberDays,
    DEFAULT_RETENTION.unsubscribedSubscriberDays,
    1,
  ),
  orderDays: clamp(overrides.orderDays, DEFAULT_RETENTION.orderDays, MINIMUM_ORDER_DAYS),
});

export const cutoffFor = (days: number, now: Date): Date =>
  new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
