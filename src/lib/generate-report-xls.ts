import * as XLSX from 'xlsx';
import { type SavedRecord } from '@/components/transport/types';

export function generateReportXLS(records: SavedRecord[], from: string, to: string) {
  const formatDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  };

  const totals = records.reduce(
    (acc, r) => ({
      production: acc.production + r.production,
      cajaComun: acc.cajaComun + r.cajaComun,
      totalGastos: acc.totalGastos + r.totalGastos,
      tickets: acc.tickets + r.tickets,
      entregaAyudante: acc.entregaAyudante + r.entregaAyudante,
      entregaCompania: acc.entregaCompania + r.entregaCompania,
    }),
    { production: 0, cajaComun: 0, totalGastos: 0, tickets: 0, entregaAyudante: 0, entregaCompania: 0 }
  );

  // Detail sheet
  const detailData = records.map((r) => ({
    'Fecha': formatDate(r.date),
    'Conductor': r.conductor || '',
    'Ayudante': r.ayudanteNombre || '',
    'KM': r.km || '',
    'Produccion': r.production,
    'Caja Comun': r.cajaComun,
    'Total Gastos': r.totalGastos,
    'Tickets': r.tickets,
    'Entrega Ayudante': r.entregaAyudante,
    'Entrega Compania': r.entregaCompania,
    'Frecuencias': r.trips.length,
  }));

  // Add totals row
  detailData.push({
    'Fecha': 'TOTAL',
    'Conductor': '',
    'Ayudante': '',
    'KM': '',
    'Produccion': totals.production,
    'Caja Comun': totals.cajaComun,
    'Total Gastos': totals.totalGastos,
    'Tickets': totals.tickets,
    'Entrega Ayudante': totals.entregaAyudante,
    'Entrega Compania': totals.entregaCompania,
    'Frecuencias': records.length,
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(detailData);

  // Set column widths
  ws['!cols'] = [
    { wch: 12 }, { wch: 18 }, { wch: 18 }, { wch: 12 },
    { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 10 },
    { wch: 16 }, { wch: 16 }, { wch: 10 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Detalle');

  // Trips sheet
  const tripsData = records.flatMap((r) =>
    r.trips.map((t) => ({
      'Fecha': formatDate(r.date),
      'Ruta': `${t.routeFrom} - ${t.routeTo}`,
      'Hora': t.time || '',
      'Ingreso': t.income,
      'Boletos (Caja Comun)': t.boletos,
    }))
  );

  const wsTrips = XLSX.utils.json_to_sheet(tripsData);
  wsTrips['!cols'] = [
    { wch: 12 }, { wch: 28 }, { wch: 10 }, { wch: 12 }, { wch: 18 },
  ];
  XLSX.utils.book_append_sheet(wb, wsTrips, 'Frecuencias');

  // Expenses sheet
  const expData = records.flatMap((r) =>
    r.expenses.map((e) => ({
      'Fecha': formatDate(r.date),
      'Descripcion': e.description,
      'Monto': e.amount,
    }))
  );

  const wsExp = XLSX.utils.json_to_sheet(expData);
  wsExp['!cols'] = [{ wch: 12 }, { wch: 24 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, wsExp, 'Gastos');

  XLSX.writeFile(wb, `reporte_transporte_${from}_${to}.xlsx`);
}
