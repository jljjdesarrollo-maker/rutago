import { RouteFinancialSummary } from './generate-owner-income-pdf';
import { OwnerExpense } from '../types/expenses';

export interface MonthComparisonData {
  monthKey: string; // ej. "2026-08"
  monthName: string; // ej. "Agosto 2026"
  routeData: RouteFinancialSummary;
  totalGastosSocio: number;
  totalPagadoSocio: number;
  deudasPendientesSocio: number;
  utilidadNetaConsolidada: number;
  margenUtilidadPorcentaje: number;
  categoryExpenses: Record<string, number>;
}

export interface OwnerComparisonReportData {
  busId: string;
  monthA: MonthComparisonData;
  monthB: MonthComparisonData;
}

/**
 * Genera el reporte formal en PDF Comparativo Intermensual y Tendencias (Fase 4.3)
 */
export async function generateOwnerComparisonPDF(data: OwnerComparisonReportData): Promise<void> {
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
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('COOPERATIVA DE TRANSPORTES VILCABAMBATURIS CÍA. LTDA.', pageWidth / 2, 10, { align: 'center' });

  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.text('REPORTE COMPARATIVO INTERMENSUAL Y TENDENCIAS (FASE 4.3)', pageWidth / 2, 17, { align: 'center' });

  doc.setFontSize(8.5);
  doc.text(
    `Unidad: ${data.busId}  |  ${data.monthA.monthName} vs ${data.monthB.monthName}  |  Fecha: ${new Date().toLocaleDateString('es-EC')}`,
    pageWidth / 2,
    23,
    { align: 'center' }
  );

  let y = 35;

  // Helpers para cálculo de variación
  const getDiff = (valB: number, valA: number) => {
    const diff = valB - valA;
    const pct = valA > 0 ? ((diff / valA) * 100).toFixed(1) : (valB > 0 ? '+100' : '0.0');
    const sign = diff > 0 ? '+' : '';
    return { diff, text: `${sign}$${diff.toFixed(2)} (${sign}${pct}%)`, isPositive: diff >= 0 };
  };

  // --- RESUMEN DE UTILIDAD COMPARADA ---
  const utilDiff = getDiff(data.monthB.utilidadNetaConsolidada, data.monthA.utilidadNetaConsolidada);
  const prodDiff = getDiff(data.monthB.routeData.totalProduccionBruta, data.monthA.routeData.totalProduccionBruta);

  const kpiW = (contentWidth - 4) / 2;

  // Card 1: Comparativo Utilidad Neta Final
  doc.setFillColor(254, 242, 242);
  doc.setDrawColor(254, 202, 202);
  doc.roundedRect(margin, y, kpiW, 20, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...COLOR_PRIMARY);
  doc.text('UTILIDAD NETA FINAL DEL SOCIO', margin + kpiW / 2, y + 5.5, { align: 'center' });
  doc.setFontSize(10.5);
  doc.text(
    `$${data.monthA.utilidadNetaConsolidada.toFixed(2)} → $${data.monthB.utilidadNetaConsolidada.toFixed(2)}`,
    margin + kpiW / 2,
    y + 12,
    { align: 'center' }
  );
  doc.setFontSize(8);
  doc.setTextColor(utilDiff.isPositive ? 6 : 159, utilDiff.isPositive ? 95 : 18, utilDiff.isPositive ? 70 : 57);
  doc.text(`Variación: ${utilDiff.text}`, margin + kpiW / 2, y + 17, { align: 'center' });

  // Card 2: Comparativo Producción Bruta
  doc.setFillColor(...COLOR_BG_ROW);
  doc.setDrawColor(229, 231, 235);
  doc.roundedRect(margin + kpiW + 4, y, kpiW, 20, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...COLOR_DARK);
  doc.text('PRODUCCIÓN BRUTA TOTAL DE RUTA', margin + kpiW + 4 + kpiW / 2, y + 5.5, { align: 'center' });
  doc.setFontSize(10.5);
  doc.text(
    `$${data.monthA.routeData.totalProduccionBruta.toFixed(2)} → $${data.monthB.routeData.totalProduccionBruta.toFixed(2)}`,
    margin + kpiW + 4 + kpiW / 2,
    y + 12,
    { align: 'center' }
  );
  doc.setFontSize(8);
  doc.setTextColor(prodDiff.isPositive ? 6 : 159, prodDiff.isPositive ? 95 : 18, prodDiff.isPositive ? 70 : 57);
  doc.text(`Variación: ${prodDiff.text}`, margin + kpiW + 4 + kpiW / 2, y + 17, { align: 'center' });

  y += 26;

  // --- TABLA COMPARATIVA PRINCIPAL DE CUADRE ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...COLOR_PRIMARY);
  doc.text('CUADRO COMPARATIVO DE INDICADORES OPERATIVOS Y CONTABLES', margin, y);
  y += 4;

  // Cabecera Tabla
  doc.setFillColor(235, 235, 235);
  doc.rect(margin, y, contentWidth, 7, 'F');
  doc.setFontSize(7.5);
  doc.setTextColor(...COLOR_DARK);
  doc.text('CONCEPTO / INDICADOR', margin + 3, y + 4.8);
  doc.text(data.monthA.monthName.toUpperCase(), margin + 95, y + 4.8, { align: 'right' });
  doc.text(data.monthB.monthName.toUpperCase(), margin + 135, y + 4.8, { align: 'right' });
  doc.text('VARIACIÓN', margin + contentWidth - 3, y + 4.8, { align: 'right' });
  y += 7;

  const rows = [
    { label: '(+) Producción Bruta en Boletos', a: data.monthA.routeData.totalProduccionBruta, b: data.monthB.routeData.totalProduccionBruta, isTotal: false },
    { label: '    • Efectivo en Ruta', a: data.monthA.routeData.efectivoRuta, b: data.monthB.routeData.efectivoRuta, isTotal: false },
    { label: '    • Caja Común (Cooperativa)', a: data.monthA.routeData.cajaComun, b: data.monthB.routeData.cajaComun, isTotal: false },
    { label: '(-) Egresos Operativos de Ruta (Total)', a: data.monthA.routeData.totalEgresosRuta, b: data.monthB.routeData.totalEgresosRuta, isTotal: false },
    { label: '    • Combustible Diésel', a: data.monthA.routeData.gastosRutaDetalle.diesel, b: data.monthB.routeData.gastosRutaDetalle.diesel, isTotal: false },
    { label: '    • Gastos de Carretera / Ayudante / Turnos', a: data.monthA.routeData.gastosRutaDetalle.otrosGastosCarretera, b: data.monthB.routeData.gastosRutaDetalle.otrosGastosCarretera, isTotal: false },
    { label: '(=) Utilidad Entregada de Ruta (Saldo a Liquidar)', a: data.monthA.routeData.entregas.totalEntregado, b: data.monthB.routeData.entregas.totalEntregado, isTotal: true },
    { label: '    • Entrega Efectivo Ayudante', a: data.monthA.routeData.entregas.entregaAyudante, b: data.monthB.routeData.entregas.entregaAyudante, isTotal: false },
    { label: '    • Entrega / Retención Compañía', a: data.monthA.routeData.entregas.entregaCompania, b: data.monthB.routeData.entregas.entregaCompania, isTotal: false },
    { label: '(-) Gastos Registrados por el Socio (Egresos Bus)', a: data.monthA.totalGastosSocio, b: data.monthB.totalGastosSocio, isTotal: false },
    { label: '    • Deudas Pendientes / Crédito en Talleres', a: data.monthA.deudasPendientesSocio, b: data.monthB.deudasPendientesSocio, isTotal: false },
    { label: '(=) UTILIDAD NETA FINAL DEL SOCIO (BOLSILLO)', a: data.monthA.utilidadNetaConsolidada, b: data.monthB.utilidadNetaConsolidada, isTotal: true, isHighlight: true },
  ];

  rows.forEach((r, idx) => {
    if (r.isHighlight) {
      doc.setFillColor(254, 242, 242);
      doc.rect(margin, y, contentWidth, 7.5, 'F');
    } else if (idx % 2 === 1) {
      doc.setFillColor(...COLOR_BG_ROW);
      doc.rect(margin, y, contentWidth, 6.5, 'F');
    }

    const rowH = r.isHighlight ? 7.5 : 6.5;

    doc.setFont('helvetica', r.isTotal ? 'bold' : 'normal');
    doc.setFontSize(r.isHighlight ? 8 : 7.5);
    doc.setTextColor(r.isHighlight ? COLOR_PRIMARY[0] : COLOR_DARK[0], r.isHighlight ? COLOR_PRIMARY[1] : COLOR_DARK[1], r.isHighlight ? COLOR_PRIMARY[2] : COLOR_DARK[2]);

    doc.text(r.label, margin + 3, y + (r.isHighlight ? 5.2 : 4.5));
    doc.text(`$${r.a.toFixed(2)}`, margin + 95, y + (r.isHighlight ? 5.2 : 4.5), { align: 'right' });
    doc.text(`$${r.b.toFixed(2)}`, margin + 135, y + (r.isHighlight ? 5.2 : 4.5), { align: 'right' });

    const diff = getDiff(r.b, r.a);
    doc.setTextColor(diff.isPositive ? 6 : 159, diff.isPositive ? 95 : 18, diff.isPositive ? 70 : 57);
    doc.text(diff.text, margin + contentWidth - 3, y + (r.isHighlight ? 5.2 : 4.5), { align: 'right' });

    doc.setDrawColor(235, 235, 235);
    doc.setLineWidth(0.1);
    doc.line(margin, y + rowH, margin + contentWidth, y + rowH);

    y += rowH;
  });

  y += 6;

  // --- SECCIÓN: DESGLOSE DE GASTOS DEL SOCIO POR CATEGORÍA ---
  if (y > pageHeight - 65) {
    doc.addPage();
    y = 20;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...COLOR_PRIMARY);
  doc.text('COMPARATIVA DE GASTOS DEL SOCIO POR CATEGORÍA', margin, y);
  y += 4;

  doc.setFillColor(235, 235, 235);
  doc.rect(margin, y, contentWidth, 6.5, 'F');
  doc.setFontSize(7.5);
  doc.setTextColor(...COLOR_DARK);
  doc.text('RUBRO / CATEGORÍA', margin + 3, y + 4.5);
  doc.text(data.monthA.monthName.toUpperCase(), margin + 95, y + 4.5, { align: 'right' });
  doc.text(data.monthB.monthName.toUpperCase(), margin + 135, y + 4.5, { align: 'right' });
  doc.text('VARIACIÓN', margin + contentWidth - 3, y + 4.5, { align: 'right' });
  y += 6.5;

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

  categories.forEach((cat, idx) => {
    const valA = data.monthA.categoryExpenses[cat.id] || 0;
    const valB = data.monthB.categoryExpenses[cat.id] || 0;

    if (idx % 2 === 1) {
      doc.setFillColor(...COLOR_BG_ROW);
      doc.rect(margin, y, contentWidth, 6, 'F');
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...COLOR_DARK);
    doc.text(cat.label, margin + 3, y + 4.2);
    doc.text(`$${valA.toFixed(2)}`, margin + 95, y + 4.2, { align: 'right' });
    doc.text(`$${valB.toFixed(2)}`, margin + 135, y + 4.2, { align: 'right' });

    const diff = getDiff(valB, valA);
    doc.setTextColor(diff.diff > 0 ? 159 : (diff.diff < 0 ? 6 : 100), diff.diff > 0 ? 18 : (diff.diff < 0 ? 95 : 100), diff.diff > 0 ? 57 : (diff.diff < 0 ? 70 : 100));
    doc.text(diff.text, margin + contentWidth - 3, y + 4.2, { align: 'right' });

    doc.setDrawColor(235, 235, 235);
    doc.setLineWidth(0.1);
    doc.line(margin, y + 6, margin + contentWidth, y + 6);

    y += 6;
  });

  y += 8;

  // --- PIE DE PÁGINA Y FIRMAS ---
  if (y > pageHeight - 35) {
    doc.addPage();
    y = 20;
  }

  doc.setFillColor(249, 250, 251);
  doc.setDrawColor(229, 231, 235);
  doc.roundedRect(margin, y, contentWidth, 16, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...COLOR_PRIMARY);
  doc.text('CONCLUSIÓN Y DIAGNÓSTICO FINANCIERO', margin + 3, y + 4.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...COLOR_MUTED);

  const conclusionText = utilDiff.diff >= 0
    ? `En ${data.monthB.monthName} la utilidad neta final creció +$${utilDiff.diff.toFixed(2)} frente a ${data.monthA.monthName}, gracias al incremento operativo o contención de gastos.`
    : `En ${data.monthB.monthName} la utilidad neta final disminuyó -$${Math.abs(utilDiff.diff).toFixed(2)} frente a ${data.monthA.monthName}, debido a mayores gastos registrados o menor producción en ruta.`;

  doc.text(conclusionText, margin + 3, y + 8.5);
  doc.text('Auditoría generada automáticamente con el motor contable RutaGo.', margin + 3, y + 12.5);

  y += 22;

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

  doc.save(`Comparativo_Mensual_${data.busId}_${data.monthA.monthKey}_vs_${data.monthB.monthKey}.pdf`);
}
