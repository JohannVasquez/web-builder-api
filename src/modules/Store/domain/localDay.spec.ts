import { isValidTimeZone, localDayKey, localDayStart, shiftDayKey } from './localDay';

describe('localDayKey', () => {
  it('una venta a las 22:00 en Chile cuenta en ese día, no en el siguiente', () => {
    const tenPmInChile = new Date('2026-09-23T01:00:00.000Z');

    expect(localDayKey(tenPmInChile, 'America/Santiago')).toBe('2026-09-22');
    expect(localDayKey(tenPmInChile, 'UTC')).toBe('2026-09-23');
  });

  it('respeta el cambio de hora sin necesidad de calcular el desfase a mano', () => {
    expect(localDayKey(new Date('2026-01-15T02:30:00.000Z'), 'America/Santiago')).toBe(
      '2026-01-14',
    );
  });
});

describe('isValidTimeZone', () => {
  it('acepta zonas IANA y rechaza lo inventado', () => {
    expect(isValidTimeZone('America/Santiago')).toBe(true);
    expect(isValidTimeZone('Marte/Olympus')).toBe(false);
  });
});

describe('localDayStart', () => {
  it('un día de invierno empieza a medianoche de Chile, que son las 04:00 UTC', () => {
    expect(localDayStart('2026-07-01', 'America/Santiago').toISOString()).toBe(
      '2026-07-01T04:00:00.000Z',
    );
  });

  it('un día de verano empieza a las 03:00 UTC', () => {
    expect(localDayStart('2026-01-15', 'America/Santiago').toISOString()).toBe(
      '2026-01-15T03:00:00.000Z',
    );
  });

  it('el día en que se adelanta la hora empieza a la 01:00: las 00:00 no existen', () => {
    const start = localDayStart('2026-09-06', 'America/Santiago');

    expect(start.toISOString()).toBe('2026-09-06T04:00:00.000Z');
    expect(localDayKey(new Date(start.getTime() - 1), 'America/Santiago')).toBe(
      '2026-09-05',
    );
  });

  it('el día en que se atrasa la hora empieza después de la hora repetida', () => {
    const start = localDayStart('2026-04-05', 'America/Santiago');

    expect(start.toISOString()).toBe('2026-04-05T04:00:00.000Z');
    expect(localDayKey(new Date(start.getTime() - 1), 'America/Santiago')).toBe(
      '2026-04-04',
    );
  });

  it('funciona igual en UTC', () => {
    expect(localDayStart('2026-03-01', 'UTC').toISOString()).toBe(
      '2026-03-01T00:00:00.000Z',
    );
  });
});

describe('shiftDayKey', () => {
  it('cruza meses, años bisiestos y retrocede', () => {
    expect(shiftDayKey('2028-02-28', 1)).toBe('2028-02-29');
    expect(shiftDayKey('2026-12-31', 1)).toBe('2027-01-01');
    expect(shiftDayKey('2026-09-26', -89)).toBe('2026-06-29');
  });
});
