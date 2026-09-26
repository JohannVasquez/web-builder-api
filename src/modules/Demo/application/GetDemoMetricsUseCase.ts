import {
  computeDemoMetrics,
  demoMetricsWindow,
  resolveDemoMetricsRange,
  type DemoMetrics,
} from '../domain/DemoMetrics';
import type { DemoMetricsRepository } from '../domain/DemoMetricsRepository';
import type { DemoMetricsQuery } from '../domain/DemoSchema';

// Se traen las filas del rango y se agregan en memoria: son cientos, no millones, y así cada
// número sale de una función pura que se prueba sin base.
export class GetDemoMetricsUseCase {
  constructor(private readonly repository: DemoMetricsRepository) {}

  public async execute(
    query: DemoMetricsQuery,
    now: Date = new Date(),
  ): Promise<DemoMetrics> {
    const range = resolveDemoMetricsRange(query, now);
    const { start, end } = demoMetricsWindow(range);
    const rows = await this.repository.findCreatedBetween(start, end);
    return computeDemoMetrics(rows, range, query.groupBy ?? null, now);
  }
}
