import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { type SavedRecord } from '@/components/transport/types';

export function generateRecordPDF(record: SavedRecord) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  const formatDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  };

  // --- HEADER ---
  doc.setFillColor(6, 95, 70); // emerald-700
  doc.rect(0, 0, pageWidth, 32, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('LIQUIDACION DIARIA DE TRANSPORTE', pageWidth / 2, 14, { align: 'center' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Fecha: ${formatDate(record.date)}${record.km ? `  |  Kilometraje: ${record.km} km` : ''}`, pageWidth / 2, 24, { align: 'center' });

  // --- INFO ---
  let y = 40;
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(10);

  if (record.conductor || record.ayudanteNombre) {
    const infoData: string[][] = [];
    if (record.conductor) infoData.push(['Conductor', record.conductor]);
    if (record.ayudanteNombre) infoData.push(['Ayudante', record.ayudanteNombre]);
    autoTable(doc, {
      startY: y,
      head: [],
      body: infoData,
      theme: 'plain',
      styles: { fontSize: 10, cellPadding: 2 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 35, textColor: [100, 100, 100] } },
      margin: { left: 14, right: 14 },
    });
    y = (doc as unknown as Record<string, number>).lastAutoTable?.finalY ?? y + 15;
  }

  // --- FREQUENCIES TABLE ---
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('FRECUENCIAS DEL DIA', 14, y + 4);
  y += 8;

  const tripBody = record.trips.map((t, i) => [
    (i + 1).toString(),
    `${t.routeFrom} - ${t.routeTo}`,
    t.time || '-',
    `$${t.income.toFixed(2)}`,
    `$${t.boletos.toFixed(2)}`,
  ]);

  autoTable(doc, {
    startY: y,
    head: [['#', 'Ruta', 'Hora', 'Ingreso', 'Boletos (Caja)']],
    body: tripBody,
    theme: 'grid',
    headStyles: { fillColor: [6, 95, 70], textColor: 255, fontSize: 9, fontStyle: 'bold' },
    styles: { fontSize: 9, cellPadding: 2.5 },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 50 },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 28, halign: 'right' },
      4: { cellWidth: 28, halign: 'right' },
    },
    margin: { left: 14, right: 14 },
  });
  y = (doc as unknown as Record<string, number>).lastAutoTable?.finalY ?? y + 10;

  // --- EXPENSES TABLE ---
  y += 4;
  doc.setTextColor(200, 50, 50);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('GASTOS', 14, y + 4);
  y += 8;

  const expBody = record.expenses.map((e) => [
    e.description,
    `$${e.amount.toFixed(2)}`,
  ]);

  autoTable(doc, {
    startY: y,
    head: [['Descripcion', 'Monto']],
    body: expBody,
    theme: 'grid',
    headStyles: { fillColor: [200, 50, 50], textColor: 255, fontSize: 9, fontStyle: 'bold' },
    styles: { fontSize: 9, cellPadding: 2.5 },
    columnStyles: {
      0: { cellWidth: 100 },
      1: { cellWidth: 36, halign: 'right' },
    },
    margin: { left: 14, right: 14 },
  });
  y = (doc as unknown as Record<string, number>).lastAutoTable?.finalY ?? y + 10;

  // --- SUMMARY ---
  y += 6;
  doc.setFillColor(30, 30, 30);
  doc.roundedRect(14, y, pageWidth - 28, 62, 3, 3, 'F');

  doc.setTextColor(180, 180, 180);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('LIQUIDACION', pageWidth / 2, y + 8, { align: 'center' });

  const summaryItems = [
    ['Produccion', `$${record.production.toFixed(2)}`, [255, 255, 255]],
    ['Caja Comun (Boletos)', `$${record.cajaComun.toFixed(2)}`, [255, 255, 255]],
    ['Total Gastos', `$${record.totalGastos.toFixed(2)}`, [255, 120, 120]],
    ['Tickets', `$${record.tickets.toFixed(2)}`, [255, 255, 255]],
    ['Entrega Ayudante', `$${record.entregaAyudante.toFixed(2)}`, record.entregaAyudante >= 0 ? [110, 231, 160] : [255, 120, 120]],
    ['Entrega Compania', `$${record.entregaCompania.toFixed(2)}`, record.entregaCompania >= 0 ? [110, 231, 160] : [255, 120, 120]],
  ];

  let sy = y + 16;
  summaryItems.forEach(([label, value, color]) => {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(180, 180, 180);
    doc.text(label as string, 22, sy);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(color as [number, number, number]);
    doc.text(value as string, pageWidth - 22, sy, { align: 'right' });
    sy += 7;
  });

  doc.save(`liquidacion_${record.date}.pdf`);
}
