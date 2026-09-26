import { randomBytes } from 'node:crypto';
import { looksEncrypted, MissingEncryptionKeyError, SecretBox } from './SecretBox';

const key = (): string => randomBytes(32).toString('base64');

const KEY_A = key();
const KEY_B = key();

describe('SecretBox', () => {
  const box = SecretBox.fromEnv(KEY_A);

  it('lo cifrado vuelve igual', () => {
    expect(box.decrypt(box.encrypt('mi-clave-secreta'))).toBe('mi-clave-secreta');
  });

  it('el mismo texto cifrado dos veces da resultados distintos', () => {
    // Sin esto, dos tiendas con la misma credencial serían indistinguibles en la base.
    expect(box.encrypt('igual')).not.toBe(box.encrypt('igual'));
  });

  it('el secreto no aparece en el resultado', () => {
    expect(box.encrypt('mi-clave-secreta')).not.toContain('mi-clave-secreta');
  });

  it('otra clave no puede leerlo', () => {
    const otra = SecretBox.fromEnv(KEY_B);

    expect(otra.decrypt(box.encrypt('mi-clave-secreta'))).toBeNull();
  });

  it('un valor alterado no se descifra a medias: falla', () => {
    // GCM autentica además de cifrar, así que una edición en la base se nota.
    const cifrado = box.encrypt('mi-clave-secreta');
    const alterado = `${cifrado.slice(0, -4)}AAAA`;

    expect(box.decrypt(alterado)).toBeNull();
  });

  it('un valor que no tiene la forma esperada devuelve null en vez de lanzar', () => {
    expect(box.decrypt('texto-en-claro-de-antes')).toBeNull();
    expect(box.decrypt('')).toBeNull();
  });
});

describe('rotación de clave', () => {
  it('lo cifrado con la clave vieja se sigue leyendo con la nueva configurada', () => {
    const antes = SecretBox.fromEnv(KEY_A);
    const cifradoViejo = antes.encrypt('credencial');

    const despues = SecretBox.fromEnv(KEY_B, KEY_A);

    expect(despues.decrypt(cifradoViejo)).toBe('credencial');
  });

  it('lo nuevo se cifra con la clave nueva, no con la retirada', () => {
    const despues = SecretBox.fromEnv(KEY_B, KEY_A);
    const soloVieja = SecretBox.fromEnv(KEY_A);

    expect(soloVieja.decrypt(despues.encrypt('credencial'))).toBeNull();
  });

  it('admite varias claves retiradas', () => {
    const KEY_C = key();
    const cifradoConC = SecretBox.fromEnv(KEY_C).encrypt('credencial');

    const actual = SecretBox.fromEnv(KEY_B, `${KEY_A}, ${KEY_C}`);

    expect(actual.decrypt(cifradoConC)).toBe('credencial');
  });
});

describe('configuración', () => {
  it('sin clave no arranca: mejor fallar que guardar credenciales en claro', () => {
    expect(() => SecretBox.fromEnv('')).toThrow(MissingEncryptionKeyError);
  });

  it('rechaza una clave de largo equivocado', () => {
    expect(() => SecretBox.fromEnv(Buffer.from('corta').toString('base64'))).toThrow(
      /32 bytes/,
    );
  });
});

describe('looksEncrypted', () => {
  it('distingue un valor cifrado de uno que quedó en claro de antes', () => {
    expect(looksEncrypted(SecretBox.fromEnv(KEY_A).encrypt('x'))).toBe(true);
    expect(looksEncrypted('mi-api-key-en-claro')).toBe(false);
    expect(looksEncrypted(undefined)).toBe(false);
  });
});
