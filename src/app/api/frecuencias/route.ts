import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const vtCode = searchParams.get('vtCode');

    if (!vtCode) {
      return NextResponse.json({ error: 'vtCode requerido' }, { status: 400 });
    }

    const frecuencias = await prisma.frecuencia.findMany({
      where: { vtCode, activo: true },
      orderBy: { hora: 'asc' },
    });

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
