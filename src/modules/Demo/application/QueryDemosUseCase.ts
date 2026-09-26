import { addDays, type DemoLifecycleConfig } from '../domain/DemoLifecycleConfig';
import type { DemoFilter, DemoRepository, DemoView } from '../domain/DemoRepository';
import type { DemoListQuery } from '../domain/DemoSchema';
import type { DemoVisit } from '../domain/DemoVisit';
import type { Prospect } from '../domain/Prospect';
import { DemoNotFoundError } from '../domain/errors';

export interface DemoDetails {
  readonly view: DemoView;
  readonly prospect: Prospect | null;
  // Las otras propuestas al mismo prospecto: al convertir una, las demás se descartan.
  readonly otherDemos: readonly DemoView[];
}

export class QueryDemosUseCase {
  constructor(
    private readonly demoRepository: DemoRepository,
    private readonly config: DemoLifecycleConfig,
  ) {}

  public async list(query: DemoListQuery, now: Date = new Date()): Promise<DemoView[]> {
    const { status, ...rest } = query;
    const filter: DemoFilter =
      status === 'por-vencer'
        ? {
            ...rest,
            status: 'vigente',
            expiresBefore: addDays(now, this.config.warningDays),
          }
        : { ...rest, status };
    return this.demoRepository.list(filter, now);
  }

  public async get(demoId: string, now: Date = new Date()): Promise<DemoDetails> {
    const view = await this.require(demoId);
    const prospectId = view.demo.prospectId;
    if (prospectId === null) {
      return { view, prospect: null, otherDemos: [] };
    }

    const [prospect, siblings] = await Promise.all([
      this.demoRepository.findProspect(prospectId),
      this.demoRepository.list({ prospectId }, now),
    ]);
    return {
      view,
      prospect,
      otherDemos: siblings.filter((sibling) => sibling.demo.id !== demoId),
    };
  }

  public async visits(
    demoId: string,
    page: number,
    perPage: number,
  ): Promise<{ visits: DemoVisit[]; total: number }> {
    await this.require(demoId);
    return this.demoRepository.listVisits(demoId, page, perPage);
  }

  private async require(demoId: string): Promise<DemoView> {
    const view = await this.demoRepository.findById(demoId);
    if (view === null) {
      throw new DemoNotFoundError();
    }
    return view;
  }
}
