import type { NewsletterRepository } from '../domain/NewsletterRepository';
import { UnsubscribeFromNewsletterUseCase } from './UnsubscribeFromNewsletterUseCase';

const VALID = 'a'.repeat(64);

interface FakeRepository extends NewsletterRepository {
  readonly unsubscribe: jest.Mock;
}

const buildRepository = (found: boolean): FakeRepository => ({
  subscribe: jest.fn(),
  unsubscribe: jest.fn().mockResolvedValue(found),
  list: jest.fn(),
});

describe('UnsubscribeFromNewsletterUseCase', () => {
  it('da de baja con un token válido', async () => {
    const repository = buildRepository(true);

    await expect(
      new UnsubscribeFromNewsletterUseCase(repository).execute(VALID),
    ).resolves.toBe(true);
  });

  it('un token con forma inválida ni llega a la base', async () => {
    const repository = buildRepository(true);

    await expect(
      new UnsubscribeFromNewsletterUseCase(repository).execute("' OR 1=1 --"),
    ).resolves.toBe(false);
    expect(repository.unsubscribe).not.toHaveBeenCalled();
  });

  it('un token válido que no existe responde falso, sin lanzar', async () => {
    const repository = buildRepository(false);

    await expect(
      new UnsubscribeFromNewsletterUseCase(repository).execute(VALID),
    ).resolves.toBe(false);
  });
});
