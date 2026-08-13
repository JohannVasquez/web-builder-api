import type { NavigationLink } from '../domain/NavigationLink';
import { NavigationRepository } from '../domain/NavigationRepository';

export class GetNavigationUseCase {
  constructor(private readonly navigationRepository: NavigationRepository) {}

  public async execute(): Promise<NavigationLink[]> {
    const links = await this.navigationRepository.findAll();
    return [...links].sort((a, b) => a.position - b.position);
  }
}
