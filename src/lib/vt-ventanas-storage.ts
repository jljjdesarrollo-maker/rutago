/**
 * Almacenamiento y Sincronización Ultrarrápida de Ventanas Operativas (RutaGo)
 * Estrategia Version Fingerprint: 0 ms de latencia y Cero Consultas Innecesarias a BD.
 */

import {
  FlotaConfiguracionCompleta,
  FlotaConfiguracionFingerprint,
  VentanaOperativa,
  VTConfiguracionItem,
} from '../types/vt-ventanas';
import { CONFIGURACION_FLOTA_DEFAULT } from './vt-ventanas-catalogo';

const STORAGE_KEY = 'rg_flota_vt_config_v1';
const FINGERPRINT_KEY = 'rg_flota_vt_fingerprint_v1';
const EVENT_UPDATED = 'rg_vt_config_updated';

// ─── LECTURA INSTANTÁNEA EN LOCAL (0 ms) ───
export function getConfiguracionFlotaLocal(): FlotaConfiguracionCompleta {
  if (typeof window === 'undefined') {
    return CONFIGURACION_FLOTA_DEFAULT;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.vts && Array.isArray(parsed.vts) && parsed.version) {
        return parsed as FlotaConfiguracionCompleta;
      }
    }
  } catch (err) {
    console.warn('[VTStorage] Fallback a configuración base:', err);
  }

  // Primera ejecución: guardar inicial en local
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(CONFIGURACION_FLOTA_DEFAULT));
    localStorage.setItem(
      FINGERPRINT_KEY,
      JSON.stringify({
        version: CONFIGURACION_FLOTA_DEFAULT.version,
        updatedAt: CONFIGURACION_FLOTA_DEFAULT.updatedAt,
        modoRetenActivo: CONFIGURACION_FLOTA_DEFAULT.modoRetenActivo,
        hash: CONFIGURACION_FLOTA_DEFAULT.hash,
      })
    );
  } catch {
    // Ignore storage quota
  }

  return CONFIGURACION_FLOTA_DEFAULT;
}

// ─── CONSULTAS DIRECTAS POR TURNO VT ───
export function getVTConfiguracion(codigoVT: string): VTConfiguracionItem | null {
  const config = getConfiguracionFlotaLocal();
  const code = (codigoVT || '').trim().toUpperCase();
  // Normalizar "VT08" a "VT8" si es necesario
  const match = config.vts.find(
    (v) => v.codigo.toUpperCase() === code || v.codigo.replace('VT0', 'VT').toUpperCase() === code
  );
  return match || null;
}

export function getVentanasOperativasParaVT(codigoVT: string): VentanaOperativa[] {
  const vt = getVTConfiguracion(codigoVT);
  return vt ? vt.ventanas : [];
}

export function getVentanaMayorParaVT(codigoVT: string): VentanaOperativa | null {
  const ventanas = getVentanasOperativasParaVT(codigoVT);
  const diurnasLoja = ventanas.filter((v) => v.tipo === 'VENTANA_DIURNA_LOJA');
  if (diurnasLoja.length === 0) return null;
  // Ordenar por duración descendente
  diurnasLoja.sort((a, b) => b.duracionMinutos - a.duracionMinutos);
  return diurnasLoja[0];
}

export function getAlertaEnlaceCritico(codigoVT: string): string | null {
  const vt = getVTConfiguracion(codigoVT);
  return vt?.alertaEnlaceSiguiente || null;
}

export function isModoRetenActivo(): boolean {
  const config = getConfiguracionFlotaLocal();
  return Boolean(config.modoRetenActivo);
}

// ─── GUARDAR CONFIGURACIÓN LOCAL Y DISPARAR EVENTO ───
export function guardarConfiguracionLocal(nuevaConfig: FlotaConfiguracionCompleta): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nuevaConfig));
    localStorage.setItem(
      FINGERPRINT_KEY,
      JSON.stringify({
        version: nuevaConfig.version,
        updatedAt: nuevaConfig.updatedAt,
        modoRetenActivo: nuevaConfig.modoRetenActivo,
        hash: nuevaConfig.hash,
      })
    );
    window.dispatchEvent(new CustomEvent(EVENT_UPDATED, { detail: nuevaConfig }));
  } catch (err) {
    console.error('[VTStorage] Error guardando config local:', err);
  }
}

// ─── SUSCRIPCIÓN REACTIVA PARA COMPONENTES DE UI ───
export function subscribeToVTConfig(callback: (config: FlotaConfiguracionCompleta) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = (e: Event) => {
    const custom = e as CustomEvent<FlotaConfiguracionCompleta>;
    callback(custom.detail || getConfiguracionFlotaLocal());
  };
  window.addEventListener(EVENT_UPDATED, handler);
  return () => window.removeEventListener(EVENT_UPDATED, handler);
}

// ─── MICRO-CHEQUEO DE VERSIÓN (FINGERPRINT EN SEGUNDO PLANO) ───
export async function verificarActualizacionFingerprint(): Promise<boolean> {
  if (typeof window === 'undefined' || !navigator.onLine) {
    return false; // Sin conexión: usar local en 0 ms
  }

  try {
    const localConfig = getConfiguracionFlotaLocal();
    // Petición ultraligera de solo 10 bytes
    const resVersion = await fetch('/api/config/vt-version', { cache: 'no-store' });
    if (!resVersion.ok) return false;

    const dataVersion = await resVersion.json();
    if (!dataVersion.success || !dataVersion.data) return false;

    const serverFingerprint: FlotaConfiguracionFingerprint = dataVersion.data;

    // Comparar versión y modo retén
    if (
      serverFingerprint.version <= localConfig.version &&
      serverFingerprint.modoRetenActivo === localConfig.modoRetenActivo &&
      serverFingerprint.hash === localConfig.hash
    ) {
      // ✅ Cero consultas innecesarias. Todo sincronizado.
      return false;
    }

    // 🚀 La versión del servidor es superior: Descargar catálogo completo
    console.log('[VTStorage] Versión actualizada detectada en servidor:', serverFingerprint.version);
    const resFull = await fetch('/api/config/vt-full', { cache: 'no-store' });
    if (!resFull.ok) return false;

    const dataFull = await resFull.json();
    if (dataFull.success && dataFull.data) {
      guardarConfiguracionLocal(dataFull.data);
      return true;
    }
  } catch (err) {
    console.warn('[VTStorage] Micro-chequeo silencioso falló (modo offline preservado):', err);
  }

  return false;
}
