import { z } from 'zod';
import { buildTools, type McpTool } from './tools';
import type { ApiClient } from './ApiClient';

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
      'delete_block',
      'delete_coupon',
      'delete_page',
      'delete_post',
      'delete_product',
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
});
