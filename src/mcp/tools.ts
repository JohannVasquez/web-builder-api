import { z } from 'zod';
import type { ApiClient } from './ApiClient';

export interface McpTool {
  readonly name: string;
  readonly title: string;
  readonly description: string;
  readonly inputSchema: z.ZodRawShape;
  readonly handler: (args: Record<string, unknown>) => Promise<unknown>;
}

const tenantId = z.number().int().positive().describe('Id del cliente (tenant)');
const pageId = z.number().int().positive().describe('Id de la página');

// Las acciones destructivas exigen esta confirmación en la MISMA solicitud (Spec 10.4):
// un agente no puede borrar "de pasada" creyendo que era reversible.
const confirm = z
  .literal(true)
  .describe('Confirmación explícita obligatoria: esta acción no se puede deshacer sola');

export const buildTools = (api: ApiClient): McpTool[] => {
  const tool = (
    name: string,
    title: string,
    description: string,
    inputSchema: z.ZodRawShape,
    handler: (args: Record<string, unknown>) => Promise<unknown>,
  ): McpTool => ({ name, title, description, inputSchema, handler });

  return [
    tool(
      'list_tenants',
      'Listar clientes',
      'Lista los clientes que alcanza tu clave de acceso, con su id, slug, nombre y dominio principal.',
      {},
      () => api.request('GET', '/api/admin/tenants'),
    ),

    tool(
      'get_site',
      'Ver un sitio completo',
      'Devuelve todo el sitio de un cliente: páginas con sus bloques, menú de navegación, identidad de marca y datos del negocio. Es lo primero que conviene pedir antes de editar nada.',
      { tenantId },
      async (args) => {
        const id = args.tenantId as number;
        const [pages, brand] = await Promise.all([
          api.request(`GET`, `/api/admin/tenants/${id}/pages`),
          api.request(`GET`, `/api/admin/tenants/${id}/brand`),
        ]);
        return { tenantId: id, ...(pages as object), ...(brand as object) };
      },
    ),

    tool(
      'get_catalog',
      'Ver el catálogo de la plataforma',
      'Devuelve qué bloques existen, qué props acepta cada uno, sus variantes, los estilos visuales, las combinaciones tipográficas y las opciones comunes a todo bloque. Consúltalo antes de armar una página: se actualiza solo cuando la plataforma crece.',
      {},
      () => api.request('GET', '/api/admin/catalog'),
    ),

    tool(
      'create_page',
      'Crear una página',
      'Crea una página en el sitio de un cliente. Nace despublicada salvo que indiques lo contrario: publicar es una acción aparte.',
      {
        tenantId,
        slug: z
          .string()
          .describe('Dirección de la página, en minúsculas con guiones (ej. "nosotros")'),
        title: z.string().describe('Título de la página'),
        description: z
          .string()
          .optional()
          .describe('Descripción para buscadores y redes'),
        isPublished: z
          .boolean()
          .optional()
          .describe('Por defecto false: el trabajo de un agente queda en borrador'),
      },
      (args) => {
        const { tenantId: id, ...body } = args;
        return api.request('POST', `/api/admin/tenants/${String(id)}/pages`, {
          isPublished: false,
          ...body,
        });
      },
    ),

    tool(
      'update_page',
      'Editar una página',
      'Cambia el título, la dirección o la descripción de una página. Para publicarla usa publish_page.',
      {
        tenantId,
        pageId,
        slug: z.string().optional(),
        title: z.string().optional(),
        description: z.string().nullable().optional(),
      },
      (args) => {
        const { tenantId: id, pageId: page, ...body } = args;
        return api.request(
          'PATCH',
          `/api/admin/tenants/${String(id)}/pages/${String(page)}`,
          body,
        );
      },
    ),

    tool(
      'publish_page',
      'Publicar o despublicar una página',
      'Hace visible (o deja de hacer visible) una página en el sitio público. Requiere permiso "full".',
      { tenantId, pageId, isPublished: z.boolean() },
      (args) =>
        api.request(
          'PATCH',
          `/api/admin/tenants/${String(args.tenantId)}/pages/${String(args.pageId)}`,
          { isPublished: args.isPublished },
        ),
    ),

    tool(
      'delete_page',
      'Eliminar una página',
      'Borra una página y todos sus bloques. Requiere permiso "full" y confirmación explícita.',
      { tenantId, pageId, confirm },
      (args) =>
        api.request(
          'DELETE',
          `/api/admin/tenants/${String(args.tenantId)}/pages/${String(args.pageId)}`,
        ),
    ),

    tool(
      'add_block',
      'Agregar un bloque a una página',
      'Agrega un bloque en la posición indicada. Usa get_catalog para saber qué tipos hay y qué props acepta cada uno.',
      {
        tenantId,
        pageId,
        type: z
          .string()
          .describe('Tipo de bloque, ej. "Hero", "Features", "ContactForm"'),
        position: z
          .number()
          .int()
          .min(0)
          .describe('Orden dentro de la página, empezando en 0'),
        props: z
          .record(z.string(), z.unknown())
          .describe('Contenido y opciones del bloque'),
        anchor: z
          .string()
          .nullable()
          .optional()
          .describe('Ancla para enlazarlo desde el menú como /pagina#ancla'),
      },
      (args) => {
        const { tenantId: id, pageId: page, ...body } = args;
        return api.request(
          'POST',
          `/api/admin/tenants/${String(id)}/pages/${String(page)}/sections`,
          body,
        );
      },
    ),

    tool(
      'update_block',
      'Editar un bloque',
      'Cambia el contenido, la variante o la posición de un bloque. Mandar `props` reemplaza el contenido completo del bloque.',
      {
        tenantId,
        pageId,
        sectionId: z.number().int().positive(),
        type: z.string().optional(),
        position: z.number().int().min(0).optional(),
        props: z.record(z.string(), z.unknown()).optional(),
        anchor: z.string().nullable().optional(),
      },
      (args) => {
        const { tenantId: id, pageId: page, sectionId, ...body } = args;
        return api.request(
          'PATCH',
          `/api/admin/tenants/${String(id)}/pages/${String(page)}/sections/${String(sectionId)}`,
          body,
        );
      },
    ),

    tool(
      'delete_block',
      'Eliminar un bloque',
      'Borra un bloque de una página. Requiere permiso "full" y confirmación explícita.',
      { tenantId, pageId, sectionId: z.number().int().positive(), confirm },
      (args) =>
        api.request(
          'DELETE',
          `/api/admin/tenants/${String(args.tenantId)}/pages/${String(args.pageId)}/sections/${String(args.sectionId)}`,
        ),
    ),

    tool(
      'reorder_blocks',
      'Reordenar los bloques de una página',
      'Define el orden completo de los bloques de una página. Hay que enviar TODOS sus ids, en el orden deseado.',
      {
        tenantId,
        pageId,
        sectionIds: z
          .array(z.number().int().positive())
          .describe('Ids en el orden final'),
      },
      (args) =>
        api.request(
          'PUT',
          `/api/admin/tenants/${String(args.tenantId)}/pages/${String(args.pageId)}/sections/reorder`,
          { sectionIds: args.sectionIds },
        ),
    ),

    tool(
      'get_brand',
      'Ver la identidad de marca de un cliente',
      'Devuelve paleta, tipografía, logos, modo claro/oscuro y estilo visual.',
      { tenantId },
      (args) => api.request('GET', `/api/admin/tenants/${String(args.tenantId)}/brand`),
    ),

    tool(
      'update_brand',
      'Editar la identidad de marca',
      'Cambia paleta, tipografía, logos, modo claro/oscuro o estilo visual. Lo que no envíes no se toca. Consulta get_catalog para los ids válidos de tipografía y estilo.',
      {
        tenantId,
        palette: z
          .record(z.string(), z.string())
          .optional()
          .describe(
            'Colores en hex: primary, secondary, accent, background, foreground, success, warning, danger',
          ),
        typography: z
          .object({
            pairing: z.string(),
            scale: z.enum(['compact', 'normal', 'spacious']),
          })
          .optional(),
        assets: z
          .record(z.string(), z.string())
          .optional()
          .describe('Keys del almacenamiento: logoLight, logoDark, favicon, ogImage'),
        colorMode: z.enum(['light', 'dark', 'system']).optional(),
        visualStyle: z.string().optional(),
      },
      (args) => {
        const { tenantId: id, ...body } = args;
        return api.request('PATCH', `/api/admin/tenants/${String(id)}/brand`, body);
      },
    ),

    tool(
      'get_preview_url',
      'Obtener el enlace de vista previa',
      'Devuelve el enlace para que una persona revise el sitio antes de publicarlo.',
      { tenantId },
      async (args) => {
        const id = args.tenantId as number;
        const { tenants } = await api.request<{
          tenants: { id: number; slug: string; primaryDomain: string | null }[];
        }>('GET', '/api/admin/tenants');
        const tenant = tenants.find((candidate) => candidate.id === id);
        if (tenant === undefined) {
          throw new Error(`No existe un cliente con id ${String(id)} a tu alcance.`);
        }
        return {
          tenant: tenant.slug,
          previewUrl:
            tenant.primaryDomain === null ? null : `https://${tenant.primaryDomain}/`,
          note: 'Las páginas despublicadas no se ven en el sitio público; publícalas para revisarlas o usa el panel.',
        };
      },
    ),

    tool(
      'list_activity',
      'Ver el registro de actividad',
      'Quién cambió qué y cuándo, filtrable por cliente y por actor. Útil para revisar lo que dejaste hecho.',
      {
        tenantId: z.number().int().positive().optional(),
        limit: z.number().int().min(1).max(200).optional(),
      },
      (args) => {
        const params = new URLSearchParams();
        const tenant = args.tenantId as number | undefined;
        const limit = (args.limit as number | undefined) ?? 50;
        if (tenant !== undefined) {
          params.set('tenantId', String(tenant));
        }
        params.set('limit', String(limit));
        return api.request('GET', `/api/admin/activity?${params.toString()}`);
      },
    ),
  ];
};
