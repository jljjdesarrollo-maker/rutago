import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { VT_DATA } from '@/lib/seed-vts';

const prisma = new PrismaClient();

// POST - seed VTs (upsert: crea o actualiza frecuencias)
export async function POST() {
  try {
    let created = 0;
    let updated = 0;

    for (const vt of VT_DATA) {
      const existing = await prisma.busVT.findUnique({
        where: { codigo: vt.codigo },
      });

      if (existing) {
        await prisma.busVT.update({
          where: { codigo: vt.codigo },
          data: {
            nombre: vt.nombre,
            frecuencias: vt.frecuencias as any,
          },
        });
        updated++;
      } else {
        await prisma.busVT.create({
          data: {
            codigo: vt.codigo,
            nombre: vt.nombre,
            frecuencias: vt.frecuencias as any,
            activo: true,
          },
        });
        created++;
      }
    }

    return NextResponse.json({
      message: `Seed completado: ${created} creados, ${updated} actualizados`,
      created,
      updated,
      total: VT_DATA.length,
    });
  } catch (error) {
    console.error('Error seeding VTs:', error);
    return NextResponse.json({ error: 'Error al ejecutar seed' }, { status: 500 });
  }
}
