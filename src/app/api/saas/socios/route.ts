import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateSalt, hashPinWithSalt } from '@/lib/pin-hash';

// GET /api/saas/socios — Listar socios con sus unidades físicas y suscripciones
export async function GET() {
  try {
    const socios = await db.cuentaSocio.findMany({
      select: {
        id: true,
        cedula: true,
        nombre: true,
        email: true,
        telefono: true,
        rol: true,
        activo: true,
        esFundadorSaaS: true,
        createdAt: true,
        buses: {
          select: {
            id: true,
            numeroDisco: true,
            placa: true,
            tipoOperacion: true,
            activo: true,
            suscripcion: {
              select: {
                id: true,
                estado: true,
                montoMensual: true,
                diaCorteMensual: true,
                fechaProximoCorte: true,
              },
            },
          },
        },
        personal: {
          select: {
            id: true,
            nombre: true,
            rol: true,
          },
        },
      },
      orderBy: { nombre: 'asc' },
    });

    return NextResponse.json(socios);
  } catch (error) {
    console.error('Error fetching socios:', error);
    return NextResponse.json({ error: 'Error al obtener lista de socios' }, { status: 500 });
  }
}

// POST /api/saas/socios — Crear nuevo socio con PIN seguro (cero hardcode)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { cedula, nombre, email, telefono, pin, rol, busId } = body;

    if (!cedula || !nombre || !pin || pin.length < 4) {
      return NextResponse.json({ error: 'Cédula, nombre y PIN válido de 4+ dígitos requeridos' }, { status: 400 });
    }

    // Verificar unicidad de cédula
    const existente = await db.cuentaSocio.findUnique({
      where: { cedula },
    });

    if (existente) {
      return NextResponse.json({ error: 'Ya existe un socio registrado con esa cédula' }, { status: 409 });
    }

    const salt = generateSalt();
    const pinHash = hashPinWithSalt(pin.trim(), salt);

    const nuevoSocio = await db.cuentaSocio.create({
      data: {
        cedula: cedula.trim(),
        nombre: nombre.trim(),
        email: email ? email.trim() : null,
        telefono: telefono ? telefono.trim() : null,
        pinHash,
        pinSalt: salt,
        rol: rol === 'SUPERADMIN_SAAS' ? 'SUPERADMIN_SAAS' : 'SOCIO',
        activo: true,
        esFundadorSaaS: false,
      },
    });

    // Si se especificó un bus a vincular
    if (busId) {
      const bus = await db.bus.update({
        where: { id: busId },
        data: { socioId: nuevoSocio.id },
      }).catch(err => console.error('Error asociando bus:', err));

      if (bus) {
        // Crear suscripción activa para la nueva unidad
        const hoy = new Date();
        const proximoCorte = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 5);
        await db.suscripcionBus.create({
          data: {
            busId: bus.id,
            socioId: nuevoSocio.id,
            montoMensual: 20.00,
            diaCorteMensual: 5,
            fechaInicio: hoy,
            fechaProximoCorte: proximoCorte,
            estado: 'ACTIVA',
          },
        }).catch(err => console.error('Error creando suscripcion inicial:', err));
      }
    }

    return NextResponse.json({
      success: true,
      socio: {
        id: nuevoSocio.id,
        cedula: nuevoSocio.cedula,
        nombre: nuevoSocio.nombre,
        rol: nuevoSocio.rol,
      },
    });
  } catch (error) {
    console.error('Error creating socio:', error);
    return NextResponse.json({ error: 'Error al registrar el socio' }, { status: 500 });
  }
}

// PUT /api/saas/socios — Actualizar datos de un socio, resetear PIN o asignar unidad
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, nombre, email, telefono, pin, activo, rol, busIdAsignar, busIdDesvincular } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID de socio requerido' }, { status: 400 });
    }

    const socio = await db.cuentaSocio.findUnique({ where: { id } });
    if (!socio) {
      return NextResponse.json({ error: 'Socio no encontrado' }, { status: 404 });
    }

    const dataToUpdate: any = {};
    if (nombre !== undefined) dataToUpdate.nombre = nombre.trim();
    if (email !== undefined) dataToUpdate.email = email ? email.trim() : null;
    if (telefono !== undefined) dataToUpdate.telefono = telefono ? telefono.trim() : null;
    if (activo !== undefined) dataToUpdate.activo = Boolean(activo);
    if (rol !== undefined && (rol === 'SOCIO' || rol === 'SUPERADMIN_SAAS')) {
      dataToUpdate.rol = rol;
    }

    // Reset de PIN si se proporcionó uno nuevo
    if (pin && typeof pin === 'string' && pin.trim().length >= 4) {
      const salt = generateSalt();
      dataToUpdate.pinHash = hashPinWithSalt(pin.trim(), salt);
      dataToUpdate.pinSalt = salt;
    }

    const socioActualizado = await db.cuentaSocio.update({
      where: { id },
      data: dataToUpdate,
    });

    // Vincular bus
    if (busIdAsignar) {
      await db.bus.update({
        where: { id: busIdAsignar },
        data: { socioId: id },
      }).catch(err => console.error('Error asociando bus:', err));
    }

    // Desvincular bus
    if (busIdDesvincular) {
      await db.bus.update({
        where: { id: busIdDesvincular },
        data: { socioId: null },
      }).catch(err => console.error('Error desvinculando bus:', err));
    }

    return NextResponse.json({
      success: true,
      socio: {
        id: socioActualizado.id,
        cedula: socioActualizado.cedula,
        nombre: socioActualizado.nombre,
        activo: socioActualizado.activo,
        rol: socioActualizado.rol,
      },
    });
  } catch (error) {
    console.error('Error updating socio:', error);
    return NextResponse.json({ error: 'Error al actualizar el socio' }, { status: 500 });
  }
}

// DELETE /api/saas/socios?id=... — Desactivar socio (soft delete defensivo)
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID de socio requerido' }, { status: 400 });
    }

    const socio = await db.cuentaSocio.findUnique({ where: { id } });
    if (!socio) {
      return NextResponse.json({ error: 'Socio no encontrado' }, { status: 404 });
    }

    // Impedir desactivación del socio fundador
    if (socio.esFundadorSaaS) {
      return NextResponse.json({ error: 'No se puede desactivar la cuenta del Socio Fundador' }, { status: 403 });
    }

    await db.cuentaSocio.update({
      where: { id },
      data: { activo: false },
    });

    return NextResponse.json({ success: true, message: 'Socio desactivado correctamente' });
  } catch (error) {
    console.error('Error deleting socio:', error);
    return NextResponse.json({ error: 'Error al desactivar socio' }, { status: 500 });
  }
}

