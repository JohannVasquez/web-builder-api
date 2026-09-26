import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './shared/infrastructure/prisma/generated/client';
import { EnvConfig } from './shared/config/EnvConfig';
import { Container } from './container';
import { generateApiKeyToken } from './modules/ApiKey/domain/apiKeyToken';
import type { Permission } from './modules/ApiKey/domain/Actor';
import { z } from 'zod';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { ApiClient } from './mcp/ApiClient';
import { buildTools, type McpTool } from './mcp/tools';

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

  describe('convertir', () => {
    it('la demo pasa a ser el sitio público del cliente y sus enlaces dejan de servir', async () => {
      const slug = `pasteleria-${tag}-luna`;
      const chosen = await createDemo(slug, {
        prospect: {
          businessName: 'Pastelería Luna',
          email: `luna-${tag}@prueba.invalid`,
        },
      });
      // Una segunda propuesta al mismo negocio: su dirección lleva `-2`.
      const taken = await admin('post', '/api/admin/demos', keys.write, {
        slug,
        name: 'Pastelería Luna',
        prospectId: chosen.prospectId,
      });
      expect(taken.status).toBe(409);
      const suggested = (taken.body as { suggestedSlug: string }).suggestedSlug;
      expect(suggested).toBe(`${slug}-2`);
      const second = await createDemo(suggested, { prospectId: chosen.prospectId });

      expect((await visit(chosen.address)).status).toBe(404);
      expect((await visit(chosen.address, chosen.prospectToken)).status).toBe(200);
      expect((await visit(second.address, second.prospectToken)).status).toBe(200);

      const quiet = jest.spyOn(console, 'error').mockImplementation(() => undefined);
      const response = await admin(
        'post',
        `/api/admin/demos/${chosen.demoId}/convert`,
        keys.full,
        { owner: { name: 'Ana Pérez', email: `ana-${tag}@prueba.invalid` } },
      );

      quiet.mockRestore();
      expect(response.status).toBe(200);
      const newAddress = `${slug}.${platform}`;
      expect(response.body).toMatchObject({
        demo: { status: 'convertida', expiresAt: null, neverExpires: true },
        tenant: {
          id: chosen.tenantId,
          slug,
          status: 'active',
          primaryDomain: newAddress,
        },
        removedAddresses: [chosen.address],
        discardedDemoIds: [second.demoId],
        owner: { email: `ana-${tag}@prueba.invalid`, role: 'client', created: true },
        // El correo va a un puerto cerrado: la conversión queda hecha igual y lo dice.
        invitation: { status: 'failed' },
      });

      // Público, sin enlace, como cualquier cliente.
      const open = await visit(newAddress);
      expect(open.status).toBe(200);
      expect(open.headers['x-demo']).toBeUndefined();
      expect(open.headers['x-robots-tag']).toBeUndefined();

      // La dirección `demo-…` ya no es de nadie y los enlaces quedaron anulados.
      expect(
        await prisma.tenantDomain.findUnique({ where: { domain: chosen.address } }),
      ).toBeNull();
      const tokens = await prisma.demoAccessToken.findMany({
        where: { demoId: chosen.demoId },
      });
      expect(tokens.length).toBeGreaterThan(0);
      expect(tokens.every((token) => token.revokedAt !== null)).toBe(true);

      // La otra propuesta quedó descartada: su prospecto ya no entra, el equipo sí.
      expect((await visit(second.address, second.prospectToken)).status).toBe(404);
      expect((await visit(second.address, second.teamToken)).status).toBe(200);
      const sibling = await admin('get', `/api/admin/demos/${second.demoId}`, keys.read);
      expect(sibling.body).toMatchObject({
        demo: { status: 'descartada', discardReason: 'otra-propuesta' },
      });

      // Es un cliente más: se lista sin pedir demos, y la cuenta del dueño alcanza solo su sitio.
      const tenants = await admin('get', '/api/admin/tenants', keys.read);
      expect(tenants.body).toMatchObject({
        tenants: expect.arrayContaining([
          expect.objectContaining({ id: chosen.tenantId, status: 'active' }),
        ]) as unknown,
      });
      const ownerAccount = await prisma.adminUser.findUniqueOrThrow({
        where: { email: `ana-${tag}@prueba.invalid` },
        include: { tenants: true },
      });
      expect(ownerAccount.role).toBe('client');
      expect(ownerAccount.tenants.map((link) => link.tenantId)).toEqual([
        chosen.tenantId,
      ]);

      // La ficha se queda, y la tarea de borrado nunca la toca.
      expect(
        await prisma.prospect.findUnique({ where: { id: chosen.prospectId } }),
      ).not.toBeNull();
      expect(
        await prisma.activityLog.count({
          where: { action: 'demo.convert', entityId: chosen.demoId },
        }),
      ).toBe(1);

      const again = await admin(
        'post',
        `/api/admin/demos/${chosen.demoId}/convert`,
        keys.full,
      );
      expect(again.status).toBe(422);
    });

    it('una clave write no convierte y un slug ocupado responde 409 sin cambiar nada', async () => {
      const demo = await createDemo(`luna-${tag}-ocupado`, {
        prospect: { businessName: 'Luna' },
      });

      const denied = await admin(
        'post',
        `/api/admin/demos/${demo.demoId}/convert`,
        keys.write,
      );
      expect(denied.status).toBe(403);

      // El slug definitivo ya es de otro cliente.
      const other = await prisma.tenant.create({
        data: { slug: `luna-${tag}-ocupado`, name: 'Otro' },
      });
      created.tenants.push(other.id);
      const conflict = await admin(
        'post',
        `/api/admin/demos/${demo.demoId}/convert`,
        keys.full,
      );
      expect(conflict.status).toBe(409);
      expect(conflict.body).toMatchObject({ suggestedSlug: `luna-${tag}-ocupado-2` });

      expect((await visit(demo.address, demo.prospectToken)).status).toBe(200);
      expect(
        await prisma.tenant.findUniqueOrThrow({ where: { id: demo.tenantId } }),
      ).toMatchObject({ status: 'demo', slug: `demo-luna-${tag}-ocupado` });
    });
  });
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
  // DEMO 10: el agente hace todo por el MCP, contra la API real, con los permisos de su clave.
  describe('un agente arma y opera una demo por MCP', () => {
    let server: Server;
    let baseUrl = '';

    beforeAll(async () => {
      server = await new Promise<Server>((resolve) => {
        const listening = app.listen(0, '127.0.0.1', () => resolve(listening));
      });
      baseUrl = `http://127.0.0.1:${String((server.address() as AddressInfo).port)}`;
    });

    afterAll(async () => {
      await new Promise((resolve) => server.close(resolve));
    });

    // Como el servidor MCP: valida los argumentos con el esquema de la herramienta antes de
    // llamarla, así que sin `confirm: true` ni siquiera llega a la API.
    const agent = (key: string) => {
      const tools = buildTools(new ApiClient(baseUrl, key));
      return async <T = Record<string, unknown>>(
        name: string,
        args: Record<string, unknown> = {},
      ): Promise<T> => {
        const tool = tools.find((candidate) => candidate.name === name) as McpTool;
        const parsed = z.object(tool.inputSchema).parse(args);
        return (await tool.handler(parsed)) as T;
      };
    };

    it('con write crea la demo desde un kit, la edita, la publica y entrega el enlace', async () => {
      const call = agent(keys.write);

      const made = await call<{
        demo: { id: string; tenantId: string; status: string };
        links: Record<'prospect' | 'team', { url: string; token: string }>;
        note: string;
      }>('create_demo', {
        slug: `floreria-${tag}-rosa`,
        name: 'Florería Rosa',
        templateId: 'pasteleria',
        prospect: { businessName: 'Florería Rosa', phone: '+56 9 5555 5555' },
      });
      created.tenants.push(made.demo.tenantId);
      expect(made.demo.status).toBe('vigente');
      expect(made.note).toMatch(/UNA sola vez/);
      const address = `demo-floreria-${tag}-rosa.${platform}`;
      expect(made.links.prospect.url).toContain(address);

      // Las herramientas de siempre, sobre el tenant de la demo.
      const site = await call<{ pages: { id: string; slug: string }[] }>('get_site', {
        tenantId: made.demo.tenantId,
      });
      const home = site.pages.find((page) => page.slug === 'home');
      expect(home).toBeDefined();
      await call('add_block', {
        tenantId: made.demo.tenantId,
        pageId: home?.id,
        type: 'Hero',
        position: 0,
        props: {
          title: `Flores frescas ${tag}`,
          subtitle: 'Ramos a domicilio en Ñuñoa.',
          variant: 'centered',
        },
      });
      await call('publish_page', { tenantId: made.demo.tenantId, pageId: home?.id });

      // Lo que ve el prospecto con el enlace que le entregó el agente.
      const seen = await visit(address, made.links.prospect.token);
      expect(seen.status).toBe(200);
      expect(JSON.stringify(seen.body)).toContain(`Flores frescas ${tag}`);
      expect((await visit(address)).status).toBe(404);

      // Leer, anotar, extender y regenerar también son de write, y nada de eso trae enlaces.
      const listed = await call<{ demos: { id: string }[] }>('list_demos', {
        status: 'vigente',
      });
      expect(listed.demos.map((demo) => demo.id)).toContain(made.demo.id);
      await call('update_prospect', {
        demoId: made.demo.id,
        notes: 'Llamar el lunes',
      });
      const detail = await agent(keys.read)('get_demo', { demoId: made.demo.id });
      expect(detail).toMatchObject({
        prospect: { notes: 'Llamar el lunes' },
        recentVisits: expect.any(Array) as unknown,
      });
      expect(JSON.stringify(detail)).not.toContain(made.links.prospect.token);
      await call('extend_demo', { demoId: made.demo.id });
      await call('set_demo_expiry', { demoId: made.demo.id, neverExpires: true });
      await call('set_demo_expiry', { demoId: made.demo.id, neverExpires: false });

      const regenerated = await call<{ link: { token: string }; note: string }>(
        'regenerate_demo_link',
        { demoId: made.demo.id, kind: 'prospect' },
      );
      expect(regenerated.note).toMatch(/UNA sola vez/);
      expect((await visit(address, made.links.prospect.token)).status).toBe(404);
      expect((await visit(address, regenerated.link.token)).status).toBe(200);

      // Con write no se descarta ni se convierte; con full sí, y solo con confirmación.
      await expect(
        call('discard_demo', { demoId: made.demo.id, confirm: true }),
      ).rejects.toThrow(/permiso "full"/);
      await expect(
        call('convert_demo', { demoId: made.demo.id, confirm: true }),
      ).rejects.toThrow(/permiso "full"/);
      const full = agent(keys.full);
      await expect(full('discard_demo', { demoId: made.demo.id })).rejects.toThrow();
      await expect(full('convert_demo', { demoId: made.demo.id })).rejects.toThrow();

      await full('discard_demo', {
        demoId: made.demo.id,
        reason: 'no-responde',
        confirm: true,
      });
      expect((await visit(address, regenerated.link.token)).status).toBe(404);
      await call('restore_demo', { demoId: made.demo.id });
      expect((await visit(address, regenerated.link.token)).status).toBe(200);

      const converted = await full<{ tenant: { primaryDomain: string } }>(
        'convert_demo',
        {
          demoId: made.demo.id,
          confirm: true,
        },
      );
      expect(converted.tenant.primaryDomain).toBe(`floreria-${tag}-rosa.${platform}`);
      const open = await visit(converted.tenant.primaryDomain);
      expect(open.status).toBe(200);
      expect(JSON.stringify(open.body)).toContain(`Flores frescas ${tag}`);
    });

    it('una clave limitada a algunos clientes no crea ni ve demos; una de lectura no crea', async () => {
      const scoped = agent(keys.scoped);
      const args = {
        slug: `limitada-${tag}`,
        name: 'Limitada',
        prospect: { businessName: 'Limitada' },
      };

      await expect(scoped('create_demo', args)).rejects.toThrow(
        /Las demos son de la agencia/,
      );
      await expect(scoped('list_demos')).rejects.toThrow(/Las demos son de la agencia/);
      await expect(agent(keys.read)('create_demo', args)).rejects.toThrow(
        /permiso "write"/,
      );
      expect(
        await prisma.tenant.findUnique({ where: { slug: `demo-limitada-${tag}` } }),
      ).toBeNull();
    });
  });
});
