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
      'list_templates',
      'Ver los kits de inicio por rubro',
      'Lista las plantillas disponibles para crear un cliente nuevo ya armado: su id, el rubro que cubre, cuántas páginas trae y con qué estilo visual viene.',
      {},
      () => api.request('GET', '/api/admin/site-templates'),
    ),

    tool(
      'create_tenant',
      'Crear un cliente',
      'Crea un cliente nuevo. Puede nacer vacío, desde un kit por rubro (`templateId`, ver list_templates) o duplicando el sitio de otro cliente (`duplicateFromTenantId`). Un sitio duplicado nace despublicado.',
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
      { tenantId, pageId, versionId: z.number().int().positive() },
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
      'add_legal_page',
      'Agregar una página legal',
      'Crea la política de privacidad o los términos y condiciones a partir de una plantilla, ya rellenada con los datos del negocio. Nace despublicada: un texto legal lo revisa una persona antes de publicarlo.',
      {
        tenantId,
        kind: z.enum(['privacidad', 'terminos']).describe('Qué documento crear'),
      },
      (args) =>
        api.request('POST', `/api/admin/tenants/${String(args.tenantId)}/legal-pages`, {
          kind: args.kind,
        }),
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
        postId: z.number().int().positive(),
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
      { tenantId, postId: z.number().int().positive(), confirm },
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
        categoryId: z.number().int().positive().nullable().optional(),
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
        productId: z.number().int().positive(),
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
      { tenantId, productId: z.number().int().positive(), confirm },
      (args) =>
        api.request(
          'DELETE',
          `/api/admin/tenants/${String(args.tenantId)}/products/${String(args.productId)}`,
        ),
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
      { tenantId, domainId: z.number().int().positive() },
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
      { tenantId, domainId: z.number().int().positive() },
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
        orderId: z.number().int().positive(),
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
      { tenantId, couponId: z.number().int().positive(), confirm },
      (args) =>
        api.request(
          'DELETE',
          `/api/admin/tenants/${String(args.tenantId)}/store/coupons/${String(args.couponId)}`,
        ),
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
