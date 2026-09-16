import { RecordPageVersionUseCase } from './RecordPageVersionUseCase';
import { Page } from '../domain/Page';
import type { PageVersionRepository } from '../domain/PageVersionRepository';

describe('RecordPageVersionUseCase', () => {
  const actor = { type: 'admin' as const, id: 1, name: 'Admin' };
  const page = new Page('home', 'Inicio', null, [], 5, true);

  it('guarda la foto con el resumen y el actor', async () => {
    const repository = {
      record: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<PageVersionRepository>;

    await new RecordPageVersionUseCase(repository).execute(
      page,
      'Editó un bloque',
      actor,
    );

    expect(repository.record).toHaveBeenCalledWith(
      5,
      expect.objectContaining({ title: 'Inicio' }),
      'Editó un bloque',
      actor,
    );
  });

  it('si falla el historial, la edición que lo originó no falla', async () => {
    const error = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const repository = {
      record: jest.fn().mockRejectedValue(new Error('base caída')),
    } as unknown as jest.Mocked<PageVersionRepository>;

    await expect(
      new RecordPageVersionUseCase(repository).execute(page, 'Editó', actor),
    ).resolves.toBeUndefined();
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });

  it('una página sin id no se registra en vez de reventar', async () => {
    const repository = {
      record: jest.fn(),
    } as unknown as jest.Mocked<PageVersionRepository>;

    await new RecordPageVersionUseCase(repository).execute(
      new Page('home', 'Inicio', null, []),
      'Editó',
      actor,
    );

    expect(repository.record).not.toHaveBeenCalled();
  });
});
