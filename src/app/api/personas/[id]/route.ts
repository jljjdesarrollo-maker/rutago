import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateSalt, hashPinWithSalt, verifyPin } from '@/lib/pin-hash';

// GET /api/personas/[id] — Get single persona
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const persona = await db.persona.findUnique({
      where: { id },
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
        socio: {
          select: {
            id: true,
            nombre: true,
            cedula: true,
          },
        },
      },
    });
    if (!persona) {
      return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
    }
    return NextResponse.json(persona);
  } catch (error) {
    console.error('Error fetching persona:', error);
    return NextResponse.json({ error: 'Error al obtener personal' }, { status: 500 });
  }
}

// PUT /api/personas/[id] — Update persona with salted hash and socio isolation
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { nombre, cedula, telefono, rol, pin, esActual, deviceId, deviceName, resetDevice, socioId } = body;

    const existing = await db.persona.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
    }

    const updatePinData: { pin?: string; pinSalt?: string } = {};

    // Si se envía nuevo PIN, verificar unicidad criptográfica
    if (pin && typeof pin === 'string' && pin.trim().length >= 4) {
      const cleanPin = pin.trim();

      const otherPersonas = await db.persona.findMany({ where: { id: { not: id } } });
      const pinEnUsoPersona = otherPersonas.some(p => verifyPin(cleanPin, p.pin, p.pinSalt));
      if (pinEnUsoPersona) {
        return NextResponse.json({ error: 'El PIN ya está en uso por otro miembro del personal' }, { status: 400 });
      }

      const socios = await db.cuentaSocio.findMany({ where: { activo: true } });
      const pinEnUsoSocio = socios.some(s => verifyPin(cleanPin, s.pinHash, s.pinSalt));
      if (pinEnUsoSocio) {
        return NextResponse.json({ error: 'El PIN ya está reservado por una cuenta de socio o administrador' }, { status: 400 });
      }

      const newSalt = generateSalt();
      const newHash = hashPinWithSalt(cleanPin, newSalt);
      updatePinData.pin = newHash;
      updatePinData.pinSalt = newSalt;
    }

    const targetSocioId = socioId !== undefined ? (socioId || null) : existing.socioId;

    // Si se activa este registro, desactivar otros del mismo rol SOLO dentro del mismo socio
    if (esActual && (rol || existing.rol)) {
      const targetRol = rol || existing.rol;
      await db.persona.updateMany({
        where: {
          rol: targetRol,
          socioId: targetSocioId,
          esActual: true,
          id: { not: id },
        },
        data: { esActual: false },
      });
    }

    const persona = await db.persona.update({
      where: { id },
      data: {
        ...(nombre && { nombre: nombre.trim() }),
        ...(cedula !== undefined && { cedula: cedula ? cedula.trim() : null }),
        ...(telefono !== undefined && { telefono: telefono ? telefono.trim() : null }),
        ...(rol && { rol }),
        ...(socioId !== undefined && { socioId: targetSocioId }),
        ...updatePinData,
        ...(esActual !== undefined && { esActual }),
        ...(resetDevice
          ? { deviceId: null, deviceName: null, deviceLinkedAt: null }
          : {
              ...(deviceId !== undefined && { deviceId }),
              ...(deviceName !== undefined && { deviceName }),
            }),
      },
      include: {
        socio: {
          select: {
            id: true,
            nombre: true,
            cedula: true,
          },
        },
      },
    });

    const { pin: _pin, pinSalt: _salt, ...safePersona } = persona;
    return NextResponse.json(safePersona);
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
