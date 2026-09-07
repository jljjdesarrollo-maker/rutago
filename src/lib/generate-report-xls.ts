import { type SavedRecord } from "@/components/transport/types";

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

// ─── Exportador Ejecutivo Multiformato (Fase 3) ───
export async function generateExecutiveReportXLS(data: any): Promise<void> {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();

  // 1. HOJA: RESUMEN EJECUTIVO
  const balanceRows = [
    { "CONCEPTO": "RutaGo - Reporte Ejecutivo Contable", "VALOR": "" },
    { "CONCEPTO": `Período: ${data.startDate || ""} al ${data.endDate || ""}`, "VALOR": `Tipo: ${(data.type || "reporte").toUpperCase()}` },
    { "CONCEPTO": "", "VALOR": "" },
    { "CONCEPTO": "=== BALANCE CONTABLE Y LIQUIDACIÓN ===", "VALOR": "" },
    { "CONCEPTO": "Producción Total (Ruta + Oficina)", "VALOR": Number(data.totalProduction || 0) },
    { "CONCEPTO": "(-) Total Gastos Operativos", "VALOR": Number(data.totalGastos || 0) },
    { "CONCEPTO": "(-) Tickets Descontados en Oficina", "VALOR": Number(data.totalTickets || 0) },
    { "CONCEPTO": "(=) Saldo Neto a Liquidar", "VALOR": Number(data.saldoALiquidar || 0) },
    { "CONCEPTO": "Total Entregado (Compañía + Ayudante)", "VALOR": Number(data.totalEntregado || 0) },
    { "CONCEPTO": "Diferencia de Cuadre (Delta)", "VALOR": Number(data.cuadreDelta || 0) },
    { "CONCEPTO": "Estado de Cuadre", "VALOR": data.cuadra ? "CUADRE EXACTO" : (data.cuadreDelta > 0 ? "SOBRANTE" : "FALTANTE") },
    { "CONCEPTO": "", "VALOR": "" },
    { "CONCEPTO": "=== DESGLOSE DE ENTREGAS EFECTIVAS ===", "VALOR": "" },
    { "CONCEPTO": "Entrega a Compañía", "VALOR": Number(data.totalEntregaCompania || 0) },
    { "CONCEPTO": "Entrega a Ayudante", "VALOR": Number(data.totalEntregaAyudante || 0) },
    { "CONCEPTO": "", "VALOR": "" },
    { "CONCEPTO": "=== INDICADORES DE EFICIENCIA OPERATIVA ===", "VALOR": "" },
    { "CONCEPTO": "Kilómetros Recorridos Totales", "VALOR": `${Number(data.totalKm || 0).toFixed(1)} km` },
    { "CONCEPTO": "Gasto en Diésel / Combustible", "VALOR": Number(data.dieselGasto || 0) },
    { "CONCEPTO": "% Diésel sobre Producción", "VALOR": `${Number(data.pctDiesel || 0).toFixed(1)}%` },
    { "CONCEPTO": "Rendimiento Operativo", "VALOR": `S/ ${Number(data.ingresoPorKm || 0).toFixed(2)} por km` },
    { "CONCEPTO": "Frecuencias Operadas", "VALOR": `${data.totalFrecRealizadas || 0} realizadas de ${data.totalFrecProgramadas || 0} programadas` },
    { "CONCEPTO": "Días Registrados en Período", "VALOR": `${data.foundRecords || 0} encontrados de ${data.expectedRecords || 0} días calendario` },
  ];

  const wsBalance = XLSX.utils.json_to_sheet(balanceRows);
  wsBalance["!cols"] = [{ wch: 45 }, { wch: 25 }];
  XLSX.utils.book_append_sheet(wb, wsBalance, "Resumen_Ejecutivo");

  // 2. HOJA: DETALLE DÍA POR DÍA
  const records = data.records || [];
  const dailyRows: any[] = [];

  records.forEach((r: any) => {
    const rKmIni = r.kmInicial ? Number(r.kmInicial) : "";
    const rKmFin = r.kmFinal ? Number(r.kmFinal) : "";
    const rKmRec = r.km ? Number(r.km) : (rKmFin && rKmIni ? rKmFin - rKmIni : "");
    const prod = Number(r.production || 0);
    const cc = Number(r.cajaComun || 0);
    const efRuta = prod - cc;
    const gastos = Number(r.totalGastos || 0);
    const tks = Number(r.tickets || 0);
    const saldoNeto = prod - gastos - tks;
    const entCia = Number(r.entregaCompania || 0);
    const entAyu = Number(r.entregaAyudante || 0);
    const entTot = entCia + entAyu;
    const delta = entTot - saldoNeto;
    const cuadra = Math.abs(delta) < 0.01;

    // Gasto diesel del dia
    const dDiesel = (r.expenses || [])
      .filter((e: any) => {
        const desc = (e.description || "").toLowerCase();
        return desc.includes("diesel") || desc.includes("diésel") || desc.includes("combustible");
      })
      .reduce((s: number, e: any) => s + Number(e.amount || 0), 0);

    dailyRows.push({
      "Fecha": formatDate(r.date),
      "Cuaderno_VT": r.vtCode || "-",
      "Conductor": r.conductor || "-",
      "Ayudante": r.ayudanteNombre || "-",
      "Tacometro_Salida": rKmIni,
      "Tacometro_Llegada": rKmFin,
      "Km_Recorridos": rKmRec,
      "Efectivo_Ruta": efRuta,
      "Caja_Comun_Oficina": cc,
      "Produccion_Total": prod,
      "Total_Gastos": gastos,
      "Gasto_Diesel": dDiesel,
      "Tickets_Oficina": tks,
      "Saldo_Neto_Liquidar": saldoNeto,
      "Entrega_Compania": entCia,
      "Entrega_Ayudante": entAyu,
      "Total_Entregado": entTot,
      "Diferencia_Cuadre": delta,
      "Estado": cuadra ? "CUADRA" : (delta > 0 ? "SOBRANTE" : "FALTANTE"),
      "Vueltas": (r.trips || []).length,
    });
  });

  // Fila de Totales
  dailyRows.push({
    "Fecha": "TOTALES",
    "Cuaderno_VT": "",
    "Conductor": "",
    "Ayudante": "",
    "Tacometro_Salida": "",
    "Tacometro_Llegada": "",
    "Km_Recorridos": Number(data.totalKm || 0),
    "Efectivo_Ruta": Number(data.totalProduction || 0) - Number(records.reduce((s: number, r: any) => s + (r.cajaComun || 0), 0)),
    "Caja_Comun_Oficina": Number(records.reduce((s: number, r: any) => s + (r.cajaComun || 0), 0)),
    "Produccion_Total": Number(data.totalProduction || 0),
    "Total_Gastos": Number(data.totalGastos || 0),
    "Gasto_Diesel": Number(data.dieselGasto || 0),
    "Tickets_Oficina": Number(data.totalTickets || 0),
    "Saldo_Neto_Liquidar": Number(data.saldoALiquidar || 0),
    "Entrega_Compania": Number(data.totalEntregaCompania || 0),
    "Entrega_Ayudante": Number(data.totalEntregaAyudante || 0),
    "Total_Entregado": Number(data.totalEntregado || 0),
    "Diferencia_Cuadre": Number(data.cuadreDelta || 0),
    "Estado": data.cuadra ? "CUADRA" : (data.cuadreDelta > 0 ? "SOBRANTE" : "FALTANTE"),
    "Vueltas": records.reduce((s: number, r: any) => s + ((r.trips || []).length), 0),
  });

  const wsDaily = XLSX.utils.json_to_sheet(dailyRows);
  wsDaily["!cols"] = [
    { wch: 12 }, { wch: 14 }, { wch: 18 }, { wch: 18 },
    { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 14 },
    { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 14 },
    { wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 16 },
    { wch: 16 }, { wch: 16 }, { wch: 12 }, { wch: 10 }
  ];
  XLSX.utils.book_append_sheet(wb, wsDaily, "Detalle_Diario");

  // 3. HOJA: FRECUENCIAS Y VUELTAS
  const tripRows: any[] = [];
  records.forEach((r: any) => {
    (r.trips || []).forEach((t: any) => {
      const efReal = Number(t.efectivoReal ?? (t.income || 0));
      const ccMonto = Number(t.cajaComunMonto || 0);
      const isNR = t.tipo === "no_realizada";
      const isIE = t.tipo === "ingreso_especial";
      const tipoLabel = isIE ? "Especial" : (isNR ? "No Realizada" : "Frecuencia");

      tripRows.push({
        "Fecha": formatDate(r.date),
        "Cuaderno_VT": r.vtCode || "-",
        "Ayudante": r.ayudanteNombre || "-",
        "Hora": t.time || "-",
        "Ruta": `${t.routeFrom || ""} - ${t.routeTo || ""}`,
        "Tipo": tipoLabel,
        "Efectivo_Ruta": isNR ? 0 : efReal,
        "Caja_Comun": isNR ? 0 : ccMonto,
        "Produccion_Vuelta": isNR ? 0 : (efReal + ccMonto),
        "Boletos_Oficina": Number(t.boletos || 0),
        "Motivo_Observacion": t.motivo || t.notaEspecial || "",
      });
    });
  });

  if (tripRows.length > 0) {
    const wsTrips = XLSX.utils.json_to_sheet(tripRows);
    wsTrips["!cols"] = [
      { wch: 12 }, { wch: 14 }, { wch: 18 }, { wch: 10 },
      { wch: 28 }, { wch: 14 }, { wch: 14 }, { wch: 14 },
      { wch: 16 }, { wch: 14 }, { wch: 30 }
    ];
    XLSX.utils.book_append_sheet(wb, wsTrips, "Vueltas_Frecuencias");
  }

  // 4. HOJA: GASTOS OPERATIVOS
  const expenseRows: any[] = [];
  records.forEach((r: any) => {
    (r.expenses || []).forEach((e: any) => {
      expenseRows.push({
        "Fecha": formatDate(r.date),
        "Cuaderno_VT": r.vtCode || "-",
        "Concepto": e.description || "-",
        "Monto": Number(e.amount || 0),
      });
    });
  });

  if (expenseRows.length > 0) {
    const wsExpenses = XLSX.utils.json_to_sheet(expenseRows);
    wsExpenses["!cols"] = [{ wch: 12 }, { wch: 14 }, { wch: 28 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, wsExpenses, "Gastos_Detalle");
  }

  // 5. HOJA: AUDITORÍA Y NOVEDADES
  const auditRows: any[] = [];
  const missing = data.missingDates || [];
  if (missing.length > 0) {
    auditRows.push({ "CATEGORIA": "FECHAS SIN REGISTRO EN EL PERÍODO", "DETALLE": `${missing.length} días sin hoja de liquidación` });
    missing.forEach((d: string) => {
      auditRows.push({ "CATEGORIA": "Fecha Faltante", "DETALLE": formatDate(d) });
    });
    auditRows.push({ "CATEGORIA": "", "DETALLE": "" });
  }

  const motivos = data.motivosPerdida || [];
  if (motivos.length > 0) {
    auditRows.push({ "CATEGORIA": "PÉRDIDAS OPERATIVAS (Vueltas No Realizadas)", "DETALLE": "" });
    motivos.forEach((m: any) => {
      auditRows.push({ "CATEGORIA": m.motivo, "DETALLE": `${m.count} vueltas no realizadas` });
    });
  }

  if (auditRows.length > 0) {
    const wsAudit = XLSX.utils.json_to_sheet(auditRows);
    wsAudit["!cols"] = [{ wch: 35 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, wsAudit, "Auditoria_Novedades");
  }

  // Escribir archivo y disparar descarga
  const fileName = `rutago_reporte_${data.type || "ejecutivo"}_${data.startDate || ""}_al_${data.endDate || ""}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

// Retrocompatibilidad con función clásica
export function generateReportXLS(records: SavedRecord[], from: string, to: string) {
  const dataWrapper = {
    type: "rango",
    startDate: from,
    endDate: to,
    records,
    totalProduction: records.reduce((s, r) => s + r.production, 0),
    totalGastos: records.reduce((s, r) => s + r.totalGastos, 0),
    totalKm: records.reduce((s, r) => s + (parseFloat(r.km || "0") || 0), 0),
    totalEntregaCompania: records.reduce((s, r) => s + r.entregaCompania, 0),
    totalEntregaAyudante: records.reduce((s, r) => s + r.entregaAyudante, 0),
    totalTickets: records.reduce((s, r) => s + r.tickets, 0),
    totalEntregado: records.reduce((s, r) => s + (r.entregaCompania + r.entregaAyudante), 0),
    saldoALiquidar: records.reduce((s, r) => s + (r.production - r.totalGastos - r.tickets), 0),
    cuadreDelta: records.reduce((s, r) => s + ((r.entregaCompania + r.entregaAyudante) - (r.production - r.totalGastos - r.tickets)), 0),
    cuadra: true,
    foundRecords: records.length,
    expectedRecords: records.length,
  };
  generateExecutiveReportXLS(dataWrapper);
}
