/**
 * Embudo Único Canónico para Registros Diarios (DailyRecord + Trip + Expense)
 * Garantiza que tanto ArqueoGeneralScreen (Ayudante en vivo) como CargaHistoricaScreen
 * (Regularización de cuadernos) construyan y almacenen exactamente la misma estructura
 * de datos bajo las mismas reglas de negocio.
 */

export interface CanonicalTripInput {
  routeFrom?: string | null;
  routeTo?: string | null;
  time?: string | null;
  income?: number | string | null;
  efectivoReal?: number | string | null;
  boletos?: number | string | null;
  cajaComunPasajeros?: number | string | null;
  cajaComunMonto?: number | string | null;
  tipo?: 'frecuencia' | 'no_realizada' | 'ingreso_especial' | string | null;
  motivo?: string | null;
  notaEspecial?: string | null;
  isNoRealizada?: boolean;
  isIngresoEspecial?: boolean;
}

export interface CanonicalExpenseInput {
  description?: string | null;
  amount?: number | string | null;
}

export interface CanonicalRecordInput {
  date: string;
  kmInicial?: string | number | null;
  kmFinal?: string | number | null;
  km?: string | number | null;
  busId?: string | null;
  numeroDisco?: string | null;
  placaBus?: string | null;
  conductorNombre?: string | null;
  ayudanteNombre?: string | null;
  vtCode?: string | null;
  trips: CanonicalTripInput[];
  expenses: CanonicalExpenseInput[];
  tickets?: number | string | null;
  cajaComun?: number | string | null;
  sobrante?: number | string | null;
  photoUrl?: string | null;
  odometroEstado?: string;
  odometroKmTeorico?: number;
  odometroDesfaseKm?: number | null;
  odometroMotivoDesfase?: string;
}

export interface CanonicalTripPayload {
  routeFrom: string;
  routeTo: string;
  time: string | null;
  income: number;
  efectivoReal: number;
  boletos: number;
  cajaComunPasajeros: number;
  cajaComunMonto: number;
  tipo: string;
  motivo: string | null;
  notaEspecial: string | null;
}

export interface CanonicalExpensePayload {
  description: string;
  amount: number;
}

export interface CanonicalRecordPayload {
  date: string;
  km: string | null;
  kmInicial: string | null;
  kmFinal: string | null;
  conductor: string;
  ayudanteNombre: string | null;
  vtCode: string | null;
  busId: string;
  numeroDisco: string;
  placaBus?: string;
  trips: CanonicalTripPayload[];
  expenses: CanonicalExpensePayload[];
  tickets: number;
  cajaComun: number;
  sobrante: number;
  photoUrl: string | null;
  odometroEstado?: string;
  odometroKmTeorico?: number;
  odometroDesfaseKm?: number | null;
  odometroMotivoDesfase?: string;
}

function toCleanNumber(val: unknown): number {
  if (typeof val === 'number') return Number.isFinite(val) ? val : 0;
  if (typeof val === 'string') {
    const cleaned = val.replace(/,/g, '').trim();
    if (!cleaned) return 0;
    const parsed = parseFloat(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function toCleanOdometroStr(val: unknown): string | null {
  if (val === null || val === undefined) return null;
  const cleaned = String(val).replace(/,/g, '').trim();
  if (!cleaned) return null;
  const numVal = parseFloat(cleaned);
  if (!Number.isFinite(numVal) || numVal <= 0) return null;
  return String(Math.round(numVal * 10) / 10);
}

/**
 * Formatea de manera uniforme el identificador de unidad y conductor:
 * Ej: "BUS-01 - Jimmy Armando Vera Japon" o "BUS-01" si no hay nombre.
 */
export function formatCanonicalConductor(
  numeroDisco: string | null | undefined,
  conductorRaw: string | null | undefined
): string {
  const rawDigits = String(numeroDisco || '01')
    .replace(/^BUS-/i, '')
    .replace(/\D/g, '');
  const cleanDisco = rawDigits ? rawDigits.padStart(2, '0') : '01';
  const busPrefix = `BUS-${cleanDisco}`;

  const trimmed = String(conductorRaw || '').trim();
  if (!trimmed) return busPrefix;

  // Si ya es exactamente "BUS-01", devolver prefijo limpio
  if (trimmed.toUpperCase() === busPrefix) return busPrefix;

  // Si ya empieza con "BUS-XX - Nombre", normalizar prefijo y conservar nombre
  const prefixMatch = trimmed.match(/^BUS-\d+\s*-\s*(.+)$/i);
  if (prefixMatch && prefixMatch[1]) {
    return `${busPrefix} - ${prefixMatch[1].trim()}`;
  }

  // Si empieza con "BUS-XX" sin guion pero con texto adicional
  if (trimmed.toUpperCase().startsWith('BUS-')) {
    return trimmed;
  }

  return `${busPrefix} - ${trimmed}`;
}

/**
 * Calcula de forma canónica kmInicial, kmFinal y el recorrido diario (km).
 * Regla de Oro: `km` SIEMPRE representa los kilómetros recorridos en el día (ej. "518"),
 * NUNCA el tacómetro acumulado total (ej. "897818").
 */
export function resolveCanonicalOdometro(
  kmInicialRaw: unknown,
  kmFinalRaw: unknown,
  kmRecorridoRaw?: unknown
): { kmInicial: string | null; kmFinal: string | null; km: string | null } {
  const kmInicial = toCleanOdometroStr(kmInicialRaw);
  const kmFinal = toCleanOdometroStr(kmFinalRaw);
  const kmExplicit = toCleanOdometroStr(kmRecorridoRaw);

  if (kmInicial && kmFinal) {
    const ini = parseFloat(kmInicial);
    const fin = parseFloat(kmFinal);
    if (fin >= ini && ini > 0) {
      const diff = Math.round((fin - ini) * 10) / 10;
      return {
        kmInicial,
        kmFinal,
        km: String(diff),
      };
    }
  }

  // Si se pasó un recorrido explícito razonable (< 5000 km en un día) y distinto del tacómetro final
  if (kmExplicit) {
    const explicitNum = parseFloat(kmExplicit);
    if (explicitNum >= 0 && explicitNum < 5000 && kmExplicit !== kmFinal) {
      return {
        kmInicial,
        kmFinal,
        km: kmExplicit,
      };
    }
  }

  // Si no hay kmInicial, dejamos km en null para que el servidor lo calcule contra el cierre del día anterior
  return {
    kmInicial,
    kmFinal,
    km: null,
  };
}

/**
 * Construye el payload canónico unificado para POST /api/records y almacenamiento offline.
 */
export function buildCanonicalRecordPayload(
  input: CanonicalRecordInput
): CanonicalRecordPayload {
  const rawDigits = String(input.numeroDisco || input.busId || '01')
    .replace(/^BUS-/i, '')
    .replace(/\D/g, '');
  const cleanDisco = rawDigits ? rawDigits.padStart(2, '0') : '01';
  const cleanBusId = input.busId ? String(input.busId) : `BUS-${cleanDisco}`;

  const { kmInicial, kmFinal, km } = resolveCanonicalOdometro(
    input.kmInicial,
    input.kmFinal,
    input.km
  );

  const conductor = formatCanonicalConductor(cleanDisco, input.conductorNombre);

  const normalizedTrips: CanonicalTripPayload[] = (input.trips || []).map((t) => {
    const isIngresoEspecial =
      t.isIngresoEspecial === true || t.tipo === 'ingreso_especial';
    const isNoRealizada =
      (t.isNoRealizada === true || t.tipo === 'no_realizada') && !isIngresoEspecial;

    const tipo = isIngresoEspecial
      ? 'ingreso_especial'
      : isNoRealizada
      ? 'no_realizada'
      : 'frecuencia';

    const routeFrom = isNoRealizada
      ? '-'
      : String(t.routeFrom || 'Loja').trim() || 'Loja';
    const routeTo = isNoRealizada
      ? '-'
      : String(t.routeTo || 'Vilcabamba').trim() || 'Vilcabamba';

    const efectivoReal = isNoRealizada ? 0 : Math.max(0, toCleanNumber(t.efectivoReal));
    const rawIncome = isNoRealizada ? 0 : Math.max(0, toCleanNumber(t.income));
    // Paridad de ingresos: si no hubo timbrado digital de boletos (rawIncome === 0),
    // income toma el valor de efectivoReal para mantener consistencia en todos los reportes.
    const income = rawIncome > 0 ? rawIncome : efectivoReal;

    const boletos = isNoRealizada ? 0 : Math.max(0, toCleanNumber(t.boletos));
    const cajaComunPasajeros = isNoRealizada
      ? 0
      : Math.max(0, Math.round(toCleanNumber(t.cajaComunPasajeros)));
    const cajaComunMonto = isNoRealizada
      ? 0
      : Math.max(0, toCleanNumber(t.cajaComunMonto));

    return {
      routeFrom,
      routeTo,
      time: t.time ? String(t.time).trim() : null,
      income,
      efectivoReal,
      boletos,
      cajaComunPasajeros,
      cajaComunMonto,
      tipo,
      motivo: isNoRealizada || isIngresoEspecial ? (t.motivo ? String(t.motivo).trim() : 'otro') : null,
      notaEspecial: t.notaEspecial ? String(t.notaEspecial).trim() : null,
    };
  });

  const normalizedExpenses: CanonicalExpensePayload[] = (input.expenses || [])
    .filter((e) => {
      const desc = String(e?.description || '').trim();
      if (!desc) return false;
      const lower = desc.toLowerCase();
      return !lower.startsWith('arrastre déficit') && !lower.startsWith('arrastre deficit');
    })
    .map((e) => ({
      description: String(e.description || '').trim(),
      amount: Math.max(0, toCleanNumber(e.amount)),
    }));

  const calculatedCajaComun = normalizedTrips.reduce(
    (sum, t) => sum + t.cajaComunMonto,
    0
  );
  const cajaComun =
    input.cajaComun !== undefined && input.cajaComun !== null
      ? Math.max(0, toCleanNumber(input.cajaComun))
      : calculatedCajaComun;

  return {
    date: input.date || new Date().toISOString().split('T')[0],
    km,
    kmInicial,
    kmFinal,
    conductor,
    ayudanteNombre: input.ayudanteNombre ? String(input.ayudanteNombre).trim() : null,
    vtCode: input.vtCode ? String(input.vtCode).trim() : null,
    busId: cleanBusId,
    numeroDisco: cleanDisco,
    ...(input.placaBus ? { placaBus: String(input.placaBus) } : {}),
    trips: normalizedTrips,
    expenses: normalizedExpenses,
    tickets: Math.max(0, toCleanNumber(input.tickets)),
    cajaComun,
    sobrante: Math.max(0, toCleanNumber(input.sobrante)),
    photoUrl: input.photoUrl || null,
    ...(input.odometroEstado ? { odometroEstado: input.odometroEstado } : {}),
    ...(input.odometroKmTeorico !== undefined
      ? { odometroKmTeorico: input.odometroKmTeorico }
      : {}),
    ...(input.odometroDesfaseKm !== undefined
      ? { odometroDesfaseKm: input.odometroDesfaseKm }
      : {}),
    ...(input.odometroMotivoDesfase
      ? { odometroMotivoDesfase: input.odometroMotivoDesfase }
      : {}),
  };
}
