import {
  generateVerificationToken,
  hashVerificationToken,
  isVerificationToken,
  tokenMatches,
} from './verificationToken';

describe('token de verificación', () => {
  it('genera tokens con la forma esperada y siempre distintos', () => {
    const tokens = new Set(Array.from({ length: 100 }, generateVerificationToken));

    expect(tokens.size).toBe(100);
    for (const token of tokens) {
      expect(isVerificationToken(token)).toBe(true);
    }
  });

  it('el hash no deja ver el token', () => {
    const token = generateVerificationToken();

    expect(hashVerificationToken(token)).not.toBe(token);
  });

  it('el mismo token siempre da el mismo hash', () => {
    const token = generateVerificationToken();

    expect(hashVerificationToken(token)).toBe(hashVerificationToken(token));
  });
});

describe('tokenMatches', () => {
  const token = generateVerificationToken();
  const hash = hashVerificationToken(token);

  it('reconoce el token correcto', () => {
    expect(tokenMatches(token, hash)).toBe(true);
  });

  it('rechaza otro token', () => {
    expect(tokenMatches(generateVerificationToken(), hash)).toBe(false);
  });

  it.each([
    ['', 'vacío'],
    ['abc', 'corto'],
    ["' OR 1=1 --", 'un intento de inyección'],
    ['Z'.repeat(64), 'fuera del alfabeto hexadecimal'],
  ])('rechaza %s (%s) sin lanzar', (value) => {
    expect(tokenMatches(value, hash)).toBe(false);
  });

  it('un hash guardado con largo raro no rompe la comparación', () => {
    expect(tokenMatches(token, 'corto')).toBe(false);
  });
});
