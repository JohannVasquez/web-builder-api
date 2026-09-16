import type { PrismaClient } from '../../../shared/infrastructure/prisma/generated/client';
import { Tenant } from '../domain/Tenant';
import type { SiteContent } from '../domain/SiteContent';
import { TenantSlugConflictError } from '../domain/TenantSlugConflictError';

// Prisma tipa las columnas JSON con su propio `InputJsonValue`, que no acepta un
// `Record<string, unknown>` cualquiera. Este paso es el único lugar donde se cruza.
const toJsonColumn = (props: Record<string, unknown>): object => ({ ...props });

// Prisma tipa las columnas JSON con su propio `InputJsonValue`; este es el punto de cruce.
const asJsonColumn = (value: unknown): object => value as object;
import type { TenantRepository } from '../domain/TenantRepository';

/** Forma mínima que necesita el mapeo, común a ambas consultas. */
interface TenantRecord {
  readonly id: number;
  readonly slug: string;
  readonly name: string;
  readonly domains: readonly { readonly domain: string }[];
}

export class PrismaTenantRepository implements TenantRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Busca por cualquiera de los dominios del tenant (subdominio de la
   * plataforma o dominio propio), no solo por el canónico. Los dominios sin
   * verificar se ignoran: existen en la BD pero todavía no sirven tráfico.
   */
  public async findByDomain(domain: string): Promise<Tenant | null> {
    const record = await this.prisma.tenantDomain.findFirst({
      where: { domain, verifiedAt: { not: null } },
      include: {
        tenant: {
          include: { domains: { where: { isPrimary: true }, take: 1 } },
        },
      },
    });
    return record === null ? null : this.toDomain(record.tenant);
  }

  public async findBySlug(slug: string): Promise<Tenant | null> {
    const record = await this.prisma.tenant.findUnique({
      where: { slug },
      include: { domains: { where: { isPrimary: true }, take: 1 } },
    });
    return record === null ? null : this.toDomain(record);
  }

  public async findAll(): Promise<Tenant[]> {
    const records = await this.prisma.tenant.findMany({
      include: { domains: { where: { isPrimary: true }, take: 1 } },
      orderBy: { name: 'asc' },
    });
    return records.map((record) => this.toDomain(record));
  }

  public async findDomainsByTenantId(tenantId: number): Promise<string[]> {
    const records = await this.prisma.tenantDomain.findMany({
      where: { tenantId },
      select: { domain: true },
    });
    return records.map((record) => record.domain);
  }

  public async findById(id: number): Promise<Tenant | null> {
    const record = await this.prisma.tenant.findUnique({
      where: { id },
      include: { domains: { where: { isPrimary: true }, take: 1 } },
    });
    return record === null ? null : this.toDomain(record);
  }

  public async createWithContent(
    slug: string,
    name: string,
    domains: readonly string[],
    content: SiteContent,
  ): Promise<Tenant> {
    const existing = await this.prisma.tenant.findUnique({ where: { slug } });
    if (existing !== null) {
      throw new TenantSlugConflictError(slug);
    }

    const verifiedAt = new Date();
    const tenantId = await this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({ data: { slug, name } });

      await tx.tenantDomain.createMany({
        data: domains.map((domain, index) => ({
          tenantId: tenant.id,
          domain,
          isPrimary: index === 0,
          verifiedAt,
        })),
      });

      await tx.globalSetting.createMany({
        data: Object.entries(content.settings).map(([key, value]) => ({
          tenantId: tenant.id,
          key,
          value,
        })),
      });

      await tx.navigationLink.createMany({
        data: content.navigation.map((link, index) => ({
          tenantId: tenant.id,
          label: link.label,
          href: link.href,
          position: index + 1,
        })),
      });

      if (Object.keys(content.brand).length > 0) {
        await tx.tenantBrand.create({ data: { tenantId: tenant.id, ...content.brand } });
      }

      for (const page of content.pages) {
        // El público lee `publishedContent`, no las filas de `sections`. Una página marcada
        // como publicada tiene que nacer con su foto tomada, o el sitio responde 404.
        const publishedContent = page.isPublished
          ? asJsonColumn({
              title: page.title,
              description: page.description,
              sections: page.sections.map((section, index) => ({
                type: section.type,
                position: index + 1,
                props: section.props,
                anchor: section.anchor ?? null,
              })),
            })
          : undefined;

        await tx.page.create({
          data: {
            tenantId: tenant.id,
            slug: page.slug,
            title: page.title,
            description: page.description,
            isPublished: page.isPublished,
            publishedContent,
            publishedAt: page.isPublished ? new Date() : null,
            sections: {
              create: page.sections.map((section, index) => ({
                type: section.type,
                position: index + 1,
                props: toJsonColumn(section.props),
                anchor: section.anchor ?? null,
              })),
            },
          },
        });
      }

      return tenant.id;
    });

    const created = await this.findById(tenantId);
    if (created === null) {
      throw new Error('El cliente se creó pero no se pudo leer de vuelta.');
    }
    return created;
  }

  public async readContent(tenantId: number): Promise<SiteContent | null> {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (tenant === null) {
      return null;
    }

    const [settings, navigation, brand, pages] = await Promise.all([
      this.prisma.globalSetting.findMany({ where: { tenantId } }),
      this.prisma.navigationLink.findMany({
        where: { tenantId },
        orderBy: { position: 'asc' },
      }),
      this.prisma.tenantBrand.findUnique({ where: { tenantId } }),
      this.prisma.page.findMany({
        where: { tenantId },
        include: { sections: { orderBy: { position: 'asc' } } },
        orderBy: { id: 'asc' },
      }),
    ]);

    return {
      settings: Object.fromEntries(settings.map((row) => [row.key, row.value])),
      navigation: navigation.map((link) => ({ label: link.label, href: link.href })),
      brand:
        brand === null
          ? {}
          : {
              palette: brand.palette,
              typography: brand.typography,
              assets: brand.assets,
              colorMode: brand.colorMode,
              visualStyle: brand.visualStyle,
            },
      pages: pages.map((page) => ({
        slug: page.slug,
        title: page.title,
        description: page.description,
        isPublished: page.isPublished,
        sections: page.sections.map((section) => ({
          type: section.type,
          props: section.props as Record<string, unknown>,
          anchor: section.anchor,
        })),
      })),
    };
  }

  private toDomain(record: TenantRecord): Tenant {
    return new Tenant(
      record.id,
      record.slug,
      record.name,
      record.domains[0]?.domain ?? null,
    );
  }
}
