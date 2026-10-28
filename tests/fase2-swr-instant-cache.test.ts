import { describe, it, expect } from 'bun:test';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  normalizeCacheBusKey,
  buildHistoryFilterKey,
  getHomeSummarySnapshot,
  saveHomeSummarySnapshot,
  getHistoryRecordsSnapshot,
  saveHistoryRecordsSnapshot,
} from '../src/lib/swr-fast-cache';

const ROOT_DIR = join(__dirname, '..');

describe('⚡ FASE 2: Respuesta Instantánea 0ms SWR en Inicio y Liquidación del Socio (v3.61.64)', () => {
  it('1. normalizeCacheBusKey y buildHistoryFilterKey aíslan herméticamente cada unidad y filtro', () => {
    expect(normalizeCacheBusKey('1')).toBe('BUS-01');
    expect(normalizeCacheBusKey('BUS-08')).toBe('BUS-08');
    expect(normalizeCacheBusKey('TODOS')).toBe('TODOS');

    expect(buildHistoryFilterKey('BUS-01', false, 'semana')).toBe('BUS-01__semana');
    expect(buildHistoryFilterKey('BUS-08', false, 'mes', '2026-10')).toBe('BUS-08__mes__2026-10');
    expect(buildHistoryFilterKey('BUS-01', true, 'semana')).toBe('BUS-01__chofer');
  });

  it('2. saveHomeSummarySnapshot y getHomeSummarySnapshot hidratan en 0ms sin cruzar datos entre unidades', () => {
    saveHomeSummarySnapshot('BUS-01', {
      displayYearMonth: '2026-10',
      routeIncome: 3450.5,
      busExpenses: 850.25,
      netProfit: 2600.25,
      pendingDebts: 120,
      conductorNombre: 'Jimmy Armando Vera Japon',
      ayudanteNombre: 'Carlos',
    });

    saveHomeSummarySnapshot('BUS-08', {
      displayYearMonth: '2026-10',
      routeIncome: 2100,
      busExpenses: 400,
      netProfit: 1700,
      pendingDebts: 0,
      conductorNombre: 'Chofer 08',
      ayudanteNombre: 'Ayudante 08',
    });

    const snap01 = getHomeSummarySnapshot('01');
    const snap08 = getHomeSummarySnapshot('BUS-08');

    expect(snap01?.routeIncome).toBe(3450.5);
    expect(snap01?.conductorNombre).toBe('Jimmy Armando Vera Japon');
    expect(snap08?.routeIncome).toBe(2100);
    expect(snap08?.conductorNombre).toBe('Chofer 08');
  });

  it('3. saveHistoryRecordsSnapshot guarda registros livianos eliminando photoUrl y responde en 0ms', () => {
    const key = buildHistoryFilterKey('BUS-01', false, 'semana');
    saveHistoryRecordsSnapshot(key, [
      {
        id: 'rec-1',
        date: '2026-10-26',
        production: 175.8,
        totalGastos: 129,
        tickets: 6,
        cajaComun: 0,
        entregaAyudante: 40.8,
        entregaCompania: 0,
        trips: [],
        expenses: [],
        // @ts-expect-error verificando que photoUrl se elimine al guardar en caché
        photoUrl: 'data:image/jpeg;base64,HEAVY_STRING',
      },
    ]);

    const cached = getHistoryRecordsSnapshot(key);
    expect(cached).not.toBeNull();
    expect(cached?.length).toBe(1);
    expect(cached?.[0].id).toBe('rec-1');
    expect('photoUrl' in (cached?.[0] || {})).toBe(false);
  });

  it('4. HomeScreen.tsx hidrata desde getHomeSummarySnapshot y ejecuta consultas en paralelo con Promise.all', () => {
    const homeCode = readFileSync(join(ROOT_DIR, 'src/components/transport/HomeScreen.tsx'), 'utf8');
    expect(homeCode).toContain('getHomeSummarySnapshot');
    expect(homeCode).toContain('saveHomeSummarySnapshot');
    expect(homeCode).toContain('fetchBusesCached');
    expect(homeCode).toContain('fetchPersonasCached');
    expect(homeCode).toContain('await Promise.all([');
  });

  it('5. HistoryScreen.tsx hidrata en 0ms con getHistoryRecordsSnapshot sin bloqueo de pantalla en blanco', () => {
    const histCode = readFileSync(join(ROOT_DIR, 'src/components/transport/HistoryScreen.tsx'), 'utf8');
    expect(histCode).toContain('buildHistoryFilterKey');
    expect(histCode).toContain('getHistoryRecordsSnapshot');
    expect(histCode).toContain('saveHistoryRecordsSnapshot');
    expect(histCode).toContain('fetchBusesCached');
  });
});
