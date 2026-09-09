import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { VT_DATA } from '@/lib/seed-vts';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const from = url.searchParams.get('from') || '';
    const to = url.searchParams.get('to') || '';

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

    // Query: daily records with trips in date range
    const records = await db.dailyRecord.findMany({
      where: { date: { gte: startDate, lte: endDate } },
      orderBy: { date: 'asc' },
      include: { trips: { orderBy: { order: 'asc' } } },
    });

    // Flat list of trips
    const trips: {
      date: string;
      vtCode: string;
      ayudante: string;
      hora: string;
      nombre: string;
      ruta: string;
      tipo: string;
      motivo: string | null;
      notaEspecial: string | null;
      income: number;
      efectivoReal: number;
      cajaComunMonto: number;
    }[] = [];

    records.forEach(r => {
      r.trips.forEach(t => {
        const tipo = t.tipo || (t.income > 0 ? 'frecuencia' : 'frecuencia');

        // Corregir de forma inteligente registros históricos con "Loja -> Loja"
        let routeFrom = t.routeFrom || '';
        let routeTo = t.routeTo || '';

        if ((!routeFrom || !routeTo || (routeFrom === 'Loja' && routeTo === 'Loja')) && t.time && r.vtCode) {
          const vtItem = VT_DATA.find(v => v.codigo === r.vtCode);
          const frecMatch = vtItem?.frecuencias.find(f => f.time === t.time);
          if (frecMatch) {
            routeFrom = frecMatch.routeFrom;
            routeTo = frecMatch.routeTo;
          } else if (routeFrom === 'Loja' && routeTo === 'Loja') {
            routeFrom = 'Vilcabamba';
            routeTo = 'Loja';
          }
        }

        const nombreRuta = routeFrom && routeTo ? `${routeFrom} → ${routeTo}` : (routeFrom || routeTo || '—');
        const rutaCode = routeFrom && routeTo ? `${routeFrom}-${routeTo}` : '';

        trips.push({
          date: r.date,
          vtCode: r.vtCode || '—',
          ayudante: r.ayudanteNombre || '—',
          hora: t.time || '',
          nombre: nombreRuta,
          ruta: rutaCode,
          tipo,
          motivo: t.motivo || null,
          notaEspecial: t.notaEspecial || null,
          income: t.income || 0,
          efectivoReal: t.efectivoReal || 0,
          cajaComunMonto: t.cajaComunMonto || 0,
        });
      });
    });

    // KPIs
    const totalProgramadas = trips.length;
    const realizadas = trips.filter(t => t.tipo === 'frecuencia').length;
    const totalIngresos = trips.reduce((s, t) => {
      // Produccion total de frecuencia = efectivoReal + cajaComunMonto
      if (t.tipo === 'frecuencia') return s + (t.efectivoReal || 0) + (t.cajaComunMonto || 0);
      if (t.tipo === 'ingreso_especial') return s + (t.income || 0);
      return s;
    }, 0);
    const noRealizadas = trips.filter(t => t.tipo === 'no_realizada').length;
    const ingresosEspeciales = trips.filter(t => t.tipo === 'ingreso_especial').length;
    const cumplimiento = totalProgramadas > 0 ? realizadas / totalProgramadas : 0;

    // Motivos breakdown
    const motivosMap: Record<string, number> = {};
    trips.filter(t => t.tipo === 'no_realizada' && t.motivo).forEach(t => {
      const key = t.motivo!;
      motivosMap[key] = (motivosMap[key] || 0) + 1;
    });
    const motivos = Object.entries(motivosMap)
      .map(([motivo, count]) => ({ motivo, count, pct: noRealizadas > 0 ? count / noRealizadas : 0 }))
      .sort((a, b) => b.count - a.count);

    // Group by date
    const byDate = new Map<string, typeof trips>();
    trips.forEach(t => {
      const list = byDate.get(t.date) || [];
      list.push(t);
      byDate.set(t.date, list);
    });
    const days = Array.from(byDate.entries()).map(([date, trips]) => ({ date, trips }));

    return NextResponse.json({
      startDate,
      endDate,
      totalProgramadas,
      realizadas,
      noRealizadas,
      ingresosEspeciales,
      cumplimiento,
      totalIngresos,
      motivos,
      days,
    });
  } catch (error) {
    console.error('Error reporte operativo:', error);
    return NextResponse.json({ error: 'Error al generar reporte operativo' }, { status: 500 });
  }
}
