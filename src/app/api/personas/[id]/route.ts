import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/personas/[id] — Get single persona
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const persona = await db.persona.findUnique({ where: { id } });
    if (!persona) {
      return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
    }
    return NextResponse.json(persona);
  } catch (error) {
    console.error('Error fetching persona:', error);
    return NextResponse.json({ error: 'Error al obtener personal' }, { status: 500 });
  }
}

// PUT /api/personas/[id] — Update persona
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { nombre, cedula, telefono, rol, pin, esActual } = body;

    const existing = await db.persona.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
    }

    // If changing PIN, check uniqueness
    if (pin && pin !== existing.pin) {
      const pinExists = await db.persona.findUnique({ where: { pin } });
      if (pinExists) {
        return NextResponse.json({ error: 'El PIN ya esta en uso' }, { status: 400 });
      }
    }

    // If activating, deactivate others of same role
    if (esActual && rol) {
      await db.persona.updateMany({
        where: { rol, esActual: true, id: { not: id } },
        data: { esActual: false },
      });
    }

    const persona = await db.persona.update({
      where: { id },
      data: {
        ...(nombre && { nombre }),
        ...(cedula !== undefined && { cedula: cedula || null }),
        ...(telefono !== undefined && { telefono: telefono || null }),
        ...(rol && { rol }),
        ...(pin && { pin }),
        ...(esActual !== undefined && { esActual }),
      },
    });

    return NextResponse.json(persona);
  } catch (error) {
    console.error('Error updating persona:', error);
    return NextResponse.json({ error: 'Error al actualizar personal' }, { status: 500 });
  }
}

// DELETE /api/personas/[id] — Delete persona
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await db.persona.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting persona:', error);
    return NextResponse.json({ error: 'Error al eliminar personal' }, { status: 500 });
  }
}
