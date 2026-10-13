import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  generarRangoFechasCalendario,
  procesarReporteCalendarioSocio,
} from '@/lib/reporte-calendario-socio';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const busId = searchParams.get('busId') || 'BUS-01';
    const rawVentana = Number(searchParams.get('ventana')) || 15;
    const diasVentana = [7, 15, 30].includes(rawVentana) ? rawVentana : 15;
    const fechaBase = searchParams.get('fechaBase') || undefined;

    // 1. Obtener ventana de calendario fija estricta
    const { fechaInicio, fechaFin } = generarRangoFechasCalendario(diasVentana, fechaBase);

    // 2. Resolver número de disco de la unidad solicitada
    const cleanDisco = busId.replace(/^BUS-/i, '').replace(/\D/g, '').padStart(2, '0');

    // 3. Buscar datos del autobús para obtener su tipoOperacion (Troncal vs Alimentador)
    let tipoCircuito = 'TRONCAL_VT';
    try {
      const bus = await db.bus.findFirst({
        where: {
          OR: [{ id: busId }, { numeroDisco: cleanDisco }],
        },
        select: { tipoOperacion: true, numeroDisco: true },
      });
      if (bus?.tipoOperacion) {
        tipoCircuito = bus.tipoOperacion;
      }
    } catch (e) {
      console.warn('Advertencia consultando tipo de circuito del bus:', e);
    }

    // 4. Traer registros de la ventana temporal en PostgreSQL
    const records = await db.dailyRecord.findMany({
      where: {
        date: { gte: fechaInicio, lte: fechaFin },
      },
      orderBy: { date: 'asc' },
      select: {
        id: true,
        date: true,
        km: true,
        kmInicial: true,
        kmFinal: true,
        conductor: true,
        production: true,
        expenses: {
          select: { description: true, amount: true },
        },
        trips: {
          select: { tipo: true, motivo: true, income: true },
        },
      },
    });

    // 5. Procesar el reporte con el motor canónico de negocio
    const resultado = procesarReporteCalendarioSocio({
      diasVentana,
      fechaInicio,
      fechaFin,
      busDisco: cleanDisco,
      tipoCircuito,
      registros: records,
    });

    return NextResponse.json(resultado);
  } catch (error) {
    console.error('Error generando reporte calendario socio:', error);
    return NextResponse.json(
      { error: 'Error interno al generar el reporte de calendario' },
      { status: 500 }
    );
  }
}
