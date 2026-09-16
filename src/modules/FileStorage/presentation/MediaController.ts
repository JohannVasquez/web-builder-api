import type { Request, Response } from 'express';
import { z } from 'zod';
import type { UploadFileUseCase } from '../application/UploadFileUseCase';
import type { ListMediaUseCase } from '../application/ListMediaUseCase';
import type { DeleteMediaUseCase } from '../application/DeleteMediaUseCase';
import type { DescribeMediaUseCase } from '../application/DescribeMediaUseCase';
import { FileKeySchema } from '../domain/FileKeySchema';
import { MissingFileError } from '../domain/MissingFileError';

const TenantIdSchema = z.coerce.number().int().positive();
const ListQuerySchema = z.object({ search: z.string().max(200).default('') });
const DeleteQuerySchema = z.object({
  force: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
});
const DescribeSchema = z.strictObject({ alt: z.string().max(500) });

export class MediaController {
  constructor(
    private readonly uploadFileUseCase: UploadFileUseCase,
    private readonly listMediaUseCase: ListMediaUseCase,
    private readonly deleteMediaUseCase: DeleteMediaUseCase,
    private readonly describeMediaUseCase: DescribeMediaUseCase,
  ) {}

  public readonly list = async (req: Request, res: Response): Promise<void> => {
    const tenantId = TenantIdSchema.parse(req.params.tenantId);
    const { search } = ListQuerySchema.parse(req.query);
    res.json({ assets: await this.listMediaUseCase.execute(tenantId, search) });
  };

  public readonly upload = async (req: Request, res: Response): Promise<void> => {
    if (req.file === undefined) {
      throw new MissingFileError();
    }
    const tenantId = TenantIdSchema.parse(req.params.tenantId);
    const stored = await this.uploadFileUseCase.execute(
      { buffer: req.file.buffer, mimeType: req.file.mimetype, size: req.file.size },
      tenantId,
      req.file.originalname,
    );
    res.status(201).json({ asset: stored });
  };

  public readonly describe = async (req: Request, res: Response): Promise<void> => {
    const tenantId = TenantIdSchema.parse(req.params.tenantId);
    const key = FileKeySchema.parse(req.params.key);
    const { alt } = DescribeSchema.parse(req.body);
    res.json({ asset: await this.describeMediaUseCase.execute(tenantId, key, alt) });
  };

  public readonly remove = async (req: Request, res: Response): Promise<void> => {
    const tenantId = TenantIdSchema.parse(req.params.tenantId);
    const key = FileKeySchema.parse(req.params.key);
    const { force } = DeleteQuerySchema.parse(req.query);
    res.json(await this.deleteMediaUseCase.execute(tenantId, key, force));
  };
}
