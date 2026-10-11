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
  getGastosFijosPorUnidad,
  INITIAL_PILOT_BUS,
  BENCHMARK_FLEET_BUSES,
  saveBus,
  getAllBuses,
  setActiveBus,
} from '../src/lib/fleet-storage';
import { createEmptyFormData } from '../src/components/transport/types';

describe('🏛️ GASTO FIJO PLAN RENOVA: Configurable por Unidad Física (v3.61.33)', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
  });

  test('1. Fallback retrocompatible canónico para Bus 01 ($68.00)', () => {
    const gastos01 = getGastosFijosPorUnidad('01');
    const renova01 = gastos01.find((g) => g.description === 'Plan Renova');
    expect(renova01).toBeDefined();
    expect(renova01?.amount).toBe('68');

    // Gastos estándar preservados
    expect(gastos01.find((g) => g.description === 'Chofer')?.amount).toBe('30');
    expect(gastos01.find((g) => g.description === 'Ayudante')?.amount).toBe('20');
    expect(gastos01.find((g) => g.description === 'Diesel')?.amount).toBe('0');
  });

  test('2. Fallback retrocompatible canónico para Bus 10 ($30.00)', () => {
    const gastos10 = getGastosFijosPorUnidad('10');
    const renova10 = gastos10.find((g) => g.description === 'Plan Renova');
    expect(renova10).toBeDefined();
    expect(renova10?.amount).toBe('30');

    // Gastos estándar preservados
    expect(gastos10.find((g) => g.description === 'Chofer')?.amount).toBe('30');
    expect(gastos10.find((g) => g.description === 'Ayudante')?.amount).toBe('20');
  });

  test('3. Fallback canónico para otras unidades sin cuota configurada ($0.00)', () => {
    const gastos02 = getGastosFijosPorUnidad('02');
    const renova02 = gastos02.find((g) => g.description === 'Plan Renova');
    expect(renova02).toBeDefined();
    expect(renova02?.amount).toBe('0');

    const gastos16 = getGastosFijosPorUnidad('16');
    expect(gastos16.find((g) => g.description === 'Plan Renova')?.amount).toBe('0');
  });

  test('4. Cuota personalizada asignada en catálogo de flota (ej. $45.00 para Bus 05)', () => {
    saveBus({
      id: 'BUS-05',
      numeroDisco: '05',
      placa: 'TAA-5505',
      marca: 'Hino AK',
      propietario: 'Socio Unidad 05',
      tipoOperacion: 'TRONCAL_VT',
      planRenovaMonto: 45,
      capacidadAsientos: 45,
      activo: true,
    });

    const gastos05 = getGastosFijosPorUnidad('05');
    const renova05 = gastos05.find((g) => g.description === 'Plan Renova');
    expect(renova05?.amount).toBe('45');
  });

  test('5. Unidad con financiamiento concluido ($0.00 explícito no retrocede a fallback)', () => {
    // Si Bus 01 explícitamente se configura en $0 porque terminó el crédito
    saveBus({
      id: 'BUS-01',
      numeroDisco: '01',
      placa: 'TAA-5152',
      marca: 'Hino AK',
      propietario: 'José Leonardo Jaya Jaramillo',
      tipoOperacion: 'TRONCAL_VT',
      planRenovaMonto: 0,
      capacidadAsientos: 45,
      activo: true,
    });

    const gastos01 = getGastosFijosPorUnidad('01');
    const renova01 = gastos01.find((g) => g.description === 'Plan Renova');
    expect(renova01?.amount).toBe('0');
  });

  test('6. createEmptyFormData inicializa Plan Renova según el disco provisto', () => {
    const formBus01 = createEmptyFormData('01');
    expect(formBus01.expenses.find((g) => g.description === 'Plan Renova')?.amount).toBe('68');

    const formBus10 = createEmptyFormData('10');
    expect(formBus10.expenses.find((g) => g.description === 'Plan Renova')?.amount).toBe('30');

    const formBus03 = createEmptyFormData('03');
    expect(formBus03.expenses.find((g) => g.description === 'Plan Renova')?.amount).toBe('0');
  });

  test('7. Resolución por bus activo sin parámetro explícito', () => {
    setActiveBus('BUS-10');
    const gastosActivo10 = getGastosFijosPorUnidad();
    expect(gastosActivo10.find((g) => g.description === 'Plan Renova')?.amount).toBe('30');

    setActiveBus('BUS-01');
    const gastosActivo01 = getGastosFijosPorUnidad();
    expect(gastosActivo01.find((g) => g.description === 'Plan Renova')?.amount).toBe('68');
  });
});
