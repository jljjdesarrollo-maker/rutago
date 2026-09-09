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
}

export interface VTSession {
  vtCode: string;
  nombre: string;
  ayudanteId: string;
  ayudanteNombre: string;
  fecha: string; // Fecha del turno (cuando se inició, no necesariamente hoy)
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

// Load/save helpers
export function loadPromoConfig(): PromoViajeGratisConfig {
  try {
    const raw = localStorage.getItem(PROMO_CONFIG_KEY);
    if (raw) return { ...DEFAULT_PROMO_CONFIG, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return { ...DEFAULT_PROMO_CONFIG };
}

export function savePromoConfig(config: PromoViajeGratisConfig): void {
  try {
    localStorage.setItem(PROMO_CONFIG_KEY, JSON.stringify(config));
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
}

export function calcularEstadoTiempoVenta(
  horaFrecuencia: string,
  ruta: string,
  fechaOperacion?: string,
  configCustom?: TiempoVentaConfig
): EstadoTiempoVenta {
  const config = configCustom || loadTiempoVentaConfig();
  const esCorta = esRutaCorta(ruta);
  const tiempoAlerta = esCorta ? config.tiempoAlertaCorta : config.tiempoAlertaExtendida;
  const tiempoLimite = esCorta ? config.tiempoLimiteCorta : config.tiempoLimiteExtendida;

  if (!horaFrecuencia) {
    return {
      minutosTranscurridos: 0,
      tiempoAlerta,
      tiempoLimite,
      enAlerta: false,
      bloqueado: false,
      tiempoRestante: tiempoLimite,
      esCorta,
    };
  }

  const parts = horaFrecuencia.split(':');
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
    };
  }

  const now = new Date();
  const scheduled = new Date();
  if (fechaOperacion) {
    const fParts = fechaOperacion.split('-').map(Number);
    if (fParts.length === 3 && !isNaN(fParts[0])) {
      scheduled.setFullYear(fParts[0], fParts[1] - 1, fParts[2]);
    }
  }
  scheduled.setHours(hh, mm, 0, 0);

  const diffMs = now.getTime() - scheduled.getTime();
  const minutosTranscurridos = Math.floor(diffMs / (1000 * 60));

  const bloqueado = minutosTranscurridos >= tiempoLimite;
  const enAlerta = minutosTranscurridos >= tiempoAlerta && !bloqueado;
  const tiempoRestante = Math.max(0, tiempoLimite - minutosTranscurridos);

  return {
    minutosTranscurridos,
    tiempoAlerta,
    tiempoLimite,
    enAlerta,
    bloqueado,
    tiempoRestante,
    esCorta,
  };
}
