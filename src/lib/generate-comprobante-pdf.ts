/**
 * Generador de PDF de comprobante de liquidación
 * Paleta corporativa: Rojo Vinotinto #912D26, Gris Antracita #3A3A3A, Plata #D6D6D6, White
 */

import type { SavedRecord } from '@/components/transport/types';

const COLORS = {
  primary: [145, 45, 38] as const,     // #912D26
  dark: [58, 58, 58] as const,         // #3A3A3A
  plata: [214, 214, 214] as const,     // #D6D6D6
  white: [255, 255, 255] as const,
  green: [74, 222, 128] as const,      // #4ADE80
  red: [248, 113, 113] as const,       // #F87171
};

function rgb(c: readonly number[]): string {
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

export async function generateComprobantePDF(record: SavedRecord): Promise<Blob> {
  // Dynamic import to avoid SSR issues
  const { jsPDF } = await import('jspdf');

  const doc = new jsPDF({ unit: 'mm', format: [80, 170] }); // Ticket-style narrow, taller for 2-line trips
  const w = 80;
  let y = 6;

  // Helper: add text
  const addText = (text: string, x: number, yy: number, opts: {
    size?: number;
    color?: readonly number[];
    bold?: boolean;
    align?: 'left' | 'center' | 'right';
  } = {}) => {
    const { size = 8, color = COLORS.dark, bold = false, align = 'left' } = opts;
    doc.setFontSize(size);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setTextColor(...color);
    const finalX = align === 'center' ? w / 2 : align === 'right' ? w - 6 : x;
    doc.text(text, finalX, yy, { align });
  };

  // ---- Header band ----
  const headerHeight = record.vtCode ? 28 : 22;
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, w, headerHeight, 'F');

  addText('LIQUIDACION', w / 2, y + 4, { size: 11, color: COLORS.white, bold: true, align: 'center' });
  addText('DEL DIA', w / 2, y + 10, { size: 11, color: COLORS.white, bold: true, align: 'center' });
  y += 16;
  addText(formatDate(record.date), w / 2, y, { size: 9, color: COLORS.white, align: 'center' });
  y += 5;
  if (record.vtCode) {
    addText(`VT: ${record.vtCode}`, w / 2, y, { size: 8, color: COLORS.plata, bold: true, align: 'center' });
    y += 5;
  }
  y += 2;

  // ---- Conductor / Ayudante ----
  if (record.conductor || record.ayudanteNombre) {
    doc.setFillColor(...COLORS.dark);
    doc.rect(0, y - 3, w, 12, 'F');
    if (record.conductor) {
      addText(`Cond: ${record.conductor}`, 4, y + 2, { size: 7, color: COLORS.white });
    }
    if (record.ayudanteNombre) {
      addText(`Ayud: ${record.ayudanteNombre}`, 4, y + 6, { size: 7, color: COLORS.white });
    }
    y += 14;
  }

  // ---- Frecuencias ----
  addText('FRECUENCIAS', 4, y, { size: 8, color: COLORS.primary, bold: true });
  y += 2;

  // Header line
  doc.setDrawColor(...COLORS.plata);
  doc.setLineWidth(0.3);
  doc.line(4, y, w - 4, y);
  y += 3;

  record.trips.forEach((trip, i) => {
    const odd = (i + 1) % 2 !== 0;

    // Row background for odd trips
    if (odd) {
      doc.setFillColor(245, 235, 234); // Light red tint for odd rows
      doc.rect(3, y - 1.5, w - 6, 8, 'F');
    }

    // Line 1: Number + Route (right-aligned for odd/visual parity)
    const badgeX = 4;
    addText(`${i + 1}`, badgeX, y, { size: 7, color: odd ? COLORS.primary : COLORS.dark, bold: true });
    const routeLabel = `${trip.routeFrom} - ${trip.routeTo}`;
    addText(routeLabel, badgeX + 5, y, { size: 7, color: odd ? COLORS.primary : COLORS.dark });
    y += 3.5;

    // Line 2: Produccion + Caja Comun (indented)
    addText(`Prod: S/ ${trip.income.toFixed(2)}`, badgeX + 5, y, { size: 6, color: COLORS.dark });
    addText(`Caja Com.: S/ ${trip.boletos.toFixed(2)}`, w - 6, y, { size: 6, color: COLORS.dark, align: 'right' });
    y += 5;
  });

  y += 1;
  doc.setDrawColor(...COLORS.plata);
  doc.line(4, y, w - 4, y);
  y += 3;

  // ---- Gastos ----
  addText('GASTOS', 4, y, { size: 8, color: COLORS.red, bold: true });
  y += 3;

  record.expenses.forEach((exp) => {
    addText(exp.description, 4, y, { size: 7, color: COLORS.dark });
    addText(`S/ ${exp.amount.toFixed(2)}`, w - 6, y, { size: 7, color: COLORS.dark, align: 'right' });
    y += 3.5;
  });

  y += 1;
  doc.setDrawColor(...COLORS.red);
  doc.setLineWidth(0.5);
  doc.line(4, y, w - 4, y);
  y += 3;

  addText('Total Gastos', 4, y, { size: 7, color: COLORS.red, bold: true });
  addText(`S/ ${record.totalGastos.toFixed(2)}`, w - 6, y, { size: 7, color: COLORS.red, bold: true, align: 'right' });
  y += 5;

  // ---- Resumen ----
  doc.setFillColor(...COLORS.dark);
  doc.rect(0, y - 2, w, 30, 'F');

  y += 2;
  const summaryItems: { label: string; value: string; color: readonly number[] }[] = [
    { label: 'Produccion', value: record.production.toFixed(2), color: COLORS.white },
    { label: 'Caja Comun', value: record.cajaComun.toFixed(2), color: COLORS.white },
  ];

  // Show sobrante only if non-zero
  if (record.sobrante !== undefined && record.sobrante !== 0) {
    summaryItems.push({ label: 'Sobrante', value: record.sobrante.toFixed(2), color: COLORS.green });
  }

  summaryItems.push(
    { label: 'Tickets', value: record.tickets.toFixed(2), color: COLORS.white },
    { label: 'Entrega Ayudante', value: record.entregaAyudante.toFixed(2), color: record.entregaAyudante >= 0 ? COLORS.green : COLORS.red },
    { label: 'Entrega Compania', value: record.entregaCompania.toFixed(2), color: record.entregaCompania >= 0 ? COLORS.green : COLORS.red },
  );

  summaryItems.forEach((item) => {
    doc.setTextColor(200, 200, 200);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(item.label, 4, y);
    doc.setTextColor(...item.color);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text(`S/ ${item.value}`, w - 6, y, { align: 'right' });
    y += 4;
  });

  y += 3;

  // ---- Footer ----
  addText('RutaGo', w / 2, y, { size: 6, color: COLORS.plata, align: 'center' });
  y += 3;
  addText(`Op: ${formatDate(record.date)}`, w / 2, y, { size: 5, color: COLORS.plata, align: 'center' });

  return doc.output('blob');
}
