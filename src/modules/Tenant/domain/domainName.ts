/**
 * Normaliza el nombre de dominio de una petición antes de buscarlo en la BD.
 * Descarta el puerto (para que `localhost:3000` y `localhost` sean el mismo
 * dominio) y unifica mayúsculas, porque los nombres de dominio no distinguen
 * caso pero la columna de Postgres sí. Devuelve `undefined` si no queda nada
 * utilizable.
 */
export const normalizeDomain = (raw: string | undefined): string | undefined => {
  if (raw === undefined) {
    return undefined;
  }
  const domain = raw.trim().toLowerCase().split(':')[0] ?? '';
  return domain === '' ? undefined : domain;
};
