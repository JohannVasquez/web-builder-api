import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/shared/infrastructure/prisma/generated/client';
import { GetDemoMetricsUseCase } from '../application/GetDemoMetricsUseCase';
import { PrismaDemoMetricsRepository } from './PrismaDemoMetricsRepository';
import 'dotenv/config';

// Contra la base real. Todas las fechas son de 1987: ninguna demo de verdad ni de otra prueba cae
// en esa ventana, y al final se borra solo lo que esta prueba creó.
describe('PrismaDemoMetricsRepository (base real)', () => {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  const repository = new PrismaDemoMetricsRepository(prisma);
  const START = new Date('1987-03-10T00:00:00.000Z');
  const END = new Date('1987-03-20T00:00:00.000Z');
  const created: string[] = [];

  interface RowFixture {
    readonly createdAt: Date;
    readonly outcome?: string | null;
    readonly outcomeAt?: Date | null;
    readonly discardReason?: string | null;
    readonly purgedAt?: Date | null;
    readonly visitCount?: number;
    readonly firstVisitAt?: Date | null;
    readonly templateId?: string | null;
    readonly actorType?: string;
  }

  const insert = async (fixture: RowFixture): Promise<string> => {
    const demo = await prisma.demo.create({
      data: {
        tenantId: null,
        prospectId: null,
        templateId: fixture.templateId === undefined ? 'pasteleria' : fixture.templateId,
        industry: 'pastelería',
        actorType: fixture.actorType ?? 'admin',
        actorId: null,
        actorName: 'Prueba métricas',
        createdAt: fixture.createdAt,
        expiresAt: new Date(fixture.createdAt.getTime() + 14 * 24 * 60 * 60 * 1000),
        outcome: fixture.outcome ?? null,
        outcomeAt: fixture.outcomeAt ?? null,
        discardReason: fixture.discardReason ?? null,
        extensionCount: 1,
        visitCount: fixture.visitCount ?? 0,
        firstVisitAt: fixture.firstVisitAt ?? null,
        lastVisitAt: fixture.firstVisitAt ?? null,
        purgedAt: fixture.purgedAt ?? null,
      },
      select: { id: true },
    });
    created.push(demo.id);
    return demo.id;
  };

  afterAll(async () => {
    await prisma.demo.deleteMany({ where: { id: { in: created } } });
    await prisma.$disconnect();
  });

  it('trae las creadas en el rango, también las borradas, con el borde final excluido', async () => {
    await insert({ createdAt: START });
    await insert({
      createdAt: new Date('1987-03-12T15:00:00.000Z'),
      purgedAt: new Date('1987-05-01T00:00:00.000Z'),
      outcome: 'discarded',
      outcomeAt: new Date('1987-03-14T00:00:00.000Z'),
      discardReason: 'precio',
      visitCount: 3,
      firstVisitAt: new Date('1987-03-13T00:00:00.000Z'),
      templateId: null,
      actorType: 'apiKey',
    });
    await insert({ createdAt: new Date(START.getTime() - 1) });
    await insert({ createdAt: END });

    const rows = await repository.findCreatedBetween(START, END);

    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({
      industry: 'pastelería',
      templateId: 'pasteleria',
      creator: { type: 'admin', name: 'Prueba métricas' },
      createdAt: START,
      expiresAt: new Date('1987-03-24T00:00:00.000Z'),
      outcome: null,
      outcomeAt: null,
      discardReason: null,
      extensionCount: 1,
      visitCount: 0,
      firstVisitAt: null,
      purgedAt: null,
    });
    expect(rows[1]).toMatchObject({
      templateId: null,
      creator: { type: 'apiKey', name: 'Prueba métricas' },
      outcome: 'discarded',
      discardReason: 'precio',
      visitCount: 3,
      purgedAt: new Date('1987-05-01T00:00:00.000Z'),
    });
  });

  it('un motivo que ya no está en la lista se lee como sin motivo', async () => {
    const start = new Date('1987-04-01T00:00:00.000Z');
    await insert({
      createdAt: start,
      outcome: 'discarded',
      outcomeAt: start,
      discardReason: 'texto viejo',
    });

    const rows = await repository.findCreatedBetween(
      start,
      new Date('1987-04-02T00:00:00.000Z'),
    );

    expect(rows.map((row) => row.discardReason)).toEqual([null]);
  });

  it('las métricas de un mes salen de esas filas, con las borradas y otra-propuesta', async () => {
    const day = (value: string): Date => new Date(`1987-06-${value}T15:00:00.000Z`);
    await insert({
      createdAt: day('02'),
      visitCount: 2,
      firstVisitAt: day('03'),
      outcome: 'converted',
      outcomeAt: day('05'),
    });
    await insert({
      createdAt: day('04'),
      visitCount: 1,
      firstVisitAt: day('05'),
      purgedAt: day('30'),
    });
    await insert({
      createdAt: day('06'),
      outcome: 'discarded',
      outcomeAt: day('05'),
      discardReason: 'otra-propuesta',
    });

    const metrics = await new GetDemoMetricsUseCase(repository).execute(
      { from: '1987-06-01', to: '1987-06-30', groupBy: 'month' },
      new Date('2026-09-26T12:00:00.000Z'),
    );

    expect(metrics.funnel).toEqual({
      created: 3,
      opened: 2,
      converted: 1,
      openRate: 0.6667,
      conversionRate: 0.3333,
      conversionRateOfOpened: 0.5,
    });
    expect(metrics.outcomes).toMatchObject({
      converted: 1,
      expired: 1,
      discarded: 0,
      otraPropuesta: 1,
      purged: 1,
    });
    expect(metrics.timing).toEqual({
      medianDaysToFirstVisit: 1,
      medianDaysToConversion: 3,
    });
    expect(metrics.groups).toEqual([
      { key: '1987-06', label: '1987-06', funnel: metrics.funnel },
    ]);
  });
});
