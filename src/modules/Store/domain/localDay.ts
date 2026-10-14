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

const MINUTE_MS = 60_000;
// Ninguna zona se aleja más de 14 horas de UTC: el día local empieza dentro de este margen
// alrededor de la medianoche UTC del mismo día.
const DAY_SEARCH_MARGIN_MS = 18 * 60 * MINUTE_MS;

// El instante en que empieza un día (`YYYY-MM-DD`) según el reloj local. No siempre es la
// medianoche: en Chile, el día en que se adelanta la hora empieza a la 01:00, porque las 00:00
// no existen. Se busca el primer minuto que ya es ese día en vez de calcular el desfase, que
// cambia justo en esos bordes.
export const localDayStart = (dayKey: string, timeZone: string): Date => {
  const utcMidnight = Date.parse(`${dayKey}T00:00:00.000Z`);
  let before = (utcMidnight - DAY_SEARCH_MARGIN_MS) / MINUTE_MS;
  let atOrAfter = (utcMidnight + DAY_SEARCH_MARGIN_MS) / MINUTE_MS;
  while (atOrAfter - before > 1) {
    const middle = Math.floor((before + atOrAfter) / 2);
    if (localDayKey(new Date(middle * MINUTE_MS), timeZone) < dayKey) {
      before = middle;
    } else {
      atOrAfter = middle;
    }
  }
  return new Date(atOrAfter * MINUTE_MS);
};

// Suma días de calendario a un día `YYYY-MM-DD`, sin pasar por ninguna zona horaria.
export const shiftDayKey = (dayKey: string, days: number): string => {
  const date = new Date(`${dayKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};
