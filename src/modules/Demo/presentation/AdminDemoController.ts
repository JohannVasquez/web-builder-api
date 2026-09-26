import type { Request, Response } from 'express';
import { parseId } from '@/shared/domain/identifier';
import { getRequestActor } from '@/modules/ApiKey/presentation/actorMiddleware';
import type { CreateDemoUseCase, IssuedDemoLink } from '../application/CreateDemoUseCase';
import type { QueryDemosUseCase } from '../application/QueryDemosUseCase';
import type { UpdateProspectUseCase } from '../application/UpdateProspectUseCase';
import type { RegenerateDemoLinkUseCase } from '../application/RegenerateDemoLinkUseCase';
import type { ManageDemoExpiryUseCase } from '../application/ManageDemoExpiryUseCase';
import type { PurgeDemoUseCase } from '../application/PurgeDemoUseCase';
import type { DiscardDemoUseCase } from '../application/DiscardDemoUseCase';
import type { DemoCreator, DemoLinkKind } from '../domain/Demo';
import type { DemoView } from '../domain/DemoRepository';
import {
  CreateDemoSchema,
  DeleteDemoSchema,
  DiscardDemoSchema,
  DemoExpirySchema,
  DemoListQuerySchema,
  DemoVisitsQuerySchema,
} from '../domain/DemoSchema';
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
    private readonly regenerateDemoLinkUseCase: RegenerateDemoLinkUseCase,
    private readonly manageDemoExpiryUseCase: ManageDemoExpiryUseCase,
    private readonly purgeDemoUseCase: PurgeDemoUseCase,
    private readonly discardDemoUseCase: DiscardDemoUseCase,
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

  public readonly regenerateProspectLink = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    await this.regenerate(req, res, 'prospect');
  };

  public readonly regenerateTeamLink = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    await this.regenerate(req, res, 'team');
  };

  public readonly extend = async (req: Request, res: Response): Promise<void> => {
    const now = new Date();
    const view = await this.manageDemoExpiryUseCase.extend(
      this.demoIdOf(req),
      this.actorOf(res),
      now,
    );
    res.json({ demo: presentDemo(view, now) });
  };

  public readonly updateExpiry = async (req: Request, res: Response): Promise<void> => {
    const { neverExpires } = DemoExpirySchema.parse(req.body);
    const now = new Date();
    const view = await this.manageDemoExpiryUseCase.setNeverExpires(
      this.demoIdOf(req),
      neverExpires,
      this.actorOf(res),
      now,
    );
    res.json({ demo: presentDemo(view, now) });
  };

  public readonly discard = async (req: Request, res: Response): Promise<void> => {
    const { reason } = DiscardDemoSchema.parse(req.body ?? {});
    const now = new Date();
    const view = await this.discardDemoUseCase.discard(
      this.demoIdOf(req),
      reason ?? null,
      this.actorOf(res),
      now,
    );
    res.json({ demo: presentDemo(view, now) });
  };

  public readonly restore = async (req: Request, res: Response): Promise<void> => {
    const now = new Date();
    const view = await this.discardDemoUseCase.restore(
      this.demoIdOf(req),
      this.actorOf(res),
      now,
    );
    res.json({ demo: presentDemo(view, now) });
  };

  // Borra ya, sin esperar el período de gracia. Responde la fila anónima que queda.
  public readonly remove = async (req: Request, res: Response): Promise<void> => {
    DeleteDemoSchema.parse(req.body ?? {});
    const now = new Date();
    const result = await this.purgeDemoUseCase.deleteNow(
      this.demoIdOf(req),
      this.actorOf(res),
      now,
    );
    res.json({
      demo: result.demo.toPrimitives(now),
      files: result.files,
      prospectDeleted: result.prospectDeleted,
    });
  };

  // Lo que el prospecto abrió, lo más reciente primero: la señal para decidir si volver a
  // llamarlo y de qué hablarle.
  public readonly listVisits = async (req: Request, res: Response): Promise<void> => {
    const { page, perPage } = DemoVisitsQuerySchema.parse(req.query);
    const { visits, total } = await this.queryDemosUseCase.visits(
      this.demoIdOf(req),
      page,
      perPage,
    );
    res.json({
      visits: visits.map((visit) => visit.toPrimitives()),
      total,
      page,
      perPage,
    });
  };

  private async regenerate(
    req: Request,
    res: Response,
    kind: DemoLinkKind,
  ): Promise<void> {
    const link = await this.regenerateDemoLinkUseCase.execute(
      this.demoIdOf(req),
      kind,
      this.actorOf(res),
    );
    res.status(201).json({ link: presentLink(link) });
  }

  private demoIdOf(req: Request): string {
    return parseId(req.params.demoId, 'demoId');
  }

  private actorOf(res: Response): DemoCreator {
    const actor = getRequestActor(res);
    return { type: actor.type, id: actor.id, name: actor.name };
  }
}
