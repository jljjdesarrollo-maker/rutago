/**
 * Suite de Pruebas Unitarias: Motor de Sincronización de Arqueos Generales Offline
 * Sistema: RutaGo - Finanzas y Arqueos Operativos (v3.61.34)
 */

import { describe, test, expect, beforeEach, mock } from 'bun:test';
import {
  PENDING_ARQUEOS_QUEUE_KEY,
  getPendingArqueos,
  countPendingArqueos,
  enqueuePendingArqueo,
  removePendingArqueo,
  markArqueoAsSynced,
  canonicalPayloadToSavedRecord,
  getLocalPendingSavedRecords,
  syncSingleArqueo,
  syncAllPendingArqueos,
} from '@/lib/arqueos-sync';

// Mock localStorage para entorno Bun
const mockStorage: Record<string, string> = {};

if (typeof globalThis.localStorage === 'undefined') {
  (globalThis as any).localStorage = {
    getItem: (k: string) => mockStorage[k] ?? null,
    setItem: (k: string, v: string) => { mockStorage[k] = String(v); },
    removeItem: (k: string) => { delete mockStorage[k]; },
    clear: () => {
      for (const k in mockStorage) delete mockStorage[k];
    },
  };
}

describe('📡 MOTOR DE SINCRONIZACIÓN DE ARQUEOS GENERALES OFFLINE (v3.61.34)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('1. Encolado de Arqueo General Offline persiste en cola y marca estado local', () => {
    const key = 'arqueo_general_10_VT04_2026-10-05';
    const payload = {
      date: '2026-10-05',
      numeroDisco: '10',
      vtCode: 'VT04',
      trips: [{ efectivoReal: 180, income: 180 }],
      expenses: [{ description: 'Plan Renova', amount: 30 }],
      cajaComun: 0,
      sobrante: 0,
      tickets: 0,
    };

    expect(countPendingArqueos()).toBe(0);

    const item = enqueuePendingArqueo(key, '10', 'VT04', '2026-10-05', payload);

    expect(item.key).toBe(key);
    expect(item.disco).toBe('10');
    expect(countPendingArqueos()).toBe(1);

    const cola = getPendingArqueos();
    expect(cola.length).toBe(1);
    expect(cola[0].key).toBe(key);

    // Verificar marca en localStorage del registro
    const rawLocal = localStorage.getItem(key);
    expect(rawLocal).not.toBeNull();
    const parsedLocal = JSON.parse(rawLocal!);
    expect(parsedLocal._offlinePending).toBe(true);
  });

  test('2. canonicalPayloadToSavedRecord genera SavedRecord fidedigno con flag _isOfflinePending', () => {
    const payload = {
      date: '2026-10-05',
      numeroDisco: '10',
      conductor: 'BUS-10 - Conductor Prueba',
      ayudanteNombre: 'Ayudante Unidad 10',
      vtCode: 'VT04',
      km: '420',
      trips: [
        { routeFrom: 'Loja', routeTo: 'Vilcabamba', time: '06:00', efectivoReal: 80, income: 80 },
        { routeFrom: 'Vilcabamba', routeTo: 'Loja', time: '08:30', efectivoReal: 95, income: 95 },
      ],
      expenses: [
        { description: 'Chofer', amount: 30 },
        { description: 'Ayudante', amount: 20 },
        { description: 'Plan Renova', amount: 30 }, // Bus 10 cuota correcta
      ],
      cajaComun: 0,
      sobrante: 2.5,
      tickets: 0,
    };

    const saved = canonicalPayloadToSavedRecord(payload, 'arqueo_key_test', true);

    expect(saved._isOfflinePending).toBe(true);
    expect(saved.date).toBe('2026-10-05');
    // Producción = 80 + 95 + 0 + 2.5 = 177.5
    expect(saved.production).toBe(177.5);
    // Total Gastos = 30 + 20 + 30 = 80
    expect(saved.totalGastos).toBe(80);
    // Entrega Ayudante = (175 + 2.5) - (80 + 0) = 97.5
    expect(saved.entregaAyudante).toBe(97.5);
    expect(saved.trips.length).toBe(2);
    expect(saved.expenses.length).toBe(3);
  });

  test('3. getLocalPendingSavedRecords aísla por número de unidad física sin mezclar unidades', () => {
    // Encolar arqueo para Bus 10
    enqueuePendingArqueo('key_bus_10', '10', 'VT04', '2026-10-05', {
      date: '2026-10-05',
      numeroDisco: '10',
      trips: [],
      expenses: [],
    });

    // Encolar arqueo para Bus 01
    enqueuePendingArqueo('key_bus_01', '01', 'VT01', '2026-10-05', {
      date: '2026-10-05',
      numeroDisco: '01',
      trips: [],
      expenses: [],
    });

    expect(countPendingArqueos()).toBe(2);

    // Consulta filtrada para Bus 10
    const recordsBus10 = getLocalPendingSavedRecords('BUS-10');
    expect(recordsBus10.length).toBe(1);
    expect(recordsBus10[0].conductor).toContain('BUS-10');

    // Consulta filtrada para Bus 01
    const recordsBus01 = getLocalPendingSavedRecords('BUS-01');
    expect(recordsBus01.length).toBe(1);
    expect(recordsBus01[0].conductor).toContain('BUS-01');

    // Consulta global (TODOS)
    const recordsTodos = getLocalPendingSavedRecords('TODOS');
    expect(recordsTodos.length).toBe(2);
  });

  test('4. syncSingleArqueo exitoso retira de la cola y actualiza estado sincronizado', async () => {
    const key = 'arqueo_test_success';
    const item = enqueuePendingArqueo(key, '10', 'VT04', '2026-10-05', {
      date: '2026-10-05',
      numeroDisco: '10',
    });

    // Mock fetch global exitoso
    const originalFetch = globalThis.fetch;
    globalThis.fetch = mock(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ id: 'rec_cloud_123' }),
    })) as any;

    try {
      const res = await syncSingleArqueo(item);
      expect(res.success).toBe(true);
      expect(countPendingArqueos()).toBe(0);

      const localRaw = localStorage.getItem(key);
      const localParsed = JSON.parse(localRaw!);
      expect(localParsed._offlinePending).toBe(false);
      expect(localParsed._syncedAt).toBeDefined();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('5. syncSingleArqueo con error conserva el registro en cola y registra último error', async () => {
    const key = 'arqueo_test_fail';
    const item = enqueuePendingArqueo(key, '10', 'VT04', '2026-10-05', {
      date: '2026-10-05',
      numeroDisco: '10',
    });

    // Mock fetch global con fallo 500
    const originalFetch = globalThis.fetch;
    globalThis.fetch = mock(async () => ({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Database connection timeout' }),
    })) as any;

    try {
      const res = await syncSingleArqueo(item);
      expect(res.success).toBe(false);
      expect(res.error).toBe('Database connection timeout');
      expect(countPendingArqueos()).toBe(1);

      const cola = getPendingArqueos();
      expect(cola[0].attempts).toBe(1);
      expect(cola[0].lastError).toBe('Database connection timeout');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('6. syncAllPendingArqueos procesa todos los arqueos y reporta métricas precisas', async () => {
    enqueuePendingArqueo('key_1', '10', 'VT04', '2026-10-05', { id: 1 });
    enqueuePendingArqueo('key_2', '01', 'VT01', '2026-10-05', { id: 2 });

    let callCount = 0;
    const originalFetch = globalThis.fetch;
    globalThis.fetch = mock(async () => {
      callCount++;
      // Primer llamado éxito, segundo fallo
      if (callCount === 1) {
        return { ok: true, status: 200, json: async () => ({}) };
      }
      return { ok: false, status: 503, json: async () => ({ error: 'Service Unavailable' }) };
    }) as any;

    try {
      const result = await syncAllPendingArqueos();
      expect(result.total).toBe(2);
      expect(result.synced).toBe(1);
      expect(result.failed).toBe(1);
      expect(countPendingArqueos()).toBe(1); // Queda 1 pendiente
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
