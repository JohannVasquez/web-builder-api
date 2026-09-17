import type { NavigationLink } from '../domain/NavigationLink';
import type { NavigationRepository } from '../domain/NavigationRepository';
import type { NavigationInput } from '../domain/NavigationSchema';

export class ReplaceNavigationUseCase {
  constructor(private readonly navigationRepository: NavigationRepository) {}

  public async execute(
    tenantId: number,
    input: NavigationInput,
  ): Promise<NavigationLink[]> {
    return this.navigationRepository.replace(tenantId, input);
  }
}
