/**
 * Puerto para avisarle al frontend que el contenido de un tenant cambió.
 *
 * Los sitios públicos se sirven cacheados (SPEC 0.2); sin este aviso, un
 * cambio hecho desde el panel o desde un agente tardaría hasta que expire
 * la caché en verse publicado. La invalidación es *por dominio*, no global:
 * tocar un cliente no puede vaciar la caché de los demás.
 *
 * Clase abstracta usada como token de inyección de dependencias (diod).
 */
export abstract class SiteCacheInvalidator {
  public abstract invalidate(domains: readonly string[]): Promise<void>;
}
