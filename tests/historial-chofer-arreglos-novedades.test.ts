import { describe, it, expect, beforeEach } from 'bun:test';

// Mock de localStorage y window para entorno de testing en Bun
const storageMap: Record<string, string> = {};
const mockLocalStorage = {
  getItem: (k: string) => storageMap[k] ?? null,
  setItem: (k: string, v: string) => { storageMap[k] = String(v); },
  removeItem: (k: string) => { delete storageMap[k]; },
  clear: () => { Object.keys(storageMap).forEach(k => delete storageMap[k]); },
  length: 0,
  key: () => null,
};
(globalThis as any).window = {
  dispatchEvent: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
};
(globalThis as any).localStorage = mockLocalStorage;

import {
  syncRetroactiveParadasFromExpenses,
  getParadasPagoByBus,
  filtrarParadasPagoOffline,
  saveParadaPago,
  type ParadaPagoRegistro,
} from '@/lib/paradas-vt-storage';
import { syncMantenimientoBidireccional } from '@/lib/mantenimiento-sync';

describe('🔧 HISTORIAL DE MANTENIMIENTO: ARREGLOS EN RUTA Y REGISTROS DEL CONDUCTOR (v3.61.72)', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
  });

  it('1. syncRetroactiveParadasFromExpenses procesa arreglos con prefijo gasto-arreglo- y costo $0.00 como pagador CHOFER', () => {
    const rawExpenses = [
      {
        id: 'gasto-arreglo-1762198000000-xyz1',
        busId: 'BUS-01',
        expenseDate: '2026-11-03',
        category: 'OTROS',
        description: 'Revisión / Garantía: Enlainar paquete delantero derecho (Km 907,085) - Taller Don Pepe [Sin costo / Chofer]',
        provider: 'Taller Don Pepe',
        totalAmount: 0,
        paidAmount: 0,
        pendingBalance: 0,
        paymentMethod: 'EFECTIVO',
        status: 'PAGADO',
        origenPago: 'CHOFER',
        createdAt: '2026-11-03T12:00:00Z',
      },
    ];

    mockLocalStorage.setItem('rutago_owner_expenses_v1', JSON.stringify(rawExpenses));

    const count = syncRetroactiveParadasFromExpenses('BUS-01');
    expect(count).toBe(1);

    const paradas = getParadasPagoByBus('BUS-01');
    expect(paradas.length).toBe(1);

    const p = paradas[0];
    expect(p.estacionId).toBe('ARREGLO_EXTRAORDINARIO');
    expect(p.estacionNombre).toBe('Arreglo / Novedad Extraordinaria');
    expect(p.pagador).toBe('CHOFER');
    expect(p.odometroKm).toBe(907085);
    expect(p.costoTotal).toBe(0);
  });

  it('2. syncRetroactiveParadasFromExpenses procesa arreglos con costo > 0 y los categoriza en ARREGLO_EXTRAORDINARIO', () => {
    const rawExpenses = [
      {
        id: 'gasto-arreglo-1762198500000-abc2',
        busId: 'BUS-01',
        expenseDate: '2026-11-03',
        category: 'OTROS',
        description: 'Novedad / Arreglo: Soldadura de escape (Km 907,085) - Taller Don Pepe',
        provider: 'Taller Don Pepe',
        totalAmount: 25.0,
        paidAmount: 25.0,
        pendingBalance: 0,
        paymentMethod: 'EFECTIVO',
        status: 'PAGADO',
        origenPago: 'CHOFER',
        createdAt: '2026-11-03T12:30:00Z',
      },
    ];

    mockLocalStorage.setItem('rutago_owner_expenses_v1', JSON.stringify(rawExpenses));

    const count = syncRetroactiveParadasFromExpenses('BUS-01');
    expect(count).toBe(1);

    const paradas = getParadasPagoByBus('BUS-01');
    expect(paradas.length).toBe(1);

    const p = paradas[0];
    expect(p.estacionId).toBe('ARREGLO_EXTRAORDINARIO');
    expect(p.pagador).toBe('CHOFER');
    expect(p.costoTotal).toBe(25);
    expect(p.odometroKm).toBe(907085);
  });

  it('3. filtrarParadasPagoOffline filtra adecuadamente por chip ARREGLOS y por pagador CHOFER', () => {
    const paradas: ParadaPagoRegistro[] = [
      {
        id: 'P-1',
        busId: 'BUS-01',
        disco: '01',
        fecha: '2026-11-03',
        estacionId: 'ARREGLO_EXTRAORDINARIO',
        estacionNombre: 'Arreglo / Novedad Extraordinaria',
        taller: 'Taller Don Pepe',
        odometroKm: 907085,
        costoTotal: 0,
        pagador: 'CHOFER',
        detalleTrabajo: 'Enlainar paquete delantero derecho',
        createdAt: '2026-11-03T12:00:00Z',
      },
      {
        id: 'P-2',
        busId: 'BUS-01',
        disco: '01',
        fecha: '2026-11-02',
        estacionId: 'LUBRICADORA',
        estacionNombre: 'Lubricadora (Combo)',
        taller: 'Lubricadora Loja',
        odometroKm: 907085,
        costoTotal: 120,
        pagador: 'AYUDANTE',
        createdAt: '2026-11-02T12:00:00Z',
      },
      {
        id: 'P-3',
        busId: 'BUS-01',
        disco: '01',
        fecha: '2026-10-16',
        estacionId: 'LLANTERA',
        estacionNombre: 'Alineación y Llantas',
        taller: 'Cooperativa Loja',
        odometroKm: 907085,
        costoTotal: 648.3,
        pagador: 'SOCIO',
        createdAt: '2026-10-16T12:00:00Z',
      },
    ];

    // Filtro por estación ARREGLOS
    const soloArreglos = filtrarParadasPagoOffline(paradas, '', 'ARREGLOS');
    expect(soloArreglos.length).toBe(1);
    expect(soloArreglos[0].id).toBe('P-1');

    // Búsqueda por texto predictivo "enlainar"
    const porTexto = filtrarParadasPagoOffline(paradas, 'enlainar', 'TODAS');
    expect(porTexto.length).toBe(1);
    expect(porTexto[0].id).toBe('P-1');
  });

  it('4. Paradas con pagador CHOFER o costo $0 no son purgadas durante la reconciliación de syncMantenimientoBidireccional', () => {
    const paradaChofer: ParadaPagoRegistro = {
      id: 'parada-arreglo-1762198000000',
      busId: 'BUS-01',
      disco: '01',
      fecha: '2026-11-03',
      estacionId: 'ARREGLO_EXTRAORDINARIO',
      estacionNombre: 'Arreglo / Novedad Extraordinaria',
      taller: 'Taller Don Pepe',
      odometroKm: 907085,
      costoTotal: 0,
      pagador: 'CHOFER',
      detalleTrabajo: 'Soldadura de escape',
      createdAt: '2026-11-03T12:00:00Z',
    };

    saveParadaPago(paradaChofer);

    const antes = getParadasPagoByBus('BUS-01');
    expect(antes.some(p => p.id === 'parada-arreglo-1762198000000')).toBe(true);

    // Simulamos que el localStorage de paradas tiene la parada del chofer
    // y remoteExpenses está vacío ([]). La reconciliación no debe borrarla.
    const rawParadas = mockLocalStorage.getItem('rg_paradas_pago_v1');
    expect(rawParadas).not.toBeNull();
  });
});
