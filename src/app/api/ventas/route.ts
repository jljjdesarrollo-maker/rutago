import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      fecha, fechaOperacion, diaTurno, fechaEmision,
      vtCode, frecuenciaId, ruta, parada, tipo, pasajeroTipo,
      tarifaOficial, cobrado, hora, ayudanteId, ayudanteNombre,
      createdAt, localId, lat, lng
    } = body;

    const opFecha = (fechaOperacion || fecha) as string;

    // Validación server-side
    if (!opFecha || !vtCode) {
      return NextResponse.json({ error: 'fecha/fechaOperacion y vtCode son obligatorios' }, { status: 400 });
    }

    const cobradoNum = parseFloat(cobrado);
    if (isNaN(cobradoNum) || cobradoNum < 0) {
      return NextResponse.json({ error: 'cobrado debe ser un numero >= 0' }, { status: 400 });
    }

    const tarifaNum = parseFloat(tarifaOficial) || 0;
    if (tarifaNum < 0) {
      return NextResponse.json({ error: 'tarifaOficial debe ser >= 0' }, { status: 400 });
    }

    let validFrecuenciaId: string | null = null;
    if (frecuenciaId) {
      try {
        const frec = await prisma.frecuencia.findUnique({ where: { id: frecuenciaId } });
        if (frec) validFrecuenciaId = frecuenciaId;
      } catch {
        validFrecuenciaId = null;
      }
    }

    const emisionDate = fechaEmision ? new Date(fechaEmision) : (createdAt ? new Date(createdAt) : new Date());
    const diaNum = typeof diaTurno === 'number' ? diaTurno : 1;

    const venta = await prisma.ventaBoleto.create({
      data: {
        fecha: opFecha,
        fechaOperacion: opFecha,
        diaTurno: diaNum,
        vtCode,
        frecuenciaId: validFrecuenciaId,
        ruta,
        parada,
        tipo,
        pasajeroTipo: pasajeroTipo || 'normal',
        tarifaOficial: tarifaNum,
        cobrado: parseFloat(cobrado) || 0,
        hora,
        ayudanteId,
        ayudanteNombre,
        ...(lat != null ? { lat: parseFloat(lat) } : {}),
        ...(lng != null ? { lng: parseFloat(lng) } : {}),
        syncStatus: 'synced',
        fechaEmision: emisionDate,
        syncedAt: new Date(),
        createdAt: createdAt ? new Date(createdAt) : emisionDate,
      },
      include: {
        frecuencia: true,
      },
    });

    return NextResponse.json({ success: true, venta, localId });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error al guardar venta';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const vtCode = searchParams.get('vtCode');
    const fecha = searchParams.get('fecha');

    const ventas = await prisma.ventaBoleto.findMany({
      where: {
        ...(vtCode ? { vtCode } : {}),
        ...(fecha ? {
          OR: [
            { fechaOperacion: fecha },
            { fecha: fecha },
          ],
        } : {}),
      },
      include: {
        frecuencia: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(ventas);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error al obtener ventas';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const vtCode = searchParams.get('vtCode');
    const fecha = searchParams.get('fecha');

    if (!vtCode || !fecha) {
      return NextResponse.json(
        { error: 'vtCode y fecha son requeridos para la eliminacion' },
        { status: 400 }
      );
    }

    // Listar boletos objetivo para trazabilidad
    const boletosAEliminar = await prisma.ventaBoleto.findMany({
      where: {
        vtCode,
        OR: [
          { fechaOperacion: fecha },
          { fecha: fecha },
        ],
      },
      select: {
        id: true,
        vtCode: true,
        fecha: true,
        fechaOperacion: true,
        hora: true,
        parada: true,
        cobrado: true,
        ayudanteNombre: true,
      },
    });

    // Eliminacion en lote segura
    const result = await prisma.ventaBoleto.deleteMany({
      where: {
        vtCode,
        OR: [
          { fechaOperacion: fecha },
          { fecha: fecha },
        ],
      },
    });

    return NextResponse.json({
      success: true,
      count: result.count,
      deletedTickets: boletosAEliminar,
      message: `Se eliminaron exitosamente ${result.count} boletos del grupo ${vtCode} para la fecha ${fecha}`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error al eliminar ventas';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
