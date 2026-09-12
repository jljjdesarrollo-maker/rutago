import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface RouteFinancialSummary {
  totalProduccionBruta: number;
  totalVueltas: number;
  totalBoletos: number;
  gastosRuta: {
    diesel: number;
    chofer: number;
    ayudante: number;
    peajesTerminales: number;
    planRenova: number;
    otrosRuta: number;
    totalGastosRuta: number;
  };
  entregaNetaCarretera: number; // Producción Bruta - Gastos Ruta
}

export interface OwnerExpenseCategoryBreakdown {
  id: string;
  name: string;
  icon: string;
  count: number;
  totalAmount: number;
  paidAmount: number;
  pendingBalance: number;
}

export interface OwnerIncomeStatementData {
  busId: string;
  monthStr: string; // ej: "2026-09"
  monthFormatted: string; // ej: "Septiembre 2026"
  routeData: RouteFinancialSummary;
  ownerExpenses: {
    categories: OwnerExpenseCategoryBreakdown[];
    totalGastosSocio: number;
    totalPagadoEfectivoTransf: number;
    totalDeudasTalleresPendientes: number;
  };
  // Resultados contables de la unidad
  margenOperativoCarretera: number; // entregaNetaCarretera
  utilidadNetaReal: number; // entregaNetaCarretera - totalGastosSocio
  margenUtilidadPorcentaje: number; // (utilidadNetaReal / totalProduccionBruta) * 100
}

/**
 * Genera el documento PDF formal de Estado de Resultados de la Unidad
 * con membrete institucional de Cooperativa Vilcabambaturis
 */
export function generateOwnerIncomeStatementPDF(data: OwnerIncomeStatementData) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  // --- CABECERA INSTITUCIONAL VILCABAMBATURIS ---
  doc.setFillColor(145, 45, 38); // #912D26 (Rojo Vinotinto Institucional)
  doc.rect(0, 0, pageWidth, 32, 'F');

  // Título
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text('COOPERATIVA DE TRANSPORTES VILCABAMBATURIS', pageWidth / 2, 12, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('ESTADO DE RESULTADOS INTEGRAL Y LIQUIDACIÓN NETA MENSUAL', pageWidth / 2, 19, { align: 'center' });

  doc.setFontSize(9);
  doc.text(`Unidad: ${data.busId}  |  Mes Contable: ${data.monthFormatted}  |  Emisión: ${new Date().toLocaleDateString('es-EC')}`, pageWidth / 2, 26, { align: 'center' });

  let currentY = 40;

  // --- SECCIÓN 1: RESUMEN EJECUTIVO (KPIs) ---
  doc.setTextColor(58, 58, 58);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('1. RESUMEN EJECUTIVO DE RESULTADOS DEL BUS', 14, currentY);
  currentY += 4;

  const kpiData = [
    [
      'Ingresos Brutos de Boletaje (Ruta)',
      `$${data.routeData.totalProduccionBruta.toFixed(2)}`,
      '100.0%',
    ],
    [
      '(-) Gastos de Ruta Pagados por Ayudante/Chofer (Diésel, sueldos, peajes)',
      `$${data.routeData.gastosRuta.totalGastosRuta.toFixed(2)}`,
      `${data.routeData.totalProduccionBruta > 0 ? ((data.routeData.gastosRuta.totalGastosRuta / data.routeData.totalProduccionBruta) * 100).toFixed(1) : 0}%`,
    ],
    [
      '(=) Entrega Operativa Neta de Carretera (Caja Líquida de Ruta)',
      `$${data.routeData.entregaNetaCarretera.toFixed(2)}`,
      `${data.routeData.totalProduccionBruta > 0 ? ((data.routeData.entregaNetaCarretera / data.routeData.totalProduccionBruta) * 100).toFixed(1) : 0}%`,
    ],
    [
      '(-) Gastos Directos del Socio Propietario (8 Categorías contabilizadas)',
      `$${data.ownerExpenses.totalGastosSocio.toFixed(2)}`,
      `${data.routeData.totalProduccionBruta > 0 ? ((data.ownerExpenses.totalGastosSocio / data.routeData.totalProduccionBruta) * 100).toFixed(1) : 0}%`,
    ],
    [
      '(=) UTILIDAD NETA REAL DISPONIBLE DEL SOCIO',
      `$${data.utilidadNetaReal.toFixed(2)}`,
      `${data.margenUtilidadPorcentaje.toFixed(1)}%`,
    ],
  ];

  autoTable(doc, {
    startY: currentY,
    head: [['Concepto Financiero', 'Monto (USD)', '% s/ Ingreso']],
    body: kpiData,
    theme: 'striped',
    headStyles: { fillColor: [145, 45, 38], textColor: 255, fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 9, textColor: [50, 50, 50] },
    columnStyles: {
      0: { cellWidth: 120 },
      1: { cellWidth: 35, halign: 'right', fontStyle: 'bold' },
      2: { cellWidth: 25, halign: 'right' },
    },
    didParseCell: (hookData) => {
      // Resaltar la fila de Utilidad Neta
      if (hookData.section === 'body' && hookData.row.index === 4) {
        hookData.cell.styles.fillColor = data.utilidadNetaReal >= 0 ? [236, 253, 245] : [255, 241, 242];
        hookData.cell.styles.textColor = data.utilidadNetaReal >= 0 ? [6, 95, 70] : [159, 18, 57];
        hookData.cell.styles.fontStyle = 'bold';
      }
    },
    margin: { left: 14, right: 14 },
  });

  currentY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? currentY + 45;
  currentY += 8;

  // --- SECCIÓN 2: DESGLOSE DE GASTOS DE RUTA (AYUDANTE / CHOFER) ---
  doc.setTextColor(58, 58, 58);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('2. GASTOS DE CARRETERA ASUMIDOS EN RUTA (AYUDANTE / CHOFER)', 14, currentY);
  currentY += 4;

  const rutaBody = [
    ['Combustible Diésel', `$${data.routeData.gastosRuta.diesel.toFixed(2)}`],
    ['Diario / Comisión de Chofer', `$${data.routeData.gastosRuta.chofer.toFixed(2)}`],
    ['Diario / Comisión de Ayudante', `$${data.routeData.gastosRuta.ayudante.toFixed(2)}`],
    ['Peajes, Terminales y Andenes', `$${data.routeData.gastosRuta.peajesTerminales.toFixed(2)}`],
    ['Fondo Plan Renova / Interno', `$${data.routeData.gastosRuta.planRenova.toFixed(2)}`],
    ['Otros Gastos Menores de Carretera', `$${data.routeData.gastosRuta.otrosRuta.toFixed(2)}`],
    ['TOTAL GASTOS DE RUTA', `$${data.routeData.gastosRuta.totalGastosRuta.toFixed(2)}`],
  ];

  autoTable(doc, {
    startY: currentY,
    head: [['Rubro de Ruta', 'Total Desembolsado']],
    body: rutaBody,
    theme: 'plain',
    headStyles: { fillColor: [80, 80, 80], textColor: 255, fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 8.5, cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: 140 },
      1: { cellWidth: 40, halign: 'right', fontStyle: 'bold' },
    },
    didParseCell: (hookData) => {
      if (hookData.section === 'body' && hookData.row.index === 6) {
        hookData.cell.styles.fontStyle = 'bold';
        hookData.cell.styles.fillColor = [240, 240, 240];
      }
    },
    margin: { left: 14, right: 14 },
  });

  currentY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? currentY + 45;
  currentY += 8;

  // --- SECCIÓN 3: GASTOS DIRECTOS DEL SOCIO (8 CATEGORÍAS) ---
  doc.setTextColor(58, 58, 58);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('3. GASTOS E INVERSIONES DEL SOCIO PROPIETARIO (8 CATEGORÍAS)', 14, currentY);
  currentY += 4;

  const categoriesBody = data.ownerExpenses.categories.map((c) => [
    `${c.name}`,
    c.count.toString(),
    `$${c.totalAmount.toFixed(2)}`,
    `$${c.paidAmount.toFixed(2)}`,
    `$${c.pendingBalance.toFixed(2)}`,
  ]);

  // Fila de Total
  categoriesBody.push([
    'TOTAL GASTOS DEL SOCIO',
    data.ownerExpenses.categories.reduce((s, c) => s + c.count, 0).toString(),
    `$${data.ownerExpenses.totalGastosSocio.toFixed(2)}`,
    `$${data.ownerExpenses.totalPagadoEfectivoTransf.toFixed(2)}`,
    `$${data.ownerExpenses.totalDeudasTalleresPendientes.toFixed(2)}`,
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [['Categoría', 'Cant.', 'Costo Total', 'Pagado', 'Saldo Deuda']],
    body: categoriesBody,
    theme: 'grid',
    headStyles: { fillColor: [145, 45, 38], textColor: 255, fontStyle: 'bold', fontSize: 8.5 },
    bodyStyles: { fontSize: 8, cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: 70 },
      1: { cellWidth: 18, halign: 'center' },
      2: { cellWidth: 32, halign: 'right' },
      3: { cellWidth: 30, halign: 'right' },
      4: { cellWidth: 30, halign: 'right', fontStyle: 'bold' },
    },
    didParseCell: (hookData) => {
      // Resaltar última fila de totales
      if (hookData.section === 'body' && hookData.row.index === categoriesBody.length - 1) {
        hookData.cell.styles.fontStyle = 'bold';
        hookData.cell.styles.fillColor = [245, 245, 245];
      }
    },
    margin: { left: 14, right: 14 },
  });

  currentY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? currentY + 50;
  currentY += 12;

  // Si se pasa de la página, saltar
  if (currentY > 260) {
    doc.addPage();
    currentY = 25;
  }

  // --- PIE Y FIRMAS DE RESPONSABILIDAD ---
  doc.setFontSize(8.5);
  doc.setTextColor(120, 120, 120);
  doc.text('* Este documento consolida la recaudación de ruta menos los egresos de viaje y los gastos contables del socio.', 14, currentY);
  currentY += 18;

  const colWidth = (pageWidth - 28) / 2;
  doc.setDrawColor(180, 180, 180);
  doc.line(20, currentY, 20 + colWidth - 10, currentY);
  doc.line(pageWidth / 2 + 10, currentY, pageWidth - 20, currentY);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(60, 60, 60);
  doc.text('SOCIO PROPIETARIO', 20 + (colWidth - 10) / 2, currentY + 5, { align: 'center' });
  doc.text('ADMINISTRACIÓN / AUDITORÍA', pageWidth / 2 + 10 + (colWidth - 10) / 2, currentY + 5, { align: 'center' });

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`Unidad ${data.busId}`, 20 + (colWidth - 10) / 2, currentY + 9, { align: 'center' });
  doc.text('Coo. Vilcabambaturis', pageWidth / 2 + 10 + (colWidth - 10) / 2, currentY + 9, { align: 'center' });

  // Descarga del documento
  doc.save(`Estado_Resultados_${data.busId}_${data.monthStr}.pdf`);
}
