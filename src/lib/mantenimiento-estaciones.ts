/**
 * @file mantenimiento-estaciones.ts
 * @description Módulo de Estaciones de Servicio de Taller y Niveles de Control para Socios
 * RutaGo v3.58.11 - Arquitectura de Mantenimiento Preventivo Hino AK
 *
 * 1. Niveles de Control: Básico (7), Medio (15), Total (27) con switch libre por autobús.
 * 2. Estaciones de Servicio: 6 Estaciones de Taller + Rutina de Chofer para registro ergonómico en segundos.
 */

export type NivelControlMantenimiento = 'BASICO' | 'MEDIO' | 'TOTAL';

export interface PlantillaNivelControl {
  id: NivelControlMantenimiento;
  nombre: string;
  badge: string;
  descripcion: string;
  color: string;
  codigosRecomendados: string[];
}

export const CODIGOS_NIVEL_BASICO: string[] = [
  'MNT-ACEITE-MOT',       // Aceite de Motor (5,000 km)
  'MNT-FILT-ACEITE',      // Filtro de Aceite (5,000 km)
  'MNT-FILT-TRAMPA',      // Filtro Trampa de Agua (5,000 km)
  'MNT-FILT-DIESEL-SEC',  // Filtro Diésel Secundario (5,000 km)
  'MNT-ENGRASE-CHASIS',   // Engrase de Chasis (1,500 km)
  'MNT-RACHES-FRENO',     // Calibración de Raches (800 km)
  'MNT-ZAPATAS-POST',     // Zapatas Posteriores (8,000 km)
];

export const CODIGOS_NIVEL_MEDIO: string[] = [
  ...CODIGOS_NIVEL_BASICO,
  'MNT-ACEITE-CAJA',        // Valvulina de Caja (30,000 km)
  'MNT-ACEITE-CORONA',      // Valvulina de Corona (30,000 km)
  'MNT-SOPLADO-AIRE',       // Soplado de Filtro de Aire (5,000 km)
  'MNT-FILT-AIRE-SEC',      // Filtro Aire Pequeño / Seguridad (20,000 km)
  'MNT-FILT-AIRE-GRANDE',   // Filtro Aire Grande / Exterior (40,000 km)
  'MNT-MANGUERAS-ADMISION', // Ajuste Mangueras Admisión (10,000 km)
  'MNT-BOCINAS-POST',       // Bocinas Posteriores (50,000 km)
  'MNT-ZAPATAS-DEL',        // Zapatas Delanteras (11,000 km)
];

export const PLANTILLAS_NIVEL_CONTROL: Record<NivelControlMantenimiento, PlantillaNivelControl> = {
  BASICO: {
    id: 'BASICO',
    nombre: 'Control Básico (7)',
    badge: 'Vital & Preventivo',
    descripcion: 'Lo indispensable: fluidos de motor, filtros de combustible, engrase y frenos.',
    color: 'emerald',
    codigosRecomendados: CODIGOS_NIVEL_BASICO,
  },
  MEDIO: {
    id: 'MEDIO',
    nombre: 'Control Medio (15)',
    badge: 'Operativo & Rodaje',
    descripcion: 'Básico + valvulinas, sistema de aire, bocinas traseras y zapatas delanteras.',
    color: 'amber',
    codigosRecomendados: CODIGOS_NIVEL_MEDIO,
  },
  TOTAL: {
    id: 'TOTAL',
    nombre: 'Control Total (27)',
    badge: 'Full Hino AK',
    descripcion: 'Auditoría integral de los 5 bloques mecánicos, transmisión mayor y metales.',
    color: 'blue',
    codigosRecomendados: [], // Vacío = activa todos los del catálogo oficial
  },
};

// ==========================================
// PERSISTENCIA LOCAL POR AUTOBÚS (busId)
// ==========================================

const STORAGE_PREFIX_NIVEL = 'rg_mnt_nivel_control_';
const STORAGE_PREFIX_ITEMS = 'rg_mnt_items_activos_';

export function getBusNivelControl(busId: string): NivelControlMantenimiento {
  if (typeof window === 'undefined') return 'BASICO';
  try {
    const saved = localStorage.getItem(`${STORAGE_PREFIX_NIVEL}${busId}`);
    if (saved === 'BASICO' || saved === 'MEDIO' || saved === 'TOTAL') {
      return saved;
    }
  } catch (err) {
    console.error('Error al leer nivel de control de bus:', err);
  }
  return 'BASICO';
}

export function saveBusNivelControl(busId: string, nivel: NivelControlMantenimiento): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${STORAGE_PREFIX_NIVEL}${busId}`, nivel);
  } catch (err) {
    console.error('Error al guardar nivel de control de bus:', err);
  }
}

export function getBusItemsActivosConfig(busId: string, todosCodigosCatalogo: string[]): Record<string, boolean> {
  if (typeof window === 'undefined') {
    const fallback: Record<string, boolean> = {};
    CODIGOS_NIVEL_BASICO.forEach(cod => { fallback[cod] = true; });
    return fallback;
  }
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX_ITEMS}${busId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed === 'object' && parsed !== null) {
        return parsed;
      }
    }
    // Si no hay configuración manual previa, inicializar según el nivel actual del bus
    const nivel = getBusNivelControl(busId);
    const config: Record<string, boolean> = {};

    if (nivel === 'TOTAL') {
      todosCodigosCatalogo.forEach(cod => { config[cod] = true; });
    } else if (nivel === 'MEDIO') {
      const setMedio = new Set(CODIGOS_NIVEL_MEDIO);
      todosCodigosCatalogo.forEach(cod => { config[cod] = setMedio.has(cod); });
    } else {
      const setBasico = new Set(CODIGOS_NIVEL_BASICO);
      todosCodigosCatalogo.forEach(cod => { config[cod] = setBasico.has(cod); });
    }

    localStorage.setItem(`${STORAGE_PREFIX_ITEMS}${busId}`, JSON.stringify(config));
    return config;
  } catch (err) {
    console.error('Error al leer items activos de bus:', err);
  }
  return {};
}

export function saveBusItemsActivosConfig(busId: string, config: Record<string, boolean>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${STORAGE_PREFIX_ITEMS}${busId}`, JSON.stringify(config));
  } catch (err) {
    console.error('Error al guardar items activos de bus:', err);
  }
}

// ==========================================
// ESTACIONES DE SERVICIO (TALLERES DE PARADA)
// ==========================================

export type EstacionServicioId =
  | 'LUBRICADORA'
  | 'FRENOS_RUEDAS'
  | 'MNT_MAYOR'
  | 'ADMISION_AIRE'
  | 'ALINEACION'
  | 'RADIADOR'
  | 'CHOFER_RUTINA';

export interface ItemEstacionConfig {
  codigo: string;
  nombre: string;
  intervaloKm: number;
  preMarcado: boolean;
  opcionalTexto?: string;
  esCascadaTrigger?: boolean;
  cascadaAfecta?: string[];
}

export interface EstacionServicioDef {
  id: EstacionServicioId;
  nombre: string;
  subtitulo: string;
  icono: string;
  colorBorder: string;
  colorBg: string;
  items: ItemEstacionConfig[];
}

export const ESTACIONES_SERVICIO_CONFIG: Record<EstacionServicioId, EstacionServicioDef> = {
  LUBRICADORA: {
    id: 'LUBRICADORA',
    nombre: 'Lubricadora',
    subtitulo: 'Regla 4 obligatorios + 7 opcionales de fosa',
    icono: '🛢️',
    colorBorder: 'border-amber-500',
    colorBg: 'bg-amber-50',
    items: [
      // 4 Pre-marcados por defecto
      {
        codigo: 'MNT-ACEITE-MOT',
        nombre: 'Aceite de Motor (15W-40 Mobil Delvac)',
        intervaloKm: 5000,
        preMarcado: true,
      },
      {
        codigo: 'MNT-FILT-ACEITE',
        nombre: 'Filtro de Aceite de Motor',
        intervaloKm: 5000,
        preMarcado: true,
      },
      {
        codigo: 'MNT-FILT-TRAMPA',
        nombre: 'Filtro Trampa de Agua (Separador Diésel)',
        intervaloKm: 5000,
        preMarcado: true,
      },
      {
        codigo: 'MNT-FILT-DIESEL-SEC',
        nombre: 'Filtro Diésel Secundario',
        intervaloKm: 5000,
        preMarcado: true,
      },
      // 7 Opcionales para selección consciente
      {
        codigo: 'MNT-SOPLADO-AIRE',
        nombre: 'Soplado de Filtro de Aire',
        intervaloKm: 5000,
        preMarcado: false,
        opcionalTexto: 'Aprovechamiento en fosa',
      },
      {
        codigo: 'MNT-LAVADO-MALLA-PASILLO',
        nombre: 'Lavado Malla Aire Pasillo',
        intervaloKm: 5000,
        preMarcado: false,
        opcionalTexto: 'Aprovechamiento en fosa',
      },
      {
        codigo: 'MNT-ENGRASE-CHASIS',
        nombre: 'Engrase de Chasis en Fosa',
        intervaloKm: 1500,
        preMarcado: false,
        opcionalTexto: 'Engrase completo con pistola neumática',
      },
      {
        codigo: 'MNT-FILT-AIRE-SEC',
        nombre: 'Filtro de Aire Pequeño / Seguridad',
        intervaloKm: 20000,
        preMarcado: false,
        opcionalTexto: 'Cada 4 cambios de aceite',
      },
      {
        codigo: 'MNT-FILT-AIRE-GRANDE',
        nombre: 'Filtro de Aire Grande / Exterior',
        intervaloKm: 40000,
        preMarcado: false,
        opcionalTexto: 'Cada 8 cambios de aceite',
      },
      {
        codigo: 'MNT-ACEITE-CAJA',
        nombre: 'Nivel / Cambio Valvulina Caja (GL-4)',
        intervaloKm: 30000,
        preMarcado: false,
        opcionalTexto: 'Revisión periódica en fosa',
      },
      {
        codigo: 'MNT-ACEITE-CORONA',
        nombre: 'Nivel / Cambio Valvulina Corona (GL-5)',
        intervaloKm: 30000,
        preMarcado: false,
        opcionalTexto: 'Revisión periódica en fosa',
      },
    ],
  },

  FRENOS_RUEDAS: {
    id: 'FRENOS_RUEDAS',
    nombre: 'Frenos, Ruedas y Suspensión',
    subtitulo: 'Taller del Frenista y Rodaje (Tambores y Ruedas)',
    icono: '🛑',
    colorBorder: 'border-red-500',
    colorBg: 'bg-red-50',
    items: [
      {
        codigo: 'MNT-ZAPATAS-POST',
        nombre: 'Zapatas y Tambores Posteriores',
        intervaloKm: 8000,
        preMarcado: false,
      },
      {
        codigo: 'MNT-ZAPATAS-DEL',
        nombre: 'Zapatas y Tambores Delanteros',
        intervaloKm: 11000,
        preMarcado: false,
      },
      {
        codigo: 'MNT-BOCINAS-POST',
        nombre: 'Engrase Bocinas Posteriores (+ 4 Retenes)',
        intervaloKm: 50000,
        preMarcado: false,
      },
      {
        codigo: 'MNT-BOCINAS-DEL',
        nombre: 'Engrase Bocinas Delanteras (+ 2 Retenes)',
        intervaloKm: 60000,
        preMarcado: false,
      },
      {
        codigo: 'MNT-MUELLES-BUJES',
        nombre: 'Revisión de Muelles y Bujes de Bronce',
        intervaloKm: 50000,
        preMarcado: false,
      },
      {
        codigo: 'MNT-RACHES-FRENO',
        nombre: 'Calibración de Raches de Freno',
        intervaloKm: 8000,
        preMarcado: false,
      },
    ],
  },

  MNT_MAYOR: {
    id: 'MNT_MAYOR',
    nombre: 'Mantenimiento Mayor',
    subtitulo: 'Taller Especializado / Bajada General (Mesías)',
    icono: '🛠️',
    colorBorder: 'border-purple-500',
    colorBg: 'bg-purple-50',
    items: [
      {
        codigo: 'MNT-MNT-CAJA',
        nombre: 'Mantenimiento General de Caja de Cambios',
        intervaloKm: 150000,
        preMarcado: false,
        esCascadaTrigger: true,
        cascadaAfecta: ['MNT-KIT-EMBRAGUE', 'MNT-ACEITE-CAJA'],
      },
      {
        codigo: 'MNT-MNT-CORONA',
        nombre: 'Mantenimiento General de Corona / Diferencial',
        intervaloKm: 150000,
        preMarcado: false,
        esCascadaTrigger: true,
        cascadaAfecta: ['MNT-ACEITE-CORONA'],
      },
      {
        codigo: 'MNT-KIT-EMBRAGUE',
        nombre: 'Kit de Embrague 350mm (Disco, Prensa, Rulimán)',
        intervaloKm: 100000,
        preMarcado: false,
      },
      {
        codigo: 'MNT-ACEITE-CAJA',
        nombre: 'Cambio de Aceite de Caja (GL-4)',
        intervaloKm: 30000,
        preMarcado: false,
      },
      {
        codigo: 'MNT-ACEITE-CORONA',
        nombre: 'Cambio de Aceite de Corona (GL-5 85W-140)',
        intervaloKm: 30000,
        preMarcado: false,
      },
      {
        codigo: 'MNT-MANGUERAS-ADMISION',
        nombre: 'Ajuste de Mangueras de Admisión e Intercooler',
        intervaloKm: 10000,
        preMarcado: false,
      },
      {
        codigo: 'MNT-BANDAS-MOTOR',
        nombre: 'Juego de Bandas del Motor',
        intervaloKm: 100000,
        preMarcado: false,
      },
      {
        codigo: 'MNT-TERMOSTATO-MOT',
        nombre: 'Termostato del Motor',
        intervaloKm: 100000,
        preMarcado: false,
      },
      {
        codigo: 'MNT-CHAPAS-MOTOR',
        nombre: 'Metales de Motor (Biela y Bancada Estándar)',
        intervaloKm: 800000,
        preMarcado: false,
      },
    ],
  },

  ADMISION_AIRE: {
    id: 'ADMISION_AIRE',
    nombre: 'Sistema de Aire y Admisión',
    subtitulo: 'Taller del Aire, Válvulas y Fuerza de Motor',
    icono: '💨',
    colorBorder: 'border-cyan-500',
    colorBg: 'bg-cyan-50',
    items: [
      {
        codigo: 'MNT-VALVULAS-TOBERAS',
        nombre: 'Calibración de Válvulas y Toberas Denso',
        intervaloKm: 50000,
        preMarcado: false,
      },
      {
        codigo: 'MNT-MANGUERAS-ADMISION',
        nombre: 'Ajuste de Mangueras de Admisión',
        intervaloKm: 10000,
        preMarcado: false,
      },
      {
        codigo: 'MNT-FILT-AIRE-SEC',
        nombre: 'Filtro de Aire Pequeño / Seguridad',
        intervaloKm: 20000,
        preMarcado: false,
      },
      {
        codigo: 'MNT-FILT-AIRE-GRANDE',
        nombre: 'Filtro de Aire Grande / Exterior',
        intervaloKm: 40000,
        preMarcado: false,
      },
    ],
  },

  ALINEACION: {
    id: 'ALINEACION',
    nombre: 'Alineación y Llantas',
    subtitulo: 'Serviteca Especializada de Neumáticos',
    icono: '🛞',
    colorBorder: 'border-emerald-500',
    colorBg: 'bg-emerald-50',
    items: [
      {
        codigo: 'MNT-ALINEACION-LLANTAS',
        nombre: 'Alineación Láser y Chequeo de Llantas 295/80R22.5',
        intervaloKm: 15000,
        preMarcado: false,
      },
    ],
  },

  RADIADOR: {
    id: 'RADIADOR',
    nombre: 'Radiador y Sistema de Enfriamiento',
    subtitulo: 'Lavado Químico, Intercooler y Coolant HD',
    icono: '🧼',
    colorBorder: 'border-blue-500',
    colorBg: 'bg-blue-50',
    items: [
      {
        codigo: 'MNT-RADIADOR-COOLANT',
        nombre: 'Lavado de Radiador, Intercooler y Coolant Larga Vida',
        intervaloKm: 100000,
        preMarcado: false,
      },
    ],
  },

  CHOFER_RUTINA: {
    id: 'CHOFER_RUTINA',
    nombre: 'Rutina Directa de Chofer',
    subtitulo: 'Operación Diaria en Terminal o Parada (3 Toques)',
    icono: '🚌',
    colorBorder: 'border-indigo-500',
    colorBg: 'bg-indigo-50',
    items: [
      {
        codigo: 'MNT-RACHES-FRENO',
        nombre: 'Calibración Manual de Raches de Freno',
        intervaloKm: 800,
        preMarcado: false,
      },
      {
        codigo: 'MNT-ENGRASE-CHASIS',
        nombre: 'Engrase Rápido de Chasis',
        intervaloKm: 1500,
        preMarcado: false,
      },
      {
        codigo: 'MNT-LAVADO-MALLA-PASILLO',
        nombre: 'Lavado de Malla de Aire en Pasillo',
        intervaloKm: 5000,
        preMarcado: false,
      },
    ],
  },
};

/**
 * Resuelve automáticamente los ítems que deben marcarse por efecto cascada
 * (Por ejemplo, al bajar la caja se renuevan embrague y valvulina)
 */
export function resolverCascadaEstacion(codigosSeleccionados: string[]): string[] {
  const resultado = new Set<string>(codigosSeleccionados);

  if (resultado.has('MNT-MNT-CAJA')) {
    resultado.add('MNT-KIT-EMBRAGUE');
    resultado.add('MNT-ACEITE-CAJA');
  }

  if (resultado.has('MNT-MNT-CORONA')) {
    resultado.add('MNT-ACEITE-CORONA');
  }

  return Array.from(resultado);
}


/**
 * Asocia cada estación de servicio con la categoría contable correspondiente en OwnerExpenses
 */
export function getCategoriaContablePorEstacion(estacionId: EstacionServicioId): "ACEITES_FILTROS" | "FRENOS_RODAJE" | "MOTOR_CAJA_CORONA" | "LLANTAS" | "OTROS" {
  switch (estacionId) {
    case "LUBRICADORA":
      return "ACEITES_FILTROS";
    case "FRENOS_RUEDAS":
      return "FRENOS_RODAJE";
    case "MNT_MAYOR":
      return "MOTOR_CAJA_CORONA";
    case "ADMISION_AIRE":
      return "MOTOR_CAJA_CORONA";
    case "ALINEACION":
      return "LLANTAS";
    case "RADIADOR":
      return "MOTOR_CAJA_CORONA";
    case "CHOFER_RUTINA":
      return "OTROS";
    default:
      return "OTROS";
  }
}


// ============================================================================
// ACTIVACIÓN OPTATIVA DEL MÓDULO DE MANTENIMIENTO POR UNIDAD (DECISIÓN DEL SOCIO)
// ============================================================================

export function getBusModuloMantenimientoActivo(busId: string): boolean {
  if (typeof window === "undefined") return true;
  try {
    const raw = localStorage.getItem(`rg_mantenimiento_modulo_activo_${busId}`);
    if (raw === null) return true; // Por defecto activo para unidades existentes
    return raw === "true";
  } catch (e) {
    return true;
  }
}

export function saveBusModuloMantenimientoActivo(busId: string, activo: boolean): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`rg_mantenimiento_modulo_activo_${busId}`, String(activo));
  } catch (e) {
    console.error("Error guardando estado de modulo mantenimiento:", e);
  }
}
