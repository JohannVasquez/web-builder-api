import { z } from 'zod';
import type { ApiClient } from './ApiClient';
import { MIME_EXTENSIONS } from '../modules/FileStorage/domain/AllowedMimeTypes';
import { idSchema } from '../shared/domain/identifier';
import { DEMO_DISCARD_REASONS, DEMO_LINK_KINDS } from '../modules/Demo/domain/Demo';
import { DEMO_LIST_STATUSES } from '../modules/Demo/domain/DemoSchema';
import { DEMO_METRICS_GROUPINGS } from '../modules/Demo/domain/DemoMetrics';

export interface McpTool {
  readonly name: string;
  readonly title: string;
  readonly description: string;
  readonly inputSchema: z.ZodRawShape;
  readonly handler: (args: Record<string, unknown>) => Promise<unknown>;
}

const tenantId = idSchema.describe('Id del cliente (tenant)');
const pageId = idSchema.describe('Id de la página');
const demoId = idSchema.describe('Id de la demo (sale de create_demo o de list_demos)');

// Los enlaces de una demo se guardan como hash: si el agente no se los entrega a la persona
// ahora, nadie los puede volver a ver.
const DEMO_LINKS_NOTE =
  'Este enlace se muestra UNA sola vez: la plataforma guarda solo su huella y ninguna otra herramienta lo vuelve a mostrar. Entrégaselo ahora a la persona que te lo pidió. Si se pierde, genera otro con regenerate_demo_link (el anterior deja de servir).';

const prospectFields = {
  contactName: z
    .string()
    .nullable()
    .optional()
    .describe('Nombre de la persona de contacto'),
  phone: z.string().nullable().optional().describe('Teléfono, tal como se marca'),
  email: z
    .string()
    .nullable()
    .optional()
    .describe('Correo del prospecto; sin él no le llega el aviso de vencimiento'),
  industry: z.string().nullable().optional().describe('Rubro, ej. "pastelería"'),
  source: z
    .string()
    .nullable()
    .optional()
    .describe('De dónde salió: "Google Maps", "Instagram", "referido"...'),
  notes: z.string().nullable().optional().describe('Notas de la llamada'),
};

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
      'Lista los clientes que alcanza tu clave de acceso, con su id, slug, nombre y dominio principal. No incluye las demos de prospecto: esas se listan con list_demos.',
      {},
      () => api.request('GET', '/api/admin/tenants'),
    ),

    tool(
      'get_site',
      'Ver un sitio completo',
      'Devuelve todo el sitio de un cliente: páginas con sus bloques, menú de navegación, identidad de marca y datos del negocio. Es lo primero que conviene pedir antes de editar nada.',
      { tenantId },
      async (args) => {
        const id = args.tenantId as string;
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
      'list_templates',
      'Ver los kits de inicio por rubro',
      'Lista las plantillas disponibles para crear un cliente nuevo ya armado: su id, el rubro que cubre, cuántas páginas trae y con qué estilo visual viene.',
      {},
      () => api.request('GET', '/api/admin/site-templates'),
    ),

    tool(
      'create_tenant',
      'Crear un cliente',
      'Crea un cliente nuevo, con su sitio PÚBLICO. Si es para mostrarle a un prospecto que todavía no compró, usa `create_demo`: un cliente se ve en internet apenas se crea. Puede nacer vacío, desde un kit por rubro (`templateId`, ver list_templates) o duplicando el sitio de otro cliente (`duplicateFromTenantId`). Un sitio duplicado nace despublicado.',
      {
        slug: z
          .string()
          .describe('Identificador en minúsculas y guiones, ej. "pasteleria-luna"'),
        name: z.string().describe('Nombre del negocio, como se muestra en el sitio'),
        domains: z
          .array(z.string())
          .optional()
          .describe('Dominios sin protocolo ni puerto; el primero es el canónico'),
        templateId: z.string().optional().describe('Id de un kit por rubro'),
        duplicateFromTenantId: z
          .number()
          .int()
          .positive()
          .optional()
          .describe('Id del cliente cuyo sitio quieres copiar'),
      },
      (args) => api.request('POST', '/api/admin/tenants', args),
    ),

    tool(
      'create_demo',
      'Crear una demo para un prospecto',
      'Crea el sitio PRIVADO de un prospecto (un negocio que todavía no compró) para mostrárselo antes de venderle. Nace desde un kit por rubro (`templateId`, ver list_templates), duplicando otro sitio (`duplicateFromTenantId`) o vacío, con todas sus páginas publicadas, pero solo lo ve quien trae su enlace: ni el público ni los buscadores. Vence a los 14 días. Devuelve la demo (su `tenantId` sirve para llenarla con get_site, add_block, update_brand y las demás herramientas de siempre) y sus dos enlaces: `links.prospect` para mandarle al prospecto y `links.team` para el equipo. Los enlaces se muestran UNA sola vez. Si el negocio ya es cliente, usa create_tenant. Requiere permiso "write" y una clave sin alcance limitado.',
      {
        slug: z
          .string()
          .describe(
            'Nombre del negocio en minúsculas y guiones, ej. "pasteleria-luna"; la dirección será demo-<slug>. Si está ocupado, la respuesta sugiere uno libre',
          ),
        name: z.string().describe('Nombre del negocio, como se muestra en el sitio'),
        templateId: z.string().optional().describe('Id de un kit por rubro'),
        duplicateFromTenantId: idSchema
          .optional()
          .describe('Id del sitio que quieres copiar (excluyente con templateId)'),
        prospect: z
          .object({
            businessName: z.string().describe('Nombre del negocio'),
            ...prospectFields,
          })
          .optional()
          .describe('Ficha del prospecto nuevo. Manda esto o `prospectId`'),
        prospectId: idSchema
          .optional()
          .describe(
            'Id de un prospecto que ya tiene otra demo, para hacerle una segunda propuesta',
          ),
      },
      async (args) => ({
        ...(await api.request<object>('POST', '/api/admin/demos', args)),
        note: DEMO_LINKS_NOTE,
      }),
    ),

    tool(
      'list_demos',
      'Listar demos de prospectos',
      'Lista las demos con su estado (vigente, vencida, convertida, descartada), el prospecto y su teléfono, la dirección, el vencimiento y las visitas del prospecto (cuántas y la última). `por-vencer` trae las vigentes que vencen en los próximos días, la más próxima primero: la lista para llamar. No incluye enlaces.',
      {
        status: z.enum(DEMO_LIST_STATUSES).optional().describe('Filtra por estado'),
        prospectId: idSchema.optional().describe('Solo las demos de este prospecto'),
      },
      (args) => {
        const params = new URLSearchParams();
        for (const key of ['status', 'prospectId'] as const) {
          const value = args[key];
          if (typeof value === 'string') {
            params.set(key, value);
          }
        }
        const query = params.toString();
        return api.request('GET', `/api/admin/demos${query === '' ? '' : `?${query}`}`);
      },
    ),

    tool(
      'get_demo',
      'Ver una demo',
      'Detalle de una demo: su estado y vencimiento, la ficha completa del prospecto, sus otras propuestas y las últimas páginas que abrió. Úsala antes de llamarlo. No incluye enlaces.',
      { demoId },
      async (args) => {
        const id = String(args.demoId);
        const [detail, visits] = await Promise.all([
          api.request<object>('GET', `/api/admin/demos/${id}`),
          api.request<{ visits: unknown[]; total: number }>(
            'GET',
            `/api/admin/demos/${id}/visits?perPage=10`,
          ),
        ]);
        return { ...detail, recentVisits: visits.visits, totalVisits: visits.total };
      },
    ),

    tool(
      'update_prospect',
      'Editar la ficha del prospecto',
      'Cambia los datos del prospecto de una demo: notas de la llamada, contacto, teléfono, correo. La ficha es una sola y la comparten todas sus propuestas. Manda solo lo que cambia.',
      {
        demoId,
        businessName: z.string().optional().describe('Nombre del negocio'),
        ...prospectFields,
      },
      (args) => {
        const { demoId: id, ...body } = args;
        return api.request('PATCH', `/api/admin/demos/${String(id)}/prospect`, body);
      },
    ),

    tool(
      'regenerate_demo_link',
      'Regenerar el enlace de una demo',
      'Genera un enlace nuevo, del prospecto o del equipo, y lo devuelve. El anterior deja de funcionar al instante: sirve si el enlace se perdió o llegó a quien no debía. El enlace nuevo se muestra UNA sola vez.',
      {
        demoId,
        kind: z
          .enum(DEMO_LINK_KINDS)
          .describe('"prospect" para el prospecto, "team" para el equipo de la agencia'),
      },
      async (args) => ({
        ...(await api.request<object>(
          'POST',
          `/api/admin/demos/${String(args.demoId)}/${String(args.kind)}-link`,
        )),
        note: DEMO_LINKS_NOTE,
      }),
    ),

    tool(
      'extend_demo',
      'Extender una demo',
      'Suma 14 días al vencimiento (o a hoy, si ya venció: la reactiva y el prospecto vuelve a entrar con el mismo enlace). Sin máximo. No vale sobre una demo descartada (primero restore_demo) ni convertida.',
      { demoId },
      (args) => api.request('POST', `/api/admin/demos/${String(args.demoId)}/extend`),
    ),

    tool(
      'set_demo_expiry',
      'Marcar una demo sin vencimiento',
      'Con `neverExpires: true` la demo deja de vencer (por ejemplo, una que se usa de portafolio) y nunca se borra sola. Con `false` le vuelve a poner vencimiento a 14 días desde hoy.',
      { demoId, neverExpires: z.boolean() },
      (args) =>
        api.request('PATCH', `/api/admin/demos/${String(args.demoId)}/expiry`, {
          neverExpires: args.neverExpires,
        }),
    ),

    tool(
      'discard_demo',
      'Descartar una demo',
      'Cuando el prospecto dijo que no: su enlace deja de funcionar al instante y la demo se borra sola 30 días después. No es borrar: dentro de esos 30 días se recupera con restore_demo. Requiere permiso "full" y confirmación explícita.',
      {
        demoId,
        reason: z
          .enum(DEMO_DISCARD_REASONS)
          .optional()
          .describe('Por qué no compró; sirve a las métricas'),
        confirm,
      },
      (args) =>
        api.request('POST', `/api/admin/demos/${String(args.demoId)}/discard`, {
          reason: args.reason,
        }),
    ),

    tool(
      'restore_demo',
      'Recuperar una demo descartada',
      'Para el prospecto que llamó de vuelta: una demo descartada hace menos de 30 días vuelve a estar vigente por 14 días y el prospecto entra con el mismo enlace de antes.',
      { demoId },
      (args) => api.request('POST', `/api/admin/demos/${String(args.demoId)}/restore`),
    ),

    tool(
      'convert_demo',
      'Convertir una demo en cliente',
      'El prospecto compró: su demo pasa a ser su sitio público en `<slug>.<dominio de la plataforma>`, deja de vencer, sus enlaces dejan de servir y sus otras propuestas se descartan. Con `owner` se crea su cuenta del panel y le llega un correo para elegir contraseña. Si el slug está ocupado responde con uno libre para reintentar. Requiere permiso "full" y confirmación explícita.',
      {
        demoId,
        slug: z
          .string()
          .optional()
          .describe(
            'Slug definitivo; por omisión el de la demo sin "demo-" (ni el "-2" de una segunda propuesta)',
          ),
        owner: z
          .object({
            name: z.string().describe('Nombre de la persona dueña del negocio'),
            email: z.string().describe('Su correo: ahí le llega la invitación'),
          })
          .optional()
          .describe('La persona dueña del negocio, para crearle su cuenta de cliente'),
        confirm,
      },
      (args) =>
        api.request('POST', `/api/admin/demos/${String(args.demoId)}/convert`, {
          slug: args.slug,
          owner: args.owner,
        }),
    ),

    tool(
      'demo_metrics',
      'Métricas de demos',
      'Cuántas demos se crearon en un rango de fechas, cuántas abrió el prospecto y cuántas se vendieron (con sus tasas, de 0 a 1), qué pasó con ellas hasta hoy (vigentes, vencidas, descartadas por motivo, convertidas, borradas), en cuántos días se abren y se venden, y con `groupBy` el mismo embudo por rubro, kit, vendedor o mes. Cuenta también las demos ya borradas. Por omisión, los últimos 90 días. Requiere permiso "full": muestra cuánto vende cada persona del equipo.',
      {
        from: z
          .string()
          .optional()
          .describe('Primer día incluido, AAAA-MM-DD en hora de Chile, ej. "2026-01-01"'),
        to: z
          .string()
          .optional()
          .describe('Último día incluido, AAAA-MM-DD en hora de Chile, ej. "2026-12-31"'),
        groupBy: z
          .enum(DEMO_METRICS_GROUPINGS)
          .optional()
          .describe(
            '"industry" (rubro), "template" (kit), "creator" (quién la creó) o "month" (mes de creación)',
          ),
      },
      (args) => {
        const params = new URLSearchParams();
        for (const key of ['from', 'to', 'groupBy'] as const) {
          const value = args[key];
          if (typeof value === 'string') {
            params.set(key, value);
          }
        }
        const query = params.toString();
        return api.request(
          'GET',
          `/api/admin/demos/metrics${query === '' ? '' : `?${query}`}`,
        );
      },
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
        visualStyle: z
          .string()
          .nullable()
          .optional()
          .describe(
            'Estilo visual propio de esta página (ver get_catalog para los ids, ej. "claymorphism", "liquid-glass"); null = hereda el del sitio',
          ),
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
      'Cambia el título, la dirección, la descripción, el estilo visual o los datos para buscadores de una página. Para que el cambio se vea en el sitio usa publish_page.',
      {
        tenantId,
        pageId,
        slug: z.string().optional(),
        title: z.string().optional(),
        description: z.string().nullable().optional(),
        visualStyle: z
          .string()
          .nullable()
          .optional()
          .describe(
            'Estilo visual propio de esta página (ver get_catalog para los ids, ej. "claymorphism", "liquid-glass"); null = hereda el del sitio',
          ),
        seoTitle: z
          .string()
          .nullable()
          .optional()
          .describe('Título que se muestra en buscadores; null = se deduce del título'),
        seoDescription: z
          .string()
          .nullable()
          .optional()
          .describe(
            'Descripción que aparece bajo el título en buscadores; null = se deduce de la descripción',
          ),
        ogImageKey: z
          .string()
          .nullable()
          .optional()
          .describe(
            'Imagen que se usa al compartir el enlace: la `key` de la biblioteca del cliente, nunca una URL (las firmadas vencen)',
          ),
        noindex: z
          .boolean()
          .optional()
          .describe(
            'true saca la página del índice: el enlace funciona, el buscador no la lista',
          ),
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
      'Publicar una página',
      'Copia el borrador al sitio público. Hasta que se publica, lo que editas no lo ve nadie. Requiere permiso "full".',
      { tenantId, pageId },
      (args) =>
        api.request(
          'POST',
          `/api/admin/tenants/${String(args.tenantId)}/pages/${String(args.pageId)}/publish`,
        ),
    ),

    tool(
      'unpublish_page',
      'Quitar una página del sitio público',
      'Deja de mostrar la página sin borrar su contenido. Requiere permiso "full".',
      { tenantId, pageId },
      (args) =>
        api.request(
          'PATCH',
          `/api/admin/tenants/${String(args.tenantId)}/pages/${String(args.pageId)}`,
          { isPublished: false },
        ),
    ),

    tool(
      'list_page_versions',
      'Ver el historial de una página',
      'Lista las versiones guardadas de una página, con quién hizo cada cambio y cuándo. Cada edición del borrador guarda una.',
      { tenantId, pageId, limit: z.number().int().min(1).max(100).optional() },
      (args) => {
        const limit = (args.limit as number | undefined) ?? 30;
        return api.request(
          'GET',
          `/api/admin/tenants/${String(args.tenantId)}/pages/${String(args.pageId)}/versions?limit=${String(limit)}`,
        );
      },
    ),

    tool(
      'restore_page_version',
      'Restaurar una versión anterior',
      'Devuelve el borrador de la página a una versión anterior. No publica: publicar sigue siendo una acción aparte. Restaurar crea una versión nueva, así que también se puede deshacer.',
      { tenantId, pageId, versionId: idSchema },
      (args) =>
        api.request(
          'POST',
          `/api/admin/tenants/${String(args.tenantId)}/pages/${String(args.pageId)}/versions/${String(args.versionId)}/restore`,
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
        sectionId: idSchema,
        type: z.string().optional(),
        position: z.number().int().min(0).optional(),
        props: z.record(z.string(), z.unknown()).optional(),
        anchor: z.string().nullable().optional(),
        isHidden: z
          .boolean()
          .optional()
          .describe('Oculto: sigue en el borrador y en el panel, pero no sale al sitio'),
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
      'duplicate_block',
      'Duplicar un bloque',
      'Copia un bloque justo debajo del original, con el mismo contenido. El ancla no se copia: dos bloques con la misma haría que un enlace del menú apuntara a cualquiera de los dos.',
      { tenantId, pageId, sectionId: idSchema },
      (args) =>
        api.request(
          'POST',
          `/api/admin/tenants/${String(args.tenantId)}/pages/${String(args.pageId)}/sections/${String(args.sectionId)}/duplicate`,
        ),
    ),

    tool(
      'delete_block',
      'Eliminar un bloque',
      'Borra un bloque de una página. Requiere permiso "full" y confirmación explícita.',
      { tenantId, pageId, sectionId: idSchema, confirm },
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
        sectionIds: z.array(idSchema).describe('Ids en el orden final'),
      },
      (args) =>
        api.request(
          'PUT',
          `/api/admin/tenants/${String(args.tenantId)}/pages/${String(args.pageId)}/sections/reorder`,
          { sectionIds: args.sectionIds },
        ),
    ),

    tool(
      'add_legal_page',
      'Agregar una página legal',
      'Crea la política de privacidad o los términos y condiciones a partir de una plantilla, ya rellenada con los datos del negocio. Nace despublicada: un texto legal lo revisa una persona antes de publicarlo.',
      {
        tenantId,
        kind: z
          .enum(['privacidad', 'terminos', 'compra'])
          .describe(
            'Qué documento crear: "compra" son los términos y condiciones de la tienda',
          ),
      },
      (args) =>
        api.request('POST', `/api/admin/tenants/${String(args.tenantId)}/legal-pages`, {
          kind: args.kind,
        }),
    ),

    tool(
      'get_settings',
      'Ver los datos del negocio y medición',
      'Devuelve el nombre del sitio, contacto, redes sociales, horarios y códigos de analítica.',
      { tenantId },
      (args) =>
        api.request('GET', `/api/admin/tenants/${String(args.tenantId)}/settings`),
    ),

    tool(
      'update_settings',
      'Editar los datos del negocio y medición',
      'Actualiza parcialmente la configuración global (contacto, redes, medición). Lo que no envíes no se toca.',
      {
        tenantId,
        siteName: z.string().optional(),
        tagline: z.string().optional(),
        contactEmail: z.string().optional().describe('Admite varios separados por coma'),
        contactPhone: z.string().optional(),
        whatsappNumber: z
          .string()
          .optional()
          .describe('Se guardará solo con dígitos, código de país incluido'),
        address: z.string().optional(),
        instagramUrl: z.string().optional(),
        facebookUrl: z.string().optional(),
        tiktokUrl: z.string().optional(),
        linkedinUrl: z.string().optional(),
        youtubeUrl: z.string().optional(),
        xUrl: z.string().optional(),
        customLinkUrl: z.string().optional(),
        customLinkLabel: z.string().optional(),
        googleAnalyticsId: z.string().optional().describe('Empieza con G-'),
        metaPixelId: z.string().optional().describe('Solo números'),
        googleTagManagerId: z.string().optional().describe('Empieza con GTM-'),
        cookieBanner: z.string().optional().describe('true o false o cadena vacía'),
        openingHours: z
          .string()
          .optional()
          .describe('Horarios en JSON serializado (monday, tuesday...)'),
        googleSiteVerification: z.string().optional(),
        bingSiteVerification: z.string().optional(),
        siteUnderConstruction: z
          .string()
          .optional()
          .describe('true o false o cadena vacía'),
      },
      (args) => {
        const { tenantId: id, ...body } = args;
        return api.request('PUT', `/api/admin/tenants/${String(id)}/settings`, body);
      },
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
      'list_media',
      'Ver la biblioteca de imágenes de un cliente',
      'Lista las imágenes de un cliente con su `key`, su texto alternativo y una URL para verlas. La `key` es lo que se guarda en los props de un bloque, no la URL: las URLs del bucket expiran.',
      {
        tenantId,
        search: z.string().optional().describe('Filtra por nombre o texto alternativo'),
      },
      (args) => {
        const search = (args.search as string | undefined) ?? '';
        return api.request(
          'GET',
          `/api/admin/tenants/${String(args.tenantId)}/media?search=${encodeURIComponent(search)}`,
        );
      },
    ),

    tool(
      'upload_media',
      'Subir imágenes a la biblioteca',
      'Sube uno o más archivos de imagen desde tu disco local a la biblioteca del cliente. Devuelve los identificadores (`keys`) de las imágenes subidas, que son los que debes usar en los bloques. NO devuelve URLs públicas. Si incluyes un `alt`, el texto alternativo quedará configurado de inmediato.',
      {
        tenantId,
        files: z
          .array(
            z.object({
              filePath: z.string().describe('Ruta absoluta al archivo en tu disco local'),
              alt: z.string().optional().describe('Texto alternativo para accesibilidad'),
            }),
          )
          .min(1)
          .describe('Lista de imágenes a subir (puedes subir varias de una vez)'),
      },
      async (args) => {
        const { tenantId: id, files } = args as {
          tenantId: string | number;
          files: { filePath: string; alt?: string }[];
        };

        const { readFile } = await import('node:fs/promises');
        const { basename, extname } = await import('node:path');
        const allowedExtensions = Object.values(MIME_EXTENSIONS);
        const toUpload: { file: string; buffer: Buffer; alt?: string }[] = [];

        for (const f of files) {
          // Seguridad sensata: limitamos la lectura a extensiones de imagen para evitar
          // que un mensaje malicioso haga que el MCP lea archivos sensibles del usuario.
          const ext = extname(f.filePath).toLowerCase();
          if (!allowedExtensions.includes(ext) && ext !== '.jpeg') {
            throw new Error(
              `El archivo ${f.filePath} no tiene una extensión permitida (${allowedExtensions.join(', ')}).`,
            );
          }
          try {
            // No verificamos el magic number del contenido aquí por simplicidad; la API lo valida estrictamente.
            const buffer = await readFile(f.filePath);
            toUpload.push({ file: f.filePath, buffer, alt: f.alt });
          } catch (err) {
            if (
              err instanceof Error &&
              'code' in err &&
              (err as { code?: string }).code === 'ENOENT'
            ) {
              throw new Error(
                `El archivo no existe en el disco local: ${f.filePath}. Verifica la ruta y reintenta.`,
              );
            }
            throw err;
          }
        }

        const results: { filePath: string; key: string }[] = [];
        for (const item of toUpload) {
          const blob = new Blob([new Uint8Array(item.buffer)]);
          const formData = new FormData();
          formData.append('file', blob, basename(item.file));

          const uploadRes = await api.request<{ asset: { key: string } }>(
            'POST',
            `/api/admin/tenants/${String(id)}/media`,
            formData,
          );

          if (item.alt) {
            await api.request(
              'PATCH',
              `/api/admin/tenants/${String(id)}/media/${encodeURIComponent(uploadRes.asset.key)}`,
              { alt: item.alt },
            );
          }
          results.push({ filePath: item.file, key: uploadRes.asset.key });
        }
        return { uploaded: results };
      },
    ),

    tool(
      'describe_image',
      'Escribir el texto alternativo de una imagen',
      'Guarda el texto alternativo de una imagen. Sin él la imagen es invisible para quien usa un lector de pantalla, y el sitio no cumple accesibilidad.',
      {
        tenantId,
        key: z.string().describe('La `key` de la imagen, no su URL'),
        alt: z.string().describe('Qué se ve en la imagen, en una frase'),
      },
      (args) =>
        api.request(
          'PATCH',
          `/api/admin/tenants/${String(args.tenantId)}/media/${encodeURIComponent(String(args.key))}`,
          { alt: args.alt },
        ),
    ),

    tool(
      'list_posts',
      'Ver las publicaciones del blog',
      'Lista las publicaciones de un cliente, incluidos borradores y programadas, con su estado y fecha.',
      { tenantId },
      (args) => api.request('GET', `/api/admin/tenants/${String(args.tenantId)}/posts`),
    ),

    tool(
      'create_post',
      'Escribir una publicación',
      'Crea una publicación de blog. Nace en borrador salvo que se indique otra cosa. El contenido es una lista de bloques: paragraph, heading, list, quote, image, video y divider.',
      {
        tenantId,
        slug: z.string().describe('Dirección en minúsculas con guiones'),
        title: z.string(),
        excerpt: z.string().describe('Resumen corto, se muestra en el listado'),
        authorName: z.string(),
        content: z
          .array(z.record(z.string(), z.unknown()))
          .describe('Bloques de contenido; consulta get_catalog para los tipos'),
        tags: z.array(z.string()).optional(),
        status: z
          .enum(['draft', 'published', 'scheduled'])
          .optional()
          .describe('Por defecto draft; "scheduled" necesita publishedAt'),
        publishedAt: z
          .string()
          .optional()
          .describe('Fecha ISO; con status "scheduled" se publica sola al llegar'),
        coverImageKey: z.string().optional().describe('La `key` de la imagen, no su URL'),
      },
      (args) => {
        const { tenantId: id, ...body } = args;
        return api.request('POST', `/api/admin/tenants/${String(id)}/posts`, {
          status: 'draft',
          ...body,
        });
      },
    ),

    tool(
      'update_post',
      'Editar una publicación',
      'Cambia una publicación existente. Lo que no envíes no se toca.',
      {
        tenantId,
        postId: idSchema,
        slug: z.string().optional(),
        title: z.string().optional(),
        excerpt: z.string().optional(),
        authorName: z.string().optional(),
        content: z.array(z.record(z.string(), z.unknown())).optional(),
        tags: z.array(z.string()).optional(),
        status: z.enum(['draft', 'published', 'scheduled']).optional(),
        publishedAt: z.string().nullable().optional(),
        coverImageKey: z.string().nullable().optional(),
      },
      (args) => {
        const { tenantId: id, postId, ...body } = args;
        return api.request(
          'PATCH',
          `/api/admin/tenants/${String(id)}/posts/${String(postId)}`,
          body,
        );
      },
    ),

    tool(
      'delete_post',
      'Eliminar una publicación',
      'Borra una publicación del blog. Requiere permiso "full" y confirmación explícita.',
      { tenantId, postId: idSchema, confirm },
      (args) =>
        api.request(
          'DELETE',
          `/api/admin/tenants/${String(args.tenantId)}/posts/${String(args.postId)}`,
        ),
    ),

    tool(
      'list_products',
      'Ver el catálogo de un cliente',
      'Lista los productos de un cliente, incluidos los inactivos, con su precio en centavos y su estado.',
      { tenantId },
      (args) =>
        api.request('GET', `/api/admin/tenants/${String(args.tenantId)}/products`),
    ),

    tool(
      'create_product',
      'Agregar un producto',
      'Crea un producto del catálogo. Los precios van en enteros de pesos (29990 = $29.990), nunca con decimales. El precio de oferta tiene que ser menor que el normal.',
      {
        tenantId,
        slug: z.string().describe('Dirección en minúsculas con guiones'),
        name: z.string(),
        description: z.string().optional(),
        priceCents: z.number().int().min(0).describe('Precio en pesos enteros'),
        salePriceCents: z
          .number()
          .int()
          .min(0)
          .nullable()
          .optional()
          .describe('Precio de oferta; tiene que ser menor que el normal'),
        imageKeys: z
          .array(z.string())
          .optional()
          .describe('`keys` de la biblioteca de imágenes, no URLs'),
        variants: z
          .array(z.object({ name: z.string(), options: z.array(z.string()) }))
          .optional()
          .describe('Ej. [{ name: "Talla", options: ["S","M","L"] }]'),
        categoryId: idSchema.nullable().optional(),
        featured: z.boolean().optional().describe('Aparece en "productos destacados"'),
        isActive: z
          .boolean()
          .optional()
          .describe('Un producto inactivo no se ve en el sitio'),
      },
      (args) => {
        const { tenantId: id, ...body } = args;
        return api.request('POST', `/api/admin/tenants/${String(id)}/products`, body);
      },
    ),

    tool(
      'update_product',
      'Editar un producto',
      'Cambia un producto existente. Lo que no envíes no se toca.',
      {
        tenantId,
        productId: idSchema,
        name: z.string().optional(),
        description: z.string().optional(),
        priceCents: z.number().int().min(0).optional(),
        salePriceCents: z.number().int().min(0).nullable().optional(),
        imageKeys: z.array(z.string()).optional(),
        featured: z.boolean().optional(),
        isActive: z.boolean().optional(),
        stock: z
          .number()
          .int()
          .min(0)
          .nullable()
          .optional()
          .describe('Unidades disponibles; null = no se controla stock'),
      },
      (args) => {
        const { tenantId: id, productId, ...body } = args;
        return api.request(
          'PATCH',
          `/api/admin/tenants/${String(id)}/products/${String(productId)}`,
          body,
        );
      },
    ),

    tool(
      'delete_product',
      'Eliminar un producto',
      'Borra un producto del catálogo. Requiere permiso "full" y confirmación explícita. Si solo quieres dejar de venderlo, usa update_product con isActive: false.',
      { tenantId, productId: idSchema, confirm },
      (args) =>
        api.request(
          'DELETE',
          `/api/admin/tenants/${String(args.tenantId)}/products/${String(args.productId)}`,
        ),
    ),

    tool(
      'get_navigation',
      'Ver el menú del sitio',
      'Devuelve los enlaces del menú de navegación de un cliente, en orden.',
      { tenantId },
      (args) =>
        api.request('GET', `/api/admin/tenants/${String(args.tenantId)}/navigation`),
    ),

    tool(
      'set_navigation',
      'Definir el menú del sitio',
      'Reemplaza el menú completo: el orden del arreglo es el orden del menú. Un `href` apunta a una página propia ("/nosotros"), al ancla de una sección ("/servicios#precios") o a una URL completa. Manda siempre el menú entero, no solo lo que cambia.',
      {
        tenantId,
        links: z
          .array(z.object({ label: z.string(), href: z.string() }))
          .describe(
            'Ej. [{ label: "Inicio", href: "/" }, { label: "Contacto", href: "/contacto" }]',
          ),
      },
      (args) =>
        api.request('PUT', `/api/admin/tenants/${String(args.tenantId)}/navigation`, {
          links: args.links,
        }),
    ),

    tool(
      'set_site_status',
      'Pausar o reactivar un sitio',
      'Cambia el estado del sitio de un cliente. "active" lo sirve normal; "paused" y "building" muestran una página de mantención sin borrar nada. Reactivarlo lo devuelve tal cual estaba.',
      { tenantId, status: z.enum(['active', 'paused', 'building']) },
      (args) =>
        api.request('PATCH', `/api/admin/tenants/${String(args.tenantId)}/status`, {
          status: args.status,
        }),
    ),

    tool(
      'list_domains',
      'Ver los dominios de un cliente',
      'Lista los dominios del cliente con si están verificados, cuál es el principal y los registros DNS que hay que crear.',
      { tenantId },
      (args) => api.request('GET', `/api/admin/tenants/${String(args.tenantId)}/domains`),
    ),

    tool(
      'add_domain',
      'Agregar un dominio',
      'Agrega un dominio propio del cliente y devuelve los registros DNS que tiene que crear. Un subdominio de la plataforma queda verificado solo; un dominio propio nace sin verificar y no resuelve tráfico hasta que se verifica.',
      {
        tenantId,
        domain: z.string().describe('Sin protocolo ni puerto, ej. mitienda.cl'),
      },
      (args) =>
        api.request('POST', `/api/admin/tenants/${String(args.tenantId)}/domains`, {
          domain: args.domain,
        }),
    ),

    tool(
      'verify_domain',
      'Verificar un dominio',
      'Consulta el DNS y, si encuentra el registro TXT que corresponde, marca el dominio como verificado. Los cambios de DNS pueden demorar horas en propagarse.',
      { tenantId, domainId: idSchema },
      (args) =>
        api.request(
          'POST',
          `/api/admin/tenants/${String(args.tenantId)}/domains/${String(args.domainId)}/verify`,
        ),
    ),

    tool(
      'set_primary_domain',
      'Marcar el dominio principal',
      'Define cuál de los dominios del cliente es el canónico, el que se usa para construir las URLs absolutas del sitio. Tiene que estar verificado.',
      { tenantId, domainId: idSchema },
      (args) =>
        api.request(
          'PATCH',
          `/api/admin/tenants/${String(args.tenantId)}/domains/${String(args.domainId)}/primary`,
        ),
    ),

    tool(
      'get_store_settings',
      'Ver la configuración de la tienda',
      'Muestra si el cliente tiene tienda encendida, sus formas de envío, su medio de pago y si ya cargó sus datos de cobro (nunca devuelve las credenciales).',
      { tenantId },
      (args) =>
        api.request('GET', `/api/admin/tenants/${String(args.tenantId)}/store/settings`),
    ),

    tool(
      'update_store_settings',
      'Configurar la tienda',
      'Enciende o apaga la tienda y define envíos, impuesto y medio de cobro. Los precios van en pesos enteros. Con paymentProvider "transfer" las credenciales son los datos bancarios que se le muestran al comprador; con "flow", apiKey y secretKey de la cuenta Flow del propio cliente.',
      {
        tenantId,
        isEnabled: z
          .boolean()
          .optional()
          .describe('Apagada, el sitio no muestra nada de tienda'),
        currency: z.string().length(3).optional(),
        taxIncluded: z
          .boolean()
          .optional()
          .describe('En Chile lo normal es true: los precios ya traen IVA'),
        taxRatePercent: z.number().int().min(0).max(100).optional(),
        shippingOptions: z
          .array(
            z.object({
              code: z.string(),
              name: z.string(),
              priceCents: z.number().int().min(0),
              estimate: z.string().nullable().optional(),
              requiresAddress: z.boolean().optional(),
            }),
          )
          .optional(),
        freeShippingThresholdCents: z
          .number()
          .int()
          .min(0)
          .nullable()
          .optional()
          .describe('Desde cuánto el envío sale gratis'),
        paymentProvider: z.enum(['none', 'transfer', 'flow']).optional(),
        paymentCredentials: z
          .record(z.string(), z.string())
          .optional()
          .describe('Datos de la cuenta de cobro del cliente; no se devuelven nunca'),
        notificationEmail: z
          .email()
          .nullable()
          .optional()
          .describe('A quién le avisamos cuando entra un pedido'),
        termsPageSlug: z
          .string()
          .nullable()
          .optional()
          .describe(
            'Dirección de la página con los términos de compra (ej. "terminos-de-compra"; créala con add_legal_page kind "compra"). Publicada, comprar exige aceptarlos. null = no se exigen.',
          ),
      },
      (args) => {
        const { tenantId: id, ...body } = args;
        return api.request(
          'PATCH',
          `/api/admin/tenants/${String(id)}/store/settings`,
          body,
        );
      },
    ),

    tool(
      'list_orders',
      'Ver los pedidos',
      'Lista los pedidos de un cliente, del más nuevo al más viejo, con su estado y sus totales.',
      {
        tenantId,
        status: z
          .enum(['pending', 'paid', 'preparing', 'shipped', 'delivered', 'cancelled'])
          .optional(),
        page: z.number().int().min(1).optional(),
        perPage: z.number().int().min(1).max(100).optional(),
      },
      (args) => {
        const { tenantId: id, ...query } = args;
        const params = new URLSearchParams();
        for (const [key, value] of Object.entries(query)) {
          if (typeof value === 'string' || typeof value === 'number') {
            params.set(key, String(value));
          }
        }
        return api.request(
          'GET',
          `/api/admin/tenants/${String(id)}/store/orders?${params.toString()}`,
        );
      },
    ),

    tool(
      'update_order_status',
      'Cambiar el estado de un pedido',
      'Avanza un pedido: pending → paid → preparing → shipped → delivered, y cancelled hasta antes de entregar. Marcarlo pagado descuenta stock, gasta el cupón y manda los correos de confirmación.',
      {
        tenantId,
        orderId: idSchema,
        status: z.enum([
          'pending',
          'paid',
          'preparing',
          'shipped',
          'delivered',
          'cancelled',
        ]),
      },
      (args) =>
        api.request(
          'PATCH',
          `/api/admin/tenants/${String(args.tenantId)}/store/orders/${String(args.orderId)}/status`,
          { status: args.status },
        ),
    ),

    tool(
      'sales_report',
      'Ver el reporte de ventas',
      'Ventas por día y productos más vendidos en un período. Sin fechas, toma los últimos 30 días. Solo cuenta pedidos pagados.',
      {
        tenantId,
        from: z.string().optional().describe('Fecha ISO, ej. 2026-01-01'),
        to: z.string().optional(),
      },
      (args) => {
        const params = new URLSearchParams();
        for (const key of ['from', 'to'] as const) {
          const value = args[key];
          if (typeof value === 'string') {
            params.set(key, value);
          }
        }
        return api.request(
          'GET',
          `/api/admin/tenants/${String(args.tenantId)}/store/report?${params.toString()}`,
        );
      },
    ),

    tool(
      'list_coupons',
      'Ver los cupones',
      'Lista los cupones de descuento del cliente, con cuántas veces se usó cada uno.',
      { tenantId },
      (args) =>
        api.request('GET', `/api/admin/tenants/${String(args.tenantId)}/store/coupons`),
    ),

    tool(
      'create_coupon',
      'Crear un cupón',
      'Crea un cupón de descuento. "percentage" descuenta ese porcentaje del subtotal; "amount" descuenta esos pesos. El código se guarda siempre en mayúsculas.',
      {
        tenantId,
        code: z.string().describe('Ej. VERANO25'),
        discountType: z.enum(['percentage', 'amount']),
        value: z.number().int().positive().describe('Porcentaje o pesos, según el tipo'),
        minimumCents: z
          .number()
          .int()
          .min(0)
          .nullable()
          .optional()
          .describe('Compra mínima para que sirva'),
        startsAt: z.string().nullable().optional().describe('Fecha ISO'),
        endsAt: z.string().nullable().optional().describe('Fecha ISO'),
        maxUses: z.number().int().positive().nullable().optional(),
        isActive: z.boolean().optional(),
      },
      (args) => {
        const { tenantId: id, ...body } = args;
        return api.request(
          'POST',
          `/api/admin/tenants/${String(id)}/store/coupons`,
          body,
        );
      },
    ),

    tool(
      'delete_coupon',
      'Eliminar un cupón',
      'Borra un cupón. Requiere permiso "full" y confirmación explícita. Si solo quieres dejar de ofrecerlo, márcalo inactivo.',
      { tenantId, couponId: idSchema, confirm },
      (args) =>
        api.request(
          'DELETE',
          `/api/admin/tenants/${String(args.tenantId)}/store/coupons/${String(args.couponId)}`,
        ),
    ),

    tool(
      'get_preview_url',
      'Obtener el enlace de vista previa',
      'Genera un enlace de revisión compartible para que una persona vea el sitio tal como quedaría publicado, incluyendo páginas despublicadas y cambios en borrador.',
      { tenantId },
      async (args) => {
        const id = args.tenantId as string;

        const [tenantRes, linkRes] = await Promise.all([
          api.request<{
            tenants: { id: string; slug: string; primaryDomain: string | null }[];
          }>('GET', '/api/admin/tenants'),
          api.request<{ id: string; token: string; expiresAt: string }>(
            'POST',
            `/api/admin/tenants/${String(id)}/preview-links`,
            {},
          ),
        ]);

        const tenant = tenantRes.tenants.find((candidate) => candidate.id === id);
        if (tenant === undefined) {
          throw new Error(`No existe un cliente con id ${String(id)} a tu alcance.`);
        }

        // Sin dominio propio no hay dirección que armar: el dominio de la plataforma todavía
        // no está decidido (ver #98) e inventarlo aquí devolvería un enlace roto en silencio.
        const reviewUrl =
          tenant.primaryDomain === null
            ? null
            : `https://${tenant.primaryDomain}/?previewToken=${linkRes.token}`;

        return {
          tenant: tenant.slug,
          previewUrl: reviewUrl,
          previewToken: linkRes.token,
          expiresAt: linkRes.expiresAt,
          note:
            reviewUrl === null
              ? 'Este cliente todavía no tiene dominio propio: usa `previewToken` sobre el dominio donde esté servido el sitio. Expira solo, no pide cuenta y lo oculta de los buscadores.'
              : 'El enlace permite revisar el borrador actual y expira automáticamente. No requiere cuenta y oculta el sitio a buscadores.',
        };
      },
    ),

    tool(
      'list_activity',
      'Ver el registro de actividad',
      'Quién cambió qué y cuándo, filtrable por cliente y por actor. Útil para revisar lo que dejaste hecho.',
      {
        tenantId: idSchema.optional(),
        limit: z.number().int().min(1).max(200).optional(),
      },
      (args) => {
        const params = new URLSearchParams();
        const tenant = args.tenantId as string | undefined;
        const limit = (args.limit as number | undefined) ?? 50;
        if (tenant !== undefined) {
          params.set('tenantId', String(tenant));
        }
        params.set('limit', String(limit));
        return api.request('GET', `/api/admin/activity?${params.toString()}`);
      },
    ),

    tool(
      'review_site_quality',
      'Revisar calidad del sitio antes de entregar',
      'Ejecuta una revisión automática de calidad sobre el sitio (textos de ejemplo sin cambiar, imágenes sin texto alternativo, enlaces rotos, páginas sin SEO, datos de negocio faltantes, política de privacidad no publicada). Devuelve una lista de observaciones con su gravedad y cómo solucionarlas. Útil correrla antes de dar por terminado un proyecto.',
      { tenantId },
      (args) =>
        api.request('GET', `/api/admin/tenants/${String(args.tenantId)}/quality-review`),
    ),

    tool(
      'get_subscription_status',
      'Consultar estado de cobro de un cliente',
      'Revisa si un cliente está al día con la mensualidad de la agencia, si está por vencer o si está atrasado. El estado se calcula solo a partir de su fecha de inicio y los pagos recibidos.',
      { tenantId },
      (args) =>
        api.request('GET', `/api/admin/tenants/${String(args.tenantId)}/subscription`),
    ),

    tool(
      'register_subscription_payment',
      'Registrar un pago recibido',
      'Anota que el cliente pagó la mensualidad. Exige permiso `full` porque toca dinero. El estado del cliente (al día, atrasado) se actualizará solo. El monto va en números enteros (pesos).',
      {
        tenantId,
        amountCents: z
          .number()
          .int()
          .positive()
          .describe('Monto pagado, en enteros (pesos)'),
        paidAt: z
          .string()
          .datetime()
          .describe('Fecha en que se recibió la plata (ISO 8601)'),
        paymentMethod: z
          .string()
          .min(1)
          .max(50)
          .describe('Medio de pago (ej. transferencia, tarjeta, efectivo)'),
      },
      (args) =>
        api.request(
          'POST',
          `/api/admin/tenants/${String(args.tenantId)}/subscription/payments`,
          {
            amountCents: args.amountCents,
            paidAt: args.paidAt,
            paymentMethod: args.paymentMethod,
          },
        ),
    ),
  ];
};
