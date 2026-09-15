/**
 * Generador de PDF de Reportes Consolidados (A4)
 * Formatos: Diario, Semanal, Mensual, por Conductor
 * Paleta corporativa: Rojo Vinotinto #912D26, Gris Antracita #3A3A3A, Plata #D6D6D6, White
 *
 * Diseño aprobado: 3 bloques en Resumen Ejecutivo (Ingresos / Egresos / Entregas)
 * Sin seccion "SUMATORIA DE ENTREGAS" redundante
 */

const COLORS = {
  primary: [145, 45, 38] as const,     // #912D26
  dark: [58, 58, 58] as const,         // #3A3A3A
  plata: [214, 214, 214] as const,     // #D6D6D6
  white: [255, 255, 255] as const,
  lightRed: [245, 235, 234] as const,
  green: [34, 139, 34] as const,
};

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

function formatMoney(val: number): string {
  return `S/ ${val.toFixed(2)}`;
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
  const cw = w - ml - mr;
  let y = 0;

  // Helper: text
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
      const xPos = align === 'center' ? ml + cw / 2 : align === 'right' ? w - mr : x;
      doc.text(line, xPos, yy + i * (size * 0.35), { align });
    });
    return lines.length * size * 0.35;
  };

  // Helper: horizontal line
  const addLine = (x1: number, x2: number, yy: number, color?: readonly number[]) => {
    doc.setDrawColor(...(color || COLORS.plata));
    doc.setLineWidth(0.3);
    doc.line(x1, yy, x2, yy);
  };

  // Helper: draw a card with label + value
  const drawCard = (cx: number, cy: number, cw2: number, ch: number, label: string, value: string, valueColor: readonly number[]) => {
    doc.setFillColor(...COLORS.lightRed);
    doc.roundedRect(cx, cy, cw2, ch, 3, 3, 'F');
    addText(label, cx + 3, cy + 5, { size: 7, color: COLORS.dark });
    addText(value, cx + 3, cy + 14, { size: 11, color: valueColor, bold: true });
  };

  // Helper: draw block title
  const drawBlockTitle = (title: string) => {
    addText(title, ml, y, { size: 9, color: COLORS.primary, bold: true });
    y += 2;
    addLine(ml, w - mr, y);
    y += 4;
  };

  // ============================
  // HEADER BAND
  // ============================
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, w, 32, 'F');

  addText('REPORTE DE CONTROL', ml + cw / 2, y + 10, {
    size: 18, color: COLORS.white, bold: true, align: 'center',
  });
  addText('TRANSPORTE', ml + cw / 2, y + 18, {
    size: 12, color: COLORS.white, align: 'center',
  });
  y += 28;

  // Title subtitle
  doc.setFillColor(...COLORS.dark);
  doc.rect(0, y, w, 12, 'F');
  addText(getReportTitle(data), ml + cw / 2, y + 8, {
    size: 10, color: COLORS.white, bold: true, align: 'center',
  });
  y += 18;

  // ============================
  // RESUMEN EJECUTIVO — 3 bloques
  // ============================
  addText('RESUMEN EJECUTIVO', ml, y, { size: 12, color: COLORS.primary, bold: true });
  y += 2;
  addLine(ml, w - mr, y);
  y += 6;

  const cardW = (cw - 8) / 3;
  const cardH = 22;
  const gap = 4;
  const totalIngresos = data.totals.production + data.totals.cajaComun;
  const totalEgresos = data.totals.gastos + data.totals.tickets;

  // ---- BLOQUE 1: INGRESOS ----
  drawBlockTitle('INGRESOS');
  const ingresoCards: { label: string; value: string; color: readonly number[] }[] = [
    { label: 'Total Ingresos', value: formatMoney(totalIngresos), color: COLORS.primary },
    { label: 'Total Produccion', value: formatMoney(data.totals.production), color: COLORS.dark },
    { label: 'Total Caja Comun', value: formatMoney(data.totals.cajaComun), color: COLORS.dark },
  ];
  // Sobrante only if non-zero
  if (data.totals.sobrante !== 0) {
    ingresoCards.push({ label: 'Total Sobrante', value: formatMoney(data.totals.sobrante), color: COLORS.green });
  }

  const ingresoCols = ingresoCards.length >= 4 ? 4 : 3;
  const ingresoCardW = ingresoCards.length >= 4 ? (cw - gap * 3) / 4 : cardW;
  ingresoCards.forEach((card, i) => {
    const cx = ml + i * (ingresoCardW + gap);
    drawCard(cx, y, ingresoCardW, cardH, card.label, card.value, card.color);
  });
  y += cardH + 8;

  // ---- BLOQUE 2: EGRESOS ----
  drawBlockTitle('EGRESOS');
  const egresoCards: { label: string; value: string; color: readonly number[] }[] = [
    { label: 'Total Egresos', value: formatMoney(totalEgresos), color: COLORS.dark },
    { label: 'Total Gastos', value: formatMoney(data.totals.gastos), color: COLORS.dark },
    { label: 'Total Tickets', value: formatMoney(data.totals.tickets), color: COLORS.dark },
  ];
  const egresoCols = 3;
  const egresoCardW = (cw - gap * 2) / 3;
  egresoCards.forEach((card, i) => {
    const cx = ml + i * (egresoCardW + gap);
    drawCard(cx, y, egresoCardW, cardH, card.label, card.value, card.color);
  });
  y += cardH + 8;

  // ---- BLOQUE 3: ENTREGAS ----
  drawBlockTitle('ENTREGAS');
  const entregaCards: { label: string; value: string; color: readonly number[] }[] = [
    { label: 'Entrega Compania', value: formatMoney(data.totals.entregaCompania), color: COLORS.primary },
    { label: 'Entrega Ayudante', value: formatMoney(data.totals.entregaAyudante), color: COLORS.primary },
    { label: 'Total Entregado', value: formatMoney(data.totals.entregaCompania + data.totals.entregaAyudante), color: COLORS.primary },
    { label: 'Dias Trabajados', value: `${data.totals.daysWorked}`, color: COLORS.dark },
  ];
  const entregaCardW = (cw - gap * 3) / 4;
  entregaCards.forEach((card, i) => {
    const cx = ml + i * (entregaCardW + gap);
    drawCard(cx, y, entregaCardW, cardH, card.label, card.value, card.color);
  });
  y += cardH + 6;

  // ============================
  // VALIDACION
  // ============================
  // Formula: (Produccion + CajaComun - Gastos - Tickets) = (Ent. Ayudante + Ent. Compania)
  const saldoA = data.totals.production + data.totals.cajaComun - data.totals.gastos - data.totals.tickets;
  const saldoB = data.totals.entregaAyudante + data.totals.entregaCompania;
  const cuadra = Math.abs(saldoA - saldoB) < 0.01;

  addText('VALIDACION', ml, y, { size: 9, color: COLORS.primary, bold: true });
  y += 5;
  addText(`(Produccion ${formatMoney(data.totals.production)} + Caja Com. ${formatMoney(data.totals.cajaComun)}) - (Gastos ${formatMoney(data.totals.gastos)} + Tickets ${formatMoney(data.totals.tickets)}) = ${formatMoney(saldoA)}`, ml, y, { size: 7, color: COLORS.dark });
  y += 4;
  addText(`Ent. Ayudante (${formatMoney(data.totals.entregaAyudante)}) + Ent. Compania (${formatMoney(data.totals.entregaCompania)}) = ${formatMoney(saldoB)}`, ml, y, { size: 7, color: COLORS.dark });
  y += 4;
  addText(cuadra ? 'Cuadra correctamente' : 'DESCUADRE - verificar registros', ml, y, {
    size: 8,
    color: cuadra ? COLORS.green : [248, 113, 113],
    bold: true,
  });
  y += 8;

  // ============================
  // TABLA RESUMEN POR DIA
  // ============================
  addText('TABLA RESUMEN POR DIA', ml, y, { size: 12, color: COLORS.primary, bold: true });
  y += 2;
  addLine(ml, w - mr, y);
  y += 4;

  // Table header: Fecha | Produccion | Gastos | E.Compa | E.Ayuda | Total Ent | Km
  const colWidths = [22, 27, 27, 27, 27, 27, 27];
  const colLabels = ['Fecha', 'Produccion', 'Gastos', 'E. Compania', 'E. Ayudante', 'Total Ent.', 'Km'];
  const colAlign: ('left' | 'right')[] = ['left', 'right', 'right', 'right', 'right', 'right', 'right'];

  // Header row
  doc.setFillColor(...COLORS.dark);
  let tx = ml;
  colWidths.forEach((cwi, i) => {
    doc.rect(tx, y - 3, cwi, 7, 'F');
    const align = colAlign[i];
    const xPos = align === 'right' ? tx + cwi - 2 : tx + 2;
    addText(colLabels[i], xPos, y + 1.5, { size: 7, color: COLORS.white, bold: true });
    tx += cwi;
  });
  y += 8;

  // Data rows
  data.dailySummaries.forEach((day, idx) => {
    const rowH = 6;
    if (idx % 2 === 0) {
      doc.setFillColor(...COLORS.lightRed);
      tx = ml;
      colWidths.forEach(cwi => {
        doc.rect(tx, y - 3, cwi, rowH, 'F');
        tx += cwi;
      });
    }

    const rowValues = [
      formatDate(day.date),
      formatMoney(day.totalProduction),
      formatMoney(day.totalGastos),
      formatMoney(day.totalEntregaCompania),
      formatMoney(day.totalEntregaAyudante),
      formatMoney(day.totalEntregaCompania + day.totalEntregaAyudante),
      day.totalKm.toFixed(0),
    ];

    tx = ml;
    colWidths.forEach((cwi, i) => {
      const align = colAlign[i];
      const xPos = align === 'right' ? tx + cwi - 2 : tx + 2;
      addText(rowValues[i], xPos, y + 1.5, { size: 7, color: COLORS.dark });
      tx += cwi;
    });
    y += rowH + 1;
  });

  // TOTALS row
  addLine(ml, w - mr, y - 1);
  doc.setFillColor(...COLORS.primary);
  tx = ml;
  colWidths.forEach(cwi => {
    doc.rect(tx, y - 3, cwi, 7, 'F');
    tx += cwi;
  });

  const totalValues = [
    'TOTAL',
    formatMoney(data.totals.production),
    formatMoney(data.totals.gastos),
    formatMoney(data.totals.entregaCompania),
    formatMoney(data.totals.entregaAyudante),
    formatMoney(data.totals.entregaCompania + data.totals.entregaAyudante),
    data.totals.km.toFixed(0),
  ];

  tx = ml;
  colWidths.forEach((cwi, i) => {
    const align = colAlign[i];
    const xPos = align === 'right' ? tx + cwi - 2 : tx + 2;
    addText(totalValues[i], xPos, y + 1.5, { size: 7, color: COLORS.white, bold: true });
    tx += cwi;
  });
  y += 10;

  // ============================
  // DETALLE DE FRECUENCIAS (only for diario)
  // ============================
  if (data.type === 'diario' && data.dailySummaries.length > 0) {
    const daySummary = data.dailySummaries[0];

    // Check if we need a new page
    if (y > 220) {
      doc.addPage();
      y = 15;
    }

    addText('DETALLE DE FRECUENCIAS', ml, y, { size: 12, color: COLORS.primary, bold: true });
    y += 2;
    addLine(ml, w - mr, y);
    y += 4;

    daySummary.records.forEach(record => {
      if (record.trips && record.trips.length > 0) {
        addText(`Registro - ${formatDate(record.date)}${record.conductor ? ` | Cond: ${record.conductor}` : ''}`, ml, y, { size: 8, color: COLORS.dark, bold: true });
        y += 5;

        const tripCols = [10, 50, 50, 35, 35];
        const tripHeaders = ['#', 'Ruta', 'Retorno', 'Produccion', 'Caja Com.'];

        doc.setFillColor(...COLORS.dark);
        let ttx = ml;
        tripCols.forEach((cwi, i) => {
          doc.rect(ttx, y - 3, cwi, 6, 'F');
          addText(tripHeaders[i], ttx + 2, y + 0.5, { size: 7, color: COLORS.white, bold: true });
          ttx += cwi;
        });
        y += 7;

        record.trips.forEach((trip: any, ti: number) => {
          const tVals = [
            `${ti + 1}`,
            `${trip.routeFrom} - ${trip.routeTo}`,
            trip.time || '-',
            formatMoney(trip.income),
            formatMoney(trip.boletos),
          ];
          ttx = ml;
          tripCols.forEach((cwi, i) => {
            addText(tVals[i], ttx + 2, y + 0.5, { size: 7, color: COLORS.dark, align: i >= 3 ? 'right' : 'left' });
            ttx += cwi;
          });
          y += 5;
        });

        // Trip totals
        const tripTotalProd = record.trips.reduce((s: number, t: any) => s + t.income, 0);
        const tripTotalCaja = record.trips.reduce((s: number, t: any) => s + t.boletos, 0);
        ttx = ml;
        addText('', ttx, y + 0.5, { size: 7 });
        ttx += 110;
        addText(formatMoney(tripTotalProd), ttx + 2, y + 0.5, { size: 7, color: COLORS.dark, bold: true });
        ttx += 35;
        addText(formatMoney(tripTotalCaja), ttx + 2, y + 0.5, { size: 7, color: COLORS.dark, bold: true });
        y += 7;

        // Sobrante (only if non-zero)
        if (record.sobrante && record.sobrante !== 0) {
          addText(`Sobrante: ${formatMoney(record.sobrante)}`, ml, y + 0.5, { size: 7, color: COLORS.green, bold: true });
          y += 6;
        }
      }

      // Expenses
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

  // ============================
  // FOOTER
  // ============================
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    const pageH = doc.internal.pageSize.getHeight();
    addLine(ml, w - mr, pageH - 12);
    addText('Control de Transporte', ml + cw / 2, pageH - 7, {
      size: 7, color: COLORS.plata, align: 'center',
    });
    addText(`Pagina ${p} de ${totalPages}`, w - mr, pageH - 7, {
      size: 7, color: COLORS.plata, align: 'right',
    });
  }

  return doc.output('blob');
}
