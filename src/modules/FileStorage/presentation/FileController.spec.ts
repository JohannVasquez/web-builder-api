import express, { type Express } from 'express';
import multer from 'multer';
import request from 'supertest';
import { FileController } from './FileController';
import { createFileRouter } from './fileRouter';
import { UploadFileUseCase } from '../application/UploadFileUseCase';
import { DeleteFileUseCase } from '../application/DeleteFileUseCase';
import { FileStorageConfig } from '../domain/FileStorageConfig';
import type { StorageAssetRepository } from '../domain/StorageAssetRepository';
import type { FileData, StorageProvider } from '../domain/StorageProvider';
import { ErrorHandler } from '@/shared/presentation/ErrorHandler';

describe('FileController (HTTP)', () => {
  const maxFileSizeBytes = 1024;

  const buildStorageProvider = (): jest.Mocked<StorageProvider> => ({
    upload: jest
      .fn()
      .mockImplementation((_file: FileData, key: string) => Promise.resolve({ key })),
    delete: jest.fn().mockResolvedValue(undefined),
    getPresignedUrl: jest
      .fn()
      .mockImplementation((key: string) =>
        Promise.resolve(`http://cdn.test/assets/${key}`),
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

  const buildApp = (storageProvider: StorageProvider): Express => {
    const app = express();
    const controller = new FileController(
      new UploadFileUseCase(
        storageProvider,
        buildAssetRepository(),
        new FileStorageConfig(maxFileSizeBytes),
      ),
      new DeleteFileUseCase(storageProvider, buildAssetRepository()),
    );
    // Multipart en memoria equivalente al de infrastructure/multerConfig; el
    // límite de tamaño de esta suite lo aplica el use case (defensa en
    // profundidad), y el corte temprano de multer se prueba en su propio spec.
    const parseSingleFile = multer({ storage: multer.memoryStorage() }).single('file');
    app.use('/api/files', createFileRouter(controller, parseSingleFile));
    app.use(new ErrorHandler().handle);
    return app;
  };

  it('returns 201 with { key, url, mimeType, size } for a valid upload', async () => {
    const storageProvider = buildStorageProvider();
    const app = buildApp(storageProvider);

    const response = await request(app)
      .post('/api/files')
      .attach('file', Buffer.from('fake-png'), {
        filename: '@/modules/etc/passwd.png',
        contentType: 'image/png',
      });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      key: expect.stringMatching(/^[0-9a-f-]{36}\.png$/) as string,
      url: expect.stringContaining('http://cdn.test/assets/') as string,
      mimeType: 'image/png',
      size: 8,
    });
    expect(storageProvider.upload).toHaveBeenCalledTimes(1);
  });

  it('returns 400 for a mime type outside the whitelist', async () => {
    const storageProvider = buildStorageProvider();
    const app = buildApp(storageProvider);

    const response = await request(app)
      .post('/api/files')
      .attach('file', Buffer.from('<script>'), {
        filename: 'evil.html',
        contentType: 'text/html',
      });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ error: 'BadRequest' });
    expect(storageProvider.upload).not.toHaveBeenCalled();
  });

  it('returns 413 when the file exceeds the configured size limit', async () => {
    const storageProvider = buildStorageProvider();
    const app = buildApp(storageProvider);

    const response = await request(app)
      .post('/api/files')
      .attach('file', Buffer.alloc(maxFileSizeBytes + 1), {
        filename: 'big.png',
        contentType: 'image/png',
      });

    expect(response.status).toBe(413);
    expect(response.body).toMatchObject({ error: 'PayloadTooLarge' });
    expect(storageProvider.upload).not.toHaveBeenCalled();
  });

  it('returns 400 when the "file" field is missing', async () => {
    const storageProvider = buildStorageProvider();
    const app = buildApp(storageProvider);

    const response = await request(app).post('/api/files');

    expect(response.status).toBe(400);
    expect(storageProvider.upload).not.toHaveBeenCalled();
  });

  it('returns 204 on delete, even for keys that no longer exist (idempotent)', async () => {
    const storageProvider = buildStorageProvider();
    const app = buildApp(storageProvider);
    const key = '5f0c2f5e-0000-4000-8000-000000000000.png';

    const response = await request(app).delete(`/api/files/${key}`);

    expect(response.status).toBe(204);
    expect(storageProvider.delete).toHaveBeenCalledWith(key);
  });

  it('returns 400 for a key that does not match the generated format', async () => {
    const storageProvider = buildStorageProvider();
    const app = buildApp(storageProvider);

    const response = await request(app).delete('/api/files/not-a-uuid.png');

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ error: 'ValidationError' });
    expect(storageProvider.delete).not.toHaveBeenCalled();
  });
});
