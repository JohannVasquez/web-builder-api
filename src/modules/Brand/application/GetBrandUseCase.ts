import type { Brand } from '../domain/BrandSchema';
import type { BrandRepository } from '../domain/BrandRepository';

export class GetBrandUseCase {
  constructor(private readonly brandRepository: BrandRepository) {}

  public async execute(tenantId: number): Promise<Brand> {
    return this.brandRepository.find(tenantId);
  }
}
