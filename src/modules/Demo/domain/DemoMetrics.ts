import {
  DEFAULT_TIME_ZONE,
  localDayKey,
  localDayStart,
  shiftDayKey,
} from '@/modules/Store/domain/localDay';
import {
  DEMO_DISCARD_REASONS,
  SIBLING_CONVERTED_REASON,
  type DemoDiscardReason,
  type DemoOutcome,
  type StoredDiscardReason,
} from './Demo';

// Las fechas del rango y los meses se leen en hora de Chile, como el reporte de ventas: una
// demo creada a las 22:00 del 31 es del mes que termina, no del siguiente.
export const DEMO_METRICS_TIME_ZONE = DEFAULT_TIME_ZONE;
export const DEMO_METRICS_DEFAULT_DAYS = 90;

export const DEMO_METRICS_GROUPINGS = [
  'industry',
  'template',
  'creator',
  'month',
] as const;
export type DemoMetricsGrouping = (typeof DEMO_METRICS_GROUPINGS)[number];

// Un descarte sin motivo también es un "no": se cuenta aparte para que la suma cierre.
export const NO_DISCARD_REASON = 'sin-motivo';
export type DiscardReasonBucket = DemoDiscardReason | typeof NO_DISCARD_REASON;

export const NO_INDUSTRY_LABEL = 'Sin rubro';
export const NO_TEMPLATE_LABEL = 'Sin kit (vacía o duplicada)';

// Lo único de cada demo que las métricas miran. Nada del prospecto: sirve igual para una fila
// viva que para el rastro anónimo de una borrada.
export interface DemoMetricsRow {
  readonly industry: string | null;
  readonly templateId: string | null;
  readonly creator: { readonly type: 'admin' | 'apiKey'; readonly name: string };
  readonly createdAt: Date;
  readonly expiresAt: Date | null;
  readonly outcome: DemoOutcome | null;
  readonly outcomeAt: Date | null;
  readonly discardReason: StoredDiscardReason | null;
  readonly extensionCount: number;
  readonly visitCount: number;
  readonly firstVisitAt: Date | null;
  readonly purgedAt: Date | null;
}

// Días `YYYY-MM-DD` en hora de Chile, ambos incluidos.
export interface DemoMetricsRange {
  readonly from: string;
  readonly to: string;
}

export interface DemoFunnel {
  readonly created: number;
  // Al menos una visita con el enlace del prospecto (el del equipo no cuenta visitas).
  readonly opened: number;
  readonly converted: number;
  readonly openRate: number;
  readonly conversionRate: number;
  readonly conversionRateOfOpened: number;
}

export interface DemoOutcomeCounts {
  readonly active: number;
  readonly expired: number;
  readonly discarded: number;
  readonly discardReasons: Readonly<Record<DiscardReasonBucket, number>>;
  readonly otraPropuesta: number;
  readonly converted: number;
  readonly purged: number;
}

export interface DemoMetricsGroup {
  // Nula para "sin rubro" o "sin kit": no puede chocar con un rubro o un kit de verdad.
  readonly key: string | null;
  readonly label: string;
  readonly funnel: DemoFunnel;
}

export interface DemoMetrics {
  readonly range: DemoMetricsRange & { readonly timeZone: string };
  // Los resultados dependen de la hora: una vigente de hoy puede estar vencida mañana.
  readonly asOf: string;
  readonly funnel: DemoFunnel;
  readonly outcomes: DemoOutcomeCounts;
  readonly timing: {
    readonly medianDaysToFirstVisit: number | null;
    readonly medianDaysToConversion: number | null;
  };
  readonly engagement: {
    readonly avgVisitsPerOpenedDemo: number;
    readonly avgExtensions: number;
  };
  readonly groupBy: DemoMetricsGrouping | null;
  readonly groups: readonly DemoMetricsGroup[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

const round = (value: number, decimals: number): number => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

// Sin denominador no hay tasa: cero, nunca NaN ni un error.
const ratio = (part: number, whole: number, decimals: number): number =>
  whole === 0 ? 0 : round(part / whole, decimals);

const median = (values: readonly number[]): number | null => {
  if (values.length === 0) {
    return null;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  const value =
    sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
  return round(value, 2);
};

const daysBetween = (from: Date, to: Date): number =>
  (to.getTime() - from.getTime()) / DAY_MS;

const isOpened = (row: DemoMetricsRow): boolean => row.visitCount > 0;

// Sin `from`, los últimos 90 días hasta `to` (ambos incluidos). Sin `to`, hoy; o `from`, si es
// posterior: un rango en el futuro responde ceros, no un error.
export const resolveDemoMetricsRange = (
  query: { readonly from?: string; readonly to?: string },
  now: Date,
  timeZone: string = DEMO_METRICS_TIME_ZONE,
): DemoMetricsRange => {
  const today = localDayKey(now, timeZone);
  if (query.from === undefined) {
    const to = query.to ?? today;
    return { from: shiftDayKey(to, 1 - DEMO_METRICS_DEFAULT_DAYS), to };
  }
  const to = query.to ?? (query.from > today ? query.from : today);
  return { from: query.from, to };
};

// Los instantes que cubre el rango: desde que empieza `from` hasta que empieza el día siguiente
// a `to` (este último excluido).
export const demoMetricsWindow = (
  range: DemoMetricsRange,
  timeZone: string = DEMO_METRICS_TIME_ZONE,
): { readonly start: Date; readonly end: Date } => ({
  start: localDayStart(range.from, timeZone),
  end: localDayStart(shiftDayKey(range.to, 1), timeZone),
});

export const computeDemoFunnel = (rows: readonly DemoMetricsRow[]): DemoFunnel => {
  const opened = rows.filter(isOpened);
  const converted = rows.filter((row) => row.outcome === 'converted');
  // Sobre abiertas cuentan solo las convertidas que el prospecto abrió: una vendida en persona,
  // sin visitas, está en `converted` pero no puede subir la tasa de las que sí la abrieron.
  const convertedOpened = converted.filter(isOpened).length;
  return {
    created: rows.length,
    opened: opened.length,
    converted: converted.length,
    openRate: ratio(opened.length, rows.length, 4),
    conversionRate: ratio(converted.length, rows.length, 4),
    conversionRateOfOpened: ratio(convertedOpened, opened.length, 4),
  };
};

type OutcomeBucket = 'active' | 'expired' | 'discarded' | 'otraPropuesta' | 'converted';

// Como `Demo.status`, pero una borrada sigue contando por lo que le pasó antes: vencida,
// descartada o, si se borró a mano estando vigente, cerrada sin resultado (`expired`).
const outcomeBucket = (row: DemoMetricsRow, now: Date): OutcomeBucket => {
  if (row.outcome === 'converted') {
    return 'converted';
  }
  if (row.outcome === 'discarded') {
    return row.discardReason === SIBLING_CONVERTED_REASON ? 'otraPropuesta' : 'discarded';
  }
  if (
    row.purgedAt !== null ||
    (row.expiresAt !== null && row.expiresAt.getTime() <= now.getTime())
  ) {
    return 'expired';
  }
  return 'active';
};

const discardReasonBucket = (row: DemoMetricsRow): DiscardReasonBucket =>
  (DEMO_DISCARD_REASONS as readonly string[]).includes(row.discardReason ?? '')
    ? (row.discardReason as DemoDiscardReason)
    : NO_DISCARD_REASON;

const computeOutcomes = (
  rows: readonly DemoMetricsRow[],
  now: Date,
): DemoOutcomeCounts => {
  const counts: Record<OutcomeBucket, number> = {
    active: 0,
    expired: 0,
    discarded: 0,
    otraPropuesta: 0,
    converted: 0,
  };
  const discardReasons = Object.fromEntries(
    [...DEMO_DISCARD_REASONS, NO_DISCARD_REASON].map((reason) => [reason, 0]),
  ) as Record<DiscardReasonBucket, number>;
  for (const row of rows) {
    const bucket = outcomeBucket(row, now);
    counts[bucket] += 1;
    if (bucket === 'discarded') {
      discardReasons[discardReasonBucket(row)] += 1;
    }
  }
  return {
    active: counts.active,
    expired: counts.expired,
    discarded: counts.discarded,
    discardReasons,
    otraPropuesta: counts.otraPropuesta,
    converted: counts.converted,
    purged: rows.filter((row) => row.purgedAt !== null).length,
  };
};

interface GroupKey {
  readonly key: string | null;
  readonly label: string;
}

// El rubro es texto libre copiado de la ficha: "Pastelería" y " pastelería" son el mismo.
const industryKey = (row: DemoMetricsRow): GroupKey => {
  const industry = row.industry?.trim() ?? '';
  return industry === ''
    ? { key: null, label: NO_INDUSTRY_LABEL }
    : { key: industry.toLocaleLowerCase('es-CL'), label: industry };
};

const templateKey = (row: DemoMetricsRow): GroupKey =>
  row.templateId === null
    ? { key: null, label: NO_TEMPLATE_LABEL }
    : { key: row.templateId, label: row.templateId };

// Por el nombre congelado al crearla, que sobrevive a que la persona o la clave se borren. El
// tipo va en la clave: una persona y una clave con el mismo nombre no son la misma.
const creatorKey = (row: DemoMetricsRow): GroupKey => ({
  key: `${row.creator.type}:${row.creator.name}`,
  label:
    row.creator.type === 'apiKey'
      ? `${row.creator.name} (clave de acceso)`
      : row.creator.name,
});

const monthKey = (row: DemoMetricsRow, timeZone: string): GroupKey => {
  const month = localDayKey(row.createdAt, timeZone).slice(0, 7);
  return { key: month, label: month };
};

// Todos los meses del rango, también los que no tuvieron demos: un gráfico por mes sin huecos.
const monthsOf = (range: DemoMetricsRange): string[] => {
  const months: string[] = [];
  const last = range.to.slice(0, 7);
  let cursor = `${range.from.slice(0, 7)}-01`;
  while (cursor.slice(0, 7) <= last) {
    months.push(cursor.slice(0, 7));
    const next = new Date(`${cursor}T00:00:00.000Z`);
    next.setUTCMonth(next.getUTCMonth() + 1);
    cursor = next.toISOString().slice(0, 10);
  }
  return months;
};

const groupRows = (
  rows: readonly DemoMetricsRow[],
  groupBy: DemoMetricsGrouping,
  range: DemoMetricsRange,
  timeZone: string,
): DemoMetricsGroup[] => {
  const keyOf = (row: DemoMetricsRow): GroupKey => {
    switch (groupBy) {
      case 'industry':
        return industryKey(row);
      case 'template':
        return templateKey(row);
      case 'creator':
        return creatorKey(row);
      case 'month':
        return monthKey(row, timeZone);
    }
  };

  const buckets = new Map<string | null, { label: string; rows: DemoMetricsRow[] }>();
  if (groupBy === 'month') {
    for (const month of monthsOf(range)) {
      buckets.set(month, { label: month, rows: [] });
    }
  }
  for (const row of rows) {
    const { key, label } = keyOf(row);
    const bucket = buckets.get(key);
    if (bucket === undefined) {
      buckets.set(key, { label, rows: [row] });
    } else {
      bucket.rows.push(row);
    }
  }

  const groups = [...buckets.entries()].map(([key, bucket]) => ({
    key,
    label: bucket.label,
    funnel: computeDemoFunnel(bucket.rows),
  }));
  if (groupBy === 'month') {
    return groups.sort((a, b) => String(a.key).localeCompare(String(b.key)));
  }
  // Los grupos con más demos primero; "sin rubro" o "sin kit" al final, que es lo que menos dice.
  return groups.sort((a, b) => {
    if ((a.key === null) !== (b.key === null)) {
      return a.key === null ? 1 : -1;
    }
    return b.funnel.created - a.funnel.created || a.label.localeCompare(b.label, 'es');
  });
};

export const computeDemoMetrics = (
  rows: readonly DemoMetricsRow[],
  range: DemoMetricsRange,
  groupBy: DemoMetricsGrouping | null,
  now: Date,
  timeZone: string = DEMO_METRICS_TIME_ZONE,
): DemoMetrics => {
  const opened = rows.filter(isOpened);
  const daysToFirstVisit = rows.flatMap((row) =>
    row.firstVisitAt === null ? [] : [daysBetween(row.createdAt, row.firstVisitAt)],
  );
  const daysToConversion = rows.flatMap((row) =>
    row.outcome === 'converted' && row.outcomeAt !== null
      ? [daysBetween(row.createdAt, row.outcomeAt)]
      : [],
  );
  const sum = (values: readonly number[]): number =>
    values.reduce((total, value) => total + value, 0);

  return {
    range: { from: range.from, to: range.to, timeZone },
    asOf: now.toISOString(),
    funnel: computeDemoFunnel(rows),
    outcomes: computeOutcomes(rows, now),
    timing: {
      medianDaysToFirstVisit: median(daysToFirstVisit),
      medianDaysToConversion: median(daysToConversion),
    },
    engagement: {
      avgVisitsPerOpenedDemo: ratio(
        sum(opened.map((row) => row.visitCount)),
        opened.length,
        2,
      ),
      avgExtensions: ratio(sum(rows.map((row) => row.extensionCount)), rows.length, 2),
    },
    groupBy,
    groups: groupBy === null ? [] : groupRows(rows, groupBy, range, timeZone),
  };
};
