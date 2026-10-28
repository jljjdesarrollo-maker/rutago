/**
 * Motor Canónico de Conciliación entre VentaBoleto (PostgreSQL) y Trips de DailyRecord.
 * Garantiza que la columna SISTEMA (income) refleje siempre la suma real de los boletos
 * emitidos en ruta almacenados en la base de datos cuando existen boletos para esa vuelta,
 * y mantenga la paridad (income = efectivoReal) cuando no se emitieron boletos digitales
 * (Modo Papel / Carga Histórica).
 */

export interface VentaBoletoMinimal {
  vtCode?: string | null;
  frecuenciaId?: string | null;
  fecha?: string | null;
  fechaOperacion?: string | null;
  cobrado?: number | null;
  frecuencia?: {
    hora?: string | null;
  } | null;
}

export interface TripMinimal {
  id?: string;
  order?: number;
  time?: string | null;
  income: number;
  efectivoReal: number;
  boletos: number;
  tipo?: string | null;
}

export function normalizeVtCode(code?: string | null): string {
  if (!code) return "";
  const clean = String(code).trim().toUpperCase();
  const m = clean.match(/^VT0*(\d+)$/);
  if (m) return "VT" + parseInt(m[1], 10);
  return clean;
}

export function matchVentasForTrip(
  ventas: VentaBoletoMinimal[],
  recordDate: string,
  recordVtCode: string | null | undefined,
  tripTime: string | null | undefined,
  tripIndexZeroBased: number
): { count: number; sumCobrado: number } {
  const normRecVt = normalizeVtCode(recordVtCode);
  const cleanTime = tripTime ? String(tripTime).trim() : "";

  const matched = ventas.filter((v) => {
    const vDate = v.fechaOperacion || v.fecha || "";
    if (vDate !== recordDate) return false;

    const normVentaVt = normalizeVtCode(v.vtCode);
    if (normRecVt && normVentaVt && normRecVt !== normVentaVt) return false;

    const frecHora = v.frecuencia?.hora ? String(v.frecuencia.hora).trim() : "";
    const frecId = v.frecuenciaId ? String(v.frecuenciaId).trim() : "";

    // 1. Coincidencia exacta por hora de salida programada de la frecuencia
    if (cleanTime && frecHora && cleanTime === frecHora) {
      return true;
    }
    // 2. Coincidencia por sufijo de índice canónico de frecuencia (ej. VT6_frec_2 para tripIndexZeroBased = 2)
    if (!frecHora && frecId.endsWith("_frec_" + tripIndexZeroBased)) {
      return true;
    }
    return false;
  });

  const sumCobrado = parseFloat(
    matched.reduce((acc, v) => acc + (Number(v.cobrado) || 0), 0).toFixed(2)
  );

  return {
    count: matched.length,
    sumCobrado,
  };
}

export function resolveCanonicalTripIncomeFromVentas(
  rawIncome: number,
  rawEfectivoReal: number,
  rawBoletos: number,
  tipo: string | null | undefined,
  matchedVentas: { count: number; sumCobrado: number }
): { income: number; boletos: number; changed: boolean } {
  if (tipo === "no_realizada" && rawEfectivoReal === 0) {
    return { income: 0, boletos: 0, changed: false };
  }

  // Si existen boletos reales en VentaBoleto para esta frecuencia, VentaBoleto es la Fuente Única de Verdad
  if (matchedVentas.count > 0 && matchedVentas.sumCobrado > 0) {
    const income = matchedVentas.sumCobrado;
    const boletos = matchedVentas.count;
    const changed =
      Math.abs((Number(rawIncome) || 0) - income) >= 0.01 ||
      (Number(rawBoletos) || 0) !== boletos;
    return { income, boletos, changed };
  }

  // Si NO existen boletos en VentaBoleto (Modo Papel o Carga Histórica), aplicar paridad si income === 0
  const cleanIncome = Number(rawIncome) || 0;
  const cleanEfectivo = Number(rawEfectivoReal) || 0;
  const cleanBoletos = Number(rawBoletos) || 0;
  const finalIncome = cleanIncome > 0 ? cleanIncome : cleanEfectivo;
  const changed = Math.abs(cleanIncome - finalIncome) >= 0.01;

  return {
    income: finalIncome,
    boletos: cleanBoletos,
    changed,
  };
}
