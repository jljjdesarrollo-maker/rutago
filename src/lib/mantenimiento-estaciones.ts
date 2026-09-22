import { getCatalogoMaestroGlobal } from "./mantenimiento-catalogo";
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
  'MNT-ROTACION-BATERIAS',  // Rotación Mensual de Baterías Chofer (8,600 km / 30 días)
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
    nombre: 'Control Medio (16)',
    badge: 'Operativo & Rodaje',
    descripcion: 'Básico + rotación mensual de baterías, valvulinas, sistema de aire, bocinas y zapatas.',
    color: 'amber',
    codigosRecomendados: CODIGOS_NIVEL_MEDIO,
  },
  TOTAL: {
    id: 'TOTAL',
    nombre: 'Control Total (29)',
    badge: 'Full Hino AK',
    descripcion: 'Auditoría integral de los 5 bloques mecánicos, baterías 24V, transmisión mayor y metales.',
    color: 'blue',
    codigosRecomendados: [], // Vacío = activa todos los del catálogo oficial
  },
};

// ==========================================
// PERSISTENCIA LOCAL Y CLOUD POR AUTOBÚS (busId)
// ==========================================

const STORAGE_PREFIX_NIVEL = 'rg_mnt_nivel_control_';
const STORAGE_PREFIX_ITEMS = 'rg_mnt_items_activos_';
const STORAGE_PREFIX_MODULO = 'rg_mantenimiento_modulo_activo_';
const STORAGE_PREFIX_DECISION = 'rg_mantenimiento_decision_';
export const STORAGE_PREFIX_COMBO_UNIDAD = 'rg_combo_estacion_v1_';

/**
 * Consulta y sincroniza la configuración de mantenimiento con el servidor central
 * Esto permite que las decisiones tomadas en el móvil se repliquen automáticamente en la PC y viceversa.
 */
export async function syncMantenimientoConfigConServidor(busId: string): Promise<any> {
  if (typeof window === 'undefined') return null;
  try {
    const res = await fetch(`/api/config/mantenimiento?busId=${encodeURIComponent(busId)}`);
    if (!res.ok) return null;
    const json = await res.json();
    if (json?.success && json?.data) {
      const data = json.data;
      if (typeof data.moduloActivo === 'boolean') {
        localStorage.setItem(`${STORAGE_PREFIX_MODULO}${busId}`, String(data.moduloActivo));
      }
      if (data.nivelControl === 'BASICO' || data.nivelControl === 'MEDIO' || data.nivelControl === 'TOTAL') {
        localStorage.setItem(`${STORAGE_PREFIX_NIVEL}${busId}`, data.nivelControl);
      }
      if (data.itemsActivos && typeof data.itemsActivos === 'object') {
        localStorage.setItem(`${STORAGE_PREFIX_ITEMS}${busId}`, JSON.stringify(data.itemsActivos));
      }
      if (typeof data.decisionTomada === 'boolean') {
        localStorage.setItem(`${STORAGE_PREFIX_DECISION}${busId}`, String(data.decisionTomada));
      }
      // FASE B: Hidratar combos personalizados descargados desde el servidor
      if (data.combosPersonalizados && typeof data.combosPersonalizados === 'object') {
        let combosCargados = 0;
        Object.entries(data.combosPersonalizados).forEach(([estacionId, comboData]) => {
          if (comboData && typeof comboData === 'object') {
            localStorage.setItem(
              `${STORAGE_PREFIX_COMBO_UNIDAD}${busId}_${estacionId}`,
              JSON.stringify(comboData)
            );
            combosCargados++;
          }
        });
        if (combosCargados > 0) {
          window.dispatchEvent(
            new CustomEvent('rg_combo_unidad_actualizado', {
              detail: { busId, totalCombos: combosCargados },
            })
          );
        }
      }
      window.dispatchEvent(new CustomEvent('rg_mantenimiento_config_sync', { detail: data }));
      return data;
    }
  } catch (err) {
    console.warn('Aviso: Sincronización en segundo plano con servidor:', err);
  }
  return null;
}

/**
 * Notifica al servidor central en segundo plano cualquier cambio en la configuración
 */
export function pushMantenimientoConfigAlServidor(
  busId: string,
  partial: {
    moduloActivo?: boolean;
    nivelControl?: NivelControlMantenimiento;
    itemsActivos?: Record<string, boolean>;
    combosPersonalizados?: Record<string, ComboUnidadPersonalizado>;
    comboActualizado?: ComboUnidadPersonalizado;
    comboEliminadoEstacionId?: string;
    decisionTomada?: boolean;
  }
): void {
  if (typeof window === 'undefined') return;
  try {
    const origen = typeof navigator !== 'undefined' && navigator.userAgent.includes('Mobile')
      ? 'Dispositivo Móvil'
      : 'Computadora / PC';

    fetch('/api/config/mantenimiento', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        busId,
        ...partial,
        origenDispositivo: origen,
        fechaDecision: new Date().toISOString().split('T')[0],
      }),
    }).catch(err => console.warn('Aviso al sincronizar en servidor:', err));
  } catch (err) {
    console.warn('Error al enviar configuración de mantenimiento a la nube:', err);
  }
}

export function getBusNivelControl(busId: string): NivelControlMantenimiento {
  if (typeof window === 'undefined') return busId === 'BUS-01' ? 'TOTAL' : 'BASICO';
  try {
    const saved = localStorage.getItem(`${STORAGE_PREFIX_NIVEL}${busId}`);
    if (saved === 'BASICO' || saved === 'MEDIO' || saved === 'TOTAL') {
      return saved;
    }
    // Para la Unidad 01 del Socio Líder, el plan oficial calibrado es TOTAL
    if (busId === 'BUS-01') {
      return 'TOTAL';
    }
  } catch (err) {
    console.error('Error al leer nivel de control de bus:', err);
  }
  return busId === 'BUS-01' ? 'TOTAL' : 'BASICO';
}

export function saveBusNivelControl(busId: string, nivel: NivelControlMantenimiento): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${STORAGE_PREFIX_NIVEL}${busId}`, nivel);
    localStorage.setItem(`${STORAGE_PREFIX_DECISION}${busId}`, 'true');
    pushMantenimientoConfigAlServidor(busId, { nivelControl: nivel, decisionTomada: true });
    window.dispatchEvent(new CustomEvent('rg_mantenimiento_config_sync', { detail: { busId, nivelControl: nivel } }));
  } catch (err) {
    console.error('Error al guardar nivel de control de bus:', err);
  }
}

export function getBusItemsActivosConfig(busId: string, todosCodigosCatalogo?: string[]): Record<string, boolean> {
  const codigosCatalogo = (todosCodigosCatalogo && todosCodigosCatalogo.length > 0)
    ? todosCodigosCatalogo
    : getCatalogoMaestroGlobal().map(c => c.codigo);
  if (typeof window === 'undefined') {
    const fallback: Record<string, boolean> = {};
    if (busId === 'BUS-01') {
      codigosCatalogo.forEach(cod => { fallback[cod] = true; });
    } else {
      CODIGOS_NIVEL_BASICO.forEach(cod => { fallback[cod] = true; });
    }
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

    if (nivel === 'TOTAL' || busId === 'BUS-01') {
      codigosCatalogo.forEach(cod => { config[cod] = true; });
    } else if (nivel === 'MEDIO') {
      const setMedio = new Set(CODIGOS_NIVEL_MEDIO);
      codigosCatalogo.forEach(cod => { config[cod] = setMedio.has(cod); });
    } else {
      const setBasico = new Set(CODIGOS_NIVEL_BASICO);
      codigosCatalogo.forEach(cod => { config[cod] = setBasico.has(cod); });
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
    pushMantenimientoConfigAlServidor(busId, { itemsActivos: config });
    window.dispatchEvent(new CustomEvent('rg_mantenimiento_config_sync', { detail: { busId, itemsActivos: config } }));
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
        codigo: 'MNT-BATERIAS-PAR',
        nombre: 'Renovación de Baterías (Juego Par 24V - 2 Años)',
        intervaloKm: 200000,
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
      {
        codigo: 'MNT-ROTACION-BATERIAS',
        nombre: 'Rotación Mensual de Baterías (Intercambio A⇄B y Bornes)',
        intervaloKm: 8600,
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

  if (resultado.has('MNT-BATERIAS-PAR')) {
    resultado.add('MNT-ROTACION-BATERIAS');
  }

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
  if (typeof window === 'undefined') return busId === 'BUS-01';
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX_MODULO}${busId}`);
    // Si ya existe registro expreso guardado localmente:
    if (raw !== null) {
      return raw === 'true';
    }
    // Para la Unidad 01 Oficial del Socio Líder, el módulo ya está activado por decisión previa
    if (busId === 'BUS-01') {
      return true;
    }
    // Para otras unidades no configuradas, por defecto es FALSE hasta que el socio lo decida
    return false;
  } catch (e) {
    return busId === 'BUS-01';
  }
}

export function isBusModuloMantenimientoConfigurado(busId: string): boolean {
  if (typeof window === 'undefined') return busId === 'BUS-01';
  try {
    if (busId === 'BUS-01') return true;
    return localStorage.getItem(`${STORAGE_PREFIX_MODULO}${busId}`) !== null ||
      localStorage.getItem(`${STORAGE_PREFIX_DECISION}${busId}`) !== null;
  } catch (e) {
    return busId === 'BUS-01';
  }
}

export function isMantenimientoDecisionTomada(busId: string): boolean {
  if (typeof window === 'undefined') return busId === 'BUS-01';
  try {
    if (busId === 'BUS-01') return true;
    const dec = localStorage.getItem(`${STORAGE_PREFIX_DECISION}${busId}`);
    if (dec === 'true') return true;
    return localStorage.getItem(`${STORAGE_PREFIX_MODULO}${busId}`) !== null;
  } catch (e) {
    return busId === 'BUS-01';
  }
}

export function saveBusModuloMantenimientoActivo(busId: string, activo: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${STORAGE_PREFIX_MODULO}${busId}`, String(activo));
    localStorage.setItem(`${STORAGE_PREFIX_DECISION}${busId}`, 'true');
    pushMantenimientoConfigAlServidor(busId, { moduloActivo: activo, decisionTomada: true });
    window.dispatchEvent(new CustomEvent('rg_mantenimiento_config_sync', { detail: { busId, moduloActivo: activo } }));
  } catch (e) {
    console.error('Error guardando estado de modulo mantenimiento:', e);
  }
}

/**
 * Guarda y sincroniza la configuración integral de mantenimiento de una unidad en un solo paso atómico.
 * Evita condiciones de carrera entre llamadas concurrentes en la red y asegura persistencia inmediata
 * tanto en localStorage como en el servidor centralizado.
 */
export function saveBusMantenimientoConfigCompleta(
  busId: string,
  config: {
    moduloActivo: boolean;
    nivelControl: NivelControlMantenimiento;
    itemsActivos: Record<string, boolean>;
    decisionTomada?: boolean;
  }
): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`${STORAGE_PREFIX_MODULO}${busId}`, String(config.moduloActivo));
    localStorage.setItem(`${STORAGE_PREFIX_NIVEL}${busId}`, config.nivelControl);
    localStorage.setItem(`${STORAGE_PREFIX_ITEMS}${busId}`, JSON.stringify(config.itemsActivos));
    localStorage.setItem(`${STORAGE_PREFIX_DECISION}${busId}`, "true");

    pushMantenimientoConfigAlServidor(busId, {
      moduloActivo: config.moduloActivo,
      nivelControl: config.nivelControl,
      itemsActivos: config.itemsActivos,
      combosPersonalizados: getAllCombosPersonalizadosByBus(busId),
      decisionTomada: true,
    });

    window.dispatchEvent(
      new CustomEvent("rg_mantenimiento_config_sync", {
        detail: {
          busId,
          moduloActivo: config.moduloActivo,
          nivelControl: config.nivelControl,
          itemsActivos: config.itemsActivos,
          decisionTomada: true,
        },
      })
    );
  } catch (err) {
    console.error("Error al guardar configuración completa de mantenimiento:", err);
  }
}

// ==========================================
// PERSISTENCIA Y RECETA DE COMBOS POR UNIDAD (FASE 1)
// ==========================================

// ==========================================
// RECETAS DE ESTACIONES PERSONALIZADAS POR UNIDAD (FASE 1 Y 2)
// ==========================================

export interface ComboUnidadPersonalizado {
  busId: string;
  estacionId: EstacionServicioId;
  // Items configurados: codigo -> estaPreMarcado (si se atiende por defecto en esta parada)
  itemsSeleccionados: Record<string, boolean>;
  // Codigos adicionales agregados del catalogo maestro a esta estacion
  codigosExtras?: string[];
  // Codigos base de fabrica que el socio decidio remover de la receta de su bus
  codigosExcluidos?: string[];
  actualizadoEn?: string;
}

// STORAGE_PREFIX_COMBO_UNIDAD exportado arriba

/**
 * Códigos esenciales que NO pueden eliminarse físicamente de la receta de Lubricadora
 * para proteger la vida del motor contra descuidos mecánicos.
 */
export const CODIGOS_PROTEGIDOS_LUBRICADORA = [
  'MNT-ACEITE-MOT',
  'MNT-FILT-ACEITE',
  'MNT-FILT-TRAMPA',
  'MNT-FILT-DIESEL-SEC',
];

/**
 * Verifica si un código de componente está protegido y no debe ser eliminado de su receta.
 */
export function isItemProtegidoReceta(estacionId: EstacionServicioId, codigo: string): boolean {
  if (estacionId === 'LUBRICADORA') {
    return CODIGOS_PROTEGIDOS_LUBRICADORA.includes(codigo);
  }
  return false;
}

/**
 * Obtiene la configuración personalizada del combo de una estación para un bus específico.
 * Si no existe personalización (o es un bus nuevo), retorna los defaults oficiales de ESTACIONES_SERVICIO_CONFIG.
 */
export function getComboUnidad(busId: string, estacionId: EstacionServicioId): {
  items: ItemEstacionConfig[];
  codigosPreMarcados: string[];
  codigosExcluidos: string[];
} {
  const estacionBase = ESTACIONES_SERVICIO_CONFIG[estacionId];
  if (!estacionBase) {
    return { items: [], codigosPreMarcados: [], codigosExcluidos: [] };
  }

  if (typeof window === 'undefined') {
    return {
      items: estacionBase.items,
      codigosPreMarcados: estacionBase.items.filter(it => it.preMarcado).map(it => it.codigo),
      codigosExcluidos: [],
    };
  }

  try {
    const raw = localStorage.getItem(STORAGE_PREFIX_COMBO_UNIDAD + busId + "_" + estacionId);
    if (!raw) {
      // DEFAULT OFICIAL DE FÁBRICA PARA NUEVOS SOCIOS / BUSES
      return {
        items: estacionBase.items,
        codigosPreMarcados: estacionBase.items.filter(it => it.preMarcado).map(it => it.codigo),
        codigosExcluidos: [],
      };
    }

    const data: ComboUnidadPersonalizado = JSON.parse(raw);
    const catalogo = getCatalogoMaestroGlobal();
    const mapCatalogo = new Map(catalogo.map(c => [c.codigo, c]));

    const codigosExcluidosArr = Array.isArray(data.codigosExcluidos) ? data.codigosExcluidos : [];
    const excluidosSet = new Set(codigosExcluidosArr);

    // 1. Items base de la estación (respetando exclusiones excepto protegidos)
    const itemsMap = new Map<string, ItemEstacionConfig>();
    estacionBase.items.forEach(it => {
      // Si el socio lo excluyó y no es protegido, se omite de la receta
      const esProtegido = isItemProtegidoReceta(estacionId, it.codigo);
      if (excluidosSet.has(it.codigo) && !esProtegido) {
        return;
      }

      const estaMarcado = data.itemsSeleccionados?.[it.codigo] !== undefined 
        ? data.itemsSeleccionados[it.codigo] 
        : it.preMarcado;
      itemsMap.set(it.codigo, {
        ...it,
        preMarcado: estaMarcado,
      });
    });

    // 2. Si el socio agregó códigos extras del catálogo a esta estación
    if (data.codigosExtras && Array.isArray(data.codigosExtras)) {
      data.codigosExtras.forEach(cod => {
        // Solo agregar si no está en la lista de excluidos
        if (excluidosSet.has(cod)) return;

        if (!itemsMap.has(cod)) {
          const catItem = mapCatalogo.get(cod);
          if (catItem) {
            const estaMarcado = data.itemsSeleccionados?.[cod] !== undefined
              ? data.itemsSeleccionados[cod]
              : true;
            itemsMap.set(cod, {
              codigo: catItem.codigo,
              nombre: catItem.nombre,
              intervaloKm: catItem.intervaloKmOficial || 5000,
              preMarcado: estaMarcado,
              opcionalTexto: 'Añadido por el socio para esta unidad',
            });
          }
        }
      });
    }

    const itemsFinales = Array.from(itemsMap.values());
    const codigosPreMarcados = itemsFinales.filter(it => it.preMarcado).map(it => it.codigo);

    return {
      items: itemsFinales,
      codigosPreMarcados,
      codigosExcluidos: codigosExcluidosArr,
    };
  } catch (err) {
    console.error('Error cargando combo personalizado de unidad:', err);
    return {
      items: estacionBase.items,
      codigosPreMarcados: estacionBase.items.filter(it => it.preMarcado).map(it => it.codigo),
      codigosExcluidos: [],
    };
  }
}

/**
 * Guarda la receta personalizada del combo de una estación para la unidad del socio.
 */
/**
 * Recupera todas las recetas de combos personalizadas guardadas para un autobús.
 */
export function getAllCombosPersonalizadosByBus(busId: string): Record<string, ComboUnidadPersonalizado> {
  if (typeof window === 'undefined') return {};
  const result: Record<string, ComboUnidadPersonalizado> = {};
  try {
    const prefix = `${STORAGE_PREFIX_COMBO_UNIDAD}${busId}_`;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          const estacionId = key.replace(prefix, '');
          result[estacionId] = parsed;
        }
      }
    }
  } catch (err) {
    console.error('Error al obtener todos los combos personalizados de la unidad:', err);
  }
  return result;
}

/**
 * Envía la receta de un combo personalizado al servidor central para persistencia durable en la nube (PostgreSQL).
 */
export async function pushComboUnidadAlServidor(busId: string, combo: ComboUnidadPersonalizado): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  try {
    const origen = typeof navigator !== 'undefined' && navigator.userAgent.includes('Mobile')
      ? 'Dispositivo Móvil'
      : 'Computadora / PC';
    const res = await fetch('/api/config/mantenimiento', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        busId,
        comboActualizado: combo,
        origenDispositivo: origen,
        fechaDecision: new Date().toISOString().split('T')[0],
      }),
    });
    return res.ok;
  } catch (err) {
    console.warn('Aviso: Persistencia de combo en servidor diferida:', err);
    return false;
  }
}

/**
 * Notifica al servidor central que se restableció un combo a valores de fábrica para eliminarlo de la nube.
 */
export async function pushComboEliminadoAlServidor(busId: string, estacionId: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  try {
    const res = await fetch('/api/config/mantenimiento', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        busId,
        comboEliminadoEstacionId: estacionId,
      }),
    });
    return res.ok;
  } catch (err) {
    console.warn('Aviso: Eliminación de combo en servidor diferida:', err);
    return false;
  }
}

export function saveComboUnidad(
  busId: string,
  estacionId: EstacionServicioId,
  itemsSeleccionados: Record<string, boolean>,
  codigosExtras: string[] = [],
  codigosExcluidos: string[] = []
): void {
  if (typeof window === 'undefined') return;
  try {
    const payload: ComboUnidadPersonalizado = {
      busId,
      estacionId,
      itemsSeleccionados,
      codigosExtras,
      codigosExcluidos,
      actualizadoEn: new Date().toISOString(),
    };
    localStorage.setItem(
      STORAGE_PREFIX_COMBO_UNIDAD + busId + '_' + estacionId,
      JSON.stringify(payload)
    );
    // FASE B: Persistir durablemente en el servidor central / PostgreSQL
    pushComboUnidadAlServidor(busId, payload);
    // Sincronizar evento cross-tab o cross-component
    window.dispatchEvent(
      new CustomEvent('rg_combo_unidad_actualizado', {
        detail: { busId, estacionId },
      })
    );
  } catch (err) {
    console.error('Error guardando combo personalizado de unidad:', err);
  }
}

/**
 * Restablece el combo de una estación para un bus a los valores preestablecidos de fábrica.
 */
export function resetComboUnidad(busId: string, estacionId: EstacionServicioId): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_PREFIX_COMBO_UNIDAD + busId + "_" + estacionId);
    // FASE B: Eliminar del servidor central / PostgreSQL
    pushComboEliminadoAlServidor(busId, estacionId);
    window.dispatchEvent(
      new CustomEvent('rg_combo_unidad_actualizado', {
        detail: { busId, estacionId },
      })
    );
  } catch (err) {
    console.error('Error restableciendo combo de unidad:', err);
  }
}
