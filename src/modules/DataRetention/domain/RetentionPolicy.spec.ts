import {
  cutoffFor,
  DEFAULT_RETENTION,
  MINIMUM_ORDER_DAYS,
  resolveRetention,
} from './RetentionPolicy';

describe('resolveRetention', () => {
  it('sin configuración usa los plazos por omisión', () => {
    expect(resolveRetention()).toEqual(DEFAULT_RETENTION);
  });

  it('un cliente puede acortar el plazo de sus mensajes', () => {
    expect(resolveRetention({ contactMessageDays: 90 }).contactMessageDays).toBe(90);
  });

  it('los pedidos no bajan del mínimo tributario, por más que se configure', () => {
    // Borrar un pedido antes de tiempo incumple la normativa tributaria, no la protege.
    expect(resolveRetention({ orderDays: 30 }).orderDays).toBe(MINIMUM_ORDER_DAYS);
  });

  it('un plazo de cero o negativo no borra todo de inmediato', () => {
    expect(resolveRetention({ contactMessageDays: 0 }).contactMessageDays).toBe(1);
    expect(resolveRetention({ contactMessageDays: -30 }).contactMessageDays).toBe(1);
  });

  it('un valor que no es un número se ignora en vez de romper el proceso', () => {
    expect(resolveRetention({ contactMessageDays: Number.NaN }).contactMessageDays).toBe(
      DEFAULT_RETENTION.contactMessageDays,
    );
  });

  it('un plazo absurdamente largo se acota', () => {
    expect(resolveRetention({ contactMessageDays: 999_999 }).contactMessageDays).toBe(
      365 * 20,
    );
  });
});

describe('cutoffFor', () => {
  it('calcula la fecha desde la que algo ya está vencido', () => {
    const now = new Date('2026-09-22T12:00:00.000Z');

    expect(cutoffFor(30, now).toISOString()).toBe('2026-08-23T12:00:00.000Z');
  });
});
