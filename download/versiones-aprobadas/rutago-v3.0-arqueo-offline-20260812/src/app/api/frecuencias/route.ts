import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface VTJsonFrecuencia {
  routeFrom: string;
  routeTo: string;
  time: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const vtCode = searchParams.get('vtCode');

    if (!vtCode) {
      return NextResponse.json({ error: 'vtCode requerido' }, { status: 400 });
    }

    // 1. Buscar en tabla Frecuencia (boletos)
    let frecuencias = await prisma.frecuencia.findMany({
      where: { vtCode, activo: true },
      orderBy: { hora: 'asc' },
    });

    // 2. Si no hay, tomar del JSON del BusVT (control-transporte)
    if (frecuencias.length === 0) {
      const busVT = await prisma.busVT.findUnique({
        where: { codigo: vtCode },
      });

      if (busVT && Array.isArray(busVT.frecuencias) && busVT.frecuencias.length > 0) {
        const jsonFrecs = busVT.frecuencias as VTJsonFrecuencia[];
        // Convertir formato JSON a formato FrecuenciaData
        // Cada registro: routeFrom="Loja", routeTo="Vilcabamba", time="06:15"
        frecuencias = jsonFrecs.map((f, idx) => {
          const from = f.routeFrom || 'Loja';
          const to = f.routeTo || 'Vilcabamba';
          const esIda = from === 'Loja';
          return {
            id: `${vtCode}_frec_${idx}`,
            vtCode,
            nombre: `${from}-${to}`,
            ruta: `${from} - ${to}`,
            hora: f.time,
            direccion: esIda ? 'ida' : 'vuelta',
            activo: true,
            createdAt: new Date().toISOString(),
          };
        });
      }
    }

    return NextResponse.json(frecuencias);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error al obtener frecuencias';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json({ error: 'id requerido' }, { status: 400 });
    }

    const frecuencia = await prisma.frecuencia.update({
      where: { id },
      data,
    });

    return NextResponse.json(frecuencia);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error al actualizar frecuencia';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
