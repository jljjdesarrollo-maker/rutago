import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

const FIRST_ADMIN_PIN = '2107';

// POST /api/auth — Login by PIN
export async function POST(req: NextRequest) {
  try {
    const { pin } = await req.json();

    if (!pin || pin.length < 4) {
      return NextResponse.json({ error: 'PIN invalido' }, { status: 400 });
    }

    // If no users exist, auto-create admin with first PIN
    const count = await db.persona.count();
    if (count === 0 && pin === FIRST_ADMIN_PIN) {
      const admin = await db.persona.create({
        data: {
          nombre: 'Administrador',
          cedula: null,
          telefono: null,
          rol: 'ADMIN',
          pin: FIRST_ADMIN_PIN,
          esActual: false,
        },
      });
      return NextResponse.json({
        id: admin.id,
        nombre: admin.nombre,
        rol: admin.rol,
      });
    }

    const persona = await db.persona.findUnique({
      where: { pin },
    });

    if (!persona) {
      return NextResponse.json({ error: 'PIN no encontrado' }, { status: 401 });
    }

    return NextResponse.json({
      id: persona.id,
      nombre: persona.nombre,
      rol: persona.rol,
    });
  } catch (error) {
    console.error('Error authenticating:', error);
    return NextResponse.json({ error: 'Error de autenticacion' }, { status: 500 });
  }
}
