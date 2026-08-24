import { GetNavigationUseCase } from './GetNavigationUseCase';
import { NavigationLink } from '../domain/NavigationLink';
import type { NavigationRepository } from '../domain/NavigationRepository';

describe('GetNavigationUseCase', () => {
  it('returns the links ordered by position', async () => {
    const repository: jest.Mocked<NavigationRepository> = {
      findAll: jest
        .fn()
        .mockResolvedValue([
          new NavigationLink('Contacto', '/contacto', 3),
          new NavigationLink('Inicio', '/', 1),
          new NavigationLink('Nosotros', '/nosotros', 2),
        ]),
    };
    const useCase = new GetNavigationUseCase(repository);

    const links = await useCase.execute(1);

    expect(repository.findAll).toHaveBeenCalledWith(1);
    expect(links.map((link) => link.label)).toEqual(['Inicio', 'Nosotros', 'Contacto']);
  });

  it('returns an empty list when there are no links', async () => {
    const repository: jest.Mocked<NavigationRepository> = {
      findAll: jest.fn().mockResolvedValue([]),
    };
    const useCase = new GetNavigationUseCase(repository);

    await expect(useCase.execute(1)).resolves.toEqual([]);
  });

  it('serializes links exposing only label and href', () => {
    const link = new NavigationLink('Servicios', '/#servicios', 2);

    expect(link.toPrimitives()).toEqual({ label: 'Servicios', href: '/#servicios' });
  });
});
