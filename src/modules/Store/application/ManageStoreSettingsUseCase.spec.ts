import type { PageRepository } from '@/modules/Page/domain/PageRepository';
import { Tenant, type TenantStatus } from '@/modules/Tenant/domain/Tenant';
import type { TenantRepository } from '@/modules/Tenant/domain/TenantRepository';
import { ManageStoreSettingsUseCase } from './ManageStoreSettingsUseCase';
import { StoreCannotBeEnabledError } from '../domain/StoreCannotBeEnabledError';
import { StoreSettings, type SellerIdentity } from '../domain/StoreSettings';
import type { StoreSettingsRepository } from '../domain/StoreSettingsRepository';

const TENANT = '018f6f1a-0000-7000-8000-000000000001';

const COMPLETE_SELLER: SellerIdentity = {
  legalName: 'Pastelería Acme SpA',
  taxId: '76086428-5',
  address: 'Av. Siempre Viva 742, Santiago',
  email: 'hola@acme.cl',
  phone: '+56912345678',
};

const buildSettings = (
  overrides: {
    isEnabled?: boolean;
    termsPageSlug?: string | null;
    seller?: SellerIdentity;
  } = {},
): StoreSettings =>
  new StoreSettings(
    TENANT,
    overrides.isEnabled ?? false,
    'CLP',
    true,
    19,
    [],
    null,
    'none',
    {},
    null,
    overrides.termsPageSlug === undefined
      ? 'terminos-de-compra'
      : overrides.termsPageSlug,
    overrides.seller ?? COMPLETE_SELLER,
  );

interface Harness {
  readonly useCase: ManageStoreSettingsUseCase;
  readonly save: jest.Mock;
}

const buildHarness = (
  current: StoreSettings,
  termsPublishedAt: Date | null = new Date('2026-01-01T00:00:00.000Z'),
  status: TenantStatus = 'active',
): Harness => {
  const save = jest.fn().mockResolvedValue(current);
  const settingsRepository = {
    find: jest.fn().mockResolvedValue(current),
    save,
  } as unknown as StoreSettingsRepository;
  const pageRepository = {
    findPublishedAt: jest.fn().mockResolvedValue(termsPublishedAt),
  } as unknown as PageRepository;

  const tenantRepository = {
    findById: jest
      .fn()
      .mockResolvedValue(new Tenant(TENANT, 'luna', 'Luna', null, status)),
  } as unknown as TenantRepository;

  return {
    useCase: new ManageStoreSettingsUseCase(
      settingsRepository,
      pageRepository,
      tenantRepository,
    ),
    save,
  };
};

describe('encender la tienda', () => {
  it('con términos publicados y vendedor identificado, se guarda', async () => {
    const { useCase, save } = buildHarness(buildSettings());

    await useCase.save(TENANT, { isEnabled: true });

    expect(save).toHaveBeenCalledWith(TENANT, { isEnabled: true });
  });

  it('sin página de términos no se puede: se vendería sin condiciones aceptadas', async () => {
    const { useCase, save } = buildHarness(buildSettings({ termsPageSlug: null }));

    await expect(useCase.save(TENANT, { isEnabled: true })).rejects.toThrow(
      StoreCannotBeEnabledError,
    );
    expect(save).not.toHaveBeenCalled();
  });

  it('con la página de términos creada pero en borrador tampoco', async () => {
    // Los términos nacen despublicados a propósito, para que alguien los revise.
    const { useCase } = buildHarness(buildSettings(), null);

    await expect(useCase.save(TENANT, { isEnabled: true })).rejects.toThrow(
      /publicar la página de términos/,
    );
  });

  it('enumera todo lo que falta de una vez, no el primer hueco', async () => {
    const { useCase } = buildHarness(
      buildSettings({
        termsPageSlug: null,
        seller: { ...COMPLETE_SELLER, legalName: null, taxId: null },
      }),
    );

    const error = await useCase
      .save(TENANT, { isEnabled: true })
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(StoreCannotBeEnabledError);
    expect((error as StoreCannotBeEnabledError).missing).toEqual([
      'razón social',
      'RUT',
      'la página de términos de compra',
    ]);
  });

  it('valida contra el estado que quedaría, no contra el actual', async () => {
    // La tienda está apagada y sin RUT; el mismo PATCH que la enciende trae el RUT.
    const { useCase, save } = buildHarness(
      buildSettings({ seller: { ...COMPLETE_SELLER, taxId: null } }),
    );

    await useCase.save(TENANT, { isEnabled: true, taxId: '76086428-5' });

    expect(save).toHaveBeenCalled();
  });

  it('una tienda ya encendida no puede quedar incompleta por un PATCH posterior', async () => {
    const { useCase } = buildHarness(buildSettings({ isEnabled: true }));

    await expect(useCase.save(TENANT, { legalName: null })).rejects.toThrow(
      /razón social/,
    );
  });

  it('apagar la tienda no exige nada: el problema es vender, no dejar de vender', async () => {
    const { useCase, save } = buildHarness(
      buildSettings({ isEnabled: true, termsPageSlug: null, seller: COMPLETE_SELLER }),
    );

    await useCase.save(TENANT, { isEnabled: false });

    expect(save).toHaveBeenCalledWith(TENANT, { isEnabled: false });
  });

  it('en una demo se enciende sin datos del vendedor: no vende de verdad', async () => {
    const { useCase, save } = buildHarness(
      buildSettings({
        seller: { legalName: null, taxId: null, address: null, email: null, phone: null },
      }),
      new Date('2026-01-01T00:00:00.000Z'),
      'demo',
    );

    await useCase.save(TENANT, { isEnabled: true });

    expect(save).toHaveBeenCalledWith(TENANT, { isEnabled: true });
  });
});
