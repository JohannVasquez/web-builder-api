import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/shared/infrastructure/prisma/generated/client';
import { EMPTY_SITE_CONTENT } from '@/modules/Tenant/domain/SiteContent';
import { addDays } from '../domain/DemoLifecycleConfig';
import { hashDemoToken } from '../domain/demoToken';
import { PrismaDemoRepository } from './PrismaDemoRepository';
import 'dotenv/config';

// Contra la base real. Todas las fechas son del año 2000: ninguna demo de verdad (ni de otra
// prueba) cae en esas ventanas, así que las consultas globales solo alcanzan lo de esta prueba,
// y al final se borra solo lo que la prueba creó.
describe('PrismaDemoRepository (base real)', () => {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  const repository = new PrismaDemoRepository(prisma);
  const NOW = new Date('2000-03-01T12:00:00Z');
  const created = { demos: [] as string[], prospects: [] as string[] };

  const createDemo = async (
    expiresAt: Date | null,
    outcome: 'converted' | 'discarded' | null = null,
  ): Promise<string> => {
    const slug = `demo-test-repo-${randomUUID().slice(0, 8)}`;
    const demoId = await repository.create({
      site: {
        slug,
        name: 'Prueba',
        address: `${slug}.test.invalid`,
        content: EMPTY_SITE_CONTENT,
      },
      prospect: { data: { businessName: 'Negocio de prueba' } },
      templateId: null,
      industry: null,
      creator: { type: 'admin', id: null, name: 'Prueba' },
      createdAt: addDays(NOW, -20),
      expiresAt,
      tokenHashes: {
        prospect: hashDemoToken(randomUUID()),
        team: hashDemoToken(randomUUID()),
      },
    });
    const demo = await prisma.demo.update({
      where: { id: demoId },
      data: { outcome, outcomeAt: outcome === null ? null : NOW },
    });
    created.demos.push(demoId);
    if (demo.prospectId !== null) {
      created.prospects.push(demo.prospectId);
    }
    return demoId;
  };

  afterAll(async () => {
    const demos = await prisma.demo.findMany({
      where: { id: { in: created.demos } },
      select: { tenantId: true },
    });
    const tenantIds = demos.flatMap((demo) => demo.tenantId ?? []);
    await prisma.demo.deleteMany({ where: { id: { in: created.demos } } });
    await prisma.tenant.deleteMany({ where: { id: { in: tenantIds } } });
    await prisma.prospect.deleteMany({ where: { id: { in: created.prospects } } });
    await prisma.$disconnect();
  });

  describe('por vencer', () => {
    it('lista las vigentes que vencen hasta la fecha tope, la más próxima primero', async () => {
      const inTwoDays = await createDemo(addDays(NOW, 2));
      const inOneDay = await createDemo(addDays(NOW, 1));
      const later = await createDemo(addDays(NOW, 4));
      const expired = await createDemo(addDays(NOW, -1));
      const never = await createDemo(null);
      const discarded = await createDemo(addDays(NOW, 1), 'discarded');
      const converted = await createDemo(addDays(NOW, 1), 'converted');
      const mine = [inTwoDays, inOneDay, later, expired, never, discarded, converted];

      const views = await repository.list(
        { status: 'vigente', expiresBefore: addDays(NOW, 3) },
        NOW,
      );

      expect(views.map((view) => view.demo.id).filter((id) => mine.includes(id))).toEqual(
        [inOneDay, inTwoDays],
      );
    });
  });

  describe('updateExpiry', () => {
    it('escribe solo si el vencimiento no cambió desde que se leyó', async () => {
      const expiresAt = addDays(NOW, 5);
      const demoId = await createDemo(expiresAt);
      const change = { expiresAt: addDays(NOW, 19), extensionCount: 1 };

      expect(await repository.updateExpiry(demoId, addDays(NOW, 6), change)).toBe(false);
      expect(await repository.updateExpiry(demoId, expiresAt, change)).toBe(true);
      // La segunda extensión calculada sobre la fecha vieja ya no escribe.
      expect(await repository.updateExpiry(demoId, expiresAt, change)).toBe(false);

      const demo = await repository.findDemo(demoId);
      expect(demo?.expiresAt).toEqual(addDays(NOW, 19));
      expect(demo?.extensionCount).toBe(1);
    });

    it('no toca una demo con resultado', async () => {
      const expiresAt = addDays(NOW, 5);
      const demoId = await createDemo(expiresAt, 'converted');

      expect(
        await repository.updateExpiry(demoId, expiresAt, {
          expiresAt: null,
          extensionCount: 0,
        }),
      ).toBe(false);
    });
  });
});
