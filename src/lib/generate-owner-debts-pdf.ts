import { OwnerExpense } from '../types/expenses';

export interface OwnerDebtsReportData {
  busId: string;
  totalDeudaPendiente: number;
  totalCreditoOriginal: number;
  totalAbonado: number;
  activeCreditorsCount: number;
  debtsList: OwnerExpense[];
}

/**
 * Genera el reporte formal en PDF de Cuentas por Pagar y Deudas con Talleres (Fase 4.2)
 */
export async function generateOwnerDebtsPDF(data: OwnerDebtsReportData): Promise<void> {
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
  const COLOR_AMBER = [180, 83, 9] as const;
  const COLOR_EMERALD = [6, 95, 70] as const;

  // --- CABECERA INSTITUCIONAL VILCABAMBATURIS ---
  doc.setFillColor(...COLOR_PRIMARY);
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('COOPERATIVA DE TRANSPORTES VILCABAMBATURIS CÍA. LTDA.', pageWidth / 2, 10, { align: 'center' });

  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.text('REPORTE EJECUTIVO DE CUENTAS POR PAGAR Y DEUDAS CON TALLERES (FASE 4.2)', pageWidth / 2, 17, { align: 'center' });

  doc.setFontSize(8.5);
  doc.text(
    `Unidad: ${data.busId}  |  Fecha de Corte: ${new Date().toLocaleDateString('es-EC')}  |  Acreedores Activos: ${data.activeCreditorsCount}`,
    pageWidth / 2,
    23,
    { align: 'center' }
  );

  let y = 35;

  // --- 3 TARJETAS KPI RESUMEN DE CARTERA ---
  const kpiW = (contentWidth - 6) / 3;

  // Card 1: Saldo Pendiente Total
  doc.setFillColor(254, 242, 242);
  doc.setDrawColor(254, 202, 202);
  doc.roundedRect(margin, y, kpiW, 18, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...COLOR_PRIMARY);
  doc.text('DEUDA PENDIENTE TOTAL', margin + kpiW / 2, y + 5.5, { align: 'center' });
  doc.setFontSize(12);
  doc.text(`$${data.totalDeudaPendiente.toFixed(2)}`, margin + kpiW / 2, y + 12.5, { align: 'center' });

  // Card 2: Total Crédito Original
  doc.setFillColor(...COLOR_BG_ROW);
  doc.setDrawColor(229, 231, 235);
  doc.roundedRect(margin + kpiW + 3, y, kpiW, 18, 2, 2, 'FD');
  doc.setFontSize(7.5);
  doc.setTextColor(...COLOR_DARK);
  doc.text('MONTO TOTAL CONTRATADO', margin + kpiW + 3 + kpiW / 2, y + 5.5, { align: 'center' });
  doc.setFontSize(12);
  doc.text(`$${data.totalCreditoOriginal.toFixed(2)}`, margin + kpiW + 3 + kpiW / 2, y + 12.5, { align: 'center' });

  // Card 3: Total Pagado / Abonado
  doc.setFillColor(236, 253, 245);
  doc.setDrawColor(167, 243, 208);
  doc.roundedRect(margin + (kpiW + 3) * 2, y, kpiW, 18, 2, 2, 'FD');
  doc.setFontSize(7.5);
  doc.setTextColor(...COLOR_EMERALD);
  doc.text('TOTAL AMORTIZADO / ABONOS', margin + (kpiW + 3) * 2 + kpiW / 2, y + 5.5, { align: 'center' });
  doc.setFontSize(12);
  doc.text(`$${data.totalAbonado.toFixed(2)}`, margin + (kpiW + 3) * 2 + kpiW / 2, y + 12.5, { align: 'center' });

  y += 24;

  // --- TABLA DE CRÉDITOS Y CUENTAS POR PAGAR ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...COLOR_PRIMARY);
  doc.text('DETALLE DE CRÉDITOS Y OBLIGACIONES PENDIENTES', margin, y);
  y += 4;

  // Cabecera de Tabla
  doc.setFillColor(235, 235, 235);
  doc.rect(margin, y, contentWidth, 7, 'F');
  doc.setFontSize(7.5);
  doc.setTextColor(...COLOR_DARK);
  doc.text('FECHA', margin + 3, y + 4.8);
  doc.text('TALLER / PROVEEDOR', margin + 24, y + 4.8);
  doc.text('DESCRIPCIÓN', margin + 65, y + 4.8);
  doc.text('TOTAL', margin + 125, y + 4.8, { align: 'right' });
  doc.text('ABONADO', margin + 152, y + 4.8, { align: 'right' });
  doc.text('SALDO', margin + contentWidth - 3, y + 4.8, { align: 'right' });
  y += 7;

  if (data.debtsList.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...COLOR_MUTED);
    doc.text('No existen cuentas pendientes con talleres ni proveedores registrados para este vehículo.', margin + 3, y + 6);
    y += 12;
  } else {
    data.debtsList.forEach((debt, index) => {
      // Salto de página si se desborda
      if (y > pageHeight - 35) {
        doc.addPage();
        y = 20;
      }

      if (index % 2 === 1) {
        doc.setFillColor(...COLOR_BG_ROW);
        doc.rect(margin, y, contentWidth, 7.5, 'F');
      }

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...COLOR_DARK);

      doc.text(debt.expenseDate, margin + 3, y + 5);

      const provText = (debt.provider || 'Sin Proveedor').slice(0, 22);
      doc.text(provText, margin + 24, y + 5);

      const descText = (debt.description || '').slice(0, 32);
      doc.text(descText, margin + 65, y + 5);

      doc.text(`$${debt.totalAmount.toFixed(2)}`, margin + 125, y + 5, { align: 'right' });
      doc.text(`$${debt.paidAmount.toFixed(2)}`, margin + 152, y + 5, { align: 'right' });

      // Saldo resaltado
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(debt.pendingBalance > 0 ? 180 : 6, debt.pendingBalance > 0 ? 83 : 95, debt.pendingBalance > 0 ? 9 : 70);
      doc.text(`$${debt.pendingBalance.toFixed(2)}`, margin + contentWidth - 3, y + 5, { align: 'right' });

      // Línea divisoria suave
      doc.setDrawColor(235, 235, 235);
      doc.setLineWidth(0.15);
      doc.line(margin, y + 7.5, margin + contentWidth, y + 7.5);

      y += 7.5;

      // Si tiene abonos registrados, mostrarlos indented debajo
      if (debt.abonos && debt.abonos.length > 0) {
        debt.abonos.forEach((abono) => {
          if (y > pageHeight - 25) {
            doc.addPage();
            y = 20;
          }
          doc.setFillColor(243, 244, 246);
          doc.rect(margin + 20, y, contentWidth - 20, 5, 'F');
          doc.setFontSize(6.8);
          doc.setFont('helvetica', 'italic');
          doc.setTextColor(...COLOR_MUTED);
          doc.text(`↳ Abono: ${abono.date} (${abono.paymentMethod}) - Ref: ${abono.comprobanteRef || 'S/N'}`, margin + 24, y + 3.5);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(...COLOR_EMERALD);
          doc.text(`+$${abono.amount.toFixed(2)}`, margin + 152, y + 3.5, { align: 'right' });
          y += 5;
        });
      }
    });
  }

  y += 8;

  // --- PIE DE PÁGINA Y NOTA LEGAL ---
  if (y > pageHeight - 30) {
    doc.addPage();
    y = 20;
  }

  doc.setFillColor(249, 250, 251);
  doc.setDrawColor(229, 231, 235);
  doc.roundedRect(margin, y, contentWidth, 18, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...COLOR_PRIMARY);
  doc.text('COMPROMISO DE PAGO Y CONCILIACIÓN CON TALLERES', margin + 3, y + 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...COLOR_MUTED);
  doc.text(
    'Este documento certifica las obligaciones financieras y compras diferidas registradas en el sistema por el Socio Propietario de la Unidad.',
    margin + 3,
    y + 9
  );
  doc.text(
    'Cualquier discrepancia con las notas de venta o facturas de los talleres deberá conciliarse directamente con los recibos físicos.',
    margin + 3,
    y + 13
  );

  y += 24;

  // Firma
  const sigW = 60;
  doc.setDrawColor(150, 150, 150);
  doc.line(margin + contentWidth / 2 - sigW / 2, y + 8, margin + contentWidth / 2 + sigW / 2, y + 8);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLOR_DARK);
  doc.text('SOCIO PROPIETARIO', margin + contentWidth / 2, y + 12, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...COLOR_MUTED);
  doc.text(`Unidad ${data.busId} - Coo. Vilcabambaturis`, margin + contentWidth / 2, y + 16, { align: 'center' });

  // Guardar archivo
  doc.save(`Reporte_Deudas_Talleres_${data.busId}_${new Date().toISOString().slice(0, 10)}.pdf`);
}
