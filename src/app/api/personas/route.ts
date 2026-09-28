import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateSalt, hashPinWithSalt, verifyPin } from '@/lib/pin-hash';

// GET /api/personas — List all personas
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const rol = url.searchParams.get('rol');
    const esActual = url.searchParams.get('esActual');
    const socioId = url.searchParams.get('socioId');

    const where: Record<string, unknown> = {};
    if (rol) where.rol = rol;
    if (esActual !== null) where.esActual = esActual === 'true';
    if (socioId) where.socioId = socioId;

    const personas = await db.persona.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        socioId: true,
        nombre: true,
        cedula: true,
        telefono: true,
        rol: true,
        esActual: true,
        deviceId: true,
        deviceName: true,
        deviceLinkedAt: true,
        createdAt: true,
        updatedAt: true,
      },
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
    const { nombre, cedula, telefono, rol, pin, socioId } = body;

    if (!nombre || !pin || pin.length < 4) {
      return NextResponse.json({ error: 'Nombre y PIN válido (4+ dígitos) son obligatorios' }, { status: 400 });
    }

    const salt = generateSalt();
    const pinHash = hashPinWithSalt(pin.trim(), salt);

    // Check if PIN already exists by scanning personas
    const existingPersonas = await db.persona.findMany();
    const pinEnUso = existingPersonas.some(p => verifyPin(pin.trim(), p.pin, p.pinSalt));
    if (pinEnUso) {
      return NextResponse.json({ error: 'El PIN ya está en uso por otro usuario' }, { status: 400 });
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
        nombre: nombre.trim(),
        cedula: cedula ? cedula.trim() : null,
        telefono: telefono ? telefono.trim() : null,
        rol: rol || 'CONDUCTOR',
        pin: pinHash,
        pinSalt: salt,
        socioId: socioId || null,
        esActual,
      },
    });

    const { pin: _pin, pinSalt: _salt, ...safePersona } = persona;
    return NextResponse.json(safePersona, { status: 201 });
  } catch (error) {
    console.error('Error creating persona:', error);
    return NextResponse.json({ error: 'Error al crear personal' }, { status: 500 });
  }
}
