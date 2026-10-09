/**
 * Utilidades de fecha y mes para Rutas, Finanzas y Socio Propietario en RutaGo
 * Configurado con la zona horaria oficial del transporte en Ecuador: America/Guayaquil (UTC-5)
 */

export const ECUADOR_TIMEZONE = 'America/Guayaquil';

/**
 * Obtiene la fecha actual en formato YYYY-MM-DD según la zona horaria de Ecuador (America/Guayaquil)
 * Evita el salto prematuro de día provocado por toISOString() en horario nocturno (después de las 19:00).
 */
export function getEcuadorDateString(date: Date = new Date()): string {
  try {
    return date.toLocaleDateString('en-CA', { timeZone: ECUADOR_TIMEZONE });
  } catch {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

/**
 * Obtiene la fecha de ayer en formato YYYY-MM-DD según la zona horaria de Ecuador
 */
export function getEcuadorYesterdayDateString(): string {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  return getEcuadorDateString(yesterday);
}

/**
 * Obtiene la fecha actual en formato YYYY-MM-DD según la hora local de Ecuador
 */
export function getTodayDateString(): string {
  return getEcuadorDateString();
}

/**
 * Obtiene el mes actual en formato YYYY-MM según la hora de Ecuador
 */
export function getCurrentYearMonth(): string {
  const ymd = getEcuadorDateString();
  return ymd.slice(0, 7);
}

/**
 * Formatea un string 'YYYY-MM' al nombre en español (ej. 'Septiembre 2026')
 */
export function formatMonthName(ym: string): string {
  if (!ym || !ym.includes('-')) return ym || '';
  const [year, month] = ym.split('-');
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  const monthIndex = parseInt(month, 10) - 1;
  if (monthIndex < 0 || monthIndex > 11) return ym;
  return `${months[monthIndex]} ${year}`;
}

/**
 * Formatea la fecha actual o una fecha dada a formato completo legible en español
 * Ejemplo: "Viernes, 09 de Octubre de 2026"
 */
export function formatFechaCompletaEcuador(date: Date = new Date()): string {
  try {
    const formatter = new Intl.DateTimeFormat('es-EC', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      timeZone: ECUADOR_TIMEZONE,
    });
    const partes = formatter.format(date);
    // Capitalizar primera letra: "viernes, 09 de octubre de 2026" -> "Viernes, 09 de Octubre de 2026"
    return partes.charAt(0).toUpperCase() + partes.slice(1);
  } catch {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return `${days[date.getDay()]}, ${String(date.getDate()).padStart(2, '0')} de ${months[date.getMonth()]} de ${date.getFullYear()}`;
  }
}
