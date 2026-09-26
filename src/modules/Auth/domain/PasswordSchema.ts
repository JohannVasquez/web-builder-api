import { z } from 'zod';

// Largo antes que complejidad: una frase de 10+ caracteres resiste más que
// "Abc1!" y la gente la recuerda sin anotarla en un post-it.
export const PasswordSchema = z
  .string()
  .min(10, 'La contraseña debe tener al menos 10 caracteres')
  .max(200);

export const ForgotPasswordSchema = z.strictObject({
  email: z.email('Ingresa un correo válido'),
});

export const ResetPasswordSchema = z.strictObject({
  token: z.string().min(1),
  password: PasswordSchema,
});

export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;
