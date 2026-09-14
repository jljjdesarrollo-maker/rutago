import { OwnerExpense, OWNER_EXPENSE_CATEGORIES } from '../types/expenses';

export interface MonthAnnualRow {
  monthNumber: number;
  monthName: string;
  produccionRuta: number;
  egresosRuta: number;
  entregadoRuta: number;
  gastosSocio: number;
  utilidadNeta: number;
  margenPct: number;
  hasActivity: boolean;
}

export interface OwnerAnnualReportData {
  busId: string;
  year: number;
  months: MonthAnnualRow[];
  totalProduccionRuta: number;
  totalEgresosRuta: number;
  totalEntregadoRuta: number;
  totalGastosSocio: number;
  totalUtilidadNeta: number;
  margenPromedioPct: number;
  promedioUtilidadMensual: number;
  bestMonth: string;
  highestExpenseMonth: string;
  categoryTotals: Record<string, number>;
}

/**
 * Genera el reporte formal en PDF de Liquidación y Rendimiento Anual Acumulado (Fase 4.4)
 */
export async function generateOwnerAnnualPDF(data: OwnerAnnualReportData): Promise<void> {
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
  const COLOR_AMBER = [180, 83, 9] as const;

  // --- CABECERA INSTITUCIONAL VILCABAMBATURIS ---
  doc.setFillColor(...COLOR_PRIMARY);
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('COOPERATIVA DE TRANSPORTES VILCABAMBATURIS CÍA. LTDA.', pageWidth / 2, 10, { align: 'center' });

  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.text('LIQUIDACIÓN Y RENDIMIENTO ANUAL ACUMULADO (FASE 4.4)', pageWidth / 2, 17, { align: 'center' });

  doc.setFontSize(8.5);
  doc.text(
    `Unidad: ${data.busId}  |  Año Fiscal: ${data.year}  |  Fecha de Emisión: ${new Date().toLocaleDateString('es-EC')}`,
    pageWidth / 2,
    23,
    { align: 'center' }
  );

  let y = 34;

  // --- TARJETAS RESUMEN ANUAL ---
  const kpiW = (contentWidth - 6) / 3;

  // KPI 1: Utilidad Neta Anual
  doc.setFillColor(254, 242, 242);
  doc.setDrawColor(254, 202, 202);
  doc.roundedRect(margin, y, kpiW, 20, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...COLOR_PRIMARY);
  doc.text('UTILIDAD NETA ANUAL (BOLSILLO)', margin + kpiW / 2, y + 5.5, { align: 'center' });
  doc.setFontSize(11);
  doc.text(`$${data.totalUtilidadNeta.toFixed(2)}`, margin + kpiW / 2, y + 12.5, { align: 'center' });
  doc.setFontSize(7.5);
  doc.setTextColor(...COLOR_EMERALD);
  doc.text(`Promedio: $${data.promedioUtilidadMensual.toFixed(2)}/mes`, margin + kpiW / 2, y + 17, { align: 'center' });

  // KPI 2: Total Entregado de Ruta
  doc.setFillColor(...COLOR_BG_ROW);
  doc.setDrawColor(229, 231, 235);
  doc.roundedRect(margin + kpiW + 3, y, kpiW, 20, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...COLOR_DARK);
  doc.text('TOTAL ENTREGADO DE RUTA', margin + kpiW + 3 + kpiW / 2, y + 5.5, { align: 'center' });
  doc.setFontSize(11);
  doc.text(`$${data.totalEntregadoRuta.toFixed(2)}`, margin + kpiW + 3 + kpiW / 2, y + 12.5, { align: 'center' });
  doc.setFontSize(7.5);
  doc.setTextColor(...COLOR_MUTED);
  doc.text(`Producción: $${data.totalProduccionRuta.toFixed(2)}`, margin + kpiW + 3 + kpiW / 2, y + 17, { align: 'center' });

  // KPI 3: Gastos Totales del Socio
  doc.setFillColor(...COLOR_BG_ROW);
  doc.setDrawColor(229, 231, 235);
  doc.roundedRect(margin + (kpiW + 3) * 2, y, kpiW, 20, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...COLOR_DARK);
  doc.text('GASTOS TOTALES DEL SOCIO', margin + (kpiW + 3) * 2 + kpiW / 2, y + 5.5, { align: 'center' });
  doc.setFontSize(11);
  doc.text(`$${data.totalGastosSocio.toFixed(2)}`, margin + (kpiW + 3) * 2 + kpiW / 2, y + 12.5, { align: 'center' });
  doc.setFontSize(7.5);
  doc.setTextColor(...COLOR_AMBER);
  doc.text(`Margen Neto: ${data.margenPromedioPct.toFixed(1)}%`, margin + (kpiW + 3) * 2 + kpiW / 2, y + 17, { align: 'center' });

  y += 26;

  // --- TABLA MENSUALIZADA (12 MESES) ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...COLOR_PRIMARY);
  doc.text(`CONSOLIDADO MENSUALIZADO DE OPERACIONES (${data.year})`, margin, y);
  y += 4;

  // Cabecera Tabla
  doc.setFillColor(235, 235, 235);
  doc.rect(margin, y, contentWidth, 7, 'F');
  doc.setFontSize(7);
  doc.setTextColor(...COLOR_DARK);
  doc.text('MES', margin + 3, y + 4.8);
  doc.text('PROD. RUTA', margin + 50, y + 4.8, { align: 'right' });
  doc.text('EGRESOS RUTA', margin + 82, y + 4.8, { align: 'right' });
  doc.text('ENTREGADO', margin + 115, y + 4.8, { align: 'right' });
  doc.text('GASTOS SOCIO', margin + 148, y + 4.8, { align: 'right' });
  doc.text('UTILIDAD NETA', margin + contentWidth - 3, y + 4.8, { align: 'right' });
  y += 7;

  data.months.forEach((m, idx) => {
    if (idx % 2 === 1) {
      doc.setFillColor(...COLOR_BG_ROW);
      doc.rect(margin, y, contentWidth, 6, 'F');
    }

    doc.setFont('helvetica', m.hasActivity ? 'bold' : 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...COLOR_DARK);

    doc.text(m.monthName, margin + 3, y + 4.2);
    doc.text(`$${m.produccionRuta.toFixed(2)}`, margin + 50, y + 4.2, { align: 'right' });
    doc.text(`$${m.egresosRuta.toFixed(2)}`, margin + 82, y + 4.2, { align: 'right' });
    doc.text(`$${m.entregadoRuta.toFixed(2)}`, margin + 115, y + 4.2, { align: 'right' });
    doc.text(`$${m.gastosSocio.toFixed(2)}`, margin + 148, y + 4.2, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(m.utilidadNeta >= 0 ? COLOR_EMERALD[0] : 159, m.utilidadNeta >= 0 ? COLOR_EMERALD[1] : 18, m.utilidadNeta >= 0 ? COLOR_EMERALD[2] : 57);
    doc.text(`$${m.utilidadNeta.toFixed(2)}`, margin + contentWidth - 3, y + 4.2, { align: 'right' });

    doc.setDrawColor(235, 235, 235);
    doc.setLineWidth(0.1);
    doc.line(margin, y + 6, margin + contentWidth, y + 6);

    y += 6;
  });

  // FILA TOTALES ANUALES
  doc.setFillColor(243, 244, 246);
  doc.rect(margin, y, contentWidth, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...COLOR_PRIMARY);
  doc.text('TOTALES ANUALES', margin + 3, y + 4.8);
  doc.text(`$${data.totalProduccionRuta.toFixed(2)}`, margin + 50, y + 4.8, { align: 'right' });
  doc.text(`$${data.totalEgresosRuta.toFixed(2)}`, margin + 82, y + 4.8, { align: 'right' });
  doc.text(`$${data.totalEntregadoRuta.toFixed(2)}`, margin + 115, y + 4.8, { align: 'right' });
  doc.text(`$${data.totalGastosSocio.toFixed(2)}`, margin + 148, y + 4.8, { align: 'right' });
  doc.text(`$${data.totalUtilidadNeta.toFixed(2)}`, margin + contentWidth - 3, y + 4.8, { align: 'right' });

  y += 11;

  // --- RESUMEN DE GASTOS ANUALES POR CATEGORÍA ---
  if (y > pageHeight - 75) {
    doc.addPage();
    y = 20;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...COLOR_PRIMARY);
  doc.text('DISTRIBUCIÓN ANUAL DE GASTOS DEL SOCIO POR RUBRO', margin, y);
  y += 4;

  const categories = [
    { id: 'LLANTAS', label: '🛞 Llantas y Tramado' },
    { id: 'ACEITES_FILTROS', label: '🛢️ Aceites y Filtros' },
    { id: 'MOTOR_CAJA_CORONA', label: '⚙️ Motor, Caja y Corona' },
    { id: 'FRENOS_RODAJE', label: '🛑 Frenos y Rodaje' },
    { id: 'ELECTRICO', label: '⚡ Eléctrico y A/C' },
    { id: 'PAGOS_COMPANIA', label: '🏢 Pagos Compañía y Cuotas' },
    { id: 'TRAMITES_PERMISOS', label: '📄 Trámites y Permisos' },
    { id: 'OTROS', label: '📦 Otros Gastos Menores' },
  ];

  // Grid 2 columnas para categorías
  const colW = (contentWidth - 6) / 2;
  categories.forEach((cat, idx) => {
    const val = data.categoryTotals[cat.id] || 0;
    const pct = data.totalGastosSocio > 0 ? ((val / data.totalGastosSocio) * 100).toFixed(1) : '0.0';
    const colIdx = idx % 2;
    const rowIdx = Math.floor(idx / 2);
    const itemX = margin + colIdx * (colW + 6);
    const itemY = y + rowIdx * 8;

    doc.setFillColor(...COLOR_BG_ROW);
    doc.setDrawColor(230, 230, 230);
    doc.roundedRect(itemX, itemY, colW, 7, 1, 1, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...COLOR_DARK);
    doc.text(cat.label, itemX + 2.5, itemY + 4.5);

    doc.setFont('helvetica', 'bold');
    doc.text(`$${val.toFixed(2)} (${pct}%)`, itemX + colW - 2.5, itemY + 4.5, { align: 'right' });
  });

  y += Math.ceil(categories.length / 2) * 8 + 6;

  // --- HIGHLIGHTS Y OBSERVACIONES ---
  if (y > pageHeight - 45) {
    doc.addPage();
    y = 20;
  }

  doc.setFillColor(249, 250, 251);
  doc.setDrawColor(229, 231, 235);
  doc.roundedRect(margin, y, contentWidth, 18, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...COLOR_PRIMARY);
  doc.text('OBSERVACIONES DE CIERRE DE EJERCICIO ANUAL', margin + 3, y + 4.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...COLOR_MUTED);
  doc.text(
    `• Mes de mayor rentabilidad: ${data.bestMonth || 'N/A'}.`,
    margin + 3,
    y + 8.5
  );
  doc.text(
    `• Mes con mayor inversión de mantenimiento/gastos: ${data.highestExpenseMonth || 'N/A'}.`,
    margin + 3,
    y + 12.5
  );
  doc.text(
    `• Margen promedio sobre producción de ruta: ${data.margenPromedioPct.toFixed(1)}%. Liquidación oficial para fines contables y tributarios.`,
    margin + 3,
    y + 16
  );

  y += 24;

  // FIRMA
  const sigW = 60;
  doc.setDrawColor(150, 150, 150);
  doc.line(margin + contentWidth / 2 - sigW / 2, y + 6, margin + contentWidth / 2 + sigW / 2, y + 6);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLOR_DARK);
  doc.text('SOCIO PROPIETARIO', margin + contentWidth / 2, y + 10, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...COLOR_MUTED);
  doc.text(`Unidad ${data.busId} - Coo. Vilcabambaturis`, margin + contentWidth / 2, y + 14, { align: 'center' });

  doc.save(`Liquidacion_Anual_${data.busId}_${data.year}.pdf`);
}
