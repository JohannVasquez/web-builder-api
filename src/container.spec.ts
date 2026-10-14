import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { EnvConfig } from './shared/config/EnvConfig';
import { Container } from './container';

const read = (relative: string): string =>
  readFileSync(join(__dirname, relative), 'utf8');

describe('Container', () => {
  // diod valida el cableado recién al construir: un servicio con dependencias de menos solo
  // falla al arrancar la API, y ninguna prueba unitaria construye el contenedor real.
  it('se construye con todas las dependencias declaradas', async () => {
    const env = EnvConfig.load({
      DATABASE_URL: 'postgres://nadie:nada@localhost:1/ninguna',
      SMTP_HOST: 'localhost',
      CONTACT_EMAIL_FROM: 'no-reply@ejemplo.cl',
      CONTACT_EMAIL_TO: 'contacto@ejemplo.cl',
      AUTH_JWT_SECRET: 'x'.repeat(32),
      CREDENTIALS_ENCRYPTION_KEY: Buffer.alloc(32, 1).toString('base64'),
    });

    const container = new Container(env);

    expect(container.getApp()).toBeDefined();
    await container.dispose();
  });
});

// DEMO 03: una acción pública que manda correos tiene que preguntarse si la petición es de una
// demo (`isDemoRequest`), porque el correo de una demo puede ser el del negocio real. Esta
// prueba lee el cableado en vez de confiar en una lista escrita a mano: si alguien agrega un
// caso de uso que manda correos y lo expone en una ruta pública del sitio, falla hasta que su
// controller lo considere.
describe('acciones públicas que mandan correos', () => {
  const container = read('container.ts').replace(/\s+/g, ' ');
  const app = read('app.ts');

  // Los puertos de correo son las abstracciones de dominio que terminan en Mailer o
  // EmailService (EmailService, OrderMailer, DataRightsMailer...).
  const mailPorts = new Set(
    [...container.matchAll(/import \{ (\w+) \} from '\.\/modules\/\w+\/domain\/\w+'/g)]
      .map((match) => match[1] ?? '')
      .filter((name) => /(Mailer|EmailService)$/.test(name)),
  );

  const dependencies = new Map<string, string[]>();
  for (const match of container.matchAll(
    /\.register(?:AndUse)?\((\w+)\)(?: \.use\(\w+\))? \.withDependencies\(\[([^\]]*)\]\)/g,
  )) {
    dependencies.set(
      match[1] ?? '',
      (match[2] ?? '')
        .split(',')
        .map((name) => name.trim())
        .filter((name) => name !== ''),
    );
  }

  const sendsMail = (service: string, seen = new Set<string>()): boolean => {
    if (mailPorts.has(service)) {
      return true;
    }
    if (seen.has(service)) {
      return false;
    }
    seen.add(service);
    return (dependencies.get(service) ?? []).some((dependency) =>
      sendsMail(dependency, seen),
    );
  };

  // Controllers montados en rutas públicas del sitio (las que pasan por `publicSite`).
  const controllerClass = new Map(
    [...app.matchAll(/readonly (\w+): (\w+);/g)].map((match) => [
      match[1] ?? '',
      match[2] ?? '',
    ]),
  );
  const publicControllers = new Set(
    [...app.matchAll(/app\.use\(\s*'[^']+',([\s\S]*?)\);/g)]
      .filter((match) => (match[1] ?? '').includes('...publicSite'))
      .flatMap((match) => [...(match[1] ?? '').matchAll(/controllers\.(\w+)/g)])
      .map((match) => controllerClass.get(match[1] ?? '') ?? ''),
  );

  const controllerSource = (name: string): string => {
    const path = new RegExp(`import \\{ ${name} \\} from '\\./(modules/[\\w/]+)'`).exec(
      container,
    )?.[1];
    if (path === undefined) {
      throw new Error(`No encuentro de dónde se importa ${name} en container.ts`);
    }
    return read(`${path}.ts`);
  };

  const mailingPublicControllers = [...publicControllers].filter((name) =>
    sendsMail(name),
  );

  it('encuentra los puertos de correo y las acciones públicas que los usan', () => {
    expect(mailPorts).toEqual(
      new Set([
        'EmailService',
        'DataRightsMailer',
        'OrderMailer',
        'ConsumerClaimMailer',
        'PasswordResetMailer',
      ]),
    );
    expect(mailingPublicControllers).toEqual(
      expect.arrayContaining([
        'ContactController',
        'DataRightsController',
        'ConsumerClaimController',
        'CheckoutController',
      ]),
    );
  });

  it('cada controller público que puede mandar correos considera las demos', () => {
    const forgetful = mailingPublicControllers.filter(
      (name) => !controllerSource(name).includes('isDemoRequest(res)'),
    );

    expect(forgetful).toEqual([]);
  });
});
