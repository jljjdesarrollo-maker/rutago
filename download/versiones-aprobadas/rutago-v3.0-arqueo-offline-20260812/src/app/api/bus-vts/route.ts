import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET all active VTs
export async function GET() {
  try {
    const vts = await prisma.busVT.findMany({
      where: { activo: true },
    });

    // Sort numerically by VT number
    const sorted = vts.sort((a, b) => {
      const numA = parseInt(a.codigo.replace('VT', '')) || 0;
      const numB = parseInt(b.codigo.replace('VT', '')) || 0;
      return numA - numB;
    });

    return NextResponse.json(sorted);
  } catch (error) {
    console.error('Error fetching VTs:', error);
    return NextResponse.json({ error: 'Error al obtener VTs' }, { status: 500 });
  }
}

// PUT - update frequencies of a VT
export async function PUT(request: Request) {
  try {
    const { id, frecuencias, nombre, activo } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }

    const updated = await prisma.busVT.update({
      where: { id },
      data: {
        ...(frecuencias !== undefined && { frecuencias }),
        ...(nombre !== undefined && { nombre }),
        ...(activo !== undefined && { activo }),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating VT:', error);
    return NextResponse.json({ error: 'Error al actualizar VT' }, { status: 500 });
  }
}
