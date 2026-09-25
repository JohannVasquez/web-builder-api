import { EncryptPaymentCredentialsUseCase } from './EncryptPaymentCredentialsUseCase';
import type { PrismaClient } from '@/shared/infrastructure/prisma/generated/client';
import { SecretBox } from '@/shared/infrastructure/crypto/SecretBox';

describe('EncryptPaymentCredentialsUseCase', () => {
  it('cifra las credenciales en claro y salta las ya cifradas o vacías', async () => {
    // Generamos una SecretBox de prueba
    const secrets = SecretBox.fromEnv(Buffer.alloc(32, 'a').toString('base64'));

    const rows = [
      { tenantId: '1', paymentCredentials: { apiKey: 'secret' } },
      { tenantId: '2', paymentCredentials: {} },
      { tenantId: '3', paymentCredentials: { enc: 'v1:algo' } },
    ];

    const prisma = {
      storeSettings: {
        findMany: jest.fn().mockResolvedValue(rows),
        update: jest.fn().mockResolvedValue({}),
      },
    } as unknown as PrismaClient;

    const useCase = new EncryptPaymentCredentialsUseCase(prisma, secrets);
    const result = await useCase.execute();

    expect(result.encrypted).toBe(1);
    expect(result.skipped).toBe(2);

    expect(prisma.storeSettings.update).toHaveBeenCalledTimes(1);
    expect(prisma.storeSettings.update).toHaveBeenCalledWith({
      where: { tenantId: '1' },
      data: {
        paymentCredentials: {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          enc: expect.stringMatching(/^v1:/),
        },
      },
    });
  });
});
