/**
 * Generador de PDF de Reporte de Caja Comun (A4 landscape)
 * Paleta corporativa: Rojo Vinotinto #912D26, Gris Antracita #3A3A3A
 */

const COLORS = {
  primary: [145, 45, 38] as const,
  dark: [58, 58, 58] as const,
  purple: [107, 33, 168] as const,
  purpleLight: [243, 232, 255] as const,
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
  entregaCompania: number;
  tickets: number;
}

interface CajaComunReportData {
  type: 'caja-comun';
  startDate: string;
  endDate: string;
  groups: CajaComunDayGroup[];
  totals: {
    boletos: number;
    monto: number;
    entregaCompania: number;
    tickets: number;
    recordCount: number;
  };
}

export async function generateCajaComunPDF(data: CajaComunReportData): Promise<Blob> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  const W = 297;
  const H = 210;
  const M = 10;
  const cW = W - 2 * M;

  let y = M;

  // Column widths: Fecha, VT, Ayudante, Hora, Ruta, Boletos, C.Comun, Tickets, Entrega Cia., Obs.
  const cols = [28, 18, 30, 16, 48, 18, 28, 18, 28, 18];
  const colHeaders = ['Fecha', 'VT', 'Ayudante', 'Hora', 'Ruta', 'Boletos', 'C.Comun', 'Tickets', 'Entrega Cia.', 'Obs.'];

  // ─── HEADER ───
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, W, 26, 'F');
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text('REPORTE DE CAJA COMUN', M, 13);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Del ${formatDate(data.startDate)} al ${formatDate(data.endDate)}`, M, 20);
  doc.text(`${data.groups.length} registro(s)`, M + 75, 20);

  y = 31;

  // ─── TABLE HEADER ───
  doc.setFillColor(...COLORS.dark);
  doc.rect(M, y, cW, 7, 'F');
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  let x = M + 2;
  for (let i = 0; i < colHeaders.length; i++) {
    doc.text(colHeaders[i], x, y + 5);
    x += cols[i];
  }
  y += 9;

  // Helper: draw table header on new page
  const drawHeader = () => {
    doc.setFillColor(...COLORS.dark);
    doc.rect(M, y, cW, 7, 'F');
    doc.setTextColor(...COLORS.white);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    x = M + 2;
    for (let i = 0; i < colHeaders.length; i++) {
      doc.text(colHeaders[i], x, y + 5);
      x += cols[i];
    }
    y += 9;
  };

  // ─── TABLE ROWS ───
  doc.setFont('helvetica', 'normal');

  for (let g = 0; g < data.groups.length; g++) {
    const group = data.groups[g];
    const rowsInGroup = group.rows.length;
    const neededHeight = rowsInGroup * 6 + 18; // rows + subtotal + gap

    if (y + neededHeight > H - 10) {
      doc.addPage();
      y = M;
      drawHeader();
      doc.setFont('helvetica', 'normal');
    }

    for (let r = 0; r < group.rows.length; r++) {
      const row = group.rows[r];

      if (r % 2 === 0) {
        doc.setFillColor(...COLORS.lightGray);
        doc.rect(M, y - 3, cW, 6, 'F');
      }

      doc.setTextColor(...COLORS.dark);
      doc.setFontSize(7);
      x = M + 2;

      // Fecha (first row of group)
      if (r === 0) doc.text(formatDate(group.date), x, y);
      x += cols[0];

      // VT (first row)
      if (r === 0) doc.text(group.vtCode, x, y);
      x += cols[1];

      // Ayudante (first row)
      if (r === 0) doc.text(group.ayudanteNombre.substring(0, 14), x, y);
      x += cols[2];

      // Hora
      doc.text(row.time || (row.hasDetail ? '' : '-'), x, y);
      x += cols[3];

      // Ruta
      if (row.hasDetail) {
        doc.text(`${row.routeFrom} -> ${row.routeTo}`.substring(0, 26), x, y);
      } else {
        doc.setTextColor(150, 150, 150);
        doc.text('(total diario)', x, y);
      }
      x += cols[4];

      // Boletos
      doc.setTextColor(...COLORS.purple);
      doc.setFont('helvetica', 'bold');
      if (row.hasDetail && row.boletos > 0) {
        doc.text(String(row.boletos), x + cols[5] - 8, y, { align: 'right' });
      } else {
        doc.setTextColor(180, 180, 180);
        doc.text('-', x + cols[5] - 8, y, { align: 'right' });
      }
      x += cols[5];

      // C.Comun monto
      doc.setTextColor(...COLORS.dark);
      doc.text(`$${row.monto.toFixed(2)}`, x + cols[6] - 8, y, { align: 'right' });
      x += cols[6];

      // Tickets and Entrega Cia (only on first row of group, from DailyRecord)
      if (r === 0) {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...COLORS.dark);
        doc.text(`$${(group.tickets || 0).toFixed(2)}`, x + cols[7] - 8, y, { align: 'right' });
        x += cols[7];
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...COLORS.primary);
        doc.text(`$${(group.entregaCompania || 0).toFixed(2)}`, x + cols[8] - 8, y, { align: 'right' });
      }
      x += cols[8];

      // Obs
      if (!row.hasDetail) {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(150, 150, 150);
        doc.setFontSize(6);
        doc.text('sin detalle', x, y);
      }

      doc.setFontSize(7);
      y += 6;
    }

    // Subtotal row
    doc.setFillColor(...COLORS.purpleLight);
    doc.rect(M, y - 3, cW, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.purple);
    x = M + 2 + cols[0] + cols[1] + cols[2] + cols[3] + cols[4];
    doc.text('Subtotal:', x, y);
    x += cols[5];
    if (group.totalBoletos > 0) {
      doc.text(`${group.totalBoletos}`, x + cols[5] - 8, y, { align: 'right' });
    }
    x += cols[5];
    doc.text(`$${group.totalMonto.toFixed(2)}`, x + cols[6] - 8, y, { align: 'right' });
    y += 10;
  }

  // ─── GRAND TOTAL ───
  if (y > H - 22) {
    doc.addPage();
    y = M;
  }

  y += 2;
  doc.setFillColor(...COLORS.primary);
  doc.rect(M, y - 3, cW, 10, 'F');
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  x = M + 2 + cols[0] + cols[1] + cols[2] + cols[3] + cols[4];
  doc.text('TOTAL GENERAL:', x, y + 3);
  x += cols[5];
  if (data.totals.boletos > 0) {
    doc.text(`${data.totals.boletos}`, x + cols[5] - 8, y + 3, { align: 'right' });
  }
  x += cols[5];
  doc.setFontSize(11);
  doc.text(`$${data.totals.monto.toFixed(2)}`, x + cols[6] - 8, y + 3, { align: 'right' });
  x += cols[6] + cols[7];
  doc.setFontSize(11);
  doc.text(`$${(data.totals.entregaCompania || 0).toFixed(2)}`, x + cols[8] - 8, y + 3, { align: 'right' });

  return doc.output('blob');
}
