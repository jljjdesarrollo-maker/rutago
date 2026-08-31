import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const type = url.searchParams.get('type') || 'diario';
    const date = url.searchParams.get('date') || '';
    const from = url.searchParams.get('from') || '';
    const to = url.searchParams.get('to') || '';
    const month = url.searchParams.get('month') || '';
    const conductorId = url.searchParams.get('conductorId') || '';

    // ─── CAJA COMÚN REPORT ───
    if (type === 'caja-comun') {
      return handleCajaComunReport(from, to);
    }

    // Build date range
    let startDate = from;
    let endDate = to;

    if (type === 'diario' && date) {
      startDate = date;
      endDate = date;
    } else if (type === 'semanal' && !from) {
      // Default: current week (Mon-Sun)
      const today = new Date();
      const dayOfWeek = today.getDay();
      const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const monday = new Date(today);
      monday.setDate(today.getDate() - diffToMonday);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      startDate = monday.toISOString().split('T')[0];
      endDate = sunday.toISOString().split('T')[0];
    } else if (type === 'mensual') {
      if (month) {
        const [y, m] = month.split('-');
        const daysInMonth = new Date(parseInt(y), parseInt(m), 0).getDate();
        startDate = `${y}-${m}-01`;
        endDate = `${y}-${m}-${String(daysInMonth).padStart(2, '0')}`;
      } else {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const daysInMonth = new Date(y, parseInt(m), 0).getDate();
        startDate = `${y}-${m}-01`;
        endDate = `${y}-${m}-${String(daysInMonth).padStart(2, '0')}`;
      }
    }

    const where: Record<string, unknown> = {};
    if (startDate && endDate) {
      where.date = { gte: startDate, lte: endDate };
    }
    if (conductorId) {
      where.ayudanteNombre = conductorId;
    }

    // Fetch records with trips and expenses
    const records = await db.dailyRecord.findMany({
      where,
      orderBy: { date: 'asc' },
      include: {
        trips: { orderBy: { order: 'asc' } },
        expenses: { orderBy: { order: 'asc' } },
      },
    });

    // Group by date
    const byDate = new Map<string, typeof records>();
    records.forEach(r => {
      const list = byDate.get(r.date) || [];
      list.push(r);
      byDate.set(r.date, list);
    });

    // Compute daily summaries
    const dailySummaries = Array.from(byDate.entries()).map(([date, recs]) => {
      const totalProduction = recs.reduce((s, r) => s + r.production, 0);
      const totalGastos = recs.reduce((s, r) => s + r.totalGastos, 0);
      const totalKm = recs.reduce((s, r) => s + (parseFloat(r.km || '0') || 0), 0);
      const totalEntregaCompania = recs.reduce((s, r) => s + r.entregaCompania, 0);
      const totalEntregaAyudante = recs.reduce((s, r) => s + r.entregaAyudante, 0);
      const totalTickets = recs.reduce((s, r) => s + r.tickets, 0);
      const totalCajaComun = recs.reduce((s, r) => s + r.cajaComun, 0);
      const totalSobrante = recs.reduce((s, r) => s + (r.sobrante || 0), 0);
      return {
        date,
        records: recs,
        count: recs.length,
        totalProduction,
        totalGastos,
        totalKm,
        totalEntregaCompania,
        totalEntregaAyudante,
        totalTickets,
        totalCajaComun,
        totalSobrante,
      };
    });

    // Get unique ayudantes for filter
    const allAyudantes = await db.dailyRecord.findMany({
      select: { ayudanteNombre: true },
      distinct: ['ayudanteNombre'],
      where: { ayudanteNombre: { not: null } },
    });

    const conductorNames = allAyudantes.map(c => c.ayudanteNombre).filter(Boolean);

    return NextResponse.json({
      type,
      startDate,
      endDate,
      dailySummaries,
      totals: {
        production: records.reduce((s, r) => s + r.production, 0),
        gastos: records.reduce((s, r) => s + r.totalGastos, 0),
        km: records.reduce((s, r) => s + (parseFloat(r.km || '0') || 0), 0),
        entregaCompania: records.reduce((s, r) => s + r.entregaCompania, 0),
        entregaAyudante: records.reduce((s, r) => s + r.entregaAyudante, 0),
        tickets: records.reduce((s, r) => s + r.tickets, 0),
        cajaComun: records.reduce((s, r) => s + r.cajaComun, 0),
        sobrante: records.reduce((s, r) => s + (r.sobrante || 0), 0),
        recordCount: records.length,
        daysWorked: dailySummaries.length,
      },
      conductorNames,
    });
  } catch (error) {
    console.error('Error fetching report:', error);
    return NextResponse.json({ error: 'Error al generar reporte' }, { status: 500 });
  }
}

// ─── Caja Común Report Handler ───
interface CajaComunTripRow {
  date: string;
  vtCode: string;
  ayudanteNombre: string;
  time: string | null;
  routeFrom: string;
  routeTo: string;
  boletos: number;
  monto: number;
  hasDetail: boolean; // true = per-trip detail, false = only daily total
}

interface CajaComunDayGroup {
  date: string;
  vtCode: string;
  ayudanteNombre: string;
  rows: CajaComunTripRow[];
  totalBoletos: number;
  totalMonto: number;
}

async function handleCajaComunReport(from: string, to: string) {
  // Default: current month
  let startDate = from;
  let endDate = to;
  if (!startDate || !endDate) {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    if (!startDate) startDate = `${y}-${m}-01`;
    if (!endDate) endDate = `${y}-${m}-${String(new Date(y, parseInt(m), 0).getDate()).padStart(2, '0')}`;
  }

  const records = await db.dailyRecord.findMany({
    where: {
      date: { gte: startDate, lte: endDate },
      OR: [
        { cajaComun: { gt: 0 } },
        { trips: { some: { cajaComunMonto: { gt: 0 } } } },
      ],
    },
    orderBy: { date: 'asc' },
    include: { trips: { orderBy: { order: 'asc' } } },
  });

  const groups: CajaComunDayGroup[] = [];

  for (const rec of records) {
    const dateFormatted = rec.date;
    const vtCode = rec.vtCode || '—';
    const ayudante = rec.ayudanteNombre || '—';

    // Trips with per-frequency detail
    const detailTrips = rec.trips.filter(t => t.cajaComunMonto > 0);

    if (detailTrips.length > 0) {
      // New format: per-frequency detail available
      const rows: CajaComunTripRow[] = detailTrips.map(t => ({
        date: dateFormatted,
        vtCode,
        ayudanteNombre: ayudante,
        time: t.time,
        routeFrom: t.routeFrom,
        routeTo: t.routeTo,
        boletos: t.cajaComunPasajeros,
        monto: t.cajaComunMonto,
        hasDetail: true,
      }));
      groups.push({
        date: dateFormatted,
        vtCode,
        ayudanteNombre: ayudante,
        rows,
        totalBoletos: rows.reduce((s, r) => s + r.boletos, 0),
        totalMonto: rows.reduce((s, r) => s + r.monto, 0),
      });
    } else if (rec.cajaComun > 0) {
      // Historical: only daily total available
      groups.push({
        date: dateFormatted,
        vtCode,
        ayudanteNombre: ayudante,
        rows: [{
          date: dateFormatted,
          vtCode,
          ayudanteNombre: ayudante,
          time: null,
          routeFrom: '',
          routeTo: '',
          boletos: 0,
          monto: rec.cajaComun,
          hasDetail: false,
        }],
        totalBoletos: 0,
        totalMonto: rec.cajaComun,
      });
    }
  }

  const grandTotalBoletos = groups.reduce((s, g) => s + g.totalBoletos, 0);
  const grandTotalMonto = groups.reduce((s, g) => s + g.totalMonto, 0);

  return NextResponse.json({
    type: 'caja-comun',
    startDate,
    endDate,
    groups,
    totals: {
      boletos: grandTotalBoletos,
      monto: grandTotalMonto,
      recordCount: groups.length,
    },
  });
}