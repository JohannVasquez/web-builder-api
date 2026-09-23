import { BadRequestError } from '@/shared/domain/BadRequestError';
import { Redirect, type RedirectStatusCode } from '../domain/Redirect';
import type { RedirectRepository } from '../domain/RedirectRepository';
import { ManageRedirectsUseCase } from './ManageRedirectsUseCase';

const TENANT = '018f6f1a-0000-7000-8000-000000000001';

interface FakeRepository extends RedirectRepository {
  readonly rows: Map<string, Redirect>;
}

const buildRepository = (initial: [string, string][] = []): FakeRepository => {
  const rows = new Map<string, Redirect>(
    initial.map(([from, to]) => [
      from,
      new Redirect(from, from, to, 301, new Date('2026-01-01T00:00:00.000Z')),
    ]),
  );

  return {
    rows,
    listByTenant: (): Promise<Redirect[]> => Promise.resolve([...rows.values()]),
    findByFrom: (_tenantId: string, fromPath: string): Promise<Redirect | null> =>
      Promise.resolve(rows.get(fromPath) ?? null),
    upsert: (
      _tenantId: string,
      fromPath: string,
      toPath: string,
      statusCode: RedirectStatusCode,
    ): Promise<Redirect> => {
      const saved = new Redirect(fromPath, fromPath, toPath, statusCode, new Date());
      rows.set(fromPath, saved);
      return Promise.resolve(saved);
    },
    delete: (_tenantId: string, id: string): Promise<void> => {
      rows.delete(id);
      return Promise.resolve();
    },
  };
};

const input = (
  fromPath: string,
  toPath: string,
): Parameters<ManageRedirectsUseCase['save']>[1] => ({
  fromPath,
  toPath,
  statusCode: 301,
});

describe('guardar una redirección', () => {
  it('guarda el par tal cual cuando no hay nada más', async () => {
    const repository = buildRepository();

    const saved = await new ManageRedirectsUseCase(repository).save(
      TENANT,
      input('/viejo', '/nuevo'),
    );

    expect(saved.toPath).toBe('/nuevo');
  });

  it('salta el intermedio si el destino ya redirige', async () => {
    // B→C existe; guardar A→B tiene que quedar como A→C.
    const repository = buildRepository([['/b', '/c']]);

    const saved = await new ManageRedirectsUseCase(repository).save(
      TENANT,
      input('/a', '/b'),
    );

    expect(saved.toPath).toBe('/c');
  });

  it('reapunta lo que llegaba al origen viejo', async () => {
    // A→B existe; ahora B pasa a C, así que A tiene que quedar apuntando a C.
    const repository = buildRepository([['/a', '/b']]);

    await new ManageRedirectsUseCase(repository).save(TENANT, input('/b', '/c'));

    expect(repository.rows.get('/a')?.toPath).toBe('/c');
  });

  it('rechaza un círculo en vez de dejar al visitante rebotando', async () => {
    const repository = buildRepository([['/b', '/a']]);

    await expect(
      new ManageRedirectsUseCase(repository).save(TENANT, input('/a', '/b')),
    ).rejects.toThrow(BadRequestError);
  });

  it('repetir el mismo origen actualiza el destino en vez de duplicar', async () => {
    const repository = buildRepository();
    const useCase = new ManageRedirectsUseCase(repository);

    await useCase.save(TENANT, input('/viejo', '/uno'));
    await useCase.save(TENANT, input('/viejo', '/dos'));

    expect(repository.rows.size).toBe(1);
    expect(repository.rows.get('/viejo')?.toPath).toBe('/dos');
  });
});

describe('resolver una ruta', () => {
  it('encuentra la redirección normalizando la ruta pedida', async () => {
    const repository = buildRepository([['/servicios', '/nuevos-servicios']]);

    const found = await new ManageRedirectsUseCase(repository).resolve(
      TENANT,
      'Servicios/',
    );

    expect(found?.toPath).toBe('/nuevos-servicios');
  });

  it('una ruta sin redirección devuelve null, para que siga al 404', async () => {
    const repository = buildRepository();

    expect(
      await new ManageRedirectsUseCase(repository).resolve(TENANT, '/no-existe'),
    ).toBeNull();
  });
});
