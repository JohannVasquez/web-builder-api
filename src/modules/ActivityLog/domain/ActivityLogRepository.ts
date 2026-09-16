import type { ActivityEntry, ActivityEntryInput, ActivityQuery } from './ActivityEntry';

// Clase abstracta usada como token de inyección de dependencias (diod).
export abstract class ActivityLogRepository {
  public abstract record(entry: ActivityEntryInput): Promise<void>;
  public abstract search(
    query: ActivityQuery,
  ): Promise<{ entries: ActivityEntry[]; total: number }>;
}
