import type { PageRepository } from '../domain/PageRepository';
import type { StoreSettingsRepository } from '../../Store/domain/StoreSettingsRepository';
import type { RecordSlugChangeUseCase } from '../../Redirect/application/RecordSlugChangeUseCase';
import { UpdatePageUseCase } from './UpdatePageUseCase';

describe('UpdatePageUseCase', () => {
  it('impide despublicar la página si es la de términos y la tienda está encendida', async () => {
    const pageRepository = {
      findById: jest.fn().mockResolvedValue({ id: 'page-1', slug: 'terminos' }),
      update: jest.fn(),
    } as unknown as PageRepository;

    const slugChanges = { execute: jest.fn() } as unknown as RecordSlugChangeUseCase;

    const storeSettingsRepository = {
      find: jest.fn().mockResolvedValue({ isEnabled: true, termsPageSlug: 'terminos' }),
    } as unknown as StoreSettingsRepository;

    const useCase = new UpdatePageUseCase(pageRepository, slugChanges, storeSettingsRepository);
    await expect(useCase.execute('tenant-1', 'page-1', { isPublished: false })).rejects.toThrow('No puedes despublicar o cambiar el enlace de la página de términos de compra');
  });
});
