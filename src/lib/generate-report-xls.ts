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

  const t = data.totals || {};
  const records: any[] = (data.records && data.records.length > 0)
    ? data.records
    : (data.dailySummaries || []).flatMap((d: any) => d.records || []);

  const prodTotal = Number(t.production ?? data.totalProduction ?? 0);
  const gastosTotal = Number(t.gastos ?? data.totalGastos ?? 0);
  const ticketsTotal = Number(t.tickets ?? data.totalTickets ?? 0);
  const saldoNeto = Number(t.saldoALiquidar ?? data.saldoALiquidar ?? (prodTotal - gastosTotal - ticketsTotal));
  const entCia = Number(t.entregaCompania ?? data.totalEntregaCompania ?? 0);
  const entAyu = Number(t.entregaAyudante ?? data.totalEntregaAyudante ?? 0);
  const entTot = Number(t.totalEntregado ?? data.totalEntregado ?? (entCia + entAyu));
  const delta = Number(t.cuadreDelta ?? data.cuadreDelta ?? (entTot - saldoNeto));
  const isCuadra = t.cuadra !== undefined ? t.cuadra : (data.cuadra !== undefined ? data.cuadra : Math.abs(delta) < 0.01);
  const kmTotal = Number(t.km ?? data.totalKm ?? 0);
  const dieselTotal = Number(t.dieselGasto ?? data.dieselGasto ?? 0);
  const pctDiesel = t.pctDiesel !== undefined ? t.pctDiesel : (data.pctDiesel !== undefined ? data.pctDiesel : (prodTotal > 0 ? (dieselTotal / prodTotal) * 100 : 0));
  const ingPorKm = t.ingresoPorKm !== undefined ? t.ingresoPorKm : (data.ingresoPorKm !== undefined ? data.ingresoPorKm : (kmTotal > 0 ? prodTotal / kmTotal : 0));
  const frecReal = t.frecRealizadas ?? data.totalFrecRealizadas ?? 0;
  const frecProg = t.frecProgramadas ?? data.totalFrecProgramadas ?? 0;
  const recFound = t.foundRecords ?? data.foundRecords ?? records.length;
  const recExp = t.expectedRecords ?? data.expectedRecords ?? (data.daysInPeriod || records.length);

  // 1. HOJA: RESUMEN EJECUTIVO
  const balanceRows = [
    { "CONCEPTO": "RutaGo - Reporte Ejecutivo Contable", "VALOR": "" },
    { "CONCEPTO": `Período: ${data.startDate || ""} al ${data.endDate || ""}`, "VALOR": `Tipo: ${(data.type || "reporte").toUpperCase()}` },
    { "CONCEPTO": "", "VALOR": "" },
    { "CONCEPTO": "=== BALANCE CONTABLE Y LIQUIDACIÓN ===", "VALOR": "" },
    { "CONCEPTO": "Producción Total (Ruta + Oficina)", "VALOR": prodTotal },
    { "CONCEPTO": "(-) Total Gastos Operativos", "VALOR": gastosTotal },
    { "CONCEPTO": "(-) Tickets Descontados en Oficina", "VALOR": ticketsTotal },
    { "CONCEPTO": "(=) Saldo Neto a Liquidar", "VALOR": saldoNeto },
    { "CONCEPTO": "Total Entregado (Compañía + Ayudante)", "VALOR": entTot },
    { "CONCEPTO": "Diferencia de Cuadre (Delta)", "VALOR": delta },
    { "CONCEPTO": "Estado de Cuadre", "VALOR": isCuadra ? "CUADRE EXACTO" : (delta > 0 ? "SOBRANTE" : "FALTANTE") },
    { "CONCEPTO": "", "VALOR": "" },
    { "CONCEPTO": "=== DESGLOSE DE ENTREGAS EFECTIVAS ===", "VALOR": "" },
    { "CONCEPTO": "Entrega a Compañía", "VALOR": entCia },
    { "CONCEPTO": "Entrega a Ayudante", "VALOR": entAyu },
    { "CONCEPTO": "", "VALOR": "" },
    { "CONCEPTO": "=== INDICADORES DE EFICIENCIA OPERATIVA ===", "VALOR": "" },
    { "CONCEPTO": "Kilómetros Recorridos Totales", "VALOR": `${kmTotal.toFixed(1)} km` },
    { "CONCEPTO": "Gasto en Diésel / Combustible", "VALOR": dieselTotal },
    { "CONCEPTO": "% Diésel sobre Producción", "VALOR": `${Number(pctDiesel).toFixed(1)}%` },
    { "CONCEPTO": "Rendimiento Operativo", "VALOR": `S/ ${Number(ingPorKm).toFixed(2)} por km` },
    { "CONCEPTO": "Frecuencias Operadas", "VALOR": `${frecReal} realizadas de ${frecProg} programadas` },
    { "CONCEPTO": "Días Registrados en Período", "VALOR": `${recFound} encontrados de ${recExp} días calendario` },
  ];

  const wsBalance = XLSX.utils.json_to_sheet(balanceRows);
  wsBalance["!cols"] = [{ wch: 45 }, { wch: 25 }];
  XLSX.utils.book_append_sheet(wb, wsBalance, "Resumen_Ejecutivo");

  // 2. HOJA: DETALLE DÍA POR DÍA
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
    const saldoDia = prod - gastos - tks;
    const entCiaDia = Number(r.entregaCompania || 0);
    const entAyuDia = Number(r.entregaAyudante || 0);
    const entTotDia = entCiaDia + entAyuDia;
    const deltaDia = entTotDia - saldoDia;
    const cuadraDia = Math.abs(deltaDia) < 0.01;

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
      "Saldo_Neto_Liquidar": saldoDia,
      "Entrega_Compania": entCiaDia,
      "Entrega_Ayudante": entAyuDia,
      "Total_Entregado": entTotDia,
      "Diferencia_Cuadre": deltaDia,
      "Estado": cuadraDia ? "CUADRA" : (deltaDia > 0 ? "SOBRANTE" : "FALTANTE"),
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
    "Km_Recorridos": kmTotal,
    "Efectivo_Ruta": prodTotal - Number(records.reduce((s: number, r: any) => s + (r.cajaComun || 0), 0)),
    "Caja_Comun_Oficina": Number(records.reduce((s: number, r: any) => s + (r.cajaComun || 0), 0)),
    "Produccion_Total": prodTotal,
    "Total_Gastos": gastosTotal,
    "Gasto_Diesel": dieselTotal,
    "Tickets_Oficina": ticketsTotal,
    "Saldo_Neto_Liquidar": saldoNeto,
    "Entrega_Compania": entCia,
    "Entrega_Ayudante": entAyu,
    "Total_Entregado": entTot,
    "Diferencia_Cuadre": delta,
    "Estado": isCuadra ? "CUADRA" : (delta > 0 ? "SOBRANTE" : "FALTANTE"),
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
    (r.trips || []).forEach((tItem: any) => {
      const efReal = Number(tItem.efectivoReal ?? (tItem.income || 0));
      const ccMonto = Number(tItem.cajaComunMonto || 0);
      const isNR = tItem.tipo === "no_realizada";
      const isIE = tItem.tipo === "ingreso_especial";
      const tipoLabel = isIE ? "Especial" : (isNR ? "No Realizada" : "Frecuencia");

      tripRows.push({
        "Fecha": formatDate(r.date),
        "Cuaderno_VT": r.vtCode || "-",
        "Ayudante": r.ayudanteNombre || "-",
        "Hora": tItem.time || "-",
        "Ruta": `${tItem.routeFrom || ""} - ${tItem.routeTo || ""}`,
        "Tipo": tipoLabel,
        "Efectivo_Ruta": isNR ? 0 : efReal,
        "Caja_Comun": isNR ? 0 : ccMonto,
        "Produccion_Vuelta": isNR ? 0 : (efReal + ccMonto),
        "Boletos_Oficina": Number(tItem.boletos || 0),
        "Motivo_Observacion": tItem.motivo || tItem.notaEspecial || "",
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
  const missing = t.missingDates || data.missingDates || [];
  if (missing.length > 0) {
    auditRows.push({ "CATEGORIA": "FECHAS SIN REGISTRO EN EL PERÍODO", "DETALLE": `${missing.length} días sin hoja de liquidación` });
    missing.forEach((d: string) => {
      auditRows.push({ "CATEGORIA": "Fecha Faltante", "DETALLE": formatDate(d) });
    });
    auditRows.push({ "CATEGORIA": "", "DETALLE": "" });
  }

  const motivos = t.motivosPerdida || data.motivosPerdida || [];
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

  // Escribir archivo y disparar descarga compatible con móviles y navegadores
  const fileName = `rutago_reporte_${data.type || "ejecutivo"}_${data.startDate || ""}_al_${data.endDate || ""}.xlsx`;
  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([wbout], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Retrocompatibilidad con función clásica
export function generateReportXLS(records: SavedRecord[], from: string, to: string) {
  const dataWrapper = {
    type: "rango",
    startDate: from,
    endDate: to,
    records,
    totals: {
      production: records.reduce((s, r) => s + r.production, 0),
      gastos: records.reduce((s, r) => s + r.totalGastos, 0),
      km: records.reduce((s, r) => s + (parseFloat(r.km || "0") || 0), 0),
      entregaCompania: records.reduce((s, r) => s + r.entregaCompania, 0),
      entregaAyudante: records.reduce((s, r) => s + r.entregaAyudante, 0),
      tickets: records.reduce((s, r) => s + r.tickets, 0),
      totalEntregado: records.reduce((s, r) => s + (r.entregaCompania + r.entregaAyudante), 0),
      saldoALiquidar: records.reduce((s, r) => s + (r.production - r.totalGastos - r.tickets), 0),
      cuadreDelta: records.reduce((s, r) => s + ((r.entregaCompania + r.entregaAyudante) - (r.production - r.totalGastos - r.tickets)), 0),
      cuadra: true,
      foundRecords: records.length,
      expectedRecords: records.length,
    }
  };
  generateExecutiveReportXLS(dataWrapper);
}
