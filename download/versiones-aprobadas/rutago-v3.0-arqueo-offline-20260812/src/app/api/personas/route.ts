import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/personas — List all personas
export async function GET() {
  try {
    const personas = await db.persona.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(personas);
  } catch (error) {
    console.error('Error fetching personas:', error);
    return NextResponse.json({ error: 'Error al obtener personal' }, { status: 500 });
  }
}

// POST /api/personas — Create persona
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { nombre, cedula, telefono, rol, pin } = body;

    if (!nombre || !pin) {
      return NextResponse.json({ error: 'Nombre y PIN son obligatorios' }, { status: 400 });
    }

    // Check if PIN already exists
    const existing = await db.persona.findUnique({ where: { pin } });
    if (existing) {
      return NextResponse.json({ error: 'El PIN ya esta en uso' }, { status: 400 });
    }

    // If setting as current, deactivate others of same role
    const esActual = body.esActual || false;
    if (esActual && rol) {
      await db.persona.updateMany({
        where: { rol, esActual: true },
        data: { esActual: false },
      });
    }

    const persona = await db.persona.create({
      data: {
        nombre,
        cedula: cedula || null,
        telefono: telefono || null,
        rol: rol || 'CONDUCTOR',
        pin,
        esActual,
      },
    });

    return NextResponse.json(persona, { status: 201 });
  } catch (error) {
    console.error('Error creating persona:', error);
    return NextResponse.json({ error: 'Error al crear personal' }, { status: 500 });
  }
}
