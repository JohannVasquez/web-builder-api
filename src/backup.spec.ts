import { execFileSync } from 'child_process';
import path from 'path';

describe('Script de respaldo', () => {
  it('falla ruidosamente si falta una variable de entorno', () => {
    expect(() => {
      execFileSync('pnpm', ['tsx', path.join(__dirname, '../scripts/backup.ts')], {
        env: {
          ...process.env,
          DATABASE_URL: '', // Provoca el fallo en EnvConfig
        },
        stdio: 'pipe',
      });
    }).toThrow();
  });

  it('no imprime credenciales si falla el comando pg_dump', () => {
    try {
      execFileSync('pnpm', ['tsx', path.join(__dirname, '../scripts/backup.ts')], {
        env: {
          ...process.env,
          DATABASE_URL: 'postgresql://user_secreto:pass_secreta@localhost:5432/db',
          STORAGE_ENDPOINT: 'http://localhost:9000',
          STORAGE_REGION: 'auto',
          STORAGE_BUCKET: 'bucket',
          STORAGE_ACCESS_KEY: 'key',
          STORAGE_SECRET_KEY: 'secret',
          SMTP_HOST: 'smtp',
          CONTACT_EMAIL_FROM: 'a@a.com',
          CONTACT_EMAIL_TO: 'a@a.com',
          AUTH_JWT_SECRET: '12345678901234567890123456789012',
          CREDENTIALS_ENCRYPTION_KEY: 'key',
        },
        stdio: 'pipe',
      });
      // Debería lanzar error porque la base de datos o pg_dump no funciona
      fail('El script debería haber fallado');
    } catch (error: unknown) {
      const err = error as Error & { stdout?: Buffer; stderr?: Buffer };
      const output = (err.stdout?.toString() ?? '') + (err.stderr?.toString() ?? '');
      expect(output).not.toContain('pass_secreta');
    }
  });
});
