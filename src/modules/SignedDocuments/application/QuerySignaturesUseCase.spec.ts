/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
 

import { NotFoundError } from '@/shared/domain/NotFoundError';
import { QuerySignaturesUseCase } from './QuerySignaturesUseCase';
import { SignedDocument } from '../domain/SignedDocument';

describe('QuerySignaturesUseCase', () => {
  const mockRepo = {
    record: jest.fn(),
    findByTenant: jest.fn(),
    findTenantsNotOnVersion: jest.fn(),
  };
  const mockTenantRepo = {
    findById: jest.fn(),
  };

  const useCase = new QuerySignaturesUseCase(mockRepo, mockTenantRepo as any);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('forTenant', () => {
    it('devuelve los documentos firmados por un cliente', async () => {
      mockTenantRepo.findById.mockResolvedValue({ id: 'tenant-1' });
      const docs = [
        new SignedDocument('1', 'tenant-1', 'doc1', 'v1', 'Firma1', new Date()),
        new SignedDocument('2', 'tenant-1', 'doc2', 'v2', 'Firma2', new Date()),
      ];
      mockRepo.findByTenant.mockResolvedValue(docs);

      const result = await useCase.forTenant('tenant-1');
      expect(result).toEqual(docs);
      expect(mockRepo.findByTenant).toHaveBeenCalledWith('tenant-1');
    });

    it('lanza error si el cliente no existe', async () => {
      mockTenantRepo.findById.mockResolvedValue(null);
      await expect(useCase.forTenant('tenant-X')).rejects.toThrow(NotFoundError);
    });
  });

  describe('tenantsNotOnVersion', () => {
    it('devuelve los clientes en una versión anterior', async () => {
      mockRepo.findTenantsNotOnVersion.mockResolvedValue(['tenant-1', 'tenant-3']);

      const result = await useCase.tenantsNotOnVersion('contrato-de-servicio', 'v2.0');
      
      expect(result).toEqual(['tenant-1', 'tenant-3']);
      expect(mockRepo.findTenantsNotOnVersion).toHaveBeenCalledWith('contrato-de-servicio', 'v2.0');
    });
  });
});
