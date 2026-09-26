import {
  Prisma,
  type PrismaClient,
} from '@/shared/infrastructure/prisma/generated/client';
import { writeTenantWithContent } from '@/modules/Tenant/infrastructure/tenantContentWriter';
import {
  Demo,
  DEMO_DISCARD_REASONS,
  DEMO_OUTCOMES,
  type DemoDiscardReason,
  type DemoLinkKind,
  type DemoOutcome,
  type DemoStatus,
} from '../domain/Demo';
import type {
  DemoAccess,
  DemoExpiryChange,
  DemoFilter,
  DemoRepository,
  DemoView,
  ExpiryWarningCandidate,
  NewDemo,
  NewDemoVisit,
  PurgedDemo,
} from '../domain/DemoRepository';
import { DemoVisit } from '../domain/DemoVisit';
import { Prospect, type ProspectPatch } from '../domain/Prospect';
import {
  DemoAddressTakenError,
  DemoClosedError,
  DemoNoLongerDueError,
} from '../domain/errors';

const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';

const isUniqueConstraintError = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === UNIQUE_CONSTRAINT_VIOLATION;

const VIEW_INCLUDE = {
  tenant: {
    select: {
      id: true,
      slug: true,
      name: true,
      domains: { where: { isPrimary: true }, take: 1, select: { domain: true } },
    },
  },
  prospect: {
    select: {
      id: true,
      businessName: true,
      contactName: true,
      phone: true,
      email: true,
    },
  },
} satisfies Prisma.DemoInclude;

type DemoRecord = Prisma.DemoGetPayload<object>;
type DemoViewRecord = Prisma.DemoGetPayload<{ include: typeof VIEW_INCLUDE }>;

const toOutcome = (value: string | null): DemoOutcome | null =>
  (DEMO_OUTCOMES as readonly string[]).includes(value ?? '')
    ? (value as DemoOutcome)
    : null;

const toDiscardReason = (value: string | null): DemoDiscardReason | null =>
  (DEMO_DISCARD_REASONS as readonly string[]).includes(value ?? '')
    ? (value as DemoDiscardReason)
    : null;

const toDemo = (record: DemoRecord): Demo =>
  new Demo(
    record.id,
    record.tenantId,
    record.prospectId,
    record.templateId,
    record.industry,
    {
      type: record.actorType === 'apiKey' ? 'apiKey' : 'admin',
      id: record.actorId,
      name: record.actorName,
    },
    record.createdAt,
    record.expiresAt,
    toOutcome(record.outcome),
    record.outcomeAt,
    {
      count: record.visitCount,
      firstAt: record.firstVisitAt,
      lastAt: record.lastVisitAt,
    },
    record.purgedAt,
    record.extensionCount,
    {
      sentAt: record.expiryWarningSentAt,
      forExpiry: record.expiryWarningFor,
      error: record.expiryWarningError,
    },
    toDiscardReason(record.discardReason),
  );

const toView = (record: DemoViewRecord): DemoView => ({
  demo: toDemo(record),
  site:
    record.tenant === null
      ? null
      : {
          tenantId: record.tenant.id,
          slug: record.tenant.slug,
          name: record.tenant.name,
          address: record.tenant.domains[0]?.domain ?? null,
        },
  prospect:
    record.prospect === null
      ? null
      : {
          id: record.prospect.id,
          businessName: record.prospect.businessName,
          contactName: record.prospect.contactName,
          phone: record.prospect.phone,
          hasEmail: record.prospect.email !== null,
        },
});

const toProspect = (record: Prisma.ProspectGetPayload<object>): Prospect =>
  new Prospect(
    record.id,
    record.businessName,
    record.contactName,
    record.phone,
    record.email,
    record.industry,
    record.source,
    record.notes,
    record.createdAt,
    record.updatedAt,
  );

// El estado se deriva de la hora de la consulta; aquí se traduce a una condición de base
// para no traer todas las demos y filtrar en memoria.
const statusWhere = (
  status: Exclude<DemoStatus, 'borrada'>,
  now: Date,
): Prisma.DemoWhereInput => {
  switch (status) {
    case 'convertida':
      return { outcome: 'converted' };
    case 'descartada':
      return { outcome: 'discarded' };
    case 'vencida':
      return { outcome: null, expiresAt: { lte: now } };
    case 'vigente':
      return { outcome: null, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] };
  }
};

// Cascada de un sitio entero: más que los 5 s por omisión de una transacción interactiva.
const PURGE_TRANSACTION_TIMEOUT_MS = 60_000;

// Lo que la fila conserva al borrarse: kit, rubro, quién la creó, fechas, resultado y motivo
// del descarte (una lista cerrada, sin texto libre), extensiones y contadores de visitas. El
// resto se vacía, porque o apunta al prospecto o es texto libre que puede nombrarlo (el motivo
// de un correo rebotado trae su dirección).
const ANONYMIZED: Prisma.DemoUncheckedUpdateInput = {
  tenantId: null,
  prospectId: null,
  expiryWarningSentAt: null,
  expiryWarningFor: null,
  expiryWarningError: null,
};

type Transaction = Prisma.TransactionClient;

// Un archivo de la demo que otro sitio también usa (por ejemplo, una segunda propuesta que se
// armó duplicando esta) no se borra del bucket: pasa a la biblioteca de ese otro sitio. La
// búsqueda es textual sobre todo lo que puede guardar una key; es conservadora: ante la duda,
// el archivo se queda.
const findKeysUsedElsewhere = async (
  tx: Transaction,
  tenantId: string,
  keys: readonly string[],
): Promise<Map<string, string>> => {
  if (keys.length === 0) {
    return new Map();
  }
  const rows = await tx.$queryRaw<{ key: string; tenant_id: string | null }[]>`
    SELECT k.key, (
      SELECT used.tenant_id FROM (
        SELECT p.tenant_id FROM page_sections s JOIN pages p ON p.id = s.page_id
          WHERE s.props::text LIKE '%' || k.key || '%'
        UNION ALL
        SELECT p.tenant_id FROM pages p
          WHERE p.og_image_key = k.key OR p.published_content::text LIKE '%' || k.key || '%'
        UNION ALL
        SELECT p.tenant_id FROM page_versions v JOIN pages p ON p.id = v.page_id
          WHERE v.snapshot::text LIKE '%' || k.key || '%'
        UNION ALL
        SELECT b.tenant_id FROM tenant_brands b WHERE b.assets::text LIKE '%' || k.key || '%'
        UNION ALL
        SELECT g.tenant_id FROM global_settings g WHERE g.value LIKE '%' || k.key || '%'
        UNION ALL
        SELECT bp.tenant_id FROM blog_posts bp
          WHERE bp.cover_image_key = k.key OR bp.og_image_key = k.key
             OR bp.content::text LIKE '%' || k.key || '%'
        UNION ALL
        SELECT pr.tenant_id FROM products pr WHERE k.key = ANY(pr.image_keys)
      ) used
      WHERE used.tenant_id <> ${tenantId}::uuid
      LIMIT 1
    ) AS tenant_id
    FROM unnest(${keys}::text[]) AS k(key)
  `;
  return new Map(
    rows.flatMap((row) => (row.tenant_id === null ? [] : [[row.key, row.tenant_id]])),
  );
};

export class PrismaDemoRepository implements DemoRepository {
  constructor(private readonly prisma: PrismaClient) {}

  public async create(input: NewDemo): Promise<string> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const tenantId = await writeTenantWithContent(tx, {
          slug: input.site.slug,
          name: input.site.name,
          domains: [input.site.address],
          content: input.site.content,
          status: 'demo',
        });

        const prospectId =
          'id' in input.prospect
            ? input.prospect.id
            : (
                await tx.prospect.create({
                  data: {
                    businessName: input.prospect.data.businessName,
                    contactName: input.prospect.data.contactName ?? null,
                    phone: input.prospect.data.phone ?? null,
                    email: input.prospect.data.email ?? null,
                    industry: input.prospect.data.industry ?? null,
                    source: input.prospect.data.source ?? null,
                    notes: input.prospect.data.notes ?? null,
                  },
                })
              ).id;

        const demo = await tx.demo.create({
          data: {
            tenantId,
            prospectId,
            templateId: input.templateId,
            industry: input.industry,
            actorType: input.creator.type,
            actorId: input.creator.id,
            actorName: input.creator.name,
            createdAt: input.createdAt,
            expiresAt: input.expiresAt,
          },
        });

        await tx.demoAccessToken.createMany({
          data: (Object.entries(input.tokenHashes) as [DemoLinkKind, string][]).map(
            ([kind, tokenHash]) => ({ demoId: demo.id, kind, tokenHash }),
          ),
        });

        return demo.id;
      });
    } catch (error) {
      // Otra creación ganó la carrera por el mismo slug o la misma dirección.
      if (isUniqueConstraintError(error)) {
        throw new DemoAddressTakenError(input.site.slug);
      }
      throw error;
    }
  }

  public async isAddressTaken(tenantSlug: string, address: string): Promise<boolean> {
    const [tenant, domain] = await Promise.all([
      this.prisma.tenant.findUnique({
        where: { slug: tenantSlug },
        select: { id: true },
      }),
      this.prisma.tenantDomain.findUnique({
        where: { domain: address },
        select: { id: true },
      }),
    ]);
    return tenant !== null || domain !== null;
  }

  public async findById(demoId: string): Promise<DemoView | null> {
    const record = await this.prisma.demo.findUnique({
      where: { id: demoId },
      include: VIEW_INCLUDE,
    });
    return record === null || record.purgedAt !== null ? null : toView(record);
  }

  public async list(filter: DemoFilter, now: Date): Promise<DemoView[]> {
    const records = await this.prisma.demo.findMany({
      where: {
        // Una demo borrada es solo un número en las métricas: no se lista como demo.
        purgedAt: null,
        ...(filter.prospectId === undefined ? {} : { prospectId: filter.prospectId }),
        ...(filter.createdBy === undefined ? {} : { actorId: filter.createdBy }),
        ...(filter.status === undefined ? {} : statusWhere(filter.status, now)),
        ...(filter.expiresBefore === undefined
          ? {}
          : { AND: [{ expiresAt: { not: null, lte: filter.expiresBefore } }] }),
      },
      include: VIEW_INCLUDE,
      // Con fecha tope la pregunta es "a quién llamo primero": la que vence antes.
      orderBy:
        filter.expiresBefore === undefined
          ? { createdAt: 'desc' }
          : [{ expiresAt: 'asc' }, { createdAt: 'desc' }],
    });
    return records.map(toView);
  }

  public async findDemo(demoId: string): Promise<Demo | null> {
    const record = await this.prisma.demo.findUnique({ where: { id: demoId } });
    return record === null ? null : toDemo(record);
  }

  public async updateExpiry(
    demoId: string,
    expected: Date | null,
    change: DemoExpiryChange,
  ): Promise<boolean> {
    const { count } = await this.prisma.demo.updateMany({
      where: { id: demoId, expiresAt: expected, outcome: null, purgedAt: null },
      data: { expiresAt: change.expiresAt, extensionCount: change.extensionCount },
    });
    return count === 1;
  }

  public async findProspect(prospectId: string): Promise<Prospect | null> {
    const record = await this.prisma.prospect.findUnique({ where: { id: prospectId } });
    return record === null ? null : toProspect(record);
  }

  public async updateProspect(
    prospectId: string,
    patch: ProspectPatch,
  ): Promise<Prospect> {
    const record = await this.prisma.prospect.update({
      where: { id: prospectId },
      data: patch,
    });
    return toProspect(record);
  }

  public async replaceAccessToken(
    demoId: string,
    kind: DemoLinkKind,
    tokenHash: string,
  ): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.demoAccessToken.updateMany({
        where: { demoId, kind, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
      this.prisma.demoAccessToken.create({ data: { demoId, kind, tokenHash } }),
    ]);
  }

  public async findAccess(tokenHash: string): Promise<DemoAccess | null> {
    const record = await this.prisma.demoAccessToken.findUnique({
      where: { tokenHash },
      include: { demo: true },
    });
    if (record === null) {
      return null;
    }
    return {
      kind: record.kind === 'team' ? 'team' : 'prospect',
      revokedAt: record.revokedAt,
      demo: toDemo(record.demo),
    };
  }

  public async recordVisit(demoId: string, visit: NewDemoVisit): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.demoVisit.create({
        data: {
          demoId,
          pageSlug: visit.pageSlug,
          ipHash: visit.ipHash,
          userAgent: visit.userAgent,
          visitedAt: visit.visitedAt,
        },
      }),
      // En SQL y no leer-y-escribir: dos páginas abiertas a la vez no pueden pisarse el conteo.
      this.prisma.$executeRaw`
        UPDATE "demos"
        SET "visit_count" = "visit_count" + 1,
            "first_visit_at" = COALESCE("first_visit_at", ${visit.visitedAt}),
            "last_visit_at" = GREATEST(COALESCE("last_visit_at", ${visit.visitedAt}), ${visit.visitedAt}),
            "updated_at" = NOW()
        WHERE "id" = ${demoId}::uuid
      `,
    ]);
  }

  public async listVisits(
    demoId: string,
    page: number,
    perPage: number,
  ): Promise<{ visits: DemoVisit[]; total: number }> {
    const [records, total] = await Promise.all([
      this.prisma.demoVisit.findMany({
        where: { demoId },
        orderBy: { visitedAt: 'desc' },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      this.prisma.demoVisit.count({ where: { demoId } }),
    ]);
    return {
      visits: records.map(
        (record) =>
          new DemoVisit(
            record.id,
            record.pageSlug,
            record.visitedAt,
            record.ipHash,
            record.userAgent,
          ),
      ),
      total,
    };
  }

  public async findExpiryWarningCandidates(
    now: Date,
    until: Date,
  ): Promise<ExpiryWarningCandidate[]> {
    const records = await this.prisma.demo.findMany({
      where: {
        purgedAt: null,
        tenantId: { not: null },
        outcome: null,
        expiresAt: { gt: now, lte: until },
        prospect: { email: { not: null } },
      },
      include: { prospect: { select: { businessName: true, email: true } } },
      orderBy: { expiresAt: 'asc' },
    });
    return records.flatMap((record) =>
      record.prospect?.email == null
        ? []
        : [
            {
              demo: toDemo(record),
              businessName: record.prospect.businessName,
              email: record.prospect.email,
            },
          ],
    );
  }

  public async markExpiryWarningSent(
    demoId: string,
    sentAt: Date,
    forExpiry: Date,
  ): Promise<void> {
    await this.prisma.demo.update({
      where: { id: demoId },
      data: {
        expiryWarningSentAt: sentAt,
        expiryWarningFor: forExpiry,
        expiryWarningError: null,
      },
    });
  }

  public async markExpiryWarningFailed(demoId: string, error: string): Promise<void> {
    await this.prisma.demo.update({
      where: { id: demoId },
      data: { expiryWarningError: error.slice(0, 1000) },
    });
  }

  public async findDueForPurge(cutoff: Date): Promise<Demo[]> {
    const records = await this.prisma.demo.findMany({
      where: {
        purgedAt: null,
        OR: [
          { outcome: null, expiresAt: { lt: cutoff } },
          { outcome: 'discarded', outcomeAt: { lt: cutoff } },
        ],
      },
      orderBy: { createdAt: 'asc' },
    });
    return records.map(toDemo);
  }

  public async purge(demoId: string, now: Date, dueBefore?: Date): Promise<PurgedDemo> {
    return this.prisma.$transaction(
      async (tx) => {
        const record = await tx.demo.findUnique({ where: { id: demoId } });
        if (record === null || record.purgedAt !== null) {
          throw new DemoClosedError('Esa demo ya se borró.');
        }
        if (record.outcome === 'converted') {
          throw new DemoClosedError(
            'Esa demo ya es un cliente: no se puede borrar como demo.',
          );
        }
        const { tenantId, prospectId } = record;

        // Lo primero, para tomar la fila: una extensión o una recuperación que llegó después de
        // que la tarea eligió esta demo espera a esta transacción o la hace fallar, y con
        // `dueBefore` la condición se vuelve a evaluar sobre la fila ya actualizada.
        const { count } = await tx.demo.updateMany({
          where: {
            id: demoId,
            purgedAt: null,
            ...(dueBefore === undefined
              ? {}
              : {
                  OR: [
                    { outcome: null, expiresAt: { lt: dueBefore } },
                    { outcome: 'discarded', outcomeAt: { lt: dueBefore } },
                  ],
                }),
          },
          data: { ...ANONYMIZED, purgedAt: now },
        });
        if (count !== 1) {
          throw new DemoNoLongerDueError();
        }

        let pendingFileKeys: string[] = [];
        if (tenantId !== null) {
          const assets = await tx.storageAsset.findMany({
            where: { tenantId },
            select: { key: true },
          });
          const keys = assets.map((asset) => asset.key);
          const usedElsewhere = await findKeysUsedElsewhere(tx, tenantId, keys);
          for (const [key, otherTenantId] of usedElsewhere) {
            await tx.storageAsset.update({
              where: { key },
              data: { tenantId: otherTenantId },
            });
          }
          pendingFileKeys = keys.filter((key) => !usedElsewhere.has(key));
          // Anotados antes de borrar el sitio: con él se va la biblioteca, que es la única
          // lista de sus archivos.
          await tx.demoPendingFile.createMany({
            data: pendingFileKeys.map((key) => ({ demoId, key })),
            skipDuplicates: true,
          });
        }

        await tx.demoVisit.deleteMany({ where: { demoId } });
        await tx.demoAccessToken.deleteMany({ where: { demoId } });
        const demo = await tx.demo.findUniqueOrThrow({ where: { id: demoId } });
        if (tenantId !== null) {
          // Páginas, versiones, marca, navegación, mensajes, pedidos de prueba, productos,
          // biblioteca y registro de actividad del sitio caen en cascada.
          await tx.tenant.deleteMany({ where: { id: tenantId } });
        }

        // El prospecto se queda mientras tenga otra propuesta sin borrar, o una convertida
        // (ya es cliente).
        let prospectDeleted = false;
        if (prospectId !== null) {
          const others = await tx.demo.count({
            where: {
              prospectId,
              OR: [{ purgedAt: null }, { outcome: 'converted' }],
            },
          });
          if (others === 0) {
            await tx.prospect.deleteMany({ where: { id: prospectId } });
            prospectDeleted = true;
          }
        }

        return { demo: toDemo(demo), pendingFileKeys, prospectDeleted };
      },
      { timeout: PURGE_TRANSACTION_TIMEOUT_MS },
    );
  }

  public async discard(
    demoId: string,
    reason: DemoDiscardReason | null,
    now: Date,
  ): Promise<boolean> {
    const { count } = await this.prisma.demo.updateMany({
      where: { id: demoId, outcome: null, purgedAt: null, tenantId: { not: null } },
      data: { outcome: 'discarded', outcomeAt: now, discardReason: reason },
    });
    return count === 1;
  }

  public async restore(
    demoId: string,
    discardedAt: Date,
    expiresAt: Date,
  ): Promise<boolean> {
    const { count } = await this.prisma.demo.updateMany({
      where: {
        id: demoId,
        outcome: 'discarded',
        outcomeAt: discardedAt,
        purgedAt: null,
        tenantId: { not: null },
      },
      data: { outcome: null, outcomeAt: null, discardReason: null, expiresAt },
    });
    return count === 1;
  }

  public async findPendingFiles(demoId?: string): Promise<string[]> {
    const records = await this.prisma.demoPendingFile.findMany({
      where: demoId === undefined ? {} : { demoId },
      select: { key: true },
      orderBy: { createdAt: 'asc' },
    });
    return records.map((record) => record.key);
  }

  public async resolvePendingFile(key: string): Promise<void> {
    await this.prisma.demoPendingFile.deleteMany({ where: { key } });
  }

  public async failPendingFile(key: string, error: string, at: Date): Promise<void> {
    await this.prisma.demoPendingFile.updateMany({
      where: { key },
      data: {
        attempts: { increment: 1 },
        lastError: error.slice(0, 1000),
        lastAttemptAt: at,
      },
    });
  }
}
