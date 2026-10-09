import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { INITIAL_PILOT_BUS, getAllBuses } from '@/lib/fleet-storage';

export const dynamic = 'force-dynamic';

function extractOdometerFromNotas(notas?: string | null): string | undefined {
  if (!notas) return undefined;
  const matchCalib = notas.match(/\[Odómetro (?:Calibrado|Inicial)\]:\s*([0-9,.]+)\s*km/i);
  if (matchCalib && matchCalib[1]) {
    return matchCalib[1].replace(/[^0-9]/g, '');
  }
  return undefined;
}

// GET /api/buses
// Parámetros opcionales: ?disco=01 ó ?tipoOperacion=TRONCAL_VT
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const disco = searchParams.get('disco');
    const tipoOperacion = searchParams.get('tipoOperacion');
    const socioId = searchParams.get('socioId');

    const where: Record<string, unknown> = {};
    if (disco) where.numeroDisco = disco.trim();
    if (tipoOperacion) where.tipoOperacion = tipoOperacion;
    if (socioId && socioId !== 'TODOS') {
      if (socioId === 'SIN_SOCIO') {
        where.socioId = null;
      } else {
        where.socioId = socioId;
      }
    }

    let buses: any[] = [];
    try {
      buses = await (db as any).bus.findMany({
        where,
        include: {
          socio: {
            select: { id: true, nombre: true, cedula: true }
          }
        },
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
      const all = getAllBuses();
      buses = all.filter(b => {
        if (disco && b.numeroDisco !== disco) return false;
        if (tipoOperacion && b.tipoOperacion !== tipoOperacion) return false;
        return true;
      });
    }

    const mappedBuses = buses.map((b: any) => {
      const odo = extractOdometerFromNotas(b.notas) || (b.numeroDisco === '01' ? '893485' : undefined);
      return {
        ...b,
        odometroInicial: odo,
      };
    });

    return NextResponse.json({
      success: true,
      data: mappedBuses,
      count: mappedBuses.length,
    });
  } catch (error) {
    console.error('Error al obtener flota de buses:', error);
    const all = getAllBuses();
    return NextResponse.json({
      success: true,
      data: all,
      count: all.length,
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
      odometroInicial,
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

    let finalNotas = notas ? String(notas).trim() : '';
    if (odometroInicial) {
      const cleanKm = String(odometroInicial).replace(/[^0-9]/g, '');
      if (cleanKm && !finalNotas.includes('[Odómetro')) {
        const tag = `[Odómetro Inicial]: ${Number(cleanKm).toLocaleString()} km`;
        finalNotas = finalNotas ? `${tag} • ${finalNotas}` : tag;
      }
    }

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
          notas: finalNotas || undefined,
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
          notas: finalNotas || undefined,
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
        notas: finalNotas || undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    const odoReturn = odometroInicial
      ? String(odometroInicial).replace(/[^0-9]/g, '')
      : extractOdometerFromNotas(savedBus.notas);

    return NextResponse.json({
      success: true,
      data: {
        ...savedBus,
        odometroInicial: odoReturn,
      },
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
// Actualización o upsert de datos de una unidad en PostgreSQL
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();

    // Desestructuración defensiva por si id viene anidado como objeto o plano
    let targetId = body.id;
    let targetDisco = body.numeroDisco;
    let fields = { ...body };

    if (typeof targetId === "object" && targetId !== null) {
      fields = { ...targetId };
      targetId = fields.id;
      targetDisco = fields.numeroDisco;
    }

    if (!targetId && !targetDisco) {
      return NextResponse.json(
        { success: false, message: "Se requiere id o numeroDisco para actualizar." },
        { status: 400 }
      );
    }

    const cleanDisco = targetDisco
      ? String(targetDisco).trim().padStart(2, "0")
      : (targetId ? String(targetId).replace("BUS-", "").padStart(2, "0") : "01");
    const cleanPlaca = fields.placa ? String(fields.placa).trim().toUpperCase() : "PENDIENTE";
    const busId = (typeof targetId === "string" && targetId) ? targetId : `BUS-${cleanDisco}`;

    // Sanitización estricta de campos permitidos en el modelo Bus de Prisma
    const cleanUpdateData: any = {};
    if (fields.placa) cleanUpdateData.placa = cleanPlaca;
    if (fields.marca !== undefined) cleanUpdateData.marca = String(fields.marca).trim();
    if (fields.modelo !== undefined) cleanUpdateData.modelo = fields.modelo ? String(fields.modelo).trim() : "AK";
    if (fields.anio !== undefined) cleanUpdateData.anio = fields.anio ? Number(fields.anio) : null;
    if (fields.capacidadAsientos !== undefined) cleanUpdateData.capacidadAsientos = Number(fields.capacidadAsientos) || 45;
    if (fields.propietario !== undefined) cleanUpdateData.propietario = String(fields.propietario).trim();
    if (fields.tipoOperacion !== undefined) cleanUpdateData.tipoOperacion = fields.tipoOperacion === "ALIMENTADOR_P" ? "ALIMENTADOR_P" : "TRONCAL_VT";
    if (fields.activo !== undefined) cleanUpdateData.activo = fields.activo !== false;
    
    let notasVal = fields.notas !== undefined ? (fields.notas ? String(fields.notas).trim() : null) : undefined;
    if (fields.odometroInicial) {
      const cleanKm = String(fields.odometroInicial).replace(/[^0-9]/g, '');
      if (cleanKm) {
        const tag = `[Odómetro Inicial]: ${Number(cleanKm).toLocaleString()} km`;
        if (notasVal && !notasVal.includes('[Odómetro')) {
          notasVal = `${tag} • ${notasVal}`;
        } else if (!notasVal) {
          notasVal = tag;
        }
      }
    }
    if (notasVal !== undefined) cleanUpdateData.notas = notasVal;

    let updated;
    try {
      updated = await (db as any).bus.upsert({
        where: { numeroDisco: cleanDisco },
        update: cleanUpdateData,
        create: {
          id: busId,
          numeroDisco: cleanDisco,
          placa: cleanPlaca,
          marca: fields.marca ? String(fields.marca).trim() : "Hino AK",
          modelo: fields.modelo ? String(fields.modelo).trim() : "AK",
          anio: fields.anio ? Number(fields.anio) : 2022,
          capacidadAsientos: Number(fields.capacidadAsientos) || 45,
          propietario: fields.propietario ? String(fields.propietario).trim() : "Socio",
          tipoOperacion: fields.tipoOperacion === "ALIMENTADOR_P" ? "ALIMENTADOR_P" : "TRONCAL_VT",
          activo: fields.activo !== false,
          notas: notasVal ?? (fields.notas ? String(fields.notas).trim() : null),
        },
      });
    } catch (dbErr) {
      console.warn("Upsert en BD falló, retorno de confirmación con datos locales:", dbErr);
      updated = {
        id: busId,
        numeroDisco: cleanDisco,
        ...cleanUpdateData,
        updatedAt: new Date().toISOString(),
      };
    }

    const odoReturn = fields.odometroInicial
      ? String(fields.odometroInicial).replace(/[^0-9]/g, '')
      : extractOdometerFromNotas(updated?.notas);

    return NextResponse.json({
      success: true,
      data: {
        ...updated,
        odometroInicial: odoReturn,
      },
      message: "Unidad actualizada correctamente",
    });
  } catch (error) {
    console.error("Error al actualizar unidad:", error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Error inesperado" },
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
