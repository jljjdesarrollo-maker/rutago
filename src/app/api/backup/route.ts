import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const [
      records,
      personas,
      socios,
      buses,
      suscripciones,
      pagos,
      ownerExpenses,
      ventasBoletos,
      busVTs,
      frecuencias,
      catalogoMaestroItems,
      busRecetasCombo,
      busItemOverrides,
      busMantenimientoConfigs,
    ] = await Promise.all([
      db.dailyRecord.findMany({
        orderBy: { date: 'desc' },
        include: {
          trips: { orderBy: { order: 'asc' } },
          expenses: { orderBy: { order: 'asc' } },
        },
      }),
      db.persona.findMany({
        orderBy: { nombre: 'asc' },
        select: {
          id: true,
          nombre: true,
          cedula: true,
          telefono: true,
          rol: true,
          esActual: true,
          socioId: true,
          deviceId: true,
          deviceName: true,
          deviceLinkedAt: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      db.cuentaSocio.findMany({
        orderBy: { nombre: 'asc' },
        select: {
          id: true,
          cedula: true,
          nombre: true,
          email: true,
          telefono: true,
          rol: true,
          activo: true,
          esFundadorSaaS: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      db.bus.findMany({
        orderBy: { numeroDisco: 'asc' },
      }),
      db.suscripcionBus.findMany({
        orderBy: { createdAt: 'desc' },
      }),
      db.pagoSuscripcion.findMany({
        orderBy: { fechaPago: 'desc' },
      }),
      db.ownerExpense.findMany({
        orderBy: { expenseDate: 'desc' },
      }),
      db.ventaBoleto.findMany({
        orderBy: { createdAt: 'desc' },
      }),
      db.busVT.findMany({
        orderBy: { codigo: 'asc' },
      }),
      db.frecuencia.findMany({
        orderBy: { hora: 'asc' },
      }),
      db.catalogoMaestroItem.findMany({
        orderBy: { codigo: 'asc' },
      }),
      db.busRecetaCombo.findMany({
        orderBy: { busId: 'asc' },
      }),
      db.busItemOverride.findMany({
        orderBy: { busId: 'asc' },
      }),
      db.busMantenimientoConfig.findMany({
        orderBy: { busId: 'asc' },
      }),
    ]);

    const backup = {
      exportDate: new Date().toISOString(),
      version: 'v3.60.75-backup-integral',
      app: 'rutago',
      platform: 'Vercel Postgres',
      records,
      personas,
      socios,
      buses,
      suscripciones,
      pagos,
      ownerExpenses,
      ventasBoletos,
      busVTs,
      frecuencias,
      catalogoMaestroItems,
      busRecetasCombo,
      busItemOverrides,
      busMantenimientoConfigs,
      summary: {
        totalRecords: records.length,
        totalPersonas: personas.length,
        totalSocios: socios.length,
        totalBuses: buses.length,
        totalSuscripciones: suscripciones.length,
        totalPagos: pagos.length,
        totalOwnerExpenses: ownerExpenses.length,
        totalVentasBoletos: ventasBoletos.length,
        totalBusVTs: busVTs.length,
        totalFrecuencias: frecuencias.length,
        totalCatalogoMaestroItems: catalogoMaestroItems.length,
        totalBusRecetasCombo: busRecetasCombo.length,
        totalBusItemOverrides: busItemOverrides.length,
        totalBusMantenimientoConfigs: busMantenimientoConfigs.length,
        dateRange:
          records.length > 0
            ? { from: records[records.length - 1].date, to: records[0].date }
            : null,
      },
    };

    return NextResponse.json(backup);
  } catch (error) {
    console.error('Backup error:', error);
    return NextResponse.json({ error: 'Error al generar respaldo completo' }, { status: 500 });
  }
}
