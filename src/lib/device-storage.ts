/**
 * Gestión de Huella Digital y Vinculación Estricta de Dispositivo Físico (Device Binding)
 * Permite identificar de forma inmutable el teléfono físico de cobro y prevenir sesiones paralelas.
 */

const STORAGE_DEVICE_KEY = 'rg_device_id_v1';
const STORAGE_DEVICE_NAME_KEY = 'rg_device_name_v1';

export interface DeviceInfo {
  deviceId: string;
  deviceName: string;
  isRegistered: boolean;
}

/**
 * Genera un UUID criptográfico seguro y compacto
 */
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'dev-' + Math.random().toString(36).substring(2, 10) + '-' + Date.now().toString(36);
}

/**
 * Deducir un nombre amigable de dispositivo según el navegador y pantalla
 */
function detectDeviceName(): string {
  if (typeof window === 'undefined') return 'Dispositivo Desconocido';
  const ua = navigator.userAgent;
  let name = 'Móvil';
  if (/Android/i.test(ua)) {
    const match = ua.match(/Android\s([0-9\.]*);?\s?([^;\)]*)/i);
    name = match && match[2] ? match[2].trim() : 'Android';
  } else if (/iPhone|iPad|iPod/i.test(ua)) {
    name = 'iOS Device';
  } else if (/Windows/i.test(ua)) {
    name = 'PC Windows';
  } else if (/Macintosh/i.test(ua)) {
    name = 'Mac';
  } else if (/Linux/i.test(ua)) {
    name = 'Linux';
  }
  return name.length > 25 ? name.substring(0, 25) : name;
}

/**
 * Obtiene o inicializa la huella digital local única e inmutable de este teléfono/navegador
 */
export function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') return 'server-device-id';
  try {
    let deviceId = localStorage.getItem(STORAGE_DEVICE_KEY);
    if (!deviceId) {
      deviceId = generateUUID();
      localStorage.setItem(STORAGE_DEVICE_KEY, deviceId);
    }
    return deviceId;
  } catch {
    return 'fallback-' + Date.now();
  }
}

/**
 * Obtiene el nombre descriptivo del dispositivo local
 */
export function getDeviceName(): string {
  if (typeof window === 'undefined') return 'Servidor';
  try {
    let name = localStorage.getItem(STORAGE_DEVICE_NAME_KEY);
    if (!name) {
      name = detectDeviceName();
      localStorage.setItem(STORAGE_DEVICE_NAME_KEY, name);
    }
    return name;
  } catch {
    return 'Terminal Móvil';
  }
}

/**
 * Retorna la información completa del dispositivo local
 */
export function getDeviceInfo(): DeviceInfo {
  const deviceId = getOrCreateDeviceId();
  const deviceName = getDeviceName();
  return {
    deviceId,
    deviceName,
    isRegistered: !!deviceId,
  };
}
