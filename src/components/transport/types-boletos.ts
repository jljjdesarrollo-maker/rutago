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
  ganadorPosicion?: number | null;  // random position for free trip winner
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
  textoPublicidad: 'Usa RutaGo en tu bus\n0997149000',
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
