import { isValidTimeZone, localDayKey } from './localDay';

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
