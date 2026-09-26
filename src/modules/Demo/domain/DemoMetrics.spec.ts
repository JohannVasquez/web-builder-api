import {
  computeDemoFunnel,
  computeDemoMetrics,
  demoMetricsWindow,
  resolveDemoMetricsRange,
  type DemoMetrics,
  type DemoMetricsRow,
} from './DemoMetrics';

describe('métricas de demos', () => {
  const NOW = new Date('2026-09-26T15:00:00Z');
  const RANGE = { from: '2026-01-01', to: '2026-12-31' };
  const CREATED = new Date('2026-09-01T15:00:00Z');
  const daysAfter = (date: Date, days: number): Date =>
    new Date(date.getTime() + days * 24 * 60 * 60 * 1000);

  const row = (overrides: Partial<DemoMetricsRow> = {}): DemoMetricsRow => ({
    industry: 'pastelería',
    templateId: 'pasteleria',
    creator: { type: 'admin', name: 'Pau' },
    createdAt: CREATED,
    // Vigente por omisión: vence después de NOW.
    expiresAt: daysAfter(NOW, 5),
    outcome: null,
    outcomeAt: null,
    discardReason: null,
    extensionCount: 0,
    visitCount: 0,
    firstVisitAt: null,
    purgedAt: null,
    ...overrides,
  });

  const opened = (visits: number, daysToFirstVisit = 1): Partial<DemoMetricsRow> => ({
    visitCount: visits,
    firstVisitAt: daysAfter(CREATED, daysToFirstVisit),
  });

  const converted = (daysToConversion = 3): Partial<DemoMetricsRow> => ({
    outcome: 'converted',
    outcomeAt: daysAfter(CREATED, daysToConversion),
    expiresAt: null,
  });

  const discarded = (
    reason: DemoMetricsRow['discardReason'],
  ): Partial<DemoMetricsRow> => ({
    outcome: 'discarded',
    outcomeAt: daysAfter(CREATED, 4),
    discardReason: reason,
  });

  const metrics = (
    rows: DemoMetricsRow[],
    groupBy: DemoMetrics['groupBy'] = null,
    range = RANGE,
  ): DemoMetrics => computeDemoMetrics(rows, range, groupBy, NOW);

  // 10 creadas, 6 abiertas (las dos convertidas entre ellas), 4 que nadie abrió.
  const tenDemos = (): DemoMetricsRow[] => [
    row({ ...opened(3), ...converted() }),
    row({ ...opened(5), ...converted() }),
    row(opened(1)),
    row(opened(2)),
    row(opened(4)),
    row(opened(6)),
    row(),
    row(),
    row(),
    row(),
  ];

  describe('embudo', () => {
    it('10 creadas, 6 abiertas y 2 convertidas: 60 % de apertura, 20 % y 33 % de conversión', () => {
      expect(metrics(tenDemos()).funnel).toEqual({
        created: 10,
        opened: 6,
        converted: 2,
        openRate: 0.6,
        conversionRate: 0.2,
        conversionRateOfOpened: 0.3333,
      });
    });

    it('las borradas cuentan igual que las vivas', () => {
      const alive = tenDemos();
      const purgedAt = daysAfter(NOW, -1);
      const purged = alive.map((demo) =>
        demo.outcome === 'converted' ? demo : { ...demo, purgedAt },
      );

      expect(metrics(purged).funnel).toEqual(metrics(alive).funnel);
      expect(metrics(purged).outcomes.purged).toBe(8);
    });

    it('una convertida sin visitas es una venta, pero no sube la tasa de las abiertas', () => {
      const funnel = computeDemoFunnel([
        row({ ...opened(2), ...converted() }),
        row(opened(1)),
        row(converted()),
      ]);

      expect(funnel).toMatchObject({ created: 3, opened: 2, converted: 2 });
      expect(funnel.conversionRate).toBe(0.6667);
      expect(funnel.conversionRateOfOpened).toBe(0.5);
    });

    it('sin demos, todo en cero y las medianas nulas, nunca NaN', () => {
      const empty = metrics([], 'industry');

      expect(empty.funnel).toEqual({
        created: 0,
        opened: 0,
        converted: 0,
        openRate: 0,
        conversionRate: 0,
        conversionRateOfOpened: 0,
      });
      expect(empty.outcomes).toEqual({
        active: 0,
        expired: 0,
        discarded: 0,
        discardReasons: {
          'no-interesado': 0,
          precio: 0,
          'ya-tiene-sitio': 0,
          'no-responde': 0,
          otro: 0,
          'sin-motivo': 0,
        },
        otraPropuesta: 0,
        converted: 0,
        purged: 0,
      });
      expect(empty.timing).toEqual({
        medianDaysToFirstVisit: null,
        medianDaysToConversion: null,
      });
      expect(empty.engagement).toEqual({ avgVisitsPerOpenedDemo: 0, avgExtensions: 0 });
      expect(empty.groups).toEqual([]);
      expect(JSON.stringify(empty)).not.toContain('NaN');
    });

    it('con demos pero ninguna abierta, la tasa sobre abiertas es cero', () => {
      expect(metrics([row(), row()]).funnel.conversionRateOfOpened).toBe(0);
    });
  });

  describe('resultados', () => {
    it('cuenta vigentes, vencidas, descartadas y convertidas según la hora de la consulta', () => {
      const outcomes = metrics([
        row(),
        row({ expiresAt: null }),
        row({ expiresAt: daysAfter(NOW, -1) }),
        row({ expiresAt: NOW }),
        row(discarded('precio')),
        row(converted()),
      ]).outcomes;

      expect(outcomes).toMatchObject({
        active: 2,
        expired: 2,
        discarded: 1,
        converted: 1,
        purged: 0,
      });
    });

    it('desglosa los motivos de descarte, también el descarte sin motivo', () => {
      const outcomes = metrics([
        row(discarded('no-interesado')),
        row(discarded('no-interesado')),
        row(discarded('precio')),
        row(discarded('ya-tiene-sitio')),
        row(discarded('no-responde')),
        row(discarded('otro')),
        row(discarded(null)),
      ]).outcomes;

      expect(outcomes.discarded).toBe(7);
      expect(outcomes.discardReasons).toEqual({
        'no-interesado': 2,
        precio: 1,
        'ya-tiene-sitio': 1,
        'no-responde': 1,
        otro: 1,
        'sin-motivo': 1,
      });
    });

    it('otra-propuesta no es un "no" del prospecto: va aparte, pero la demo sí cuenta como creada', () => {
      const result = metrics([
        row({ ...opened(2), ...converted() }),
        row(discarded('otra-propuesta')),
        row(discarded('precio')),
      ]);

      expect(result.funnel.created).toBe(3);
      expect(result.outcomes.discarded).toBe(1);
      expect(result.outcomes.discardReasons).not.toHaveProperty('otra-propuesta');
      expect(result.outcomes.discardReasons.precio).toBe(1);
      expect(result.outcomes.otraPropuesta).toBe(1);
    });

    it('una borrada cuenta por lo que le pasó antes y además como borrada', () => {
      const purgedAt = daysAfter(NOW, -1);
      const outcomes = metrics([
        row({ expiresAt: daysAfter(NOW, -40), purgedAt }),
        row({ ...discarded('no-responde'), purgedAt }),
        // Borrada a mano estando vigente: se cerró sin resultado.
        row({ purgedAt }),
      ]).outcomes;

      expect(outcomes).toMatchObject({
        active: 0,
        expired: 2,
        discarded: 1,
        purged: 3,
      });
      expect(outcomes.discardReasons['no-responde']).toBe(1);
    });

    it('vigentes, vencidas, descartadas, otra-propuesta y convertidas suman las creadas', () => {
      const rows = [
        ...tenDemos(),
        row(discarded('otro')),
        row(discarded('otra-propuesta')),
        row({ expiresAt: daysAfter(NOW, -3) }),
      ];
      const { outcomes, funnel } = metrics(rows);

      expect(
        outcomes.active +
          outcomes.expired +
          outcomes.discarded +
          outcomes.otraPropuesta +
          outcomes.converted,
      ).toBe(funnel.created);
    });
  });

  describe('tiempos e interés', () => {
    it('mediana de días hasta la primera visita y hasta la conversión', () => {
      const timing = metrics([
        row(opened(1, 1)),
        row(opened(1, 2)),
        row({ ...opened(1, 0.5), ...converted(3) }),
        row({ ...opened(1, 10), ...converted(8) }),
        row(),
      ]).timing;

      // Visitas a los 0,5 / 1 / 2 / 10 días: mediana entre 1 y 2.
      expect(timing.medianDaysToFirstVisit).toBe(1.5);
      expect(timing.medianDaysToConversion).toBe(5.5);
    });

    it('con una cantidad impar toma la del medio', () => {
      expect(
        metrics([row(opened(1, 1)), row(opened(1, 7)), row(opened(1, 2))]).timing
          .medianDaysToFirstVisit,
      ).toBe(2);
    });

    it('promedia las visitas solo entre las abiertas y las extensiones entre todas', () => {
      const engagement = metrics([
        row({ ...opened(4), extensionCount: 1 }),
        row({ ...opened(5), extensionCount: 2 }),
        row(),
      ]).engagement;

      expect(engagement.avgVisitsPerOpenedDemo).toBe(4.5);
      expect(engagement.avgExtensions).toBe(1);
    });

    it('redondea los promedios a dos decimales', () => {
      expect(
        metrics([row({ extensionCount: 1 }), row(), row()]).engagement.avgExtensions,
      ).toBe(0.33);
    });
  });

  describe('agrupar', () => {
    it('por rubro: cada grupo con su embudo, sin distinguir mayúsculas ni espacios', () => {
      const groups = metrics(
        [
          row({ ...opened(1), ...converted() }),
          row({ industry: ' Pastelería ' }),
          row({ industry: 'construcción', ...opened(2) }),
          row({ industry: null }),
          row({ industry: '' }),
        ],
        'industry',
      ).groups;

      expect(groups).toEqual([
        {
          key: 'pastelería',
          label: 'pastelería',
          funnel: {
            created: 2,
            opened: 1,
            converted: 1,
            openRate: 0.5,
            conversionRate: 0.5,
            conversionRateOfOpened: 1,
          },
        },
        {
          key: 'construcción',
          label: 'construcción',
          funnel: expect.objectContaining({ created: 1, opened: 1 }) as unknown,
        },
        {
          key: null,
          label: 'Sin rubro',
          funnel: expect.objectContaining({ created: 2 }) as unknown,
        },
      ]);
    });

    it('por kit: la vacía o duplicada queda en su propio grupo, al final', () => {
      const groups = metrics(
        [
          row({ templateId: null }),
          row({ templateId: 'spa' }),
          row({ templateId: 'spa' }),
        ],
        'template',
      ).groups;

      expect(
        groups.map((group) => [group.key, group.label, group.funnel.created]),
      ).toEqual([
        ['spa', 'spa', 2],
        [null, 'Sin kit (vacía o duplicada)', 1],
      ]);
    });

    it('por vendedor: una persona y una clave con el mismo nombre no se mezclan', () => {
      const groups = metrics(
        [
          row({ creator: { type: 'admin', name: 'Pau' }, ...converted() }),
          row({ creator: { type: 'admin', name: 'Pau' } }),
          row({ creator: { type: 'apiKey', name: 'Pau' } }),
          row({ creator: { type: 'admin', name: 'Ale' } }),
        ],
        'creator',
      ).groups;

      expect(
        groups.map((group) => [group.key, group.label, group.funnel.converted]),
      ).toEqual([
        ['admin:Pau', 'Pau', 1],
        ['admin:Ale', 'Ale', 0],
        ['apiKey:Pau', 'Pau (clave de acceso)', 0],
      ]);
    });

    it('por mes: en hora de Chile y con todos los meses del rango, también los vacíos', () => {
      const groups = metrics(
        [
          // 23:00 del 31 de marzo en Chile: es de marzo aunque en UTC ya sea abril.
          row({ createdAt: new Date('2026-04-01T02:00:00Z') }),
          row({ createdAt: new Date('2026-05-15T15:00:00Z'), ...opened(1) }),
        ],
        'month',
        { from: '2026-02-20', to: '2026-05-31' },
      ).groups;

      expect(groups.map((group) => [group.key, group.funnel.created])).toEqual([
        ['2026-02', 0],
        ['2026-03', 1],
        ['2026-04', 0],
        ['2026-05', 1],
      ]);
    });

    it('los grupos suman el total', () => {
      const rows = [
        ...tenDemos(),
        row({ industry: 'spa', ...opened(1) }),
        row({ industry: null }),
      ];
      const result = metrics(rows, 'industry');

      const sum = (key: 'created' | 'opened' | 'converted'): number =>
        result.groups.reduce((total, group) => total + group.funnel[key], 0);
      expect(sum('created')).toBe(result.funnel.created);
      expect(sum('opened')).toBe(result.funnel.opened);
      expect(sum('converted')).toBe(result.funnel.converted);
    });

    it('sin groupBy no hay grupos', () => {
      expect(metrics(tenDemos()).groups).toEqual([]);
    });
  });

  describe('rango', () => {
    it('sin fechas, los últimos 90 días contando hoy, en hora de Chile', () => {
      // 23:30 del 25 en Chile: "hoy" todavía es el 25, aunque en UTC ya sea el 26.
      const lateNight = new Date('2026-09-26T02:30:00Z');

      expect(resolveDemoMetricsRange({}, lateNight)).toEqual({
        from: '2026-06-28',
        to: '2026-09-25',
      });
    });

    it('solo con to, los 90 días que terminan ese día', () => {
      expect(resolveDemoMetricsRange({ to: '2026-03-31' }, NOW)).toEqual({
        from: '2026-01-01',
        to: '2026-03-31',
      });
    });

    it('solo con from, hasta hoy; si from es futuro, solo ese día', () => {
      expect(resolveDemoMetricsRange({ from: '2026-09-01' }, NOW)).toEqual({
        from: '2026-09-01',
        to: '2026-09-26',
      });
      expect(resolveDemoMetricsRange({ from: '2027-01-01' }, NOW)).toEqual({
        from: '2027-01-01',
        to: '2027-01-01',
      });
    });

    it('cubre desde que empieza from hasta que termina to, en hora de Chile', () => {
      expect(demoMetricsWindow({ from: '2026-07-01', to: '2026-07-31' })).toEqual({
        start: new Date('2026-07-01T04:00:00.000Z'),
        end: new Date('2026-08-01T04:00:00.000Z'),
      });
    });
  });
});
