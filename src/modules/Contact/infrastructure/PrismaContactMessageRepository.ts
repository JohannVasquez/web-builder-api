import type { PrismaClient } from '@/shared/infrastructure/prisma/generated/client';
import type {
  ContactMessagePrimitives,
  ContactMessageQuery,
} from '../domain/ContactMessage';
import type { ContactMessageRepository } from '../domain/ContactMessageRepository';
import type { ContactRequest } from '../domain/ContactRequest';

interface ContactMessageRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly name: string;
  readonly email: string;
  readonly phone: string | null;
  readonly message: string;
  readonly emailedAt: Date | null;
  readonly emailError: string | null;
  readonly readAt: Date | null;
  readonly createdAt: Date;
}

export class PrismaContactMessageRepository implements ContactMessageRepository {
  constructor(private readonly prisma: PrismaClient) {}

  public async save(
    tenantId: string,
    request: ContactRequest,
  ): Promise<ContactMessagePrimitives> {
    const record = await this.prisma.contactMessage.create({
      data: {
        tenantId,
        name: request.name,
        email: request.email,
        phone: request.phone ?? null,
        message: request.message,
      },
    });
    return this.toPrimitives(record);
  }

  public async markEmailed(id: string, error: string | null): Promise<void> {
    await this.prisma.contactMessage.update({
      where: { id },
      data: { emailedAt: error === null ? new Date() : null, emailError: error },
    });
  }

  public async markRead(
    tenantId: string,
    id: string,
    read: boolean,
  ): Promise<ContactMessagePrimitives | null> {
    const existing = await this.prisma.contactMessage.findFirst({
      where: { id, tenantId },
    });
    if (existing === null) {
      return null;
    }
    const record = await this.prisma.contactMessage.update({
      where: { id },
      data: { readAt: read ? new Date() : null },
    });
    return this.toPrimitives(record);
  }

  public async search(
    query: ContactMessageQuery,
  ): Promise<{ messages: ContactMessagePrimitives[]; total: number }> {
    const where = {
      tenantId: query.tenantId,
      ...(query.unreadOnly ? { readAt: null } : {}),
    };
    const [records, total] = await Promise.all([
      this.prisma.contactMessage.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: query.limit,
        skip: query.offset,
      }),
      this.prisma.contactMessage.count({ where }),
    ]);
    return { messages: records.map((record) => this.toPrimitives(record)), total };
  }

  private toPrimitives(record: ContactMessageRecord): ContactMessagePrimitives {
    return {
      id: record.id,
      tenantId: record.tenantId,
      name: record.name,
      email: record.email,
      phone: record.phone,
      message: record.message,
      emailedAt: record.emailedAt?.toISOString() ?? null,
      emailError: record.emailError,
      readAt: record.readAt?.toISOString() ?? null,
      createdAt: record.createdAt.toISOString(),
    };
  }
}
