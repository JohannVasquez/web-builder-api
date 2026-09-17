import { z } from 'zod';
import { ADMIN_ROLES } from './AdminUser';

const tenantIds = z.array(z.number().int().positive()).max(100).default([]);

export const InviteAdminUserSchema = z
  .strictObject({
    email: z.email('Ingresa un correo válido'),
    name: z.string().trim().min(2, 'El nombre es muy corto').max(120),
    role: z.enum(ADMIN_ROLES),
    // Solo tienen sentido para el rol `client`: es su alcance.
    tenantIds,
  })
  .refine(
    (input) => input.role !== 'client' || input.tenantIds.length > 0,
    'Una persona con rol cliente necesita al menos un cliente asignado',
  );

export const ChangeRoleSchema = z
  .strictObject({ role: z.enum(ADMIN_ROLES), tenantIds })
  .refine(
    (input) => input.role !== 'client' || input.tenantIds.length > 0,
    'Una persona con rol cliente necesita al menos un cliente asignado',
  );

export const SetTenantsSchema = z.strictObject({ tenantIds });
export const SetDisabledSchema = z.strictObject({ disabled: z.boolean() });

export type InviteAdminUserInput = z.infer<typeof InviteAdminUserSchema>;
