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

  test('8. Flujo Arqueo General del Ayudante: Asigna cuota exacta de la unidad vinculada al turno', () => {
    // Caso Ayudante Bus 10
    const sessionAyudanteBus10 = {
      vtCode: 'VT04',
      fecha: '2026-10-11',
      busId: 'BUS-10',
      numeroDisco: '10',
    };
    const gastosTurnoBus10 = getGastosFijosPorUnidad(sessionAyudanteBus10.numeroDisco || sessionAyudanteBus10.busId);
    expect(gastosTurnoBus10.find((g) => g.description === 'Plan Renova')?.amount).toBe('30');

    // Caso Ayudante Bus 01
    const sessionAyudanteBus01 = {
      vtCode: 'VT01',
      fecha: '2026-10-11',
      busId: 'BUS-01',
      numeroDisco: '01',
    };
    const gastosTurnoBus01 = getGastosFijosPorUnidad(sessionAyudanteBus01.numeroDisco || sessionAyudanteBus01.busId);
    expect(gastosTurnoBus01.find((g) => g.description === 'Plan Renova')?.amount).toBe('68');

    // Caso Ayudante Unidad con valor personalizado (ej. Bus 08 a $40)
    saveBus({
      id: 'BUS-08',
      numeroDisco: '08',
      placa: 'TAA-4808',
      marca: 'Hino AK',
      propietario: 'Socio Unidad 08',
      tipoOperacion: 'TRONCAL_VT',
      planRenovaMonto: 40,
      capacidadAsientos: 45,
      activo: true,
    });
    const sessionAyudanteBus08 = {
      vtCode: 'VT05',
      fecha: '2026-10-11',
      busId: 'BUS-08',
      numeroDisco: '08',
    };
    const gastosTurnoBus08 = getGastosFijosPorUnidad(sessionAyudanteBus08.numeroDisco);
    expect(gastosTurnoBus08.find((g) => g.description === 'Plan Renova')?.amount).toBe('40');
  });

  test('9. Flujo Carga Histórica del Socio: Actualización reactiva al cambiar de unidad preservando otros gastos', () => {
    // Estado inicial en Bus 01 con gastos ya digitados por el socio
    let selectedBus = '01';
    let expenses = [
      { description: 'Chofer', amount: '30' },
      { description: 'Ayudante', amount: '20' },
      { description: 'Diesel', amount: '45' }, // Editado por el socio
      { description: 'Plan Renova', amount: getGastosFijosPorUnidad(selectedBus).find(g => g.description === 'Plan Renova')!.amount },
    ];
    expect(expenses.find(g => g.description === 'Plan Renova')?.amount).toBe('68');
    expect(expenses.find(g => g.description === 'Diesel')?.amount).toBe('45');

    // Socio cambia el combo a Bus 10
    selectedBus = '10';
    const renovaNuevoBus10 = getGastosFijosPorUnidad(selectedBus).find(g => g.description === 'Plan Renova')!.amount;
    expenses = expenses.map(g => g.description === 'Plan Renova' ? { ...g, amount: renovaNuevoBus10 } : g);

    expect(expenses.find(g => g.description === 'Plan Renova')?.amount).toBe('30');
    expect(expenses.find(g => g.description === 'Diesel')?.amount).toBe('45'); // Diésel intacto

    // Socio cambia a Bus 16 (sin cuota Renova)
    selectedBus = '16';
    const renovaNuevoBus16 = getGastosFijosPorUnidad(selectedBus).find(g => g.description === 'Plan Renova')!.amount;
    expenses = expenses.map(g => g.description === 'Plan Renova' ? { ...g, amount: renovaNuevoBus16 } : g);

    expect(expenses.find(g => g.description === 'Plan Renova')?.amount).toBe('0');
    expect(expenses.find(g => g.description === 'Diesel')?.amount).toBe('45'); // Diésel intacto
  });
});
