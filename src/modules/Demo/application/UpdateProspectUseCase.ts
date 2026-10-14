import type { RecordActivityUseCase } from '@/modules/ActivityLog/application/RecordActivityUseCase';
import type { DemoCreator } from '../domain/Demo';
import type { DemoRepository } from '../domain/DemoRepository';
import type { Prospect, ProspectPatch } from '../domain/Prospect';
import { DemoNotFoundError, ProspectNotFoundError } from '../domain/errors';

export class UpdateProspectUseCase {
  constructor(
    private readonly demoRepository: DemoRepository,
    private readonly recordActivity: RecordActivityUseCase,
  ) {}

  // Se edita desde la demo porque es donde la agencia lo mira; la ficha es una sola y la
  // comparten todas las propuestas al mismo negocio.
  public async execute(
    demoId: string,
    patch: ProspectPatch,
    actor: DemoCreator,
  ): Promise<Prospect> {
    const view = await this.demoRepository.findById(demoId);
    if (view === null) {
      throw new DemoNotFoundError();
    }
    if (view.demo.prospectId === null) {
      throw new ProspectNotFoundError();
    }
    const before = await this.demoRepository.findProspect(view.demo.prospectId);
    if (before === null) {
      throw new ProspectNotFoundError();
    }

    const updated = await this.demoRepository.updateProspect(before.id, patch);

    await this.recordActivity.execute({
      tenantId: view.demo.tenantId,
      actorType: actor.type,
      actorId: actor.id,
      actorName: actor.name,
      action: 'demo.prospect.update',
      entityType: 'prospect',
      entityId: updated.id,
      summary: `Editó la ficha del prospecto ${updated.businessName}`,
      before: pick(before, patch),
      after: pick(updated, patch),
    });

    return updated;
  }
}

// Solo los campos que cambiaron: el registro no necesita una copia entera de la ficha.
const pick = (prospect: Prospect, patch: ProspectPatch): Record<string, unknown> => {
  const values = prospect.toPrimitives() as unknown as Record<string, unknown>;
  return Object.fromEntries(Object.keys(patch).map((key) => [key, values[key]]));
};
