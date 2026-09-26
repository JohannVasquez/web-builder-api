// Avisa al frontend que el contenido de unos dominios cambió; por dominio, nunca global.
// Clase abstracta usada como token de inyección de dependencias (diod).
export abstract class SiteCacheInvalidator {
  public abstract invalidate(domains: readonly string[]): Promise<void>;
}
