// IndexedDB for offline ticket storage - RutaGo
export interface VentaLocal {
  id: string;
  fecha: string;
  vtCode: string;
  frecuenciaId: string;         // Real Frecuencia.id (server-side FK)
  frecuenciaNombre: string;
  estadoId: string;            // Composite: fecha_frecuenciaId (for local grouping)
  ruta: string;
  parada: string;
  tipo: string;
  pasajeroTipo: string;
  tarifaOficial: number;
  cobrado: number;
  hora: string;
  createdAt: string;
  ayudanteId: string;
  ayudanteNombre: string;
  lat?: number;
  lng?: number;
  syncStatus: 'pending' | 'synced' | 'error';
  serverId?: string;
  syncError?: string;
  retryCount?: number;
}

const DB_NAME = 'RutaGoOffline';
const DB_VERSION = 4;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains('ventas_pendientes')) {
        const store = db.createObjectStore('ventas_pendientes', { keyPath: 'id' });
        store.createIndex('syncStatus', 'syncStatus', { unique: false });
        store.createIndex('estadoId', 'estadoId', { unique: false });
      } else {
        const store = request.transaction!.objectStore('ventas_pendientes');
        if (!store.indexNames.contains('estadoId')) {
          store.createIndex('estadoId', 'estadoId', { unique: false });
        }
      }

      if (!db.objectStoreNames.contains('tarifas_cache')) {
        db.createObjectStore('tarifas_cache', { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains('frecuencias_cache')) {
        db.createObjectStore('frecuencias_cache', { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains('estados_frecuencias')) {
        const efStore = db.createObjectStore('estados_frecuencias', { keyPath: 'estadoId' });
        efStore.createIndex('vtCode_fecha', ['vtCode', 'fecha'], { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveVenta(venta: VentaLocal): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('ventas_pendientes', 'readwrite');
    tx.objectStore('ventas_pendientes').put(venta);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getVentasPendientes(): Promise<VentaLocal[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('ventas_pendientes', 'readonly');
    const store = tx.objectStore('ventas_pendientes');
    const request = store.getAll();
    request.onsuccess = () => {
      const all: VentaLocal[] = request.result;
      resolve(all.filter(v => v.syncStatus === 'pending' || v.syncStatus === 'error'));
    };
    request.onerror = () => reject(request.error);
  });
}

export async function getVentasErrored(): Promise<VentaLocal[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('ventas_pendientes', 'readonly');
    const store = tx.objectStore('ventas_pendientes');
    const index = store.index('syncStatus');
    const request = index.getAll('error');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

const MAX_RETRIES = 3;

export async function resetErroredToPending(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('ventas_pendientes', 'readwrite');
    const store = tx.objectStore('ventas_pendientes');
    const index = store.index('syncStatus');
    const request = index.openCursor(IDBKeyRange.only('error'));
    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result;
      if (cursor) {
        const venta = cursor.value;
        const retries = venta.retryCount || 0;
        if (retries < MAX_RETRIES) {
          venta.syncStatus = 'pending';
          venta.syncError = undefined;
          cursor.update(venta);
        }
        cursor.continue();
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getVentasByFrecuencia(estadoId: string): Promise<VentaLocal[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('ventas_pendientes', 'readonly');
    const store = tx.objectStore('ventas_pendientes');
    if (store.indexNames.contains('estadoId')) {
      const index = store.index('estadoId');
      const request = index.getAll(estadoId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    } else {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    }
  });
}

export async function markVentaSynced(id: string, serverId: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('ventas_pendientes', 'readwrite');
    const store = tx.objectStore('ventas_pendientes');
    const request = store.get(id);
    request.onsuccess = () => {
      if (request.result) {
        const venta = request.result;
        venta.syncStatus = 'synced';
        venta.serverId = serverId;
        venta.syncError = undefined;
        store.put(venta);
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function markVentaError(id: string, error: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('ventas_pendientes', 'readwrite');
    const store = tx.objectStore('ventas_pendientes');
    const request = store.get(id);
    request.onsuccess = () => {
      if (request.result) {
        const venta = request.result;
        venta.syncStatus = 'error';
        venta.syncError = error;
        venta.retryCount = (venta.retryCount || 0) + 1;
        store.put(venta);
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function countVentasPendientes(): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('ventas_pendientes', 'readonly');
    const store = tx.objectStore('ventas_pendientes');
    const request = store.getAll();
    request.onsuccess = () => {
      const all: VentaLocal[] = request.result;
      resolve(all.filter(v => v.syncStatus === 'pending' || v.syncStatus === 'error').length);
    };
    request.onerror = () => reject(request.error);
  });
}

// ─── Cleanup functions ───

/** Eliminar todas las ventas de una frecuencia específica */
export async function deleteVentasByEstadoId(estadoId: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('ventas_pendientes', 'readwrite');
    const store = tx.objectStore('ventas_pendientes');
    if (store.indexNames.contains('estadoId')) {
      const index = store.index('estadoId');
      const request = index.openCursor(IDBKeyRange.only(estadoId));
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    } else {
      // Fallback: full scan
      const request = store.openCursor();
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          if (cursor.value.estadoId === estadoId) cursor.delete();
          cursor.continue();
        }
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    }
  });
}

/** Eliminar todas las ventas de un VT+fecha (todas las frecuencias) */
export async function deleteVentasByVT(vtCode: string, fecha: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('ventas_pendientes', 'readwrite');
    const store = tx.objectStore('ventas_pendientes');
    const prefix = `${fecha}_`;
    const request = store.openCursor();
    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result;
      if (cursor) {
        const v = cursor.value as VentaLocal;
        if (v.vtCode === vtCode && v.fecha === fecha) {
          cursor.delete();
        }
        cursor.continue();
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Contar ventas pendientes de un VT+fecha específico */
export async function countVentasPendientesByVT(vtCode: string, fecha: string): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('ventas_pendientes', 'readonly');
    const store = tx.objectStore('ventas_pendientes');
    const request = store.getAll();
    request.onsuccess = () => {
      const all: VentaLocal[] = request.result;
      resolve(all.filter(v => 
        (v.syncStatus === 'pending' || v.syncStatus === 'error') &&
        v.vtCode === vtCode && v.fecha === fecha
      ).length);
    };
    request.onerror = () => reject(request.error);
  });
}

export interface TarifaCache {
  id: string; vtCode: string; tarifas: any[]; updatedAt: string;
}
export async function saveTarifasCache(cache: TarifaCache): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('tarifas_cache', 'readwrite');
    tx.objectStore('tarifas_cache').put(cache);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
export async function getTarifasCache(vtCode: string): Promise<TarifaCache | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('tarifas_cache', 'readonly');
    const request = tx.objectStore('tarifas_cache').get(vtCode);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

// Persisted frequency state for offline sequential flow
export interface EstadoFrecuencia {
  estadoId: string;           // Composite: fecha_frecuenciaId
  frecuenciaId: string;
  nombre: string;
  ruta: string;
  hora: string;
  direccion: string;
  estado: 'pendiente' | 'abierta' | 'cerrada' | 'no_realizada';
  ventasCount: number;
  totalRecaudado: number;
  arqueoEfectivo?: number;
  arqueoDiferencia?: number;
  arqueoFecha?: string;
  vtCode: string;
  fecha: string;
  // GPS invisible tracking
  gpsLatStart?: number;
  gpsLngStart?: number;
  gpsLatEnd?: number;
  gpsLngEnd?: number;
}

export interface FrecuenciaCache {
  id: string; vtCode: string; frecuencias: any[]; updatedAt: string;
}
export async function saveFrecuenciasCache(cache: FrecuenciaCache): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('frecuencias_cache', 'readwrite');
    tx.objectStore('frecuencias_cache').put(cache);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
export async function getFrecuenciasCache(vtCode: string): Promise<FrecuenciaCache | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('frecuencias_cache', 'readonly');
    const request = tx.objectStore('frecuencias_cache').get(vtCode);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

// ─── Estado Frecuencia (persisted) ───

export async function saveEstadoFrecuencia(estado: EstadoFrecuencia): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('estados_frecuencias', 'readwrite');
    tx.objectStore('estados_frecuencias').put(estado);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getEstadoFrecuencia(estadoId: string): Promise<EstadoFrecuencia | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('estados_frecuencias', 'readonly');
    const request = tx.objectStore('estados_frecuencias').get(estadoId);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export async function getAllEstadosFrecuencia(vtCode: string, fecha: string): Promise<EstadoFrecuencia[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('estados_frecuencias', 'readonly');
    const store = tx.objectStore('estados_frecuencias');
    const request = store.getAll();
    request.onsuccess = () => {
      const all: EstadoFrecuencia[] = request.result;
      resolve(all.filter(e => e.vtCode === vtCode && e.fecha === fecha));
    };
    request.onerror = () => reject(request.error);
  });
}

export async function updateEstadoFrecuencia(estadoId: string, updates: Partial<EstadoFrecuencia>): Promise<void> {
  const existing = await getEstadoFrecuencia(estadoId);
  if (!existing) return;
  await saveEstadoFrecuencia({ ...existing, ...updates });
}

// ─── Sync silencioso (batch) ───
// Sincroniza ventas pendientes al servidor en lotes de 20.
// Retorna { synced, failed, total }. Si no hay internet, retorna { synced: 0, failed: 0, total: N }.
export async function syncVentasSilencioso(): Promise<{ synced: number; failed: number; total: number }> {
  if (!navigator.onLine) {
    const all = await getVentasPendientes();
    return { synced: 0, failed: 0, total: all.length };
  }

  try {
    await resetErroredToPending();
  } catch { /* ignore */ }

  const ventas = await getVentasPendientes();
  const valid = ventas.filter(v => v && v.id && typeof v.cobrado === 'number');
  if (valid.length === 0) return { synced: 0, failed: 0, total: 0 };

  let synced = 0;
  let failed = 0;
  const BATCH_SIZE = 20;

  // Try batch sync first
  try {
    for (let i = 0; i < valid.length; i += BATCH_SIZE) {
      const batch = valid.slice(i, i + BATCH_SIZE);
      try {
        const res = await fetch('/api/ventas/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ventas: batch.map(v => ({
              fecha: v.fecha, vtCode: v.vtCode, frecuenciaId: v.frecuenciaId,
              ruta: v.ruta, parada: v.parada, tipo: v.tipo,
              pasajeroTipo: v.pasajeroTipo,
              tarifaOficial: v.tarifaOficial, cobrado: v.cobrado,
              hora: v.hora, ayudanteId: v.ayudanteId, ayudanteNombre: v.ayudanteNombre,
              createdAt: v.createdAt, localId: v.id,
              ...(v.lat != null ? { lat: v.lat } : {}),
              ...(v.lng != null ? { lng: v.lng } : {}),
            })),
          }),
        });
        if (res.ok) {
          const data = await res.json().catch(() => ({ results: [] }));
          for (const r of (data.results || [])) {
            if (r.ok) {
              await markVentaSynced(r.localId, r.serverId);
              synced++;
            } else {
              await markVentaError(r.localId, r.error || 'Error batch');
              failed++;
            }
          }
        } else {
          // Batch endpoint failed — fall back to individual sync for this batch
          for (const venta of batch) {
            try {
              const singleRes = await fetch('/api/ventas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  fecha: venta.fecha, vtCode: venta.vtCode, frecuenciaId: venta.frecuenciaId,
                  ruta: venta.ruta, parada: venta.parada, tipo: venta.tipo,
                  pasajeroTipo: venta.pasajeroTipo,
                  tarifaOficial: venta.tarifaOficial, cobrado: venta.cobrado,
                  hora: venta.hora, ayudanteId: venta.ayudanteId, ayudanteNombre: venta.ayudanteNombre,
                  createdAt: venta.createdAt, localId: venta.id,
                  ...(venta.lat != null ? { lat: venta.lat } : {}),
                  ...(venta.lng != null ? { lng: venta.lng } : {}),
                }),
              });
              if (singleRes.ok) {
                const d = await singleRes.json().catch(() => ({}));
                await markVentaSynced(venta.id, d.venta?.id || '');
                synced++;
              } else {
                const err = await singleRes.json().catch(() => ({}));
                await markVentaError(venta.id, err.error || 'Error del servidor');
                failed++;
              }
            } catch {
              await markVentaError(venta.id, 'Sin conexion');
              failed++;
            }
          }
        }
      } catch {
        // Network error on this batch
        for (const venta of batch) {
          await markVentaError(venta.id, 'Sin conexion');
          failed++;
        }
      }
    }
  } catch {
    // Catastrophic failure
    for (const venta of valid) {
      await markVentaError(venta.id, 'Error desconocido');
      failed++;
    }
  }

  // Cleanup: delete synced ventas older than 1 hour to free space
  try {
    await deleteOldSyncedVentas();
  } catch { /* ignore */ }

  return { synced, failed, total: valid.length };
}

/** Delete ventas synced more than 1 hour ago */
async function deleteOldSyncedVentas(): Promise<void> {
  const db = await openDB();
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  return new Promise((resolve, reject) => {
    const tx = db.transaction('ventas_pendientes', 'readwrite');
    const store = tx.objectStore('ventas_pendientes');
    const request = store.openCursor();
    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result;
      if (cursor) {
        const v = cursor.value as VentaLocal;
        if (v.syncStatus === 'synced') {
          const created = new Date(v.createdAt).getTime();
          if (created < oneHourAgo) {
            cursor.delete();
          }
        }
        cursor.continue();
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
