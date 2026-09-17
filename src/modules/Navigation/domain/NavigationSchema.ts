import { z } from 'zod';

// Un enlace del menú apunta a una página propia (`/nosotros`), al ancla de una sección
// (`/#contacto`, `/servicios#precios`) o a un sitio externo (`https://...`).
const href = z
  .string()
  .trim()
  .min(1, 'El enlace no puede quedar vacío')
  .max(255)
  .refine(
    (value) => value.startsWith('/') || /^https?:\/\//.test(value),
    'Usa una dirección de tu sitio (empieza con /) o una URL completa',
  );

export const NavigationLinkInputSchema = z.strictObject({
  label: z.string().trim().min(1, 'El texto del enlace no puede quedar vacío').max(100),
  href,
});

// Se reemplaza el menú entero en vez de parchear enlace por enlace: es como funciona
// arrastrar para ordenar, y evita que dos enlaces peleen por la misma posición.
export const NavigationSchema = z.strictObject({
  links: z.array(NavigationLinkInputSchema).max(20),
});

export type NavigationInput = z.infer<typeof NavigationSchema>;
