import type { Brand, BrandUpdate } from '../domain/BrandSchema';
import type { BrandRepository } from '../domain/BrandRepository';

export class UpdateBrandUseCase {
  constructor(private readonly brandRepository: BrandRepository) {}

  public async execute(tenantId: string, changes: BrandUpdate): Promise<Brand> {
    return this.brandRepository.update(tenantId, changes);
  }
}
