import type { NavigationLink } from '../domain/NavigationLink';
import { NavigationRepository } from '../domain/NavigationRepository';

export class GetNavigationUseCase {
  constructor(private readonly navigationRepository: NavigationRepository) {}

  public async execute(tenantId: number): Promise<NavigationLink[]> {
    const links = await this.navigationRepository.findAll(tenantId);
    return [...links].sort((a, b) => a.position - b.position);
  }
}
