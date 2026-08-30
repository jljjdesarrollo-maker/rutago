import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { VT_DATA } from '@/lib/seed-vts';

const prisma = new PrismaClient();

// GET all active VTs (auto-seeds first to ensure DB is up to date)
export async function GET() {
  try {
    // Auto-seed: ensure all VT_DATA entries exist in DB
    for (const vt of VT_DATA) {
      const existing = await prisma.busVT.findUnique({
        where: { codigo: vt.codigo },
      });
      if (!existing) {
        await prisma.busVT.create({
          data: {
            codigo: vt.codigo,
            nombre: vt.nombre,
            frecuencias: vt.frecuencias as any,
            activo: true,
          },
        });
      }
    }

    const vts = await prisma.busVT.findMany({
      where: { activo: true },
    });

    // Sort: VTs by number first, then P units by number
    const sorted = vts.sort((a, b) => {
      const numA = parseInt(a.codigo.replace(/^(VT|P)/, '')) || 0;
      const numB = parseInt(b.codigo.replace(/^(VT|P)/, '')) || 0;
      const isPA = a.codigo.startsWith('P') ? 1 : 0;
      const isPB = b.codigo.startsWith('P') ? 1 : 0;
      return isPA !== isPB ? isPA - isPB : numA - numB;
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
