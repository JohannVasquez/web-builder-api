import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

/**
 * Cifrado simétrico para secretos que tienen que volver en claro (las credenciales de cobro
 * de cada tienda, que hay que entregarle a la pasarela). No es un hash: un hash serviría para
 * comprobar, no para usar.
 *
 * AES-256-GCM porque además de cifrar autentica: si alguien edita el valor en la base, el
 * descifrado falla en vez de devolver basura que termine viajando a la pasarela.
 */

const ALGORITHM = 'aes-256-gcm';
const KEY_BYTES = 32;
const IV_BYTES = 12;
const PREFIX = 'v1';

export class MissingEncryptionKeyError extends Error {
  constructor() {
    super(
      'No hay clave de cifrado configurada (CREDENTIALS_ENCRYPTION_KEY). Sin ella las ' +
        'credenciales de cobro quedarían en claro en la base de datos.',
    );
    this.name = 'MissingEncryptionKeyError';
  }
}

const parseKey = (value: string): Buffer => {
  const key = Buffer.from(value, 'base64');
  if (key.length !== KEY_BYTES) {
    throw new Error(
      `La clave de cifrado tiene que ser de ${KEY_BYTES} bytes en base64; llegó una de ${key.length}.`,
    );
  }
  return key;
};

export class SecretBox {
  private readonly primary: Buffer;
  /**
   * Claves viejas: solo descifran. Permiten rotar sin reescribir toda la tabla de una vez —
   * cada fila se re-cifra con la nueva la próxima vez que se guarda.
   */
  private readonly retired: readonly Buffer[];

  private constructor(primary: Buffer, retired: readonly Buffer[]) {
    this.primary = primary;
    this.retired = retired;
  }

  /**
   * `primaryKey` y `retiredKeys` en base64. `retiredKeys` admite varias separadas por coma.
   */
  public static fromEnv(primaryKey: string, retiredKeys = ''): SecretBox {
    if (primaryKey === '') {
      throw new MissingEncryptionKeyError();
    }
    const retired = retiredKeys
      .split(',')
      .map((value) => value.trim())
      .filter((value) => value !== '')
      .map(parseKey);
    return new SecretBox(parseKey(primaryKey), retired);
  }

  public encrypt(plaintext: string): string {
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv(ALGORITHM, this.primary, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return [
      PREFIX,
      iv.toString('base64'),
      tag.toString('base64'),
      encrypted.toString('base64'),
    ].join(':');
  }

  /**
   * Devuelve `null` cuando el valor no se puede descifrar con ninguna clave conocida. El
   * llamador decide qué hacer: en la tienda eso significa "sin credenciales", que apaga el
   * cobro en línea en vez de mandarle basura a la pasarela.
   */
  public decrypt(payload: string): string | null {
    const parts = payload.split(':');
    if (parts.length !== 4 || parts[0] !== PREFIX) {
      return null;
    }
    const [, iv, tag, data] = parts;

    for (const key of [this.primary, ...this.retired]) {
      const plaintext = this.tryDecrypt(key, iv, tag, data);
      if (plaintext !== null) {
        return plaintext;
      }
    }
    return null;
  }

  private tryDecrypt(key: Buffer, iv: string, tag: string, data: string): string | null {
    try {
      const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(iv, 'base64'));
      decipher.setAuthTag(Buffer.from(tag, 'base64'));
      return Buffer.concat([
        decipher.update(Buffer.from(data, 'base64')),
        decipher.final(),
      ]).toString('utf8');
    } catch {
      // Clave equivocada o valor alterado: se prueba la siguiente.
      return null;
    }
  }
}

// Sirve para distinguir un valor ya cifrado de uno que quedó en claro de antes.
export const looksEncrypted = (value: unknown): value is string =>
  typeof value === 'string' && value.startsWith(`${PREFIX}:`);
