import type { PrismaClient } from '@/shared/infrastructure/prisma/generated/client';
import {
  mergePaymentCredentials,
  PAYMENT_PROVIDERS,
  ShippingOptionsSchema,
  StoreSettings,
  type PaymentProvider,
  type ShippingOption,
  type StoreSettingsUpdate,
} from '../domain/StoreSettings';
import type { StoreSettingsRepository } from '../domain/StoreSettingsRepository';
import { looksEncrypted, type SecretBox } from '@/shared/infrastructure/crypto/SecretBox';

interface StoreSettingsRecord {
  readonly tenantId: string;
  readonly isEnabled: boolean;
  readonly currency: string;
  readonly taxIncluded: boolean;
  readonly taxRatePercent: number;
  readonly shippingOptions: unknown;
  readonly freeShippingThresholdCents: number | null;
  readonly paymentProvider: string;
  readonly paymentCredentials: unknown;
  readonly notificationEmail: string | null;
  readonly termsPageSlug: string | null;
  readonly legalName?: string | null;
  readonly taxId?: string | null;
  readonly sellerAddress?: string | null;
  readonly sellerEmail?: string | null;
  readonly sellerPhone?: string | null;
}

const asJsonColumn = (value: unknown): object => value as object;

// Una configuración corrupta apaga el envío, no tumba la tienda entera.
const toShippingOptions = (value: unknown): ShippingOption[] => {
  const parsed = ShippingOptionsSchema.safeParse(value);
  return parsed.success ? parsed.data : [];
};

const toProvider = (value: string): PaymentProvider =>
  (PAYMENT_PROVIDERS as readonly string[]).includes(value)
    ? (value as PaymentProvider)
    : 'none';

const asCredentialMap = (value: unknown): Record<string, string> => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return {};
  }
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string',
    ),
  );
};

/**
 * Las credenciales se guardan como UN solo valor cifrado bajo la clave `enc`, no campo por
 * campo: así ni los nombres de los campos dicen qué pasarela usa cada cliente.
 *
 * Una fila de antes del cifrado trae el mapa en claro; se lee igual y queda cifrada la
 * próxima vez que alguien guarde la configuración.
 */
const ENCRYPTED_KEY = 'enc';

export class PrismaStoreSettingsRepository implements StoreSettingsRepository {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly secrets: SecretBox,
  ) {}

  private readCredentials(value: unknown): Record<string, string> {
    const raw = asCredentialMap(value);
    const sealed = raw[ENCRYPTED_KEY];
    if (!looksEncrypted(sealed)) {
      // Fila anterior al cifrado: se lee tal cual y se cifra al próximo guardado.
      return raw;
    }
    const plaintext = this.secrets.decrypt(sealed);
    if (plaintext === null) {
      // Con una clave que ya no descifra, la tienda queda sin credenciales y el cobro en
      // línea se apaga solo. Es preferible a mandarle basura a la pasarela.
      return {};
    }
    return asCredentialMap(JSON.parse(plaintext));
  }

  private sealCredentials(credentials: Record<string, string>): object {
    if (Object.keys(credentials).length === 0) {
      return {};
    }
    return { [ENCRYPTED_KEY]: this.secrets.encrypt(JSON.stringify(credentials)) };
  }

  public async find(tenantId: string): Promise<StoreSettings> {
    const record = await this.prisma.storeSettings.findUnique({ where: { tenantId } });
    return record === null ? StoreSettings.disabledFor(tenantId) : this.toDomain(record);
  }

  public async save(
    tenantId: string,
    update: StoreSettingsUpdate,
  ): Promise<StoreSettings> {
    const credentials =
      update.paymentCredentials === undefined
        ? undefined
        : mergePaymentCredentials(
            (await this.find(tenantId)).paymentCredentials,
            update.paymentCredentials,
          );

    const data = {
      ...(update.isEnabled === undefined ? {} : { isEnabled: update.isEnabled }),
      ...(update.currency === undefined ? {} : { currency: update.currency }),
      ...(update.taxIncluded === undefined ? {} : { taxIncluded: update.taxIncluded }),
      ...(update.taxRatePercent === undefined
        ? {}
        : { taxRatePercent: update.taxRatePercent }),
      ...(update.shippingOptions === undefined
        ? {}
        : { shippingOptions: asJsonColumn(update.shippingOptions) }),
      ...(update.freeShippingThresholdCents === undefined
        ? {}
        : { freeShippingThresholdCents: update.freeShippingThresholdCents }),
      ...(update.paymentProvider === undefined
        ? {}
        : { paymentProvider: update.paymentProvider }),
      ...(credentials === undefined
        ? {}
        : { paymentCredentials: asJsonColumn(this.sealCredentials(credentials)) }),
      ...(update.notificationEmail === undefined
        ? {}
        : { notificationEmail: update.notificationEmail }),
      ...(update.termsPageSlug === undefined
        ? {}
        : { termsPageSlug: update.termsPageSlug }),
      ...(update.legalName === undefined ? {} : { legalName: update.legalName }),
      ...(update.taxId === undefined ? {} : { taxId: update.taxId }),
      ...(update.sellerAddress === undefined
        ? {}
        : { sellerAddress: update.sellerAddress }),
      ...(update.sellerEmail === undefined ? {} : { sellerEmail: update.sellerEmail }),
      ...(update.sellerPhone === undefined ? {} : { sellerPhone: update.sellerPhone }),
    };

    const record = await this.prisma.storeSettings.upsert({
      where: { tenantId },
      create: { tenantId, ...data },
      update: data,
    });
    return this.toDomain(record);
  }

  private toDomain(record: StoreSettingsRecord): StoreSettings {
    return new StoreSettings(
      record.tenantId,
      record.isEnabled,
      record.currency,
      record.taxIncluded,
      record.taxRatePercent,
      toShippingOptions(record.shippingOptions),
      record.freeShippingThresholdCents,
      toProvider(record.paymentProvider),
      this.readCredentials(record.paymentCredentials),
      record.notificationEmail,
      record.termsPageSlug,
      {
        legalName: record.legalName ?? null,
        taxId: record.taxId ?? null,
        address: record.sellerAddress ?? null,
        email: record.sellerEmail ?? null,
        phone: record.sellerPhone ?? null,
      },
    );
  }
}
