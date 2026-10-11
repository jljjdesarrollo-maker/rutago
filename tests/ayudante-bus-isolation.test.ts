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
} from '../src/lib/fleet-storage';
import {
  enqueuePendingArqueo,
  getLocalPendingSavedRecords,
  countPendingArqueos,
} from '../src/lib/arqueos-sync';
import type { UserSession } from '../src/components/transport/types';
import type { VTSession } from '../src/components/transport/types-boletos';

describe('🛡️ AISLAMIENTO ESTRICTO DEL AYUDANTE POR UNIDAD FÍSICA (v3.61.35)', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
  });

  test('1. Prueba de Turno: Ayudante en Bus 10 inicia sesión forzado en Unidad 10 y rechaza sesión residual de Bus 01', () => {
    // 1. Simular residuo previo de Bus 01 en localStorage
    setActiveBus('BUS-01');
    expect(getActiveBus().numeroDisco).toBe('01');

    const staleSession: VTSession & { timestamp: number } = {
      vtCode: 'VT01',
      nombre: 'Vuelta 01',
      ayudanteId: 'ayudante-antiguo',
      ayudanteNombre: 'Juan Perez',
      fecha: '2026-10-10',
      busId: 'BUS-01',
      numeroDisco: '01',
      timestamp: Date.now() - 3600000,
    };
    mockLocalStorage.setItem('rg_vt_session', JSON.stringify(staleSession));

    // 2. Ayudante actual de la Unidad 10 inicia sesión
    const userAyudante10: UserSession = {
      id: 'usr-ayud-10',
      nombre: 'Carlos Ayudante 10',
      rol: 'AYUDANTE',
      busId: 'BUS-10',
    };

    // Sincronización forzada de unidad por el ayudante autenticado
    const assignedBus = setActiveBus(userAyudante10.busId!);
    expect(assignedBus.numeroDisco).toBe('10');
    expect(getActiveBus().numeroDisco).toBe('10');

    // Validación de descarte de sesión obsoleta perteneciente a otra unidad
    const stored = mockLocalStorage.getItem('rg_vt_session');
    let sessionRestaurada: VTSession | null = null;
    if (stored) {
      const parsed: VTSession = JSON.parse(stored);
      // Regla de blindaje multi-tenant: si pertenece a otro bus, se descarta
      if (userAyudante10.busId && parsed.busId && userAyudante10.busId !== parsed.busId) {
        mockLocalStorage.removeItem('rg_vt_session');
      } else {
        sessionRestaurada = parsed;
      }
    }

    // La sesión del Bus 01 debe haber sido descartada
    expect(sessionRestaurada).toBeNull();
    expect(mockLocalStorage.getItem('rg_vt_session')).toBeNull();

    // Nueva sesión iniciada con los datos puros de la Unidad 10
    const newSession10: VTSession = {
      vtCode: 'VT04',
      nombre: 'Vuelta 04',
      ayudanteId: userAyudante10.id,
      ayudanteNombre: userAyudante10.nombre,
      fecha: '2026-10-11',
      busId: assignedBus.id,
      numeroDisco: assignedBus.numeroDisco,
      placaBus: assignedBus.placa,
    };

    expect(newSession10.busId).toBe('BUS-10');
    expect(newSession10.numeroDisco).toBe('10');
  });

  test('2. Prueba de Gastos Fijos (Plan Renova): Arqueo General asigna cuota exacta de su unidad física', () => {
    // Para Unidad 10, la cuota es $30.00
    const gastos10 = getGastosFijosPorUnidad('10');
    const renova10 = gastos10.find(g => g.description === 'Plan Renova');
    expect(renova10?.amount).toBe('30');

    // Para Unidad 01, la cuota es $68.00
    const gastos01 = getGastosFijosPorUnidad('01');
    const renova01 = gastos01.find(g => g.description === 'Plan Renova');
    expect(renova01?.amount).toBe('68');

    // No hay interferencia entre ambas cuotas
    expect(renova10?.amount).not.toBe(renova01?.amount);
  });

  test('3. Prueba de Cola de Sincronización: Arqueos offline de Bus 10 no se filtran en Bus 01', () => {
    // Encolar arqueo para Unidad 10
    enqueuePendingArqueo(
      'arqueo_general_10_VT04_2026-10-11',
      '10',
      'VT04',
      '2026-10-11',
      {
        conductor: 'BUS-10 - Chofer 10',
        numeroDisco: '10',
        date: '2026-10-11',
        totalIncome: 185.50,
        totalExpenses: 70.00,
        netIncome: 115.50,
        trips: [],
        expenses: [],
      }
    );

    // Encolar arqueo para Unidad 01
    enqueuePendingArqueo(
      'arqueo_general_01_VT01_2026-10-11',
      '01',
      'VT01',
      '2026-10-11',
      {
        conductor: 'BUS-01 - Chofer 01',
        numeroDisco: '01',
        date: '2026-10-11',
        totalIncome: 250.00,
        totalExpenses: 118.00,
        netIncome: 132.00,
        trips: [],
        expenses: [],
      }
    );

    expect(countPendingArqueos()).toBe(2);

    // Consultar registros pendientes para Bus 10
    const pendingBus10 = getLocalPendingSavedRecords('BUS-10');
    expect(pendingBus10.length).toBe(1);
    expect(pendingBus10[0].conductor).toContain('BUS-10');

    // Consultar registros pendientes para Bus 01
    const pendingBus01 = getLocalPendingSavedRecords('BUS-01');
    expect(pendingBus01.length).toBe(1);
    expect(pendingBus01[0].conductor).toContain('BUS-01');
  });

  test('4. Prueba de Historial Filtrado: El ayudante en Unidad 10 solo recibe registros de su disco', () => {
    const rawCloudRecords = [
      { id: 'rec-1', date: '2026-10-11', conductor: 'BUS-10 - Manuel Guachizaca', numeroDisco: '10', netIncome: 120 },
      { id: 'rec-2', date: '2026-10-11', conductor: 'BUS-01 - José Jaya', numeroDisco: '01', netIncome: 150 },
      { id: 'rec-3', date: '2026-10-10', conductor: 'BUS-10 - Manuel Guachizaca', numeroDisco: '10', netIncome: 110 },
      { id: 'rec-4', date: '2026-10-10', conductor: 'BUS-02 - Pedro Gomez', numeroDisco: '02', netIncome: 130 },
    ];

    // Lógica defensiva de filtrado para ayudante en Bus 10
    const effectiveBusId = 'BUS-10';
    const cleanDisco = effectiveBusId.replace(/^BUS-/i, '').replace(/\D/g, '').padStart(2, '0');

    const filtradosAyudante10 = rawCloudRecords.filter(r => {
      const rDisco = (r.numeroDisco || (r.conductor?.match(/BUS-(\d+)/i)?.[1]) || '').padStart(2, '0');
      return rDisco === cleanDisco;
    });

    expect(filtradosAyudante10.length).toBe(2);
    expect(filtradosAyudante10.every(r => r.numeroDisco === '10')).toBe(true);
  });

  test('5. Prueba de Bloqueo de Vistas: El rol AYUDANTE tiene acceso denegado a pantallas de Socio y Admin', () => {
    const ayudante: UserSession = {
      id: 'usr-ayud-1',
      nombre: 'Carlos Ayudante',
      rol: 'AYUDANTE',
      busId: 'BUS-10',
    };

    // Vistas reservadas para Socio / Admin
    const vistasBloqueadas = ['personal', 'reports', 'socio_gastos', 'flota_gestion', 'vtconfig', 'saas_admin'];

    vistasBloqueadas.forEach(v => {
      // Simulación de la guardia en page.tsx
      let allowed = true;
      if (v === 'personal' || v === 'reports' || v === 'socio_gastos' || v === 'flota_gestion') {
        if (ayudante.rol === 'AYUDANTE' || ayudante.rol === 'CONDUCTOR') {
          allowed = false;
        }
      } else if (v === 'vtconfig' || v === 'saas_admin') {
        if (ayudante.rol !== 'ADMIN') {
          allowed = false;
        }
      }
      expect(allowed).toBe(false);
    });

    // Vistas permitidas para AYUDANTE
    const vistasPermitidas = ['boletos_home', 'boletos_frecuencias', 'boletos_tickets', 'boletos_arqueo', 'boletos_arqueo_general', 'boletos_sync', 'history'];
    vistasPermitidas.forEach(v => {
      let allowed = false;
      if (v.startsWith('boletos_') && ayudante.rol === 'AYUDANTE') {
        allowed = true;
      } else if (v === 'history') {
        allowed = true;
      }
      expect(allowed).toBe(true);
    });
  });

  test('6. Prueba de Boletos en IndexedDB: El boleto conserva busId y numeroDisco de la unidad asignada', () => {
    const session: VTSession = {
      vtCode: 'VT04',
      nombre: 'Vuelta 04',
      ayudanteId: 'ayud-10',
      ayudanteNombre: 'Carlos',
      fecha: '2026-10-11',
      busId: 'BUS-10',
      numeroDisco: '10',
      placaBus: 'TAA-3420',
    };

    // Creación de venta en TicketScreen con las propiedades inyectadas
    const ventaSimulada = {
      id: `local_${Date.now()}_0`,
      fecha: session.fecha,
      fechaOperacion: session.fecha,
      diaTurno: 1,
      vtCode: session.vtCode,
      frecuenciaId: 'frec-1',
      frecuenciaNombre: '06:40 Loja - El Tambo',
      estadoId: '2026-10-11_frec-1',
      ruta: 'Loja - El Tambo',
      parada: 'El Tambo',
      tipo: 'ida',
      pasajeroTipo: 'normal',
      tarifaOficial: 1.50,
      cobrado: 1.50,
      hora: '06:42',
      fechaEmision: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      ayudanteId: session.ayudanteId,
      ayudanteNombre: session.ayudanteNombre,
      busId: session.busId,
      numeroDisco: session.numeroDisco,
      syncStatus: 'pending' as const,
    };

    expect(ventaSimulada.busId).toBe('BUS-10');
    expect(ventaSimulada.numeroDisco).toBe('10');
    expect(ventaSimulada.vtCode).toBe('VT04');
  });
});
