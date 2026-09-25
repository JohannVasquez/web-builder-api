/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
 

import { NotFoundError } from '@/shared/domain/NotFoundError';
import { RegisterSignatureUseCase } from './RegisterSignatureUseCase';
import { SignedDocument } from '../domain/SignedDocument';

describe('RegisterSignatureUseCase', () => {
  const mockRepo = {
    record: jest.fn(),
    findByTenant: jest.fn(),
    findTenantsNotOnVersion: jest.fn(),
  };
  const mockTenantRepo = {
    findById: jest.fn(),
  };
  const mockRecordActivity = { execute: jest.fn(),
  };

  const useCase = new RegisterSignatureUseCase(
    mockRepo,
    mockTenantRepo as any,
    mockRecordActivity as any,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registra una firma correctamente y guarda en el registro de actividad', async () => {
    mockTenantRepo.findById.mockResolvedValue({ id: 'tenant-1' });
    const fakeSignature = new SignedDocument('1', 'tenant-1', 'contrato-de-servicio', 'v1', 'Juan Pérez', new Date());
    mockRepo.record.mockResolvedValue(fakeSignature);
    mockRecordActivity.execute.mockResolvedValue(undefined);

    const result = await useCase.execute(
      'tenant-1',
      'contrato-de-servicio',
      'v1',
      'Juan Pérez',
      'admin-1',
    );

    expect(result).toBe(fakeSignature);

    expect(mockRepo.record).toHaveBeenCalledTimes(1);
    expect(mockRepo.record).toHaveBeenCalledWith('tenant-1', 'contrato-de-servicio', 'v1', 'Juan Pérez');

    expect(mockRecordActivity.execute).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      actorType: 'admin',
      actorId: 'admin-1',
      actorName: 'Admin',
      action: 'created',
      entityType: 'signed_document',
      entityId: '1',
      summary: 'Registró firma de contrato-de-servicio (v1) por Juan Pérez',
      after: { document: 'contrato-de-servicio', version: 'v1', signedBy: 'Juan Pérez' },
    });
  });

  it('lanza error si el cliente no existe', async () => {
    mockTenantRepo.findById.mockResolvedValue(null);

    await expect(
      useCase.execute('tenant-X', 'doc', 'v1', 'Firma', 'admin-1'),
    ).rejects.toThrow(NotFoundError);
  });
});
