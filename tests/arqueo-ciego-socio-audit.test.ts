import { describe, test, expect } from "bun:test";
import { buildCanonicalRecordPayload } from "../src/lib/canonical-record-payload";
import * as fs from "fs";
import * as path from "path";

describe("🛡️ AUDITORÍA CIEGA NEUTRA PARA EL AYUDANTE Y DIAGNÓSTICO QUIRÚRGICO DEL SOCIO (v3.61.61)", () => {
  test("1. ArqueoScreen.tsx (Ayudante): El comprobante de confirmación es 100% neutro y NO revela boletos en ruta ni alertas SOBRANTE/FALTANTE", () => {
    const arqueoCode = fs.readFileSync(
      path.join(__dirname, "../src/components/transport/ArqueoScreen.tsx"),
      "utf8"
    );
    expect(arqueoCode).toContain("Comprobante de Recaudación");
    expect(arqueoCode).toContain("Efectivo Declarado:");
    expect(arqueoCode).toContain("✓ Frecuencia asentada en el turno");
    expect(arqueoCode).not.toContain("Resultado de la Auditoría Ciega");
    expect(arqueoCode).not.toContain("boletos en ruta ·");
    expect(arqueoCode).not.toContain("SOBRANTE: +");
    expect(arqueoCode).not.toContain("FALTANTE: -");
  });

  test("2. Escenario 1 (Flujo Digital con Boletos en App): El Socio detecta el descuadre exacto vuelta por vuelta", () => {
    const payload = buildCanonicalRecordPayload({
      date: "2026-10-26",
      busId: "BUS-01",
      numeroDisco: "01",
      vtCode: "VT01",
      trips: [
        { routeFrom: "Loja", routeTo: "Yangana", time: "06:15", income: 38.50, efectivoReal: 38.50 },
        { routeFrom: "Yangana", routeTo: "Loja", time: "08:30", income: 42.00, efectivoReal: 40.00 },
        { routeFrom: "Vilcabamba", routeTo: "Loja", time: "13:30", income: 31.50, efectivoReal: 32.50 },
        { routeFrom: "Malacatos", routeTo: "Loja", time: "18:15", income: 34.00, efectivoReal: 31.50 },
      ],
      expenses: [],
    });

    const diffs = payload.trips.map(t => parseFloat((t.efectivoReal - t.income).toFixed(2)));
    expect(diffs).toEqual([0, -2.00, 1.00, -2.50]);
    const netDiff = parseFloat(diffs.reduce((a, b) => a + b, 0).toFixed(2));
    expect(netDiff).toBe(-3.50);
  });

  test("3. Escenario 2 (Modo Papel / Frecuencia Directa sin boletos en App): Paridad automática evita falsas alarmas de sobrante", () => {
    const payload = buildCanonicalRecordPayload({
      date: "2026-10-26",
      busId: "BUS-01",
      numeroDisco: "01",
      vtCode: "VT01",
      trips: [
        { routeFrom: "Loja", routeTo: "Vilcabamba", time: "09:00", income: 0, efectivoReal: 40.00 },
      ],
      expenses: [],
    });

    expect(payload.trips[0].income).toBe(40.00);
    expect(payload.trips[0].efectivoReal).toBe(40.00);
    expect(payload.trips[0].efectivoReal - payload.trips[0].income).toBe(0);
  });

  test("4. Escenario 3 (Carga Histórica / Planilla con faltante en sobrante): Se refleja en el descuadre neto del Socio", () => {
    const payload = buildCanonicalRecordPayload({
      date: "2026-10-26",
      busId: "BUS-08",
      numeroDisco: "08",
      vtCode: "VT08",
      trips: [
        { routeFrom: "Loja", routeTo: "Vilcabamba", time: "07:00", income: 30.00, efectivoReal: 30.00 },
      ],
      expenses: [],
      sobrante: -6.00,
    });

    const tripsDiff = payload.trips.reduce((s, t) => s + (t.efectivoReal - t.income), 0);
    const netDiff = parseFloat((tripsDiff + payload.sobrante).toFixed(2));
    expect(netDiff).toBe(-6.00);
  });

  test("5. Aislamiento por Rol en HistoryScreen y RecordDetail: Condicionado estrictamente a isSocio / showSocioAudit", () => {
    const historyCode = fs.readFileSync(
      path.join(__dirname, "../src/components/transport/HistoryScreen.tsx"),
      "utf8"
    );
    const detailCode = fs.readFileSync(
      path.join(__dirname, "../src/components/transport/RecordDetail.tsx"),
      "utf8"
    );
    expect(historyCode).toContain("const isSocio = Boolean(isAdmin || userRole === 'SOCIO' || userRole === 'ADMIN')");
    expect(historyCode).toContain("Ver desglose de las");
    expect(detailCode).toContain("const showSocioAudit = Boolean(isSocio || isAdmin)");
    expect(detailCode).toContain("Alerta de Auditoría: Faltante de");
  });
});
