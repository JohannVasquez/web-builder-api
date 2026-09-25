import { randomUUID } from 'node:crypto';
import { MIME_EXTENSIONS, isAllowedMimeType } from '../domain/AllowedMimeTypes';
import { FileStorageConfig } from '../domain/FileStorageConfig';
import { FileTooLargeError } from '../domain/FileTooLargeError';
import { InvalidFileTypeError } from '../domain/InvalidFileTypeError';
import { StorageAssetRepository } from '../domain/StorageAssetRepository';
import { StoredFile } from '../domain/StoredFile';
import { StorageProvider, type FileData } from '../domain/StorageProvider';

import sharp from 'sharp';

const HARD_MEMORY_LIMIT_BYTES = 50 * 1024 * 1024; // Tope duro antes de optimizar para evitar agotar la RAM de Node con un archivo malicioso gigante.

export class UploadFileUseCase {
  constructor(
    private readonly storageProvider: StorageProvider,
    private readonly storageAssetRepository: StorageAssetRepository,
    private readonly config: FileStorageConfig,
  ) {}

  public async execute(
    file: FileData,
    tenantId: string | null = null,
    originalName: string | null = null,
  ): Promise<StoredFile> {
    if (!isAllowedMimeType(file.mimeType)) {
      throw new InvalidFileTypeError(file.mimeType);
    }

    if (file.size > HARD_MEMORY_LIMIT_BYTES) {
      throw new FileTooLargeError(HARD_MEMORY_LIMIT_BYTES / (1024 * 1024));
    }

    let processableFile = file;

    if (file.mimeType.startsWith('image/') && file.mimeType !== 'image/svg+xml') {
      // `smartSubsample` evita el sangrado de color en texto fino o logos sobre fondos de contraste.
      const optimizedBuffer = await sharp(file.buffer)
        .resize({ width: this.config.imageMaxWidth, withoutEnlargement: true })
        .webp({ quality: 85, smartSubsample: true })
        .toBuffer();

      processableFile = {
        buffer: optimizedBuffer,
        mimeType: 'image/webp',
        size: optimizedBuffer.length,
      };
    }

    if (processableFile.size > this.config.maxFileSizeBytes) {
      throw new FileTooLargeError(this.config.maxFileSizeMb, processableFile.size);
    }

    const key = `${randomUUID()}${MIME_EXTENSIONS[processableFile.mimeType as keyof typeof MIME_EXTENSIONS]}`;
    await this.storageProvider.upload(processableFile, key);
    await this.storageAssetRepository.register({
      key,
      mimeType: processableFile.mimeType,
      size: processableFile.size,
      tenantId,
      originalName,
    });

    // La URL devuelta es de vista previa inmediata para quien sube el
    // archivo (ej. el uploader del admin); expira. Lo que se guarda de
    // verdad en `PageSection.props`/`GlobalSetting.value` es la `key`, y
    // cada lectura de página firma su propia URL fresca (ver
    // ResolveImageUrlsUseCase).
    const url = await this.storageProvider.getPresignedUrl(key);

    return new StoredFile(key, url, processableFile.mimeType, processableFile.size);
  }
}
