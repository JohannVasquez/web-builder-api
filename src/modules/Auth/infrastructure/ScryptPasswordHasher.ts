import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { PasswordHasher } from '../domain/PasswordHasher';

const KEY_LENGTH = 64;

/**
 * `scrypt` vía `node:crypto` (sin dependencias externas como bcrypt):
 * memory-hard, resistente a fuerza bruta por GPU. El hash guardado es
 * `salt:derivedKey`, ambos en hex, para no necesitar una columna aparte.
 */
export class ScryptPasswordHasher implements PasswordHasher {
  public hash(plainPassword: string): Promise<string> {
    const salt = randomBytes(16).toString('hex');
    const derivedKey = scryptSync(plainPassword, salt, KEY_LENGTH);
    return Promise.resolve(`${salt}:${derivedKey.toString('hex')}`);
  }

  public verify(plainPassword: string, storedHash: string): Promise<boolean> {
    const [salt, key] = storedHash.split(':');
    if (salt === undefined || key === undefined) {
      return Promise.resolve(false);
    }
    const keyBuffer = Buffer.from(key, 'hex');
    const derivedKey = scryptSync(plainPassword, salt, keyBuffer.length);
    return Promise.resolve(
      derivedKey.length === keyBuffer.length && timingSafeEqual(derivedKey, keyBuffer),
    );
  }
}
