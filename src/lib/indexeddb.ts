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
  tarifaOficial: number;
  cobrado: number;
  hora: string;
  createdAt: string;
  ayudanteId: string;
  ayudanteNombre: string;
  syncStatus: 'pending' | 'synced' | 'error';
  serverId?: string;
  syncError?: string;
}

const DB_NAME = 'RutaGoOffline';
const DB_VERSION = 3;

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
        venta.syncStatus = 'pending';
        venta.syncError = undefined;
        cursor.update(venta);
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
