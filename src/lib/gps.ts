// GPS utility - RutaGo
// Invisible GPS: no muestra nada al usuario, solo captura coordenadas

export interface GPSCoords {
  lat: number;
  lng: number;
  accuracy?: number;
}

/**
 * Get current GPS position.
 * Returns null if GPS is unavailable or times out (non-blocking).
 * Uses short timeout (5s) and high accuracy to avoid blocking the UI.
 */
export function getGPSPosition(): Promise<GPSCoords | null> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    // Short timeout to avoid blocking
    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 30000, // Accept cached position up to 30s old
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      () => {
        // GPS error or denied — silently return null
        resolve(null);
      },
      options
    );
  });
}

/**
 * Fire-and-forget GPS capture: starts GPS request but doesn't block.
 * Calls the callback with coords when available, or null on failure.
 */
export function getGPSAsync(callback: (coords: GPSCoords | null) => void): void {
  getGPSPosition().then(callback).catch(() => callback(null));
}
