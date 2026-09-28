import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const start = Date.now();
  try {
    // 1. Verificar conectividad y latencia
    await db.$queryRaw`SELECT 1`;
    const latencyMs = Date.now() - start;

    // 2. Conteo de entidades clave
    const [
      cuentasSocioCount,
      busesCount,
      suscripcionesCount,
      pagosCount,
      personasCount,
      dailyRecordsCount,
      ventasBoletoCount,
      ownerExpensesCount,
      busesVTCount,
      pagosRecientes,
    ] = await Promise.all([
      db.cuentaSocio.count(),
      db.bus.count(),
      db.suscripcionBus.count(),
      db.pagoSuscripcion.count(),
      db.persona.count(),
      db.dailyRecord.count(),
      db.ventaBoleto.count(),
      db.ownerExpense.count(),
      db.busVT.count(),
      db.pagoSuscripcion.findMany({
        take: 10,
        orderBy: { fechaPago: 'desc' },
        include: {
          suscripcion: {
            include: {
              bus: { select: { numeroDisco: true, placa: true } },
              socio: { select: { nombre: true } },
            },
          },
        },
      }),
    ]);

    // 3. Suscripciones para análisis de estados
    const suscripciones = await db.suscripcionBus.findMany({
      include: {
        bus: { select: { numeroDisco: true, placa: true, activo: true } },
        socio: { select: { nombre: true, cedula: true } },
      },
    });

    const hoy = new Date();
    const currentMonthPrefix = hoy.toISOString().slice(0, 7);

    let mrrProyectado = 0;
    let activas = 0;
    let porVencer = 0;
    let gracia = 0;
    let vencidas = 0;

    for (const sub of suscripciones) {
      mrrProyectado += sub.montoMensual;
      if (sub.fechaProximoCorte) {
        const corte = new Date(sub.fechaProximoCorte);
        const diffDays = Math.ceil((corte.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays < -5) {
          vencidas++;
        } else if (diffDays < 0) {
          gracia++;
        } else if (diffDays <= 5) {
          porVencer++;
        } else {
          activas++;
        }
      } else {
        if (sub.estado === 'ACTIVA') activas++;
        else vencidas++;
      }
    }

    // 4. Pagos recaudados este mes
    const pagosMes = await db.pagoSuscripcion.findMany({
      where: {
        fechaPago: {
          gte: new Date(hoy.getFullYear(), hoy.getMonth(), 1),
        },
      },
    });
    const recaudadoMes = pagosMes.reduce((sum, p) => sum + p.monto, 0);

    return NextResponse.json({
      success: true,
      database: {
        status: 'ONLINE',
        latencyMs,
        provider: 'PostgreSQL / Prisma ORM',
        connectedAt: new Date().toISOString(),
      },
      tablas: {
        cuentasSocio: cuentasSocioCount,
        buses: busesCount,
        suscripciones: suscripcionesCount,
        pagosRegistrados: pagosCount,
        personal: personasCount,
        dailyRecords: dailyRecordsCount,
        ventasBoleto: ventasBoletoCount,
        ownerExpenses: ownerExpensesCount,
        busesVT: busesVTCount,
      },
      mrrMetrics: {
        totalBuses: busesCount,
        mrrProyectado,
        recaudadoMes,
        tasaCobranzaPct: mrrProyectado > 0 ? Math.round((recaudadoMes / mrrProyectado) * 100) : 0,
        estados: {
          activas,
          porVencer,
          gracia,
          vencidas,
        },
      },
      pagosRecientes: pagosRecientes.map(p => ({
        id: p.id,
        monto: p.monto,
        fechaPago: p.fechaPago,
        metodoPago: p.metodoPago,
        numeroComprobante: p.numeroComprobante,
        registradoPor: p.registradoPor,
        notas: p.notas,
        busDisco: p.suscripcion?.bus?.numeroDisco || 'N/A',
        busPlaca: p.suscripcion?.bus?.placa || 'N/A',
        socioNombre: p.suscripcion?.socio?.nombre || 'N/A',
      })),
      system: {
        uptime: process.uptime(),
        nodeVersion: process.version,
        environment: process.env.NODE_ENV || 'production',
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error en auditoría SaaS:', error);
    return NextResponse.json(
      {
        success: false,
        database: {
          status: 'OFFLINE_O_ERROR',
          latencyMs: -1,
          error: error instanceof Error ? error.message : 'Error desconocido',
        },
        tablas: {
          cuentasSocio: 0,
          buses: 0,
          suscripciones: 0,
          pagosRegistrados: 0,
          personal: 0,
          dailyRecords: 0,
          ventasBoleto: 0,
          ownerExpenses: 0,
          busesVT: 0,
        },
        mrrMetrics: {
          totalBuses: 0,
          mrrProyectado: 0,
          recaudadoMes: 0,
          tasaCobranzaPct: 0,
          estados: { activas: 0, porVencer: 0, gracia: 0, vencidas: 0 },
        },
        pagosRecientes: [],
      },
      { status: 500 }
    );
  }
}
