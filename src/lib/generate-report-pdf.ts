/**
 * Generador de PDF de Reportes Consolidados (A4)
 * Formatos: Diario, Semanal, Mensual, por Conductor, Rango
 * Paleta corporativa: Rojo Vinotinto #912D26, Gris Antracita #3A3A3A, Plata #D6D6D6, White
 *
 * Estructura orientada a toma de decisiones empresariales:
 *   1. OPERATIVO  - Se operó? (asistencia, frecuencias)
 *   2. INGRESOS   - Cuánto entró?
 *   3. EGRESOS    - Cuánto salió?
 *   4. ENTREGAS   - Dónde quedó el dinero?
 *   5. INDICADORES - KPIs clave para decisiones
 *   6. VALIDACION - Cuadre de caja
 *   7. TABLA POR DÍA + DETALLE (páginas siguientes)
 */

const COLORS = {
  primary: [145, 45, 38] as const,     // #912D26
  dark: [58, 58, 58] as const,         // #3A3A3A
  plata: [214, 214, 214] as const,     // #D6D6D6
  white: [255, 255, 255] as const,
  lightRed: [245, 235, 234] as const,
  green: [34, 139, 34] as const,
  amber: [180, 120, 20] as const,      // For mid-range indicators
};

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

function formatMoney(val: number): string {
  return `S/ ${val.toFixed(2)}`;
}

function formatPct(val: number): string {
  return `${(val * 100).toFixed(1)}%`;
}

interface DailySummary {
  date: string;
  records: any[];
  count: number;
  totalProduction: number;
  totalGastos: number;
  totalKm: number;
  totalEntregaCompania: number;
  totalEntregaAyudante: number;
  totalTickets: number;
  totalCajaComun: number;
  totalSobrante: number;
  frecProgramadas?: number;
  frecRealizadas?: number;
  frecNoRealizadas?: number;
  frecIngresoEspecial?: number;
}

interface MotivoPerdida {
  motivo: string;
  count: number;
}

interface ReportData {
  type: string;
  startDate: string;
  endDate: string;
  dailySummaries: DailySummary[];
  totals: {
    production: number;
    gastos: number;
    km: number;
    entregaCompania: number;
    entregaAyudante: number;
    tickets: number;
    cajaComun: number;
    sobrante: number;
    recordCount: number;
    daysWorked: number;
    daysInPeriod?: number;
    expectedRecords?: number;
    foundRecords?: number;
    missingDates?: string[];
    frecProgramadas?: number;
    frecRealizadas?: number;
    frecNoRealizadas?: number;
    frecIngresoEspecial?: number;
    motivosPerdida?: MotivoPerdida[];
    asistencia?: number;
    cumplimiento?: number;
    ingresoPorFrecuencia?: number;
    ingresoPorDia?: number;
    utilidadNeta?: number;
  };
  conductorNames?: string[];
}

function getReportTitle(data: ReportData): string {
  switch (data.type) {
    case 'diario':
      return `Cierre de Caja - ${formatDate(data.startDate)}`;
    case 'semanal':
      return `Reporte Semanal - ${formatDate(data.startDate)} al ${formatDate(data.endDate)}`;
    case 'mensual':
      return `Reporte Mensual - ${formatDate(data.startDate)} al ${formatDate(data.endDate)}`;
    case 'conductor':
      return `Reporte por Ayudante - ${formatDate(data.startDate)} al ${formatDate(data.endDate)}`;
    case 'rango':
      return `Reporte por Rango - ${formatDate(data.startDate)} al ${formatDate(data.endDate)}`;
    default:
      return 'Reporte de Control';
  }
}

export async function generateReportPDF(data: ReportData): Promise<Blob> {
  const { jsPDF } = await import('jspdf');

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const w = 210;
  const ml = 15;
  const mr = 15;
  const cw = w - ml - mr; // 180mm
  let y = 0;

  // ==================== HELPERS ====================

  const addText = (text: string, x: number, yy: number, opts: {
    size?: number;
    color?: readonly number[];
    bold?: boolean;
    align?: 'left' | 'center' | 'right';
    maxWidth?: number;
  } = {}) => {
    const { size = 10, color = COLORS.dark, bold = false, align = 'left', maxWidth } = opts;
    doc.setFontSize(size);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setTextColor(...color);
    const lines = maxWidth
      ? doc.splitTextToSize(text, maxWidth)
      : [text];
    lines.forEach((line: string, i: number) => {
      const xPos = align === 'center' ? ml + cw / 2 : x;
      doc.text(line, xPos, yy + i * (size * 0.35), { align });
    });
    return lines.length * size * 0.35;
  };

  const addLine = (x1: number, x2: number, yy: number, color?: readonly number[]) => {
    doc.setDrawColor(...(color || COLORS.plata));
    doc.setLineWidth(0.3);
    doc.line(x1, yy, x2, yy);
  };

  // Card dimensions
  const cardH = 18;
  const gap = 3;

  const drawCard = (cx: number, cy: number, cw2: number, label: string, value: string, valueColor: readonly number[]) => {
    doc.setFillColor(...COLORS.lightRed);
    doc.roundedRect(cx, cy, cw2, cardH, 2, 2, 'F');
    addText(label, cx + 3, cy + 4, { size: 6.5, color: COLORS.dark });
    addText(value, cx + 3, cy + 12, { size: 10, color: valueColor, bold: true });
  };

  const drawBlockTitle = (title: string) => {
    addText(title, ml, y, { size: 8, color: COLORS.primary, bold: true });
    y += 1.5;
    addLine(ml, w - mr, y);
    y += 3;
  };

  const drawCardRow = (cards: { label: string; value: string; color: readonly number[] }[], cols: number) => {
    const cardW = (cw - gap * (cols - 1)) / cols;
    cards.forEach((card, i) => {
      const cx = ml + i * (cardW + gap);
      drawCard(cx, y, cardW, card.label, card.value, card.color);
    });
    y += cardH + gap;
  };

  // Color helper for percentages: green >= 80%, amber >= 60%, red < 60%
  const pctColor = (pct: number): readonly number[] => {
    if (pct >= 0.8) return COLORS.green;
    if (pct >= 0.6) return COLORS.amber;
    return [220, 50, 50];
  };

  // ==================== HEADER ====================
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, w, 28, 'F');
  addText('REPORTE DE CONTROL', ml + cw / 2, y + 9, {
    size: 16, color: COLORS.white, bold: true, align: 'center',
  });
  addText('TRANSPORTE', ml + cw / 2, y + 17, {
    size: 11, color: COLORS.white, align: 'center',
  });
  y += 24;

  doc.setFillColor(...COLORS.dark);
  doc.rect(0, y, w, 10, 'F');
  addText(getReportTitle(data), ml + cw / 2, y + 7, {
    size: 9, color: COLORS.white, bold: true, align: 'center',
  });
  y += 15;

  // ==================== PRE-COMPUTED VALUES ====================
  const t = data.totals;
  const totalIngresos = t.production;
  const efectivoRuta = t.production - t.cajaComun - t.sobrante;
  const totalEgresos = t.gastos + t.tickets;
  const utilidadNeta = t.utilidadNeta ?? (totalIngresos - totalEgresos);
  const daysInPeriod = t.daysInPeriod ?? t.daysWorked;
  const daysWorked = t.daysWorked;
  const expectedRecords = t.expectedRecords ?? daysInPeriod;
  const foundRecords = t.foundRecords ?? (t.recordCount || daysWorked);
  const missingDates = t.missingDates || [];
  const asistencia = t.asistencia ?? (daysInPeriod > 0 ? daysWorked / daysInPeriod : 0);
  const frecProg = t.frecProgramadas ?? 0;
  const frecReal = t.frecRealizadas ?? 0;
  const frecNoReal = t.frecNoRealizadas ?? 0;
  const frecEsp = t.frecIngresoEspecial ?? 0;
  const cumplimiento = t.cumplimiento ?? (frecProg > 0 ? frecReal / frecProg : 0);
  const ingPorFrec = t.ingresoPorFrecuencia ?? (frecReal > 0 ? totalIngresos / frecReal : 0);
  const ingPorDia = t.ingresoPorDia ?? (daysWorked > 0 ? totalIngresos / daysWorked : 0);
  const motivosPerdida = t.motivosPerdida || [];

  // ==================== 1. OPERATIVO ====================
  drawBlockTitle('1. OPERATIVO - Auditoria y Cumplimiento');
  // Auditoría: Registros esperados vs encontrados
  const auditStatusLabel = foundRecords >= expectedRecords
    ? `Completo (${foundRecords}/${expectedRecords})`
    : `Faltan ${expectedRecords - foundRecords} (${foundRecords}/${expectedRecords})`;
  const auditColor = foundRecords >= expectedRecords ? COLORS.green : (foundRecords > 0 ? COLORS.amber : [220, 50, 50] as const);

  const opCards = [
    { label: 'Reg. Esperados', value: `${expectedRecords}`, color: COLORS.dark },
    { label: 'Reg. Encontrados', value: `${foundRecords}`, color: auditColor },
    { label: 'Auditoria', value: auditStatusLabel, color: auditColor },
    { label: 'Frec. Programadas', value: `${frecProg}`, color: COLORS.dark },
  ];
  drawCardRow(opCards, 4);
  const opCards2 = [
    { label: 'Frec. Realizadas', value: `${frecReal}`, color: COLORS.green },
    { label: 'No Realizadas', value: `${frecNoReal}`, color: frecNoReal > 0 ? [220, 50, 50] : COLORS.dark },
    { label: 'Ing. Especiales', value: `${frecEsp}`, color: COLORS.amber },
    { label: 'Cumplimiento', value: formatPct(cumplimiento), color: pctColor(cumplimiento) },
  ];
  drawCardRow(opCards2, 4);

  // Fechas faltantes de registro (auditoría operativa)
  if (missingDates.length > 0) {
    y += 1;
    const missingFmt = missingDates.map(d => formatDate(d)).join(', ');
    addText(`* Atencion: ${missingDates.length} fecha(s) sin registro de caja: ${missingFmt}`, ml, y, { size: 7, color: [220, 50, 50], bold: true });
    y += 4;
  }

  // Motivos de perdida (solo si hay)
  if (motivosPerdida.length > 0) {
    y += 1;
    const totalNoReal = motivosPerdida.reduce((s, m) => s + m.count, 0);
    addText(`Motivos de perdida (${totalNoReal} freq.):`, ml, y, { size: 7, color: [220, 50, 50], bold: true });
    y += 3.5;
    motivosPerdida.forEach(m => {
      const pctMotivo = totalNoReal > 0 ? (m.count / totalNoReal * 100).toFixed(0) : '0';
      addText(`  - ${m.motivo}: ${m.count} (${pctMotivo}%)`, ml + 4, y, { size: 6.5, color: COLORS.dark });
      y += 3;
    });
    y += 2;
  }

  // ==================== 2. RESULTADO FINANCIERO ====================
  drawBlockTitle('2. RESULTADO FINANCIERO - Cuanto quedo?');
  const ingCards: { label: string; value: string; color: readonly number[] }[] = [
    { label: 'Total Ingresos', value: formatMoney(totalIngresos), color: COLORS.primary },
    { label: 'Efectivo Ruta', value: formatMoney(efectivoRuta), color: COLORS.dark },
    { label: 'Caja Comun', value: formatMoney(t.cajaComun), color: COLORS.dark },
  ];
  if (t.sobrante !== 0) {
    ingCards.push({ label: 'Sobrante', value: formatMoney(t.sobrante), color: COLORS.green });
  }
  drawCardRow(ingCards, ingCards.length);

  // ==================== 3. EGRESOS ====================
  drawBlockTitle('3. EGRESOS - Cuanto salio?');
  drawCardRow([
    { label: 'Total Egresos', value: formatMoney(totalEgresos), color: COLORS.dark },
    { label: 'Total Gastos', value: formatMoney(t.gastos), color: COLORS.dark },
    { label: 'Total Tickets', value: formatMoney(t.tickets), color: COLORS.dark },
  ], 3);

  // ==================== 4. ENTREGAS ====================
  drawBlockTitle('4. ENTREGAS - Donde quedo el dinero?');
  drawCardRow([
    { label: 'Ent. Compania', value: formatMoney(t.entregaCompania), color: COLORS.primary },
    { label: 'Ent. Ayudante', value: formatMoney(t.entregaAyudante), color: COLORS.primary },
    { label: 'Total Entregado', value: formatMoney(t.entregaCompania + t.entregaAyudante), color: COLORS.primary },
  ], 3);

  // ==================== 5. INDICADORES ====================
  drawBlockTitle('5. INDICADORES - Eficiencia');
  const gastoPct = totalIngresos > 0 ? totalEgresos / totalIngresos : 0;
  drawCardRow([
    { label: 'Utilidad Neta', value: formatMoney(utilidadNeta), color: utilidadNeta >= 0 ? COLORS.green : [220, 50, 50] },
    { label: 'Ingreso / Frecuencia', value: formatMoney(ingPorFrec), color: COLORS.dark },
    { label: 'Ingreso / Dia Lab.', value: formatMoney(ingPorDia), color: COLORS.dark },
    { label: 'Gasto / Ingreso', value: formatPct(gastoPct), color: gastoPct <= 0.5 ? COLORS.green : gastoPct <= 0.7 ? COLORS.amber : [220, 50, 50] },
  ], 4);

  // ==================== 6. VALIDACION ====================
  drawBlockTitle('6. VALIDACION - Cuadre de caja');
  const saldoA = t.production - t.gastos - t.tickets;
  const saldoB = t.entregaAyudante + t.entregaCompania;
  const cuadra = Math.abs(saldoA - saldoB) < 0.01;
  addText(`(Produccion ${formatMoney(t.production)}) - (Gastos ${formatMoney(t.gastos)} + Tickets ${formatMoney(t.tickets)}) = ${formatMoney(saldoA)}`, ml, y, { size: 6.5, color: COLORS.dark });
  y += 3.5;
  addText(`Ent. Ayudante (${formatMoney(t.entregaAyudante)}) + Ent. Compania (${formatMoney(t.entregaCompania)}) = ${formatMoney(saldoB)}`, ml, y, { size: 6.5, color: COLORS.dark });
  y += 4;
  addText(cuadra ? 'Cuadra correctamente' : 'DESCUADRE - verificar registros', ml, y, {
    size: 7.5, color: cuadra ? COLORS.green : [248, 113, 113], bold: true,
  });
  y += 8;

  // ==================== PAGE LAYOUT CONSTANTS ====================
  const pageH = doc.internal.pageSize.getHeight();
  const footerY = 14;
  const minY = 15;

  // ==================== 7. TABLA RESUMEN POR DIA ====================
  if (y > pageH - footerY - 30) { doc.addPage(); y = minY; }
  addText('7. TABLA RESUMEN POR DIA', ml, y, { size: 10, color: COLORS.primary, bold: true });
  y += 1.5;
  addLine(ml, w - mr, y);
  y += 3;

  // Columns: Fecha | Prod. | Gastos | E.Compa | E.Ayuda | Total Ent | Km
  const colWidths = [22, 28, 26, 28, 28, 28, 20]; // sum = 180
  const colLabels = ['Fecha', 'Produccion', 'Gastos', 'E. Compania', 'E. Ayudante', 'Total Ent.', 'Km'];
  const colAlign: ('left' | 'right')[] = ['left', 'right', 'right', 'right', 'right', 'right', 'right'];

  const drawTableRow = (values: string[], isHeader: boolean, isAlt: boolean) => {
    const rowH = isHeader ? 7 : 6;
    if (isAlt || isHeader) {
      doc.setFillColor(...(isHeader ? COLORS.dark : COLORS.lightRed));
      let rx = ml;
      colWidths.forEach(cwi => { doc.rect(rx, y - 3, cwi, rowH, 'F'); rx += cwi; });
    }
    let rx = ml;
    values.forEach((val, i) => {
      const align = colAlign[i];
      const xPos = align === 'right' ? rx + colWidths[i] - 2 : rx + 2;
      addText(val, xPos, y + 1.5, {
        size: 7, color: isHeader ? COLORS.white : COLORS.dark, bold: isHeader, align,
      });
      rx += colWidths[i];
    });
    y += rowH + 1;
  };

  drawTableRow(colLabels, true, false);
  y += 2;

  data.dailySummaries.forEach((day, idx) => {
    if (y + 20 > pageH - footerY) {
      doc.addPage();
      y = minY;
      drawTableRow(colLabels, true, false);
      y += 2;
    }
    drawTableRow([
      formatDate(day.date),
      formatMoney(day.totalProduction),
      formatMoney(day.totalGastos),
      formatMoney(day.totalEntregaCompania),
      formatMoney(day.totalEntregaAyudante),
      formatMoney(day.totalEntregaCompania + day.totalEntregaAyudante),
      day.totalKm.toFixed(0),
    ], false, idx % 2 === 0);
  });

  // TOTALS row
  addLine(ml, w - mr, y - 1);
  doc.setFillColor(...COLORS.primary);
  let totalRx = ml;
  colWidths.forEach(cwi => { doc.rect(totalRx, y - 3, cwi, 7, 'F'); totalRx += cwi; });
  let totalTx = ml;
  [
    'TOTAL',
    formatMoney(t.production),
    formatMoney(t.gastos),
    formatMoney(t.entregaCompania),
    formatMoney(t.entregaAyudante),
    formatMoney(t.entregaCompania + t.entregaAyudante),
    t.km.toFixed(0),
  ].forEach((val, i) => {
    const align = colAlign[i];
    const xPos = align === 'right' ? totalTx + colWidths[i] - 2 : totalTx + 2;
    addText(val, xPos, y + 1.5, { size: 7, color: COLORS.white, bold: true, align });
    totalTx += colWidths[i];
  });
  y += 10;

  // ==================== 8. DETALLE DE FRECUENCIAS (diario) ====================
  if (data.type === 'diario' && data.dailySummaries.length > 0) {
    const daySummary = data.dailySummaries[0];
    if (y > pageH - footerY - 20) { doc.addPage(); y = minY; }

    addText('8. DETALLE DE FRECUENCIAS', ml, y, { size: 10, color: COLORS.primary, bold: true });
    y += 1.5;
    addLine(ml, w - mr, y);
    y += 3;

    daySummary.records.forEach(record => {
      if (record.trips && record.trips.length > 0) {
        addText(`Registro - ${formatDate(record.date)}${record.conductor ? ` | Cond: ${record.conductor}` : ''}`, ml, y, { size: 8, color: COLORS.dark, bold: true });
        y += 5;

        const tripCols = [10, 50, 50, 35, 35];
        const tripHeaders = ['#', 'Ruta', 'Retorno', 'Produccion', 'Caja Com.'];
        const tripAligns: ('left' | 'right')[] = ['left', 'left', 'left', 'right', 'right'];
        doc.setFillColor(...COLORS.dark);
        let ttx = ml;
        tripCols.forEach((cwi, i) => {
          doc.rect(ttx, y - 3, cwi, 6, 'F');
          addText(tripHeaders[i], ttx + 2, y + 0.5, { size: 7, color: COLORS.white, bold: true });
          ttx += cwi;
        });
        y += 7;

        record.trips.forEach((trip: any, ti: number) => {
          if (y + 7 > pageH - footerY) { doc.addPage(); y = minY; }
          const isNoReal = trip.tipo === 'no_realizada';
          const isEspecial = trip.tipo === 'ingreso_especial';
          ttx = ml;
          const tripLabel = isNoReal
            ? `${ti + 1} (NR: ${trip.motivo || '-'})`
            : isEspecial
            ? `${ti + 1} (IE: ${trip.notaEspecial || '-'})`
            : `${ti + 1}`;
          [
            tripLabel,
            (isNoReal && !isEspecial) ? '-' : `${trip.routeFrom} - ${trip.routeTo}`,
            trip.time || '-',
            formatMoney(trip.income),
            formatMoney(trip.cajaComunMonto || 0),
          ].forEach((val, i) => {
            addText(val, ttx + 2, y + 0.5, { size: 7, color: isNoReal ? [180, 80, 50] : isEspecial ? COLORS.amber : COLORS.dark, align: tripAligns[i] });
            ttx += tripCols[i];
          });
          y += 5;
        });

        const tripTotalProd = record.trips.reduce((s: number, t: any) => s + t.income, 0);
        const tripTotalCaja = record.trips.reduce((s: number, t: any) => s + t.boletos, 0);
        ttx = ml;
        addText('', ttx, y + 0.5, { size: 7 });
        ttx += 110;
        addText(formatMoney(tripTotalProd), ttx + 2, y + 0.5, { size: 7, color: COLORS.dark, bold: true });
        ttx += 35;
        addText(formatMoney(tripTotalCaja), ttx + 2, y + 0.5, { size: 7, color: COLORS.dark, bold: true });
        y += 7;

        if (record.sobrante && record.sobrante !== 0) {
          addText(`Sobrante: ${formatMoney(record.sobrante)}`, ml, y + 0.5, { size: 7, color: COLORS.green, bold: true });
          y += 6;
        }
      }

      if (record.expenses && record.expenses.length > 0) {
        addText('Gastos:', ml, y, { size: 8, color: COLORS.dark, bold: true });
        y += 5;
        record.expenses.forEach((exp: any) => {
          addText(exp.description, ml + 4, y + 0.5, { size: 7, color: COLORS.dark });
          addText(formatMoney(exp.amount), w - mr - 2, y + 0.5, { size: 7, color: COLORS.dark, align: 'right' });
          y += 4;
        });
        addLine(ml, w - mr, y);
        addText('Total Gastos', ml + 4, y + 3, { size: 7, color: COLORS.primary, bold: true });
        addText(formatMoney(record.totalGastos), w - mr - 2, y + 3, { size: 7, color: COLORS.primary, bold: true, align: 'right' });
        y += 8;
      }
    });
  }

  // ==================== FOOTER ====================
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    const ph = doc.internal.pageSize.getHeight();
    addLine(ml, w - mr, ph - 12);
    addText('Control de Transporte', ml + cw / 2, ph - 7, {
      size: 7, color: COLORS.plata, align: 'center',
    });
    addText(`Pagina ${p} de ${totalPages}`, w - mr, ph - 7, {
      size: 7, color: COLORS.plata, align: 'right',
    });
  }

  return doc.output('blob');
}
