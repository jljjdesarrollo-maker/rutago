import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/saas/suscripciones — Listar o consultar estado de suscripción
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const busId = searchParams.get('busId');
    const socioId = searchParams.get('socioId');

    const where: any = {};
    if (busId) where.busId = busId;
    if (socioId) where.socioId = socioId;

    const suscripciones = await db.suscripcionBus.findMany({
      where,
      include: {
        bus: {
          select: {
            id: true,
            numeroDisco: true,
            placa: true,
            propietario: true,
            tipoOperacion: true,
            activo: true,
          },
        },
        socio: {
          select: {
            id: true,
            nombre: true,
            cedula: true,
            email: true,
            telefono: true,
            esFundadorSaaS: true,
          },
        },
        pagos: {
          orderBy: { fechaPago: 'desc' },
          take: 5,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Evaluar estados dinámicos respecto a la fecha de corte
    const hoy = new Date();
    const suscripcionesConEstado = suscripciones.map((s) => {
      let estadoCalculado = s.estado;
      if (s.fechaProximoCorte) {
        const corte = new Date(s.fechaProximoCorte);
        const diasDiferencia = Math.ceil((corte.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));

        if (diasDiferencia < 0) {
          // Si pasaron más de 5 días de gracia tras corte
          estadoCalculado = diasDiferencia < -5 ? 'VENCIDA' : 'GRACIA';
        } else if (diasDiferencia <= 5) {
          estadoCalculado = 'POR_VENCER';
        }
      }
      return {
        ...s,
        estadoVigente: estadoCalculado,
      };
    });

    return NextResponse.json(suscripcionesConEstado);
  } catch (error) {
    console.error('Error fetching suscripciones:', error);
    return NextResponse.json({ error: 'Error al obtener suscripciones' }, { status: 500 });
  }
}

// POST /api/saas/suscripciones — Registrar pago de suscripción o actualizar estado
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { suscripcionId, monto, metodoPago, numeroComprobante, comprobanteUrl, registradoPor, notas } = body;

    if (!suscripcionId || !monto) {
      return NextResponse.json({ error: 'Faltan parámetros obligatorios' }, { status: 400 });
    }

    const suscripcion = await db.suscripcionBus.findUnique({
      where: { id: suscripcionId },
    });

    if (!suscripcion) {
      return NextResponse.json({ error: 'Suscripción no encontrada' }, { status: 404 });
    }

    // Registrar pago
    const fechaPago = new Date();
    const pago = await db.pagoSuscripcion.create({
      data: {
        suscripcionId,
        monto: Number(monto),
        fechaPago,
        metodoPago: metodoPago || 'TRANSFERENCIA',
        numeroComprobante,
        comprobanteUrl,
        registradoPor: registradoPor || 'SISTEMA',
        notas,
      },
    });

    // Extender próximo corte al siguiente mes
    const fechaBase = suscripcion.fechaProximoCorte && new Date(suscripcion.fechaProximoCorte) > fechaPago
      ? new Date(suscripcion.fechaProximoCorte)
      : fechaPago;

    const proximoCorte = new Date(fechaBase.getFullYear(), fechaBase.getMonth() + 1, suscripcion.diaCorteMensual);

    const suscripcionActualizada = await db.suscripcionBus.update({
      where: { id: suscripcionId },
      data: {
        fechaUltimoPago: fechaPago,
        fechaProximoCorte: proximoCorte,
        estado: 'ACTIVA',
      },
    });

    return NextResponse.json({
      success: true,
      pago,
      suscripcion: suscripcionActualizada,
    });
  } catch (error) {
    console.error('Error processing pago suscripcion:', error);
    return NextResponse.json({ error: 'Error al procesar el pago' }, { status: 500 });
  }
}

// PUT /api/saas/suscripciones — Modificar parámetros de suscripción (monto, estado, corte)
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, busId, socioId, estado, montoMensual, diaCorteMensual, fechaProximoCorte, notasAdmin } = body;

    if (!id && !busId) {
      return NextResponse.json({ error: 'Se requiere id o busId' }, { status: 400 });
    }

    const where = id ? { id } : { busId };
    let sub = await db.suscripcionBus.findUnique({ where });

    if (!sub && busId && socioId) {
      // Crear suscripción si no existía para la unidad
      const hoy = new Date();
      const corte = fechaProximoCorte ? new Date(fechaProximoCorte) : new Date(hoy.getFullYear(), hoy.getMonth() + 1, diaCorteMensual || 5);
      sub = await db.suscripcionBus.create({
        data: {
          busId,
          socioId,
          montoMensual: montoMensual ? Number(montoMensual) : 20.0,
          diaCorteMensual: diaCorteMensual ? Number(diaCorteMensual) : 5,
          fechaInicio: hoy,
          fechaProximoCorte: corte,
          estado: estado || 'ACTIVA',
          notasAdmin,
        },
      });
      return NextResponse.json({ success: true, suscripcion: sub });
    }

    if (!sub) {
      return NextResponse.json({ error: 'Suscripción no encontrada' }, { status: 404 });
    }

    const updateData: any = {};
    if (estado) updateData.estado = estado;
    if (montoMensual !== undefined) updateData.montoMensual = Number(montoMensual);
    if (diaCorteMensual !== undefined) updateData.diaCorteMensual = Number(diaCorteMensual);
    if (fechaProximoCorte) updateData.fechaProximoCorte = new Date(fechaProximoCorte);
    if (notasAdmin !== undefined) updateData.notasAdmin = notasAdmin;
    if (socioId) updateData.socioId = socioId;

    const actualizada = await db.suscripcionBus.update({
      where: { id: sub.id },
      data: updateData,
    });

    return NextResponse.json({ success: true, suscripcion: actualizada });
  } catch (error) {
    console.error('Error updating suscripcion:', error);
    return NextResponse.json({ error: 'Error al actualizar suscripción' }, { status: 500 });
  }
}

