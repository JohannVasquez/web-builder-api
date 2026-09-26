import type { Request, Response } from 'express';
import { parseId } from '@/shared/domain/identifier';
import { getRequestActor } from '@/modules/ApiKey/presentation/actorMiddleware';
import type { CreateDemoUseCase, IssuedDemoLink } from '../application/CreateDemoUseCase';
import type { QueryDemosUseCase } from '../application/QueryDemosUseCase';
import type { UpdateProspectUseCase } from '../application/UpdateProspectUseCase';
import type { DemoCreator } from '../domain/Demo';
import type { DemoView } from '../domain/DemoRepository';
import { CreateDemoSchema, DemoListQuerySchema } from '../domain/DemoSchema';
import { ProspectPatchSchema } from '../domain/Prospect';
import { DemoSlugTakenError } from '../domain/errors';

// La forma en que la agencia ve una demo en listas y detalle. Nunca lleva enlaces: esos se
// muestran una sola vez, al crearlos o regenerarlos.
const presentDemo = (view: DemoView, now: Date): Record<string, unknown> => ({
  ...view.demo.toPrimitives(now),
  site: view.site,
  prospect: view.prospect,
});

const presentLink = (link: IssuedDemoLink): Record<string, unknown> => ({
  kind: link.kind,
  url: link.url,
  token: link.token,
});

export class AdminDemoController {
  constructor(
    private readonly createDemoUseCase: CreateDemoUseCase,
    private readonly queryDemosUseCase: QueryDemosUseCase,
    private readonly updateProspectUseCase: UpdateProspectUseCase,
  ) {}

  public readonly create = async (req: Request, res: Response): Promise<void> => {
    const input = CreateDemoSchema.parse(req.body);
    try {
      const created = await this.createDemoUseCase.execute(input, this.actorOf(res));
      const now = new Date();
      res.status(201).json({
        demo: presentDemo(created.view, now),
        prospect: created.prospect.toPrimitives(),
        links: {
          prospect: presentLink(created.links.prospect),
          team: presentLink(created.links.team),
        },
      });
    } catch (error) {
      // Mismo cuerpo que cualquier 409 más la sugerencia, para que el panel o el agente
      // puedan reintentar sin adivinar.
      if (error instanceof DemoSlugTakenError) {
        res.status(409).json({
          error: 'Conflict',
          message: error.message,
          suggestedSlug: error.suggestedSlug,
        });
        return;
      }
      throw error;
    }
  };

  public readonly list = async (req: Request, res: Response): Promise<void> => {
    const filter = DemoListQuerySchema.parse(req.query);
    const now = new Date();
    const demos = await this.queryDemosUseCase.list(filter, now);
    res.json({ demos: demos.map((view) => presentDemo(view, now)) });
  };

  public readonly get = async (req: Request, res: Response): Promise<void> => {
    const now = new Date();
    const details = await this.queryDemosUseCase.get(this.demoIdOf(req), now);
    res.json({
      demo: presentDemo(details.view, now),
      prospect: details.prospect?.toPrimitives() ?? null,
      otherDemos: details.otherDemos.map((view) => presentDemo(view, now)),
    });
  };

  public readonly updateProspect = async (req: Request, res: Response): Promise<void> => {
    const patch = ProspectPatchSchema.parse(req.body);
    const prospect = await this.updateProspectUseCase.execute(
      this.demoIdOf(req),
      patch,
      this.actorOf(res),
    );
    res.json({ prospect: prospect.toPrimitives() });
  };

  private demoIdOf(req: Request): string {
    return parseId(req.params.demoId, 'demoId');
  }

  private actorOf(res: Response): DemoCreator {
    const actor = getRequestActor(res);
    return { type: actor.type, id: actor.id, name: actor.name };
  }
}
