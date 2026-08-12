import type { GlobalSettings } from './GlobalSettings';

export interface GlobalSettingsRepository {
  find(): Promise<GlobalSettings>;
}
