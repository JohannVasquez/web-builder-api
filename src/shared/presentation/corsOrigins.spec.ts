import { buildOriginMatcher } from './corsOrigins';

describe('buildOriginMatcher', () => {
  const matches = buildOriginMatcher([
    'http://localhost:3100',
    'http://*.localhost:3100',
  ]);

  it('acepta los orígenes exactos', () => {
    expect(matches('http://localhost:3100')).toBe(true);
  });

  it('acepta cualquier subdominio de un nivel', () => {
    expect(matches('http://pasteleria.localhost:3100')).toBe(true);
    expect(matches('http://acme-estudio.localhost:3100')).toBe(true);
  });

  it('no acepta otro puerto, otro protocolo ni otro dominio', () => {
    expect(matches('http://acme.localhost:3000')).toBe(false);
    expect(matches('https://acme.localhost:3100')).toBe(false);
    expect(matches('http://acme.evil.com')).toBe(false);
  });

  it('no deja colar dominios que solo terminan parecido', () => {
    expect(matches('http://evil.com/.localhost:3100')).toBe(false);
    expect(matches('http://a.b.localhost:3100')).toBe(false);
  });
});
