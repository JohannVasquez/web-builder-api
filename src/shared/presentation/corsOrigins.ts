const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Cada cliente es un origen distinto (`acme.localhost`, `pasteleria.localhost`...), así que
// listarlos uno por uno obliga a tocar la configuración cada vez que nace un cliente. Un `*`
// en el lugar del subdominio acepta cualquiera, pero solo en esa posición y un solo nivel:
// `http://*.localhost:3100` deja pasar `acme.localhost:3100`, no `evil.com/?x.localhost:3100`.
export const buildOriginMatcher = (
  origins: readonly string[],
): ((origin: string) => boolean) => {
  // `*` a secas es "cualquier origen", útil solo en pruebas.
  if (origins.includes('*')) {
    return (): boolean => true;
  }
  const exact = new Set(origins.filter((origin) => !origin.includes('*')));
  const patterns = origins
    .filter((origin) => origin.includes('*'))
    .map(
      (origin) =>
        new RegExp(`^${escapeRegExp(origin).replace('\\*', '[a-z0-9-]+')}$`, 'i'),
    );
  return (origin: string): boolean =>
    exact.has(origin) || patterns.some((pattern) => pattern.test(origin));
};
