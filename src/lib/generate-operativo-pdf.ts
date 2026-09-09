/**
 * Generador de PDF del Reporte Operativo (A4)
 * Detalle por frecuencia: estado, motivo, ingreso especial, monto
 * Paleta corporativa: Rojo Vinotinto #912D26, Gris Antracita #3A3A3A, Plata #D6D6D6, White
 */

const COLORS = {
  primary: [145, 45, 38] as const,
  dark: [58, 58, 58] as const,
  plata: [214, 214, 214] as const,
  white: [255, 255, 255] as const,
  lightRed: [245, 235, 234] as const,
  green: [34, 139, 34] as const,
  amber: [180, 120, 20] as const,
  blue: [20, 80, 160] as const,
  lightGreen: [240, 253, 244] as const,
  lightAmber: [255, 251, 235] as const,
  lightRedBg: [254, 242, 242] as const,
};

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

function formatMoney(val: number): string {
  return `S/ ${val.toFixed(2)}`;
}

const MOTIVO_LABELS: Record<string, string> = {
  mantenimiento: 'Mantenimiento',
  danio_unidad: 'Danio en la unidad',
  sin_pasajeros: 'Sin pasajeros',
  clima: 'Clima / Lluvia',
  problema_ruta: 'Problema en la ruta',
  orden_superior: 'Orden superior',
  otro: 'Otro motivo',
  cierre: 'Cierre',
};

function labelMotivo(m: string): string {
  return MOTIVO_LABELS[m] || m;
}

interface OperativoTrip {
  date: string;
  vtCode: string;
  ayudante: string;
  hora: string;
  nombre: string;
  ruta: string;
  tipo: string;
  motivo: string | null;
  notaEspecial: string | null;
  income: number;
  efectivoReal: number;
  cajaComunMonto: number;
}

interface OperativoMotivo {
  motivo: string;
  count: number;
  pct: number;
}

interface OperativoDay {
  date: string;
  trips: OperativoTrip[];
}

export interface OperativoData {
  startDate: string;
  endDate: string;
  totalProgramadas: number;
  realizadas: number;
  noRealizadas: number;
  ingresosEspeciales: number;
  cumplimiento: number;
  totalIngresos: number;
  totalEfectivoRuta?: number;
  totalCajaComun?: number;
  totalIngresosEspeciales?: number;
  promedioPorFrecuencia?: number;
  pctCajaComun?: number;
  motivos: OperativoMotivo[];
  days: OperativoDay[];
}

export async function generateOperativoPDF(data: OperativoData): Promise<Blob> {
  const { jsPDF } = await import('jspdf');

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const w = 210;
  const ml = 15;
  const mr = 15;
  const cw = w - ml - mr; // 180mm
  const pageH = doc.internal.pageSize.getHeight();
  const footerY = 14;
  const minY = 15;
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
      const xPos = x;
      doc.text(line, xPos, yy + i * (size * 0.35), { align });
    });
    return lines.length * size * 0.35;
  };

  const addLine = (x1: number, x2: number, yy: number, color?: readonly number[]) => {
    doc.setDrawColor(...(color || COLORS.plata));
    doc.setLineWidth(0.3);
    doc.line(x1, yy, x2, yy);
  };

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

  const pctColor = (pct: number): readonly number[] => {
    if (pct >= 0.8) return COLORS.green;
    if (pct >= 0.6) return COLORS.amber;
    return [220, 50, 50];
  };

  const checkPage = (needed: number) => {
    if (y + needed > pageH - footerY) {
      doc.addPage();
      y = minY;
      return true;
    }
    return false;
  };

  // ==================== HEADER ====================
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, w, 28, 'F');
  addText('REPORTE OPERATIVO', ml + cw / 2, y + 9, {
    size: 16, color: COLORS.white, bold: true, align: 'center',
  });
  addText('Frecuencias: realizadas, perdidas y especiales', ml + cw / 2, y + 17, {
    size: 10, color: [...COLORS.white].map(v => Math.min(255, v + 60)) as unknown as readonly number[], align: 'center',
  });
  y += 24;

  doc.setFillColor(...COLORS.dark);
  doc.rect(0, y, w, 10, 'F');
  addText(`${formatDate(data.startDate)} al ${formatDate(data.endDate)}`, ml + cw / 2, y + 7, {
    size: 9, color: COLORS.white, bold: true, align: 'center',
  });
  y += 15;

  // ==================== KPI CARDS ====================
  drawBlockTitle('RESUMEN EJECUTIVO');

  const kpiCards = [
    { label: 'Programadas', value: `${data.totalProgramadas}`, color: COLORS.dark },
    { label: 'Cumplimiento', value: `${(data.cumplimiento * 100).toFixed(1)}%`, color: pctColor(data.cumplimiento) },
    { label: 'Realizadas', value: `${data.realizadas}`, color: COLORS.green },
    { label: 'Perdidas', value: `${data.noRealizadas}`, color: data.noRealizadas > 0 ? [220, 50, 50] : COLORS.dark },
  ];
  drawCardRow(kpiCards, 4);

  const kpiCards2 = [
    { label: 'Total Ingresos', value: formatMoney(data.totalIngresos), color: COLORS.primary },
    { label: 'Ingreso / Frec. Real.', value: data.realizadas > 0 ? formatMoney(data.totalIngresos / data.realizadas) : 'S/ 0.00', color: COLORS.dark },
    { label: 'Ingresos Especiales', value: `${data.ingresosEspeciales}`, color: COLORS.amber },
    { label: 'Dias con Registro', value: `${data.days.length}`, color: COLORS.dark },
  ];
  drawCardRow(kpiCards2, 4);

  // ==================== MOTIVOS DE PERDIDA ====================
  if (data.motivos.length > 0) {
    checkPage(25);
    drawBlockTitle('MOTIVOS DE PERDIDA');
    data.motivos.forEach(m => {
      checkPage(6);
      addText(`  - ${labelMotivo(m.motivo)}`, ml + 2, y, { size: 8, color: COLORS.dark });
      addText(`${m.count}`, w - mr - 40, y, { size: 8, color: COLORS.dark, align: 'right' });
      addText(`${(m.pct * 100).toFixed(0)}%`, w - mr - 2, y, { size: 8, color: [220, 50, 50], bold: true, align: 'right' });
      y += 5;
    });
    y += 5;
  }

  // ==================== DETALLE POR DIA ====================
  drawBlockTitle('DETALLE POR DIA Y FRECUENCIA');

  // Table columns: Hora | Ruta | Estado | Efectivo | C. Comun | Total | Detalle (sum = 180mm)
  const colW = [14, 50, 14, 24, 24, 26, 28];
  const colHeaders = ['Hora', 'Ruta', 'Estado', 'Efectivo', 'C. Comun', 'Total', 'Detalle'];
  const colAlign: ('left' | 'right' | 'center')[] = ['center', 'left', 'center', 'right', 'right', 'right', 'left'];

  const drawTableHeader = () => {
    doc.setFillColor(...COLORS.dark);
    let rx = ml;
    colW.forEach(cwi => { doc.rect(rx, y - 3, cwi, 7, 'F'); rx += cwi; });
    let tx = ml;
    colHeaders.forEach((h, i) => {
      const a = colAlign[i];
      const xPos = a === 'right' ? tx + colW[i] - 2 : a === 'center' ? tx + colW[i] / 2 : tx + 2;
      addText(h, xPos, y + 0.5, { size: 7, color: COLORS.white, bold: true, align: a });
      tx += colW[i];
    });
    y += 8;
  };

  drawTableHeader();

  data.days.forEach(day => {
    // Day header
    checkPage(20);
    addLine(ml, w - mr, y);
    addText(formatDate(day.date), ml, y + 3, { size: 8, color: COLORS.primary, bold: true });
    y += 6;

    // Re-draw table header on new page after day header
    if (y < 20) {
      drawTableHeader();
    }

    day.trips.forEach((trip, ti) => {
      checkPage(8);

      const isRealizada = trip.tipo === 'frecuencia';
      const isEspecial = trip.tipo === 'ingreso_especial';
      const isNoReal = trip.tipo === 'no_realizada';

      // Row background
      const rowColor = isRealizada ? COLORS.lightGreen : isEspecial ? COLORS.lightAmber : COLORS.lightRedBg;
      doc.setFillColor(...rowColor);
      let rx = ml;
      colW.forEach(cwi => { doc.rect(rx, y - 3, cwi, 6, 'F'); rx += cwi; });

      // Status icon (text-based for PDF)
      const estado = isRealizada ? 'OK' : isEspecial ? 'ESP' : 'NR';
      const estadoColor = isRealizada ? COLORS.green : isEspecial ? COLORS.amber : [220, 50, 50];

      // Monto: produccion total = efectivoReal + cajaComunMonto
      const produccion = (trip.efectivoReal || 0) + (trip.cajaComunMonto || 0);
      const monto = isRealizada
        ? (produccion > 0 ? formatMoney(produccion) : '')
        : isEspecial
          ? (trip.income > 0 ? formatMoney(trip.income) : '')
          : '';

      // Detalle
      const detalle = isNoReal && trip.motivo
        ? labelMotivo(trip.motivo)
        : isEspecial && trip.notaEspecial
          ? trip.notaEspecial
          : '';

      const rowValues = [trip.hora, trip.nombre, estado, monto, detalle];
      const rowColors = [COLORS.dark, COLORS.dark, estadoColor, COLORS.dark, COLORS.dark];

      let tx = ml;
      rowValues.forEach((val, i) => {
        const a = colAlign[i];
        const xPos = a === 'right' ? tx + colW[i] - 2 : a === 'center' ? tx + colW[i] / 2 : tx + 2;
        addText(val || '', xPos, y + 0.5, {
          size: 7,
          color: i === 2 ? estadoColor : COLORS.dark,
          bold: i === 2,
          align: a,
        });
        tx += colW[i];
      });
      y += 7;
    });

    // Day subtotal
    const dayRealizadas = day.trips.filter(t => t.tipo === 'frecuencia');
    const dayIngresoReal = dayRealizadas.reduce((s, t) => s + (t.efectivoReal || 0) + (t.cajaComunMonto || 0), 0);
    const dayIngresoEsp = day.trips.filter(t => t.tipo === 'ingreso_especial').reduce((s, t) => s + (t.income || 0), 0);
    const dayTotal = dayIngresoReal + dayIngresoEsp;

    checkPage(8);
    addLine(ml, ml + 110, y - 1, COLORS.plata);
    addText(`Subtotal dia: ${dayRealizadas.length} realizadas`, ml + 2, y + 0.5, { size: 6.5, color: COLORS.dark });
    addText(formatMoney(dayTotal), w - mr - 2, y + 0.5, { size: 7, color: COLORS.primary, bold: true, align: 'right' });
    y += 8;
  });

  // ==================== GRAND TOTAL ====================
  checkPage(15);
  addLine(ml, w - mr, y - 2, COLORS.primary);
  y += 2;
  doc.setFillColor(...COLORS.primary);
  doc.rect(ml, y - 3, cw, 9, 'F');
  addText('TOTAL PRODUCCION', ml + 3, y + 1, { size: 7.5, color: COLORS.white, bold: true });
  addText(`${data.realizadas} frec.`, ml + 36, y + 1, { size: 6.5, color: COLORS.white });
  addText(`Ruta: ${formatMoney(totalEfectivo)}`, ml + 62, y + 1, { size: 6.5, color: COLORS.white });
  addText(`Oficina: ${formatMoney(totalCajaComun)}`, ml + 106, y + 1, { size: 6.5, color: COLORS.white });
  addText(formatMoney(data.totalIngresos), w - mr - 2, y + 1, { size: 8.5, color: COLORS.white, bold: true, align: 'right' });
  y += 13;

  // ==================== FOOTER ====================
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    const ph = doc.internal.pageSize.getHeight();
    addLine(ml, w - mr, ph - 12);
    addText('Reporte Operativo - Control de Transporte', ml + cw / 2, ph - 7, {
      size: 7, color: COLORS.plata, align: 'center',
    });
    addText(`Pagina ${p} de ${totalPages}`, w - mr, ph - 7, {
      size: 7, color: COLORS.plata, align: 'right',
    });
  }

  return doc.output('blob');
}
