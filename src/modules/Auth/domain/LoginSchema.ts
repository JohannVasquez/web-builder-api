import { z } from 'zod';

export const LoginSchema = z.strictObject({
  email: z.email(),
  password: z.string().min(1),
});

export type LoginInput = z.infer<typeof LoginSchema>;
