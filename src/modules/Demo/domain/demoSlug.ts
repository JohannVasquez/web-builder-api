// El tenant de una demo se llama `demo-<slug>`: el prefijo delata en la dirección que es una
// propuesta y la separa del cliente que será si compra.
export const DEMO_SLUG_PREFIX = 'demo-';

// Más allá de esto es más útil elegir otro nombre que seguir numerando.
export const MAX_SLUG_SUGGESTIONS = 50;

const PROPOSAL_SUFFIX = /^(.{2,})-(\d+)$/;

// Los nombres alternativos que se ofrecen ante un choque: `-2`, `-3`... recortados si hace
// falta, para que la sugerencia pase la misma validación al reenviarla.
export const slugSuggestions = (slug: string, maxLength: number): string[] =>
  Array.from({ length: MAX_SLUG_SUGGESTIONS - 1 }, (_, index) => {
    const suffix = `-${String(index + 2)}`;
    return `${slug.slice(0, maxLength - suffix.length).replace(/-+$/, '')}${suffix}`;
  });

// El slug que tendrá el cliente al convertir: sin `demo-` y sin el `-2`, `-3` que se le puso a
// una segunda propuesta al mismo negocio. Solo se quitan los sufijos que la sugerencia pudo
// haber puesto; si el nombre real termina en número ("taller-24") conviene mandar el slug.
export const definitiveSlugFor = (demoTenantSlug: string): string => {
  const base = demoTenantSlug.startsWith(DEMO_SLUG_PREFIX)
    ? demoTenantSlug.slice(DEMO_SLUG_PREFIX.length)
    : demoTenantSlug;
  const match = PROPOSAL_SUFFIX.exec(base);
  const number = Number(match?.[2]);
  return match !== null && number >= 2 && number <= MAX_SLUG_SUGGESTIONS
    ? (match[1] ?? base)
    : base;
};
