import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * Verificación SQL: registros pre-Junio 2026 con cajaComunMonto > 0
 * Si retorna 0, confirma que la caja común solo se usó desde Junio 2026,
 * validando que la fórmula de producción (efectivoReal + cajaComunMonto)
 * no doble-contabiliza para registros pre-June.
 */
export async function GET() {
  try {
    // Pre-June trips with cajaComunMonto > 0
    const preJuneWithCajaComun = await db.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count FROM "Trip" t
      JOIN "DailyRecord" d ON t."recordId" = d.id
      WHERE d.date < '2026-06-01' AND t."cajaComunMonto" > 0
    `;

    // Total pre-June trips
    const totalPreJune = await db.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count FROM "Trip" t
      JOIN "DailyRecord" d ON t."recordId" = d.id
      WHERE d.date < '2026-06-01'
    `;

    // Post-June trips with cajaComunMonto > 0
    const postJuneWithCajaComun = await db.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count FROM "Trip" t
      JOIN "DailyRecord" d ON t."recordId" = d.id
      WHERE d.date >= '2026-06-01' AND t."cajaComunMonto" > 0
    `;

    // Total post-June trips
    const totalPostJune = await db.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count FROM "Trip" t
      JOIN "DailyRecord" d ON t."recordId" = d.id
      WHERE d.date >= '2026-06-01'
    `;

    const toNum = (v: bigint | null) => v ? Number(v) : 0;
    const preJuneCajaComunCount = toNum(preJuneWithCajaComun[0]?.count);
    const preJuneTotal = toNum(totalPreJune[0]?.count);
    const postJuneCajaComunCount = toNum(postJuneWithCajaComun[0]?.count);
    const postJuneTotal = toNum(totalPostJune[0]?.count);

    const assumptionValid = preJuneCajaComunCount === 0;

    return NextResponse.json({
      assumption: 'Pre-June 2026 records have cajaComunMonto = 0 (caja común feature started in June)',
      result: assumptionValid ? 'VALIDATED' : 'FAILED',
      preJune: {
        tripsWithCajaComunMonto: preJuneCajaComunCount,
        totalTrips: preJuneTotal,
      },
      postJune: {
        tripsWithCajaComunMonto: postJuneCajaComunCount,
        totalTrips: postJuneTotal,
      },
      implication: assumptionValid
        ? 'No double-counting risk. Production formula (efectivoReal + cajaComunMonto) is safe for all records.'
        : `Found ${preJuneCajaComunCount} pre-June trips with cajaComunMonto > 0. Review these records for potential double-counting.`,
      formulaZeroProduction: {
        description: 'When production = 0 (efectivoReal + cajaComunMonto = 0 for all trips)',
        formula: 'Entrega Ayudante = (Efectivo Real + Ajuste Manual) - (Total Gastos - Tickets)',
        expanded: 'entregaAyudante = tripEfectivoReal + sobrante - totalGastos + ticketsNum',
      },
    });
  } catch (error) {
    console.error('Error verifying caja común:', error);
    return NextResponse.json({ error: 'Error al verificar caja común pre-June' }, { status: 500 });
  }
}
