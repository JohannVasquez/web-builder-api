import { randomBytes } from 'node:crypto';
import type { PrismaClient } from '@/shared/infrastructure/prisma/generated/client';
import { SecretBox } from '@/shared/infrastructure/crypto/SecretBox';
import { PrismaStoreSettingsRepository } from './PrismaStoreSettingsRepository';

const TENANT = '018f6f1a-0000-7000-8000-000000000001';
const KEY = randomBytes(32).toString('base64');

const baseRow = {
  tenantId: TENANT,
  isEnabled: true,
  currency: 'CLP',
  taxIncluded: true,
  taxRatePercent: 19,
  shippingOptions: [],
  freeShippingThresholdCents: null,
  paymentProvider: 'flow',
  notificationEmail: null,
  termsPageSlug: null,
};

interface UpsertCall {
  readonly update: { readonly paymentCredentials: unknown };
}

interface Harness {
  readonly repository: PrismaStoreSettingsRepository;
  // Lo que la fila quedaría guardando: es lo único que interesa comprobar aquí.
  readonly written: () => unknown;
}

const buildHarness = (
  storedCredentials: unknown,
  secrets = SecretBox.fromEnv(KEY),
): Harness => {
  const row = { ...baseRow, paymentCredentials: storedCredentials };
  // Se captura al vuelo en vez de espiar `mock.calls`: lo que importa es qué quedaría
  // guardado, y así el tipo llega entero hasta la aserción.
  let stored: unknown;
  const upsert = jest.fn((args: UpsertCall): Promise<unknown> => {
    stored = args.update.paymentCredentials;
    return Promise.resolve(row);
  });
  const prisma = {
    storeSettings: {
      findUnique: jest.fn().mockResolvedValue(row),
      upsert,
    },
  } as unknown as PrismaClient;

  return {
    repository: new PrismaStoreSettingsRepository(prisma, secrets),
    written: () => stored,
  };
};

const sealed = (credentials: Record<string, string>, secrets: SecretBox): object => ({
  enc: secrets.encrypt(JSON.stringify(credentials)),
});

describe('credenciales de cobro en la base', () => {
  it('se guardan cifradas: la clave no queda legible en la columna', async () => {
    const { repository, written } = buildHarness({});

    await repository.save(TENANT, {
      paymentCredentials: { apiKey: 'mi-api-key', secretKey: 'mi-secreto' },
    });

    const stored = JSON.stringify(written());
    expect(stored).not.toContain('mi-api-key');
    expect(stored).not.toContain('mi-secreto');
    // Tampoco el nombre del campo, que ya diría qué pasarela usa el cliente.
    expect(stored).not.toContain('apiKey');
  });

  it('se leen descifradas, que es como las necesita la pasarela', async () => {
    const secrets = SecretBox.fromEnv(KEY);
    const { repository } = buildHarness(
      sealed({ apiKey: 'mi-api-key', mode: 'production' }, secrets),
      secrets,
    );

    const settings = await repository.find(TENANT);

    expect(settings.paymentCredentials).toEqual({
      apiKey: 'mi-api-key',
      mode: 'production',
    });
  });

  it('una fila anterior al cifrado se sigue leyendo tal cual', async () => {
    const { repository } = buildHarness({ apiKey: 'de-antes' });

    const settings = await repository.find(TENANT);

    expect(settings.paymentCredentials).toEqual({ apiKey: 'de-antes' });
  });

  it('con una clave que ya no descifra, la tienda queda sin credenciales', async () => {
    // Preferible a entregarle basura a la pasarela: el cobro en línea se apaga solo.
    const otra = SecretBox.fromEnv(randomBytes(32).toString('base64'));
    const { repository } = buildHarness(
      sealed({ apiKey: 'mi-api-key' }, SecretBox.fromEnv(KEY)),
      otra,
    );

    const settings = await repository.find(TENANT);

    expect(settings.paymentCredentials).toEqual({});
  });

  it('sin credenciales no se guarda un sobre vacío cifrado', async () => {
    const { repository, written } = buildHarness({});

    await repository.save(TENANT, { paymentCredentials: {} });

    expect(written()).toEqual({});
  });

  it('la respuesta pública solo dice si hay credenciales, nunca cuáles', async () => {
    const secrets = SecretBox.fromEnv(KEY);
    const { repository } = buildHarness(
      sealed({ apiKey: 'mi-api-key' }, secrets),
      secrets,
    );

    const primitives = (await repository.find(TENANT)).toPrimitives();

    expect(primitives.hasPaymentCredentials).toBe(true);
    expect(JSON.stringify(primitives)).not.toContain('mi-api-key');
  });
});
