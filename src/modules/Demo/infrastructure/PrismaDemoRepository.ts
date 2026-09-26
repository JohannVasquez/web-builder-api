import {
  Prisma,
  type PrismaClient,
} from '@/shared/infrastructure/prisma/generated/client';
import { writeTenantWithContent } from '@/modules/Tenant/infrastructure/tenantContentWriter';
import {
  Demo,
  DEMO_OUTCOMES,
  type DemoLinkKind,
  type DemoOutcome,
  type DemoStatus,
} from '../domain/Demo';
import type {
  DemoAccess,
  DemoFilter,
  DemoRepository,
  DemoView,
  NewDemo,
  NewDemoVisit,
} from '../domain/DemoRepository';
import { DemoVisit } from '../domain/DemoVisit';
import { Prospect, type ProspectPatch } from '../domain/Prospect';
import { DemoAddressTakenError } from '../domain/errors';

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
  prospect: { select: { id: true, businessName: true } },
} satisfies Prisma.DemoInclude;

type DemoRecord = Prisma.DemoGetPayload<object>;
type DemoViewRecord = Prisma.DemoGetPayload<{ include: typeof VIEW_INCLUDE }>;

const toOutcome = (value: string | null): DemoOutcome | null =>
  (DEMO_OUTCOMES as readonly string[]).includes(value ?? '')
    ? (value as DemoOutcome)
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
  prospect: record.prospect,
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
const statusWhere = (status: DemoStatus, now: Date): Prisma.DemoWhereInput => {
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
      },
      include: VIEW_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    return records.map(toView);
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
}
