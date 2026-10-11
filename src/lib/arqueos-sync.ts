/**
 * Motor Centralizado de Sincronización de Arqueos Generales Offline
 * Sistema: RutaGo - Finanzas y Arqueos Operativos (v3.61.34)
 * 
 * Gestiona la persistencia offline, encolado, auto-sincronización y
 * fusión híbrida (Local + Cloud) de los Arqueos Generales del Ayudante.
 */

import { type SavedRecord } from '@/components/transport/types';

export const PENDING_ARQUEOS_QUEUE_KEY = 'rutago_pending_arqueos_queue';

export interface PendingArqueoItem {
  id: string;
  key: string; // ej: arqueo_general_10_VT04_2026-10-05
  disco: string;
  vtCode: string;
  fecha: string;
  payload: any; // CanonicalRecordPayload
  createdAt: string;
  attempts: number;
  lastError?: string;
}

export function getStorage(): Storage | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
    if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) return (globalThis as any).localStorage;
    return null;
  } catch {
    return null;
  }
}

export function isLocalStorageAvailable(): boolean {
  return getStorage() !== null;
}

/**
 * Obtiene la lista completa de arqueos generales pendientes de sincronización.
 */
export function getPendingArqueos(): PendingArqueoItem[] {
  const storage = getStorage();
  if (!storage) return [];
  try {
    const raw = storage.getItem(PENDING_ARQUEOS_QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Error leyendo cola de arqueos pendientes:', err);
    return [];
  }
}

/**
 * Retorna la cantidad de arqueos generales pendientes en cola.
 */
export function countPendingArqueos(): number {
  return getPendingArqueos().length;
}

/**
 * Guarda la cola de arqueos pendientes en localStorage y despacha evento reactivo.
 */
function savePendingQueue(queue: PendingArqueoItem[]): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(PENDING_ARQUEOS_QUEUE_KEY, JSON.stringify(queue));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('rutago_pending_arqueos_changed', {
        detail: { count: queue.length }
      }));
    }
  } catch (err) {
    console.error('Error guardando cola de arqueos pendientes:', err);
  }
}

/**
 * Encola un arqueo general para sincronización diferida.
 */
export function enqueuePendingArqueo(
  key: string,
  disco: string,
  vtCode: string,
  fecha: string,
  payload: any
): PendingArqueoItem {
  const queue = getPendingArqueos();
  const existingIdx = queue.findIndex(item => item.key === key || item.id === key);

  const item: PendingArqueoItem = {
    id: key,
    key,
    disco: String(disco || '').padStart(2, '0'),
    vtCode: String(vtCode || '').trim(),
    fecha: String(fecha || '').trim(),
    payload,
    createdAt: new Date().toISOString(),
    attempts: existingIdx >= 0 ? queue[existingIdx].attempts : 0,
    lastError: undefined,
  };

  if (existingIdx >= 0) {
    queue[existingIdx] = item;
  } else {
    queue.push(item);
  }

  savePendingQueue(queue);

  // Asegurar que el registro local también contenga la marca de pendiente
  const storage = getStorage();
  if (storage) {
    try {
      storage.setItem(key, JSON.stringify({
        ...payload,
        _offlinePending: true,
        _offlineTimestamp: item.createdAt,
      }));
    } catch {
      // Ignorar quota si payload ya fue persistido
    }
  }

  return item;
}

/**
 * Remueve un arqueo de la cola de pendientes (ej. tras subida exitosa).
 */
export function removePendingArqueo(keyOrId: string): void {
  const queue = getPendingArqueos();
  const filtered = queue.filter(item => item.key !== keyOrId && item.id !== keyOrId);
  savePendingQueue(filtered);
}

/**
 * Marca un arqueo como sincronizado en la cola y en el almacenamiento local.
 */
export function markArqueoAsSynced(key: string): void {
  removePendingArqueo(key);
  const storage = getStorage();
  if (storage) {
    try {
      const raw = storage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        storage.setItem(key, JSON.stringify({
          ...parsed,
          _offlinePending: false,
          _syncedAt: new Date().toISOString(),
        }));
      }
    } catch {
      /* ignore */
    }
  }
}

/**
 * Convierte un payload canónico de Arqueo General en un SavedRecord para HistoryScreen.
 */
export function canonicalPayloadToSavedRecord(payload: any, key?: string, isPending = true): SavedRecord {
  const trips = Array.isArray(payload.trips) ? payload.trips : [];
  const expenses = Array.isArray(payload.expenses) ? payload.expenses : [];

  const tripEfectivoReal = trips.reduce(
    (sum: number, t: any) => sum + (Number(t.efectivoReal) || 0),
    0
  );
  const cajaComun = Number(payload.cajaComun) || 0;
  const sobrante = Number(payload.sobrante) || 0;
  const tickets = Number(payload.tickets) || 0;

  // Fórmula Canónica de Producción
  const production = tripEfectivoReal + cajaComun + sobrante;

  // Gastos sin arrastre
  const validExpenses = expenses.filter((e: any) => {
    const desc = String(e?.description || '').trim().toLowerCase();
    return desc !== '' && !desc.startsWith('arrastre déficit') && !desc.startsWith('arrastre deficit');
  });

  const totalGastos = validExpenses.reduce(
    (sum: number, e: any) => sum + (Number(e.amount) || 0),
    0
  );

  // Regla Dual de Entrega
  let entregaAyudante = 0;
  if (cajaComun > 0) {
    entregaAyudante = tripEfectivoReal + sobrante - totalGastos;
  } else {
    entregaAyudante = (tripEfectivoReal + sobrante) - (totalGastos + tickets);
  }
  const entregaCompania = cajaComun > 0 ? cajaComun - tickets : 0;

  return {
    id: key || `offline_${payload.numeroDisco || '01'}_${payload.date || 'hoy'}_${Date.now()}`,
    date: payload.date || new Date().toISOString().split('T')[0],
    km: payload.km ? String(payload.km) : null,
    conductor: payload.conductor || (payload.numeroDisco ? `BUS-${String(payload.numeroDisco).padStart(2, '0')}` : null),
    ayudanteNombre: payload.ayudanteNombre || null,
    vtCode: payload.vtCode || null,
    production,
    cajaComun,
    sobrante,
    tickets,
    entregaAyudante,
    entregaCompania,
    totalGastos,
    photoUrl: payload.photoUrl || null,
    createdAt: payload._offlineTimestamp || new Date().toISOString(),
    _isOfflinePending: isPending,
    _offlineKey: key,
    trips: trips.map((t: any, idx: number) => ({
      id: `trip_${idx + 1}`,
      order: idx + 1,
      routeFrom: t.routeFrom || '',
      routeTo: t.routeTo || '',
      time: t.time || null,
      income: Number(t.income) || Number(t.efectivoReal) || 0,
      efectivoReal: Number(t.efectivoReal) || 0,
      boletos: Number(t.boletos) || 0,
    })),
    expenses: validExpenses.map((e: any, idx: number) => ({
      id: `expense_${idx + 1}`,
      order: idx + 1,
      description: e.description || '',
      amount: Number(e.amount) || 0,
    })),
  };
}

/**
 * Obtiene todos los arqueos locales pendientes formateados como SavedRecord
 * filtrados opcionalmente por busId.
 */
export function getLocalPendingSavedRecords(busId?: string): SavedRecord[] {
  const pending = getPendingArqueos();
  const cleanBusNum = busId && busId !== 'TODOS'
    ? busId.replace(/^BUS-/i, '').replace(/\D/g, '').padStart(2, '0')
    : '';

  return pending
    .filter(item => {
      if (!cleanBusNum) return true;
      const itemDisco = String(item.disco || item.payload?.numeroDisco || '')
        .replace(/^BUS-/i, '')
        .replace(/\D/g, '')
        .padStart(2, '0');
      return itemDisco === cleanBusNum;
    })
    .map(item => canonicalPayloadToSavedRecord(item.payload, item.key, true));
}

/**
 * Sincroniza un arqueo individual contra la API /api/records con timeout seguro (12s).
 */
export async function syncSingleArqueo(
  item: PendingArqueoItem
): Promise<{ success: boolean; error?: string }> {
  try {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeoutId = controller ? setTimeout(() => controller.abort(), 12000) : null;

    const res = await fetch('/api/records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item.payload),
      signal: controller ? controller.signal : undefined,
    });

    if (timeoutId) clearTimeout(timeoutId);

    if (res.ok) {
      markArqueoAsSynced(item.key);
      return { success: true };
    } else {
      const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      const errorMsg = data?.error || `HTTP ${res.status}`;
      
      // Actualizar intentos y último error
      const queue = getPendingArqueos();
      const idx = queue.findIndex(q => q.key === item.key);
      if (idx >= 0) {
        queue[idx].attempts = (queue[idx].attempts || 0) + 1;
        queue[idx].lastError = errorMsg;
        savePendingQueue(queue);
      }
      return { success: false, error: errorMsg };
    }
  } catch (err: any) {
    const errorMsg = err?.name === 'AbortError' ? 'Tiempo de espera agotado (red lenta)' : (err?.message || 'Fallo de red');
    const queue = getPendingArqueos();
    const idx = queue.findIndex(q => q.key === item.key);
    if (idx >= 0) {
      queue[idx].attempts = (queue[idx].attempts || 0) + 1;
      queue[idx].lastError = errorMsg;
      savePendingQueue(queue);
    }
    return { success: false, error: errorMsg };
  }
}

/**
 * Despachador masivo: sincroniza todos los arqueos en cola de forma secuencial.
 */
export async function syncAllPendingArqueos(): Promise<{
  total: number;
  synced: number;
  failed: number;
  errors: string[];
}> {
  const queue = getPendingArqueos();
  if (queue.length === 0) {
    return { total: 0, synced: 0, failed: 0, errors: [] };
  }

  let synced = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const item of queue) {
    const res = await syncSingleArqueo(item);
    if (res.success) {
      synced++;
    } else {
      failed++;
      if (res.error) errors.push(`[${item.disco} - ${item.vtCode}]: ${res.error}`);
    }
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('rutago_arqueos_synced', {
      detail: { total: queue.length, synced, failed }
    }));
  }

  return { total: queue.length, synced, failed, errors };
}

/**
 * Configura el listener automático de reconexión a internet.
 */
export function setupAutoSyncArqueos(): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleOnline = () => {
    const pendingCount = countPendingArqueos();
    if (pendingCount > 0) {
      console.log(`[RutaGo Sync] Conexión detectada. Sincronizando ${pendingCount} arqueo(s)...`);
      syncAllPendingArqueos().catch(err => {
        console.warn('[RutaGo Sync] Error en auto-sincronización:', err);
      });
    }
  };

  window.addEventListener('online', handleOnline);
  return () => {
    window.removeEventListener('online', handleOnline);
  };
}
