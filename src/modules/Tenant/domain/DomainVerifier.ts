// Clase abstracta usada como token de inyección de dependencias (diod).
export abstract class DomainVerifier {
  // El token que el cliente tiene que publicar en su DNS. Deriva del id del cliente y de
  // un secreto: no se puede adivinar ni reusar en otro cliente, y no ocupa una columna.
  public abstract tokenFor(tenantId: number): string;
  public abstract isPublished(domain: string, token: string): Promise<boolean>;
}
