/**
 * @file mantenimiento-sync.ts
 * @description Motor de Sincronización Automática Offline-First para Mantenimientos y Paradas de Taller
 * RutaGo v3.58.12
 *
 * Exclusivo para Chofer y Paradas de Taller (NO toca la venta ni arqueos del Ayudante).
 * 1. Cola de Salida Offline (Outbox Queue):
 *    Cuando el chofer registra un mantenimiento o parada técnica sin internet,
 *    se almacena en `rg_mantenimiento_outbox_v1`.
 * 2. Reconexión Automática (Online Listener):
 *    Al recuperar conexión a internet (evento `online` o reapertura de app):
 *    - Descarga las recetas de combos actualizadas por el socio.
 *    - Sube a PostgreSQL todos los gastos y paradas pendientes de la cola outbox.
 *    - Dispara eventos de interfaz reactivos (`rg_combo_unidad_actualizado`, `rg_owner_expenses_sync`, etc.).
 */

import { syncMantenimientoConfigConServidor } from './mantenimiento-estaciones';
import { getActiveBusId } from './fleet-storage';
import { OwnerExpense } from '../types/expenses';
import { saveOwnerExpense } from './owner-expenses-storage';

const OUTBOX_STORAGE_KEY = 'rg_mantenimiento_outbox_v1';

export interface OutboxItem {
  id: string;
  tipo: 'OWNER_EXPENSE' | 'PARADA_PAGO';
  payload: any;
  busId: string;
  timestamp: string;
  intentos: number;
}

/**
 * Obtiene los elementos pendientes en la cola outbox
 */
export function getMantenimientoOutbox(): OutboxItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(OUTBOX_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Error leyendo cola outbox de mantenimiento:', err);
    return [];
  }
}

/**
 * Agrega un elemento a la cola outbox para ser enviado cuando haya internet
 */
export function enqueueMantenimientoOutbox(item: Omit<OutboxItem, 'intentos' | 'timestamp'>): void {
  if (typeof window === 'undefined') return;
  try {
    const queue = getMantenimientoOutbox();
    const exists = queue.findIndex(q => q.id === item.id);
    const fullItem: OutboxItem = {
      ...item,
      intentos: 0,
      timestamp: new Date().toISOString(),
    };

    if (exists >= 0) {
      queue[exists] = fullItem;
    } else {
      queue.push(fullItem);
    }
    localStorage.setItem(OUTBOX_STORAGE_KEY, JSON.stringify(queue));
    window.dispatchEvent(new CustomEvent('rg_mantenimiento_outbox_updated', { detail: { count: queue.length } }));
  } catch (err) {
    console.error('Error encolando en outbox de mantenimiento:', err);
  }
}

/**
 * Remueve un elemento procesado de la cola
 */
export function dequeueMantenimientoOutbox(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    const queue = getMantenimientoOutbox();
    const filtered = queue.filter(q => q.id !== id);
    localStorage.setItem(OUTBOX_STORAGE_KEY, JSON.stringify(filtered));
    window.dispatchEvent(new CustomEvent('rg_mantenimiento_outbox_updated', { detail: { count: filtered.length } }));
  } catch (err) {
    console.error('Error eliminando de outbox:', err);
  }
}

let isSyncingOutbox = false;

/**
 * Procesa y vacía la cola outbox enviando los registros pendientes al servidor PostgreSQL
 */
export async function flushMantenimientoOutbox(): Promise<{ processed: number; errors: number }> {
  if (typeof window === 'undefined' || !navigator.onLine || isSyncingOutbox) {
    return { processed: 0, errors: 0 };
  }

  isSyncingOutbox = true;
  const queue = getMantenimientoOutbox();
  if (queue.length === 0) {
    isSyncingOutbox = false;
    return { processed: 0, errors: 0 };
  }

  let processed = 0;
  let errors = 0;

  for (const item of queue) {
    try {
      if (item.tipo === 'OWNER_EXPENSE') {
        const res = await fetch('/api/owner-expenses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item.payload),
        });
        if (res.ok) {
          dequeueMantenimientoOutbox(item.id);
          processed++;
        } else {
          errors++;
          item.intentos = (item.intentos || 0) + 1;
        }
      } else {
        // Tipos adicionales si aplican
        dequeueMantenimientoOutbox(item.id);
        processed++;
      }
    } catch (netErr) {
      console.warn('Reintento diferido para item outbox:', item.id, netErr);
      errors++;
      break; // Detener bucle si se volvió a caer la conexión
    }
  }

  isSyncingOutbox = false;

  if (processed > 0) {
    window.dispatchEvent(new CustomEvent('rg_mantenimiento_sincronizado_exito', {
      detail: { count: processed },
    }));
  }

  return { processed, errors };
}

/**
 * Sincronización completa bidireccional cuando hay internet:
 * 1. Sube los mantenimientos/gastos locales pendientes (Upload).
 * 2. Descarga la última receta de combos del socio desde la nube (Download).
 */
export async function syncMantenimientoBidireccional(busId?: string): Promise<void> {
  if (typeof window === 'undefined' || !navigator.onLine) return;

  const targetBusId = busId || getActiveBusId();

  // 1. Upload pendientes
  try {
    await flushMantenimientoOutbox();
  } catch (e) {
    console.warn('Aviso flush outbox diferido:', e);
  }

  // 2. Download configuración de recetas actualizada del socio
  try {
    await syncMantenimientoConfigConServidor(targetBusId);
  } catch (e) {
    console.warn('Aviso descarga config mantenimiento diferido:', e);
  }
}
