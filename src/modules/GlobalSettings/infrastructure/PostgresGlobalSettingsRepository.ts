import type { Pool } from 'pg';
import { GlobalSettings } from '../domain/GlobalSettings';
import type { GlobalSettingsRepository } from '../domain/GlobalSettingsRepository';

interface SettingRow {
  readonly key: string;
  readonly value: string;
}

export class PostgresGlobalSettingsRepository implements GlobalSettingsRepository {
  constructor(private readonly pool: Pool) {}

  public async find(): Promise<GlobalSettings> {
    const result = await this.pool.query<SettingRow>(
      'SELECT key, value FROM global_settings',
    );
    const record: Record<string, string> = {};
    for (const row of result.rows) {
      record[row.key] = row.value;
    }
    return GlobalSettings.fromRecord(record);
  }
}
