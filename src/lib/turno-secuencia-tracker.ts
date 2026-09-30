/**
 * @file turno-secuencia-tracker.ts
 * @description Motor de inferencia y cálculo de turnos (VTs) basado en los últimos
 * 3 arqueos diarios del ayudante con filtro anti-anomalías (reemplazos por daño mecánico)
 * y protocolo para unidades nuevas en calibración.
 */

export interface ArqueoResumenTurno {
  date: string;
  vtCode: string;
  conductor?: string;
  numeroDisco?: string;
  kmFinal?: string;
  id?: string;
}

export interface ResultadoProyeccionTurno {
  estado: 'CALIBRANDO' | 'CONFIRMADO' | 'MANUAL';
  conteoArqueos: number;
  arqueosAnalizados: ArqueoResumenTurno[];
  turnoProyectado: string;
  turnoBaseNumero: number;
  esAnomaliaDetectada: boolean;
  mensajeDetalle: string;
  esManual: boolean;
}

/**
 * Extrae el número numérico de un VT (ej: "VT08" -> 8, "VT15" -> 15)
 */
export function extraerNumeroVT(vtCode: string): number {
  if (!vtCode) return 1;
  const match = vtCode.match(/\d+/);
  return match ? parseInt(match[0], 10) : 1;
}

/**
 * Formatea un número a código VT oficial (ej: 8 -> "VT08")
 */
export function formatearCodigoVT(num: number): string {
  const norm = ((num - 1) % 15) + 1;
  return `VT${String(norm).padStart(2, '0')}`;
}

/**
 * Obtiene los últimos arqueos registrados para un bus desde /api/records y localStorage
 */
export async function obtenerUltimosArqueosBus(
  disco: string,
  busId?: string
): Promise<ArqueoResumenTurno[]> {
  const discoLimpio = disco.replace(/\D/g, '').padStart(2, '0');
  const registrosEncontrados: ArqueoResumenTurno[] = [];

  // 1. Consultar base de datos central (/api/records)
  try {
    const res = await fetch('/api/records?limit=60');
    if (res.ok) {
      const records = await res.json();
      if (Array.isArray(records)) {
        for (const r of records) {
          const rDisco = (r.numeroDisco || r.conductor || '').replace(/\D/g, '').padStart(2, '0');
          const rBusId = r.busId || '';
          const matchBus = (rDisco && rDisco === discoLimpio) || (busId && rBusId === busId);
          
          if (matchBus && r.vtCode && typeof r.vtCode === 'string') {
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
    }
  } catch (err) {
    console.warn('[turno-secuencia-tracker] Error al consultar /api/records:', err);
  }

  // 2. Si no hay suficientes en API, consultar arqueos locales guardados en localStorage
  if (typeof window !== 'undefined') {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('arqueo_general_')) {
          const raw = localStorage.getItem(key);
          if (raw) {
            const parsed = JSON.parse(raw);
            const rDisco = (parsed.numeroDisco || parsed.conductor || '').replace(/\D/g, '').padStart(2, '0');
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

  // 3. Ordenar cronológicamente ascendente (antiguos primero, recientes al final)
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
 * Calcula la proyección del turno para hoy basándose en al menos los 3 últimos arqueos,
 * aplicando el filtro anti-anomalías por auxilio mecánico.
 */
export function calcularProyeccionSecuencia(
  arqueosTotales: ArqueoResumenTurno[],
  manualVT?: string | null
): ResultadoProyeccionTurno {
  // Si el usuario fijó manualmente su turno hoy, respetarlo como override prioritario
  if (manualVT && manualVT.startsWith('VT')) {
    const num = extraerNumeroVT(manualVT);
    return {
      estado: 'MANUAL',
      conteoArqueos: arqueosTotales.length,
      arqueosAnalizados: arqueosTotales.slice(-3),
      turnoProyectado: formatearCodigoVT(num),
      turnoBaseNumero: num,
      esAnomaliaDetectada: false,
      mensajeDetalle: `Turno asignado manualmente por el socio/chofer (${formatearCodigoVT(num)}).`,
      esManual: true,
    };
  }

  const n = arqueosTotales.length;

  // CASO 1: Menos de 3 arqueos (Unidad en calibración o nueva en la flota)
  if (n < 3) {
    // Si tiene 1 o 2 arqueos, proyectamos provisionalmente el siguiente pero indicando calibración
    const ultimo = n > 0 ? arqueosTotales[n - 1] : null;
    const numProv = ultimo ? ((extraerNumeroVT(ultimo.vtCode) % 15) + 1) : 1;
    const vtProv = formatearCodigoVT(numProv);

    return {
      estado: 'CALIBRANDO',
      conteoArqueos: n,
      arqueosAnalizados: arqueosTotales,
      turnoProyectado: vtProv,
      turnoBaseNumero: numProv,
      esAnomaliaDetectada: false,
      mensajeDetalle: `Unidad en calibración inicial (${n} de 3 arqueos requeridos). Puedes seleccionar tu turno hoy manualmente.`,
      esManual: false,
    };
  }

  // CASO 2: 3 o más arqueos registrados
  const ultimosTres = arqueosTotales.slice(-3);
  const a3 = ultimosTres[0]; // hace 2 días atrás
  const a2 = ultimosTres[1]; // ayer o día previo
  const a1 = ultimosTres[2]; // el arqueo más reciente cerrado

  const num3 = extraerNumeroVT(a3.vtCode);
  const num2 = extraerNumeroVT(a2.vtCode);
  const num1 = extraerNumeroVT(a1.vtCode);

  // En una cooperativa de 15 VTs continuos, la distancia cíclica normal es +1 diario:
  // delta(a, b) = (b - a + 15) % 15
  const delta32 = (num2 - num3 + 15) % 15;
  const delta21 = (num1 - num2 + 15) % 15;

  let esAnomalia = false;
  let mensaje = '';
  let siguienteNumero = 1;

  // Analizar si a1 fue una anomalía (reemplazo o auxilio mecánico imprevisto)
  // Ejemplo: si a3->a2 avanzó normalmente (+1), pero a1 saltó a un turno totalmente distante (ej: +6 turnos)
  const esSaltoAnomaloEnA1 = delta32 === 1 && delta21 !== 1 && delta21 !== 0;

  if (esSaltoAnomaloEnA1) {
    esAnomalia = true;
    // Si a1 fue un reemplazo de emergencia, la secuencia natural de la unidad continuaba desde a2
    // Ejemplo: a3=VT05, a2=VT06, a1=VT14 (daño de otra unidad). Hoy le corresponde continuar el rol: VT07 o VT08.
    siguienteNumero = ((num2 + 1) % 15) + 1;
    mensaje = `Aviso: El último arqueo (${a1.vtCode}) fue un reemplazo o cruce atípico. Secuencia regular recalculada desde rol habitual.`;
  } else if (delta21 === 1) {
    // Secuencia regular perfecta (+1)
    siguienteNumero = (num1 % 15) + 1;
    mensaje = `Secuencia confirmada (+1) por los últimos 3 arqueos (${a3.vtCode} → ${a2.vtCode} → ${a1.vtCode}).`;
  } else {
    // Si la secuencia no es estrictamente +1 pero hay 3 registros, avanzar desde el último
    siguienteNumero = (num1 % 15) + 1;
    mensaje = `Proyección basada en últimos arqueos cerrados (${a1.vtCode}).`;
  }

  const vtFinal = formatearCodigoVT(siguienteNumero);

  return {
    estado: 'CONFIRMADO',
    conteoArqueos: n,
    arqueosAnalizados: ultimosTres,
    turnoProyectado: vtFinal,
    turnoBaseNumero: siguienteNumero,
    esAnomaliaDetectada: esAnomalia,
    mensajeDetalle: mensaje,
    esManual: false,
  };
}
