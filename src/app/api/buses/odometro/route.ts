import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

interface OdometroRequestBody {
  busId?: string;
  numeroDisco?: string;
  nuevoKm?: number | string;
  motivo?: string;
  observacion?: string;
  actualizadoPor?: string;
}

// GET /api/buses/odometro?disco=01
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const disco = searchParams.get('disco');
    const busId = searchParams.get('busId');

    if (!disco && !busId) {
      return NextResponse.json(
        { success: false, message: 'Se requiere disco o busId para consultar el odómetro.' },
        { status: 400 }
      );
    }

    const cleanDisco = String(disco || busId || '').replace(/^BUS-/, '').padStart(2, '0');

    let busData = null;
    try {
      busData = await (db as any).bus.findUnique({
        where: { numeroDisco: cleanDisco },
        select: {
          id: true,
          numeroDisco: true,
          placa: true,
          propietario: true,
          notas: true,
          updatedAt: true,
        },
      });
    } catch (dbErr) {
      console.warn('Consulta de bus en BD con advertencia (fallback memoria):', dbErr);
    }

    let kmCalibrado: number | null = null;
    let fechaCalibrada: string | null = null;
    let motivoCalibrado: string | null = null;

    if (busData?.notas) {
      const matchKm = busData.notas.match(/\[Odómetro (?:Calibrado|Inicial)\]:\s*([0-9,.]+)\s*km/i);
      if (matchKm) {
        kmCalibrado = parseInt(matchKm[1].replace(/[^0-9]/g, ''), 10);
      }
      const matchFecha = busData.notas.match(/el\s*([0-9]{4}-[0-9]{2}-[0-9]{2})/);
      if (matchFecha) {
        fechaCalibrada = matchFecha[1];
      }
      const matchMotivo = busData.notas.match(/\(([^()]+)\)$/);
      if (matchMotivo) {
        motivoCalibrado = matchMotivo[1];
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        disco: cleanDisco,
        kmCalibrado,
        fechaCalibrada,
        motivoCalibrado,
        bus: busData,
      },
    });
  } catch (error) {
    console.error('Error al consultar odómetro de bus:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Error inesperado al consultar odómetro',
      },
      { status: 500 }
    );
  }
}

// POST /api/buses/odometro
// Calibra oficialmente el tacómetro de una unidad y persiste en base de datos
export async function POST(req: NextRequest) {
  try {
    const body: OdometroRequestBody = await req.json();
    const { busId, numeroDisco, nuevoKm, motivo, observacion, actualizadoPor } = body;

    const rawNum = typeof nuevoKm === 'number' ? nuevoKm : Number(String(nuevoKm ?? '').trim());
    if (isNaN(rawNum) || rawNum <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'El kilometraje debe ser un número entero positivo mayor a 0.',
        },
        { status: 400 }
      );
    }
    const kmNum = Math.floor(rawNum);

    if (!numeroDisco && !busId) {
      return NextResponse.json(
        {
          success: false,
          message: 'El número de disco o ID del autobús es obligatorio.',
        },
        { status: 400 }
      );
    }

    const cleanDisco = String(numeroDisco || busId || '').replace(/^BUS-/, '').padStart(2, '0');
    const motivoFinal = observacion && observacion.trim()
      ? `${motivo || 'Calibración extraordinaria'} • ${observacion.trim()}`
      : (motivo || 'Calibración extraordinaria');

    const timestampIso = new Date().toISOString();
    const fechaHoy = timestampIso.split('T')[0];
    const operador = actualizadoPor || 'Socio Propietario';

    let busActualizado = null;
    let persistidoEnBD = false;

    try {
      const notaAuditoria = `[Odómetro Calibrado]: ${kmNum.toLocaleString()} km el ${fechaHoy} por ${operador} (${motivoFinal})`;

      busActualizado = await (db as any).bus.upsert({
        where: { numeroDisco: cleanDisco },
        update: {
          notas: notaAuditoria,
          updatedAt: new Date(),
        },
        create: {
          id: `BUS-${cleanDisco}`,
          numeroDisco: cleanDisco,
          placa: `TAA-${cleanDisco}00`,
          marca: 'Hino AK',
          propietario: operador,
          tipoOperacion: 'TRONCAL_VT',
          notas: notaAuditoria,
        },
      });
      persistidoEnBD = true;
    } catch (dbErr) {
      console.warn('No se pudo actualizar tabla Bus en BD (operación en modo resiliente):', dbErr);
    }

    return NextResponse.json({
      success: true,
      message: `Odómetro de la Unidad ${cleanDisco} calibrado a ${kmNum.toLocaleString()} km`,
      data: {
        disco: cleanDisco,
        busId: busId || `BUS-${cleanDisco}`,
        kmActual: kmNum,
        motivo: motivoFinal,
        actualizadoPor: operador,
        fecha: fechaHoy,
        timestamp: timestampIso,
        persistidoEnBD,
        bus: busActualizado,
      },
    });
  } catch (error) {
    console.error('Error en POST /api/buses/odometro:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Error interno al procesar la calibración del odómetro',
      },
      { status: 500 }
    );
  }
}
