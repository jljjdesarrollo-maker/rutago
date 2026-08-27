import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    const limit = Math.min(Number(url.searchParams.get('limit')) || 10, 50);
    const includeRelations = url.searchParams.get('include') === 'trips';

    const where: Record<string, unknown> = {};
    if (from && to) {
      where.date = { gte: from, lte: to };
    }

    const records = await db.dailyRecord.findMany({
      where,
      orderBy: { date: 'desc' },
      take: limit,
    });

    // Strip heavy fields — never return photoUrl in list
    const clean = records.map(r => {
      const { photoUrl, ...rest } = r;
      return rest;
    });

    // If relations requested, fetch separately per record (avoid bloat)
    if (includeRelations) {
      const withRelations = await db.dailyRecord.findMany({
        where: { id: { in: clean.map(r => r.id) } },
        orderBy: { date: 'desc' },
        include: { trips: { orderBy: { order: 'asc' } }, expenses: { orderBy: { order: 'asc' } } },
      });
      const cleanWithRel = withRelations.map(r => {
        const { photoUrl, ...rest } = r;
        return rest;
      });
      return NextResponse.json(cleanWithRel);
    }

    return NextResponse.json(clean);
  } catch (error) {
    console.error('Error fetching records:', error);
    return NextResponse.json({ error: 'Error al obtener registros' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { date, km, conductor, ayudanteNombre, vtCode, trips, expenses, tickets, sobrante, photoUrl } = body;

    // Validación server-side: valores financieros no negativos
    if (Array.isArray(trips)) {
      for (let i = 0; i < trips.length; i++) {
        const t = trips[i];
        if ((Number(t.income) || 0) < 0 || (Number(t.efectivoReal) || 0) < 0 || (Number(t.boletos) || 0) < 0) {
          return NextResponse.json({ error: `Trip ${i + 1}: income, efectivoReal y boletos deben ser >= 0` }, { status: 400 });
        }
      }
    }
    if (Array.isArray(expenses)) {
      for (let i = 0; i < expenses.length; i++) {
        if ((Number(expenses[i].amount) || 0) < 0) {
          return NextResponse.json({ error: `Gasto ${i + 1}: amount debe ser >= 0` }, { status: 400 });
        }
      }
    }
    if ((Number(tickets) || 0) < 0) {
      return NextResponse.json({ error: 'tickets debe ser >= 0' }, { status: 400 });
    }

    const tripIncome = (trips || []).reduce((s: number, t: { income: number | string }) => s + (Number(t.income) || 0), 0);
    const tripEfectivoReal = (trips || []).reduce((s: number, t: { efectivoReal: number | string }) => s + (Number(t.efectivoReal) || 0), 0);
    const cajaComun = (trips || []).reduce((s: number, t: { boletos: number | string }) => s + (Number(t.boletos) || 0), 0);
    const sobranteNum = Number(sobrante) || 0;
    // PRODUCCION = efectivo real contado + sobrante (no sistema)
    const production = tripEfectivoReal + sobranteNum;
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
          create: (trips || []).map((t: { routeFrom: string; routeTo: string; time?: string; income?: number | string; efectivoReal?: number | string; boletos?: number | string }, i: number) => ({
            order: i + 1,
            routeFrom: t.routeFrom || '',
            routeTo: t.routeTo || '',
            time: t.time || null,
            income: Number(t.income) || 0,
            efectivoReal: Number(t.efectivoReal) || 0,
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
