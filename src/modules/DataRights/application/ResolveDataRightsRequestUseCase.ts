import type { DataRightsRepository } from '../domain/DataRightsRepository';

/**
 * Cierra a mano una rectificación o una oposición, que son las que dependen de qué pide la
 * persona y no se pueden resolver solas.
 */
export class ResolveDataRightsRequestUseCase {
  constructor(private readonly repository: DataRightsRepository) {}

  public async execute(
    id: string,
    outcome: 'resuelta' | 'rechazada',
    now = new Date(),
  ): Promise<void> {
    await this.repository.markStatus(id, outcome, now);
  }
}
