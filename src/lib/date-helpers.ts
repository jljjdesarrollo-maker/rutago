/**
 * Utilidades de fecha y mes para Rutas, Finanzas y Socio Propietario en RutaGo
 */

/**
 * Obtiene el mes actual en formato YYYY-MM según la hora local
 */
export function getCurrentYearMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Obtiene la fecha actual en formato YYYY-MM-DD según la hora local
 */
export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formatea un string 'YYYY-MM' al nombre en español (ej. 'Agosto 2026')
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
