/**
 * Generador de PDF de Reporte de Caja Comun (A4)
 * Paleta corporativa: Rojo Vinotinto #912D26, Gris Antracita #3A3A3A
 */

const COLORS = {
  primary: [145, 45, 38] as const,
  dark: [58, 58, 58] as const,
  purple: [107, 33, 168] as const,  // purple-700 for caja comun
  purpleLight: [243, 232, 255] as const,
  plata: [214, 214, 214] as const,
  white: [255, 255, 255] as const,
  lightGray: [245, 245, 245] as const,
};

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

interface CajaComunTripRow {
  date: string;
  vtCode: string;
  ayudanteNombre: string;
  time: string | null;
  routeFrom: string;
  routeTo: string;
  boletos: number;
  monto: number;
  hasDetail: boolean;
}

interface CajaComunDayGroup {
  date: string;
  vtCode: string;
  ayudanteNombre: string;
  rows: CajaComunTripRow[];
  totalBoletos: number;
  totalMonto: number;
}

interface CajaComunReportData {
  type: 'caja-comun';
  startDate: string;
  endDate: string;
  groups: CajaComunDayGroup[];
  totals: {
    boletos: number;
    monto: number;
    recordCount: number;
  };
}

export async function generateCajaComunPDF(data: CajaComunReportData): Promise<Blob> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  const W = 297; // A4 landscape width
  const H = 210; // A4 landscape height
  const M = 12;  // margin
  const cW = W - 2 * M; // content width

  let y = M;

  // ─── HEADER ───
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, W, 28, 'F');
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('REPORTE DE CAJA COMUN', M, 14);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Del ${formatDate(data.startDate)} al ${formatDate(data.endDate)}`, M, 21);
  doc.text(`${data.groups.length} registro(s) con caja comun`, M + 80, 21);

  y = 34;

  // ─── TABLE HEADER ───
  const cols = [35, 20, 35, 18, 50, 25, 30, 25];
  // Fecha, VT, Ayudante, Hora, Ruta, Boletos, Monto, Obs.
  const colHeaders = ['Fecha', 'VT', 'Ayudante', 'Hora', 'Ruta', 'Boletos', 'Monto', 'Obs.'];

  doc.setFillColor(...COLORS.dark);
  doc.rect(M, y, cW, 7, 'F');
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  let x = M + 2;
  for (let i = 0; i < colHeaders.length; i++) {
    doc.text(colHeaders[i], x, y + 5);
    x += cols[i];
  }
  y += 9;

  // ─── TABLE ROWS ───
  doc.setFont('helvetica', 'normal');

  for (let g = 0; g < data.groups.length; g++) {
    const group = data.groups[g];

    // Check if we need a new page (need at least 20mm for a group)
    if (y > H - 30) {
      doc.addPage();
      y = M;
      // Repeat header
      doc.setFillColor(...COLORS.dark);
      doc.rect(M, y, cW, 7, 'F');
      doc.setTextColor(...COLORS.white);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      x = M + 2;
      for (let i = 0; i < colHeaders.length; i++) {
        doc.text(colHeaders[i], x, y + 5);
        x += cols[i];
      }
      y += 9;
      doc.setFont('helvetica', 'normal');
    }

    for (let r = 0; r < group.rows.length; r++) {
      const row = group.rows[r];

      // Alternating row background
      if (r % 2 === 0) {
        doc.setFillColor(...COLORS.lightGray);
        doc.rect(M, y - 3, cW, 6, 'F');
      }

      doc.setTextColor(...COLORS.dark);
      doc.setFontSize(8);
      x = M + 2;

      // Fecha (only on first row of group)
      if (r === 0) doc.text(formatDate(group.date), x, y);
      x += cols[0];

      // VT (only on first row)
      if (r === 0) doc.text(group.vtCode, x, y);
      x += cols[1];

      // Ayudante (only on first row)
      if (r === 0) doc.text(group.ayudanteNombre.substring(0, 15), x, y);
      x += cols[2];

      // Hora
      doc.text(row.time || (row.hasDetail ? '' : '-'), x, y);
      x += cols[3];

      // Ruta
      if (row.hasDetail) {
        const ruta = `${row.routeFrom} -> ${row.routeTo}`;
        doc.text(ruta.substring(0, 28), x, y);
      } else {
        doc.setTextColor(150, 150, 150);
        doc.text('(total diario)', x, y);
      }
      x += cols[4];

      // Boletos
      doc.setTextColor(...COLORS.purple);
      doc.setFont('helvetica', 'bold');
      if (row.hasDetail && row.boletos > 0) {
        doc.text(String(row.boletos), x + cols[5] - 10, y, { align: 'right' });
      } else {
        doc.setTextColor(180, 180, 180);
        doc.text('-', x + cols[5] - 10, y, { align: 'right' });
      }
      x += cols[5];

      // Monto
      doc.setTextColor(...COLORS.dark);
      doc.setFont('helvetica', 'bold');
      doc.text(`$${row.monto.toFixed(2)}`, x + cols[6] - 10, y, { align: 'right' });
      x += cols[6];

      // Obs
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(150, 150, 150);
      doc.setFontSize(7);
      if (!row.hasDetail) doc.text('sin detalle', x, y);

      doc.setFontSize(8);
      y += 6;
    }

    // Subtotal row for this group
    doc.setFillColor(...COLORS.purpleLight);
    doc.rect(M, y - 3, cW, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.purple);
    x = M + 2 + cols[0] + cols[1] + cols[2] + cols[3] + cols[4];
    doc.text('Subtotal:', x, y);
    x += cols[5];
    if (group.totalBoletos > 0) {
      doc.text(`${group.totalBoletos}`, x + cols[5] - 10, y, { align: 'right' });
    }
    x += cols[5];
    doc.text(`$${group.totalMonto.toFixed(2)}`, x + cols[6] - 10, y, { align: 'right' });
    y += 10;
  }

  // ─── GRAND TOTAL ───
  if (y > H - 20) {
    doc.addPage();
    y = M;
  }

  y += 2;
  doc.setFillColor(...COLORS.primary);
  doc.rect(M, y - 3, cW, 10, 'F');
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  x = M + 2 + cols[0] + cols[1] + cols[2] + cols[3] + cols[4];
  doc.text('TOTAL GENERAL:', x, y + 3);
  x += cols[5];
  if (data.totals.boletos > 0) {
    doc.text(`${data.totals.boletos}`, x + cols[5] - 10, y + 3, { align: 'right' });
  }
  x += cols[5];
  doc.setFontSize(12);
  doc.text(`$${data.totals.monto.toFixed(2)}`, x + cols[6] - 10, y + 3, { align: 'right' });

  return doc.output('blob');
}
