import { randomBytes } from 'node:crypto';

/**
 * Token que viaja en el enlace de baja de cada correo comercial. El art. 28 B de la Ley
 * 19.496 exige que darse de baja sea gratuito y expedito: con esto basta un clic, sin cuenta
 * ni formulario.
 *
 * 32 bytes en hexadecimal (64 caracteres). Tiene que ser imposible de adivinar: si se
 * pudiera, cualquiera daría de baja a otro probando valores. Por eso `randomBytes` y no algo
 * derivado del correo.
 */
const TOKEN_BYTES = 32;

export const generateUnsubscribeToken = (): string =>
  randomBytes(TOKEN_BYTES).toString('hex');

// Se valida antes de tocar la base: así una cadena arbitraria no llega a la consulta.
export const isUnsubscribeToken = (value: string): boolean =>
  /^[0-9a-f]{64}$/.test(value);

/**
 * Dirección que va en el enlace de baja de cada correo comercial. Apunta a la webapp y no a
 * la API para que quien pincha vea una página y no un JSON.
 *
 * Existe como función y no como una plantilla pegada en cada correo para que agregar un
 * envío nuevo no pueda olvidarse del enlace: no hay otra forma de armarlo.
 */
export const unsubscribeUrl = (siteUrl: string, token: string): string =>
  `${siteUrl.replace(/\/$/, '')}/newsletter/baja/${token}`;
