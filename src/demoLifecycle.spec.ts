import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './shared/infrastructure/prisma/generated/client';
import { EnvConfig } from './shared/config/EnvConfig';
import { Container } from './container';
import { generateApiKeyToken } from './modules/ApiKey/domain/apiKeyToken';
import type { Permission } from './modules/ApiKey/domain/Actor';

// El ciclo de una demo contra la API armada de verdad y la base real: lo que se prueba es lo
// que ve el prospecto y lo que ve el público, no un doble. Las direcciones cuelgan de un
// dominio de plataforma inventado para esta corrida, el correo va a un puerto cerrado (así se
// ve qué pasa cuando la invitación falla) y al final se borra solo lo que la prueba creó.
describe('demos de punta a punta (API y base reales)', () => {
  const tag = randomUUID().slice(0, 8);
  const platform = `e2e-${tag}.test.invalid`;
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  const container = new Container(
    EnvConfig.load({
      ...process.env,
      PLATFORM_DOMAIN: platform,
      SMTP_HOST: '127.0.0.1',
      SMTP_PORT: '1',
      WEBAPP_REVALIDATE_URL: '',
    }),
  );
  const app = container.getApp();

  const created = {
    users: [] as string[],
    tenants: [] as string[],
    prospects: [] as string[],
    keys: [] as string[],
  };
  const keys = {} as Record<Permission | 'scoped', string>;

  beforeAll(async () => {
    const owner = await prisma.adminUser.create({
      data: {
        email: `owner-${tag}@prueba.invalid`,
        name: 'Dueña de prueba',
        passwordHash: 'x',
        role: 'owner',
      },
    });
    created.users.push(owner.id);
    const issue = async (
      permission: Permission,
      scopeAllTenants = true,
    ): Promise<string> => {
      const key = generateApiKeyToken();
      const record = await prisma.apiKey.create({
        data: {
          name: `Agente ${permission} ${tag}`,
          prefix: key.prefix,
          keyHash: key.hash,
          permission,
          scopeAllTenants,
          createdById: owner.id,
        },
      });
      created.keys.push(record.id);
      return key.token;
    };
    keys.read = await issue('read');
    keys.write = await issue('write');
    keys.full = await issue('full');
    // Limitada a algunos clientes (ninguno, en este caso): no alcanza a las demos.
    keys.scoped = await issue('write', false);
  });

  afterAll(async () => {
    const demos = await prisma.demo.findMany({
      where: { tenantId: { in: created.tenants } },
      select: { prospectId: true },
    });
    created.prospects.push(
      ...demos.flatMap((demo) => (demo.prospectId === null ? [] : [demo.prospectId])),
    );
    await prisma.demo.deleteMany({ where: { tenantId: { in: created.tenants } } });
    await prisma.tenant.deleteMany({ where: { id: { in: created.tenants } } });
    await prisma.prospect.deleteMany({ where: { id: { in: created.prospects } } });
    // Lo que las claves dejaron sin tenant (crear, borrar); el resto se fue con los sitios.
    await prisma.activityLog.deleteMany({ where: { actorId: { in: created.keys } } });
    await prisma.adminUser.deleteMany({
      where: {
        OR: [
          { id: { in: created.users } },
          { email: { endsWith: `-${tag}@prueba.invalid` } },
        ],
      },
    });
    await prisma.$disconnect();
    await container.dispose();
  });

  const admin = (
    method: 'get' | 'post' | 'patch' | 'delete',
    path: string,
    key: string,
    body?: object,
  ): request.Test => {
    const call = request(app)[method](path).set('X-Api-Key', key);
    return body === undefined ? call : call.send(body);
  };

  // Lo que hace la webapp: pide la página en nombre del dominio del visitante, con el enlace si
  // lo tiene.
  const visit = (address: string, token?: string): request.Test => {
    const call = request(app).get('/api/pages/home').set('X-Tenant-Domain', address);
    return token === undefined ? call : call.set('X-Demo-Token', token);
  };

  interface CreatedDemo {
    readonly demoId: string;
    readonly tenantId: string;
    readonly prospectId: string;
    readonly address: string;
    readonly prospectToken: string;
    readonly teamToken: string;
  }

  const createDemo = async (
    slug: string,
    prospect: { prospectId: string } | { prospect: object },
  ): Promise<CreatedDemo> => {
    const response = await admin('post', '/api/admin/demos', keys.write, {
      slug,
      name: 'Pastelería Luna',
      templateId: 'pasteleria',
      ...prospect,
    });
    expect(response.status).toBe(201);
    const body = response.body as {
      demo: { id: string; tenantId: string; site: { address: string } };
      prospect: { id: string };
      links: Record<'prospect' | 'team', { token: string }>;
    };
    created.tenants.push(body.demo.tenantId);
    created.prospects.push(body.prospect.id);
    return {
      demoId: body.demo.id,
      tenantId: body.demo.tenantId,
      prospectId: body.prospect.id,
      address: body.demo.site.address,
      prospectToken: body.links.prospect.token,
      teamToken: body.links.team.token,
    };
  };

  describe('descartar y recuperar', () => {
    it('el prospecto deja de entrar al instante, el equipo no, y recuperada vuelve con el mismo enlace', async () => {
      const demo = await createDemo(`sol-${tag}-descarte`, {
        prospect: { businessName: 'Café Sol' },
      });
      expect((await visit(demo.address, demo.prospectToken)).status).toBe(200);

      const denied = await admin(
        'post',
        `/api/admin/demos/${demo.demoId}/discard`,
        keys.write,
        {
          reason: 'precio',
        },
      );
      expect(denied.status).toBe(403);

      const discarded = await admin(
        'post',
        `/api/admin/demos/${demo.demoId}/discard`,
        keys.full,
        { reason: 'precio' },
      );
      expect(discarded.status).toBe(200);
      expect(discarded.body).toMatchObject({
        demo: { status: 'descartada', discardReason: 'precio' },
      });
      expect((await visit(demo.address, demo.prospectToken)).status).toBe(404);
      expect((await visit(demo.address, demo.teamToken)).status).toBe(200);

      // La segunda vez no cambia nada.
      const twice = await admin(
        'post',
        `/api/admin/demos/${demo.demoId}/discard`,
        keys.full,
        {
          reason: 'otro',
        },
      );
      expect(twice.status).toBe(200);
      expect(twice.body).toMatchObject({
        demo: {
          discardReason: 'precio',
          outcomeAt: (discarded.body as { demo: { outcomeAt: string } }).demo.outcomeAt,
        },
      });

      // Recuperar basta con `write`: deshace un descarte.
      const restored = await admin(
        'post',
        `/api/admin/demos/${demo.demoId}/restore`,
        keys.write,
      );
      expect(restored.status).toBe(200);
      expect(restored.body).toMatchObject({
        demo: { status: 'vigente', outcome: null, discardReason: null },
      });
      const expiresAt = new Date(
        (restored.body as { demo: { expiresAt: string } }).demo.expiresAt,
      ).getTime();
      expect(expiresAt).toBeGreaterThan(Date.now() + 13.9 * 24 * 60 * 60 * 1000);
      expect((await visit(demo.address, demo.prospectToken)).status).toBe(200);

      expect(
        await prisma.activityLog.count({
          where: {
            entityId: demo.demoId,
            action: { in: ['demo.discard', 'demo.restore'] },
          },
        }),
      ).toBe(2);
    });
  });
});
