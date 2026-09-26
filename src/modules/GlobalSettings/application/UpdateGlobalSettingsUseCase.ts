import type { GlobalSettingsRepository } from '../domain/GlobalSettingsRepository';
import { globalSettingsSchemas } from '../domain/settingsSchemas';
import { BadRequestError } from '@/shared/domain/BadRequestError';

export class UpdateGlobalSettingsUseCase {
  constructor(private readonly globalSettingsRepository: GlobalSettingsRepository) {}

  public async execute(tenantId: string, input: unknown): Promise<void> {
    const parsed = globalSettingsSchemas.safeParse(input);
    if (!parsed.success) {
      // El primer error suele ser suficiente para el panel
      const firstIssue = parsed.error.issues[0];
      const field = firstIssue.path.join('.') || 'GlobalSettings';
      throw new BadRequestError(`Error en ${field}: ${firstIssue.message}`);
    }

    const payload = parsed.data;
    // Filtrar undefined para no enviarlos al repositorio
    const recordToSave: Record<string, string> = {};
    for (const [key, value] of Object.entries(payload)) {
      if (value !== undefined) {
        recordToSave[key] = value;
      }
    }

    if (Object.keys(recordToSave).length > 0) {
      await this.globalSettingsRepository.upsert(tenantId, recordToSave);
    }
  }
}
