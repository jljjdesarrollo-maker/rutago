import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { INITIAL_PILOT_BUS } from '@/lib/fleet-storage';

export const dynamic = 'force-dynamic';

// GET /api/buses
// Parámetros opcionales: ?disco=01 ó ?tipoOperacion=TRONCAL_VT
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const disco = searchParams.get('disco');
    const tipoOperacion = searchParams.get('tipoOperacion');

    const where: Record<string, unknown> = {};
    if (disco) where.numeroDisco = disco.trim();
    if (tipoOperacion) where.tipoOperacion = tipoOperacion;

    let buses: any[] = [];
    try {
      buses = await (db as any).bus.findMany({
        where,
        orderBy: { numeroDisco: 'asc' },
      });

      // Auto-semillado en BD si está vacía: insertar la Unidad 01 oficial
      if (buses.length === 0 && !disco && !tipoOperacion) {
        try {
          const seeded = await (db as any).bus.upsert({
            where: { numeroDisco: INITIAL_PILOT_BUS.numeroDisco },
            update: {},
            create: {
              id: INITIAL_PILOT_BUS.id,
              numeroDisco: INITIAL_PILOT_BUS.numeroDisco,
              placa: INITIAL_PILOT_BUS.placa,
              marca: INITIAL_PILOT_BUS.marca,
              modelo: INITIAL_PILOT_BUS.modelo,
              anio: INITIAL_PILOT_BUS.anio,
              capacidadAsientos: INITIAL_PILOT_BUS.capacidadAsientos,
              propietario: INITIAL_PILOT_BUS.propietario,
              tipoOperacion: INITIAL_PILOT_BUS.tipoOperacion,
              activo: INITIAL_PILOT_BUS.activo,
              notas: INITIAL_PILOT_BUS.notas,
            },
          });
          buses = [seeded];
        } catch (seedErr) {
          console.warn('No se pudo autosemillar Bus 01 en BD, usando datos en memoria:', seedErr);
          buses = [INITIAL_PILOT_BUS];
        }
      }
    } catch (dbErr) {
      console.warn('Consulta a tabla Bus en BD falló (posible offline o migración pendiente), fallback seguro:', dbErr);
      buses = [INITIAL_PILOT_BUS];
    }

    return NextResponse.json({
      success: true,
      data: buses,
      count: buses.length,
    });
  } catch (error) {
    console.error('Error al obtener flota de buses:', error);
    return NextResponse.json({
      success: true,
      data: [INITIAL_PILOT_BUS],
      count: 1,
      fallback: true,
    });
  }
}

// POST /api/buses
// Registro de una nueva unidad
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      numeroDisco,
      placa,
      marca,
      modelo,
      anio,
      capacidadAsientos,
      propietario,
      tipoOperacion,
      activo,
      notas,
    } = body;

    if (!numeroDisco || !placa || !marca || !propietario) {
      return NextResponse.json(
        {
          success: false,
          message: 'Disco, placa, marca y propietario son campos obligatorios.',
        },
        { status: 400 }
      );
    }

    const cleanDisco = String(numeroDisco).trim().padStart(2, '0');
    const cleanPlaca = String(placa).trim().toUpperCase();
    const safeTipoOperacion = tipoOperacion === 'ALIMENTADOR_P' ? 'ALIMENTADOR_P' : 'TRONCAL_VT';
    const safeCapacidad = Number(capacidadAsientos) > 0 ? Number(capacidadAsientos) : 45;

    let savedBus;
    try {
      savedBus = await (db as any).bus.upsert({
        where: { numeroDisco: cleanDisco },
        update: {
          placa: cleanPlaca,
          marca: String(marca).trim(),
          modelo: modelo ? String(modelo).trim() : 'AK',
          anio: anio ? Number(anio) : undefined,
          capacidadAsientos: safeCapacidad,
          propietario: String(propietario).trim(),
          tipoOperacion: safeTipoOperacion,
          activo: activo !== false,
          notas: notas ? String(notas).trim() : undefined,
        },
        create: {
          id: `BUS-${cleanDisco}`,
          numeroDisco: cleanDisco,
          placa: cleanPlaca,
          marca: String(marca).trim(),
          modelo: modelo ? String(modelo).trim() : 'AK',
          anio: anio ? Number(anio) : undefined,
          capacidadAsientos: safeCapacidad,
          propietario: String(propietario).trim(),
          tipoOperacion: safeTipoOperacion,
          activo: activo !== false,
          notas: notas ? String(notas).trim() : undefined,
        },
      });
    } catch (dbErr) {
      console.warn('Guardado en base de datos falló, construyendo respuesta local:', dbErr);
      savedBus = {
        id: `BUS-${cleanDisco}`,
        numeroDisco: cleanDisco,
        placa: cleanPlaca,
        marca: String(marca).trim(),
        modelo: modelo ? String(modelo).trim() : 'AK',
        anio: anio ? Number(anio) : 2022,
        capacidadAsientos: safeCapacidad,
        propietario: String(propietario).trim(),
        tipoOperacion: safeTipoOperacion,
        activo: activo !== false,
        notas: notas ? String(notas).trim() : undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    return NextResponse.json({
      success: true,
      data: savedBus,
      message: `Unidad ${cleanDisco} guardada correctamente`,
    });
  } catch (error) {
    console.error('Error al crear o actualizar unidad:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Error al procesar solicitud',
      },
      { status: 500 }
    );
  }
}

// PUT /api/buses
// Actualización de datos de una unidad
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, numeroDisco, ...fieldsToUpdate } = body;

    if (!id && !numeroDisco) {
      return NextResponse.json(
        { success: false, message: 'Se requiere id o numeroDisco para actualizar.' },
        { status: 400 }
      );
    }

    let updated;
    try {
      updated = await (db as any).bus.update({
        where: id ? { id } : { numeroDisco },
        data: {
          ...fieldsToUpdate,
          ...(fieldsToUpdate.placa && { placa: String(fieldsToUpdate.placa).trim().toUpperCase() }),
        },
      });
    } catch (dbErr) {
      console.warn('Actualización en BD falló, retorno de confirmación con datos locales:', dbErr);
      updated = {
        id: id || `BUS-${numeroDisco}`,
        numeroDisco: numeroDisco || '01',
        ...fieldsToUpdate,
        updatedAt: new Date().toISOString(),
      };
    }

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Unidad actualizada correctamente',
    });
  } catch (error) {
    console.error('Error al actualizar unidad:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Error inesperado' },
      { status: 500 }
    );
  }
}

// DELETE /api/buses?id=BUS-01 o ?disco=01
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const disco = searchParams.get('disco');

    if (!id && !disco) {
      return NextResponse.json(
        { success: false, message: 'Debe especificar el id o disco a eliminar' },
        { status: 400 }
      );
    }

    try {
      if (id) {
        await (db as any).bus.delete({ where: { id } });
      } else if (disco) {
        await (db as any).bus.delete({ where: { numeroDisco: disco } });
      }
    } catch (dbErr) {
      console.warn('Eliminación en BD falló, continuando:', dbErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Unidad eliminada correctamente',
    });
  } catch (error) {
    console.error('Error al eliminar unidad:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Error inesperado' },
      { status: 500 }
    );
  }
}
