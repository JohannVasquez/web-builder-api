import {
  generateUnsubscribeToken,
  isUnsubscribeToken,
  unsubscribeUrl,
} from './unsubscribeToken';

describe('generateUnsubscribeToken', () => {
  it('produce un token con la forma esperada', () => {
    expect(isUnsubscribeToken(generateUnsubscribeToken())).toBe(true);
  });

  it('nunca repite: si se pudiera adivinar, cualquiera daría de baja a otro', () => {
    const tokens = new Set(Array.from({ length: 200 }, () => generateUnsubscribeToken()));

    expect(tokens.size).toBe(200);
  });
});

describe('isUnsubscribeToken', () => {
  it.each([
    ['', 'vacío'],
    ['abc', 'corto'],
    ['Z'.repeat(64), 'fuera del alfabeto hexadecimal'],
    ['a'.repeat(63), 'un carácter de menos'],
    ['a'.repeat(65), 'un carácter de más'],
    ["' OR 1=1 --", 'un intento de inyección'],
  ])('rechaza %s (%s)', (value) => {
    expect(isUnsubscribeToken(value)).toBe(false);
  });
});

describe('unsubscribeUrl', () => {
  it('apunta a la webapp del cliente, para que se vea una página y no un JSON', () => {
    expect(unsubscribeUrl('https://acme.cl', 'a'.repeat(64))).toBe(
      `https://acme.cl/newsletter/baja/${'a'.repeat(64)}`,
    );
  });

  it('no duplica la barra cuando el sitio viene con una al final', () => {
    expect(unsubscribeUrl('https://acme.cl/', 'b'.repeat(64))).not.toContain(
      '//newsletter',
    );
  });
});
