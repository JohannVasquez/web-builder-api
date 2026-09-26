import { EnvConfig } from './EnvConfig';

// Lo mínimo para que el resto del esquema no se queje mientras se prueba una sola variable.
const base: NodeJS.ProcessEnv = {
  DATABASE_URL: 'postgresql://u:p@localhost:5433/db',
  SMTP_HOST: 'localhost',
  CONTACT_EMAIL_FROM: 'de@ejemplo.cl',
  CONTACT_EMAIL_TO: 'para@ejemplo.cl',
  AUTH_JWT_SECRET: 'x'.repeat(32),
  CREDENTIALS_ENCRYPTION_KEY: 'a'.repeat(44),
};

describe('CREDENTIALS_ENCRYPTION_KEY', () => {
  it('sin ella la API no arranca: una clave de fábrica no protege nada', () => {
    expect(() => EnvConfig.load({ ...base, CREDENTIALS_ENCRYPTION_KEY: '' })).toThrow();
  });

  it('el error dice qué falta y cómo generarla, en vez de un fallo crudo de validación', () => {
    let message = '';
    try {
      EnvConfig.load({ ...base, CREDENTIALS_ENCRYPTION_KEY: '' });
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }

    expect(message).toContain('CREDENTIALS_ENCRYPTION_KEY');
    expect(message).toContain('openssl rand -base64 32');
  });

  it('con una clave configurada carga sin problemas', () => {
    expect(EnvConfig.load(base).get('CREDENTIALS_ENCRYPTION_KEY')).toBe('a'.repeat(44));
  });
});
