import {
  buildDemoUrl,
  generateDemoToken,
  hashDemoToken,
  looksLikeDemoToken,
} from './demoToken';

describe('demoToken', () => {
  it('genera 256 bits con prefijo propio y guarda solo el SHA-256', () => {
    const { token, hash } = generateDemoToken();

    expect(token).toMatch(/^demo_[0-9a-f]{64}$/);
    expect(hash).toBe(hashDemoToken(token));
    expect(hash).not.toContain(token.slice(5));
    expect(looksLikeDemoToken(token)).toBe(true);
  });

  it('no confunde un enlace de revisión con uno de demo', () => {
    expect(looksLikeDemoToken('prev_abc')).toBe(false);
    expect(looksLikeDemoToken('demo_corto')).toBe(false);
  });

  it('arma la URL sobre el subdominio de la demo', () => {
    expect(buildDemoUrl('demo-luna.webbuilder.co', 'demo_x')).toBe(
      'https://demo-luna.webbuilder.co/demo/demo_x',
    );
  });

  it('en desarrollo usa http y no agrega puerto', () => {
    expect(buildDemoUrl('demo-luna.localhost', 'demo_x')).toBe(
      'http://demo-luna.localhost/demo/demo_x',
    );
  });
});
