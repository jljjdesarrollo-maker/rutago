import { type BusItem } from '../types/fleet';
import {
  type BenchmarkPeriod,
  type BenchmarkCircuitGroup,
  type BusBenchmarkMetric,
  type CircuitGroupBenchmark,
  type FleetBenchmarkSummary,
  type ComparativaMedia,
} from '../types/benchmark';

/**
 * Normaliza y deduce a qué unidad física pertenece un registro diario (DailyRecord).
 */
export function resolveRecordBus(record: any, fleet: BusItem[]): BusItem | null {
  if (!record) return null;

  const targetBusId = record.busId ? String(record.busId).toUpperCase().trim() : '';
  const targetDisco = record.numeroDisco ? String(record.numeroDisco).padStart(2, '0') : '';
  const conductorStr = record.conductor ? String(record.conductor).toUpperCase().trim() : '';

  // 1. Coincidencia directa por busId ("BUS-01", "BUS-10")
  if (targetBusId) {
    const found = fleet.find(
      (b) => b.id.toUpperCase() === targetBusId || `BUS-${b.numeroDisco}` === targetBusId
    );
    if (found) return found;
  }

  // 2. Coincidencia por numeroDisco ("01", "10", "16")
  if (targetDisco) {
    const found = fleet.find((b) => b.numeroDisco.padStart(2, '0') === targetDisco);
    if (found) return found;
  }

  // 3. Coincidencia por campo conductor estructurado ("BUS-01", "BUS-16", o solo número)
  if (conductorStr) {
    const busMatch = conductorStr.match(/^BUS-(\d{1,2})$/i);
    if (busMatch) {
      const disco = busMatch[1].padStart(2, '0');
      const found = fleet.find((b) => b.numeroDisco.padStart(2, '0') === disco);
      if (found) return found;
    }
    const pureNumberMatch = conductorStr.match(/^(\d{1,2})$/);
    if (pureNumberMatch) {
      const disco = pureNumberMatch[1].padStart(2, '0');
      const found = fleet.find((b) => b.numeroDisco.padStart(2, '0') === disco);
      if (found) return found;
    }
  }

  // 4. Regla de Oro / Fallback Histórico:
  // Los registros antiguos sin busId ni marca de bus pertenecen a la Unidad Piloto 01 del Socio Líder
  const bus01 = fleet.find((b) => b.numeroDisco === '01' || b.id === 'BUS-01');
  return bus01 || fleet[0] || null;
}

/**
 * Filtra registros por el período seleccionado.
 */
export function filterRecordsByPeriod(
  records: any[],
  period: BenchmarkPeriod,
  customRange?: { from: string; to: string }
): {
  filtered: any[];
  fromDate: string;
  toDate: string;
  daysCount: number;
  periodoLabel: string;
} {
  const now = new Date();
  const formatYMD = (d: Date) => d.toISOString().split('T')[0];
  const todayStr = formatYMD(now);

  let fromDate = todayStr;
  let toDate = todayStr;
  let periodoLabel = 'Jornada de Hoy';

  switch (period) {
    case 'HOY':
      fromDate = todayStr;
      toDate = todayStr;
      periodoLabel = 'Hoy';
      break;
    case '7_DIAS': {
      const past7 = new Date(now);
      past7.setDate(past7.getDate() - 6);
      fromDate = formatYMD(past7);
      toDate = todayStr;
      periodoLabel = 'Últimos 7 Días';
      break;
    }
    case 'ESTE_MES': {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      fromDate = formatYMD(firstDay);
      toDate = todayStr;
      const monthNames = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
      ];
      periodoLabel = `Este Mes (${monthNames[now.getMonth()]})`;
      break;
    }
    case 'MES_ANTERIOR': {
      const prevMonthFirst = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const prevMonthLast = new Date(now.getFullYear(), now.getMonth(), 0);
      fromDate = formatYMD(prevMonthFirst);
      toDate = formatYMD(prevMonthLast);
      const monthNames = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
      ];
      periodoLabel = `Mes Anterior (${monthNames[prevMonthFirst.getMonth()]})`;
      break;
    }
    case 'HISTORICO':
    default:
      fromDate = '2024-01-01';
      toDate = todayStr;
      periodoLabel = 'Historial Consolidado';
      break;
  }

  if (customRange?.from && customRange?.to) {
    fromDate = customRange.from;
    toDate = customRange.to;
    periodoLabel = `${fromDate} al ${toDate}`;
  }

  const filtered = records.filter((r) => {
    if (!r.date) return false;
    return r.date >= fromDate && r.date <= toDate;
  });

  // Calcular cantidad de días en el período
  const start = new Date(fromDate + 'T00:00:00');
  const end = new Date(toDate + 'T00:00:00');
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const daysCount = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

  return { filtered, fromDate, toDate, daysCount, periodoLabel };
}

/**
 * Procesa las métricas estadísticas y el IPF para un autobús particular dentro de una colección de registros.
 */
export function calculateBusMetrics(
  bus: BusItem,
  busRecords: any[],
  grupoPromedioIPF: number = 0
): Omit<BusBenchmarkMetric, 'esUnidadPropia' | 'codigoAnonimo' | 'nombreDisplay' | 'placaDisplay' | 'propietarioDisplay' | 'datosPrivadosOcultos'> {
  const disco = bus.numeroDisco.padStart(2, '0');
  const esSocioLider = disco === '01';

  let produccionTotal = 0;
  let efectivoTotal = 0;
  let cajaComunTotal = 0;
  let totalGastos = 0;
  let kmTotales = 0;
  let vueltasTotales = 0;
  let vueltasEfectivas = 0;
  let vueltasNoRealizadas = 0;
  const datesSet = new Set<string>();
  let ultimoRegistro: string | undefined;

  // Ordenar registros por fecha descendente
  const sorted = [...busRecords].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  if (sorted.length > 0 && sorted[0].date) {
    ultimoRegistro = sorted[0].date;
  }

  for (const r of sorted) {
    if (r.date) datesSet.add(r.date);

    // Sumar producción
    const prod = Number(r.production) || 0;
    const cc = Number(r.cajaComun) || 0;
    const ef = prod - cc;
    const gastos = Number(r.totalGastos) || 0;

    produccionTotal += prod;
    cajaComunTotal += cc;
    efectivoTotal += ef >= 0 ? ef : 0;
    totalGastos += gastos;

    // Kilometraje
    if (r.km) {
      const kmNum = parseFloat(String(r.km).replace(/,/g, ''));
      if (!isNaN(kmNum) && kmNum > 0) kmTotales += kmNum;
    }

    // Análisis de vueltas (Trips)
    if (Array.isArray(r.trips) && r.trips.length > 0) {
      for (const t of r.trips) {
        vueltasTotales += 1;
        if (t.tipo === 'NO_REALIZADO') {
          vueltasNoRealizadas += 1;
        } else {
          vueltasEfectivas += 1;
        }
      }
    } else {
      // Fallback: Si no tiene trips desglosados en el registro pero tiene producción,
      // estimar vueltas basadas en el promedio de la cooperativa (6 vueltas por jornada completa)
      const vueltasEstimadas = prod > 0 ? 6 : 0;
      vueltasTotales += vueltasEstimadas;
      vueltasEfectivas += vueltasEstimadas;
    }
  }

  const diasOperados = datesSet.size;
  const divisorVueltas = vueltasEfectivas > 0 ? vueltasEfectivas : vueltasTotales > 0 ? vueltasTotales : 1;
  const ipf = Math.round((produccionTotal / divisorVueltas) * 100) / 100;
  const ingresoPorDia = diasOperados > 0 ? Math.round((produccionTotal / diasOperados) * 100) / 100 : 0;
  const rendimientoPorKm = kmTotales > 0 ? Math.round((produccionTotal / kmTotales) * 100) / 100 : 0;
  const utilidadNeta = Math.round((produccionTotal - totalGastos) * 100) / 100;

  // Comparativa con la media del grupo
  let comparativaMediaIPF: ComparativaMedia;
  if (grupoPromedioIPF > 0 && ipf > 0) {
    const dif = Math.round((ipf - grupoPromedioIPF) * 100) / 100;
    const pct = Math.round(((ipf / grupoPromedioIPF) - 1) * 1000) / 10;
    let estado: 'SUPERIOR' | 'EN_PROMEDIO' | 'INFERIOR' = 'EN_PROMEDIO';
    if (pct >= 3.0) estado = 'SUPERIOR';
    else if (pct <= -3.0) estado = 'INFERIOR';

    comparativaMediaIPF = {
      diferencia: dif,
      porcentajeDiferencia: pct,
      estado,
    };
  } else {
    comparativaMediaIPF = {
      diferencia: 0,
      porcentajeDiferencia: 0,
      estado: 'EN_PROMEDIO',
    };
  }

  return {
    busId: bus.id,
    numeroDisco: bus.numeroDisco,
    placa: bus.placa,
    marca: bus.marca,
    capacidadAsientos: bus.capacidadAsientos,
    tipoOperacion: bus.tipoOperacion,
    esSocioLider,
    diasOperados,
    vueltasTotales,
    vueltasEfectivas,
    vueltasNoRealizadas,
    produccionTotal: Math.round(produccionTotal * 100) / 100,
    efectivoTotal: Math.round(efectivoTotal * 100) / 100,
    cajaComunTotal: Math.round(cajaComunTotal * 100) / 100,
    totalGastos: Math.round(totalGastos * 100) / 100,
    utilidadNeta,
    kmTotales: Math.round(kmTotales * 10) / 10,
    ipf,
    ingresoPorDia,
    rendimientoPorKm,
    comparativaMediaIPF,
    ultimoRegistro,
  };
}

/**
 * Computa el benchmark simétrico dividiendo la flota en dos grupos obligatorios:
 * 1. TRONCAL_VT: Buses de 45 pasajeros (01, 02, 03, 04, 10, 12, 18, 19)
 * 2. ALIMENTADOR_P: Microbuses de 28 pasajeros (16, 17)
 */
export function computeFleetBenchmark(
  allRecords: any[],
  fleet: BusItem[],
  period: BenchmarkPeriod = 'ESTE_MES',
  customRange?: { from: string; to: string },
  activeBusId: string = 'BUS-01',
  isSuperAdminMode: boolean = false
): FleetBenchmarkSummary {
  const { filtered, fromDate, toDate, daysCount, periodoLabel } = filterRecordsByPeriod(
    allRecords,
    period,
    customRange
  );

  // 1. Agrupar registros por unidad física
  const recordsByBusId = new Map<string, any[]>();
  fleet.forEach((b) => recordsByBusId.set(b.id, []));

  for (const r of filtered) {
    const matchedBus = resolveRecordBus(r, fleet);
    if (matchedBus) {
      const arr = recordsByBusId.get(matchedBus.id) || [];
      arr.push(r);
      recordsByBusId.set(matchedBus.id, arr);
    }
  }

  // 2. Separar la flota en dos grupos simétricos
  const troncalFleet = fleet.filter((b) => b.tipoOperacion !== 'ALIMENTADOR_P');
  const alimentadorFleet = fleet.filter((b) => b.tipoOperacion === 'ALIMENTADOR_P');

  // 3. Procesar Grupo Troncal General (VT01 - VT15 • 45 Pax)
  const troncalGroup = computeCircuitGroup(
    'TRONCAL_VT',
    'Troncal General (VT01 - VT15)',
    'Flota Principal de 45 Pasajeros • Circuito Loja - Vilcabamba y Troncales',
    45,
    troncalFleet,
    recordsByBusId,
    activeBusId,
    isSuperAdminMode
  );

  // 4. Procesar Grupo Alimentadores (P1 - P3 • 28 Pax)
  const alimentadorGroup = computeCircuitGroup(
    'ALIMENTADOR_P',
    'Alimentadores Especiales (P1 - P3)',
    'Microbuses de 28 Pasajeros • Cobertura Yangana, La Elvira y Quinara',
    28,
    alimentadorFleet,
    recordsByBusId,
    activeBusId,
    isSuperAdminMode
  );

  return {
    periodo: period,
    periodoLabel,
    fechaInicio: fromDate,
    fechaFin: toDate,
    diasEnPeriodo: daysCount,
    totalRegistrosAuditados: filtered.length,
    troncal: troncalGroup,
    alimentadores: alimentadorGroup,
    fechaCalculo: new Date().toISOString(),
    activeBusId,
    isSuperAdminMode,
  };
}

/**
 * Calcula las métricas consolidadas de un grupo de circuito (Troncal o Alimentador)
 * y anonimiza a los pares garantizando la privacidad de los socios.
 */
function computeCircuitGroup(
  circuito: BenchmarkCircuitGroup,
  titulo: string,
  subtitulo: string,
  capacidadReferencia: number,
  groupFleet: BusItem[],
  recordsByBusId: Map<string, any[]>,
  activeBusId: string = 'BUS-01',
  isSuperAdminMode: boolean = false
): CircuitGroupBenchmark {
  // Primer paso: calcular totales globales del grupo para deducir el promedio IPF
  let produccionConsolidada = 0;
  let efectivoConsolidado = 0;
  let cajaComunConsolidada = 0;
  let vueltasConsolidadas = 0;
  let vueltasNoRealizadasConsolidadas = 0;
  let kmConsolidados = 0;
  let unidadesConRegistros = 0;

  const rawBusData: { bus: BusItem; records: any[] }[] = [];

  for (const bus of groupFleet) {
    const records = recordsByBusId.get(bus.id) || [];
    rawBusData.push({ bus, records });

    if (records.length > 0) {
      unidadesConRegistros += 1;
    }

    for (const r of records) {
      const prod = Number(r.production) || 0;
      const cc = Number(r.cajaComun) || 0;
      produccionConsolidada += prod;
      cajaComunConsolidada += cc;
      efectivoConsolidado += Math.max(0, prod - cc);

      if (r.km) {
        const k = parseFloat(String(r.km).replace(/,/g, ''));
        if (!isNaN(k) && k > 0) kmConsolidados += k;
      }

      if (Array.isArray(r.trips) && r.trips.length > 0) {
        for (const t of r.trips) {
          if (t.tipo === 'NO_REALIZADO') {
            vueltasNoRealizadasConsolidadas += 1;
          } else {
            vueltasConsolidadas += 1;
          }
        }
      } else if (prod > 0) {
        vueltasConsolidadas += 6;
      }
    }
  }

  // Calcular el IPF Promedio del Grupo
  const divisorGrupo = vueltasConsolidadas > 0 ? vueltasConsolidadas : 1;
  const ipfPromedioGrupo = Math.round((produccionConsolidada / divisorGrupo) * 100) / 100;
  const divisorUnidades = unidadesConRegistros > 0 ? unidadesConRegistros : groupFleet.length || 1;
  const produccionPromedioPorUnidad = Math.round((produccionConsolidada / divisorUnidades) * 100) / 100;

  // Segundo paso: calcular métricas individuales básicas
  const rawCalculated = rawBusData.map(({ bus, records }) => ({
    bus,
    metrics: calculateBusMetrics(bus, records, ipfPromedioGrupo),
  }));

  // Ordenar el ranking: primero los que tienen producción por IPF descendente; luego los inactivos por número de disco
  rawCalculated.sort((a, b) => {
    if (a.metrics.produccionTotal > 0 && b.metrics.produccionTotal > 0) {
      return b.metrics.ipf - a.metrics.ipf;
    }
    if (a.metrics.produccionTotal > 0) return -1;
    if (b.metrics.produccionTotal > 0) return 1;
    return a.bus.numeroDisco.localeCompare(b.bus.numeroDisco, undefined, { numeric: true });
  });

  // Tercer paso: Aplicar Anonimización Simétrica y Protección de Privacidad
  const cleanActiveId = activeBusId.toUpperCase().trim();
  const cleanActiveDisco = activeBusId.replace(/^BUS-/i, '').padStart(2, '0');
  const prefix = circuito === 'TRONCAL_VT' ? 'T' : 'A';
  let peerCounter = 1;

  const ranking: BusBenchmarkMetric[] = rawCalculated.map(({ bus, metrics }) => {
    const isDiscoMatch = bus.numeroDisco.padStart(2, '0') === cleanActiveDisco;
    const isIdMatch = bus.id.toUpperCase() === cleanActiveId || `BUS-${bus.numeroDisco}`.toUpperCase() === cleanActiveId;
    const esUnidadPropia = isDiscoMatch || isIdMatch;

    if (esUnidadPropia) {
      return {
        ...metrics,
        esUnidadPropia: true,
        codigoAnonimo: '',
        nombreDisplay: `Bus ${bus.numeroDisco} (Tu Unidad)`,
        placaDisplay: bus.placa,
        propietarioDisplay: `${bus.propietario || 'Socio'} (Tú)`,
        datosPrivadosOcultos: false,
      };
    }

    // Asignación de código anónimo secuencial estable (#T-01, #T-02 o #A-01, #A-02)
    const anonymousCode = `#${prefix}-${String(peerCounter).padStart(2, '0')}`;
    peerCounter += 1;

    if (isSuperAdminMode) {
      // Modo Administrador / Auditoría Central: ve datos completos con anotación de código
      return {
        ...metrics,
        esUnidadPropia: false,
        codigoAnonimo: anonymousCode,
        nombreDisplay: `Bus ${bus.numeroDisco} • ${bus.propietario}`,
        placaDisplay: bus.placa,
        propietarioDisplay: bus.propietario,
        datosPrivadosOcultos: false,
      };
    }

    // Modo Socio Propietario: Anonimato estricto para pares de la cooperativa
    return {
      ...metrics,
      esUnidadPropia: false,
      codigoAnonimo: anonymousCode,
      nombreDisplay: circuito === 'TRONCAL_VT' ? `Unidad Troncal ${anonymousCode}` : `Alimentador ${anonymousCode}`,
      placaDisplay: 'Privada',
      propietarioDisplay: 'Socio de Cooperativa',
      datosPrivadosOcultos: true, // Blindaje de libros de gastos y caja de terceros
    };
  });

  return {
    circuito,
    titulo,
    subtitulo,
    capacidadReferencia,
    totalUnidades: groupFleet.length,
    unidadesConRegistros,
    produccionConsolidada: Math.round(produccionConsolidada * 100) / 100,
    efectivoConsolidado: Math.round(efectivoConsolidado * 100) / 100,
    cajaComunConsolidada: Math.round(cajaComunConsolidada * 100) / 100,
    vueltasConsolidadas,
    vueltasNoRealizadasConsolidadas,
    ipfPromedioGrupo,
    produccionPromedioPorUnidad,
    kmConsolidados: Math.round(kmConsolidados * 10) / 10,
    ranking,
  };
}
