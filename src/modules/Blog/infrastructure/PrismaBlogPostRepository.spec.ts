import { PrismaBlogPostRepository } from './PrismaBlogPostRepository';
import type { PrismaClient } from '../../../shared/infrastructure/prisma/generated/client';

// La regla de visibilidad es una cláusula WHERE, así que lo que se puede comprobar sin base
// de datos es que se aplique siempre y con la forma correcta. Que el SQL haga lo esperado
// está verificado contra la base real: borrador y programada a futuro responden 404.
type QueryArgs = { where?: Record<string, unknown> };
type QuerySpy = jest.Mock<Promise<unknown>, [QueryArgs]>;

const querySpy = (value: unknown): QuerySpy =>
  jest.fn<Promise<unknown>, [QueryArgs]>().mockResolvedValue(value);

const whereOf = (spy: QuerySpy): Record<string, unknown> =>
  spy.mock.calls[0]?.[0].where ?? {};

describe('PrismaBlogPostRepository (la regla de visibilidad)', () => {
  const now = new Date('2026-06-01T12:00:00.000Z');

  const buildPrisma = (): {
    prisma: PrismaClient;
    findFirst: QuerySpy;
    findMany: QuerySpy;
  } => {
    const findFirst = querySpy(null);
    const findMany = querySpy([]);
    const count = querySpy(0);
    return {
      prisma: { blogPost: { findFirst, findMany, count } } as unknown as PrismaClient,
      findFirst,
      findMany,
    };
  };

  const visibilidad = {
    OR: [{ status: 'published' }, { status: 'scheduled', publishedAt: { lte: now } }],
  };

  it('al buscar por slug exige que sea visible, no solo que exista', async () => {
    const { prisma, findFirst } = buildPrisma();

    await new PrismaBlogPostRepository(prisma).findVisibleBySlug(9, 'hola', now);

    expect(findFirst).toHaveBeenCalledWith({
      where: { tenantId: 9, slug: 'hola', ...visibilidad },
    });
  });

  it('el listado público filtra por lo mismo y por el cliente', async () => {
    const { prisma, findMany } = buildPrisma();

    await new PrismaBlogPostRepository(prisma).listVisible(
      9,
      { page: 1, perPage: 10 },
      now,
    );

    expect(whereOf(findMany)).toEqual({ tenantId: 9, ...visibilidad });
  });

  it('el filtro por etiqueta se suma a la visibilidad, no la reemplaza', async () => {
    const { prisma, findMany } = buildPrisma();

    await new PrismaBlogPostRepository(prisma).listVisible(
      9,
      { page: 1, perPage: 10, tag: 'consejos' },
      now,
    );

    expect(whereOf(findMany)).toEqual({
      tenantId: 9,
      ...visibilidad,
      tags: { has: 'consejos' },
    });
  });

  it('las relacionadas también son visibles y excluyen la publicación actual', async () => {
    const { prisma, findMany } = buildPrisma();

    await new PrismaBlogPostRepository(prisma).listRelatedVisible(
      9,
      42,
      ['consejos'],
      now,
      3,
    );

    const where = whereOf(findMany);
    expect(where.tenantId).toBe(9);
    expect(where.id).toEqual({ not: 42 });
    expect(JSON.stringify(where)).toContain('scheduled');
  });

  it('el listado de administración NO filtra por visibilidad: ahí se ven los borradores', async () => {
    const { prisma, findMany } = buildPrisma();

    await new PrismaBlogPostRepository(prisma).findAllByTenant(9);

    expect(whereOf(findMany)).toEqual({ tenantId: 9 });
  });
});
