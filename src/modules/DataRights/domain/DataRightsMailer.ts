import type { DataRight } from './DataRightsRequest';
import type { PersonalDataExport } from './DataRightsRepository';

// Clase abstracta usada como token de inyección de dependencias (diod).
export abstract class DataRightsMailer {
  /**
   * El enlace de verificación es lo que impide que alguien pida los datos de otro: solo quien
   * tiene acceso al buzón puede confirmarlo.
   */
  public abstract sendVerification(
    email: string,
    right: DataRight,
    verifyUrl: string,
  ): Promise<void>;

  /** Entrega los datos al titular, no al cliente: quien los pidió es quien los recibe. */
  public abstract sendExport(email: string, data: PersonalDataExport): Promise<void>;

  public abstract sendErasureDone(email: string): Promise<void>;
}
