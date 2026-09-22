import { isValidIdempotencyKey, requestHash } from './requestHash';

describe('requestHash', () => {
  it('no depende del orden de las claves', () => {
    expect(requestHash({ a: 1, b: { c: 2, d: 3 } })).toBe(
      requestHash({ b: { d: 3, c: 2 }, a: 1 }),
    );
  });

  it('cambia si cambia el contenido', () => {
    expect(
      requestHash({
        items: [{ productId: '018f6f1a-0000-7000-8000-000000000001', quantity: 1 }],
      }),
    ).not.toBe(
      requestHash({
        items: [{ productId: '018f6f1a-0000-7000-8000-000000000001', quantity: 2 }],
      }),
    );
  });

  it('respeta el orden de los arreglos, que sí importa', () => {
    expect(requestHash([1, 2])).not.toBe(requestHash([2, 1]));
  });
});

describe('isValidIdempotencyKey', () => {
  it('acepta un UUID', () => {
    expect(isValidIdempotencyKey('018f6f1a-3c2b-7a4e-9b1d-2c3d4e5f6a7b')).toBe(true);
  });

  it('rechaza lo muy corto, lo muy largo y los caracteres raros', () => {
    expect(isValidIdempotencyKey('abc')).toBe(false);
    expect(isValidIdempotencyKey('a'.repeat(256))).toBe(false);
    expect(isValidIdempotencyKey('clave con espacios')).toBe(false);
  });
});
