import { getEcuadorDateString } from "@/lib/date-helpers";
export interface FrecuenciaData {
  id: string;
  vtCode: string;
  nombre: string;
  ruta: string;
  hora: string;
  direccion: string;
  activo: boolean;
  createdAt: string;
}

export interface FrecuenciaEstado {
  id: string;
  estadoId: string;
  frecuenciaId: string;
  nombre: string;
  ruta: string;
  hora: string;
  direccion: string;
  estado: 'pendiente' | 'abierta' | 'cerrada' | 'no_realizada';
  ventasCount: number;
  totalRecaudado: number;
  motivoNoRealizada?: string;
  ingresoEspecialNota?: string;     // nota libre (ej: "Viaje al Cisne")
  ingresoEspecialMonto?: number;     // monto recaudado en viaje especial
  ganadorPosicion?: number | null;  // random position for free trip winner
  cajaComunCount?: number;          // boletos vendidos en oficina Loja (caja común)
  cajaComunMonto?: number;         // monto total de boletos caja común (suma manual)
  esPernoctaRetorno?: boolean;      // true si es la primera vuelta del día 2 tras pernocta
  diaTurno?: number;                // 1 = Mismo día de apertura, 2 = Retorno pernocta
}

export interface VTSession {
  vtCode: string;
  nombre: string;
  ayudanteId: string;
  ayudanteNombre: string;
  fecha: string; // Fecha del turno (cuando se inició, no necesariamente hoy)
  busId?: string; // Disco o ID del autobús físico de la jornada (Fase 3 Multi-bus)
  numeroDisco?: string;
  placaBus?: string;
  odometroInicial?: number;
  esReemplazo?: boolean;
  nombreReemplazo?: string;
  esReemplazoSecretaria?: boolean;
}

// ─── Viaje Gratis Promotion ───

export interface PromoViajeGratisConfig {
  activa: boolean;          // master switch
  rangoMin: number;         // min position for winner (default 3, never first 2)
  rangoMax: number;         // max position for winner (default 30)
  textoPublicidad: string;  // ad text at bottom of ticket
  sonidoGanador: boolean;    // beep when winner
}

export const DEFAULT_PROMO_CONFIG: PromoViajeGratisConfig = {
  activa: true,
  rangoMin: 3,
  rangoMax: 30,
  textoPublicidad: 'Quieres RutaGo? 0997149000',
  sonidoGanador: true,
};

// localStorage key
export const PROMO_CONFIG_KEY = 'rg_promo_config';

// Helper para clave de almacenamiento por unidad física
export function getBusPromoStorageKey(busIdOrDisco?: string): string {
  if (!busIdOrDisco) return PROMO_CONFIG_KEY;
  const cleanDisco = busIdOrDisco.replace(/^BUS-/, '').padStart(2, '0');
  return "rg_promo_config_bus_" + cleanDisco;
}

// Load/save helpers con soporte de desacoplamiento por Unidad / Autobús
export function loadPromoConfig(busIdOrDisco?: string): PromoViajeGratisConfig {
  if (typeof window === 'undefined') return { ...DEFAULT_PROMO_CONFIG };
  try {
    // Texto publicitario oficial SaaS definido centralmente por SuperAdmin
    let globalTexto = DEFAULT_PROMO_CONFIG.textoPublicidad;
    const globalRaw = localStorage.getItem(PROMO_CONFIG_KEY);
    if (globalRaw) {
      try {
        const parsedGlobal = JSON.parse(globalRaw);
        if (parsedGlobal.textoPublicidad && typeof parsedGlobal.textoPublicidad === 'string') {
          globalTexto = parsedGlobal.textoPublicidad;
        }
      } catch { /* ignore */ }
    }

    // 1. Si se especifica unidad, buscar mecánica operativa exclusiva del vehículo
    if (busIdOrDisco) {
      const busKey = getBusPromoStorageKey(busIdOrDisco);
      const busRaw = localStorage.getItem(busKey);
      if (busRaw) {
        const busCfg = JSON.parse(busRaw);
        return {
          ...DEFAULT_PROMO_CONFIG,
          ...busCfg,
          // El texto publicitario siempre está blindado y centralizado por SuperAdmin
          textoPublicidad: globalTexto,
        };
      }
    }
    // 2. Fallback a configuración general
    if (globalRaw) {
      return { ...DEFAULT_PROMO_CONFIG, ...JSON.parse(globalRaw), textoPublicidad: globalTexto };
    }
  } catch { /* ignore */ }
  return { ...DEFAULT_PROMO_CONFIG };
}

export function savePromoConfig(config: PromoViajeGratisConfig, busIdOrDisco?: string): void {
  if (typeof window === 'undefined') return;
  try {
    const key = busIdOrDisco ? getBusPromoStorageKey(busIdOrDisco) : PROMO_CONFIG_KEY;
    localStorage.setItem(key, JSON.stringify(config));
    // Emitir evento para reactividad sin re-renders infinitos
    window.dispatchEvent(new CustomEvent('rutago:promo_config_updated', {
      detail: { busId: busIdOrDisco, config }
    }));
  } catch (e) { console.error('Error saving promo config:', e); }
}

// ─── Control de Tiempos Prudenciales de Venta por Frecuencia ───
export interface TiempoVentaConfig {
  tiempoAlertaCorta: number;      // Minutos alerta ruta corta (default 85)
  tiempoLimiteCorta: number;      // Minutos bloqueo ruta corta (default 90)
  tiempoAlertaExtendida: number;  // Minutos alerta ruta extendida (default 135)
  tiempoLimiteExtendida: number;  // Minutos bloqueo ruta extendida (default 140)
}

export const DEFAULT_TIEMPO_VENTA_CONFIG: TiempoVentaConfig = {
  tiempoAlertaCorta: 85,
  tiempoLimiteCorta: 90,
  tiempoAlertaExtendida: 135,
  tiempoLimiteExtendida: 140,
};

export const TIEMPO_VENTA_CONFIG_KEY = 'rg_tiempo_venta_config';

export function loadTiempoVentaConfig(): TiempoVentaConfig {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(TIEMPO_VENTA_CONFIG_KEY) : null;
    if (raw) return { ...DEFAULT_TIEMPO_VENTA_CONFIG, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return { ...DEFAULT_TIEMPO_VENTA_CONFIG };
}

export function saveTiempoVentaConfig(config: TiempoVentaConfig): void {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(TIEMPO_VENTA_CONFIG_KEY, JSON.stringify(config));
    }
  } catch (e) {
    console.error('Error saving tiempo venta config:', e);
  }
}

export function esRutaCorta(ruta: string): boolean {
  const r = (ruta || '').toLowerCase();
  const esExtendida = r.includes('yangana') || r.includes('elvira') || r.includes('zahuayco') || r.includes('tambo');
  if (esExtendida) return false;
  const contieneLoja = r.includes('loja');
  const contieneVilcabamba = r.includes('vilcabamba');
  if (contieneLoja && contieneVilcabamba) return true;
  return false;
}

export interface EstadoTiempoVenta {
  minutosTranscurridos: number;
  tiempoAlerta: number;
  tiempoLimite: number;
  enAlerta: boolean;
  bloqueado: boolean;
  tiempoRestante: number;
  esCorta: boolean;
  esPernocta?: boolean;
  bloqueadoPorAnticipacion?: boolean;
  tiempoAnticipacionMinutos?: number;
}

export function calcularEstadoTiempoVenta(
  horaFrecuencia: string,
  ruta: string,
  fechaOperacion?: string,
  configCustom?: TiempoVentaConfig,
  esPernoctaRetorno?: boolean,
  fechaReferencia?: Date
): EstadoTiempoVenta {
  const config = configCustom || loadTiempoVentaConfig();
  const esCorta = esRutaCorta(ruta);
  const tiempoAlerta = esCorta ? config.tiempoAlertaCorta : config.tiempoAlertaExtendida;
  const tiempoLimite = esCorta ? config.tiempoLimiteCorta : config.tiempoLimiteExtendida;
  const TIEMPO_ANTICIPACION_MAX = 45; // Ventas permitidas maximo 45 min antes de salida

  if (!horaFrecuencia) {
    return {
      minutosTranscurridos: 0,
      tiempoAlerta,
      tiempoLimite,
      enAlerta: false,
      bloqueado: false,
      tiempoRestante: tiempoLimite,
      esCorta,
      esPernocta: Boolean(esPernoctaRetorno),
      bloqueadoPorAnticipacion: false,
      tiempoAnticipacionMinutos: TIEMPO_ANTICIPACION_MAX,
    };
  }

  const parts = horaFrecuencia.split(":");
  const hh = parseInt(parts[0], 10);
  const mm = parseInt(parts[1], 10);

  if (isNaN(hh) || isNaN(mm)) {
    return {
      minutosTranscurridos: 0,
      tiempoAlerta,
      tiempoLimite,
      enAlerta: false,
      bloqueado: false,
      tiempoRestante: tiempoLimite,
      esCorta,
      esPernocta: Boolean(esPernoctaRetorno),
      bloqueadoPorAnticipacion: false,
      tiempoAnticipacionMinutos: TIEMPO_ANTICIPACION_MAX,
    };
  }

  const now = fechaReferencia || new Date();
  const scheduled = new Date(now.getTime());

  if (fechaOperacion) {
    const fParts = fechaOperacion.split("-").map(Number);
    if (fParts.length === 3 && !isNaN(fParts[0])) {
      scheduled.setFullYear(fParts[0], fParts[1] - 1, fParts[2]);
    }
  }
  scheduled.setHours(hh, mm, 0, 0);

  // ─── REGLA CANONICA ESTRICTA DE RETORNO AL DIA SIGUIENTE (PERNOCTA OFICIAL / DIA 2) ───
  // Unicamente cuando la frecuencia es explicitamente un retorno oficial de pernocta (esPernoctaRetorno === true)
  // o cuando no se definio explicitamente (undefined) en una vuelta matutina (hh < 12) de sesion previa.
  // Si esPernoctaRetorno === false (turnos diurnos o vueltas del Dia 1), JAMAS se desplaza la fecha,
  // bloqueando de inmediato desde la primera vuelta matutina cualquier intento de emitir boletos en vivo
  // con una fecha anterior ("Ayer" / otra fecha), mientras que el registro de dias trabajados y arqueos
  // sin venta de boletos permanece 100% libre en FrecuenciaSelector / ArqueoScreen.
  const esPernoctaEfectiva =
    esPernoctaRetorno === true ||
    (esPernoctaRetorno === undefined && Boolean(fechaOperacion && getEcuadorDateString(now) > fechaOperacion && hh < 12));
  if (esPernoctaEfectiva) {
    scheduled.setDate(scheduled.getDate() + 1);
  }

  const diffMs = now.getTime() - scheduled.getTime();
  const minutosTranscurridos = Math.floor(diffMs / (1000 * 60));

  // 1. Bloqueo por tiempo limite excedido de viaje (85-90 min o 135-140 min)
  const bloqueadoPorTiempoLimite = minutosTranscurridos >= tiempoLimite;

  // 2. Bloqueo por compuerta de anticipacion (no permitir venta si faltan > 45 min)
  const bloqueadoPorAnticipacion = minutosTranscurridos < -TIEMPO_ANTICIPACION_MAX;

  const bloqueado = bloqueadoPorTiempoLimite || bloqueadoPorAnticipacion;
  const enAlerta = minutosTranscurridos >= tiempoAlerta && !bloqueadoPorTiempoLimite && !bloqueadoPorAnticipacion;
  const tiempoRestante = Math.max(0, tiempoLimite - Math.max(0, minutosTranscurridos));

  return {
    minutosTranscurridos,
    tiempoAlerta,
    tiempoLimite,
    enAlerta,
    bloqueado,
    tiempoRestante,
    esCorta,
    esPernocta: esPernoctaEfectiva,
    bloqueadoPorAnticipacion,
    tiempoAnticipacionMinutos: TIEMPO_ANTICIPACION_MAX,
  };
}
