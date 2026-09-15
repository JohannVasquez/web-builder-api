// Claves de `global_settings` que el sitio público expone tal cual, en orden de lectura.
const SETTING_KEYS = [
  'siteName',
  'tagline',
  'contactEmail',
  'contactPhone',
  'whatsappNumber',
  'address',
  'instagramUrl',
  'facebookUrl',
  'tiktokUrl',
  'linkedinUrl',
  'youtubeUrl',
  'xUrl',
  'customLinkUrl',
  'customLinkLabel',
] as const;

type SettingKey = (typeof SETTING_KEYS)[number];

export type GlobalSettingsPrimitives = Readonly<Record<SettingKey, string>>;

export class GlobalSettings {
  private constructor(private readonly values: GlobalSettingsPrimitives) {}

  // Una clave ausente vale cadena vacía: el sitio decide qué ocultar, no falla.
  public static fromRecord(record: Readonly<Record<string, string>>): GlobalSettings {
    const values = Object.fromEntries(
      SETTING_KEYS.map((key) => [key, record[key] ?? '']),
    ) as GlobalSettingsPrimitives;
    return new GlobalSettings(values);
  }

  public get(key: SettingKey): string {
    return this.values[key];
  }

  public toPrimitives(): GlobalSettingsPrimitives {
    return this.values;
  }
}

export const GLOBAL_SETTING_KEYS: readonly SettingKey[] = SETTING_KEYS;
