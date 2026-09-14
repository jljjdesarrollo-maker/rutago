import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const [records, personas] = await Promise.all([
      db.dailyRecord.findMany({
        orderBy: { date: 'desc' },
        include: {
          trips: { orderBy: { order: 'asc' } },
          expenses: { orderBy: { order: 'asc' } },
        },
      }),
      db.persona.findMany({
        orderBy: { nombre: 'asc' },
        select: {
          id: true,
          nombre: true,
          cedula: true,
          telefono: true,
          rol: true,
          esActual: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
    ]);

    const backup = {
      exportDate: new Date().toISOString(),
      version: 'v2.5-backup',
      app: 'rutago',
      records,
      personas,
      summary: {
        totalRecords: records.length,
        totalPersonas: personas.length,
        dateRange: records.length > 0
          ? { from: records[records.length - 1].date, to: records[0].date }
          : null,
      },
    };

    return NextResponse.json(backup);
  } catch (error) {
    console.error('Backup error:', error);
    return NextResponse.json({ error: 'Error al generar respaldo' }, { status: 500 });
  }
}
