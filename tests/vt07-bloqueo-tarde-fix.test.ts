import { describe, test, expect } from 'bun:test';
import { calcularEstadoTiempoVenta } from '../src/components/transport/types-boletos';
import { generarCatalogoOficialVTs, TURNOS_CON_PERNOCTA_OFICIALES } from '../src/lib/vt-ventanas-catalogo';

describe('🛡️ BLINDAJE OPERATIVO: FRECUENCIAS VESPERTINAS VT07 Y PREVENCIÓN DE FALSA CONCLUSIÓN (v3.61.58)', () => {
  const fechaAyer = '2026-10-26';
  const fechaHoy = '2026-10-27';

  // VT07 Frecuencias: 
  // 1. 06:25 Loja - Vilcabamba
  // 2. 08:50 Vilcabamba - Loja
  // 3. 10:45 Loja - Vilcabamba
  // 4. 12:45 Vilcabamba - Loja
  // 5. 15:15 Loja - Vilcabamba
  // 6. 17:10 Vilcabamba - Loja
  // 7. 18:55 Loja - Vilcabamba
  // 8. 21:15 Vilcabamba - Loja

  test('1. Frecuencia 12:45 PM: Venta Habilitada a las 12:40 PM incluso si session.fecha proviene del día previo', () => {
    const now1240 = new Date(2026, 9, 27, 12, 40, 0); // 27 Oct 12:40 PM
    const res = calcularEstadoTiempoVenta('12:45', 'Vilcabamba - Loja', fechaAyer, undefined, false, now1240);
    expect(res.bloqueado).toBe(false);
    expect(res.bloqueadoPorAnticipacion).toBe(false);
    expect(res.minutosTranscurridos).toBe(-5);
  });

  test('2. Frecuencia 15:15 PM: Venta Habilitada a las 15:10 PM con sesión arrastrada', () => {
    const now1510 = new Date(2026, 9, 27, 15, 10, 0); // 27 Oct 15:10 PM
    const res = calcularEstadoTiempoVenta('15:15', 'Loja - Vilcabamba', fechaAyer, undefined, false, now1510);
    expect(res.bloqueado).toBe(false);
    expect(res.bloqueadoPorAnticipacion).toBe(false);
    expect(res.minutosTranscurridos).toBe(-5);
  });

  test('3. Frecuencia 17:10 PM: Venta Habilitada a las 17:05 PM (caso reportado en campo Unidad 01)', () => {
    const now1705 = new Date(2026, 9, 27, 17, 5, 0); // 27 Oct 17:05 PM
    const res = calcularEstadoTiempoVenta('17:10', 'Vilcabamba - Loja', fechaAyer, undefined, false, now1705);
    expect(res.bloqueado).toBe(false);
    expect(res.bloqueadoPorAnticipacion).toBe(false);
    expect(res.minutosTranscurridos).toBe(-5);
    expect(res.tiempoRestante).toBe(90);
  });

  test('4. Frecuencia 17:10 PM: Venta Activa durante el trayecto a las 17:35 PM (transcurridos 25 min)', () => {
    const now1735 = new Date(2026, 9, 27, 17, 35, 0); // 27 Oct 17:35 PM
    const res = calcularEstadoTiempoVenta('17:10', 'Vilcabamba - Loja', fechaAyer, undefined, false, now1735);
    expect(res.bloqueado).toBe(false);
    expect(res.minutosTranscurridos).toBe(25);
    expect(res.tiempoRestante).toBe(90 - 25);
  });

  test('5. Frecuencia 18:55 PM: Bloqueada por anticipación a las 17:05 PM pero HABILITADA a las 18:35 PM', () => {
    const now1705 = new Date(2026, 9, 27, 17, 5, 0);
    const resTemprano = calcularEstadoTiempoVenta('18:55', 'Loja - Vilcabamba', fechaAyer, undefined, false, now1705);
    expect(resTemprano.bloqueado).toBe(true);
    expect(resTemprano.bloqueadoPorAnticipacion).toBe(true);

    const now1835 = new Date(2026, 9, 27, 18, 35, 0); // 20 min antes
    const resHora = calcularEstadoTiempoVenta('18:55', 'Loja - Vilcabamba', fechaAyer, undefined, false, now1835);
    expect(resHora.bloqueado).toBe(false);
    expect(resHora.minutosTranscurridos).toBe(-20);
  });

  test('6. Frecuencia 21:15 PM (última vuelta VT07): Venta HABILITADA a las 21:00 PM sin falsa pernocta', () => {
    const now2100 = new Date(2026, 9, 27, 21, 0, 0);
    const res = calcularEstadoTiempoVenta('21:15', 'Vilcabamba - Loja', fechaAyer, undefined, false, now2100);
    expect(res.bloqueado).toBe(false);
    expect(res.minutosTranscurridos).toBe(-15);
  });

  test('7. Catálogo de Ventanas: VT07 y turnos diurnos tienen esPernoctaRetorno = false en todas sus frecuencias', () => {
    const catalogo = generarCatalogoOficialVTs();
    const vt7 = catalogo.find(v => v.codigo === 'VT7');
    expect(vt7).toBeDefined();
    vt7!.frecuencias.forEach((f) => {
      expect(f.esPernoctaRetorno).toBe(false);
    });

    const turnosDiurnos = ['VT2', 'VT6', 'VT7', 'VT9', 'VT13', 'VT15', 'P3'];
    turnosDiurnos.forEach(codigo => {
      const item = catalogo.find(v => v.codigo === codigo);
      expect(item).toBeDefined();
      item!.frecuencias.forEach((f) => {
        expect(f.esPernoctaRetorno).toBe(false);
      });
    });
  });

  test('8. Catálogo de Ventanas: Turnos con pernocta oficial mantienen esPernoctaRetorno = true en la última vuelta', () => {
    const catalogo = generarCatalogoOficialVTs();
    TURNOS_CON_PERNOCTA_OFICIALES.forEach(codigo => {
      const item = catalogo.find(v => v.codigo === codigo);
      expect(item).toBeDefined();
      const lastFrec = item!.frecuencias[item!.frecuencias.length - 1];
      expect(lastFrec.esPernoctaRetorno).toBe(true);
    });
  });

  test('9. Preservación intacta de retorno oficial de pernocta en VT11 a las 06:40 AM Día 2', () => {
    const now0640 = new Date(2026, 9, 27, 6, 40, 0);
    const res = calcularEstadoTiempoVenta('06:55', 'El Tambo - Loja', fechaAyer, undefined, true, now0640);
    expect(res.esPernocta).toBe(true);
    expect(res.bloqueado).toBe(false);
    expect(res.minutosTranscurridos).toBe(-15);
  });
});
