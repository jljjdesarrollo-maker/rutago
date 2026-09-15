import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

function getDayOfWeek(dateStr: string): number {
  // 0=Dom, 1=Lun, 2=Mar, ..., 6=Sab
  const d = new Date(dateStr + 'T12:00:00');
  return d.getDay();
}

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const dateStr = url.searchParams.get('date') || new Date().toISOString().split('T')[0];
    const freq1From = url.searchParams.get('freq1From');
    const freq1To = url.searchParams.get('freq1To');
    const freq1Time = url.searchParams.get('freq1Time');
    const freq2From = url.searchParams.get('freq2From');
    const freq2To = url.searchParams.get('freq2To');
    const freq2Time = url.searchParams.get('freq2Time');

    if (!freq1From || !freq1To || !freq1Time || !freq2From || !freq2To || !freq2Time) {
      return NextResponse.json({ error: 'Faltan parametros de frecuencia' }, { status: 400 });
    }

    const dayOfWeek = getDayOfWeek(dateStr);
    const dayName = DAY_NAMES[dayOfWeek];

    // Limitar busqueda a los ultimos N meses (default 6) para evitar cargar toda la BD
    const monthsBack = parseInt(url.searchParams.get('months') || '6', 10);
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - monthsBack);
    startDate.setDate(1);
    const startDateStr = startDate.toISOString().split('T')[0];

    const records = await db.dailyRecord.findMany({
      where: { date: { gte: startDateStr } },
      include: {
        trips: { orderBy: { order: 'asc' } },
      },
    });

    interface FrecStats {
      count: number;
      countByDay: number;
      totalEfectivo: number;
      totalEfectivoByDay: number;
      avgEfectivo: number;
      avgEfectivoByDay: number;
    }

    function calcStats(from: string, to: string, time: string): FrecStats {
      let count = 0;
      let countByDay = 0;
      let totalEfectivo = 0;
      let totalEfectivoByDay = 0;

      for (const record of records) {
        const recDay = getDayOfWeek(record.date);
        const matchingTrips = record.trips.filter(
          t => t.routeFrom === from && t.routeTo === to && t.time === time
        );

        if (matchingTrips.length > 0) {
          // Produccion total = efectivoReal (lo que conto el ayudante) + cajaComunMonto (vendido en oficina)
          const tripProduccion = matchingTrips.reduce(
            (s, t) => s + (t.efectivoReal || 0) + (t.cajaComunMonto || 0), 0
          );
          count++;
          totalEfectivo += tripProduccion;

          if (recDay === dayOfWeek) {
            countByDay++;
            totalEfectivoByDay += tripProduccion;
          }
        }
      }

      return {
        count,
        countByDay,
        totalEfectivo,
        totalEfectivoByDay,
        avgEfectivo: count > 0 ? Math.round((totalEfectivo / count) * 100) / 100 : 0,
        avgEfectivoByDay: countByDay > 0 ? Math.round((totalEfectivoByDay / countByDay) * 100) / 100 : 0,
      };
    }

    const stats1 = calcStats(freq1From, freq1To, freq1Time);
    const stats2 = calcStats(freq2From, freq2To, freq2Time);

    // Determine recommendation
    const dayDiff = stats1.avgEfectivoByDay - stats2.avgEfectivoByDay;
    const generalDiff = stats1.avgEfectivo - stats2.avgEfectivo;
    const enoughDayData = stats1.countByDay >= 5 && stats2.countByDay >= 5;

    let recommendation = '';
    let winner = '';

    if (enoughDayData) {
      if (dayDiff > 0) {
        recommendation = `Basado en ${stats1.countByDay} registros del ${dayName}, tu frecuencia rinde S/ ${Math.abs(Math.round(dayDiff))} mas en promedio.`;
        winner = 'freq1';
      } else if (dayDiff < 0) {
        recommendation = `Basado en ${stats2.countByDay} registros del ${dayName}, la frecuencia ofrecida rinde S/ ${Math.abs(Math.round(dayDiff))} mas en promedio. CONVIENE cambiar.`;
        winner = 'freq2';
      } else {
        recommendation = `Ambas frecuencias producen igual en promedio los ${dayName}s.`;
        winner = 'tie';
      }
    } else {
      if (generalDiff > 0) {
        recommendation = `Pocos registros el ${dayName} (< 5). Usando general: tu frecuencia rinde S/ ${Math.abs(Math.round(generalDiff))} mas.`;
        winner = 'freq1';
      } else if (generalDiff < 0) {
        recommendation = `Pocos registros el ${dayName} (< 5). Usando general: la frecuencia ofrecida rinde S/ ${Math.abs(Math.round(generalDiff))} mas. CONVIENE cambiar.`;
        winner = 'freq2';
      } else {
        recommendation = 'Ambas frecuencias producen igual en promedio.';
        winner = 'tie';
      }
    }

    return NextResponse.json({
      date: dateStr,
      analyzedPeriod: { from: startDateStr, to: dateStr, months: monthsBack },
      dayOfWeek,
      dayName,
      freq1: { from: freq1From, to: freq1To, time: freq1Time, label: `${freq1Time} ${freq1From} → ${freq1To}` },
      freq2: { from: freq2From, to: freq2To, time: freq2Time, label: `${freq2Time} ${freq2From} → ${freq2To}` },
      stats1,
      stats2,
      enoughDayData,
      recommendation,
      winner,
    });
  } catch (error) {
    console.error('Error comparing frequencies:', error);
    return NextResponse.json({ error: 'Error al comparar frecuencias' }, { status: 500 });
  }
}
