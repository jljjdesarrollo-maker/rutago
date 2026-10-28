import { describe, test, expect } from "bun:test";
import { calcularEstadoTiempoVenta } from "../src/components/transport/types-boletos";
import { generarCatalogoOficialVTs, TURNOS_CON_PERNOCTA_OFICIALES } from "../src/lib/vt-ventanas-catalogo";

describe("🛡️ BLINDAJE CONTABLE DE FECHA DE OPERACIÓN Y RETORNO DE PERNOCTA OFICIAL (v3.61.59)", () => {
  const fechaAyer = "2026-10-26";
  const fechaHoy = "2026-10-27";

  test("1. Prevención de Error de Fecha en Mañana (06:25 AM): Si el ayudante selecciona Ayer en turno diurno (esPernoctaRetorno = false), BLOQUEA la venta de boletos desde la primera vuelta", () => {
    const now0620 = new Date(2026, 9, 27, 6, 20, 0); // 27 Oct 06:20 AM
    const res = calcularEstadoTiempoVenta("06:25", "Loja - Vilcabamba", fechaAyer, undefined, false, now0620);
    expect(res.esPernocta).toBe(false);
    expect(res.bloqueado).toBe(true);
    expect(res.bloqueadoPorAnticipacion).toBe(false);
    expect(res.minutosTranscurridos).toBeGreaterThanOrEqual(90);
  });

  test("2. Prevención de Error de Fecha en Tarde (12:45 PM y 17:10 PM): Si la sesión tiene fecha Ayer, BLOQUEA la emisión de boletos en vivo", () => {
    const now1240 = new Date(2026, 9, 27, 12, 40, 0);
    const res1245 = calcularEstadoTiempoVenta("12:45", "Vilcabamba - Loja", fechaAyer, undefined, false, now1240);
    expect(res1245.bloqueado).toBe(true);

    const now1705 = new Date(2026, 9, 27, 17, 5, 0);
    const res1710 = calcularEstadoTiempoVenta("17:10", "Vilcabamba - Loja", fechaAyer, undefined, false, now1705);
    expect(res1710.bloqueado).toBe(true);
  });

  test("3. Operación Normal con Fecha HOY (06:25, 12:45, 15:15, 17:10, 18:55, 21:15): Venta 100% HABILITADA dentro de su ventana en el día correcto", () => {
    const res0625 = calcularEstadoTiempoVenta("06:25", "Loja - Vilcabamba", fechaHoy, undefined, false, new Date(2026, 9, 27, 6, 20, 0));
    expect(res0625.bloqueado).toBe(false);
    expect(res0625.minutosTranscurridos).toBe(-5);

    const res1245 = calcularEstadoTiempoVenta("12:45", "Vilcabamba - Loja", fechaHoy, undefined, false, new Date(2026, 9, 27, 12, 40, 0));
    expect(res1245.bloqueado).toBe(false);
    expect(res1245.minutosTranscurridos).toBe(-5);

    const res1515 = calcularEstadoTiempoVenta("15:15", "Loja - Vilcabamba", fechaHoy, undefined, false, new Date(2026, 9, 27, 15, 10, 0));
    expect(res1515.bloqueado).toBe(false);
    expect(res1515.minutosTranscurridos).toBe(-5);

    const res1710 = calcularEstadoTiempoVenta("17:10", "Vilcabamba - Loja", fechaHoy, undefined, false, new Date(2026, 9, 27, 17, 5, 0));
    expect(res1710.bloqueado).toBe(false);
    expect(res1710.minutosTranscurridos).toBe(-5);
    expect(res1710.tiempoRestante).toBe(90);
  });

  test("4. Frecuencia 17:10 PM con Fecha HOY: Venta Activa durante el trayecto a las 17:35 PM (transcurridos 25 min)", () => {
    const now1735 = new Date(2026, 9, 27, 17, 35, 0);
    const res = calcularEstadoTiempoVenta("17:10", "Vilcabamba - Loja", fechaHoy, undefined, false, now1735);
    expect(res.bloqueado).toBe(false);
    expect(res.minutosTranscurridos).toBe(25);
    expect(res.tiempoRestante).toBe(90 - 25);
  });

  test("5. Frecuencia 18:55 PM con Fecha HOY: Bloqueada por anticipación a las 17:05 PM pero HABILITADA a las 18:35 PM", () => {
    const now1705 = new Date(2026, 9, 27, 17, 5, 0);
    const resTemprano = calcularEstadoTiempoVenta("18:55", "Loja - Vilcabamba", fechaHoy, undefined, false, now1705);
    expect(resTemprano.bloqueado).toBe(true);
    expect(resTemprano.bloqueadoPorAnticipacion).toBe(true);

    const now1835 = new Date(2026, 9, 27, 18, 35, 0);
    const resHora = calcularEstadoTiempoVenta("18:55", "Loja - Vilcabamba", fechaHoy, undefined, false, now1835);
    expect(resHora.bloqueado).toBe(false);
    expect(resHora.minutosTranscurridos).toBe(-20);
  });

  test("6. Frecuencia 21:15 PM (última vuelta VT07) con Fecha HOY: Venta HABILITADA a las 21:00 PM sin falsa pernocta", () => {
    const now2100 = new Date(2026, 9, 27, 21, 0, 0);
    const res = calcularEstadoTiempoVenta("21:15", "Vilcabamba - Loja", fechaHoy, undefined, false, now2100);
    expect(res.bloqueado).toBe(false);
    expect(res.minutosTranscurridos).toBe(-15);
  });

  test("7. Catálogo de Ventanas: VT07 y turnos diurnos tienen esPernoctaRetorno = false en todas sus frecuencias", () => {
    const catalogo = generarCatalogoOficialVTs();
    const vt7 = catalogo.find(v => v.codigo === "VT7");
    expect(vt7).toBeDefined();
    vt7!.frecuencias.forEach((f) => {
      expect(f.esPernoctaRetorno).toBe(false);
    });

    const turnosDiurnos = ["VT2", "VT6", "VT7", "VT9", "VT13", "VT15", "P3"];
    turnosDiurnos.forEach(codigo => {
      const item = catalogo.find(v => v.codigo === codigo);
      expect(item).toBeDefined();
      item!.frecuencias.forEach((f) => {
        expect(f.esPernoctaRetorno).toBe(false);
      });
    });
  });

  test("8. Catálogo de Ventanas: Turnos con pernocta oficial mantienen esPernoctaRetorno = true en la última vuelta", () => {
    const catalogo = generarCatalogoOficialVTs();
    TURNOS_CON_PERNOCTA_OFICIALES.forEach(codigo => {
      const item = catalogo.find(v => v.codigo === codigo);
      expect(item).toBeDefined();
      const lastFrec = item!.frecuencias[item!.frecuencias.length - 1];
      expect(lastFrec.esPernoctaRetorno).toBe(true);
    });
  });

  test("9. Preservación intacta de retorno oficial de pernocta en VT11 a las 06:40 AM Día 2 (fecha sesión Ayer + esPernoctaRetorno = true)", () => {
    const now0640 = new Date(2026, 9, 27, 6, 40, 0);
    const res = calcularEstadoTiempoVenta("06:55", "El Tambo - Loja", fechaAyer, undefined, true, now0640);
    expect(res.esPernocta).toBe(true);
    expect(res.bloqueado).toBe(false);
    expect(res.minutosTranscurridos).toBe(-15);
  });
});
