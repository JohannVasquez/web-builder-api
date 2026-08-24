import { randomUUID } from 'node:crypto';
import { MIME_EXTENSIONS, isAllowedMimeType } from '../domain/AllowedMimeTypes';
import { FileStorageConfig } from '../domain/FileStorageConfig';
import { FileTooLargeError } from '../domain/FileTooLargeError';
import { InvalidFileTypeError } from '../domain/InvalidFileTypeError';
import { StorageAssetRepository } from '../domain/StorageAssetRepository';
import { StoredFile } from '../domain/StoredFile';
import { StorageProvider, type FileData } from '../domain/StorageProvider';

export class UploadFileUseCase {
  constructor(
    private readonly storageProvider: StorageProvider,
    private readonly storageAssetRepository: StorageAssetRepository,
    private readonly config: FileStorageConfig,
  ) {}

  public async execute(file: FileData): Promise<StoredFile> {
    if (!isAllowedMimeType(file.mimeType)) {
      throw new InvalidFileTypeError(file.mimeType);
    }
    if (file.size > this.config.maxFileSizeBytes) {
      throw new FileTooLargeError(this.config.maxFileSizeMb);
    }

    const key = `${randomUUID()}${MIME_EXTENSIONS[file.mimeType]}`;
    await this.storageProvider.upload(file, key);
    await this.storageAssetRepository.register({
      key,
      mimeType: file.mimeType,
      size: file.size,
    });

    // La URL devuelta es de vista previa inmediata para quien sube el
    // archivo (ej. el uploader del admin); expira. Lo que se guarda de
    // verdad en `PageSection.props`/`GlobalSetting.value` es la `key`, y
    // cada lectura de página firma su propia URL fresca (ver
    // ResolveImageUrlsUseCase).
    const url = await this.storageProvider.getPresignedUrl(key);

    return new StoredFile(key, url, file.mimeType, file.size);
  }
}
