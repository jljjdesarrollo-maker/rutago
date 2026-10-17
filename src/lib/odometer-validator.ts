import {
  ConfiguracionKilometrajeRutas,
  DEFAULT_CONFIG_KILOMETRAJE_RUTAS,
  TramoKilometraje,
} from '@/types/rutas-km';

export type SemaforoOdometroEstado = 'VERDE' | 'AMBAR' | 'ROJO' | 'NEUTRO';

export interface FrecuenciaParaKm {
  estadoId?: string;
  nombre?: string;
  ruta?: string;
  hora?: string;
  estado?: string; // 'pendiente' | 'abierta' | 'cerrada' | 'no_realizada'
  tipo?: string;   // 'frecuencia' | 'ingreso_especial' | 'no_realizada'
}

export interface ResultadoValidacionOdometro {
  estado: SemaforoOdometroEstado;
  kmTeorico: number;
  kmRecorridoReal: number | null;
  desfaseKm: number | null;
  desfasePorcentaje: number | null;
  mensaje: string;
  motivosSugeridos: string[];
  permiteGuardar: boolean;
  esBloqueante: boolean;
}

/**
 * Normaliza cadenas fonéticamente para comparar orígenes y destinos
 * Quita tildes, mayúsculas, espacios sobrantes y puntuación.
 */
export function normalizarLugar(texto: string): string {
  if (!texto) return '';
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Extrae o deduce el tramo y kilometraje referencial a partir de la descripción de ruta o nombre de vuelta.
 * Maneja flechas: '→', '➔', '->', '-', 'a', etc.
 */
export function estimarKmTramo(
  descripcionRuta: string,
  config: ConfiguracionKilometrajeRutas = DEFAULT_CONFIG_KILOMETRAJE_RUTAS
): number {
  if (!descripcionRuta) return 0;

  const descNorm = normalizarLugar(descripcionRuta);

  // Intentar matching por tramos configurados
  for (const tramo of config.tramos) {
    if (!tramo.activo) continue;
    const origenNorm = normalizarLugar(tramo.origen);
    const destinoNorm = normalizarLugar(tramo.destino);

    // Ej: "Loja -> Vilcabamba"
    if (descNorm.includes(origenNorm) && descNorm.includes(destinoNorm)) {
      const posOrigen = descNorm.indexOf(origenNorm);
      const posDestino = descNorm.indexOf(destinoNorm);
      // Si el orden coincide con el sentido
      if (tramo.sentido === 'IDA' && posOrigen < posDestino) {
        return tramo.distanciaKm;
      }
      if (tramo.sentido === 'RETORNO' && posOrigen > posDestino) {
        return tramo.distanciaKm;
      }
      // Si no podemos determinar el orden exacto pero están ambos
      return tramo.distanciaKm;
    }
  }

  // Fallbacks por palabras clave comunes si solo se menciona el destino principal
  if (descNorm.includes('zahuayco')) return 91.0;
  if (descNorm.includes('elvira') || descNorm.includes('la elvira')) return 78.0;
  if (descNorm.includes('yangana')) return 67.0;
  if (descNorm.includes('tambo') || descNorm.includes('el tambo')) return 52.5;
  if (descNorm.includes('vilcabamba') || descNorm.includes('vilca')) return 42.0;
  if (descNorm.includes('malacatos')) return 33.0;

  // Distancia promedio referencial por vuelta regular si no coincide
  return 42.0;
}

/**
 * Calcula el kilometraje teórico acumulado de la jornada para una lista de frecuencias.
 * Omite vueltas marcadas como 'no_realizada'.
 */
export function calcularKmTeoricoJornada(
  frecuencias: FrecuenciaParaKm[],
  config: ConfiguracionKilometrajeRutas = DEFAULT_CONFIG_KILOMETRAJE_RUTAS
): number {
  if (!Array.isArray(frecuencias) || frecuencias.length === 0) return 0;

  let totalKm = 0;

  for (const f of frecuencias) {
    // Si la vuelta fue no realizada, no suma recorrido
    if (f.estado === 'no_realizada' || f.tipo === 'no_realizada') {
      continue;
    }

    const texto = f.ruta || f.nombre || '';
    const km = estimarKmTramo(texto, config);
    totalKm += km;
  }

  return Math.round(totalKm * 10) / 10;
}

export const MOTIVOS_DESFASE_ODOMETRO = [
  'Desvío vial / Derrumbe',
  'Paso por Taller / Mecánica',
  'Lavadora / Engrasadora',
  'Vuelta extra / Turno especial',
  'Tránsito urbano / Terminal',
  'Recorrido en vacío',
];

/**
 * Motor Semafórico de 3 Niveles con Tolerancia Elástica Dinámica:
 * 🟢 VERDE (Rango Óptimo): Dentro de tolerancia elástica (-10% a +25%). Válido sin fricción.
 * 🟡 ÁMBAR (Advertencia Elástica / Zero-Locking): Variación operativa (vueltas extras, desvíos, talleres o fletes especiales hasta el límite operacional). Permite guardar con chips rápidos de justificación.
 * 🔴 ROJO (Candado Bloqueante): kmFinal < kmInicial o salto físicamente absurdo / cero de más (> limiteAbsurdoKm dinámico). Bloquea guardado.
 */

/**
 * Calcula el umbral de bloqueo estricto (físicamente absurdo) para una jornada.
 * Erradica el candado estático rígido de 600 km y lo sustituye por una cota dinámica:
 * - Si hay un VT activo con kmTeorico > 0, el límite absurdo es el mayor entre:
 *   el umbral base de seguridad (config.maxSaltoDiarioKm o 1000 km) y 2.5 veces el teórico del turno.
 * - Para un VT de 252 km: hasta 315 km es VERDE; de 315 a 1,000 km es ÁMBAR (permite guardar con aviso/justificación);
 *   y sólo > 1,000 km es ROJO bloqueante (error grosero de tipeo como un cero o dígito de más).
 * - Para un VT largo de 416 km (VT1): hasta 520 km es VERDE; de 520 a 1,040 km es ÁMBAR; y > 1,040 km es ROJO.
 * - Si no hay teórico (kmTeorico === 0): el límite es config.maxSaltoDiarioKm o 1,000 km.
 */
export function calcularLimiteAbsurdoKm(
  kmTeorico: number,
  config: ConfiguracionKilometrajeRutas = DEFAULT_CONFIG_KILOMETRAJE_RUTAS
): number {
  const baseSanidad = Math.max(config.maxSaltoDiarioKm || 1000, 1000);
  if (kmTeorico > 0) {
    return Math.max(baseSanidad, Math.round(kmTeorico * 2.5));
  }
  return baseSanidad;
}

export function validarLecturaOdometro(
  kmInicialStr: string,
  kmFinalStr: string,
  frecuencias: FrecuenciaParaKm[],
  config: ConfiguracionKilometrajeRutas = DEFAULT_CONFIG_KILOMETRAJE_RUTAS
): ResultadoValidacionOdometro {
  const kmTeorico = calcularKmTeoricoJornada(frecuencias, config);

  const cleanInicial = kmInicialStr.trim();
  const cleanFinal = kmFinalStr.trim();

  // Si no se ha ingresado el odómetro final, estado neutro
  if (!cleanFinal) {
    return {
      estado: 'NEUTRO',
      kmTeorico,
      kmRecorridoReal: null,
      desfaseKm: null,
      desfasePorcentaje: null,
      mensaje: 'Ingresa el tacómetro final del tablero para auditar el recorrido.',
      motivosSugeridos: MOTIVOS_DESFASE_ODOMETRO,
      permiteGuardar: false,
      esBloqueante: false,
    };
  }

  const numFinal = parseFloat(cleanFinal);
  if (isNaN(numFinal) || numFinal <= 0) {
    return {
      estado: 'ROJO',
      kmTeorico,
      kmRecorridoReal: null,
      desfaseKm: null,
      desfasePorcentaje: null,
      mensaje: 'El tacómetro final debe ser un número positivo válido.',
      motivosSugeridos: [],
      permiteGuardar: false,
      esBloqueante: true,
    };
  }

  // Si no hay lectura inicial conocida, solo validamos que no sea absurdo
  if (!cleanInicial) {
    return {
      estado: 'VERDE',
      kmTeorico,
      kmRecorridoReal: null,
      desfaseKm: null,
      desfasePorcentaje: null,
      mensaje: `Odómetro registrado: ${numFinal.toLocaleString()} km (sin lectura de salida para calcular trayecto).`,
      motivosSugeridos: [],
      permiteGuardar: true,
      esBloqueante: false,
    };
  }

  const numInicial = parseFloat(cleanInicial);
  if (isNaN(numInicial) || numInicial <= 0) {
    return {
      estado: 'VERDE',
      kmTeorico,
      kmRecorridoReal: null,
      desfaseKm: null,
      desfasePorcentaje: null,
      mensaje: `Odómetro registrado: ${numFinal.toLocaleString()} km.`,
      motivosSugeridos: [],
      permiteGuardar: true,
      esBloqueante: false,
    };
  }

  const kmRecorridoReal = Math.round((numFinal - numInicial) * 10) / 10;

  // 🔴 CANDADO BLOQUEANTE 1: Odómetro invertido
  if (kmRecorridoReal < 0) {
    return {
      estado: 'ROJO',
      kmTeorico,
      kmRecorridoReal,
      desfaseKm: kmRecorridoReal,
      desfasePorcentaje: null,
      mensaje: `Tacómetro invertido: La llegada (${numFinal.toLocaleString()} km) no puede ser menor a la salida (${numInicial.toLocaleString()} km).`,
      motivosSugeridos: [],
      permiteGuardar: false,
      esBloqueante: true,
    };
  }

  // 🔴 CANDADO BLOQUEANTE 2: Salto extremo físicamente absurdo / Cero extra (> limiteAbsurdoKm)
  // Reemplaza el tope estático ciego de 600 km por una tolerancia elástica contextual al turno VT
  const limiteAbsurdoKm = calcularLimiteAbsurdoKm(kmTeorico, config);
  if (kmRecorridoReal > limiteAbsurdoKm) {
    return {
      estado: 'ROJO',
      kmTeorico,
      kmRecorridoReal,
      desfaseKm: kmTeorico > 0 ? Math.round((kmRecorridoReal - kmTeorico) * 10) / 10 : kmRecorridoReal,
      desfasePorcentaje: kmTeorico > 0 ? Math.round(((kmRecorridoReal - kmTeorico) / kmTeorico) * 100) : null,
      mensaje: `Salto extremo (${kmRecorridoReal.toLocaleString()} km): Supera el límite diario operacional (${limiteAbsurdoKm.toLocaleString()} km). Revisa si digitaste un cero o dígito de más.`,
      motivosSugeridos: [],
      permiteGuardar: false,
      esBloqueante: true,
    };
  }

  // Si no hay frecuencias en el día o el teórico es 0
  if (kmTeorico === 0) {
    return {
      estado: 'VERDE',
      kmTeorico,
      kmRecorridoReal,
      desfaseKm: kmRecorridoReal,
      desfasePorcentaje: null,
      mensaje: `Recorrido registrado: ${kmRecorridoReal.toLocaleString()} km (sin turno oficial asignado).`,
      motivosSugeridos: [],
      permiteGuardar: true,
      esBloqueante: false,
    };
  }

  const desfaseKm = Math.round((kmRecorridoReal - kmTeorico) * 10) / 10;
  const desfasePorcentaje = Math.round(((kmRecorridoReal - kmTeorico) / kmTeorico) * 100);

  const tolInferior = config.toleranciaInferiorPorciento ?? 10;
  const tolSuperior = config.toleranciaDefectoPorciento ?? 25;

  // 🟢 VERDE: Dentro de tolerancia elástica (-10% a +25%)
  if (desfasePorcentaje >= -tolInferior && desfasePorcentaje <= tolSuperior) {
    return {
      estado: 'VERDE',
      kmTeorico,
      kmRecorridoReal,
      desfaseKm,
      desfasePorcentaje,
      mensaje: `Recorrido óptimo: ${kmRecorridoReal.toLocaleString()} km (Teórico: ~${kmTeorico.toLocaleString()} km, Δ ${desfaseKm >= 0 ? '+' : ''}${desfaseKm} km).`,
      motivosSugeridos: [],
      permiteGuardar: true,
      esBloqueante: false,
    };
  }

  // 🟡 ÁMBAR: Desfase justificado con tolerancia elástica dinámica (Zero-Locking)
  // Acepta variaciones operativas (vueltas extras, desvíos, talleres, fletes) sin bloquear al ayudante
  const esExceso = desfasePorcentaje > tolSuperior;
  return {
    estado: 'AMBAR',
    kmTeorico,
    kmRecorridoReal,
    desfaseKm,
    desfasePorcentaje,
    mensaje: esExceso
      ? `Variación de recorrido: +${desfaseKm} km (+${desfasePorcentaje}%) sobre el turno habitual (~${kmTeorico} km). Selecciona motivo o confirma para guardar.`
      : `Recorrido inferior al programado: ${desfaseKm} km (${desfasePorcentaje}%). Selecciona motivo o confirma para guardar.`,
    motivosSugeridos: MOTIVOS_DESFASE_ODOMETRO,
    permiteGuardar: true,
    esBloqueante: false,
  };
}
