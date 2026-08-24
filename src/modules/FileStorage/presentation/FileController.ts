import type { Request, Response } from 'express';
import type { UploadFileUseCase } from '../application/UploadFileUseCase';
import type { DeleteFileUseCase } from '../application/DeleteFileUseCase';
import { FileKeySchema } from '../domain/FileKeySchema';
import { MissingFileError } from '../domain/MissingFileError';
import { FileUploadResponseSchema } from './FileUploadResponseSchema';

export class FileController {
  constructor(
    private readonly uploadFileUseCase: UploadFileUseCase,
    private readonly deleteFileUseCase: DeleteFileUseCase,
  ) {}

  public readonly upload = async (req: Request, res: Response): Promise<void> => {
    if (req.file === undefined) {
      throw new MissingFileError();
    }

    const stored = await this.uploadFileUseCase.execute({
      buffer: req.file.buffer,
      mimeType: req.file.mimetype,
      size: req.file.size,
    });

    const response = FileUploadResponseSchema.parse({
      key: stored.key,
      url: stored.url,
      mimeType: stored.mimeType,
      size: stored.size,
    });
    res.status(201).json(response);
  };

  public readonly remove = async (req: Request, res: Response): Promise<void> => {
    const key = FileKeySchema.parse(req.params.key);
    await this.deleteFileUseCase.execute(key);
    res.status(204).send();
  };
}
