import { z } from 'zod';
import { idSchema } from '@/shared/domain/identifier';

// También lo usa la creación de demos, que antepone `demo-`.
export const tenantSlugSchema = z
  .string()
  .min(2)
  .max(100)
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    'Usa minúsculas y guiones, por ejemplo "pasteleria-luna"',
  );

const domain = z
  .string()
  .min(3)
  .max(255)
  .regex(/^[a-z0-9.-]+$/, 'Usa un dominio válido, sin protocolo ni puerto');

export const CreateTenantSchema = z.strictObject({
  slug: tenantSlugSchema,
  name: z.string().min(2).max(255),
  // El primero es el canónico. Sin dominios, el cliente existe pero no resuelve tráfico.
  domains: z.array(domain).default([]),
  // Id de un kit por rubro; sin él, el cliente nace vacío.
  templateId: z.string().max(100).optional(),
  // Id de otro cliente a copiar. Excluyente con `templateId`.
  duplicateFromTenantId: idSchema.optional(),
});

export type CreateTenantInput = z.infer<typeof CreateTenantSchema>;

export const CreateTenantRefinedSchema = CreateTenantSchema.refine(
  (value) => value.templateId === undefined || value.duplicateFromTenantId === undefined,
  'Elige una plantilla o un cliente a duplicar, no las dos cosas.',
);
