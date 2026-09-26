import type { PageRepository } from '@/modules/Page/domain/PageRepository';
import type { TenantRepository } from '@/modules/Tenant/domain/TenantRepository';
import {
  missingSellerFields,
  type SellerIdentity,
  type StoreSettings,
  type StoreSettingsUpdate,
} from '../domain/StoreSettings';
import type { StoreSettingsRepository } from '../domain/StoreSettingsRepository';
import { StoreCannotBeEnabledError } from '../domain/StoreCannotBeEnabledError';

// El estado que quedaría si se guardara el cambio: es contra eso que hay que validar, no
// contra lo que hay hoy ni contra lo que llega, porque un PATCH trae solo una parte.
const resolvedSeller = (
  current: SellerIdentity,
  update: StoreSettingsUpdate,
): SellerIdentity => ({
  legalName: update.legalName === undefined ? current.legalName : update.legalName,
  taxId: update.taxId === undefined ? current.taxId : update.taxId,
  address: update.sellerAddress === undefined ? current.address : update.sellerAddress,
  email: update.sellerEmail === undefined ? current.email : update.sellerEmail,
  phone: update.sellerPhone === undefined ? current.phone : update.sellerPhone,
});

export class ManageStoreSettingsUseCase {
  constructor(
    private readonly storeSettingsRepository: StoreSettingsRepository,
    private readonly pageRepository: PageRepository,
    private readonly tenantRepository: TenantRepository,
  ) {}

  public async find(tenantId: string): Promise<StoreSettings> {
    return this.storeSettingsRepository.find(tenantId);
  }

  public async save(
    tenantId: string,
    update: StoreSettingsUpdate,
  ): Promise<StoreSettings> {
    const current = await this.storeSettingsRepository.find(tenantId);
    const willBeEnabled = update.isEnabled ?? current.isEnabled;

    if (willBeEnabled) {
      const missing = await this.whatBlocksEnabling(tenantId, current, update);
      if (missing.length > 0) {
        throw new StoreCannotBeEnabledError(missing);
      }
    }

    return this.storeSettingsRepository.save(tenantId, update);
  }

  private async whatBlocksEnabling(
    tenantId: string,
    current: StoreSettings,
    update: StoreSettingsUpdate,
  ): Promise<string[]> {
    // Una demo no vende de verdad (el pago es simulado), y todavía no hay razón social ni RUT
    // que mostrar: exigirlos obligaría a inventarlos para poder enseñar la tienda.
    const tenant = await this.tenantRepository.findById(tenantId);
    const missing =
      tenant?.isDemo() === true
        ? []
        : missingSellerFields(resolvedSeller(current.seller, update));

    const slug =
      update.termsPageSlug === undefined ? current.termsPageSlug : update.termsPageSlug;
    if (slug === null) {
      missing.push('la página de términos de compra');
      return missing;
    }

    // Publicada de verdad, no solo creada: los términos nacen en borrador a propósito, para
    // que alguien los revise antes de que obliguen a nadie.
    const publishedAt = await this.pageRepository.findPublishedAt(tenantId, slug);
    if (publishedAt === null) {
      missing.push(`publicar la página de términos de compra ("${slug}")`);
    }

    return missing;
  }
}
