import { z } from 'zod';
import { ADMIN_ROLES } from './AdminUser';

export const InviteAdminUserSchema = z.strictObject({
  email: z.email('Ingresa un correo válido'),
  name: z.string().trim().min(2, 'El nombre es muy corto').max(120),
  role: z.enum(ADMIN_ROLES),
});

export const ChangeRoleSchema = z.strictObject({ role: z.enum(ADMIN_ROLES) });
export const SetDisabledSchema = z.strictObject({ disabled: z.boolean() });

export type InviteAdminUserInput = z.infer<typeof InviteAdminUserSchema>;
