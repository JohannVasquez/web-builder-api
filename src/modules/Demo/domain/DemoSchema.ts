import { z } from 'zod';
import { idSchema } from '@/shared/domain/identifier';
import { tenantSlugSchema } from '@/modules/Tenant/domain/TenantSchema';
import { DEMO_DISCARD_REASONS } from './Demo';
import { DEMO_METRICS_GROUPINGS } from './DemoMetrics';
import { DEMO_SLUG_PREFIX } from './demoSlug';
import { ProspectInputSchema } from './Prospect';

// El slug del tenant será `demo-<slug>` y el sufijo sugerido ante un choque suma unos
// caracteres más: 90 deja margen dentro de los 100 que admite la columna.
export const DEMO_SLUG_MAX_LENGTH = 90;

export const CreateDemoSchema = z
  .strictObject({
    slug: z
      .string()
      .min(2)
      .max(DEMO_SLUG_MAX_LENGTH)
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        'Usa minúsculas y guiones, por ejemplo "pasteleria-luna"',
      ),
    name: z.string().trim().min(2).max(255),
    // Mismo origen que un cliente: un kit por rubro, una copia de otro sitio o vacía.
    templateId: z.string().max(100).optional(),
    duplicateFromTenantId: idSchema.optional(),
    // Un prospecto nuevo, o el id de uno existente para una segunda propuesta de diseño.
    prospect: ProspectInputSchema.optional(),
    prospectId: idSchema.optional(),
  })
  .refine(
    (value) =>
      value.templateId === undefined || value.duplicateFromTenantId === undefined,
    'Elige un kit o un sitio a duplicar, no las dos cosas.',
  )
  .refine(
    (value) => (value.prospect === undefined) !== (value.prospectId === undefined),
    'Manda los datos del prospecto (prospect) o el id de uno que ya existe (prospectId), uno de los dos.',
  );

export type CreateDemoInput = z.infer<typeof CreateDemoSchema>;

// `por-vencer` no es un estado más: son las vigentes que vencen dentro de la ventana de aviso,
// la lista para llamar a los prospectos a los que no les llega el correo.
// Las borradas no se listan: son un número en las métricas, no una demo.
export const DEMO_LIST_STATUSES = [
  'vigente',
  'vencida',
  'convertida',
  'descartada',
  'por-vencer',
] as const;

export const DemoListQuerySchema = z.object({
  status: z.enum(DEMO_LIST_STATUSES).optional(),
  prospectId: idSchema.optional(),
  // Id de la persona o clave que la creó.
  createdBy: idSchema.optional(),
});

export type DemoListQuery = z.infer<typeof DemoListQuerySchema>;

export const DemoVisitsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(200).default(50),
});

export const DemoExpirySchema = z.strictObject({
  neverExpires: z.boolean(),
});

// Borrar no se deshace: la confirmación va en la misma petición, igual que en el MCP.
export const DeleteDemoSchema = z.object({
  confirm: z.literal(true, {
    error: 'Borrar una demo no se puede deshacer: confirma con { "confirm": true }.',
  }),
});

export const ConvertDemoSchema = z.strictObject({
  // Por omisión, el de la demo sin `demo-` ni el sufijo de una segunda propuesta.
  slug: tenantSlugSchema
    .refine(
      (slug) => !slug.startsWith(DEMO_SLUG_PREFIX),
      'El cliente no lleva el prefijo "demo-": manda el slug definitivo, por ejemplo "pasteleria-luna".',
    )
    .optional(),
  // La persona dueña del negocio: entra al panel como `client`, limitada a este sitio.
  owner: z
    .strictObject({
      name: z.string().trim().min(2, 'El nombre es muy corto').max(120),
      email: z.email('Ingresa un correo válido').max(255),
    })
    .optional(),
});

export type ConvertDemoInput = z.infer<typeof ConvertDemoSchema>;

export const DiscardDemoSchema = z.strictObject({
  reason: z.enum(DEMO_DISCARD_REASONS).optional(),
});

// Un día de calendario en hora de Chile. El siglo acotado evita que un año absurdo arme miles
// de meses vacíos al agrupar por mes.
const metricsDaySchema = z
  .string()
  .regex(
    /^(19|20)\d{2}-\d{2}-\d{2}$/,
    'Usa el formato AAAA-MM-DD, por ejemplo "2026-01-31".',
  )
  .refine(
    (value) => {
      const date = new Date(`${value}T00:00:00.000Z`);
      return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
    },
    { error: 'Esa fecha no existe en el calendario.' },
  );

export const DemoMetricsQuerySchema = z
  .object({
    from: metricsDaySchema.optional(),
    to: metricsDaySchema.optional(),
    groupBy: z.enum(DEMO_METRICS_GROUPINGS).optional(),
  })
  .refine(
    (value) =>
      value.from === undefined || value.to === undefined || value.from <= value.to,
    { error: 'La fecha "from" no puede ser posterior a "to".', path: ['from'] },
  );

export type DemoMetricsQuery = z.infer<typeof DemoMetricsQuerySchema>;
