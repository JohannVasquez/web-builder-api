import type { Prisma } from '@/shared/infrastructure/prisma/generated/client';
import type { SiteContent } from '../domain/SiteContent';
import type { TenantStatus } from '../domain/Tenant';

// Prisma tipa las columnas JSON con su propio `InputJsonValue`, que no acepta un
// `Record<string, unknown>` cualquiera. Este paso es el único lugar donde se cruza.
const toJsonColumn = (props: Record<string, unknown>): object => ({ ...props });

// Prisma tipa las columnas JSON con su propio `InputJsonValue`; este es el punto de cruce.
const asJsonColumn = (value: unknown): object => value as object;

export interface NewTenantWithContent {
  readonly slug: string;
  readonly name: string;
  // El primero es el canónico. Todos nacen verificados: quien llama ya decidió que son nuestros.
  readonly domains: readonly string[];
  readonly content: SiteContent;
  readonly status?: TenantStatus;
}

// Escribe un cliente y su sitio entero dentro de la transacción que le pasen. Vive aparte del
// repositorio para que otra operación (crear una demo con su prospecto y sus enlaces) pueda
// sumar sus propias filas a la MISMA transacción: un sitio creado a medias parece funcionar
// hasta que alguien lo abre.
export const writeTenantWithContent = async (
  tx: Prisma.TransactionClient,
  input: NewTenantWithContent,
): Promise<string> => {
  const { slug, name, domains, content } = input;
  const verifiedAt = new Date();
  const tenant = await tx.tenant.create({
    data: { slug, name, ...(input.status === undefined ? {} : { status: input.status }) },
  });

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
};
