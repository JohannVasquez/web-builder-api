import { GeneratePreviewLinkUseCase } from './GeneratePreviewLinkUseCase';
import { RevokePreviewLinkUseCase } from './RevokePreviewLinkUseCase';
import { ValidatePreviewTokenUseCase } from './ValidatePreviewTokenUseCase';
import type { PreviewLinkRepository } from '../domain/PreviewLinkRepository';
import { PreviewLink } from '../domain/PreviewLink';
import { hashPreviewToken } from '../domain/previewToken';
import {
  PreviewLinkExpiredError,
  PreviewLinkNotFoundError,
  PreviewLinkRevokedError,
} from '../domain/errors';

describe('PreviewLink UseCases', () => {
  const TENANT_ID = 'tenant-123';
  const LINK_ID = 'link-456';

  let repository: jest.Mocked<PreviewLinkRepository>;

  beforeEach(() => {
    repository = {
      create: jest.fn(),
      findByTokenHash: jest.fn(),
      revoke: jest.fn(),
      findById: jest.fn(),
    };
  });

  describe('GeneratePreviewLinkUseCase', () => {
    it('creates a link and returns the token in clear text once', async () => {
      const expiresAt = new Date();
      repository.create.mockResolvedValue(
        new PreviewLink(LINK_ID, TENANT_ID, expiresAt, null, new Date()),
      );

      const useCase = new GeneratePreviewLinkUseCase(repository);
      const result = await useCase.execute(TENANT_ID, {});

      expect(result.id).toBe(LINK_ID);
      expect(result.token.startsWith('prev_')).toBe(true);
      expect(repository.create).toHaveBeenCalledWith(
        TENANT_ID,
        hashPreviewToken(result.token),
        expect.any(Date),
      );
    });
  });

  describe('RevokePreviewLinkUseCase', () => {
    it('revokes an existing link', async () => {
      repository.findById.mockResolvedValue(
        new PreviewLink(LINK_ID, TENANT_ID, new Date(), null, new Date()),
      );

      const useCase = new RevokePreviewLinkUseCase(repository);
      await useCase.execute(TENANT_ID, LINK_ID);

      expect(repository.revoke).toHaveBeenCalledWith(LINK_ID);
    });

    it('throws when the link does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      const useCase = new RevokePreviewLinkUseCase(repository);
      await expect(useCase.execute(TENANT_ID, LINK_ID)).rejects.toThrow(
        PreviewLinkNotFoundError,
      );
    });
  });

  describe('ValidatePreviewTokenUseCase', () => {
    const validLink = new PreviewLink(
      LINK_ID,
      TENANT_ID,
      new Date(Date.now() + 10000), // future
      null,
      new Date(),
    );

    const revokedLink = new PreviewLink(
      LINK_ID,
      TENANT_ID,
      new Date(Date.now() + 10000),
      new Date(), // revoked
      new Date(),
    );

    const expiredLink = new PreviewLink(
      LINK_ID,
      TENANT_ID,
      new Date(Date.now() - 10000), // past
      null,
      new Date(),
    );

    it('returns the tenant ID for a valid token', async () => {
      repository.findByTokenHash.mockResolvedValue(validLink);
      const useCase = new ValidatePreviewTokenUseCase(repository);

      const result = await useCase.execute('prev_xyz');
      expect(result.tenantId).toBe(TENANT_ID);
    });

    it('throws when the token format is invalid', async () => {
      const useCase = new ValidatePreviewTokenUseCase(repository);
      await expect(useCase.execute('invalid_token')).rejects.toThrow(
        PreviewLinkNotFoundError,
      );
    });

    it('throws when the token does not exist', async () => {
      repository.findByTokenHash.mockResolvedValue(null);
      const useCase = new ValidatePreviewTokenUseCase(repository);
      await expect(useCase.execute('prev_xyz')).rejects.toThrow(
        PreviewLinkNotFoundError,
      );
    });

    it('throws when the link is revoked', async () => {
      repository.findByTokenHash.mockResolvedValue(revokedLink);
      const useCase = new ValidatePreviewTokenUseCase(repository);
      await expect(useCase.execute('prev_xyz')).rejects.toThrow(
        PreviewLinkRevokedError,
      );
    });

    it('throws when the link is expired', async () => {
      repository.findByTokenHash.mockResolvedValue(expiredLink);
      const useCase = new ValidatePreviewTokenUseCase(repository);
      await expect(useCase.execute('prev_xyz')).rejects.toThrow(
        PreviewLinkExpiredError,
      );
    });
  });
});
