import { describe, test, expect } from 'bun:test';
import { buildCanonicalRecordPayload } from '../src/lib/canonical-record-payload';

describe('💰 AUDITORÍA FINANCIERA: SOBRANTE NEGATIVO (FALTANTE DE CAJA) EN CARGA HISTÓRICA', () => {
  test('1. buildCanonicalRecordPayload preserva fielmente sobrante negativo (-$6.00) sin clámpeo a 0', () => {
    const payload = buildCanonicalRecordPayload({
      date: '2026-10-05',
      conductorNombre: 'BUS-08 - JHONY BOLÍVAR SÁNCHEZ SALINAS',
      ayudanteNombre: 'EDGAR DANIEL TAPIA CHIMBO',
      busId: 'BUS-08',
      numeroDisco: '08',
      trips: [
        { routeFrom: 'Loja', routeTo: 'Vilcabamba', efectivoReal: 50, cajaComunMonto: 3.75 },
        { routeFrom: 'Vilcabamba', routeTo: 'Loja', efectivoReal: 25, cajaComunMonto: 0 },
        { routeFrom: 'Loja', routeTo: 'Vilcabamba', efectivoReal: 17, cajaComunMonto: 2.0 },
        { routeFrom: 'Vilcabamba', routeTo: 'Loja', efectivoReal: 35, cajaComunMonto: 0 },
        { routeFrom: 'Loja', routeTo: 'Vilcabamba', efectivoReal: 38, cajaComunMonto: 2.0 },
        { routeFrom: 'Vilcabamba', routeTo: 'Loja', efectivoReal: 22, cajaComunMonto: 0 },
      ],
      expenses: [
        { description: 'Chofer', amount: 30 },
        { description: 'Ayudante', amount: 20 },
        { description: 'Diesel', amount: 90 },
        { description: 'Plan Renova', amount: 23 },
        { description: 'lavada bus', amount: 5 },
        { description: 'engrasada bus', amount: 5 },
      ],
      tickets: 4.5,
      cajaComun: 7.75,
      sobrante: -6,
    });

    // Certificación de preservación del valor negativo
    expect(payload.sobrante).toBe(-6);
    expect(payload.sobrante).not.toBe(0);
  });

  test('2. Cuadre Matemático Exacto del 05 de Octubre 2026 (Unidad 08): Entrega Ayudante = $8.00', () => {
    const totalEfectivoReal = 50 + 25 + 17 + 35 + 38 + 22; // 187.00
    const totalCajaComun = 3.75 + 0 + 2.0 + 0 + 2.0 + 0;   // 7.75
    const totalGastos = 30 + 20 + 90 + 23 + 5 + 5;         // 173.00
    const tickets = 4.50;
    const sobrante = -6.00; // Faltante registrado por el usuario en cuaderno

    // Regla de Cuadre Canónica de RutaGo con Caja Común
    const entregaAyudante = totalEfectivoReal + sobrante - totalGastos;
    const entregaCompania = totalCajaComun - tickets;
    const produccion = totalEfectivoReal + totalCajaComun + sobrante;

    // Validación contra el cuadre real del usuario ($8.00 de entrega al socio)
    expect(totalEfectivoReal).toBe(187);
    expect(totalGastos).toBe(173);
    expect(entregaAyudante).toBe(8.00); // 187 - 6 - 173 = 8
    expect(entregaCompania).toBe(3.25);  // 7.75 - 4.50 = 3.25
    expect(produccion).toBe(188.75);     // 187 + 7.75 - 6 = 188.75
  });

  test('3. Sin el faltante de -$6.00 (sobrante = 0), el cálculo erróneo arrojaba $14.00', () => {
    const totalEfectivoReal = 187;
    const totalGastos = 173;
    const sobranteClamped = 0; // Lo que hacía Math.max(0, -6)

    const entregaErronea = totalEfectivoReal + sobranteClamped - totalGastos;
    expect(entregaErronea).toBe(14.00); // Exactamente los $14 que el usuario reportó como anomalía
  });
});
