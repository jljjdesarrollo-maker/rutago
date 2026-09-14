import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { ensureVTFrecuencias } from '@/lib/frecuencia-helper';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const vtCode = searchParams.get('vtCode');
    const all = searchParams.get('all');

    // Si se pide todas las frecuencias del sistema (para reasignación y selectores)
    if (all === 'true') {
      // 1. Asegurar catálogo de los VTs activos
      const busesVT = await prisma.busVT.findMany({
        where: { activo: true },
      });
      for (const bus of busesVT) {
        await ensureVTFrecuencias(prisma, bus.codigo);
      }

      const todasFrecuencias = await prisma.frecuencia.findMany({
        where: { activo: true },
        orderBy: [{ hora: 'asc' }, { ruta: 'asc' }],
      });

      return NextResponse.json(todasFrecuencias);
    }

    if (!vtCode) {
      return NextResponse.json({ error: 'vtCode requerido' }, { status: 400 });
    }

    // Asegura que las frecuencias de este VT existan en la tabla Frecuencia y las retorna
    const frecuencias = await ensureVTFrecuencias(prisma, vtCode);
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

    // Whitelist: solo permitir actualizar estos campos
    const ALLOWED: (keyof Record<string, unknown>)[] = ['hora', 'ruta', 'direccion', 'nombre', 'activo', 'vtCode'];
    const safeData: Record<string, unknown> = {};
    for (const key of ALLOWED) {
      if (key in data) safeData[key] = data[key];
    }

    const frecuencia = await prisma.frecuencia.update({
      where: { id },
      data: safeData,
    });

    return NextResponse.json(frecuencia);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error al actualizar frecuencia';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
