import { DEFAULT_RETENTION } from '../domain/RetentionPolicy';
import type {
  RetentionCutoffs,
  RetentionRepository,
  RetentionRun,
} from '../domain/RetentionRepository';
import { PurgeExpiredDataUseCase } from './PurgeExpiredDataUseCase';

const NOW = new Date('2026-09-22T12:00:00.000Z');

const EMPTY_RUN: RetentionRun = {
  contactMessagesDeleted: 0,
  subscribersDeleted: 0,
  ordersAnonymized: 0,
};

interface FakeRepository extends RetentionRepository {
  readonly cutoffs: RetentionCutoffs[];
}

const buildRepository = (): FakeRepository => {
  const cutoffs: RetentionCutoffs[] = [];
  return {
    cutoffs,
    purge: (received: RetentionCutoffs): Promise<RetentionRun> => {
      cutoffs.push(received);
      return Promise.resolve(EMPTY_RUN);
    },
  };
};

const daysBefore = (date: Date): number =>
  Math.round((NOW.getTime() - date.getTime()) / (24 * 60 * 60 * 1000));

describe('PurgeExpiredDataUseCase', () => {
  it('pide borrar lo anterior al plazo de cada tipo de dato', async () => {
    const repository = buildRepository();

    await new PurgeExpiredDataUseCase(repository).execute(NOW);

    const [cutoffs] = repository.cutoffs;
    expect(daysBefore(cutoffs.contactMessages)).toBe(
      DEFAULT_RETENTION.contactMessageDays,
    );
    expect(daysBefore(cutoffs.orders)).toBe(DEFAULT_RETENTION.orderDays);
  });

  it('respeta el plazo que configuró el cliente', async () => {
    const repository = buildRepository();

    await new PurgeExpiredDataUseCase(repository, { contactMessageDays: 90 }).execute(
      NOW,
    );

    expect(daysBefore(repository.cutoffs[0].contactMessages)).toBe(90);
  });

  it('un plazo de pedidos por debajo del mínimo tributario no se obedece', async () => {
    const repository = buildRepository();

    await new PurgeExpiredDataUseCase(repository, { orderDays: 10 }).execute(NOW);

    expect(daysBefore(repository.cutoffs[0].orders)).toBe(DEFAULT_RETENTION.orderDays);
  });

  it('ejecutarlo dos veces pide lo mismo: es seguro correrlo a mano', async () => {
    const repository = buildRepository();
    const useCase = new PurgeExpiredDataUseCase(repository);

    await useCase.execute(NOW);
    await useCase.execute(NOW);

    expect(repository.cutoffs[0]).toEqual(repository.cutoffs[1]);
  });
});
