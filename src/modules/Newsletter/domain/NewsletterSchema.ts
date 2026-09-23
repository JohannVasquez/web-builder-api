import { z } from 'zod';

export const SubscribeSchema = z.strictObject({
  email: z.email('Debe ser un correo electrónico válido').max(255),
  // Trampa para bots, igual que en el formulario de contacto.
  website: z.string().max(0, 'Envío rechazado').optional(),
});

export type SubscribeInput = z.infer<typeof SubscribeSchema>;

export interface NewsletterSubscriber {
  readonly id: string;
  readonly email: string;
  readonly unsubscribedAt: string | null;
  readonly createdAt: string;
}
