// Clase abstracta usada como token de inyección de dependencias (diod).
export abstract class CatalogProvider {
  public abstract get(): Promise<unknown>;
}
