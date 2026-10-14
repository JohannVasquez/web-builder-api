import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/shared/infrastructure/prisma/generated/client';
import { EMPTY_SITE_CONTENT } from '@/modules/Tenant/domain/SiteContent';
import type { RecordActivityUseCase } from '@/modules/ActivityLog/application/RecordActivityUseCase';
import type { StorageProvider } from '@/modules/FileStorage/domain/StorageProvider';
import { NotifyExpiringDemosUseCase } from '../application/NotifyExpiringDemosUseCase';
import { PurgeDemoUseCase } from '../application/PurgeDemoUseCase';
import { PurgeExpiredDemosUseCase } from '../application/PurgeExpiredDemosUseCase';
import { DiscardDemoUseCase } from '../application/DiscardDemoUseCase';
import { ValidateDemoAccessUseCase } from '../application/ValidateDemoAccessUseCase';
import {
  DemoAddressTakenError,
  DemoClosedError,
  DemoNoLongerDueError,
  DemoOwnerNotClientError,
} from '../domain/errors';
import { addDays, DemoLifecycleConfig } from '../domain/DemoLifecycleConfig';
import type { DemoExpiryWarningMail } from '../domain/DemoMailer';
import { generateDemoToken, hashDemoToken } from '../domain/demoToken';
import { PrismaDemoRepository } from './PrismaDemoRepository';
import 'dotenv/config';

// Contra la base real. Todas las fechas son de 1990 o del 2000: ninguna demo de verdad cae en
// esas ventanas, así que las consultas globales (por vencer, avisos, borrado) solo alcanzan lo
// de esta prueba, y al final se borra solo lo que la prueba creó.
describe('PrismaDemoRepository (base real)', () => {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  const repository = new PrismaDemoRepository(prisma);
  const NOW = new Date('2000-03-01T12:00:00Z');
  const created = {
    demos: [] as string[],
    prospects: [] as string[],
    tenants: [] as string[],
    users: [] as string[],
  };

  interface DemoFixture {
    readonly expiresAt: Date | null;
    readonly outcome?: 'converted' | 'discarded' | null;
    readonly outcomeAt?: Date;
    readonly email?: string | null;
    readonly businessName?: string;
    readonly phone?: string;
    readonly industry?: string;
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
                phone: fixture.phone ?? null,
                notes: 'Notas de prueba',
              },
            }
          : { id: fixture.prospectId },
      templateId: 'pasteleria',
      industry: fixture.industry ?? null,
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
    if (demo.tenantId !== null) {
      created.tenants.push(demo.tenantId);
    }
    if (demo.prospectId !== null) {
      created.prospects.push(demo.prospectId);
    }
    return demoId;
  };

  afterAll(async () => {
    // Las ids de sitio se guardaron al crearlos: una demo borrada ya no apunta al suyo.
    await prisma.demo.deleteMany({ where: { id: { in: created.demos } } });
    await prisma.tenant.deleteMany({ where: { id: { in: created.tenants } } });
    await prisma.prospect.deleteMany({ where: { id: { in: created.prospects } } });
    await prisma.adminUser.deleteMany({ where: { id: { in: created.users } } });
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

  describe('borrado', () => {
    // Otra época más: para este reloj, las demos de 2000 todavía no existen.
    const TODAY = new Date('1990-06-01T12:00:00Z');
    const config = new DemoLifecycleConfig();
    const tag = randomUUID().slice(0, 8);

    // El bucket es un doble en memoria: lo que se prueba es qué se pide borrar, no S3.
    const bucket = new Set<string>();
    let bucketDown = new Set<string>();
    const storage = {
      delete: (key: string): Promise<void> => {
        if (bucketDown.has(key)) {
          return Promise.reject(new Error('503 Slow Down'));
        }
        bucket.delete(key);
        return Promise.resolve();
      },
    } as unknown as StorageProvider;
    const activity = {
      execute: jest.fn().mockResolvedValue(undefined),
    } as unknown as RecordActivityUseCase;

    const buildTask = (demoRepository = repository): PurgeExpiredDemosUseCase =>
      new PurgeExpiredDemosUseCase(
        demoRepository,
        new NotifyExpiringDemosUseCase(
          demoRepository,
          { sendExpiryWarning: () => Promise.resolve() },
          config,
        ),
        new PurgeDemoUseCase(demoRepository, storage, activity),
        config,
      );

    const tenantOf = async (demoId: string): Promise<string> => {
      const demo = await prisma.demo.findUniqueOrThrow({ where: { id: demoId } });
      if (demo.tenantId === null) {
        throw new Error('La demo ya no tiene sitio');
      }
      return demo.tenantId;
    };

    // Un sitio con contenido de verdad: una página con una imagen, archivos en la biblioteca y
    // en el bucket, visitas del prospecto.
    const furnish = async (
      demoId: string,
      options: { readonly imageKey?: string; readonly files?: number } = {},
    ): Promise<string[]> => {
      const tenantId = await tenantOf(demoId);
      const keys = Array.from(
        { length: options.files ?? 2 },
        () => `${randomUUID()}.png`,
      );
      for (const key of keys) {
        await prisma.storageAsset.create({
          data: {
            key,
            mimeType: 'image/png',
            size: 10,
            tenantId,
            originalName: 'luna.png',
          },
        });
        bucket.add(key);
      }
      await prisma.page.create({
        data: {
          tenantId,
          slug: 'home',
          title: 'Inicio',
          sections: {
            create: [
              {
                type: 'hero',
                position: 0,
                props: { image: options.imageKey ?? keys[0] },
              },
            ],
          },
        },
      });
      for (const pageSlug of ['home', 'precios']) {
        await repository.recordVisit(demoId, {
          pageSlug,
          ipHash: 'huella',
          userAgent: 'Mozilla/5.0 (iPhone)',
          visitedAt: addDays(TODAY, -45),
        });
      }
      return keys;
    };

    const expiredDaysAgo = (days: number): Date => addDays(TODAY, -days);

    it('borra las vencidas o descartadas hace más de 30 días y nunca las convertidas ni las sin vencimiento', async () => {
      const email = `luna-${tag}@prueba.invalid`;
      const businessName = `Pastelería Secreta ${tag}`;
      const phone = `+56 9 ${tag}`;
      const expired31 = await createDemo({
        expiresAt: expiredDaysAgo(31),
        email,
        businessName,
        phone,
        industry: 'pastelería',
      });
      const prospectId = (
        await prisma.demo.findUniqueOrThrow({ where: { id: expired31 } })
      ).prospectId;
      if (prospectId === null) {
        throw new Error('Sin prospecto');
      }
      // Otra propuesta al mismo prospecto, todavía vigente: el prospecto se queda.
      const sibling = await createDemo({ expiresAt: addDays(TODAY, 5), prospectId });
      const expired29 = await createDemo({ expiresAt: expiredDaysAgo(29) });
      const discarded31 = await createDemo({
        expiresAt: addDays(TODAY, 60),
        outcome: 'discarded',
        outcomeAt: expiredDaysAgo(31),
      });
      const discarded29 = await createDemo({
        expiresAt: expiredDaysAgo(90),
        outcome: 'discarded',
        outcomeAt: expiredDaysAgo(29),
      });
      const converted = await createDemo({
        expiresAt: expiredDaysAgo(365),
        outcome: 'converted',
        outcomeAt: expiredDaysAgo(365),
      });
      const neverExpires = await createDemo({ expiresAt: null });
      const alone = await createDemo({ expiresAt: expiredDaysAgo(40) });

      const tenant31 = await tenantOf(expired31);
      const keys31 = await furnish(expired31);
      const keysAlone = await furnish(alone);
      const keysDiscarded = await furnish(discarded31);
      const aloneProspect = (
        await prisma.demo.findUniqueOrThrow({ where: { id: alone } })
      ).prospectId;
      const before31 = await prisma.demo.findUniqueOrThrow({ where: { id: expired31 } });

      const run = await buildTask().execute(TODAY);

      expect(run).toMatchObject({
        demosPurged: 3,
        demosFailed: 0,
        failedDemos: [],
        errors: [],
      });
      const purged = await prisma.demo.findMany({
        where: { id: { in: created.demos }, purgedAt: { not: null } },
        select: { id: true },
      });
      expect(purged.map((demo) => demo.id).sort()).toEqual(
        [expired31, discarded31, alone].sort(),
      );
      for (const kept of [sibling, expired29, discarded29, converted, neverExpires]) {
        const demo = await prisma.demo.findUniqueOrThrow({ where: { id: kept } });
        expect(demo.purgedAt).toBeNull();
        expect(demo.tenantId).not.toBeNull();
      }

      // No queda el sitio, ni sus páginas, ni sus archivos, ni sus visitas, ni sus enlaces.
      expect(await prisma.tenant.findUnique({ where: { id: tenant31 } })).toBeNull();
      expect(await prisma.page.count({ where: { tenantId: tenant31 } })).toBe(0);
      expect(await prisma.storageAsset.count({ where: { key: { in: keys31 } } })).toBe(0);
      for (const key of [...keys31, ...keysAlone, ...keysDiscarded]) {
        expect(bucket.has(key)).toBe(false);
      }
      expect(await prisma.demoVisit.count({ where: { demoId: expired31 } })).toBe(0);
      expect(await prisma.demoAccessToken.count({ where: { demoId: expired31 } })).toBe(
        0,
      );
      expect(await repository.findPendingFiles(expired31)).toEqual([]);

      // El prospecto con otra demo vigente se queda; el que se quedó sin demos, no.
      expect(
        await prisma.prospect.findUnique({ where: { id: prospectId } }),
      ).not.toBeNull();
      expect(
        await prisma.prospect.findUnique({ where: { id: aloneProspect ?? '' } }),
      ).toBeNull();

      // La fila anónima: contadores y fechas intactos, nada que identifique al prospecto.
      const row = await prisma.demo.findUniqueOrThrow({ where: { id: expired31 } });
      expect(row).toMatchObject({
        tenantId: null,
        prospectId: null,
        purgedAt: TODAY,
        templateId: 'pasteleria',
        industry: 'pastelería',
        actorName: 'Prueba',
        createdAt: before31.createdAt,
        expiresAt: expiredDaysAgo(31),
        outcome: null,
        visitCount: 2,
        firstVisitAt: addDays(TODAY, -45),
        lastVisitAt: addDays(TODAY, -45),
        discardReason: null,
        expiryWarningSentAt: null,
        expiryWarningFor: null,
        expiryWarningError: null,
      });
      const anonymous = JSON.stringify(row);
      for (const personal of [
        businessName,
        email,
        phone,
        'Notas de prueba',
        tenant31,
        tag,
      ]) {
        expect(anonymous).not.toContain(personal);
      }
      // Tampoco en la vista: una demo borrada no se consulta ni se lista como demo.
      expect(await repository.findById(expired31)).toBeNull();

      // Cuando se borra la última propuesta, el prospecto se va también.
      await new PurgeDemoUseCase(repository, storage, activity).execute(sibling, TODAY);
      expect(await prisma.prospect.findUnique({ where: { id: prospectId } })).toBeNull();
    });

    it('correr la tarea dos veces seguidas no hace nada la segunda vez', async () => {
      await createDemo({ expiresAt: expiredDaysAgo(35) });

      const first = await buildTask().execute(TODAY);
      const second = await buildTask().execute(TODAY);

      expect(first.demosPurged).toBe(1);
      expect(second).toEqual({
        warningsSent: 0,
        warningsFailed: 0,
        failedWarnings: [],
        demosPurged: 0,
        demosFailed: 0,
        failedDemos: [],
        filesDeleted: 0,
        filesPending: 0,
        errors: [],
      });
    });

    it('si falla el borrado de una demo, las demás se borran igual y el fallo queda en el resumen', async () => {
      const failing = await createDemo({ expiresAt: expiredDaysAgo(50) });
      const fine = await createDemo({ expiresAt: expiredDaysAgo(50) });
      class FlakyRepository extends PrismaDemoRepository {
        public override purge(
          demoId: string,
          now: Date,
        ): ReturnType<PrismaDemoRepository['purge']> {
          return demoId === failing
            ? Promise.reject(new Error('deadlock detected'))
            : super.purge(demoId, now);
        }
      }

      const run = await buildTask(new FlakyRepository(prisma)).execute(TODAY);

      expect(run.demosPurged).toBe(1);
      expect(run.failedDemos).toEqual([{ demoId: failing, error: 'deadlock detected' }]);
      expect(
        (await prisma.demo.findUniqueOrThrow({ where: { id: fine } })).purgedAt,
      ).toEqual(TODAY);
      expect(
        (await prisma.demo.findUniqueOrThrow({ where: { id: failing } })).purgedAt,
      ).toBeNull();

      // La pasada siguiente la vuelve a intentar.
      expect((await buildTask().execute(TODAY)).demosPurged).toBe(1);
    });

    it('un archivo que no se puede borrar queda anotado y sale en la pasada siguiente', async () => {
      const demoId = await createDemo({ expiresAt: expiredDaysAgo(31) });
      const [stuck, other] = await furnish(demoId);
      bucketDown = new Set([stuck ?? '']);

      const first = await buildTask().execute(TODAY);

      expect(first).toMatchObject({ demosPurged: 1, filesDeleted: 1, filesPending: 1 });
      expect(bucket.has(other ?? '')).toBe(false);
      expect(bucket.has(stuck ?? '')).toBe(true);
      const pending = await prisma.demoPendingFile.findUniqueOrThrow({
        where: { key: stuck },
      });
      expect(pending).toMatchObject({ demoId, attempts: 1, lastError: '503 Slow Down' });

      bucketDown = new Set();
      const second = await buildTask().execute(TODAY);

      expect(second).toMatchObject({ demosPurged: 0, filesDeleted: 1, filesPending: 0 });
      expect(bucket.has(stuck ?? '')).toBe(false);
    });

    it('un archivo que usa otro sitio no se borra del bucket: pasa a su biblioteca', async () => {
      const shared = `${randomUUID()}.png`;
      const purgedDemo = await createDemo({ expiresAt: expiredDaysAgo(31) });
      await prisma.storageAsset.create({
        data: {
          key: shared,
          mimeType: 'image/png',
          size: 10,
          tenantId: await tenantOf(purgedDemo),
        },
      });
      bucket.add(shared);
      // Una segunda propuesta armada duplicando la primera: su página apunta al mismo archivo.
      const copy = await createDemo({ expiresAt: addDays(TODAY, 10) });
      await furnish(copy, { imageKey: shared, files: 0 });

      await new PurgeDemoUseCase(repository, storage, activity).execute(
        purgedDemo,
        TODAY,
      );

      expect(bucket.has(shared)).toBe(true);
      expect(
        (await prisma.storageAsset.findUniqueOrThrow({ where: { key: shared } }))
          .tenantId,
      ).toBe(await tenantOf(copy));
    });

    it('el borrado manual no espera la gracia, pero nunca borra una convertida', async () => {
      const current = await createDemo({ expiresAt: addDays(TODAY, 10) });
      const converted = await createDemo({ expiresAt: null, outcome: 'converted' });
      const purge = new PurgeDemoUseCase(repository, storage, activity);

      const result = await purge.execute(current, TODAY);

      expect(result.demo.status(TODAY)).toBe('borrada');
      await expect(purge.execute(converted, TODAY)).rejects.toBeInstanceOf(
        DemoClosedError,
      );
      await expect(purge.execute(current, TODAY)).rejects.toBeInstanceOf(DemoClosedError);
      expect(
        (await prisma.demo.findUniqueOrThrow({ where: { id: converted } })).tenantId,
      ).not.toBeNull();
    });
  });
  describe('conversión', () => {
    const tag = (): string => randomUUID().slice(0, 8);
    const at = addDays(NOW, 2);

    // Todo lo que la conversión puede tocar, para comparar antes y después.
    const snapshot = async (demoId: string): Promise<unknown> => {
      const demo = await prisma.demo.findUniqueOrThrow({
        where: { id: demoId },
        include: {
          accessTokens: { select: { revokedAt: true }, orderBy: { kind: 'asc' } },
          tenant: {
            select: {
              slug: true,
              status: true,
              domains: { select: { domain: true, isPrimary: true } },
              adminUsers: { select: { adminUserId: true } },
            },
          },
        },
      });
      const { updatedAt: _ignored, ...rest } = demo;
      return rest;
    };

    const prospectOf = async (demoId: string): Promise<string> => {
      const { prospectId } = await prisma.demo.findUniqueOrThrow({
        where: { id: demoId },
      });
      if (prospectId === null) {
        throw new Error('Sin prospecto');
      }
      return prospectId;
    };

    const siteOf = async (
      demoId: string,
    ): Promise<{ tenantId: string; address: string }> => {
      const view = await repository.findById(demoId);
      if (view?.site?.address == null) {
        throw new Error('Sin sitio');
      }
      return { tenantId: view.site.tenantId, address: view.site.address };
    };

    const createTenant = async (slug: string, domain?: string): Promise<string> => {
      const tenant = await prisma.tenant.create({
        data: {
          slug,
          name: 'Otro sitio',
          ...(domain === undefined
            ? {}
            : { domains: { create: [{ domain, isPrimary: true, verifiedAt: NOW }] } }),
        },
      });
      created.tenants.push(tenant.id);
      return tenant.id;
    };

    const createUser = async (
      email: string,
      role: 'owner' | 'editor' | 'client',
      tenantIds: readonly string[] = [],
    ): Promise<string> => {
      const user = await prisma.adminUser.create({
        data: {
          email,
          name: 'Persona',
          passwordHash: 'hash-original',
          role,
          tenants: { create: tenantIds.map((tenantId) => ({ tenantId })) },
        },
      });
      created.users.push(user.id);
      return user.id;
    };

    it('en una sola operación: cliente activo, dirección nueva, enlaces anulados y propuestas hermanas descartadas', async () => {
      const chosen = await createDemo({ expiresAt: addDays(NOW, 10) });
      const prospectId = await prospectOf(chosen);
      const current = await createDemo({ expiresAt: addDays(NOW, 5), prospectId });
      const expired = await createDemo({ expiresAt: addDays(NOW, -3), prospectId });
      const refused = await createDemo({
        expiresAt: addDays(NOW, 5),
        prospectId,
        outcome: 'discarded',
        outcomeAt: addDays(NOW, -1),
      });
      await prisma.demo.update({
        where: { id: refused },
        data: { discardReason: 'precio' },
      });
      const refusedBefore = await snapshot(refused);
      const { tenantId, address: oldAddress } = await siteOf(chosen);
      const slug = `test-conv-${tag()}`;
      const email = `dueña-${tag()}@prueba.invalid`;

      const result = await repository.convert({
        demoId: chosen,
        slug,
        address: `${slug}.test.invalid`,
        now: at,
        owner: { email, name: 'Ana Pérez', passwordHash: 'hash-nuevo' },
      });
      if (result.owner !== null) {
        created.users.push(result.owner.id);
      }

      const tenant = await prisma.tenant.findUniqueOrThrow({
        where: { id: tenantId },
        include: { domains: true },
      });
      expect(tenant).toMatchObject({ status: 'active', slug });
      expect(tenant.domains).toEqual([
        expect.objectContaining({
          domain: `${slug}.test.invalid`,
          isPrimary: true,
          verifiedAt: at,
        }),
      ]);
      expect(
        await prisma.tenantDomain.findUnique({ where: { domain: oldAddress } }),
      ).toBeNull();
      expect(result.removedAddresses).toEqual([oldAddress]);

      const demo = await prisma.demo.findUniqueOrThrow({
        where: { id: chosen },
        include: { accessTokens: true },
      });
      expect(demo).toMatchObject({
        outcome: 'converted',
        outcomeAt: at,
        expiresAt: null,
        tenantId,
        prospectId,
      });
      expect(demo.accessTokens).toHaveLength(2);
      expect(demo.accessTokens.every((token) => token.revokedAt !== null)).toBe(true);

      for (const sibling of [current, expired]) {
        const row = await prisma.demo.findUniqueOrThrow({
          where: { id: sibling },
          include: { accessTokens: true },
        });
        expect(row).toMatchObject({
          outcome: 'discarded',
          outcomeAt: at,
          discardReason: 'otra-propuesta',
        });
        // Descartar no anula: si se recupera, el enlace que tiene el prospecto sigue sirviendo.
        expect(row.accessTokens.every((token) => token.revokedAt === null)).toBe(true);
      }
      expect(result.discardedSiblings.map((sibling) => sibling.demoId).sort()).toEqual(
        [current, expired].sort(),
      );
      // La que ya tenía resultado queda como estaba, con su motivo.
      expect(await snapshot(refused)).toEqual(refusedBefore);

      // La ficha queda como antecedente del cliente.
      expect(
        await prisma.prospect.findUnique({ where: { id: prospectId } }),
      ).not.toBeNull();

      const owner = await prisma.adminUser.findUniqueOrThrow({
        where: { email },
        include: { tenants: true },
      });
      expect(owner).toMatchObject({
        role: 'client',
        name: 'Ana Pérez',
        passwordHash: 'hash-nuevo',
      });
      expect(owner.tenants.map((link) => link.tenantId)).toEqual([tenantId]);
      expect(result.owner).toEqual({
        id: owner.id,
        email,
        name: 'Ana Pérez',
        created: true,
      });

      // Una convertida nunca le toca a la tarea de borrado, ni muy en el futuro.
      const due = await repository.findDueForPurge(addDays(at, 100_000));
      expect(due.map((candidate) => candidate.id)).not.toContain(chosen);
      expect((await repository.findDemo(chosen))?.purgeDueAt(30)).toBeNull();
    });

    it.each([
      ['el slug es de otro sitio', 'slug'],
      ['la dirección es de otro sitio', 'domain'],
    ])(
      'si %s dentro de la transacción, no queda nada a medias',
      async (_label, clash) => {
        const chosen = await createDemo({ expiresAt: addDays(NOW, 10) });
        const sibling = await createDemo({
          expiresAt: addDays(NOW, 10),
          prospectId: await prospectOf(chosen),
        });
        const slug = `test-conv-${tag()}`;
        const address = `${slug}.test.invalid`;
        // Otro sitio lo toma después de que el caso de uso preguntó y antes de la transacción.
        if (clash === 'slug') {
          await createTenant(slug);
        } else {
          await createTenant(`otro-${tag()}`, address);
        }
        const before = await Promise.all([snapshot(chosen), snapshot(sibling)]);
        const email = `dueña-${tag()}@prueba.invalid`;

        await expect(
          repository.convert({
            demoId: chosen,
            slug,
            address,
            now: at,
            owner: { email, name: 'Ana', passwordHash: 'hash' },
          }),
        ).rejects.toBeInstanceOf(DemoAddressTakenError);

        expect(await Promise.all([snapshot(chosen), snapshot(sibling)])).toEqual(before);
        expect(await prisma.adminUser.findUnique({ where: { email } })).toBeNull();
      },
    );

    it('si el correo del dueño es de alguien del equipo, no cambia nada', async () => {
      const chosen = await createDemo({ expiresAt: addDays(NOW, 10) });
      const sibling = await createDemo({
        expiresAt: addDays(NOW, 10),
        prospectId: await prospectOf(chosen),
      });
      const email = `editor-${tag()}@prueba.invalid`;
      const editorId = await createUser(email, 'editor');
      const before = await Promise.all([snapshot(chosen), snapshot(sibling)]);
      const slug = `test-conv-${tag()}`;

      await expect(
        repository.convert({
          demoId: chosen,
          slug,
          address: `${slug}.test.invalid`,
          now: at,
          owner: { email, name: 'Ana', passwordHash: 'hash' },
        }),
      ).rejects.toBeInstanceOf(DemoOwnerNotClientError);

      expect(await Promise.all([snapshot(chosen), snapshot(sibling)])).toEqual(before);
      expect(
        await prisma.adminUser.findUniqueOrThrow({
          where: { id: editorId },
          include: { tenants: true },
        }),
      ).toMatchObject({ role: 'editor', tenants: [] });
    });

    it('una cuenta de cliente que ya existe se reutiliza y suma este sitio a su alcance', async () => {
      const chosen = await createDemo({ expiresAt: addDays(NOW, 10) });
      const otherSite = await createTenant(`otro-${tag()}`);
      const email = `cliente-${tag()}@prueba.invalid`;
      const clientId = await createUser(email, 'client', [otherSite]);
      const slug = `test-conv-${tag()}`;
      const { tenantId } = await siteOf(chosen);

      const result = await repository.convert({
        demoId: chosen,
        slug,
        address: `${slug}.test.invalid`,
        now: at,
        owner: {
          email: email.toUpperCase(),
          name: 'Otro nombre',
          passwordHash: 'hash-nuevo',
        },
      });

      expect(result.owner).toEqual({
        id: clientId,
        email,
        name: 'Persona',
        created: false,
      });
      const user = await prisma.adminUser.findUniqueOrThrow({
        where: { id: clientId },
        include: { tenants: true },
      });
      expect(user).toMatchObject({ role: 'client', passwordHash: 'hash-original' });
      expect(user.tenants.map((link) => link.tenantId).sort()).toEqual(
        [otherSite, tenantId].sort(),
      );
    });

    it('si otra petición le dio un resultado antes, no la convierte', async () => {
      const chosen = await createDemo({
        expiresAt: addDays(NOW, 10),
        outcome: 'discarded',
      });
      const before = await snapshot(chosen);
      const slug = `test-conv-${tag()}`;

      await expect(
        repository.convert({
          demoId: chosen,
          slug,
          address: `${slug}.test.invalid`,
          now: at,
          owner: null,
        }),
      ).rejects.toBeInstanceOf(DemoClosedError);
      expect(await snapshot(chosen)).toEqual(before);
    });
  });

  describe('descarte y recuperación', () => {
    const config = new DemoLifecycleConfig();
    const discarding = new DiscardDemoUseCase(
      repository,
      config,
      { invalidate: (): Promise<void> => Promise.resolve() },
      {
        execute: jest.fn().mockResolvedValue(undefined),
      } as unknown as RecordActivityUseCase,
    );
    const access = new ValidateDemoAccessUseCase(repository);
    const actor = { type: 'admin', id: null, name: 'Prueba' } as const;

    // Los dos enlaces en claro, para entrar como lo haría el prospecto y el equipo.
    const withLinks = async (
      demoId: string,
    ): Promise<{ tenantId: string; prospect: string; team: string }> => {
      const prospect = generateDemoToken();
      const team = generateDemoToken();
      await repository.replaceAccessToken(demoId, 'prospect', prospect.hash);
      await repository.replaceAccessToken(demoId, 'team', team.hash);
      const demo = await repository.findDemo(demoId);
      return {
        tenantId: demo?.tenantId ?? '',
        prospect: prospect.token,
        team: team.token,
      };
    };

    it('el prospecto deja de entrar al instante, el equipo sigue, y al recuperarla vuelve con el mismo enlace', async () => {
      const demoId = await createDemo({ expiresAt: addDays(NOW, 3) });
      const links = await withLinks(demoId);
      const enter = (token: string, when: Date): Promise<unknown> =>
        access.execute(links.tenantId, token, when);

      expect(await enter(links.prospect, NOW)).not.toBeNull();

      const discarded = await discarding.discard(demoId, 'no-responde', actor, NOW);

      expect(discarded.demo.status(NOW)).toBe('descartada');
      expect(await enter(links.prospect, NOW)).toBeNull();
      expect(await enter(links.team, NOW)).not.toBeNull();

      const later = addDays(NOW, 10);
      const restored = await discarding.restore(demoId, actor, later);

      expect(restored.demo.status(later)).toBe('vigente');
      expect(restored.demo.expiresAt).toEqual(addDays(later, 14));
      expect(restored.demo.outcomeAt).toBeNull();
      expect(restored.demo.discardReason).toBeNull();
      expect(await enter(links.prospect, later)).not.toBeNull();
    });

    it('descartar dos veces no cambia nada la segunda vez', async () => {
      const demoId = await createDemo({ expiresAt: addDays(NOW, 3) });
      await discarding.discard(demoId, 'precio', actor, NOW);
      const first = await prisma.demo.findUniqueOrThrow({ where: { id: demoId } });

      await discarding.discard(demoId, 'otro', actor, addDays(NOW, 1));

      const second = await prisma.demo.findUniqueOrThrow({ where: { id: demoId } });
      expect(second).toEqual(first);
      expect(second.discardReason).toBe('precio');
    });

    it('una descartada se borra 30 días después del descarte y conserva el motivo; una recuperada no', async () => {
      // Vencía mucho después: lo que cuenta es la fecha del descarte.
      const discarded = await createDemo({ expiresAt: addDays(NOW, 90) });
      const restored = await createDemo({ expiresAt: addDays(NOW, 90) });
      await discarding.discard(discarded, 'ya-tiene-sitio', actor, NOW);
      await discarding.discard(restored, 'no-interesado', actor, NOW);
      await discarding.restore(restored, actor, addDays(NOW, 10));
      const mine = [discarded, restored];
      const dueAt = async (when: Date): Promise<string[]> =>
        (await repository.findDueForPurge(addDays(when, -config.purgeGraceDays)))
          .filter((demo) => demo.isPurgeDue(when, config.purgeGraceDays))
          .map((demo) => demo.id)
          .filter((id) => mine.includes(id));

      expect(await dueAt(addDays(NOW, 29))).toEqual([]);
      expect(await dueAt(addDays(NOW, 31))).toEqual([discarded]);
      // Recuperada, cuenta desde su vencimiento nuevo (día 24) más la gracia.
      expect(await dueAt(addDays(NOW, 50))).toEqual([discarded]);

      const purged = await repository.purge(discarded, addDays(NOW, 31));

      expect(purged.demo.status(addDays(NOW, 31))).toBe('borrada');
      expect(
        await prisma.demo.findUniqueOrThrow({ where: { id: discarded } }),
      ).toMatchObject({
        tenantId: null,
        prospectId: null,
        outcome: 'discarded',
        discardReason: 'ya-tiene-sitio',
      });
    });

    it('si la extienden mientras corre la tarea, la tarea ya no la borra', async () => {
      const expiresAt = addDays(NOW, -31);
      const demoId = await createDemo({ expiresAt });
      const cutoff = addDays(NOW, -config.purgeGraceDays);
      expect((await repository.findDueForPurge(cutoff)).map((demo) => demo.id)).toContain(
        demoId,
      );
      // Entre la consulta de la tarea y el borrado, alguien la reactiva.
      await repository.updateExpiry(demoId, expiresAt, {
        expiresAt: addDays(NOW, 14),
        extensionCount: 1,
      });

      await expect(repository.purge(demoId, NOW, cutoff)).rejects.toBeInstanceOf(
        DemoNoLongerDueError,
      );
      expect(
        await prisma.demo.findUniqueOrThrow({ where: { id: demoId } }),
      ).toMatchObject({
        purgedAt: null,
        tenantId: expect.any(String) as unknown,
        expiresAt: addDays(NOW, 14),
      });
    });

    it('pasada la gracia ya no se recupera', async () => {
      const demoId = await createDemo({ expiresAt: addDays(NOW, 90) });
      await discarding.discard(demoId, null, actor, NOW);

      await expect(
        discarding.restore(demoId, actor, addDays(NOW, 31)),
      ).rejects.toBeInstanceOf(DemoClosedError);
      expect((await repository.findDemo(demoId))?.outcome).toBe('discarded');
    });
  });
});
