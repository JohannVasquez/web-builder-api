import type { RecordActivityUseCase } from '@/modules/ActivityLog/application/RecordActivityUseCase';
import { UnprocessableEntityError } from '@/shared/domain/UnprocessableEntityError';
import type { DemoCreator, DemoLinkKind } from '../domain/Demo';
import type { DemoRepository } from '../domain/DemoRepository';
import { buildDemoUrl, generateDemoToken } from '../domain/demoToken';
import { DemoNotFoundError } from '../domain/errors';
import type { IssuedDemoLink } from './CreateDemoUseCase';

export class RegenerateDemoLinkUseCase {
  constructor(
    private readonly demoRepository: DemoRepository,
    private readonly recordActivity: RecordActivityUseCase,
  ) {}

  // El anterior deja de funcionar en la petición siguiente: es la forma de cortarle el acceso
  // a quien no debía tener el enlace sin tocar la demo.
  public async execute(
    demoId: string,
    kind: DemoLinkKind,
    actor: DemoCreator,
  ): Promise<IssuedDemoLink> {
    const view = await this.demoRepository.findById(demoId);
    if (view === null || view.site === null) {
      throw new DemoNotFoundError();
    }
    if (view.site.address === null) {
      throw new UnprocessableEntityError(
        'La demo no tiene dirección, así que no hay enlace que armar.',
      );
    }

    const { token, hash } = generateDemoToken();
    await this.demoRepository.replaceAccessToken(demoId, kind, hash);

    await this.recordActivity.execute({
      tenantId: view.site.tenantId,
      actorType: actor.type,
      actorId: actor.id,
      actorName: actor.name,
      action: 'demo.link.regenerate',
      entityType: 'demo',
      entityId: demoId,
      summary: `Regeneró el enlace de ${kind === 'prospect' ? 'prospecto' : 'equipo'} de ${view.site.slug}`,
      // Sin el token: basta saber que se regeneró y cuál.
      after: { kind },
    });

    return { kind, token, url: buildDemoUrl(view.site.address, token) };
  }
}
