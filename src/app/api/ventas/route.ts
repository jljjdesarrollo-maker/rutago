import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      fecha, vtCode, frecuenciaId, ruta, parada, tipo, pasajeroTipo,
      tarifaOficial, cobrado, hora, ayudanteId, ayudanteNombre,
      createdAt, localId, lat, lng
    } = body;

    // Validacion server-side
    if (!fecha || !vtCode) {
      return NextResponse.json({ error: 'fecha y vtCode son obligatorios' }, { status: 400 });
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

    const venta = await prisma.ventaBoleto.create({
      data: {
        fecha,
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
        createdAt: createdAt ? new Date(createdAt) : undefined,
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
        ...(fecha ? { fecha } : {}),
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(ventas);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error al obtener ventas';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
