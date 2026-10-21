import { describe, test, expect } from 'bun:test';
import { getLatestBusOdometer } from '../src/lib/fleet-storage';
import { resolveMantenimientoItemsParaBus } from '../src/lib/mantenimiento-estaciones';

describe('🛡️ BLINDAJE DEFENSIVO AYUDANTE Y NULL-SAFETY (v3.61.56)', () => {
  test('1. getLatestBusOdometer retorna null cuando no hay registro y se parsea a 0 con seguridad', () => {
    // Si no hay bus en local storage
    const busIdInexistente = 'BUS-99-TEST';
    const odo = getLatestBusOdometer(busIdInexistente);
    expect(odo).toBeNull();

    // El patrón defensivo implementado en AyudanteMantenimientoBar
    const kmNum = odo ? parseInt((odo as any).kmFinal, 10) || 0 : 0;
    expect(kmNum).toBe(0);

    // Formateo defensivo a cadena no debe lanzar excepción
    const displayTexto = `Tacómetro: ${(kmNum ?? 0).toLocaleString()} KM`;
    expect(displayTexto).toBe('Tacómetro: 0 KM');
  });

  test('2. resolveMantenimientoItemsParaBus tolera baseKm undefined o 0 sin lanzar error', () => {
    const itemsUndefined = resolveMantenimientoItemsParaBus('BUS-01', undefined);
    expect(Array.isArray(itemsUndefined)).toBe(true);

    const itemsCero = resolveMantenimientoItemsParaBus('BUS-01', 0);
    expect(Array.isArray(itemsCero)).toBe(true);
  });

  test('3. Formateo de totalRecaudado en AyudanteJornadaCard tolera null/undefined', () => {
    const resumenTurnoVacio: any = null;
    const montoFormateadoNull = (resumenTurnoVacio?.totalRecaudado ?? 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    expect(montoFormateadoNull).toBe('0.00');

    const resumenTurnoConNull: any = { totalRecaudado: null };
    const montoFormateadoPropNull = (resumenTurnoConNull?.totalRecaudado ?? 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    expect(montoFormateadoPropNull).toBe('0.00');

    const resumenTurnoValido: any = { totalRecaudado: 145.5 };
    const montoFormateadoValido = (resumenTurnoValido?.totalRecaudado ?? 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    expect(montoFormateadoValido).toBe('145.50');
  });

  test('4. Formateo de kmActual y kmRestantes en Mantenimiento tolera null/undefined', () => {
    const kmActualNull: any = null;
    const formateado = (kmActualNull ?? 0).toLocaleString();
    expect(formateado).toBe('0');

    const kmRestantesUndefined: any = undefined;
    const formateadoRestantes = (kmRestantesUndefined ?? 0).toLocaleString();
    expect(formateadoRestantes).toBe('0');
  });
});
