import type { Request, Response } from 'express';
import { z } from 'zod';
import type { ListContactMessagesUseCase } from '../application/ListContactMessagesUseCase';
import type { MarkContactMessageReadUseCase } from '../application/MarkContactMessageReadUseCase';

const TenantIdSchema = z.coerce.number().int().positive();
const MessageIdSchema = z.coerce.number().int().positive();

const ListQuerySchema = z.object({
  unreadOnly: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

const MarkReadSchema = z.strictObject({ read: z.boolean() });

export class AdminContactMessageController {
  constructor(
    private readonly listContactMessagesUseCase: ListContactMessagesUseCase,
    private readonly markContactMessageReadUseCase: MarkContactMessageReadUseCase,
  ) {}

  public readonly list = async (req: Request, res: Response): Promise<void> => {
    const tenantId = TenantIdSchema.parse(req.params.tenantId);
    const query = ListQuerySchema.parse(req.query);
    res.json(await this.listContactMessagesUseCase.execute({ tenantId, ...query }));
  };

  public readonly markRead = async (req: Request, res: Response): Promise<void> => {
    const tenantId = TenantIdSchema.parse(req.params.tenantId);
    const id = MessageIdSchema.parse(req.params.messageId);
    const { read } = MarkReadSchema.parse(req.body);
    res.json({
      message: await this.markContactMessageReadUseCase.execute(tenantId, id, read),
    });
  };

  // Exportable a CSV para que el cliente se lleve sus contactos sin pedirlo por correo.
  public readonly exportCsv = async (req: Request, res: Response): Promise<void> => {
    const tenantId = TenantIdSchema.parse(req.params.tenantId);
    const { messages } = await this.listContactMessagesUseCase.execute({
      tenantId,
      unreadOnly: false,
      limit: 200,
      offset: 0,
    });

    const rows = [
      ['fecha', 'nombre', 'correo', 'telefono', 'mensaje', 'leido'],
      ...messages.map((message) => [
        message.createdAt,
        message.name,
        message.email,
        message.phone ?? '',
        message.message,
        message.readAt === null ? 'no' : 'si',
      ]),
    ];

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="mensajes.csv"');
    res.send(rows.map((row) => row.map(escapeCsv).join(',')).join('\n'));
  };
}

// Comillas dobles y separadores dentro del texto rompen el CSV si no se escapan.
const escapeCsv = (value: string): string => `"${value.replaceAll('"', '""')}"`;
