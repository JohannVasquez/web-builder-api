import type { PrismaClient } from '../../../shared/infrastructure/prisma/generated/client';
import { PageSnapshotSchema, type PageSnapshot } from '../domain/PageSnapshot';
import type {
  PageVersionActor,
  PageVersionPrimitives,
  PageVersionRepository,
} from '../domain/PageVersionRepository';

const MAX_VERSIONS_PER_PAGE = 50;

// Prisma tipa las columnas JSON con su propio `InputJsonValue`, que no acepta un tipo
// inferido por zod. Este es el único punto donde se cruza; `unknown` de por medio evita
// que el `as` quede marcado como innecesario cuando el linter resuelve otro tipo.
const asJsonColumn = (value: unknown): object => value as object;

export class PrismaPageVersionRepository implements PageVersionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  public async record(
    pageId: number,
    snapshot: PageSnapshot,
    summary: string,
    actor: PageVersionActor,
  ): Promise<void> {
    await this.prisma.pageVersion.create({
      data: {
        pageId,
        snapshot: asJsonColumn(snapshot),
        summary: summary.slice(0, 255),
        actorType: actor.type,
        actorId: actor.id,
        actorName: actor.name,
      },
    });
    await this.pruneOldVersions(pageId);
  }

  public async list(
    tenantId: number,
    pageId: number,
    limit: number,
  ): Promise<PageVersionPrimitives[]> {
    const records = await this.prisma.pageVersion.findMany({
      where: { pageId, page: { tenantId } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return records.map((record) => ({
      id: record.id,
      summary: record.summary,
      actorType: record.actorType,
      actorName: record.actorName,
      published: record.published,
      createdAt: record.createdAt.toISOString(),
    }));
  }

  // Siempre con `tenantId`: un id de versión adivinado no puede alcanzar otro cliente.
  public async findSnapshot(
    tenantId: number,
    pageId: number,
    versionId: number,
  ): Promise<PageSnapshot | null> {
    const record = await this.prisma.pageVersion.findFirst({
      where: { id: versionId, pageId, page: { tenantId } },
    });
    if (record === null) {
      return null;
    }
    const parsed = PageSnapshotSchema.safeParse(record.snapshot);
    return parsed.success ? parsed.data : null;
  }

  public async markPublished(pageId: number, versionId: number): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.pageVersion.updateMany({
        where: { pageId, published: true },
        data: { published: false },
      }),
      this.prisma.pageVersion.updateMany({
        where: { id: versionId, pageId },
        data: { published: true },
      }),
    ]);
  }

  // Un historial infinito crece sin límite y nadie mira más allá de las últimas decenas.
  // Se conserva siempre la versión publicada, que es la que permite volver atrás de verdad.
  private async pruneOldVersions(pageId: number): Promise<void> {
    const keep = await this.prisma.pageVersion.findMany({
      where: { pageId },
      orderBy: { createdAt: 'desc' },
      take: MAX_VERSIONS_PER_PAGE,
      select: { id: true },
    });
    await this.prisma.pageVersion.deleteMany({
      where: {
        pageId,
        published: false,
        id: { notIn: keep.map((version) => version.id) },
      },
    });
  }
}
