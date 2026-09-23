import { GetGlobalSettingsUseCase } from './GetGlobalSettingsUseCase';
import { GlobalSettings } from '../domain/GlobalSettings';
import type { GlobalSettingsRepository } from '../domain/GlobalSettingsRepository';

describe('GetGlobalSettingsUseCase', () => {
  it('returns the settings provided by the repository', async () => {
    const settings = GlobalSettings.fromRecord({
      siteName: 'Web Builder Co.',
      whatsappNumber: '56912345678',
    });
    const repository: jest.Mocked<GlobalSettingsRepository> = {
      find: jest.fn().mockResolvedValue(settings),
    };
    const useCase = new GetGlobalSettingsUseCase(repository);

    const result = await useCase.execute('018f6f1a-0000-7000-8000-000000000001');

    expect(repository.find).toHaveBeenCalledWith('018f6f1a-0000-7000-8000-000000000001');
    expect(result).toBe(settings);
  });

  it('defaults missing keys to empty strings when built from a record', () => {
    const settings = GlobalSettings.fromRecord({ siteName: 'Acme' });

    expect(settings.get('siteName')).toBe('Acme');
    expect(settings.get('whatsappNumber')).toBe('');
    expect(settings.toPrimitives().contactEmail).toBe('');
  });
});
