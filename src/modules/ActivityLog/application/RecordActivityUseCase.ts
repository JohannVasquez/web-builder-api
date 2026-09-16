import { ActivityLogRepository } from '../domain/ActivityLogRepository';
import type { ActivityEntryInput } from '../domain/ActivityEntry';

export class RecordActivityUseCase {
  constructor(private readonly repository: ActivityLogRepository) {}

  // Nunca lanza: el registro es una consecuencia del cambio, no una condición para hacerlo.
  public async execute(entry: ActivityEntryInput): Promise<void> {
    try {
      await this.repository.record(entry);
    } catch (error) {
      console.error('[ActivityLog] No se pudo registrar la actividad:', error);
    }
  }
}
