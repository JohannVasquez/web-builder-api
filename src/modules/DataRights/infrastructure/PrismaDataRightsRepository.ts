import type { PrismaClient } from '@/shared/infrastructure/prisma/generated/client';
import {
  DATA_RIGHTS,
  DataRightsRequest,
  REQUEST_STATUSES,
  type DataRight,
  type RequestStatus,
} from '../domain/DataRightsRequest';
import type {
  DataRightsRepository,
  ErasureResult,
  NewRequest,
  PersonalDataExport,
} from '../domain/DataRightsRepository';

interface RequestRow {
  readonly id: string;
  readonly right: string;
  readonly email: string;
  readonly details: string;
  readonly status: string;
  readonly createdAt: Date;
  readonly verifiedAt: Date | null;
  readonly resolvedAt: Date | null;
}

const toRight = (value: string): DataRight =>
  (DATA_RIGHTS as readonly string[]).includes(value) ? (value as DataRight) : 'acceso';

const toStatus = (value: string): RequestStatus =>
  (REQUEST_STATUSES as readonly string[]).includes(value)
    ? (value as RequestStatus)
    : 'pendiente';

const toDomain = (row: RequestRow): DataRightsRequest =>
  new DataRightsRequest(
    row.id,
    toRight(row.right),
    row.email,
    row.details,
    toStatus(row.status),
    row.createdAt,
    row.verifiedAt,
    row.resolvedAt,
  );

/**
 * Los mismos valores con los que la retención anonimiza un pedido vencido. El pedido no se
 * borra —la normativa tributaria obliga a conservar el respaldo de la venta— pero deja de
 * decir quién compró, que es lo que el titular puede exigir.
 */
const ANONYMIZED = {
  customerName: 'Cliente anonimizado',
  customerEmail: 'anonimizado@invalido.local',
  customerPhone: '',
  customerTaxId: null,
  addressLine: null,
  addressCity: null,
  addressRegion: null,
  addressNotes: null,
};

export class PrismaDataRightsRepository implements DataRightsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  public async create(tenantId: string, request: NewRequest): Promise<DataRightsRequest> {
    const row = await this.prisma.dataRightsRequest.create({
      data: {
        tenantId,
        right: request.right,
        email: request.email.trim().toLowerCase(),
        details: request.details,
        verificationTokenHash: request.verificationTokenHash,
        verificationExpiresAt: request.verificationExpiresAt,
      },
    });
    return toDomain(row);
  }

  public async findVerifiable(
    tokenHash: string,
    now: Date,
  ): Promise<{ tenantId: string; request: DataRightsRequest } | null> {
    const row = await this.prisma.dataRightsRequest.findFirst({
      where: {
        verificationTokenHash: tokenHash,
        verificationExpiresAt: { gt: now },
        status: 'pendiente',
      },
    });
    return row === null ? null : { tenantId: row.tenantId, request: toDomain(row) };
  }

  public async markStatus(id: string, status: RequestStatus, at: Date): Promise<void> {
    await this.prisma.dataRightsRequest.update({
      where: { id },
      data: {
        status,
        ...(status === 'verificada' ? { verifiedAt: at } : {}),
        ...(status === 'resuelta' || status === 'rechazada' ? { resolvedAt: at } : {}),
      },
    });
  }

  public async listByStatus(
    tenantId: string,
    status: RequestStatus | null,
  ): Promise<DataRightsRequest[]> {
    const rows = await this.prisma.dataRightsRequest.findMany({
      where: { tenantId, ...(status === null ? {} : { status }) },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(toDomain);
  }

  public async exportFor(tenantId: string, email: string): Promise<PersonalDataExport> {
    const normalized = email.trim().toLowerCase();

    const [contactMessages, newsletter, orders] = await Promise.all([
      this.prisma.contactMessage.findMany({
        where: { tenantId, email: normalized },
        select: {
          name: true,
          email: true,
          phone: true,
          message: true,
          createdAt: true,
        },
      }),
      this.prisma.newsletterSubscriber.findMany({
        where: { tenantId, email: normalized },
        // El token de baja no va: es una credencial, no un dato del titular.
        select: { email: true, createdAt: true, unsubscribedAt: true },
      }),
      this.prisma.order.findMany({
        where: { tenantId, customerEmail: normalized },
        include: { items: true },
      }),
    ]);

    return {
      email: normalized,
      contactMessages,
      newsletter,
      orders,
      // Los consentimientos se cruzarán por `subject` cuando el módulo esté desplegado; hoy
      // se entrega la lista vacía en vez de omitir el campo, para que el formato no cambie.
      consents: [],
    };
  }

  public async eraseFor(tenantId: string, email: string): Promise<ErasureResult> {
    const normalized = email.trim().toLowerCase();

    const contactMessages = await this.prisma.contactMessage.deleteMany({
      where: { tenantId, email: normalized },
    });
    const subscribers = await this.prisma.newsletterSubscriber.deleteMany({
      where: { tenantId, email: normalized },
    });
    const orders = await this.prisma.order.updateMany({
      where: {
        tenantId,
        customerEmail: normalized,
        customerName: { not: ANONYMIZED.customerName },
      },
      data: ANONYMIZED,
    });

    return {
      contactMessagesDeleted: contactMessages.count,
      subscribersDeleted: subscribers.count,
      ordersAnonymized: orders.count,
    };
  }
}
