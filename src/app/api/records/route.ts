import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  formatCanonicalConductor,
  resolveCanonicalOdometro,
} from '@/lib/canonical-record-payload';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    const busId = url.searchParams.get('busId') || '';
    const socioId = url.searchParams.get('socioId') || '';
    const limitParam = url.searchParams.get('limit');
    // Límite estricto de rendimiento móvil: máximo 90 registros diarios (3 meses de operación)
    const defaultLimit = (from || to) ? 90 : 10;
    const limit = limitParam ? Math.min(Number(limitParam) || defaultLimit, 90) : defaultLimit;
    const includeRelations = url.searchParams.get('include') === 'trips';

    const where: Record<string, unknown> = {};
    if (from && to) {
      where.date = { gte: from, lte: to };
    }

    // Aislamiento Multi-Tenant por Socio Propietario o Unidad Física
    let effectiveSocioId = socioId;
    const cleanBusNum = busId && busId !== 'TODOS'
      ? busId.replace(/^BUS-/i, '').replace(/\D/g, '').padStart(2, '0')
      : '';

    if ((!effectiveSocioId || effectiveSocioId === 'TODOS') && busId && busId !== 'TODOS') {
      try {
        const busFound = await db.bus.findFirst({
          where: {
            OR: [
              { id: busId },
              { numeroDisco: cleanBusNum },
              { numeroDisco: busId },
            ],
          },
          select: { socioId: true },
        });
        if (busFound?.socioId) {
          effectiveSocioId = busFound.socioId;
        }
      } catch {
        /* ignore */
      }
    }

    const orFilters: Array<Record<string, unknown>> = [];

    if (cleanBusNum) {
      const busConductorTags = [
        `BUS-${cleanBusNum}`,
        `Bus ${cleanBusNum}`,
        cleanBusNum,
        String(parseInt(cleanBusNum, 10)),
      ];
      orFilters.push({ conductor: { in: busConductorTags } });
      orFilters.push({ conductor: { startsWith: `BUS-${cleanBusNum}` } });
    }

    // Solo incluir filtro por nombres de tripulación del socio si NO se está consultando otra unidad distinta a la 01
    // (evita que los arqueos históricos de la Unidad 01 con conductor "José Luis" contaminen al Bus 10 u otras unidades del mismo socio)
    if (effectiveSocioId && effectiveSocioId !== 'TODOS' && (!cleanBusNum || cleanBusNum === '01')) {
      const socioPersonas = await db.persona.findMany({
        where: { socioId: effectiveSocioId },
        select: { nombre: true },
      });
      const crewNames = socioPersonas.map((p) => p.nombre).filter(Boolean);
      if (crewNames.length > 0) {
        orFilters.push({
          AND: [
            { OR: [{ ayudanteNombre: { in: crewNames } }, { conductor: { in: crewNames } }] },
            { NOT: { conductor: { startsWith: 'BUS-' } } },
          ],
        });
      }
    }

    if (orFilters.length > 0) {
      where.OR = orFilters;
    } else if (
      (effectiveSocioId && effectiveSocioId !== 'TODOS') ||
      (busId && busId !== 'TODOS' && cleanBusNum !== '01')
    ) {
      where.id = 'NO_RECORDS_YET';
    }

    const records = await db.dailyRecord.findMany({
      where,
      orderBy: { date: 'desc' },
      take: limit,
    });

    // Auto-saneamiento silencioso de registros históricos (ej. 04/10 y 05/10) para paridad 100% canónica
    if (records.length > 0) {
      let activeCondName: string | null = null;
      const needsCondHeal = records.some(r => /^BUS-\d+$/i.test(String(r.conductor || '').trim()));
      if (needsCondHeal) {
        const knownFromPeer = records
          .map(r => String(r.conductor || '').match(/^BUS-\d+\s*-\s*(.+)$/i)?.[1]?.trim())
          .find(Boolean);
        if (knownFromPeer) {
          activeCondName = knownFromPeer;
        } else {
          const activeCond = await db.persona.findFirst({
            where: { rol: 'CONDUCTOR', esActual: true },
            select: { nombre: true },
          }).catch(() => null);
          activeCondName = activeCond?.nombre || null;
        }
      }

      for (const r of records) {
        const updates: Record<string, string | null> = {};

        // 1. Sanear odómetro donde km guardó el tacómetro total en vez del recorrido y falta kmInicial
        const finVal = parseFloat(String(r.kmFinal || '').replace(/,/g, ''));
        if (Number.isFinite(finVal) && finVal > 5000 && (!r.kmInicial || r.km === r.kmFinal)) {
          const discoMatch = String(r.conductor || '').match(/^BUS-(\d+)/i);
          const discoTag = discoMatch ? `BUS-${discoMatch[1].padStart(2, '0')}` : 'BUS-01';
          // Buscar en el mismo lote o en BD el cierre anterior
          let prevRecord = records
            .filter(p => p.date < r.date && p.kmFinal && String(p.conductor || '').startsWith(discoTag))
            .sort((a, b) => b.date.localeCompare(a.date))[0];
          if (!prevRecord) {
            prevRecord = (await db.dailyRecord.findFirst({
              where: {
                date: { lt: r.date },
                kmFinal: { not: null },
                conductor: { startsWith: discoTag },
              },
              orderBy: { date: 'desc' },
            }).catch(() => null)) as typeof r | undefined;
          }
          if (prevRecord?.kmFinal) {
            const iniVal = parseFloat(String(prevRecord.kmFinal).replace(/,/g, ''));
            if (Number.isFinite(iniVal) && finVal >= iniVal && iniVal > 0) {
              const healedKm = String(Math.round((finVal - iniVal) * 10) / 10);
              const healedIni = String(prevRecord.kmFinal).trim();
              r.kmInicial = healedIni;
              r.km = healedKm;
              updates.kmInicial = healedIni;
              updates.km = healedKm;
            }
          }
        }

        // 2. Sanear conductor sin nombre cuando solo dice "BUS-XX"
        if (activeCondName && /^BUS-\d+$/i.test(String(r.conductor || '').trim())) {
          const healedCond = `${String(r.conductor).trim().toUpperCase()} - ${activeCondName}`;
          r.conductor = healedCond;
          updates.conductor = healedCond;
        }

        if (Object.keys(updates).length > 0) {
          await db.dailyRecord.update({
            where: { id: r.id },
            data: updates,
          }).catch(() => {});
        }
      }
    }

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

      // Auto-saneamiento de trips (income === 0 con efectivoReal > 0) y typos conocidos en gastos
      for (const rec of withRelations) {
        // Preservar campos saneados en cabecera
        const headerMatch = clean.find(c => c.id === rec.id);
        if (headerMatch) {
          rec.km = headerMatch.km;
          rec.kmInicial = headerMatch.kmInicial;
          rec.conductor = headerMatch.conductor;
        }
        for (const t of rec.trips) {
          if (t.income === 0 && t.efectivoReal > 0 && t.tipo !== 'no_realizada') {
            t.income = t.efectivoReal;
            await db.trip.update({
              where: { id: t.id },
              data: { income: t.efectivoReal },
            }).catch(() => {});
          }
        }
        for (const e of rec.expenses) {
          const cleanDesc = e.description.trim();
          if (cleanDesc.toLowerCase() === 'vomida de ayudante') {
            e.description = 'Comida de ayudante';
            await db.expense.update({
              where: { id: e.id },
              data: { description: 'Comida de ayudante' },
            }).catch(() => {});
          } else if (e.description !== cleanDesc) {
            e.description = cleanDesc;
            await db.expense.update({
              where: { id: e.id },
              data: { description: cleanDesc },
            }).catch(() => {});
          }
        }
      }

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
    const { date, km, kmInicial, kmFinal, conductor, ayudanteNombre, vtCode, busId, numeroDisco, trips, expenses, tickets, cajaComun: cajaComunBody, sobrante, photoUrl } = body;

    const recordDate = date || new Date().toISOString().split('T')[0];
    const rawBusDigits = String(numeroDisco || busId || '01').replace(/^BUS-/i, '').replace(/\D/g, '');
    const cleanDiscoPost = rawBusDigits ? rawBusDigits.padStart(2, '0') : '01';
    let conductorNormalizado = formatCanonicalConductor(cleanDiscoPost, conductor);

    // Si solo vino "BUS-XX" sin nombre de chofer, enriquecer con el conductor activo en BD
    if (/^BUS-\d+$/i.test(conductorNormalizado)) {
      try {
        const activeCond = await db.persona.findFirst({
          where: { rol: 'CONDUCTOR', esActual: true },
          select: { nombre: true },
        });
        if (activeCond?.nombre) {
          conductorNormalizado = `${conductorNormalizado} - ${activeCond.nombre.trim()}`;
        }
      } catch {
        /* ignore */
      }
    }

    // Resolver kmInicial automáticamente desde el cierre anterior si no fue enviado
    let rawKmInicial = kmInicial;
    if (!rawKmInicial && kmFinal) {
      try {
        const prevRecord = await db.dailyRecord.findFirst({
          where: {
            date: { lt: recordDate },
            kmFinal: { not: null },
            conductor: { startsWith: `BUS-${cleanDiscoPost}` },
          },
          orderBy: { date: 'desc' },
          select: { kmFinal: true },
        });
        if (prevRecord?.kmFinal) {
          rawKmInicial = prevRecord.kmFinal;
        }
      } catch {
        /* ignore */
      }
    }

    const {
      kmInicial: canonicalKmInicial,
      kmFinal: canonicalKmFinal,
      km: canonicalKm,
    } = resolveCanonicalOdometro(rawKmInicial, kmFinal, km);

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

    const expensesLimpias = Array.isArray(expenses)
      ? expenses.filter((e: { description?: string }) => {
          const desc = String(e?.description || '').trim().toLowerCase();
          return desc !== '' && !desc.startsWith('arrastre déficit') && !desc.startsWith('arrastre deficit');
        })
      : [];

    const tripEfectivoReal = (trips || []).reduce((s: number, t: { efectivoReal: number | string }) => s + (Number(t.efectivoReal) || 0), 0);
    const cajaComun = Number(cajaComunBody) || 0;
    const sobranteNum = Number(sobrante) || 0;
    // PRODUCCION = efectivo real contado + caja comun + sobrante
    const production = tripEfectivoReal + cajaComun + sobranteNum;
    const totalGastos = expensesLimpias.reduce((s: number, e: { amount: number | string }) => s + (Number(e.amount) || 0), 0);
    const ticketsNum = Number(tickets) || 0;

    // ENTREGA AYUDANTE Y COMPAÑÍA (Regla Dual por Caja Común):
    // Si hay Caja Común (cajaComun > 0): La compañía descuenta los tickets de su caja. El ayudante no paga tickets.
    // Si no hay Caja Común (cajaComun === 0): La entrega de la compañía es 0, y el ayudante paga los tickets.
    let entregaAyudante: number;
    if (cajaComun > 0) {
      entregaAyudante = tripEfectivoReal + sobranteNum - totalGastos;
    } else {
      entregaAyudante = (tripEfectivoReal + sobranteNum) - (totalGastos + ticketsNum);
    }
    const entregaCompania = cajaComun > 0 ? cajaComun - ticketsNum : 0;

    const record = await db.dailyRecord.create({
      data: {
        date: recordDate,
        km: canonicalKm,
        kmInicial: canonicalKmInicial,
        kmFinal: canonicalKmFinal,
        conductor: conductorNormalizado,
        ayudanteNombre: ayudanteNombre ? String(ayudanteNombre).trim() : null,
        vtCode: vtCode ? String(vtCode).trim() : null,
        production,
        cajaComun,
        sobrante: sobranteNum,
        tickets: ticketsNum,
        entregaAyudante,
        entregaCompania,
        totalGastos,
        photoUrl: photoUrl || null,
        trips: {
          create: (trips || []).map((t: { routeFrom: string; routeTo: string; time?: string; income?: number | string; efectivoReal?: number | string; boletos?: number | string; cajaComunPasajeros?: number | string; cajaComunMonto?: number | string; tipo?: string; motivo?: string; notaEspecial?: string }, i: number) => {
            const rawEfectivo = Number(t.efectivoReal) || 0;
            const rawIncome = Number(t.income) || 0;
            const normalizedIncome = rawIncome > 0 ? rawIncome : rawEfectivo;
            return {
              order: i + 1,
              routeFrom: (t.routeFrom || '').trim(),
              routeTo: (t.routeTo || '').trim(),
              time: t.time || null,
              income: normalizedIncome,
              efectivoReal: rawEfectivo,
              boletos: Number(t.boletos) || 0,
              cajaComunPasajeros: Number(t.cajaComunPasajeros) || 0,
              cajaComunMonto: Number(t.cajaComunMonto) || 0,
              tipo: t.tipo || 'frecuencia',
              motivo: t.motivo || null,
              notaEspecial: t.notaEspecial || null,
            };
          }),
        },
        expenses: {
          create: expensesLimpias.map((e: { description: string; amount: number | string }, i: number) => ({
            order: i + 1,
            description: String(e.description || '').trim(),
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
    const { id, date, km, kmInicial, kmFinal, conductor, ayudanteNombre, vtCode } = body;

    if (!id) {
      return NextResponse.json({ error: 'Falta id del registro' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (date !== undefined) updateData.date = date;
    if (km !== undefined) updateData.km = km;
    if (kmInicial !== undefined) updateData.kmInicial = kmInicial;
    if (kmFinal !== undefined) updateData.kmFinal = kmFinal;
    if (conductor !== undefined) updateData.conductor = conductor;
    if (ayudanteNombre !== undefined) updateData.ayudanteNombre = ayudanteNombre;
    if (vtCode !== undefined) updateData.vtCode = vtCode;

    const record = await db.dailyRecord.update({
      where: { id },
      data: updateData,
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
