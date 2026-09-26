import { BadRequestError } from '@/shared/domain/BadRequestError';
import { NotFoundError } from '@/shared/domain/NotFoundError';
import { UnprocessableEntityError } from '@/shared/domain/UnprocessableEntityError';
import type { DomainVerifier } from '../domain/DomainVerifier';
import type { Tenant, TenantStatus } from '../domain/Tenant';
import { verificationHostFor, type TenantDomainRecord } from '../domain/TenantDomain';
import { TenantRepository } from '../domain/TenantRepository';
import { SignedDocumentRepository } from '@/modules/SignedDocuments/domain/SignedDocumentRepository';

export interface DomainInstructions {
  readonly domain: string;
  readonly isVerified: boolean;
  // Lo que la persona tiene que crear en el panel de su proveedor de dominio.
  readonly records: readonly {
    type: string;
    host: string;
    value: string;
    purpose: string;
  }[];
}

// El host al que apuntan los dominios propios de los clientes.
export class PlatformDomainConfig {
  constructor(
    public readonly baseDomain: string,
    public readonly siteTarget: string,
  ) {}

  // Un subdominio de la propia plataforma no necesita verificación: su DNS es nuestro.
  public owns(domain: string): boolean {
    return domain === this.baseDomain || domain.endsWith(`.${this.baseDomain}`);
  }
}

export class ManageTenantUseCase {
  constructor(
    private readonly tenantRepository: TenantRepository,
    private readonly verifier: DomainVerifier,
    private readonly platform: PlatformDomainConfig,
    private readonly signedDocumentRepository: SignedDocumentRepository,
  ) {}

  public async setStatus(tenantId: string, status: TenantStatus): Promise<Tenant> {
    const tenant = await this.requireTenant(tenantId);
    // Entrar y salir de `demo` tiene reglas propias (enlaces, vencimiento, conversión): por
    // aquí se saltarían todas. Una demo nace al crearla y sale al convertirla o descartarla.
    if (status === 'demo') {
      throw new UnprocessableEntityError(
        'Un cliente no se puede pasar a demo. Las demos se crean desde /api/admin/demos.',
      );
    }
    if (tenant.isDemo()) {
      throw new UnprocessableEntityError(
        'Esta es una demo: su estado no se cambia a mano. Para publicarla hay que convertirla en cliente.',
      );
    }
    if (status === 'active') {
      await this.requireSignaturesForCustomDomain(tenantId);
    }
    return this.tenantRepository.setStatus(tenantId, status);
  }

  public async listDomains(tenantId: string): Promise<TenantDomainRecord[]> {
    await this.requireTenant(tenantId);
    return this.tenantRepository.listDomains(tenantId);
  }

  public async addDomain(tenantId: string, domain: string): Promise<TenantDomainRecord> {
    const tenant = await this.requireTenant(tenantId);
    // La única dirección de una demo es `demo-<slug>.<plataforma>`: cualquier otra la dejaría
    // alcanzable por un nombre que no delata que es una demo.
    if (tenant.isDemo()) {
      throw new UnprocessableEntityError(
        'Una demo no puede tener dominio propio; conviértela primero.',
      );
    }
    return this.tenantRepository.addDomain(tenantId, domain, this.platform.owns(domain));
  }

  public async setPrimaryDomain(
    tenantId: string,
    domainId: string,
  ): Promise<TenantDomainRecord> {
    return this.tenantRepository.setPrimaryDomain(tenantId, domainId);
  }

  public async deleteDomain(tenantId: string, domainId: string): Promise<void> {
    await this.tenantRepository.deleteDomain(tenantId, domainId);
  }

  // Comprueba el DNS de verdad: marcar verificado sin mirar dejaría entrar el dominio de
  // otra persona al sitio de un cliente.
  public async verifyDomain(
    tenantId: string,
    domainId: string,
  ): Promise<TenantDomainRecord> {
    const domains = await this.tenantRepository.listDomains(tenantId);
    const target = domains.find((candidate) => candidate.id === domainId);
    if (target === undefined) {
      throw new NotFoundError('Ese dominio no existe.');
    }
    if (target.isVerified()) {
      return target;
    }

    const token = this.verifier.tokenFor(tenantId);
    if (!(await this.verifier.isPublished(target.domain, token))) {
      throw new BadRequestError(
        `Todavía no vemos el registro TXT en ${verificationHostFor(target.domain)}. Los cambios de DNS pueden demorar unas horas en propagarse.`,
      );
    }

    const tenant = await this.requireTenant(tenantId);
    if (tenant.status === 'active') {
      const signatures = await this.signedDocumentRepository.findByTenant(tenantId);
      const hasContract = signatures.some((s) => s.document === 'contrato-de-servicio');
      const hasData = signatures.some((s) => s.document === 'contrato-de-datos');
      // No validamos en dominios de la plataforma (Issue #106) para no romper demostraciones.
      if (!hasContract || !hasData) {
        throw new BadRequestError(
          `Para publicar en un dominio propio falta firmar: ${!hasContract ? 'contrato-de-servicio' : ''} ${!hasData ? 'contrato-de-datos' : ''}`,
        );
      }
    }

    return this.tenantRepository.markDomainVerified(tenantId, domainId);
  }

  public instructionsFor(
    tenantId: string,
    domain: TenantDomainRecord,
  ): DomainInstructions {
    const isApex = domain.domain.split('.').length === 2;
    return {
      domain: domain.domain,
      isVerified: domain.isVerified(),
      records: [
        {
          type: 'TXT',
          host: verificationHostFor(domain.domain),
          value: this.verifier.tokenFor(tenantId),
          purpose: 'Demuestra que el dominio es tuyo',
        },
        {
          type: isApex ? 'A' : 'CNAME',
          host: domain.domain,
          value: this.platform.siteTarget,
          purpose: 'Manda el tráfico del dominio al sitio',
        },
      ],
    };
  }

  private async requireTenant(tenantId: string): Promise<Tenant> {
    const tenant = await this.tenantRepository.findById(tenantId);
    if (tenant === null) {
      throw new NotFoundError('Ese cliente no existe.');
    }
    return tenant;
  }

  private async requireSignaturesForCustomDomain(tenantId: string): Promise<void> {
    const domains = await this.tenantRepository.listDomains(tenantId);
    const hasCustomDomain = domains.some((d) => !this.platform.owns(d.domain));
    if (!hasCustomDomain) return;

    const signatures = await this.signedDocumentRepository.findByTenant(tenantId);
    const hasContract = signatures.some((s) => s.document === 'contrato-de-servicio');
    const hasData = signatures.some((s) => s.document === 'contrato-de-datos');

    // Validamos solo dominios propios para no afectar la operación y demostraciones actuales (Issue #106)
    if (!hasContract || !hasData) {
      throw new BadRequestError(
        `Falta firmar para publicar en dominio propio: ${!hasContract ? 'contrato-de-servicio' : ''} ${!hasData ? 'contrato-de-datos' : ''}`,
      );
    }
  }
}
