/**
 * @file turno-secuencia-tracker.ts
 * @description Motor de inferencia y cálculo de turnos (VTs) basado en los últimos
 * arqueos del ayudante con avance estricto de días calendario (la cooperativa no se detiene
 * si el bus está en taller o el ayudante no arquea), filtro anti-anomalías por daño mecánico,
 * persistencia offline-first mediante Ficha de Calibración Local y sincronización resiliente.
 */

export interface ArqueoResumenTurno {
  date: string;
  vtCode: string;
  conductor?: string;
  numeroDisco?: string;
  kmFinal?: string;
  id?: string;
}

export interface FichaCalibracionBus {
  busId: string;
  disco: string;
  calibrada: boolean;
  ultimoTurnoAuditado: string;
  fechaUltimoTurno: string;
  historial3Arqueos: ArqueoResumenTurno[];
  ultimaSincronizacion: string;
  fuente: 'AUDITADA_LOCAL' | 'SERVIDOR_SINCRONIZADO' | 'MANUAL';
}

export interface ResultadoProyeccionTurno {
  estado: 'CALIBRANDO' | 'CONFIRMADO' | 'MANUAL';
  conteoArqueos: number;
  arqueosAnalizados: ArqueoResumenTurno[];
  turnoProyectado: string;
  turnoBaseNumero: number;
  diasTranscurridosDesdeUltimoArqueo: number;
  fechaUltimoArqueo?: string;
  esAnomaliaDetectada: boolean;
  mensajeDetalle: string;
  esManual: boolean;
  fuenteDatos?: 'OFFLINE_CACHE' | 'SINCRONIZADO' | 'SIN_DATOS';
}

/**
 * Historial semilla oficial auditado para la Unidad 01 de la cooperativa.
 * Base operativa: 27 de Septiembre de 2026 con VT07 cerrado por despacho.
 */
export const HISTORIAL_SEMILLA_AUDITADO_UNIDAD_01: ArqueoResumenTurno[] = [
  { date: '2026-09-25', vtCode: 'VT05', conductor: '01', numeroDisco: '01' },
  { date: '2026-09-26', vtCode: 'VT06', conductor: '01', numeroDisco: '01' },
  { date: '2026-09-27', vtCode: 'VT07', conductor: '01', numeroDisco: '01' },
];

/**
 * Extrae el número numérico de un VT (ej: "VT08" -> 8, "VT15" -> 15)
 */
export function extraerNumeroVT(vtCode: string): number {
  if (!vtCode) return 1;
  const match = vtCode.match(/\d+/);
  return match ? parseInt(match[0], 10) : 1;
}

/**
 * Formatea un número a código VT oficial (ej: 8 -> "VT08", 10 -> "VT10")
 */
export function formatearCodigoVT(num: number): string {
  const norm = ((num - 1) % 15) + 1;
  return `VT${String(norm).padStart(2, '0')}`;
}

/**
 * Normaliza el código de disco a dos dígitos (ej: "1" -> "01", "01" -> "01")
 */
export function normalizarDisco(disco: string): string {
  return (disco || '').replace(/\D/g, '').padStart(2, '0');
}

/**
 * Calcula la diferencia exacta en días naturales entre dos fechas (YYYY-MM-DD)
 */
export function diferenciaEnDiasCalendario(fechaA: string, fechaB: string): number {
  if (!fechaA || !fechaB) return 1;
  const matchA = fechaA.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const matchB = fechaB.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!matchA || !matchB) return 1;

  const utcA = Date.UTC(parseInt(matchA[1], 10), parseInt(matchA[2], 10) - 1, parseInt(matchA[3], 10));
  const utcB = Date.UTC(parseInt(matchB[1], 10), parseInt(matchB[2], 10) - 1, parseInt(matchB[3], 10));

  const diffMs = utcB - utcA;
  return Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
}

/**
 * Obtiene la fecha local actual en formato YYYY-MM-DD
 */
export function obtenerFechaHoyLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dia}`;
}

/**
 * Recupera la Ficha de Calibración Local del almacenamiento del dispositivo
 */
export function obtenerCalibracionLocalBus(
  disco: string,
  busId?: string
): FichaCalibracionBus | null {
  if (typeof window === 'undefined') return null;

  const discoLimpio = normalizarDisco(disco);
  const keyDisco = `rg_calibracion_bus_${discoLimpio}`;
  const keyBusId = busId ? `rg_calibracion_bus_${busId}` : null;

  try {
    const raw = localStorage.getItem(keyDisco) || (keyBusId ? localStorage.getItem(keyBusId) : null);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.ultimoTurnoAuditado && Array.isArray(parsed.historial3Arqueos)) {
        return parsed as FichaCalibracionBus;
      }
    }
  } catch (err) {
    console.warn('[turno-secuencia-tracker] Error al leer calibración local:', err);
  }

  // Inicialización auditada para la Unidad 01 si es la primera vez que abre
  if (discoLimpio === '01') {
    const fichaSemilla: FichaCalibracionBus = {
      busId: busId || '01',
      disco: '01',
      calibrada: true,
      ultimoTurnoAuditado: 'VT07',
      fechaUltimoTurno: '2026-09-27',
      historial3Arqueos: [...HISTORIAL_SEMILLA_AUDITADO_UNIDAD_01],
      ultimaSincronizacion: new Date().toISOString(),
      fuente: 'AUDITADA_LOCAL',
    };
    guardarCalibracionLocalBus(fichaSemilla);
    return fichaSemilla;
  }

  return null;
}

/**
 * Guarda o actualiza la Ficha de Calibración Local en el almacenamiento del dispositivo
 */
export function guardarCalibracionLocalBus(ficha: FichaCalibracionBus): void {
  if (typeof window === 'undefined' || !ficha) return;

  try {
    const discoLimpio = normalizarDisco(ficha.disco);
    localStorage.setItem(`rg_calibracion_bus_${discoLimpio}`, JSON.stringify(ficha));
    if (ficha.busId) {
      localStorage.setItem(`rg_calibracion_bus_${ficha.busId}`, JSON.stringify(ficha));
    }
  } catch (err) {
    console.warn('[turno-secuencia-tracker] Error al guardar calibración local:', err);
  }
}

/**
 * Obtiene los últimos arqueos registrados para un bus con soporte Offline-First.
 * Consulta primero la Ficha de Calibración Local y el localStorage. Si hay red,
 * intenta sincronizar con el servidor en segundo plano sin bloquear.
 */
export async function obtenerUltimosArqueosBus(
  disco: string,
  busId?: string
): Promise<ArqueoResumenTurno[]> {
  const discoLimpio = normalizarDisco(disco);
  const registrosEncontrados: ArqueoResumenTurno[] = [];

  // 1. Cargar Ficha de Calibración Local persistida en el dispositivo
  const fichaLocal = obtenerCalibracionLocalBus(discoLimpio, busId);
  if (fichaLocal && fichaLocal.historial3Arqueos && fichaLocal.historial3Arqueos.length > 0) {
    for (const item of fichaLocal.historial3Arqueos) {
      registrosEncontrados.push(item);
    }
  }

  // 2. Consultar arqueos adicionales guardados en localStorage
  if (typeof window !== 'undefined') {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('arqueo_general_')) {
          const raw = localStorage.getItem(key);
          if (raw) {
            const parsed = JSON.parse(raw);
            const rDisco = normalizarDisco(parsed.numeroDisco || parsed.conductor || '');
            const matchBus = (rDisco && rDisco === discoLimpio) || (busId && parsed.busId === busId);
            
            if (matchBus && parsed.vtCode && parsed.date) {
              const existe = registrosEncontrados.some(
                (re) => re.date === parsed.date && re.vtCode === parsed.vtCode
              );
              if (!existe) {
                registrosEncontrados.push({
                  date: parsed.date,
                  vtCode: String(parsed.vtCode).toUpperCase().trim(),
                  conductor: parsed.conductor,
                  numeroDisco: rDisco,
                  kmFinal: parsed.kmFinal,
                });
              }
            }
          }
        }
      }
    } catch {}
  }

  // 3. Si hay conexión a internet, intentar sincronizar con /api/records
  if (typeof window !== 'undefined' && navigator.onLine) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      const res = await fetch('/api/records?limit=60', { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const records = await res.json();
        if (Array.isArray(records)) {
          for (const r of records) {
            const rDisco = normalizarDisco(r.numeroDisco || r.conductor || '');
            const rBusId = r.busId || '';
            const matchBus = (rDisco && rDisco === discoLimpio) || (busId && rBusId === busId);
            
            if (matchBus && r.vtCode && typeof r.vtCode === 'string') {
              const existe = registrosEncontrados.some(
                (re) => re.date === r.date && re.vtCode === r.vtCode
              );
              if (!existe) {
                registrosEncontrados.push({
                  date: r.date,
                  vtCode: r.vtCode.toUpperCase().trim(),
                  conductor: r.conductor,
                  numeroDisco: rDisco,
                  kmFinal: r.kmFinal,
                  id: r.id,
                });
              }
            }
          }

          // Si obtuvimos registros remotos y son válidos, actualizamos la ficha local
          if (registrosEncontrados.length >= 3) {
            const ordenados = [...registrosEncontrados].sort(
              (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
            );
            const ultimos3 = ordenados.slice(-3);
            const ultimo = ultimos3[2];
            guardarCalibracionLocalBus({
              busId: busId || discoLimpio,
              disco: discoLimpio,
              calibrada: true,
              ultimoTurnoAuditado: ultimo.vtCode,
              fechaUltimoTurno: ultimo.date,
              historial3Arqueos: ultimos3,
              ultimaSincronizacion: new Date().toISOString(),
              fuente: 'SERVIDOR_SINCRONIZADO',
            });
          }
        }
      }
    } catch (err) {
      console.warn('[turno-secuencia-tracker] Red o servidor no disponible, operando en modo offline:', err);
    }
  }

  // 4. Ordenar cronológicamente ascendente (antiguos primero, recientes al final)
  registrosEncontrados.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Eliminar duplicados de la misma fecha conservando el último
  const mapaFechas = new Map<string, ArqueoResumenTurno>();
  for (const item of registrosEncontrados) {
    mapaFechas.set(item.date, item);
  }

  return Array.from(mapaFechas.values()).sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
}

/**
 * Función integral para sincronización manual y retorno de estado con metadatos
 */
export async function sincronizarArqueosYCalibracion(
  disco: string,
  busId?: string
): Promise<{
  arqueos: ArqueoResumenTurno[];
  proyeccion: ResultadoProyeccionTurno;
  fuente: 'OFFLINE_CACHE' | 'SINCRONIZADO' | 'SIN_DATOS';
  errorRed: boolean;
}> {
  let errorRed = false;
  let fuente: 'OFFLINE_CACHE' | 'SINCRONIZADO' | 'SIN_DATOS' = 'OFFLINE_CACHE';

  try {
    const arqueos = await obtenerUltimosArqueosBus(disco, busId);
    const proyeccion = calcularProyeccionSecuencia(arqueos);
    if (arqueos.length === 0) {
      fuente = 'SIN_DATOS';
    } else {
      fuente = 'OFFLINE_CACHE';
    }
    return {
      arqueos,
      proyeccion,
      fuente,
      errorRed,
    };
  } catch (err) {
    errorRed = true;
    const fichaLocal = obtenerCalibracionLocalBus(disco, busId);
    const arqueosFallback = fichaLocal?.historial3Arqueos || [];
    const proyFallback = calcularProyeccionSecuencia(arqueosFallback);
    return {
      arqueos: arqueosFallback,
      proyeccion: proyFallback,
      fuente: arqueosFallback.length > 0 ? 'OFFLINE_CACHE' : 'SIN_DATOS',
      errorRed: true,
    };
  }
}

/**
 * Calcula la proyección del turno para hoy considerando:
 * 1. La fecha del último arqueo y los días calendario transcurridos hasta HOY.
 *    (El rol de la cooperativa avanza +1 diario inexorablemente, aunque el bus haya estado en mecánica o sin arqueo).
 * 2. Los 3 últimos arqueos para validar consistencia o detectar si el último fue un auxilio mecánico anómalo.
 * 3. Selección manual como override si el socio o chofer lo indica.
 */
export function calcularProyeccionSecuencia(
  arqueosTotales: ArqueoResumenTurno[],
  manualVT?: string | null,
  fechaHoy?: string
): ResultadoProyeccionTurno {
  const hoyStr = fechaHoy || obtenerFechaHoyLocal();

  // Si el usuario fijó manualmente su turno hoy, respetarlo como override prioritario
  if (manualVT && manualVT.startsWith('VT')) {
    const num = extraerNumeroVT(manualVT);
    return {
      estado: 'MANUAL',
      conteoArqueos: arqueosTotales.length,
      arqueosAnalizados: arqueosTotales.slice(-3),
      turnoProyectado: formatearCodigoVT(num),
      turnoBaseNumero: num,
      diasTranscurridosDesdeUltimoArqueo: 0,
      esAnomaliaDetectada: false,
      mensajeDetalle: `Turno fijado manualmente por el socio/chofer (${formatearCodigoVT(num)}).`,
      esManual: true,
    };
  }

  const n = arqueosTotales.length;

  // CASO 1: Menos de 3 arqueos (Unidad en calibración inicial o nueva en la flota)
  if (n < 3) {
    const ultimo = n > 0 ? arqueosTotales[n - 1] : null;
    let numCalculado = 1;
    let diasTrans = 0;

    if (ultimo) {
      diasTrans = diferenciaEnDiasCalendario(ultimo.date, hoyStr);
      const numUltimo = extraerNumeroVT(ultimo.vtCode);
      numCalculado = ((numUltimo - 1 + diasTrans) % 15) + 1;
    }

    const vtProv = formatearCodigoVT(numCalculado);

    return {
      estado: 'CALIBRANDO',
      conteoArqueos: n,
      arqueosAnalizados: arqueosTotales,
      turnoProyectado: vtProv,
      turnoBaseNumero: numCalculado,
      diasTranscurridosDesdeUltimoArqueo: diasTrans,
      fechaUltimoArqueo: ultimo?.date,
      esAnomaliaDetectada: false,
      mensajeDetalle: ultimo
        ? `Último arqueo: ${ultimo.date} (${ultimo.vtCode}). Han transcurrido ${diasTrans} días calendario (+${diasTrans} turnos en el rol de la cooperativa) ➔ Proyectado: ${vtProv}.`
        : `Unidad en calibración inicial (${n} de 3 arqueos requeridos). Selecciona tu turno asignado hoy.`,
      esManual: false,
    };
  }

  // CASO 2: 3 o más arqueos registrados (Unidad calibrada y auditada)
  const ultimosTres = arqueosTotales.slice(-3);
  const a3 = ultimosTres[0]; // hace 2 arqueos atrás
  const a2 = ultimosTres[1]; // penúltimo arqueo
  const a1 = ultimosTres[2]; // el arqueo más reciente cerrado

  const num3 = extraerNumeroVT(a3.vtCode);
  const num2 = extraerNumeroVT(a2.vtCode);
  const num1 = extraerNumeroVT(a1.vtCode);

  // Días calendario transcurridos desde el último arqueo (a1.date) hasta hoy
  const diasTranscurridos = diferenciaEnDiasCalendario(a1.date, hoyStr);

  // Analizar si a1 fue una anomalía (reemplazo o auxilio mecánico imprevisto)
  const delta32 = (num2 - num3 + 15) % 15;
  const delta21 = (num1 - num2 + 15) % 15;
  const esSaltoAnomaloEnA1 = delta32 === 1 && delta21 !== 1 && delta21 !== 0;

  let esAnomalia = false;
  let mensaje = '';
  let siguienteNumero = 1;

  if (esSaltoAnomaloEnA1) {
    esAnomalia = true;
    // Si a1 fue auxilio de otra unidad, calculamos los días transcurridos desde a2 (su rol natural)
    const diasDesdeA2 = diferenciaEnDiasCalendario(a2.date, hoyStr);
    siguienteNumero = ((num2 - 1 + diasDesdeA2) % 15) + 1;
    mensaje = `Aviso: El último arqueo (${a1.date}: ${a1.vtCode}) fue un auxilio mecánico atípico. Rol natural recalculado desde ${a2.date} (${a2.vtCode}) + ${diasDesdeA2} días calendario.`;
  } else {
    // Cálculo oficial por rotación de calendario de la compañía:
    // Cada día transcurrido desde el último arqueo avanza +1 turno en la rotación de 15 VTs
    siguienteNumero = ((num1 - 1 + diasTranscurridos) % 15) + 1;

    if (diasTranscurridos > 1) {
      mensaje = `Último arqueo auditado: ${a1.date} (${a1.vtCode}). Transcurrieron ${diasTranscurridos} días de calendario (taller/sin arqueo). Como el calendario de la compañía avanza continuamente, hoy le corresponde ${formatearCodigoVT(siguienteNumero)}.`;
    } else {
      mensaje = `Secuencia confirmada (+1) por los últimos 3 arqueos (${a3.vtCode} → ${a2.vtCode} → ${a1.vtCode}). Hoy le corresponde ${formatearCodigoVT(siguienteNumero)}.`;
    }
  }

  const vtFinal = formatearCodigoVT(siguienteNumero);

  return {
    estado: 'CONFIRMADO',
    conteoArqueos: n,
    arqueosAnalizados: ultimosTres,
    turnoProyectado: vtFinal,
    turnoBaseNumero: siguienteNumero,
    diasTranscurridosDesdeUltimoArqueo: diasTranscurridos,
    fechaUltimoArqueo: a1.date,
    esAnomaliaDetectada: esAnomalia,
    mensajeDetalle: mensaje,
    esManual: false,
  };
}
