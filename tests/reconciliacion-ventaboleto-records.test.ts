import { describe, it, expect } from "bun:test";
import {
  normalizeVtCode,
  matchVentasForTrip,
  resolveCanonicalTripIncomeFromVentas,
  type VentaBoletoMinimal,
} from "../src/lib/reconcile-ventas-trips";

describe("v3.61.62 — Conciliación Directa de DailyRecord.trips contra VentaBoleto (Fuente Única de Verdad)", () => {
  it("normaliza códigos de turno VT con o sin ceros a la izquierda", () => {
    expect(normalizeVtCode("VT06")).toBe("VT6");
    expect(normalizeVtCode("vt6")).toBe("VT6");
    expect(normalizeVtCode("VT10")).toBe("VT10");
    expect(normalizeVtCode(null)).toBe("");
  });

  it("reconcilia el caso real del 26/10/2026 (VT6) tomando SISTEMA directamente de VentaBoleto", () => {
    // Simulación de los boletos reales en PostgreSQL para el 26/10/2026 (VT6)
    const ventasOct26: VentaBoletoMinimal[] = [
      // Vuelta 3 (14:45, VT6_frec_2): suma $71.90 en 60 boletos (simulado con 2 bloques representativos)
      ...Array.from({ length: 59 }, () => ({
        vtCode: "VT6",
        frecuenciaId: "VT6_frec_2",
        fecha: "2026-10-26",
        fechaOperacion: "2026-10-26",
        cobrado: 1.20,
        frecuencia: { hora: "14:45" },
      })),
      {
        vtCode: "VT6",
        frecuenciaId: "VT6_frec_2",
        fecha: "2026-10-26",
        fechaOperacion: "2026-10-26",
        cobrado: 1.10,
        frecuencia: { hora: "14:45" },
      },
      // Vuelta 4 (16:50, VT6_frec_3): suma $59.65
      {
        vtCode: "VT6",
        frecuenciaId: "VT6_frec_3",
        fecha: "2026-10-26",
        fechaOperacion: "2026-10-26",
        cobrado: 59.65,
        frecuencia: { hora: "16:50" },
      },
      // Vuelta 5 (18:40, VT6_frec_4): suma $38.90
      {
        vtCode: "VT6",
        frecuenciaId: "VT6_frec_4",
        fecha: "2026-10-26",
        fechaOperacion: "2026-10-26",
        cobrado: 38.90,
        frecuencia: { hora: "18:40" },
      },
      // Vuelta 6 (20:45, VT6_frec_5): suma $20.40
      {
        vtCode: "VT6",
        frecuenciaId: "VT6_frec_5",
        fecha: "2026-10-26",
        fechaOperacion: "2026-10-26",
        cobrado: 20.40,
        frecuencia: { hora: "20:45" },
      },
    ];

    // Vuelta 3 (14:45): en BD tenía income=76.00 (paridad errónea) y efectivoReal=76.00
    const match1445 = matchVentasForTrip(ventasOct26, "2026-10-26", "VT6", "14:45", 2);
    expect(match1445.count).toBe(60);
    expect(match1445.sumCobrado).toBe(71.90);
    const res1445 = resolveCanonicalTripIncomeFromVentas(76.00, 76.00, 0, "frecuencia", match1445);
    expect(res1445.income).toBe(71.90);
    expect(res1445.boletos).toBe(60);
    expect(res1445.changed).toBe(true);

    // Vuelta 6 (20:45): en BD tenía income=2.15 (truncado por limpieza de 1h) y efectivoReal=22.25
    const match2045 = matchVentasForTrip(ventasOct26, "2026-10-26", "VT6", "20:45", 5);
    expect(match2045.sumCobrado).toBe(20.40);
    const res2045 = resolveCanonicalTripIncomeFromVentas(2.15, 22.25, 3, "frecuencia", match2045);
    expect(res2045.income).toBe(20.40);
    expect(res2045.changed).toBe(true);
  });

  it("preserva la paridad (income = efectivoReal) cuando hay 0 boletos en VentaBoleto (Modo Papel / Carga Histórica)", () => {
    const matchVacio = matchVentasForTrip([], "2026-10-20", "VT1", "06:15", 0);
    expect(matchVacio.count).toBe(0);
    expect(matchVacio.sumCobrado).toBe(0);

    const resPapel = resolveCanonicalTripIncomeFromVentas(0, 45.50, 0, "frecuencia", matchVacio);
    expect(resPapel.income).toBe(45.50);
    expect(resPapel.changed).toBe(true);
  });
});
