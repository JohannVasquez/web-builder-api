import { RecordActivityUseCase } from './RecordActivityUseCase';
import { ActivityLogRepository } from '../domain/ActivityLogRepository';
import type { ActivityEntryInput } from '../domain/ActivityEntry';

describe('RecordActivityUseCase', () => {
  const buildEntry = (): ActivityEntryInput => ({
    tenantId: '018f6f1a-0000-7000-8000-000000000003',
    actorType: 'admin',
    actorId: '018f6f1a-0000-7000-8000-000000000001',
    actorName: 'Admin',
    action: 'page.update',
    entityType: 'page',
    entityId: '5',
    summary:
      'PATCH /api/admin/tenants/018f6f1a-0000-7000-8000-000000000003/pages/018f6f1a-0000-7000-8000-000000000005',
  });

  const buildRepository = (): jest.Mocked<ActivityLogRepository> => ({
    record: jest.fn().mockResolvedValue(undefined),
    search: jest.fn(),
  });

  it('records the entry', async () => {
    const repository = buildRepository();
    const useCase = new RecordActivityUseCase(repository);
    const entry = buildEntry();

    await useCase.execute(entry);

    expect(repository.record).toHaveBeenCalledWith(entry);
  });

  it('swallows the error instead of propagating it when the repository throws', async () => {
    const repository = buildRepository();
    repository.record.mockRejectedValue(new Error('db down'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const useCase = new RecordActivityUseCase(repository);

    await expect(useCase.execute(buildEntry())).resolves.toBeUndefined();

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
