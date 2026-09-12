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
 * utilizando la API nativa de jsPDF (sin requerir dependencias externas adicionales como autotable),
 * asegurando 100% de compatibilidad tanto en Vite como en Next.js / Turbopack en Vercel.
 */
export async function generateOwnerIncomeStatementPDF(data: OwnerIncomeStatementData): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2; // 182mm

  // Colores Institucionales
  const COLOR_PRIMARY = [145, 45, 38] as const; // #912D26 (Rojo Vinotinto)
  const COLOR_DARK = [40, 40, 40] as const;
  const COLOR_MUTED = [100, 100, 100] as const;
  const COLOR_BG_ROW = [248, 248, 248] as const;
  const COLOR_EMERALD = [6, 95, 70] as const;
  const COLOR_ROSE = [159, 18, 57] as const;

  // --- CABECERA INSTITUCIONAL VILCABAMBATURIS ---
  doc.setFillColor(...COLOR_PRIMARY);
  doc.rect(0, 0, pageWidth, 30, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('COOPERATIVA DE TRANSPORTES VILCABAMBATURIS', pageWidth / 2, 11, { align: 'center' });

  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.text('ESTADO DE RESULTADOS INTEGRAL Y LIQUIDACIÓN NETA MENSUAL', pageWidth / 2, 18, { align: 'center' });

  doc.setFontSize(8.5);
  doc.text(
    `Unidad: ${data.busId}  |  Mes Contable: ${data.monthFormatted}  |  Fecha de Emisión: ${new Date().toLocaleDateString('es-EC')}`,
    pageWidth / 2,
    24,
    { align: 'center' }
  );

  let y = 38;

  // --- 1. RESUMEN EJECUTIVO (KPIs PRINCIPALES) ---
  doc.setTextColor(...COLOR_PRIMARY);
  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.text('1. RESUMEN EJECUTIVO DE RESULTADOS DEL BUS', margin, y);
  y += 5;

  // Cabecera de tabla de resumen
  doc.setFillColor(...COLOR_PRIMARY);
  doc.rect(margin, y, contentWidth, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text('Concepto Financiero', margin + 3, y + 4.8);
  doc.text('Monto USD', margin + contentWidth - 45, y + 4.8, { align: 'right' });
  doc.text('% s/ Ingreso', margin + contentWidth - 3, y + 4.8, { align: 'right' });
  y += 7;

  const pct = (val: number) =>
    data.routeData.totalProduccionBruta > 0
      ? `${((val / data.routeData.totalProduccionBruta) * 100).toFixed(1)}%`
      : '0.0%';

  const kpiRows = [
    {
      label: 'Ingresos Brutos de Boletaje (Ruta)',
      val: `+$${data.routeData.totalProduccionBruta.toFixed(2)}`,
      pct: '100.0%',
      isBold: true,
      color: COLOR_DARK,
    },
    {
      label: '(-) Gastos de Ruta Pagados por Ayudante/Chofer (Diésel, sueldos, peajes)',
      val: `-$${data.routeData.gastosRuta.totalGastosRuta.toFixed(2)}`,
      pct: pct(data.routeData.gastosRuta.totalGastosRuta),
      isBold: false,
      color: COLOR_DARK,
    },
    {
      label: '(=) Entrega Operativa Neta de Carretera (Caja Líquida)',
      val: `$${data.routeData.entregaNetaCarretera.toFixed(2)}`,
      pct: pct(data.routeData.entregaNetaCarretera),
      isBold: true,
      color: COLOR_DARK,
    },
    {
      label: '(-) Gastos Directos del Socio Propietario (8 Categorías)',
      val: `-$${data.ownerExpenses.totalGastosSocio.toFixed(2)}`,
      pct: pct(data.ownerExpenses.totalGastosSocio),
      isBold: false,
      color: COLOR_DARK,
    },
    {
      label: '(=) UTILIDAD NETA REAL DISPONIBLE DEL SOCIO',
      val: `$${data.utilidadNetaReal.toFixed(2)}`,
      pct: `${data.margenUtilidadPorcentaje.toFixed(1)}%`,
      isBold: true,
      color: data.utilidadNetaReal >= 0 ? COLOR_EMERALD : COLOR_ROSE,
      highlight: true,
    },
  ];

  kpiRows.forEach((row, i) => {
    if (row.highlight) {
      doc.setFillColor(data.utilidadNetaReal >= 0 ? 236 : 255, data.utilidadNetaReal >= 0 ? 253 : 241, data.utilidadNetaReal >= 0 ? 245 : 242);
      doc.rect(margin, y, contentWidth, 7, 'F');
    } else if (i % 2 === 1) {
      doc.setFillColor(...COLOR_BG_ROW);
      doc.rect(margin, y, contentWidth, 6.5, 'F');
    }

    doc.setFont('helvetica', row.isBold ? 'bold' : 'normal');
    doc.setFontSize(row.highlight ? 9 : 8);
    doc.setTextColor(...row.color);
    doc.text(row.label, margin + 3, y + (row.highlight ? 4.8 : 4.5));
    doc.text(row.val, margin + contentWidth - 45, y + (row.highlight ? 4.8 : 4.5), { align: 'right' });
    doc.text(row.pct, margin + contentWidth - 3, y + (row.highlight ? 4.8 : 4.5), { align: 'right' });

    doc.setDrawColor(230, 230, 230);
    doc.setLineWidth(0.2);
    doc.line(margin, y + (row.highlight ? 7 : 6.5), margin + contentWidth, y + (row.highlight ? 7 : 6.5));
    y += row.highlight ? 7 : 6.5;
  });

  y += 7;

  // --- 2. GASTOS DE CARRETERA ASUMIDOS EN RUTA ---
  doc.setTextColor(...COLOR_PRIMARY);
  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.text('2. GASTOS DE RUTA PAGADOS POR AYUDANTE / CHOFER', margin, y);
  y += 5;

  doc.setFillColor(70, 70, 70);
  doc.rect(margin, y, contentWidth, 6.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('Rubro de Carretera', margin + 3, y + 4.5);
  doc.text('Total Desembolsado (USD)', margin + contentWidth - 3, y + 4.5, { align: 'right' });
  y += 6.5;

  const rutaRows = [
    { name: 'Combustible Diésel', amount: data.routeData.gastosRuta.diesel },
    { name: 'Diario / Comisión de Chofer', amount: data.routeData.gastosRuta.chofer },
    { name: 'Diario / Comisión de Ayudante', amount: data.routeData.gastosRuta.ayudante },
    { name: 'Peajes, Terminales y Andenes', amount: data.routeData.gastosRuta.peajesTerminales },
    { name: 'Fondo Plan Renova / Interno', amount: data.routeData.gastosRuta.planRenova },
    { name: 'Otros Gastos Menores de Carretera', amount: data.routeData.gastosRuta.otrosRuta },
  ];

  rutaRows.forEach((r, i) => {
    if (i % 2 === 1) {
      doc.setFillColor(...COLOR_BG_ROW);
      doc.rect(margin, y, contentWidth, 5.5, 'F');
    }
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...COLOR_DARK);
    doc.text(r.name, margin + 3, y + 3.8);
    doc.text(`$${r.amount.toFixed(2)}`, margin + contentWidth - 3, y + 3.8, { align: 'right' });
    y += 5.5;
  });

  // Fila Total Gastos Ruta
  doc.setFillColor(235, 235, 235);
  doc.rect(margin, y, contentWidth, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLOR_DARK);
  doc.text('TOTAL GASTOS DE RUTA', margin + 3, y + 4.2);
  doc.text(`$${data.routeData.gastosRuta.totalGastosRuta.toFixed(2)}`, margin + contentWidth - 3, y + 4.2, { align: 'right' });
  y += 11;

  // --- 3. GASTOS DIRECTOS DEL SOCIO (8 CATEGORÍAS) ---
  doc.setTextColor(...COLOR_PRIMARY);
  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.text('3. GASTOS E INVERSIONES DEL SOCIO PROPIETARIO (8 CATEGORÍAS)', margin, y);
  y += 5;

  doc.setFillColor(...COLOR_PRIMARY);
  doc.rect(margin, y, contentWidth, 6.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('Categoría', margin + 3, y + 4.5);
  doc.text('Cant.', margin + 75, y + 4.5, { align: 'center' });
  doc.text('Costo Total', margin + 115, y + 4.5, { align: 'right' });
  doc.text('Pagado', margin + 148, y + 4.5, { align: 'right' });
  doc.text('Saldo Deuda', margin + contentWidth - 3, y + 4.5, { align: 'right' });
  y += 6.5;

  data.ownerExpenses.categories.forEach((cat, i) => {
    if (i % 2 === 1) {
      doc.setFillColor(...COLOR_BG_ROW);
      doc.rect(margin, y, contentWidth, 5.5, 'F');
    }
    doc.setFont('helvetica', cat.count > 0 ? 'bold' : 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...(cat.count > 0 ? COLOR_DARK : COLOR_MUTED));
    doc.text(cat.name, margin + 3, y + 3.8);
    doc.text(cat.count.toString(), margin + 75, y + 3.8, { align: 'center' });
    doc.text(`$${cat.totalAmount.toFixed(2)}`, margin + 115, y + 3.8, { align: 'right' });
    doc.text(`$${cat.paidAmount.toFixed(2)}`, margin + 148, y + 3.8, { align: 'right' });

    if (cat.pendingBalance > 0) {
      doc.setTextColor(...COLOR_ROSE);
      doc.setFont('helvetica', 'bold');
    }
    doc.text(`$${cat.pendingBalance.toFixed(2)}`, margin + contentWidth - 3, y + 3.8, { align: 'right' });

    doc.setDrawColor(235, 235, 235);
    doc.setLineWidth(0.2);
    doc.line(margin, y + 5.5, margin + contentWidth, y + 5.5);
    y += 5.5;
  });

  // Fila Total Gastos Socio
  doc.setFillColor(235, 235, 235);
  doc.rect(margin, y, contentWidth, 6.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...COLOR_DARK);
  doc.text('TOTAL GASTOS DEL SOCIO', margin + 3, y + 4.5);
  doc.text(
    data.ownerExpenses.categories.reduce((s, c) => s + c.count, 0).toString(),
    margin + 75,
    y + 4.5,
    { align: 'center' }
  );
  doc.text(`$${data.ownerExpenses.totalGastosSocio.toFixed(2)}`, margin + 115, y + 4.5, { align: 'right' });
  doc.text(`$${data.ownerExpenses.totalPagadoEfectivoTransf.toFixed(2)}`, margin + 148, y + 4.5, { align: 'right' });
  doc.setTextColor(...(data.ownerExpenses.totalDeudasTalleresPendientes > 0 ? COLOR_ROSE : COLOR_DARK));
  doc.text(`$${data.ownerExpenses.totalDeudasTalleresPendientes.toFixed(2)}`, margin + contentWidth - 3, y + 4.5, { align: 'right' });
  y += 14;

  // --- PIE Y FIRMAS DE RESPONSABILIDAD ---
  if (y > pageHeight - 35) {
    doc.addPage();
    y = 25;
  }

  doc.setFontSize(7.5);
  doc.setTextColor(...COLOR_MUTED);
  doc.setFont('helvetica', 'normal');
  doc.text(
    '* Reporte emitido bajo el principio de una unidad por socio. Consolida ingresos de boletaje, deducciones de ruta y gastos patrimoniales.',
    margin,
    y
  );
  y += 16;

  const halfWidth = contentWidth / 2;
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.4);
  doc.line(margin + 10, y, margin + halfWidth - 10, y);
  doc.line(margin + halfWidth + 10, y, margin + contentWidth - 10, y);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLOR_DARK);
  doc.text('SOCIO PROPIETARIO', margin + halfWidth / 2, y + 4.5, { align: 'center' });
  doc.text('ADMINISTRACIÓN / AUDITORÍA', margin + halfWidth + halfWidth / 2, y + 4.5, { align: 'center' });

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLOR_MUTED);
  doc.text(`Unidad ${data.busId}`, margin + halfWidth / 2, y + 8.5, { align: 'center' });
  doc.text('Coo. Vilcabambaturis', margin + halfWidth + halfWidth / 2, y + 8.5, { align: 'center' });

  // Guardar archivo
  doc.save(`Estado_Resultados_${data.busId}_${data.monthStr}.pdf`);
}
