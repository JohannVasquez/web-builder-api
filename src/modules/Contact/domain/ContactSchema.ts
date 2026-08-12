import { z } from 'zod';

export const ContactSchema = z.strictObject({
  name: z
    .string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre no puede superar los 100 caracteres'),
  email: z.email('Debe ser un correo electrónico válido').max(255),
  phone: z
    .string()
    .regex(/^\+?[\d\s-]{7,20}$/, 'Debe ser un número de teléfono válido')
    .optional(),
  message: z
    .string()
    .min(10, 'El mensaje debe tener al menos 10 caracteres')
    .max(2000, 'El mensaje no puede superar los 2000 caracteres'),
});

export type ContactInput = z.infer<typeof ContactSchema>;
