import { StorageAssetRepository } from '../domain/StorageAssetRepository';
import { StorageProvider } from '../domain/StorageProvider';

export class DeleteFileUseCase {
  constructor(
    private readonly storageProvider: StorageProvider,
    private readonly storageAssetRepository: StorageAssetRepository,
  ) {}

  /**
   * Idempotente: borrar una key inexistente no es un error (AC3.2); el
   * protocolo S3 ya responde con éxito en ese caso, y `remove` en el
   * repositorio usa `deleteMany` por la misma razón.
   */
  public async execute(key: string): Promise<void> {
    await this.storageProvider.delete(key);
    await this.storageAssetRepository.remove(key);
  }
}
