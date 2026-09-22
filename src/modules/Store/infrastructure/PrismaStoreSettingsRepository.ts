import type { PrismaClient } from '../../../shared/infrastructure/prisma/generated/client';
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

interface StoreSettingsRecord {
  readonly tenantId: number;
  readonly isEnabled: boolean;
  readonly currency: string;
  readonly taxIncluded: boolean;
  readonly taxRatePercent: number;
  readonly shippingOptions: unknown;
  readonly freeShippingThresholdCents: number | null;
  readonly paymentProvider: string;
  readonly paymentCredentials: unknown;
  readonly notificationEmail: string | null;
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

const toCredentials = (value: unknown): Record<string, string> => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return {};
  }
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string',
    ),
  );
};

export class PrismaStoreSettingsRepository implements StoreSettingsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  public async find(tenantId: number): Promise<StoreSettings> {
    const record = await this.prisma.storeSettings.findUnique({ where: { tenantId } });
    return record === null ? StoreSettings.disabledFor(tenantId) : this.toDomain(record);
  }

  public async save(
    tenantId: number,
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
        : { paymentCredentials: asJsonColumn(credentials) }),
      ...(update.notificationEmail === undefined
        ? {}
        : { notificationEmail: update.notificationEmail }),
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
      toCredentials(record.paymentCredentials),
      record.notificationEmail,
    );
  }
}
