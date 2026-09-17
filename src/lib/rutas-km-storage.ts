import {
  ConfiguracionKilometrajeRutas,
  DEFAULT_CONFIG_KILOMETRAJE_RUTAS,
  TramoKilometraje,
} from '@/types/rutas-km';

const RUTAS_KM_CACHE_KEY = 'rutago_config_tramos_km';

/**
 * Carga la configuración de kilometraje de rutas.
 * 1. Lee de localStorage (caché sincrónico inmediato sin parpadeo).
 * 2. Si hay conexión en background, sincroniza con /api/config/rutas-km.
 * 3. Fallback: DEFAULT_CONFIG_KILOMETRAJE_RUTAS.
 */
export function getLocalRutasKmConfig(): ConfiguracionKilometrajeRutas {
  if (typeof window === 'undefined') return DEFAULT_CONFIG_KILOMETRAJE_RUTAS;
  try {
    const raw = localStorage.getItem(RUTAS_KM_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.tramos) && parsed.tramos.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Error leyendo rutas_km_config local, usando fallback:', err);
  }
  return DEFAULT_CONFIG_KILOMETRAJE_RUTAS;
}

/**
 * Guarda la configuración de kilometraje en localStorage y opcionalmente en el servidor.
 */
export function saveLocalRutasKmConfig(config: ConfiguracionKilometrajeRutas): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(RUTAS_KM_CACHE_KEY, JSON.stringify(config));
    window.dispatchEvent(new CustomEvent('rutago:rutas_km_updated', { detail: config }));
  } catch (err) {
    console.error('Error guardando rutas_km_config local:', err);
  }
}

/**
 * Sincronización silenciosa con /api/config/rutas-km cuando hay red.
 */
export async function syncRutasKmConfig(): Promise<ConfiguracionKilometrajeRutas> {
  try {
    const res = await fetch('/api/config/rutas-km', { cache: 'no-store' });
    if (res.ok) {
      const json = await res.json();
      if (json && json.success && json.data) {
        saveLocalRutasKmConfig(json.data);
        return json.data;
      }
    }
  } catch (err) {
    console.warn('Sincronización silenciosa de rutas_km omitida (offline o error de red):', err);
  }
  return getLocalRutasKmConfig();
}
