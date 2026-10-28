import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { DAILY_RECORD_LIST_SELECT } from '@/lib/canonical-record-payload';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const includePhoto = new URL(req.url).searchParams.get('photo') === 'true';

    // Fase 1 Optimización: solo consultar photoUrl en PostgreSQL cuando ?photo=true se solicita explícitamente
    const record = await db.dailyRecord.findUnique({
      where: { id },
      select: {
        ...DAILY_RECORD_LIST_SELECT,
        ...(includePhoto ? { photoUrl: true } : {}),
        trips: { orderBy: { order: 'asc' } },
        expenses: { orderBy: { order: 'asc' } },
      },
    });
    if (!record) {
      return NextResponse.json({ error: 'Registro no encontrado' }, { status: 404 });
    }

    return NextResponse.json(record);
  } catch (error) {
    console.error('Error fetching record:', error);
    return NextResponse.json({ error: 'Error al obtener registro' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.trip.deleteMany({ where: { recordId: id } });
    await db.dailyRecord.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting record:', error);
    return NextResponse.json({ error: 'Error al eliminar registro' }, { status: 500 });
  }
}
