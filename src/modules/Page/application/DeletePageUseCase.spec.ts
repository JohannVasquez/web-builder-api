import type { PageRepository } from '../domain/PageRepository';
import type { StoreSettingsRepository } from '../../Store/domain/StoreSettingsRepository';
import { DeletePageUseCase } from './DeletePageUseCase';

describe('DeletePageUseCase', () => {
  it('impide borrar la página si es la de términos y la tienda está encendida', async () => {
    const pageRepository = {
      findById: jest.fn().mockResolvedValue({ id: 'page-1', slug: 'terminos' }),
      delete: jest.fn(),
    } as unknown as PageRepository;

    const storeSettingsRepository = {
      find: jest.fn().mockResolvedValue({ isEnabled: true, termsPageSlug: 'terminos' }),
    } as unknown as StoreSettingsRepository;

    const useCase = new DeletePageUseCase(pageRepository, storeSettingsRepository);
    await expect(useCase.execute('tenant-1', 'page-1')).rejects.toThrow('No puedes borrar la página de términos de compra mientras la tienda esté encendida. Apaga la tienda primero.');
  });
});
