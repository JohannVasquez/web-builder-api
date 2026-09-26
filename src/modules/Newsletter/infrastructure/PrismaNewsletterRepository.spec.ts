import { PrismaNewsletterRepository } from './PrismaNewsletterRepository';
import type { PrismaClient } from '@/shared/infrastructure/prisma/generated/client';

describe('PrismaNewsletterRepository', () => {
  const buildPrisma = (): {
    prisma: PrismaClient;
    upsert: jest.Mock;
  } => {
    const upsert = jest.fn().mockResolvedValue({});
    return {
      prisma: { newsletterSubscriber: { upsert } } as unknown as PrismaClient,
      upsert,
    };
  };

  it('normaliza el correo, para que dos mayúsculas no creen dos suscriptores', async () => {
    const { prisma, upsert } = buildPrisma();

    await new PrismaNewsletterRepository(prisma).subscribe(
      '018f6f1a-0000-7000-8000-000000000001',
      '  Ana@Ejemplo.CL ',
    );

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          tenantId_email: {
            tenantId: '018f6f1a-0000-7000-8000-000000000001',
            email: 'ana@ejemplo.cl',
          },
        },
      }),
    );
  });

  it('volver a suscribirse reactiva una baja previa', async () => {
    const { prisma, upsert } = buildPrisma();

    await new PrismaNewsletterRepository(prisma).subscribe(
      '018f6f1a-0000-7000-8000-000000000001',
      'ana@ejemplo.cl',
    );

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ update: { unsubscribedAt: null } }),
    );
  });
});
