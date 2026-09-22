// Zona horaria por defecto de la plataforma: los clientes venden en Chile.
export const DEFAULT_TIME_ZONE = 'America/Santiago';

// Una zona horaria inválida haría fallar el reporte entero; se valida antes de usarla.
export const isValidTimeZone = (timeZone: string): boolean => {
  try {
    new Intl.DateTimeFormat('en-CA', { timeZone });
    return true;
  } catch {
    return false;
  }
};

// El día en que ocurrió una venta según el reloj de la tienda, no según UTC: una venta a las
// 22:00 en Chile ya es el día siguiente en UTC, y el reporte la mostraría en el día equivocado.
export const localDayKey = (date: Date, timeZone: string): string =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
