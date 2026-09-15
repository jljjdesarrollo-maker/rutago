import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const type = url.searchParams.get('type') || 'diario'; // diario | semanal | mensual | conductor
    const date = url.searchParams.get('date') || '';       // YYYY-MM-DD for diario
    const from = url.searchParams.get('from') || '';       // YYYY-MM-DD for ranges
    const to = url.searchParams.get('to') || '';
    const month = url.searchParams.get('month') || '';     // YYYY-MM for mensual
    const conductorId = url.searchParams.get('conductorId') || '';

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
