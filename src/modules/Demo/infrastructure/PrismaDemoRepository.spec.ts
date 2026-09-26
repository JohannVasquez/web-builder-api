import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/shared/infrastructure/prisma/generated/client';
import { EMPTY_SITE_CONTENT } from '@/modules/Tenant/domain/SiteContent';
import { NotifyExpiringDemosUseCase } from '../application/NotifyExpiringDemosUseCase';
import { addDays, DemoLifecycleConfig } from '../domain/DemoLifecycleConfig';
import type { DemoExpiryWarningMail } from '../domain/DemoMailer';
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

  interface DemoFixture {
    readonly expiresAt: Date | null;
    readonly outcome?: 'converted' | 'discarded' | null;
    readonly outcomeAt?: Date;
    readonly email?: string | null;
    readonly businessName?: string;
    // Una segunda propuesta al mismo prospecto.
    readonly prospectId?: string;
  }

  const createDemo = async (fixture: DemoFixture): Promise<string> => {
    const slug = `demo-test-repo-${randomUUID().slice(0, 8)}`;
    const demoId = await repository.create({
      site: {
        slug,
        name: 'Prueba',
        address: `${slug}.test.invalid`,
        content: EMPTY_SITE_CONTENT,
      },
      prospect:
        fixture.prospectId === undefined
          ? {
              data: {
                businessName: fixture.businessName ?? 'Negocio de prueba',
                email: fixture.email ?? null,
              },
            }
          : { id: fixture.prospectId },
      templateId: null,
      industry: null,
      creator: { type: 'admin', id: null, name: 'Prueba' },
      createdAt: addDays(fixture.expiresAt ?? NOW, -14),
      expiresAt: fixture.expiresAt,
      tokenHashes: {
        prospect: hashDemoToken(randomUUID()),
        team: hashDemoToken(randomUUID()),
      },
    });
    const outcome = fixture.outcome ?? null;
    const demo = await prisma.demo.update({
      where: { id: demoId },
      data: {
        outcome,
        outcomeAt: outcome === null ? null : (fixture.outcomeAt ?? NOW),
      },
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
      const inTwoDays = await createDemo({ expiresAt: addDays(NOW, 2) });
      const inOneDay = await createDemo({ expiresAt: addDays(NOW, 1) });
      const later = await createDemo({ expiresAt: addDays(NOW, 4) });
      const expired = await createDemo({ expiresAt: addDays(NOW, -1) });
      const never = await createDemo({ expiresAt: null });
      const discarded = await createDemo({
        expiresAt: addDays(NOW, 1),
        outcome: 'discarded',
      });
      const converted = await createDemo({
        expiresAt: addDays(NOW, 1),
        outcome: 'converted',
      });
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
      const demoId = await createDemo({ expiresAt });
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
      const demoId = await createDemo({ expiresAt, outcome: 'converted' });

      expect(
        await repository.updateExpiry(demoId, expiresAt, {
          expiresAt: null,
          extensionCount: 0,
        }),
      ).toBe(false);
    });
  });

  describe('aviso de vencimiento', () => {
    // Otra época que la de las pruebas de arriba: sus demos ya vencieron para este reloj.
    const TODAY = new Date('2000-06-01T12:00:00Z');
    const sent: DemoExpiryWarningMail[] = [];
    let failFor: string | null = null;
    const notify = new NotifyExpiringDemosUseCase(
      repository,
      {
        sendExpiryWarning: (mail: DemoExpiryWarningMail): Promise<void> => {
          if (mail.to === failFor) {
            return Promise.reject(new Error('550 buzón inexistente'));
          }
          sent.push(mail);
          return Promise.resolve();
        },
      },
      new DemoLifecycleConfig(),
    );
    const sentTo = (emails: readonly string[]): string[] =>
      sent.map((mail) => mail.to).filter((to) => emails.includes(to));

    beforeEach(() => {
      sent.length = 0;
      failFor = null;
    });

    it('solo avisa a las vigentes con correo que vencen dentro de 3 días, y una sola vez', async () => {
      const mail = (name: string): string => `${name}-${randomUUID()}@prueba.invalid`;
      const emails = {
        due: mail('vence'),
        converted: mail('convertida'),
        discarded: mail('descartada'),
        expired: mail('vencida'),
        never: mail('sin-vencimiento'),
        later: mail('lejana'),
      };
      const due = await createDemo({
        expiresAt: addDays(TODAY, 2),
        email: emails.due,
        businessName: 'Pastelería Luna',
      });
      await createDemo({ expiresAt: addDays(TODAY, 2), email: null });
      await createDemo({
        expiresAt: addDays(TODAY, 2),
        email: emails.converted,
        outcome: 'converted',
      });
      await createDemo({
        expiresAt: addDays(TODAY, 2),
        email: emails.discarded,
        outcome: 'discarded',
      });
      await createDemo({ expiresAt: addDays(TODAY, -1), email: emails.expired });
      await createDemo({ expiresAt: null, email: emails.never });
      await createDemo({ expiresAt: addDays(TODAY, 5), email: emails.later });
      const all = Object.values(emails);

      await notify.execute(TODAY);

      expect(sentTo(all)).toEqual([emails.due]);
      expect(sent.find((item) => item.to === emails.due)).toEqual({
        to: emails.due,
        businessName: 'Pastelería Luna',
        expiresAt: addDays(TODAY, 2),
      });
      const record = await prisma.demo.findUnique({ where: { id: due } });
      expect(record?.expiryWarningSentAt).toEqual(TODAY);
      expect(record?.expiryWarningFor).toEqual(addDays(TODAY, 2));

      sent.length = 0;
      await notify.execute(addDays(TODAY, 1));
      expect(sentTo(all)).toEqual([]);
    });

    it('si se extiende después del aviso, avisa otra vez antes del nuevo vencimiento', async () => {
      const email = `extendida-${randomUUID()}@prueba.invalid`;
      const demoId = await createDemo({ expiresAt: addDays(TODAY, 2), email });
      await notify.execute(TODAY);

      await repository.updateExpiry(demoId, addDays(TODAY, 2), {
        expiresAt: addDays(TODAY, 16),
        extensionCount: 1,
      });
      await notify.execute(addDays(TODAY, 1));
      await notify.execute(addDays(TODAY, 14));

      expect(
        sent.filter((mail) => mail.to === email).map((mail) => mail.expiresAt),
      ).toEqual([addDays(TODAY, 2), addDays(TODAY, 16)]);
    });

    it('un envío que falla queda anotado y se reintenta en la pasada siguiente', async () => {
      const email = `falla-${randomUUID()}@prueba.invalid`;
      const demoId = await createDemo({ expiresAt: addDays(TODAY, 2), email });

      failFor = email;
      const first = await notify.execute(TODAY);
      expect(first.failedDemoIds).toContain(demoId);
      expect(
        (await prisma.demo.findUnique({ where: { id: demoId } }))?.expiryWarningError,
      ).toBe('550 buzón inexistente');

      failFor = null;
      await notify.execute(addDays(TODAY, 1));
      const record = await prisma.demo.findUnique({ where: { id: demoId } });
      expect(sentTo([email])).toEqual([email]);
      expect(record?.expiryWarningError).toBeNull();
      expect(record?.expiryWarningFor).toEqual(addDays(TODAY, 2));
    });
  });
});
