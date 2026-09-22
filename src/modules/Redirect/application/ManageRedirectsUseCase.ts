import {
  chainsToCollapse,
  normalizePath,
  resolveFinalTarget,
  wouldCycle,
  type Redirect,
  type RedirectInput,
} from '../domain/Redirect';
import type { RedirectRepository } from '../domain/RedirectRepository';
import { BadRequestError } from '@/shared/domain/BadRequestError';

export class ManageRedirectsUseCase {
  constructor(private readonly repository: RedirectRepository) {}

  public async list(tenantId: string): Promise<Redirect[]> {
    return this.repository.listByTenant(tenantId);
  }

  public async save(tenantId: string, input: RedirectInput): Promise<Redirect> {
    const existing = await this.repository.listByTenant(tenantId);

    // Si el destino ya redirige a otra parte, se guarda el destino final: encadenar saltos
    // gasta rastreo y pierde señal en cada uno.
    const target = resolveFinalTarget(existing, input.toPath);

    if (wouldCycle(existing, input.fromPath, target)) {
      throw new BadRequestError(
        'Esa redirección crearía un círculo: el visitante quedaría rebotando.',
      );
    }

    const saved = await this.repository.upsert(
      tenantId,
      input.fromPath,
      target,
      input.statusCode,
    );

    // Lo que llegaba al origen viejo pasa a apuntar al destino nuevo, en vez de encadenarse.
    for (const stale of chainsToCollapse(existing, input.fromPath, target)) {
      await this.repository.upsert(tenantId, stale.fromPath, target, stale.statusCode);
    }

    return saved;
  }

  public async remove(tenantId: string, id: string): Promise<void> {
    await this.repository.delete(tenantId, id);
  }

  /** Lo consulta la webapp antes de responder 404. */
  public async resolve(tenantId: string, path: string): Promise<Redirect | null> {
    return this.repository.findByFrom(tenantId, normalizePath(path));
  }
}
