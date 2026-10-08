import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateSalt, hashPinWithSalt, verifyPin } from '@/lib/pin-hash';

// GET /api/personas — List personas with optional socioId isolation
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const rol = url.searchParams.get('rol');
    const esActual = url.searchParams.get('esActual');
    const socioId = url.searchParams.get('socioId');
    const activoParam = url.searchParams.get('activo');
    const incluirInactivos = url.searchParams.get('incluirInactivos') === 'true';

    const where: Record<string, unknown> = {};
    if (rol) where.rol = rol;
    if (esActual !== null) where.esActual = esActual === 'true';

    if (activoParam !== null) {
      where.activo = activoParam === 'true';
    } else if (!incluirInactivos) {
      // Por defecto en listas operativas mostrar solo los activos
      where.activo = true;
    }

    if (socioId === 'SIN_SOCIO') {
      where.socioId = null;
    } else if (socioId && socioId !== 'TODOS') {
      where.socioId = socioId;
    }

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
        activo: true,
        desactivadoAt: true,
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
    return NextResponse.json(personas);
  } catch (error) {
    console.error('Error fetching personas:', error);
    return NextResponse.json({ error: 'Error al obtener personal' }, { status: 500 });
  }
}

// POST /api/personas — Create persona with cryptographic salt and socio scoping
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { nombre, cedula, telefono, rol, pin, socioId } = body;

    if (!nombre || !pin || pin.length < 4) {
      return NextResponse.json({ error: 'Nombre y PIN válido (4+ dígitos) son obligatorios' }, { status: 400 });
    }

    const cleanPin = pin.trim();

    // Check if PIN already exists by scanning personas and cuentas de socios
    const existingPersonas = await db.persona.findMany({ select: { id: true, pin: true, pinSalt: true } });
    const pinEnUsoPersona = existingPersonas.some(p => verifyPin(cleanPin, p.pin, p.pinSalt));
    if (pinEnUsoPersona) {
      return NextResponse.json({ error: 'El PIN ya está en uso por otro usuario del personal' }, { status: 400 });
    }

    const existingSocios = await db.cuentaSocio.findMany({ where: { activo: true }, select: { id: true, pinHash: true, pinSalt: true } });
    const pinEnUsoSocio = existingSocios.some(s => verifyPin(cleanPin, s.pinHash, s.pinSalt));
    if (pinEnUsoSocio) {
      return NextResponse.json({ error: 'El PIN ya está reservado por una cuenta de socio o administrador' }, { status: 400 });
    }

    const salt = generateSalt();
    const pinHash = hashPinWithSalt(cleanPin, salt);
    // Validación defensiva de Foreign Key socioId para evitar fallo P2003
    let targetSocioId: string | null = null;
    if (socioId && socioId !== "SIN_SOCIO" && socioId !== "TODOS") {
      const socioExiste = await db.cuentaSocio.findUnique({ where: { id: socioId } });
      if (socioExiste) {
        targetSocioId = socioExiste.id;
      } else {
        const fallbackSocio = await db.cuentaSocio.findFirst({ where: { activo: true } });
        targetSocioId = fallbackSocio?.id || null;
      }
    } else {
      const fallbackSocio = await db.cuentaSocio.findFirst({ where: { activo: true } });
      targetSocioId = fallbackSocio?.id || null;
    }

    // Aislamiento Multi-Tenant: Si se activa, desactivar otros del mismo rol SOLO para este socio
    const esActual = body.esActual || false;
    if (esActual && rol) {
      await db.persona.updateMany({
        where: {
          rol,
          esActual: true,
          socioId: targetSocioId,
        },
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
        socioId: targetSocioId,
        esActual,
        activo: true,
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
    return NextResponse.json(safePersona, { status: 201 });
  } catch (error: any) {
    console.error('Error creating persona:', error);
    if (error?.code === 'P2002') {
      return NextResponse.json(
        { error: 'El PIN o identificación ya está en uso por otro miembro del personal.' },
        { status: 400 }
      );
    }
    if (error?.code === 'P2003') {
      return NextResponse.json(
        { error: 'Error de relación: No se encontró la cuenta de socio asociada en la base de datos.' },
        { status: 400 }
      );
    }
    if (error?.message?.includes('connection pool') || error?.message?.includes('Timed out fetching')) {
      return NextResponse.json(
        { error: 'La base de datos estaba en reposo y se está reconectando. Por favor, pulsa Guardar una vez más.' },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: error?.message ? `Error al crear personal: ${error.message}` : 'Error al crear personal' },
      { status: 500 }
    );
  }
}
