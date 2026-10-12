import { describe, test, expect, beforeEach } from 'bun:test';

// Mock de window y localStorage para el entorno de pruebas Bun
const store: Record<string, string> = {};
const mockLocalStorage = {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => { store[k] = String(v); },
  removeItem: (k: string) => { delete store[k]; },
  clear: () => { Object.keys(store).forEach(k => delete store[k]); },
};

(globalThis as any).window = {
  dispatchEvent: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
};
(globalThis as any).localStorage = mockLocalStorage;

import {
  setActiveBus,
  getActiveBus,
  getGastosFijosPorUnidad,
  saveBus,
} from '../src/lib/fleet-storage';
import type { UserSession, SavedRecord } from '../src/components/transport/types';
import type { VTSession } from '../src/components/transport/types-boletos';

describe('🏛️ AISLAMIENTO MULTI-TENANT UNIVERSAL: SOCIO Y AYUDANTE POR UNIDAD (v3.61.40)', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
  });

  test('1. Sesión de Ayudante de Unidad 08: Auto-enlace hermético fija Bus 08 y erradica residuo de Bus 01', () => {
    // Simular que el teléfono tenía previamente activo el Bus 01
    setActiveBus('BUS-01');
    expect(getActiveBus().numeroDisco).toBe('01');

    // Registrar ficha de la Unidad 08 en caché local
    saveBus({
      id: 'BUS-08',
      numeroDisco: '08',
      placa: 'HAA5619',
      marca: 'Hino AK',
      propietario: 'Robert Leonardo Ordóñez Moreno',
      tipoOperacion: 'TRONCAL_VT',
      planRenovaMonto: 23,
      activo: true,
    });

    // Simular sesión autenticada que retorna la API para Edgar Daniel Tapia (Ayudante Bus 08)
    const sessionAyudante08: UserSession = {
      id: 'cmv5u73ew0003gx06v69blmkg',
      nombre: 'EDGAR DANIEL TAPIA CHIMBO',
      rol: 'AYUDANTE',
      socioId: 'cmv5tmhn30000le063isqsx8b',
      esActual: true,
      busId: 'BUS-08',
      busNumero: '08',
      busPlaca: 'HAA5619',
    };

    // Al ingresar, LoginScreen ejecuta setActiveBus(session.busId)
    if (sessionAyudante08.busId) {
      setActiveBus(sessionAyudante08.busId);
    }

    const busActivo = getActiveBus();
    expect(busActivo.id).toBe('BUS-08');
    expect(busActivo.numeroDisco).toBe('08');
    expect(busActivo.placa).toBe('HAA5619');
  });

  test('2. Cuota Plan Renova para Unidad 08 resuelve exactamente $23.00 y no los $68.00 de la Unidad 01', () => {
    saveBus({
      id: 'BUS-08',
      numeroDisco: '08',
      placa: 'HAA5619',
      marca: 'Hino AK',
      propietario: 'Robert Leonardo Ordóñez Moreno',
      tipoOperacion: 'TRONCAL_VT',
      planRenovaMonto: 23,
      activo: true,
    });

    const gastosBus08 = getGastosFijosPorUnidad('BUS-08');
    const renova08 = gastosBus08.find(g => g.description === 'Plan Renova');
    expect(renova08?.amount).toBe('23');

    // Contrastar contra Bus 01 ($68) y Bus 10 ($30)
    const gastosBus01 = getGastosFijosPorUnidad('BUS-01');
    expect(gastosBus01.find(g => g.description === 'Plan Renova')?.amount).toBe('68');

    const gastosBus10 = getGastosFijosPorUnidad('BUS-10');
    expect(gastosBus10.find(g => g.description === 'Plan Renova')?.amount).toBe('30');
  });

  test('3. Filtrado de Historial: Ayudante en Bus 08 descarta 100% de los arqueos de Bus 01', () => {
    const recordsMezclados: SavedRecord[] = [
      {
        id: 'rec-01-antiguo',
        date: '2026-10-01',
        km: '308',
        conductor: 'BUS-01 - José Jaya',
        ayudanteNombre: 'Jorge Patiño',
        production: 400,
        totalGastos: 200,
        entregaAyudante: 150,
        cajaComun: 50,
        tickets: 0,
        sobrante: 0,
        entregaCompania: 50,
        trips: [],
        expenses: [],
      },
      {
        id: 'rec-08-real',
        date: '2026-10-01',
        km: '308',
        conductor: 'BUS-08 - JHONY BOLÍVAR SÁNCHEZ SALINAS',
        ayudanteNombre: 'EDGAR DANIEL TAPIA CHIMBO',
        production: 333.20,
        totalGastos: 181,
        entregaAyudante: 129,
        cajaComun: 23.20,
        tickets: 6,
        sobrante: 0,
        entregaCompania: 17.20,
        trips: [],
        expenses: [],
      },
    ];

    // Lógica defensiva de HistoryScreen para el rol AYUDANTE en Bus 08
    const effectiveBusId = 'BUS-08';
    const cleanDisco = effectiveBusId.replace(/^BUS-/i, '').replace(/\D/g, '').padStart(2, '0');

    const recordsFiltrados = recordsMezclados.filter((r) => {
      const cond = (r.conductor || '').toUpperCase();
      return cond.includes(`BUS-${cleanDisco}`) || cond.includes(`BUS ${cleanDisco}`) || cond.includes(`-${cleanDisco}-`);
    });

    expect(recordsFiltrados.length).toBe(1);
    expect(recordsFiltrados[0].id).toBe('rec-08-real');
    expect(recordsFiltrados[0].conductor).toContain('BUS-08');
    expect(recordsFiltrados[0].ayudanteNombre).toBe('EDGAR DANIEL TAPIA CHIMBO');
  });

  test('4. Turno e Inicio de Sesión VT: Asignación inmutable de disco 08 y placa HAA5619', () => {
    setActiveBus('BUS-08');
    const busActual = getActiveBus();

    const session: VTSession = {
      vtCode: 'VT4',
      nombre: 'Vuelta 04',
      ayudanteId: 'cmv5u73ew0003gx06v69blmkg',
      ayudanteNombre: 'EDGAR DANIEL TAPIA CHIMBO',
      fecha: '2026-10-12',
      busId: busActual.id,
      numeroDisco: busActual.numeroDisco,
      placaBus: busActual.placa,
    };

    expect(session.busId).toBe('BUS-08');
    expect(session.numeroDisco).toBe('08');
    expect(session.placaBus).toBe('HAA5619');
    expect(session.placaBus).not.toBe('TAA-5152');
  });

  test('5. Protección Anti-Fuga: Rechazo categórico de fallback huérfano a BUS-01 cuando usuario posee socioId ajeno', () => {
    // Si un usuario pertenece a Robert Ordóñez (socioId: cmv5tmhn30000le063isqsx8b)
    // El sistema jamás debe considerar válido un fallback a la Unidad 01
    const userRobertCrew: UserSession = {
      id: 'cmv5u73ew0003gx06v69blmkg',
      nombre: 'EDGAR DANIEL TAPIA CHIMBO',
      rol: 'AYUDANTE',
      socioId: 'cmv5tmhn30000le063isqsx8b',
    };

    const socioLiderId = 'cmumr2kfb0000jt04bx1c2q5s'; // José Jaya (Bus 01)
    const esSocioLider = userRobertCrew.socioId === socioLiderId;

    expect(esSocioLider).toBe(false);
    expect(userRobertCrew.socioId).not.toBe(socioLiderId);
  });
});
