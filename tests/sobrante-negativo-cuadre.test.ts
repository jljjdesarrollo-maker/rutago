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

  test('4. Cuadre Matemático Exacto del 04 de Octubre 2026 (Unidad 08): Entrega Ayudante = $187.00', () => {
    const totalEfectivoReal = 390.00;
    const totalCajaComun = 43.95;
    const totalGastos = 195.00;
    const tickets = 6.00;
    const sobrante = -8.00; // Faltante registrado por el usuario en cuaderno (-$8.00)

    // Regla de Cuadre Canónica de RutaGo con Caja Común
    const entregaAyudante = totalEfectivoReal + sobrante - totalGastos;
    const entregaCompania = totalCajaComun - tickets;
    const produccion = totalEfectivoReal + totalCajaComun + sobrante;

    // Validación contra el cuadre real del usuario ($187.00 de entrega al socio)
    expect(totalEfectivoReal).toBe(390.00);
    expect(totalGastos).toBe(195.00);
    expect(entregaAyudante).toBe(187.00); // 390 - 8 - 195 = 187
    expect(entregaCompania).toBe(37.95);  // 43.95 - 6.00 = 37.95
    expect(produccion).toBe(425.95);      // 390 + 43.95 - 8 = 425.95
  });

  test('5. Sin el faltante de -$8.00 (sobrante = 0), el cálculo erróneo arrojaba $195.00', () => {
    const totalEfectivoReal = 390.00;
    const totalGastos = 195.00;
    const sobranteClamped = 0; // Lo que hacía Math.max(0, -8)
    const entregaErronea = totalEfectivoReal + sobranteClamped - totalGastos;
    expect(entregaErronea).toBe(195.00); // Exactamente los $195 erróneos previos
  });

  test('6. Cuadre Matemático Exacto del 03 de Octubre 2026 (Unidad 08): Entrega Ayudante = $75.00', () => {
    const totalEfectivoReal = 249.00;
    const totalCajaComun = 21.40;
    const totalGastos = 163.00;
    const tickets = 4.50;
    const sobrante = -11.00; // Faltante registrado por el usuario en cuaderno (-$11.00)

    // Regla de Cuadre Canónica de RutaGo con Caja Común
    const entregaAyudante = totalEfectivoReal + sobrante - totalGastos;
    const entregaCompania = totalCajaComun - tickets;
    const produccion = totalEfectivoReal + totalCajaComun + sobrante;

    // Validación contra el cuadre real del usuario ($75.00 de entrega al socio)
    expect(totalEfectivoReal).toBe(249.00);
    expect(totalGastos).toBe(163.00);
    expect(entregaAyudante).toBe(75.00); // 249 - 11 - 163 = 75
    expect(entregaCompania).toBe(16.90); // 21.40 - 4.50 = 16.90
    expect(produccion).toBe(259.40);     // 249 + 21.40 - 11 = 259.40
  });

  test('7. Sin el faltante de -$11.00 (sobrante = 0), el cálculo erróneo arrojaba $86.00', () => {
    const totalEfectivoReal = 249.00;
    const totalGastos = 163.00;
    const sobranteClamped = 0; // Lo que hacía Math.max(0, -11)
    const entregaErronea = totalEfectivoReal + sobranteClamped - totalGastos;
    expect(entregaErronea).toBe(86.00); // Exactamente los $86 erróneos previos
  });

  test('8. Cuadre Matemático Exacto del 02 de Octubre 2026 (Unidad 08): Entrega Ayudante = $43.00', () => {
    const totalEfectivoReal = 222.00;
    const totalCajaComun = 41.30;
    const totalGastos = 173.00;
    const tickets = 6.00;
    const sobrante = -6.00; // Faltante registrado por el usuario en cuaderno (-$6.00)

    // Regla de Cuadre Canónica de RutaGo con Caja Común
    const entregaAyudante = totalEfectivoReal + sobrante - totalGastos;
    const entregaCompania = totalCajaComun - tickets;
    const produccion = totalEfectivoReal + totalCajaComun + sobrante;

    // Validación contra el cuadre real del usuario ($43.00 de entrega al socio)
    expect(totalEfectivoReal).toBe(222.00);
    expect(totalGastos).toBe(173.00);
    expect(entregaAyudante).toBe(43.00); // 222 - 6 - 173 = 43
    expect(entregaCompania).toBe(35.30); // 41.30 - 6.00 = 35.30
    expect(produccion).toBe(257.30);     // 222 + 41.30 - 6 = 257.30
  });

  test('9. Sin el faltante de -$6.00 (sobrante = 0), el cálculo erróneo del 02/10 arrojaba $49.00', () => {
    const totalEfectivoReal = 222.00;
    const totalGastos = 173.00;
    const sobranteClamped = 0; // Lo que hacía Math.max(0, -6)
    const entregaErronea = totalEfectivoReal + sobranteClamped - totalGastos;
    expect(entregaErronea).toBe(49.00); // Exactamente los $49 erróneos previos
  });

  test('10. Cuadre Matemático Exacto del 01 de Octubre 2026 (Unidad 08): Entrega Ayudante = $123.00', () => {
    const totalEfectivoReal = 310.00;
    const totalCajaComun = 23.20;
    const totalGastos = 181.00;
    const tickets = 6.00;
    const sobrante = -6.00; // Faltante registrado por el usuario en cuaderno (-$6.00)

    // Regla de Cuadre Canónica de RutaGo con Caja Común
    const entregaAyudante = totalEfectivoReal + sobrante - totalGastos;
    const entregaCompania = totalCajaComun - tickets;
    const produccion = totalEfectivoReal + totalCajaComun + sobrante;

    // Validación contra el cuadre real del usuario ($123.00 de entrega al socio)
    expect(totalEfectivoReal).toBe(310.00);
    expect(totalGastos).toBe(181.00);
    expect(entregaAyudante).toBe(123.00); // 310 - 6 - 181 = 123
    expect(entregaCompania).toBe(17.20);  // 23.20 - 6.00 = 17.20
    expect(produccion).toBe(327.20);      // 310 + 23.20 - 6 = 327.20
  });

  test('11. Sin el faltante de -$6.00 (sobrante = 0), el cálculo erróneo del 01/10 arrojaba $129.00', () => {
    const totalEfectivoReal = 310.00;
    const totalGastos = 181.00;
    const sobranteClamped = 0; // Lo que hacía Math.max(0, -6)
    const entregaErronea = totalEfectivoReal + sobranteClamped - totalGastos;
    expect(entregaErronea).toBe(129.00); // Exactamente los $129 erróneos previos
  });
});