import { MarkContactMessageReadUseCase } from './MarkContactMessageReadUseCase';
import type { ContactMessagePrimitives } from '../domain/ContactMessage';
import type { ContactMessageRepository } from '../domain/ContactMessageRepository';
import { NotFoundError } from '@/shared/domain/NotFoundError';

describe('MarkContactMessageReadUseCase', () => {
  const TENANT_ID = '018f6f1a-0000-7000-8000-000000000003';
  const MESSAGE_ID = '018f6f1a-0000-7000-8000-000000000010';

  const buildMessage = (readAt: string | null): ContactMessagePrimitives => ({
    id: MESSAGE_ID,
    tenantId: TENANT_ID,
    name: 'Johann Vasquez',
    email: 'johann@example.com',
    phone: null,
    message: 'Mensaje suficientemente largo.',
    emailedAt: null,
    emailError: null,
    readAt,
    createdAt: new Date().toISOString(),
  });

  const buildRepository = (): jest.Mocked<ContactMessageRepository> => ({
    save: jest.fn(),
    markEmailed: jest.fn(),
    markRead: jest.fn(),
    search: jest.fn(),
  });

  it('marks a message as read', async () => {
    const repository = buildRepository();
    repository.markRead.mockResolvedValue(buildMessage('2024-01-01T00:00:00.000Z'));
    const useCase = new MarkContactMessageReadUseCase(repository);

    const result = await useCase.execute(TENANT_ID, MESSAGE_ID, true);

    expect(repository.markRead).toHaveBeenCalledWith(TENANT_ID, MESSAGE_ID, true);
    expect(result.readAt).toBe('2024-01-01T00:00:00.000Z');
  });

  it('marks a message as unread', async () => {
    const repository = buildRepository();
    repository.markRead.mockResolvedValue(buildMessage(null));
    const useCase = new MarkContactMessageReadUseCase(repository);

    const result = await useCase.execute(TENANT_ID, MESSAGE_ID, false);

    expect(repository.markRead).toHaveBeenCalledWith(TENANT_ID, MESSAGE_ID, false);
    expect(result.readAt).toBeNull();
  });

  it('throws NotFoundError when the message does not belong to the tenant', async () => {
    const repository = buildRepository();
    repository.markRead.mockResolvedValue(null);
    const useCase = new MarkContactMessageReadUseCase(repository);

    await expect(useCase.execute(TENANT_ID, MESSAGE_ID, true)).rejects.toThrow(
      NotFoundError,
    );
  });
});
