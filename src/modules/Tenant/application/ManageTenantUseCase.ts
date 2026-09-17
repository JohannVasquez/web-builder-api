import { BadRequestError } from '../../../shared/domain/BadRequestError';
import { NotFoundError } from '../../../shared/domain/NotFoundError';
import type { DomainVerifier } from '../domain/DomainVerifier';
import type { Tenant, TenantStatus } from '../domain/Tenant';
import { verificationHostFor, type TenantDomainRecord } from '../domain/TenantDomain';
import { TenantRepository } from '../domain/TenantRepository';

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
  ) {}

  public async setStatus(tenantId: number, status: TenantStatus): Promise<Tenant> {
    await this.requireTenant(tenantId);
    return this.tenantRepository.setStatus(tenantId, status);
  }

  public async listDomains(tenantId: number): Promise<TenantDomainRecord[]> {
    await this.requireTenant(tenantId);
    return this.tenantRepository.listDomains(tenantId);
  }

  public async addDomain(tenantId: number, domain: string): Promise<TenantDomainRecord> {
    await this.requireTenant(tenantId);
    return this.tenantRepository.addDomain(tenantId, domain, this.platform.owns(domain));
  }

  public async setPrimaryDomain(
    tenantId: number,
    domainId: number,
  ): Promise<TenantDomainRecord> {
    return this.tenantRepository.setPrimaryDomain(tenantId, domainId);
  }

  public async deleteDomain(tenantId: number, domainId: number): Promise<void> {
    await this.tenantRepository.deleteDomain(tenantId, domainId);
  }

  // Comprueba el DNS de verdad: marcar verificado sin mirar dejaría entrar el dominio de
  // otra persona al sitio de un cliente.
  public async verifyDomain(
    tenantId: number,
    domainId: number,
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
    return this.tenantRepository.markDomainVerified(tenantId, domainId);
  }

  public instructionsFor(
    tenantId: number,
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

  private async requireTenant(tenantId: number): Promise<Tenant> {
    const tenant = await this.tenantRepository.findById(tenantId);
    if (tenant === null) {
      throw new NotFoundError('Ese cliente no existe.');
    }
    return tenant;
  }
}
