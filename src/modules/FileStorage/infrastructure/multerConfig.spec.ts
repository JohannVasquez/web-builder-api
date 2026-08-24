import express, { type Express } from 'express';
import request from 'supertest';
import { createFileUploadMiddleware } from './multerConfig';
import { ErrorHandler } from '../../../shared/presentation/ErrorHandler';

describe('createFileUploadMiddleware', () => {
  const maxFileSizeBytes = 1024;

  const buildApp = (): Express => {
    const app = express();
    app.post('/upload', createFileUploadMiddleware(maxFileSizeBytes), (req, res) => {
      res.status(200).json({ size: req.file?.size ?? null });
    });
    app.use(new ErrorHandler().handle);
    return app;
  };

  it('parses a file within the limit into req.file (memory storage)', async () => {
    const response = await request(buildApp())
      .post('/upload')
      .attach('file', Buffer.alloc(512), {
        filename: 'small.png',
        contentType: 'image/png',
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ size: 512 });
  });

  it('aborts with 413 when the file exceeds the limit', async () => {
    const response = await request(buildApp())
      .post('/upload')
      .attach('file', Buffer.alloc(maxFileSizeBytes + 1), {
        filename: 'big.png',
        contentType: 'image/png',
      });

    expect(response.status).toBe(413);
    expect(response.body).toMatchObject({ error: 'PayloadTooLarge' });
  });

  it('rejects multipart requests with unexpected file fields as 400', async () => {
    const response = await request(buildApp())
      .post('/upload')
      .attach('otherField', Buffer.alloc(10), {
        filename: 'x.png',
        contentType: 'image/png',
      });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ error: 'BadRequest' });
  });
});
