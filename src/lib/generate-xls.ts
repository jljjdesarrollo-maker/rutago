/**
 * Generador de XLS (Excel) para registros de transporte
 * Se ejecuta en el navegador (no en servidor) para no cargar al backend
 */

import type { SavedRecord } from '@/components/transport/types';

export async function generateXLS(records: SavedRecord[], filename: string): Promise<void> {
  // Dynamic import to avoid SSR issues
  const XLSX = await import('xlsx');

  // Find max trips for column headers
  const maxTrips = Math.max(...records.map(r => r.trips.length), 0);
  const maxExpenses = Math.max(...records.map(r => r.expenses.length), 0);

  // Build headers
  const headers: string[] = [
    'Fecha',
    'Conductor',
    'Ayudante',
    'Km',
  ];

  // Trip columns
  for (let i = 0; i < maxTrips; i++) {
    const odd = (i + 1) % 2 !== 0;
    headers.push(`Frec ${i + 1} ${odd ? '(Prod)' : '(Prod)'}`);
    headers.push(`Frec ${i + 1} (Caja Com.)`);
  }

  // Summary columns
  headers.push(
    'Produccion',
    'Caja Comun',
    'Sobrante',
    'Total Gastos',
  );

  // Expense columns
  for (let i = 0; i < maxExpenses; i++) {
    if (i < records[0]?.expenses.length || i < maxExpenses) {
      headers.push(`Gasto ${i + 1}`);
    }
  }

  // Final columns
  headers.push(
    'Tickets',
    'Entrega Ayudante',
    'Entrega Compania',
  );

  // Build rows
  const rows: (string | number)[][] = records.map(record => {
    const row: (string | number)[] = [
      record.date, // YYYY-MM-DD for Excel
      record.conductor || '',
      record.ayudanteNombre || '',
      record.km || '',
    ];

    // Trip data
    for (let i = 0; i < maxTrips; i++) {
      const trip = record.trips[i];
      row.push(trip ? trip.income : 0);
      row.push(trip ? trip.boletos : 0);
    }

    // Summary
    row.push(record.production);
    row.push(record.cajaComun);
    row.push(record.sobrante || 0);
    row.push(record.totalGastos);

    // Expenses
    for (let i = 0; i < maxExpenses; i++) {
      const exp = record.expenses[i];
      row.push(exp ? exp.amount : 0);
    }

    // Final
    row.push(record.tickets);
    row.push(record.entregaAyudante);
    row.push(record.entregaCompania);

    return row;
  });

  // Create workbook
  const wb = XLSX.utils.book_new();
  const wsData = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Set column widths
  const colWidths = headers.map((h, i) => {
    if (i === 0) return { wch: 12 }; // Fecha
    if (i <= 2) return { wch: 16 }; // Conductor, Ayudante
    if (i === 3) return { wch: 8 }; // Km
    return { wch: 14 }; // Rest
  });
  ws['!cols'] = colWidths;

  XLSX.utils.book_append_sheet(wb, ws, 'Liquidacion');

  // Download
  XLSX.writeFile(wb, `${filename}.xlsx`);
}
