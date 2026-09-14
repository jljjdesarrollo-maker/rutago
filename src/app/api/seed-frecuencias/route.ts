import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const { vtCode, frecuencias } = await request.json();

    if (!vtCode || !Array.isArray(frecuencias)) {
      return NextResponse.json({ error: 'vtCode y frecuencias requeridos' }, { status: 400 });
    }

    const results = [];
    for (const f of frecuencias) {
      const frec = await prisma.frecuencia.upsert({
        where: { id: f.id },
        create: {
          id: f.id,
          vtCode,
          nombre: f.nombre,
          ruta: f.ruta,
          hora: f.hora,
          direccion: f.direccion || 'ida',
          activo: true,
        },
        update: {
          nombre: f.nombre,
          ruta: f.ruta,
          hora: f.hora,
          direccion: f.direccion || 'ida',
          activo: true,
        },
      });
      results.push(frec);
    }

    return NextResponse.json({ success: true, count: results.length });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error al sembrar frecuencias';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
