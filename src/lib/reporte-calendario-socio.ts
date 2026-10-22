/**
 * @file src/lib/reporte-calendario-socio.ts
 * Motor Canónico de Negocio para el Reporte de Ventanas de Calendario del Socio (7, 15 y 30 días).
 * Calcula cobertura de arqueos, costo por km de combustible, lucro cesante,
 * anonimización alfabética (#T-A, #T-B...) y dictamen ejecutivo determinista.
 */

export interface ReporteUnidadMetrics {
  diasCalendario: number;
  diasConRegistro: number;
  diasFaltantes: number;
  coberturaPorcentaje: number;
  ingresosTotales: number;
  frecuenciasProgramadas: number;
  frecuenciasRealizadas: number;
  frecuenciasNoRealizadas: number;
  cumplimientoPorcentaje: number;
  dieselTotal: number;
  kmValidosTotales: number;
  diasConKmValido: number;
  costoPorKm: number; // $ diésel / km real
  ingresoPorKm: number; // $ producción / km real
  margenNetoPorKm: number; // ($ producción - $ diésel) / km real
  lucroCesanteVueltas: number; // $ dejado de percibir por vueltas no realizadas
}

export interface DiagnosticoFinancieroItem {
  id: 'pasajes_lider' | 'diesel_media' | 'faltantes_caja' | 'vueltas_caidas' | 'cuadernos_baches';
  titulo: string;
  tipo: 'positivo' | 'alerta' | 'oportunidad' | 'neutro';
  badgeColor: 'emerald' | 'blue' | 'amber' | 'rose';
  impactoDolares?: number;
  mensajeCorto: string;
}

export interface UnidadAnonimaBenchmark {
  codigoAnonimo: string; // ej. #T-A, #T-B
  esTuUnidad: boolean;
  discoOriginal?: string;
  produccionTotal: number;
  cumplimientoPorcentaje: number;
  costoPorKm: number;
  diasConRegistro: number;
  vueltasRealizadas: number;
  promedioPorVuelta: number;
  coberturaParcial: boolean; // true si diasConRegistro < 60% de la ventana
  posicion: number;
  medalla?: '🥇' | '🥈' | '🥉';
}

export interface DictamenEjecutivo {
  nivel: 'EXCELENTE' | 'BUENO' | 'ALERTA_OPERATIVA' | 'ALERTA_MECANICA' | 'COBERTURA_CRITICA';
  titulo: string;
  badgeColor: 'emerald' | 'blue' | 'amber' | 'rose';
  icon: string;
  resumen: string;
  recomendaciones: string[];
}

export interface BulletChartMetrics {
  minCostoKm: number;
  mediaCostoKm: number;
  maxCostoKm: number;
  tuCostoKm: number;
  diferenciaPorcentualVsMedia: number; // Ej. -8.5% (ahorro) o +12.0% (sobrecosto)
}

export type ModoAuditoriaSocio = '15_DIAS' | 'MES_ANTERIOR' | 'MES_ACTUAL' | 'PERSONALIZADO';

export interface RangoAuditoriaResultado {
  fechaInicio: string;
  fechaFin: string;
  diasVentana: number;
  todasLasFechas: string[];
  modo: ModoAuditoriaSocio;
  label: string;
  descripcionPeriodo: string;
  esPeriodoCerrado: boolean;
}

export interface ReporteSocioPayload {
  ventana: {
    dias: number;
    fechaInicio: string;
    fechaFin: string;
    modo?: ModoAuditoriaSocio;
    label?: string;
    descripcionPeriodo?: string;
    esPeriodoCerrado?: boolean;
  };
  busActual: {
    id: string;
    numeroDisco: string;
    tipoOperacion: string; // TRONCAL_VT | ALIMENTADOR_P
  };
  unidadSocio: ReporteUnidadMetrics & { disco: string };
  mediaCooperativa: {
    unidadesConCoberturaSuficiente: number;
    costoPorKmPromedio: number;
    cumplimientoPromedio: number;
    produccionPorDiaPromedio: number;
  };
  bulletChart: BulletChartMetrics;
  rankingAnonimo: UnidadAnonimaBenchmark[];
  diagnosticoPrivadoSocio: DiagnosticoFinancieroItem[];
  fechasSinRegistro: string[];
  dictamen: DictamenEjecutivo;
  timestamp: string;
}

export interface ReporteCalendarioSnapshot {
  busId: string;
  ventanaDias: number | string;
  payload: ReporteSocioPayload;
  cachedAt: string;
}

/**
 * Convierte un índice numérico secuencial en letras del alfabeto:
 * 0 -> A, 1 -> B, ..., 25 -> Z, 26 -> AA, 27 -> AB
 */
export function convertirIndiceALetra(indice: number): string {
  let resultado = '';
  let temp = indice;
  while (temp >= 0) {
    resultado = String.fromCharCode((temp % 26) + 65) + resultado;
    temp = Math.floor(temp / 26) - 1;
  }
  return resultado;
}

/**
 * Extrae el gasto de diésel / combustible de la lista de egresos de una jornada
 */
export function calcularGastoDiesel(expenses: Array<{ description?: string | null; amount?: number | null }>): number {
  if (!Array.isArray(expenses) || expenses.length === 0) return 0;
  return expenses.reduce((acc, exp) => {
    const desc = (exp?.description || '').toLowerCase();
    if (desc.includes('diesel') || desc.includes('diésel') || desc.includes('combustible')) {
      const amt = Number(exp?.amount) || 0;
      return acc + (amt > 0 ? amt : 0);
    }
    return acc;
  }, 0);
}

/**
 * Extrae los kilómetros recorridos reales del día
 * Validación estricta: sólo recorridos diarios lógicos entre 1 y 1200 km
 */
export function extraerKmRecorridos(rec: {
  km?: string | number | null;
  kmInicial?: string | number | null;
  kmFinal?: string | number | null;
}): number {
  if (rec.kmFinal !== undefined && rec.kmFinal !== null && rec.kmInicial !== undefined && rec.kmInicial !== null) {
    const kF = Number(rec.kmFinal);
    const kI = Number(rec.kmInicial);
    if (!isNaN(kF) && !isNaN(kI)) {
      const delta = kF - kI;
      if (delta > 0 && delta <= 1200) return Math.round(delta * 10) / 10;
    }
  }
  const kDirecto = Number(rec.km);
  if (!isNaN(kDirecto) && kDirecto > 0 && kDirecto <= 1200) {
    return Math.round(kDirecto * 10) / 10;
  }
  return 0;
}

/**
 * Genera el arreglo de todas las fechas YYYY-MM-DD en la ventana fija de calendario
 */
/**
 * Formatea una fecha local en YYYY-MM-DD sin desfasaje por huso horario UTC
 */
function formatearFechaLocalIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const NOMBRES_MESES_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

/**
 * Motor Canónico de Resolución de Ventanas de Auditoría del Socio:
 * 1. '15_DIAS' (Rueda VT): Ciclo completo de turnos (últimos 15 días cerrados).
 * 2. 'MES_ANTERIOR': Período 100% cerrado y conciliado (del 1 al último día del mes pasado).
 * 3. 'MES_ACTUAL': Cierre parcial en marcha (del 1 al corte de ayer).
 * 4. 'PERSONALIZADO': Selector libre con blindaje estricto de máximo 60 días y corte a ayer.
 */
export function calcularRangoAuditoriaSocio(
  modo: ModoAuditoriaSocio | number | string,
  opciones?: {
    fechaInicio?: string;
    fechaFin?: string;
    fechaBaseReferencia?: string;
  }
): RangoAuditoriaResultado {
  let hoy: Date;
  if (opciones?.fechaBaseReferencia) {
    hoy = new Date(opciones.fechaBaseReferencia + 'T12:00:00');
  } else {
    hoy = new Date();
  }

  // Ayer (corte estricto de jornada cerrada)
  const ayer = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - 1, 12, 0, 0);
  const ayerIso = formatearFechaLocalIso(ayer);

  // Normalización defensiva de modo
  let modoNormalizado: ModoAuditoriaSocio = '15_DIAS';
  if (modo === 'MES_ANTERIOR' || modo === 'MES_ACTUAL' || modo === 'PERSONALIZADO' || modo === '15_DIAS') {
    modoNormalizado = modo;
  } else if (modo === 30 || modo === '30') {
    modoNormalizado = 'MES_ANTERIOR';
  } else if (modo === 7 || modo === '7') {
    modoNormalizado = '15_DIAS';
  }

  let fechaInicio = '';
  let fechaFin = '';
  let label = '';
  let descripcionPeriodo = '';
  let esPeriodoCerrado = true;

  if (modoNormalizado === '15_DIAS') {
    const fin = new Date(ayer);
    const ini = new Date(ayer);
    ini.setDate(fin.getDate() - 14); // 15 días exactos
    fechaFin = formatearFechaLocalIso(fin);
    fechaInicio = formatearFechaLocalIso(ini);
    label = '15 Días (Rueda VT)';
    descripcionPeriodo = `Últimos 15 días cerrados (${fechaInicio} — ${fechaFin}) • Ciclo completo de turnos`;
    esPeriodoCerrado = true;
  } else if (modoNormalizado === 'MES_ANTERIOR') {
    const añoActual = hoy.getFullYear();
    const mesActual = hoy.getMonth(); // 0 = Ene, 11 = Dic
    const añoAnt = mesActual === 0 ? añoActual - 1 : añoActual;
    const mesAnt = mesActual === 0 ? 11 : mesActual - 1;

    const primerDia = new Date(añoAnt, mesAnt, 1, 12, 0, 0);
    const ultimoDia = new Date(añoAnt, mesAnt + 1, 0, 12, 0, 0);

    fechaInicio = formatearFechaLocalIso(primerDia);
    fechaFin = formatearFechaLocalIso(ultimoDia);
    label = 'Mes Anterior';
    descripcionPeriodo = `${NOMBRES_MESES_ES[mesAnt]} ${añoAnt} (${primerDia.getDate()} al ${ultimoDia.getDate()}) • Período cerrado 100% conciliado`;
    esPeriodoCerrado = true;
  } else if (modoNormalizado === 'MES_ACTUAL') {
    const añoActual = hoy.getFullYear();
    const mesActual = hoy.getMonth();
    const primerDia = new Date(añoActual, mesActual, 1, 12, 0, 0);
    fechaInicio = formatearFechaLocalIso(primerDia);

    // Si hoy es el día 1 del mes, ayer es del mes previo, así que se fija en el día 1
    if (hoy.getDate() === 1) {
      fechaFin = fechaInicio;
    } else {
      fechaFin = ayerIso;
    }
    label = 'Mes en Curso';
    const diaFinNum = new Date(fechaFin + 'T12:00:00').getDate();
    descripcionPeriodo = `1 al ${diaFinNum} de ${NOMBRES_MESES_ES[mesActual]} ${añoActual} • Cierre parcial en marcha (corte a ayer)`;
    esPeriodoCerrado = false;
  } else if (modoNormalizado === 'PERSONALIZADO') {
    let fIni = opciones?.fechaInicio || '';
    let fFin = opciones?.fechaFin || ayerIso;

    // Blindaje anti-futuro
    if (fFin > ayerIso) fFin = ayerIso;
    if (!fIni || fIni > fFin) {
      const defaultIni = new Date(new Date(fFin + 'T12:00:00').getTime() - 29 * 86400000);
      fIni = formatearFechaLocalIso(defaultIni);
    }

    // Blindaje de seguridad: máximo 60 días
    const dIni = new Date(fIni + 'T12:00:00');
    const dFin = new Date(fFin + 'T12:00:00');
    const diffDias = Math.round((dFin.getTime() - dIni.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    if (diffDias > 60) {
      const maxIni = new Date(dFin);
      maxIni.setDate(dFin.getDate() - 59); // 60 días en total
      fIni = formatearFechaLocalIso(maxIni);
    }

    fechaInicio = fIni;
    fechaFin = fFin;
    label = 'Personalizado';
    const diasTotal = Math.round((new Date(fechaFin + 'T12:00:00').getTime() - new Date(fechaInicio + 'T12:00:00').getTime()) / (1000 * 60 * 60 * 24)) + 1;
    descripcionPeriodo = `Rango seleccionado: ${fechaInicio} al ${fechaFin} (${diasTotal} días • Máx. 60)`;
    esPeriodoCerrado = fechaFin <= ayerIso;
  }

  // Mapear todas las fechas secuenciales
  const todasLasFechas: string[] = [];
  const curr = new Date(fechaInicio + 'T12:00:00');
  const end = new Date(fechaFin + 'T12:00:00');
  while (curr <= end) {
    todasLasFechas.push(formatearFechaLocalIso(curr));
    curr.setDate(curr.getDate() + 1);
  }

  const diasVentana = todasLasFechas.length;

  return {
    fechaInicio,
    fechaFin,
    diasVentana,
    todasLasFechas,
    modo: modoNormalizado,
    label,
    descripcionPeriodo,
    esPeriodoCerrado,
  };
}

/**
 * Genera el arreglo de todas las fechas YYYY-MM-DD en la ventana fija de calendario.
 * REGLA DE NEGOCIO CANÓNICA (TRANSPORTE):
 * Por defecto, la ventana se ancla estrictamente en la última jornada operativa cerrada (Ayer: T - 1),
 * dado que los buses operan hasta altas horas y el 50% de los socios duerme fuera de base,
 * entregando el arqueo de caja al día siguiente.
 */
export function generarRangoFechasCalendario(diasVentana: number, fechaBaseReferencia?: string): {
  fechaInicio: string;
  fechaFin: string;
  todasLasFechas: string[];
} {
  let base: Date;
  if (fechaBaseReferencia) {
    base = new Date(fechaBaseReferencia + 'T12:00:00');
  } else {
    const hoy = new Date();
    base = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - 1, 12, 0, 0);
  }
  const fechaFin = formatearFechaLocalIso(base);

  const inicio = new Date(base);
  inicio.setDate(base.getDate() - (diasVentana - 1));
  const fechaInicio = formatearFechaLocalIso(inicio);

  const todasLasFechas: string[] = [];
  const curr = new Date(fechaInicio + 'T12:00:00');
  const end = new Date(fechaFin + 'T12:00:00');

  while (curr <= end) {
    todasLasFechas.push(formatearFechaLocalIso(curr));
    curr.setDate(curr.getDate() + 1);
  }

  return { fechaInicio, fechaFin, todasLasFechas };
}

/**
 * Motor Principal de Procesamiento y Cálculo del Reporte de Calendario
 */
export function procesarReporteCalendarioSocio(params: {
  diasVentana: number;
  fechaInicio: string;
  fechaFin: string;
  busDisco: string;
  tipoCircuito?: string;
  registros: any[];
  totalFlota?: number;
}): ReporteSocioPayload {
  const { diasVentana, fechaInicio, fechaFin, busDisco, tipoCircuito = 'TRONCAL_VT', registros } = params;
  const cleanDisco = busDisco.replace(/\D/g, '').padStart(2, '0');
  const prefixAnonimo = tipoCircuito === 'ALIMENTADOR_P' ? 'A' : 'T';

  // 1. Mapeo del calendario
  const todasLasFechas: string[] = [];
  const curr = new Date(fechaInicio + 'T12:00:00');
  const end = new Date(fechaFin + 'T12:00:00');
  while (curr <= end) {
    todasLasFechas.push(curr.toISOString().split('T')[0]);
    curr.setDate(curr.getDate() + 1);
  }

  // 2. Extraer registros de la unidad del socio
  const registrosTuUnidad = (registros || []).filter((r) => {
    const cond = String(r?.conductor || '').toUpperCase();
    return cond.startsWith(`BUS-${cleanDisco}`) || cond.includes(`BUS ${cleanDisco}`) || cond === cleanDisco;
  });

  const fechasConRegistroSet = new Set(registrosTuUnidad.map((r) => r.date));
  const fechasSinRegistro = todasLasFechas.filter((f) => !fechasConRegistroSet.has(f));

  // 3. Métricas de Tu Unidad
  let ingresosTotales = 0;
  let frecProgramadas = 0;
  let frecRealizadas = 0;
  let frecNoRealizadas = 0;
  let dieselTotal = 0;
  let kmValidosTotales = 0;
  let diasConKmValido = 0;

  for (const reg of registrosTuUnidad) {
    ingresosTotales += Number(reg?.production) || 0;
    dieselTotal += calcularGastoDiesel(reg?.expenses || []);

    const kmDia = extraerKmRecorridos(reg);
    if (kmDia > 0) {
      kmValidosTotales += kmDia;
      diasConKmValido += 1;
    }

    if (Array.isArray(reg?.trips) && reg.trips.length > 0) {
      for (const t of reg.trips) {
        frecProgramadas += 1;
        if (t?.tipo === 'no_realizada') {
          frecNoRealizadas += 1;
        } else {
          frecRealizadas += 1;
        }
      }
    } else {
      // Si el registro de cuaderno histórico no desglosó vueltas, se toma la base de turno VT (6 vueltas)
      frecProgramadas += 6;
      frecRealizadas += 6;
    }
  }

  const diasConRegistro = registrosTuUnidad.length;
  const coberturaPorcentaje = Math.round((diasConRegistro / diasVentana) * 100);
  const cumplimientoPorcentaje =
    frecProgramadas > 0 ? Math.round((frecRealizadas / frecProgramadas) * 100) : 100;

  // Costo y rendimiento por km estrictamente sobre odómetro válido
  const costoPorKm =
    kmValidosTotales > 0 ? Math.round((dieselTotal / kmValidosTotales) * 1000) / 1000 : 0;
  const ingresoPorKm =
    kmValidosTotales > 0 ? Math.round((ingresosTotales / kmValidosTotales) * 1000) / 1000 : 0;
  const margenNetoPorKm =
    kmValidosTotales > 0
      ? Math.round(((ingresosTotales - dieselTotal) / kmValidosTotales) * 1000) / 1000
      : 0;

  // Lucro cesante ($ dejado de percibir por vueltas perdidas)
  const ingresoPromedioPorFrecuencia =
    frecRealizadas > 0 ? ingresosTotales / frecRealizadas : 40.0;
  const lucroCesanteVueltas = Math.round(frecNoRealizadas * ingresoPromedioPorFrecuencia * 100) / 100;

  // 4. Métricas Anónimas de la Cooperativa (Agrupación por autobús)
  const registrosPorBus: Record<string, any[]> = {};
  for (const r of registros || []) {
    const match = String(r?.conductor || '').match(/BUS-(\d{2})/i);
    const d = match ? match[1] : null;
    if (d) {
      if (!registrosPorBus[d]) registrosPorBus[d] = [];
      registrosPorBus[d].push(r);
    }
  }

  let sumaCostoKmCoop = 0;
  let sumaCumplimientoCoop = 0;
  let sumaProdDiaCoop = 0;
  let unidadesValidasCoop = 0;

  interface BusCalculadoTemp {
    disco: string;
    produccion: number;
    costoKm: number;
    cumplimiento: number;
    diasReg: number;
    vueltasRealizadas: number;
    promedioPorVuelta: number;
    coberturaParcial: boolean;
  }
  const busesCalculados: BusCalculadoTemp[] = [];

  for (const [disco, regs] of Object.entries(registrosPorBus)) {
    const cob = regs.length / diasVentana;
    // REGLA DE INTEGRIDAD: Excluir unidades con menos del 30% de cobertura
    if (cob >= 0.3) {
      let dTotal = 0;
      let kmTotal = 0;
      let pTotal = 0;
      let fProg = 0;
      let fReal = 0;

      for (const r of regs) {
        pTotal += Number(r?.production) || 0;
        dTotal += calcularGastoDiesel(r?.expenses || []);
        const km = extraerKmRecorridos(r);
        if (km > 0) kmTotal += km;

        if (Array.isArray(r?.trips) && r.trips.length > 0) {
          for (const t of r.trips) {
            fProg += 1;
            if (t?.tipo !== 'no_realizada') fReal += 1;
          }
        } else {
          fProg += 6;
          fReal += 6;
        }
      }

      const cKm = kmTotal > 0 ? Math.round((dTotal / kmTotal) * 1000) / 1000 : 0.21;
      const cCumpl = fProg > 0 ? Math.round((fReal / fProg) * 100) : 100;

      if (kmTotal > 0) {
        sumaCostoKmCoop += cKm;
        sumaCumplimientoCoop += cCumpl;
        sumaProdDiaCoop += regs.length > 0 ? pTotal / regs.length : 0;
        unidadesValidasCoop += 1;
      }

      const promVuelta = fReal > 0 ? Math.round((pTotal / fReal) * 100) / 100 : 0;
      const esParcial = regs.length < Math.ceil(diasVentana * 0.6);
      busesCalculados.push({
        disco,
        produccion: Math.round(pTotal * 100) / 100,
        costoKm: cKm,
        cumplimiento: cCumpl,
        diasReg: regs.length,
        vueltasRealizadas: fReal,
        promedioPorVuelta: promVuelta,
        coberturaParcial: esParcial,
      });
    }
  }

  // Asegurar que la unidad del socio esté presente en la comparativa si tiene registros
  if (!busesCalculados.some((b) => b.disco === cleanDisco) && diasConRegistro > 0) {
    const promVueltaTuBus = frecRealizadas > 0 ? Math.round((ingresosTotales / frecRealizadas) * 100) / 100 : 0;
    const esParcialTuBus = diasConRegistro < Math.ceil(diasVentana * 0.6);
    busesCalculados.push({
      disco: cleanDisco,
      produccion: Math.round(ingresosTotales * 100) / 100,
      costoKm: costoPorKm,
      cumplimiento: cumplimientoPorcentaje,
      diasReg: diasConRegistro,
      vueltasRealizadas: frecRealizadas,
      promedioPorVuelta: promVueltaTuBus,
      coberturaParcial: esParcialTuBus,
    });
  }

  const costoPorKmPromedioCoop =
    unidadesValidasCoop > 0
      ? Math.round((sumaCostoKmCoop / unidadesValidasCoop) * 1000) / 1000
      : 0.21;

  const cumplimientoPromedioCoop =
    unidadesValidasCoop > 0
      ? Math.round(sumaCumplimientoCoop / unidadesValidasCoop)
      : 96;

  const produccionPorDiaPromedioCoop =
    unidadesValidasCoop > 0
      ? Math.round(sumaProdDiaCoop / unidadesValidasCoop)
      : 240;

  // 5. Ranking Anónimo Alfabético (#T-A, #T-B, #T-C...)
  // 5. Ranking Anónimo Alfabético (#T-A, #T-B, #T-C...)
  const busesOrdenados = [...busesCalculados].sort((a, b) => b.produccion - a.produccion);

  let peerCounter = 0;
  let podiumCounter = 0;
  const rankingAnonimo: UnidadAnonimaBenchmark[] = busesOrdenados.map((busItem, idx) => {
    const esTuUnidad = busItem.disco === cleanDisco;
    const letra = convertirIndiceALetra(peerCounter);
    peerCounter += 1;

    const codigoAnonimo = esTuUnidad ? `Bus ${cleanDisco} (Tú)` : `Unidad #${prefixAnonimo}-${letra}`;
    
    // Filtro anti-engaño: unidades con muestra parcial (< 60% cobertura) no reciben medalla de podio
    let medalla: '🥇' | '🥈' | '🥉' | undefined = undefined;
    if (!busItem.coberturaParcial && podiumCounter < 3) {
      if (podiumCounter === 0) medalla = '🥇';
      else if (podiumCounter === 1) medalla = '🥈';
      else if (podiumCounter === 2) medalla = '🥉';
      podiumCounter += 1;
    }

    return {
      codigoAnonimo,
      esTuUnidad,
      discoOriginal: esTuUnidad ? cleanDisco : undefined,
      produccionTotal: busItem.produccion,
      cumplimientoPorcentaje: busItem.cumplimiento,
      costoPorKm: busItem.costoKm,
      diasConRegistro: busItem.diasReg,
      vueltasRealizadas: busItem.vueltasRealizadas,
      promedioPorVuelta: busItem.promedioPorVuelta,
      coberturaParcial: busItem.coberturaParcial,
      posicion: idx + 1,
      medalla,
    };
  });

  // 6. Bullet Chart Metrics (Tú vs El Cardumen)
  const costosValidos = busesCalculados.map((b) => b.costoKm).filter((c) => c > 0);
  const minCostoKm = costosValidos.length > 0 ? Math.min(...costosValidos) : 0.17;
  const maxCostoKm = costosValidos.length > 0 ? Math.max(...costosValidos) : 0.26;
  const diffPctVsMedia =
    costoPorKmPromedioCoop > 0
      ? Math.round(((costoPorKm - costoPorKmPromedioCoop) / costoPorKmPromedioCoop) * 1000) / 10
      : 0;

  const bulletChart: BulletChartMetrics = {
    minCostoKm,
    mediaCostoKm: costoPorKmPromedioCoop,
    maxCostoKm,
    tuCostoKm: costoPorKm,
    diferenciaPorcentualVsMedia: diffPctVsMedia,
  };

  // 6.5. Diagnóstico Financiero Privado y Recomendaciones Clave para el Socio en Sesión
  const diagnosticoPrivadoSocio: DiagnosticoFinancieroItem[] = [];
  const vueltasBaseVentana = diasVentana * 6; // 42 en 7d, 90 en 15d, 180 en 30d
  const kmBaseVentana = diasVentana * 280;

  // 1. Brecha en Pasajes vs. Líder del Circuito
  const unidadesConfiables = busesCalculados.filter((b) => !b.coberturaParcial);
  const busLider =
    unidadesConfiables.length > 0
      ? [...unidadesConfiables].sort((a, b) => b.promedioPorVuelta - a.promedioPorVuelta)[0]
      : [...busesCalculados].sort((a, b) => b.promedioPorVuelta - a.promedioPorVuelta)[0];

  const liderPromedioVuelta = busLider ? busLider.promedioPorVuelta : 0;
  const tuPromedioVuelta = frecRealizadas > 0 ? Math.round((ingresosTotales / frecRealizadas) * 100) / 100 : 0;
  const diffVueltaVsLider = Math.round((tuPromedioVuelta - liderPromedioVuelta) * 100) / 100;
  const brechaDolaresLider = Math.round(diffVueltaVsLider * vueltasBaseVentana);

  if (busLider && busLider.disco !== cleanDisco && diffVueltaVsLider < 0) {
    diagnosticoPrivadoSocio.push({
      id: 'pasajes_lider',
      titulo: 'Pasajes vs. Líder de Circuito',
      tipo: 'oportunidad',
      badgeColor: 'amber',
      impactoDolares: brechaDolaresLider,
      mensajeCorto: `Promedias ${tuPromedioVuelta.toFixed(2)}/vuelta vs ${liderPromedioVuelta.toFixed(2)} del líder (-${Math.abs(diffVueltaVsLider).toFixed(2)}/vuelta). En ${vueltasBaseVentana} vueltas dejas de captar ~${Math.abs(brechaDolaresLider)}. Ajusta control de cobro en horas pico.`,
    });
  } else {
    diagnosticoPrivadoSocio.push({
      id: 'pasajes_lider',
      titulo: 'Pasajes vs. Circuito',
      tipo: 'positivo',
      badgeColor: 'emerald',
      impactoDolares: brechaDolaresLider >= 0 ? brechaDolaresLider : 0,
      mensajeCorto: `¡Líder de recaudación! Tu bus promedia ${tuPromedioVuelta.toFixed(2)} por vuelta, superando o igualando a las demás unidades del circuito.`,
    });
  }

  // 2. Eficiencia en Diésel vs. Media Cooperativa
  const diffDieselKm = Math.round((costoPorKm - costoPorKmPromedioCoop) * 1000) / 1000;
  const impactoDieselPeriodo = Math.round(diffDieselKm * kmBaseVentana);

  if (diffDieselKm <= 0) {
    diagnosticoPrivadoSocio.push({
      id: 'diesel_media',
      titulo: 'Eficiencia en Combustible Diésel',
      tipo: 'positivo',
      badgeColor: 'emerald',
      impactoDolares: Math.abs(impactoDieselPeriodo),
      mensajeCorto: `Gastas ${costoPorKm.toFixed(3)}/km vs ${costoPorKmPromedioCoop.toFixed(3)} de la media cooperativa. ¡Felicitaciones! Ahorras ~${Math.abs(impactoDieselPeriodo)} en combustible en el período.`,
    });
  } else {
    diagnosticoPrivadoSocio.push({
      id: 'diesel_media',
      titulo: 'Consumo de Combustible Diésel',
      tipo: 'alerta',
      badgeColor: 'rose',
      impactoDolares: -Math.abs(impactoDieselPeriodo),
      mensajeCorto: `Gastas +${diffDieselKm.toFixed(3)}/km sobre la media (~${Math.abs(impactoDieselPeriodo)} de sobrecosto). Revisa inyectores o hábitos de aceleración del chofer.`,
    });
  }

  // 3. Faltantes de Caja del Ayudante (Descuadres Acumulados)
  const faltantesAyudanteTotal = Math.round(
    registrosTuUnidad.reduce((acc, r) => acc + (Number(r?.sobrante) < 0 ? Math.abs(Number(r?.sobrante)) : 0), 0) * 100
  ) / 100;

  if (faltantesAyudanteTotal > 0) {
    diagnosticoPrivadoSocio.push({
      id: 'faltantes_caja',
      titulo: 'Descuadres de Caja del Ayudante',
      tipo: 'alerta',
      badgeColor: 'rose',
      impactoDolares: -faltantesAyudanteTotal,
      mensajeCorto: `Tu ayudante acumula -${faltantesAyudanteTotal.toFixed(2)} en faltantes de caja en este período. Exige entrega al centavo en cada turno.`,
    });
  } else {
    diagnosticoPrivadoSocio.push({
      id: 'faltantes_caja',
      titulo: 'Descuadres de Caja del Ayudante',
      tipo: 'positivo',
      badgeColor: 'emerald',
      mensajeCorto: `Caja cuadrada sin faltantes reportados por el ayudante en este período.`,
    });
  }

  // 4. Vueltas Caídas (Lucro Cesante)
  if (lucroCesanteVueltas > 0) {
    diagnosticoPrivadoSocio.push({
      id: 'vueltas_caidas',
      titulo: 'Vueltas Caídas (Lucro Cesante)',
      tipo: 'alerta',
      badgeColor: 'amber',
      impactoDolares: -lucroCesanteVueltas,
      mensajeCorto: `${frecNoRealizadas} frecuencia(s) no realizada(s) costaron -${lucroCesanteVueltas.toFixed(2)} en ingresos netos no percibidos. Prioriza puntualidad de salida.`,
    });
  } else {
    diagnosticoPrivadoSocio.push({
      id: 'vueltas_caidas',
      titulo: 'Cumplimiento de Frecuencias',
      tipo: 'positivo',
      badgeColor: 'emerald',
      mensajeCorto: `100% de cumplimiento en ruta. Ninguna vuelta perdida en este período auditado.`,
    });
  }

  // 5. Cuadernos Faltantes del Ayudante (Baches de Registro)
  if (fechasSinRegistro.length > 0) {
    diagnosticoPrivadoSocio.push({
      id: 'cuadernos_baches',
      titulo: 'Auditoría de Cuadernos Diarios',
      tipo: 'alerta',
      badgeColor: 'amber',
      mensajeCorto: `Tienes ${fechasSinRegistro.length} día(s) sin arqueo sincronizado (${diasConRegistro} de ${diasVentana} jornadas). Exige a tu ayudante liquidar los cuadernos pendientes.`,
    });
  } else {
    diagnosticoPrivadoSocio.push({
      id: 'cuadernos_baches',
      titulo: 'Auditoría de Cuadernos Diarios',
      tipo: 'positivo',
      badgeColor: 'emerald',
      mensajeCorto: `Todos los cuadernos al día (${diasConRegistro}/${diasVentana} jornadas cerradas entregadas).`,
    });
  }

  // 7. Dictamen Heurístico Determinista
  const dictamen = generarDictamenEjecutivo({
    coberturaPorcentaje,
    diasFaltantes: fechasSinRegistro.length,
    cumplimientoPorcentaje,
    frecNoRealizadas,
    costoPorKm,
    costoPorKmPromedioCoop,
    kmValidosTotales,
    lucroCesanteVueltas,
  });

  return {
    ventana: {
      dias: diasVentana,
      fechaInicio,
      fechaFin,
    },
    busActual: {
      id: `BUS-${cleanDisco}`,
      numeroDisco: cleanDisco,
      tipoOperacion: tipoCircuito,
    },
    unidadSocio: {
      disco: cleanDisco,
      diasCalendario: diasVentana,
      diasConRegistro,
      diasFaltantes: fechasSinRegistro.length,
      coberturaPorcentaje,
      ingresosTotales: Math.round(ingresosTotales * 100) / 100,
      frecuenciasProgramadas: frecProgramadas,
      frecuenciasRealizadas: frecRealizadas,
      frecuenciasNoRealizadas: frecNoRealizadas,
      cumplimientoPorcentaje,
      dieselTotal: Math.round(dieselTotal * 100) / 100,
      kmValidosTotales: Math.round(kmValidosTotales * 10) / 10,
      diasConKmValido,
      costoPorKm,
      ingresoPorKm,
      margenNetoPorKm,
      lucroCesanteVueltas,
    },
    mediaCooperativa: {
      unidadesConCoberturaSuficiente: unidadesValidasCoop,
      costoPorKmPromedio: costoPorKmPromedioCoop,
      cumplimientoPromedio: cumplimientoPromedioCoop,
      produccionPorDiaPromedio: produccionPorDiaPromedioCoop,
    },
    bulletChart,
    rankingAnonimo,
    diagnosticoPrivadoSocio,
    fechasSinRegistro,
    dictamen,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Generador de Dictamen Determinista basado en 5 Reglas de Negocio
 */
export function generarDictamenEjecutivo(params: {
  coberturaPorcentaje: number;
  diasFaltantes: number;
  cumplimientoPorcentaje: number;
  frecNoRealizadas: number;
  costoPorKm: number;
  costoPorKmPromedioCoop: number;
  kmValidosTotales: number;
  lucroCesanteVueltas: number;
}): DictamenEjecutivo {
  const {
    coberturaPorcentaje,
    diasFaltantes,
    cumplimientoPorcentaje,
    frecNoRealizadas,
    costoPorKm,
    costoPorKmPromedioCoop,
    kmValidosTotales,
    lucroCesanteVueltas,
  } = params;

  // Regla 1: Cobertura Crítica (< 60% de días de calendario)
  if (coberturaPorcentaje < 60) {
    return {
      nivel: 'COBERTURA_CRITICA',
      titulo: '⚠️ Sincronización Incompleta de Tripulación',
      badgeColor: 'rose',
      icon: '📡',
      resumen: `Tu unidad tiene ${diasFaltantes} días sin arqueos reportados en la ventana de calendario (${coberturaPorcentaje}% de cobertura). Los indicadores reflejan solo datos parciales.`,
      recomendaciones: [
        `Exigir al ayudante sincronizar los turnos pendientes conectándose a WiFi o red móvil en terminal.`,
        `Si los arqueos se hicieron en cuaderno de papel, asentarlos mediante la opción "Carga Histórica".`,
      ],
    };
  }

  // Regla 2: Pérdida Operativa de Vueltas (>= 3 no realizadas o cumplimiento < 90%)
  if (frecNoRealizadas >= 3 || cumplimientoPorcentaje < 90) {
    return {
      nivel: 'ALERTA_OPERATIVA',
      titulo: '🚨 Pérdida de Vueltas en Ruta',
      badgeColor: 'amber',
      icon: '⏱️',
      resumen: `Se detectaron ${frecNoRealizadas} frecuencias no realizadas (${cumplimientoPorcentaje}% de cumplimiento), generando un lucro cesante estimado de -$${lucroCesanteVueltas.toFixed(2)}.`,
      recomendaciones: [
        `Auditar en la liquidación de vueltas los motivos reportados (daño mecánico, tráfico o retraso en terminal).`,
        `Si las frecuencias se suspendieron por averías reiteradas, coordinar mantenimiento preventivo urgente.`,
      ],
    };
  }

  // Regla 3: Alerta Mecánica / Sobrecosto de Combustible (> 15% superior a la media de la cooperativa)
  const diffKm =
    costoPorKmPromedioCoop > 0 ? (costoPorKm - costoPorKmPromedioCoop) / costoPorKmPromedioCoop : 0;

  if (kmValidosTotales > 500 && diffKm > 0.15) {
    const sobrecostoPct = Math.round(diffKm * 100);
    return {
      nivel: 'ALERTA_MECANICA',
      titulo: '⛽ Consumo Anormal de Diésel',
      badgeColor: 'amber',
      icon: '🔧',
      resumen: `Tu costo de diésel por km ($${costoPorKm.toFixed(3)}/km) es ${sobrecostoPct}% más alto que la media cooperativa ($${costoPorKmPromedioCoop.toFixed(3)}/km) en el mismo circuito Hino AK.`,
      recomendaciones: [
        `Revisar filtro separador de agua (trampa) y filtro de combustible secundario.`,
        `Calibrar toberas de inyección Denso y verificar presión de inflado (110 PSI en 295/80R22.5).`,
        `Monitorear con el chofer el régimen de revoluciones en subidas pronunciadas hacia Loja.`,
      ],
    };
  }

  // Regla 4: Rendimiento Sobresaliente (Cumplimiento >= 95% y costo <= media)
  if (diffKm <= 0 && cumplimientoPorcentaje >= 95) {
    const ahorroPct = Math.abs(Math.round(diffKm * 100));
    return {
      nivel: 'EXCELENTE',
      titulo: '🏆 Operación de Alta Eficiencia',
      badgeColor: 'emerald',
      icon: '✨',
      resumen: `Operación impecable: Cumplimiento del ${cumplimientoPorcentaje}% y costo de diésel ${
        ahorroPct > 0 ? `${ahorroPct}% más económico que la media cooperativa` : 'óptimo y alineado'
      }.`,
      recomendaciones: [
        `Mantener la rutina preventiva del chofer (engrase de chasis y raches cada 800 km).`,
        `Reconocer el trabajo de la tripulación por su puntualidad y ahorro en ruta.`,
      ],
    };
  }

  // Regla 5: Estable / Conforme a la Norma
  return {
    nivel: 'BUENO',
    titulo: '👍 Operación Estable',
    badgeColor: 'blue',
    icon: '📊',
    resumen: `Tu autobús opera dentro de los rangos normales de la cooperativa. Cobertura del ${coberturaPorcentaje}% y cumplimiento del ${cumplimientoPorcentaje}%.`,
    recomendaciones: [
      `Monitorear el odómetro en el arqueo de hoy para planificar el siguiente cambio de aceite a los 5.000 km.`,
      `Continuar con la sincronización diaria de arqueos al terminar la jornada.`,
    ],
  };
}

/**
 * Persistencia Offline-First en Almacenamiento Local (Snapshot SWR)
 */
export function saveReporteCalendarioSnapshot(busId: string, ventanaDias: number | string, payload: ReporteSocioPayload): void {
  if (typeof window === 'undefined') return;
  try {
    const key = `rg_reporte_calendario_snapshot_${busId}_${ventanaDias}`;
    const snapshot: ReporteCalendarioSnapshot = {
      busId,
      ventanaDias,
      payload,
      cachedAt: new Date().toISOString(),
    };
    localStorage.setItem(key, JSON.stringify(snapshot));
  } catch (e) {
    console.warn('No se pudo guardar snapshot de reporte calendario en localStorage:', e);
  }
}

/**
 * Recuperación Inmediata de Snapshot (0 ms de latencia)
 */
export function getReporteCalendarioSnapshot(busId: string, ventanaDias: number | string): ReporteCalendarioSnapshot | null {
  if (typeof window === 'undefined') return null;
  try {
    const key = `rg_reporte_calendario_snapshot_${busId}_${ventanaDias}`;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
