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
