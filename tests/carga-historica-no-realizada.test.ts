import { describe, test, expect } from "bun:test";
import { buildCanonicalRecordPayload } from "../src/lib/canonical-record-payload";

describe("🚌 CARGA HISTÓRICA: Anulación de Frecuencias e Ingresos Especiales (v3.61.27)", () => {
  test("1. Vuelta No Realizada por motivo operativo genera $0 y ruta '-'", () => {
    const payload = buildCanonicalRecordPayload({
      date: "2026-10-10",
      busId: "BUS-01",
      numeroDisco: "01",
      trips: [
        {
          routeFrom: "Loja",
          routeTo: "Vilcabamba",
          time: "06:15",
          income: 0,
          efectivoReal: 0,
          tipo: "no_realizada",
          motivo: "mantenimiento",
          isNoRealizada: true,
          isIngresoEspecial: false,
        },
      ],
      expenses: [],
    });

    expect(payload.trips.length).toBe(1);
    const trip = payload.trips[0];
    expect(trip.tipo).toBe("no_realizada");
    expect(trip.motivo).toBe("mantenimiento");
    expect(trip.routeFrom).toBe("-");
    expect(trip.routeTo).toBe("-");
    expect(trip.income).toBe(0);
    expect(trip.efectivoReal).toBe(0);
    expect(trip.cajaComunMonto).toBe(0);
  });

  test("2. Vuelta con Ingreso Especial conserva origen/destino, nota y suma monto", () => {
    const payload = buildCanonicalRecordPayload({
      date: "2026-10-10",
      busId: "BUS-01",
      numeroDisco: "01",
      trips: [
        {
          routeFrom: "Loja",
          routeTo: "Vilcabamba",
          time: "08:30",
          income: 45.0,
          efectivoReal: 45.0,
          tipo: "ingreso_especial",
          motivo: "ingreso_especial",
          notaEspecial: "Viaje al Cisne - Contrato",
          isNoRealizada: false,
          isIngresoEspecial: true,
        },
      ],
      expenses: [],
    });

    expect(payload.trips.length).toBe(1);
    const trip = payload.trips[0];
    expect(trip.tipo).toBe("ingreso_especial");
    expect(trip.motivo).toBe("ingreso_especial");
    expect(trip.notaEspecial).toBe("Viaje al Cisne - Contrato");
    expect(trip.routeFrom).toBe("Loja");
    expect(trip.routeTo).toBe("Vilcabamba");
    expect(trip.income).toBe(45.0);
    expect(trip.efectivoReal).toBe(45.0);
    expect(trip.cajaComunMonto).toBe(0);
  });

  test("3. Mezcla de vueltas normales, anuladas y especiales computa totales exactos", () => {
    const rawFrecuencias = [
      { order: 1, noRealizada: false, isIngresoEspecial: false, efectivoReal: "25.50", cajaComunMonto: "4.50" },
      { order: 2, noRealizada: true, isIngresoEspecial: false, efectivoReal: "0", cajaComunMonto: "0", motivoNoRealizada: "daño_unidad" },
      { order: 3, noRealizada: true, isIngresoEspecial: true, efectivoReal: "50.00", ingresoEspecialMonto: "50.00", cajaComunMonto: "0", ingresoEspecialNota: "Flete colegial" },
      { order: 4, noRealizada: false, isIngresoEspecial: false, efectivoReal: "30.00", cajaComunMonto: "5.00" },
    ];

    const totalEfectivoReal = rawFrecuencias.reduce((sum, f) => {
      if (!f.noRealizada) return sum + parseFloat(f.efectivoReal);
      if (f.isIngresoEspecial) return sum + parseFloat(f.ingresoEspecialMonto || f.efectivoReal);
      return sum;
    }, 0);

    const totalCajaComun = rawFrecuencias.reduce((sum, f) => {
      return f.noRealizada ? sum : sum + parseFloat(f.cajaComunMonto);
    }, 0);

    const produccionTotal = totalEfectivoReal + totalCajaComun;

    // F1 (25.50) + F2 (0) + F3 especial (50.00) + F4 (30.00) = 105.50
    expect(totalEfectivoReal).toBe(105.50);
    // Caja común: F1 (4.50) + F4 (5.00) = 9.50
    expect(totalCajaComun).toBe(9.50);
    // Producción: 105.50 + 9.50 = 115.00
    expect(produccionTotal).toBe(115.00);
  });
});
