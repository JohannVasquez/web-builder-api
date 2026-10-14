const DAY_MS = 24 * 60 * 60 * 1000;

// Plazos del ciclo de vida de una demo (ver `.env.example`). Clase y no interface para
// registrarse como token en diod.
export class DemoLifecycleConfig {
  constructor(
    // Cuánto dura al crearla y cuánto suma cada extensión.
    public readonly durationDays: number = 14,
    // Con cuánta anticipación entra en "por vencer" y se le avisa al prospecto.
    public readonly warningDays: number = 3,
    // Cuánto espera una demo vencida o descartada antes de borrarse.
    public readonly purgeGraceDays: number = 30,
  ) {}
}

export const addDays = (from: Date, days: number): Date =>
  new Date(from.getTime() + days * DAY_MS);
