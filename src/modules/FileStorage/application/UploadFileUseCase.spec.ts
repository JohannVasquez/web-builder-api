import { UploadFileUseCase } from './UploadFileUseCase';
import { FileStorageConfig } from '../domain/FileStorageConfig';
import { FileTooLargeError } from '../domain/FileTooLargeError';
import { InvalidFileTypeError } from '../domain/InvalidFileTypeError';
import { StoredFile } from '../domain/StoredFile';
import type { StorageAssetRepository } from '../domain/StorageAssetRepository';
import type { FileData, StorageProvider } from '../domain/StorageProvider';

const UUID_KEY_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.[a-z0-9]+$/;

describe('UploadFileUseCase', () => {
  const config = new FileStorageConfig(5 * 1024 * 1024);

  const buildStorageProvider = (): jest.Mocked<StorageProvider> => ({
    upload: jest
      .fn()
      .mockImplementation((_file: FileData, key: string) => Promise.resolve({ key })),
    delete: jest.fn().mockResolvedValue(undefined),
    getPresignedUrl: jest
      .fn()
      .mockImplementation((key: string) =>
        Promise.resolve(`http://cdn.test/assets/${key}?signed=1`),
      ),
  });

  const buildAssetRepository = (): jest.Mocked<StorageAssetRepository> => ({
    register: jest.fn().mockResolvedValue(undefined),
    remove: jest.fn().mockResolvedValue(undefined),
    findByTenant: jest.fn().mockResolvedValue([]),
    findKey: jest.fn().mockResolvedValue(null),
    updateAlt: jest.fn().mockResolvedValue(null),
    findUsage: jest.fn().mockResolvedValue([]),
  });

  const buildFile = (overrides: Partial<FileData> = {}): FileData => ({
    buffer: Buffer.from('contenido'),
    mimeType: 'image/png',
    size: 1024,
    ...overrides,
  });

  it('uploads the file under a generated uuid key and returns a StoredFile with a presigned url', async () => {
    const storageProvider = buildStorageProvider();
    const assetRepository = buildAssetRepository();
    const useCase = new UploadFileUseCase(storageProvider, assetRepository, config);
    const file = buildFile();

    const stored = await useCase.execute(file);

    expect(storageProvider.upload).toHaveBeenCalledTimes(1);
    const [uploadedFile, key] = storageProvider.upload.mock.calls[0] ?? [];
    expect(uploadedFile).toBe(file);
    expect(key).toMatch(UUID_KEY_PATTERN);
    expect(key).toMatch(/\.png$/);
    expect(storageProvider.getPresignedUrl).toHaveBeenCalledWith(stored.key);
    expect(stored).toBeInstanceOf(StoredFile);
    expect(stored).toEqual(
      new StoredFile(
        stored.key,
        `http://cdn.test/assets/${stored.key}?signed=1`,
        'image/png',
        1024,
      ),
    );
  });

  it('registers the uploaded key in the storage asset repository', async () => {
    const storageProvider = buildStorageProvider();
    const assetRepository = buildAssetRepository();
    const useCase = new UploadFileUseCase(storageProvider, assetRepository, config);

    const stored = await useCase.execute(
      buildFile({ mimeType: 'image/webp', size: 2048 }),
    );

    expect(assetRepository.register).toHaveBeenCalledWith({
      key: stored.key,
      mimeType: 'image/webp',
      size: 2048,
      tenantId: null,
      originalName: null,
    });
  });

  it('asocia el archivo al cliente y conserva su nombre cuando se lo indican', async () => {
    const assetRepository = buildAssetRepository();
    const useCase = new UploadFileUseCase(
      buildStorageProvider(),
      assetRepository,
      config,
    );

    await useCase.execute(
      buildFile({ mimeType: 'image/webp', size: 2048 }),
      9,
      'logo.webp',
    );

    expect(assetRepository.register).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 9, originalName: 'logo.webp' }),
    );
  });

  it('derives the key extension from the mime type, never from the client filename', async () => {
    const storageProvider = buildStorageProvider();
    const useCase = new UploadFileUseCase(
      storageProvider,
      buildAssetRepository(),
      config,
    );

    await useCase.execute(buildFile({ mimeType: 'application/pdf' }));

    const [, key] = storageProvider.upload.mock.calls[0] ?? [];
    expect(key).toMatch(/\.pdf$/);
  });

  it('generates a distinct key for each upload', async () => {
    const storageProvider = buildStorageProvider();
    const useCase = new UploadFileUseCase(
      storageProvider,
      buildAssetRepository(),
      config,
    );

    const first = await useCase.execute(buildFile());
    const second = await useCase.execute(buildFile());

    expect(first.key).not.toBe(second.key);
  });

  it('rejects mime types outside the whitelist without touching the provider', async () => {
    const storageProvider = buildStorageProvider();
    const assetRepository = buildAssetRepository();
    const useCase = new UploadFileUseCase(storageProvider, assetRepository, config);

    await expect(
      useCase.execute(buildFile({ mimeType: 'text/html' })),
    ).rejects.toBeInstanceOf(InvalidFileTypeError);
    expect(storageProvider.upload).not.toHaveBeenCalled();
    expect(assetRepository.register).not.toHaveBeenCalled();
  });

  it('rejects files above the configured size limit without touching the provider', async () => {
    const storageProvider = buildStorageProvider();
    const assetRepository = buildAssetRepository();
    const useCase = new UploadFileUseCase(storageProvider, assetRepository, config);

    await expect(
      useCase.execute(buildFile({ size: config.maxFileSizeBytes + 1 })),
    ).rejects.toBeInstanceOf(FileTooLargeError);
    expect(storageProvider.upload).not.toHaveBeenCalled();
    expect(assetRepository.register).not.toHaveBeenCalled();
  });

  it('propagates errors from the storage provider', async () => {
    const storageProvider = buildStorageProvider();
    storageProvider.upload.mockRejectedValue(new Error('bucket down'));
    const useCase = new UploadFileUseCase(
      storageProvider,
      buildAssetRepository(),
      config,
    );

    await expect(useCase.execute(buildFile())).rejects.toThrow('bucket down');
  });
});
