// Solo lo de UNA demo: el correo se arma con esto y nada más, para que no pueda colarse el
// dato de otra.
export interface DemoExpiryWarningMail {
  readonly to: string;
  readonly businessName: string;
  readonly expiresAt: Date;
}

// Clase abstracta usada como token de inyección de dependencias (diod).
export abstract class DemoMailer {
  // Sin el enlace: el token no se guarda en claro, así que el correo le recuerda que lo
  // abra con el que recibió.
  public abstract sendExpiryWarning(mail: DemoExpiryWarningMail): Promise<void>;
}
