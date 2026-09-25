import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/shared/infrastructure/prisma/generated/client';
import { PrismaRetentionRepository } from './PrismaRetentionRepository';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL;
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

describe('PrismaRetentionRepository', () => {
  beforeAll(async () => {
    // Limpiar tablas relacionadas para la prueba
    await prisma.contactMessage.deleteMany({});
    await prisma.newsletterSubscriber.deleteMany({});
    await prisma.order.deleteMany({});
    await prisma.tenant.deleteMany({});
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('ejecutarla dos veces seguidas es inocuo (idempotencia)', async () => {
    const tenant = await prisma.tenant.create({
      data: { id: '00000000-0000-0000-0000-000000000001', slug: 'test-retention', status: 'online', name: 'Test' },
    });

    const oldDate = new Date('2000-01-01T00:00:00.000Z');

    await prisma.contactMessage.create({
      data: { tenantId: tenant.id, name: 'A', email: 'a@a.com', message: 'Y', readAt: oldDate, createdAt: oldDate },
    });

    await prisma.newsletterSubscriber.create({
      data: { tenantId: tenant.id, email: 'b@b.com', unsubscribedAt: oldDate, unsubscribeToken: 'dummy-token', createdAt: oldDate },
    });

    await prisma.order.create({
      data: {
        tenantId: tenant.id,
        number: '1',
        status: 'completed',
        totalCents: 100,
        subtotalCents: 100,
        currency: 'CLP',
        customerName: 'Juan',
        customerEmail: 'juan@juan.com',
        customerPhone: '+56900000000',
        customerTaxId: '1-9',
        addressLine: 'Calle 1',
        addressCity: 'Santiago',
        addressRegion: 'RM',
        deliveryMethod: 'pickup',
        shippingCents: 0,
        paymentProvider: 'transfer',
        createdAt: oldDate,
        updatedAt: oldDate,
      },
    });

    const repo = new PrismaRetentionRepository(prisma);
    const cutoffs = {
      contactMessages: new Date(),
      unsubscribedSubscribers: new Date(),
      orders: new Date(),
    };

    const firstRun = await repo.purge(cutoffs);
    expect(firstRun.contactMessagesDeleted).toBe(1);
    expect(firstRun.subscribersDeleted).toBe(1);
    expect(firstRun.ordersAnonymized).toBe(1);

    const secondRun = await repo.purge(cutoffs);
    expect(secondRun.contactMessagesDeleted).toBe(0);
    expect(secondRun.subscribersDeleted).toBe(0);
    expect(secondRun.ordersAnonymized).toBe(0);
  });
});
