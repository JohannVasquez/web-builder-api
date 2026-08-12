export interface GlobalSettingsPrimitives {
  readonly siteName: string;
  readonly tagline: string;
  readonly contactEmail: string;
  readonly contactPhone: string;
  readonly whatsappNumber: string;
  readonly address: string;
  readonly instagramUrl: string;
  readonly facebookUrl: string;
}

export class GlobalSettings {
  constructor(
    public readonly siteName: string,
    public readonly tagline: string,
    public readonly contactEmail: string,
    public readonly contactPhone: string,
    public readonly whatsappNumber: string,
    public readonly address: string,
    public readonly instagramUrl: string,
    public readonly facebookUrl: string,
  ) {}

  public static fromRecord(record: Readonly<Record<string, string>>): GlobalSettings {
    const read = (key: string): string => record[key] ?? '';
    return new GlobalSettings(
      read('siteName'),
      read('tagline'),
      read('contactEmail'),
      read('contactPhone'),
      read('whatsappNumber'),
      read('address'),
      read('instagramUrl'),
      read('facebookUrl'),
    );
  }

  public toPrimitives(): GlobalSettingsPrimitives {
    return {
      siteName: this.siteName,
      tagline: this.tagline,
      contactEmail: this.contactEmail,
      contactPhone: this.contactPhone,
      whatsappNumber: this.whatsappNumber,
      address: this.address,
      instagramUrl: this.instagramUrl,
      facebookUrl: this.facebookUrl,
    };
  }
}
