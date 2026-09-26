import { z } from 'zod';
import { buildTools, type McpTool } from './tools';
import type { ApiClient } from './ApiClient';
import { readFile } from 'node:fs/promises';

jest.mock('node:fs/promises', () => ({
  readFile: jest.fn(),
}));

jest.mock('node:path', () => ({
  basename: (p: string): string => p.split('/').pop() || p,
  extname: (p: string): string => {
    const idx = p.lastIndexOf('.');
    return idx !== -1 ? p.slice(idx) : '';
  },
}));

describe('herramientas del MCP', () => {
  const buildApi = (): jest.Mocked<Pick<ApiClient, 'request'>> => ({
    request: jest.fn().mockResolvedValue({ ok: true }),
  });

  const tools = (api: jest.Mocked<Pick<ApiClient, 'request'>>): McpTool[] =>
    buildTools(api as unknown as ApiClient);

  const find = (api: jest.Mocked<Pick<ApiClient, 'request'>>, name: string): McpTool => {
    const tool = tools(api).find((candidate) => candidate.name === name);
    if (tool === undefined) {
      throw new Error(`No existe la herramienta ${name}`);
    }
    return tool;
  };

  it('todas tienen título y descripción: es lo que el agente lee para elegir', () => {
    for (const tool of tools(buildApi())) {
      expect(tool.title.length).toBeGreaterThan(0);
      expect(tool.description.length).toBeGreaterThan(10);
    }
  });

  it('no repite nombres', () => {
    const names = tools(buildApi()).map((tool) => tool.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('crea las páginas en borrador salvo que se pida lo contrario', async () => {
    const api = buildApi();

    await find(api, 'create_page').handler({
      tenantId: '018f6f1a-0000-7000-8000-000000000003',
      slug: 'nosotros',
      title: 'Nosotros',
    });

    expect(api.request).toHaveBeenCalledWith(
      'POST',
      '/api/admin/tenants/018f6f1a-0000-7000-8000-000000000003/pages',
      expect.objectContaining({ isPublished: false }),
    );
  });

  it('respeta isPublished cuando el agente lo manda explícito', async () => {
    const api = buildApi();

    await find(api, 'create_page').handler({
      tenantId: '018f6f1a-0000-7000-8000-000000000003',
      slug: 'x',
      title: 'X',
      isPublished: true,
    });

    expect(api.request).toHaveBeenCalledWith(
      'POST',
      '/api/admin/tenants/018f6f1a-0000-7000-8000-000000000003/pages',
      expect.objectContaining({ isPublished: true }),
    );
  });

  it('exige confirmación explícita en todo lo que borra', () => {
    const api = buildApi();
    for (const name of ['delete_page', 'delete_block']) {
      const schema = z.object(find(api, name).inputSchema);
      expect(
        schema.safeParse({
          tenantId: '018f6f1a-0000-7000-8000-000000000001',
          pageId: '018f6f1a-0000-7000-8000-000000000001',
          sectionId: '018f6f1a-0000-7000-8000-000000000001',
        }).success,
      ).toBe(false);
      expect(
        schema.safeParse({
          tenantId: '018f6f1a-0000-7000-8000-000000000001',
          pageId: '018f6f1a-0000-7000-8000-000000000001',
          sectionId: '018f6f1a-0000-7000-8000-000000000001',
          confirm: true,
        }).success,
      ).toBe(true);
    }
  });

  it('ninguna otra herramienta pide confirmación: solo estorbaría', () => {
    const api = buildApi();
    const withConfirm = tools(api)
      .filter((tool) => 'confirm' in tool.inputSchema)
      .map((tool) => tool.name);
    expect(withConfirm.sort()).toEqual([
      'convert_demo',
      'delete_block',
      'delete_coupon',
      'delete_page',
      'delete_post',
      'delete_product',
      'discard_demo',
    ]);
  });

  it('publicar es una acción separada de editar', async () => {
    const api = buildApi();

    await find(api, 'publish_page').handler({
      tenantId: '018f6f1a-0000-7000-8000-000000000003',
      pageId: '018f6f1a-0000-7000-8000-000000000007',
    });

    expect(api.request).toHaveBeenCalledWith(
      'POST',
      '/api/admin/tenants/018f6f1a-0000-7000-8000-000000000003/pages/018f6f1a-0000-7000-8000-000000000007/publish',
    );
  });

  it('restaurar no publica: son dos herramientas distintas', async () => {
    const api = buildApi();

    await find(api, 'restore_page_version').handler({
      tenantId: '018f6f1a-0000-7000-8000-000000000003',
      pageId: '018f6f1a-0000-7000-8000-000000000007',
      versionId: '018f6f1a-0000-7000-8000-000000000012',
    });

    expect(api.request).toHaveBeenCalledWith(
      'POST',
      '/api/admin/tenants/018f6f1a-0000-7000-8000-000000000003/pages/018f6f1a-0000-7000-8000-000000000007/versions/018f6f1a-0000-7000-8000-000000000012/restore',
    );
  });

  it('no manda tenantId ni pageId dentro del cuerpo al editar un bloque', async () => {
    const api = buildApi();

    await find(api, 'update_block').handler({
      tenantId: '018f6f1a-0000-7000-8000-000000000003',
      pageId: '018f6f1a-0000-7000-8000-000000000007',
      sectionId: '018f6f1a-0000-7000-8000-000000000012',
      props: { title: 'Hola' },
    });

    expect(api.request).toHaveBeenCalledWith(
      'PATCH',
      '/api/admin/tenants/018f6f1a-0000-7000-8000-000000000003/pages/018f6f1a-0000-7000-8000-000000000007/sections/018f6f1a-0000-7000-8000-000000000012',
      { props: { title: 'Hola' } },
    );
  });

  it('el catálogo se pide a la API, no se escribe a mano en el MCP', async () => {
    const api = buildApi();

    await find(api, 'get_catalog').handler({});

    expect(api.request).toHaveBeenCalledWith('GET', '/api/admin/catalog');
  });

  it('avisa si el cliente pedido no está al alcance de la clave', async () => {
    const api = buildApi();
    api.request.mockResolvedValue({
      tenants: [
        { id: '018f6f1a-0000-7000-8000-000000000002', slug: 'acme', primaryDomain: null },
      ],
    });

    await expect(
      find(api, 'get_preview_url').handler({
        tenantId: '018f6f1a-0000-7000-8000-000000000009',
      }),
    ).rejects.toThrow(
      /No existe un cliente con id 018f6f1a-0000-7000-8000-000000000009 a tu alcance/,
    );
  });

  it('el sitio duplicado y el creado desde plantilla pasan por el mismo endpoint', async () => {
    const api = buildApi();

    await find(api, 'create_tenant').handler({
      slug: 'pasteleria-luna',
      name: 'Pastelería Luna',
      templateId: 'pasteleria',
    });

    expect(api.request).toHaveBeenCalledWith(
      'POST',
      '/api/admin/tenants',
      expect.objectContaining({ templateId: 'pasteleria' }),
    );
  });

  it('el catálogo de plantillas se pide a la API, no se escribe a mano en el MCP', async () => {
    const api = buildApi();

    await find(api, 'list_templates').handler({});

    expect(api.request).toHaveBeenCalledWith('GET', '/api/admin/site-templates');
  });

  describe('upload_media', () => {
    it('sube una imagen exitosamente', async () => {
      (readFile as jest.Mock).mockResolvedValue(Buffer.from('fake-image-data'));

      const api = buildApi();
      api.request.mockResolvedValue({ asset: { key: 'img-123' } });

      const tool = find(api, 'upload_media');
      const result = await tool.handler({
        tenantId: 't1',
        files: [{ filePath: '/tmp/foto.jpg' }],
      });

      expect(result).toEqual({
        uploaded: [{ filePath: '/tmp/foto.jpg', key: 'img-123' }],
      });
      expect(api.request).toHaveBeenCalledWith(
        'POST',
        '/api/admin/tenants/t1/media',
        expect.any(FormData),
      );
      expect(readFile).toHaveBeenCalledWith('/tmp/foto.jpg');
    });

    it('sube varias imágenes y configura el texto alternativo en la misma operación', async () => {
      (readFile as jest.Mock).mockResolvedValue(Buffer.from('data'));

      const api = buildApi();
      api.request
        .mockResolvedValueOnce({ asset: { key: 'img-1' } }) // POST 1
        .mockResolvedValueOnce({}) // PATCH 1
        .mockResolvedValueOnce({ asset: { key: 'img-2' } }); // POST 2

      const tool = find(api, 'upload_media');
      const result = await tool.handler({
        tenantId: 't1',
        files: [{ filePath: '/tmp/1.png', alt: 'Foto 1' }, { filePath: '/tmp/2.webp' }],
      });

      expect(result).toEqual({
        uploaded: [
          { filePath: '/tmp/1.png', key: 'img-1' },
          { filePath: '/tmp/2.webp', key: 'img-2' },
        ],
      });
      expect(api.request).toHaveBeenCalledTimes(3);
      // PATCH for alt text
      expect(api.request).toHaveBeenCalledWith(
        'PATCH',
        '/api/admin/tenants/t1/media/img-1',
        { alt: 'Foto 1' },
      );
    });

    it('rechaza archivos que no sean imagen por su extensión', async () => {
      const api = buildApi();
      const tool = find(api, 'upload_media');

      await expect(
        tool.handler({
          tenantId: 't1',
          files: [{ filePath: '/tmp/script.sh' }],
        }),
      ).rejects.toThrow(/extensión permitida/);

      expect(api.request).not.toHaveBeenCalled();
    });

    it('arroja un error claro si el archivo no existe en el disco', async () => {
      const error = new Error('ENOENT: no such file') as Error & { code: string };
      error.code = 'ENOENT';
      (readFile as jest.Mock).mockRejectedValue(error);

      const api = buildApi();
      const tool = find(api, 'upload_media');

      await expect(
        tool.handler({
          tenantId: 't1',
          files: [{ filePath: '/tmp/fantasma.jpg' }],
        }),
      ).rejects.toThrow(/no existe en el disco local/);
    });

    it('propaga el error si la clave es de solo lectura (rechazada por la API)', async () => {
      (readFile as jest.Mock).mockResolvedValue(Buffer.from('data'));

      const api = buildApi();
      api.request.mockRejectedValue(
        new Error('Tu clave de acceso no tiene permiso para esta acción.'),
      );

      const tool = find(api, 'upload_media');

      await expect(
        tool.handler({
          tenantId: 't1',
          files: [{ filePath: '/tmp/foto.jpg' }],
        }),
      ).rejects.toThrow(/no tiene permiso/);
    });
  });

  describe('demos de prospecto', () => {
    const DEMO = '018f6f1a-0000-7000-8000-0000000000d1';
    const PROSPECT = '018f6f1a-0000-7000-8000-0000000000f1';
    const demoTools = [
      'create_demo',
      'list_demos',
      'get_demo',
      'update_prospect',
      'regenerate_demo_link',
      'extend_demo',
      'set_demo_expiry',
      'discard_demo',
      'restore_demo',
      'convert_demo',
    ];

    it.each([
      [
        'create_demo',
        {
          slug: 'luna',
          name: 'Luna',
          templateId: 'pasteleria',
          prospect: { businessName: 'Luna' },
        },
        'POST',
        '/api/admin/demos',
        {
          slug: 'luna',
          name: 'Luna',
          templateId: 'pasteleria',
          prospect: { businessName: 'Luna' },
        },
      ],
      ['list_demos', {}, 'GET', '/api/admin/demos', undefined],
      [
        'list_demos',
        { status: 'por-vencer', prospectId: PROSPECT },
        'GET',
        `/api/admin/demos?status=por-vencer&prospectId=${PROSPECT}`,
        undefined,
      ],
      [
        'update_prospect',
        { demoId: DEMO, notes: 'Llamar el lunes' },
        'PATCH',
        `/api/admin/demos/${DEMO}/prospect`,
        { notes: 'Llamar el lunes' },
      ],
      [
        'regenerate_demo_link',
        { demoId: DEMO, kind: 'team' },
        'POST',
        `/api/admin/demos/${DEMO}/team-link`,
        undefined,
      ],
      [
        'extend_demo',
        { demoId: DEMO },
        'POST',
        `/api/admin/demos/${DEMO}/extend`,
        undefined,
      ],
      [
        'set_demo_expiry',
        { demoId: DEMO, neverExpires: true },
        'PATCH',
        `/api/admin/demos/${DEMO}/expiry`,
        { neverExpires: true },
      ],
      [
        'discard_demo',
        { demoId: DEMO, reason: 'precio', confirm: true },
        'POST',
        `/api/admin/demos/${DEMO}/discard`,
        { reason: 'precio' },
      ],
      [
        'restore_demo',
        { demoId: DEMO },
        'POST',
        `/api/admin/demos/${DEMO}/restore`,
        undefined,
      ],
      [
        'convert_demo',
        { demoId: DEMO, owner: { name: 'Ana', email: 'ana@luna.cl' }, confirm: true },
        'POST',
        `/api/admin/demos/${DEMO}/convert`,
        { slug: undefined, owner: { name: 'Ana', email: 'ana@luna.cl' } },
      ],
    ])(
      '%s llama a la misma ruta que el panel',
      async (name, args, method, path, body) => {
        const api = buildApi();

        await find(api, name).handler(args);

        expect(api.request).toHaveBeenCalledWith(
          ...(body === undefined ? [method, path] : [method, path, body]),
        );
      },
    );

    it('get_demo junta el detalle con las últimas visitas', async () => {
      const api = buildApi();
      api.request.mockImplementation((_method: string, path: string) =>
        Promise.resolve(
          path.includes('/visits')
            ? { visits: [{ pageSlug: 'home' }], total: 7 }
            : { demo: { id: DEMO }, prospect: { businessName: 'Luna' }, otherDemos: [] },
        ),
      );

      const result = await find(api, 'get_demo').handler({ demoId: DEMO });

      expect(api.request).toHaveBeenCalledWith(
        'GET',
        `/api/admin/demos/${DEMO}/visits?perPage=10`,
      );
      expect(result).toEqual({
        demo: { id: DEMO },
        prospect: { businessName: 'Luna' },
        otherDemos: [],
        recentVisits: [{ pageSlug: 'home' }],
        totalVisits: 7,
      });
    });

    it('solo create_demo y regenerate_demo_link devuelven enlaces, y avisan que se muestran una vez', async () => {
      const withLinks = ['create_demo', 'regenerate_demo_link'];
      for (const name of demoTools) {
        const api = buildApi();
        api.request.mockResolvedValue({ demo: { id: DEMO } });
        const tool = find(api, name);

        const result = (await tool.handler({
          demoId: DEMO,
          kind: 'prospect',
          neverExpires: false,
          confirm: true,
          slug: 'luna',
          name: 'Luna',
        })) as { note?: string };

        if (withLinks.includes(name)) {
          expect(tool.description).toMatch(/UNA sola vez/);
          expect(result.note).toMatch(/UNA sola vez/);
        } else {
          expect(result.note).toBeUndefined();
          expect(tool.description).not.toMatch(/UNA sola vez/);
        }
      }
    });

    it('descartar y convertir exigen confirmación y lo dicen, junto con el permiso full', () => {
      const api = buildApi();
      for (const name of ['discard_demo', 'convert_demo']) {
        const tool = find(api, name);
        const schema = z.object(tool.inputSchema);
        expect(schema.safeParse({ demoId: DEMO }).success).toBe(false);
        expect(schema.safeParse({ demoId: DEMO, confirm: false }).success).toBe(false);
        expect(schema.safeParse({ demoId: DEMO, confirm: true }).success).toBe(true);
        expect(tool.description).toMatch(/"full"/);
      }
    });

    it('el motivo del descarte es de la lista cerrada', () => {
      const schema = z.object(find(buildApi(), 'discard_demo').inputSchema);
      expect(
        schema.safeParse({ demoId: DEMO, reason: 'precio', confirm: true }).success,
      ).toBe(true);
      expect(
        schema.safeParse({ demoId: DEMO, reason: 'caro', confirm: true }).success,
      ).toBe(false);
    });

    it('ninguna herramienta borra demos', async () => {
      const names = tools(buildApi()).map((tool) => tool.name);
      expect(
        names.filter((name) => /demo|prospect/.test(name) && /delete|purge/.test(name)),
      ).toEqual([]);
      for (const name of demoTools) {
        const api = buildApi();
        await find(api, name).handler({ demoId: DEMO, kind: 'prospect', confirm: true });
        for (const [method] of api.request.mock.calls) {
          expect(method).not.toBe('DELETE');
        }
      }
    });

    it('create_tenant manda a create_demo cuando es para un prospecto', () => {
      const api = buildApi();
      expect(find(api, 'create_tenant').description).toMatch(/prospecto.*create_demo/);
      expect(find(api, 'list_tenants').description).toMatch(/list_demos/);
    });
  });

  describe('sincronización con la documentación', () => {
    it('todas las herramientas exportadas están documentadas en docs/herramientas-agentes.md', async () => {
      const docsPath = process.cwd() + '/docs/herramientas-agentes.md';
      // Usamos el módulo original para leer la documentación real
      const actualModule = jest.requireActual<{
        readFile: (path: string, encoding: string) => Promise<string>;
      }>('node:fs/promises');
      const docContent = await actualModule.readFile(docsPath, 'utf-8');

      const exportedTools = tools(buildApi());

      for (const tool of exportedTools) {
        // Buscamos menciones de la herramienta en el markdown, idealmente como código en línea `tool_name` o listadas
        const regex = new RegExp(`\\b${tool.name}\\b`);
        expect({ name: tool.name, documented: regex.test(docContent) }).toEqual({
          name: tool.name,
          documented: true,
        });
      }
    });

    it('la lista completa de la documentación tiene exactamente las herramientas que existen', async () => {
      const actualModule = jest.requireActual<{
        readFile: (path: string, encoding: string) => Promise<string>;
      }>('node:fs/promises');
      const docContent = await actualModule.readFile(
        process.cwd() + '/docs/herramientas-agentes.md',
        'utf-8',
      );
      const section =
        docContent.split('## Lista Completa de Herramientas')[1]?.split(/\n## /)[0] ?? '';
      const listed = [...section.matchAll(/^- `([a-z_]+)`/gm)].map((match) => match[1]);
      const existing = tools(buildApi()).map((tool) => tool.name);

      // Ni una de más (una que se borró del código) ni una de menos, ni repetidas.
      expect(new Set(listed).size).toBe(listed.length);
      expect([...listed].sort()).toEqual([...existing].sort());
    });
  });
});
