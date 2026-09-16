import { SiteContentSource } from '../domain/SiteContentSource';

export class ListSiteTemplatesUseCase {
  constructor(private readonly siteContentSource: SiteContentSource) {}

  public async execute(): Promise<unknown> {
    return this.siteContentSource.listTemplates();
  }
}
