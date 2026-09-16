import { PrismaNewsletterRepository } from './PrismaNewsletterRepository';
import type { PrismaClient } from '../../../shared/infrastructure/prisma/generated/client';

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

    await new PrismaNewsletterRepository(prisma).subscribe(1, '  Ana@Ejemplo.CL ');

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId_email: { tenantId: 1, email: 'ana@ejemplo.cl' } },
      }),
    );
  });

  it('volver a suscribirse reactiva una baja previa', async () => {
    const { prisma, upsert } = buildPrisma();

    await new PrismaNewsletterRepository(prisma).subscribe(1, 'ana@ejemplo.cl');

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ update: { unsubscribedAt: null } }),
    );
  });
});
