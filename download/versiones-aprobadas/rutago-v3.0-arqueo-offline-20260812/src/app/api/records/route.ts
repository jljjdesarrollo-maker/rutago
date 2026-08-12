import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');

    const where: Record<string, unknown> = {};
    if (from && to) {
      where.date = { gte: from, lte: to };
    }

    const records = await db.dailyRecord.findMany({
      where,
      orderBy: { date: 'desc' },
      include: {
        trips: { orderBy: { order: 'asc' } },
        expenses: { orderBy: { order: 'asc' } },
      },
    });
    return NextResponse.json(records);
  } catch (error) {
    console.error('Error fetching records:', error);
    return NextResponse.json({ error: 'Error al obtener registros' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { date, km, conductor, ayudanteNombre, vtCode, trips, expenses, tickets, sobrante, photoUrl } = body;

    const tripIncome = (trips || []).reduce((s: number, t: { income: number | string }) => s + (Number(t.income) || 0), 0);
    const cajaComun = (trips || []).reduce((s: number, t: { boletos: number | string }) => s + (Number(t.boletos) || 0), 0);
    const sobranteNum = Number(sobrante) || 0;
    const production = tripIncome + sobranteNum;
    const totalGastos = (expenses || []).reduce((s: number, e: { amount: number | string }) => s + (Number(e.amount) || 0), 0);
    const entregaAyudante = production - totalGastos;
    const ticketsNum = Number(tickets) || 0;
    const entregaCompania = cajaComun - ticketsNum;

    const record = await db.dailyRecord.create({
      data: {
        date: date || new Date().toISOString().split('T')[0],
        km: km || null,
        conductor: conductor || null,
        ayudanteNombre: ayudanteNombre || null,
        vtCode: vtCode || null,
        production,
        cajaComun,
        sobrante: sobranteNum,
        tickets: ticketsNum,
        entregaAyudante,
        entregaCompania,
        totalGastos,
        photoUrl: photoUrl || null,
        trips: {
          create: (trips || []).map((t: { routeFrom: string; routeTo: string; time?: string; income?: number | string; boletos?: number | string }, i: number) => ({
            order: i + 1,
            routeFrom: t.routeFrom || '',
            routeTo: t.routeTo || '',
            time: t.time || null,
            income: Number(t.income) || 0,
            boletos: Number(t.boletos) || 0,
          })),
        },
        expenses: {
          create: (expenses || []).map((e: { description: string; amount: number | string }, i: number) => ({
            order: i + 1,
            description: e.description || '',
            amount: Number(e.amount) || 0,
          })),
        },
      },
      include: {
        trips: { orderBy: { order: 'asc' } },
        expenses: { orderBy: { order: 'asc' } },
      },
    });

    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    console.error('Error creating record:', error);
    return NextResponse.json({ error: 'Error al crear registro' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, date } = body;

    if (!id || !date) {
      return NextResponse.json({ error: 'Falta id o date' }, { status: 400 });
    }

    const record = await db.dailyRecord.update({
      where: { id },
      data: { date },
      include: {
        trips: { orderBy: { order: 'asc' } },
        expenses: { orderBy: { order: 'asc' } },
      },
    });

    return NextResponse.json(record);
  } catch (error) {
    console.error('Error updating record:', error);
    return NextResponse.json({ error: 'Error al actualizar registro' }, { status: 500 });
  }
}
