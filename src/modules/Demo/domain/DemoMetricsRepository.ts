import type { DemoMetricsRow } from './DemoMetrics';

// Clase abstracta usada como token de inyección de dependencias (diod). Aparte de
// `DemoRepository`: es una lectura para el owner que no toca ninguna demo.
export abstract class DemoMetricsRepository {
  // Las creadas en [start, end), también las borradas: su rastro anónimo es parte de la historia.
  public abstract findCreatedBetween(start: Date, end: Date): Promise<DemoMetricsRow[]>;
}
