/**
 * Clase (no interface) para poder registrarse como token resoluble por diod
 * e inyectarse explícitamente en los casos de uso (ver `withDependencies`
 * en la raíz de composición).
 */
export class FileStorageConfig {
  constructor(
    public readonly maxFileSizeBytes: number,
    public readonly imageMaxWidth: number,
  ) {}

  public get maxFileSizeMb(): number {
    return this.maxFileSizeBytes / (1024 * 1024);
  }
}
