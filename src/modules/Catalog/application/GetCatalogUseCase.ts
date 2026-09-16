import { CatalogProvider } from '../domain/CatalogProvider';

export class GetCatalogUseCase {
  constructor(private readonly catalogProvider: CatalogProvider) {}

  public async execute(): Promise<unknown> {
    return this.catalogProvider.get();
  }
}
