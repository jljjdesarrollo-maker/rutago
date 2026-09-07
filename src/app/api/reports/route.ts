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
    } else if (type === 'mensual' || type === 'conductor') {
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

    // ─── OPERATIONAL DATA: frecuencias programadas por VT ───
    const uniqueVtCodes = [...new Set(records.map(r => r.vtCode).filter((v): v is string => !!v))];
    const vtFrecCounts: Record<string, number> = {};
    if (uniqueVtCodes.length > 0) {
      // 1. Intentar desde tabla Frecuencia
      const frecCounts = await Promise.all(
        uniqueVtCodes.map(vt =>
          db.frecuencia.count({ where: { vtCode: vt, activo: true } })
            .then(c => ({ vt, count: c }))
        )
      );
      frecCounts.forEach(f => { vtFrecCounts[f.vt] = f.count; });

      // 2. Fallback: para VTs con count=0, leer del JSON de BusVT.frecuencias
      const vtsWithoutFrec = uniqueVtCodes.filter(vt => (vtFrecCounts[vt] || 0) === 0);
      if (vtsWithoutFrec.length > 0) {
        const busesVT = await db.busVT.findMany({
          where: { codigo: { in: vtsWithoutFrec } },
        });
        busesVT.forEach(bus => {
          const arr = Array.isArray(bus.frecuencias) ? bus.frecuencias : [];
          if (arr.length > 0) {
            vtFrecCounts[bus.codigo] = arr.length;
          }
        });
      }
    }

    // Calculate days in period
    let daysInPeriod = 1;
    if (startDate && endDate) {
      const d1 = new Date(startDate);
      const d2 = new Date(endDate);
      daysInPeriod = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    }

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
      // Operational: frecuencias por tipo (usando campo tipo de Trip)
      const tripsAll = recs.flatMap(r => r.trips);
      const frecRealizadas = tripsAll.filter(t => t.tipo === 'frecuencia' || (!t.tipo && t.income > 0)).length;
      const frecNoRealizadas = tripsAll.filter(t => t.tipo === 'no_realizada').length;
      const frecIngresoEspecial = tripsAll.filter(t => t.tipo === 'ingreso_especial').length;
      // Frecuencias programadas = realizadas + no realizadas + ingresos especiales (lo que realmente se registró ese día)
      // Fallback: si no hay datos con tipo, usar conteo de tabla Frecuencia por VT
      const frecConTipo = tripsAll.filter(t => t.tipo && t.tipo !== 'frecuencia').length;
      const frecProgramadas = frecConTipo > 0
        ? frecRealizadas + frecNoRealizadas + frecIngresoEspecial
        : recs.reduce((s, r) => s + (vtFrecCounts[r.vtCode || ''] || 0), 0);
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
        frecProgramadas,
        frecRealizadas,
        frecNoRealizadas,
        frecIngresoEspecial,
      };
    });

    // Get unique ayudantes for filter
    const allAyudantes = await db.dailyRecord.findMany({
      select: { ayudanteNombre: true },
      distinct: ['ayudanteNombre'],
      where: { ayudanteNombre: { not: null } },
    });

    const conductorNames = allAyudantes.map(c => c.ayudanteNombre).filter(Boolean);

    // Aggregate operational totals
    const totalFrecProgramadas = dailySummaries.reduce((s, d) => s + d.frecProgramadas, 0);
    const totalFrecRealizadas = dailySummaries.reduce((s, d) => s + d.frecRealizadas, 0);
    const daysWorked = dailySummaries.length;
    const totalProduction = records.reduce((s, r) => s + r.production, 0);
    const totalGastos = records.reduce((s, r) => s + r.totalGastos, 0);

    // Motivos de pérdida (no realizadas)
    const allTrips = records.flatMap(r => r.trips);
    const motivosMap: Record<string, number> = {};
    allTrips.filter(t => t.tipo === 'no_realizada' && t.motivo).forEach(t => {
      motivosMap[t.motivo] = (motivosMap[t.motivo] || 0) + 1;
    });
    const motivosPerdida = Object.entries(motivosMap).map(([motivo, count]) => ({ motivo, count })).sort((a, b) => b.count - a.count);

    return NextResponse.json({
      type,
      startDate,
      endDate,
      dailySummaries,
      totals: {
        production: totalProduction,
        gastos: totalGastos,
        km: records.reduce((s, r) => s + (parseFloat(r.km || '0') || 0), 0),
        entregaCompania: records.reduce((s, r) => s + r.entregaCompania, 0),
        entregaAyudante: records.reduce((s, r) => s + r.entregaAyudante, 0),
        tickets: records.reduce((s, r) => s + r.tickets, 0),
        cajaComun: records.reduce((s, r) => s + r.cajaComun, 0),
        sobrante: records.reduce((s, r) => s + (r.sobrante || 0), 0),
        recordCount: records.length,
        daysWorked,
        daysInPeriod,
        frecProgramadas: totalFrecProgramadas,
        frecRealizadas: totalFrecRealizadas,
        frecNoRealizadas: dailySummaries.reduce((s, d) => s + d.frecNoRealizadas, 0),
        frecIngresoEspecial: dailySummaries.reduce((s, d) => s + d.frecIngresoEspecial, 0),
        motivosPerdida,
        // Derived KPIs
        asistencia: daysInPeriod > 0 ? daysWorked / daysInPeriod : 0,
        cumplimiento: totalFrecProgramadas > 0 ? totalFrecRealizadas / totalFrecProgramadas : 0,
        ingresoPorFrecuencia: totalFrecRealizadas > 0 ? totalProduction / totalFrecRealizadas : 0,
        ingresoPorDia: daysWorked > 0 ? totalProduction / daysWorked : 0,
        utilidadNeta: totalProduction - totalGastos - records.reduce((s, r) => s + r.tickets, 0),
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
  entregaCompania: number;
  tickets: number;
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
        entregaCompania: rec.entregaCompania || 0,
        tickets: rec.tickets || 0,
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
        entregaCompania: rec.entregaCompania || 0,
        tickets: rec.tickets || 0,
      });
    }
  }

  const grandTotalBoletos = groups.reduce((s, g) => s + g.totalBoletos, 0);
  const grandTotalMonto = groups.reduce((s, g) => s + g.totalMonto, 0);
  const grandTotalEntregaCompania = groups.reduce((s, g) => s + g.entregaCompania, 0);
  const grandTotalTickets = groups.reduce((s, g) => s + g.tickets, 0);

  return NextResponse.json({
    type: 'caja-comun',
    startDate,
    endDate,
    groups,
    totals: {
      boletos: grandTotalBoletos,
      monto: grandTotalMonto,
      entregaCompania: grandTotalEntregaCompania,
      tickets: grandTotalTickets,
      recordCount: groups.length,
    },
  });
}