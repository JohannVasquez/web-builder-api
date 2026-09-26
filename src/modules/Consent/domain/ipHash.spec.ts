import { hashIp } from './ipHash';

const SALT = 'sal-de-pruebas';

describe('hashIp', () => {
  it('la misma IP con la misma sal da la misma huella', () => {
    expect(hashIp('200.1.2.3', SALT)).toBe(hashIp('200.1.2.3', SALT));
  });

  it('dos IPs distintas dan huellas distintas', () => {
    expect(hashIp('200.1.2.3', SALT)).not.toBe(hashIp('200.1.2.4', SALT));
  });

  it('la sal cambia la huella: sin ella el hash de una IP sería reversible', () => {
    expect(hashIp('200.1.2.3', SALT)).not.toBe(hashIp('200.1.2.3', 'otra-sal'));
  });

  it('nunca deja la IP legible en el resultado', () => {
    expect(hashIp('200.1.2.3', SALT)).not.toContain('200.1.2.3');
  });

  const sinIp: [string | undefined, string][] = [
    [undefined, 'sin IP'],
    ['', 'IP vacía'],
    ['   ', 'IP en blanco'],
  ];
  it.each(sinIp)('%s no produce huella (%s)', (ip) => {
    expect(hashIp(ip, SALT)).toBeNull();
  });

  it('sin sal configurada no se guarda nada, antes que guardar algo reversible', () => {
    expect(hashIp('200.1.2.3', '')).toBeNull();
  });
});
