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

// GET /api/buses/odometro?disco=01&fecha=2026-10-15
// Fuente de verdad unificada: cruza arqueos del ayudante (DailyRecord) y calibraciones del socio (Bus.notas)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const disco = searchParams.get('disco');
    const busId = searchParams.get('busId');
    const fechaParam = searchParams.get('fecha');

    if (!disco && !busId) {
      return NextResponse.json(
        { success: false, message: 'Se requiere disco o busId para consultar el odómetro.' },
        { status: 400 }
      );
    }

    const cleanDisco = String(disco || busId || '').replace(/^BUS-/i, '').padStart(2, '0');

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

    // 1. Extraer calibración manual previa del socio / administrador desde notas
    let kmCalibradoSocio: number | null = null;
    let fechaCalibradaSocio: string | null = null;
    let motivoCalibradoSocio: string | null = null;

    if (busData?.notas) {
      const matchKm = busData.notas.match(/\[Odómetro (?:Calibrado|Inicial)\]:\s*([0-9,.]+)\s*km/i);
      if (matchKm) {
        kmCalibradoSocio = parseInt(matchKm[1].replace(/[^0-9]/g, ''), 10);
      }
      const matchFecha = busData.notas.match(/el\s*([0-9]{4}-[0-9]{2}-[0-9]{2})/);
      if (matchFecha) {
        fechaCalibradaSocio = matchFecha[1];
      }
      const matchMotivo = busData.notas.match(/\(([^()]+)\)$/);
      if (matchMotivo) {
        motivoCalibradoSocio = matchMotivo[1];
      }
    }

    // 2. Consultar el último arqueo oficial del ayudante para este bus
    let ultimoArqueoAyudante = null;
    try {
      ultimoArqueoAyudante = await (db as any).dailyRecord.findFirst({
        where: {
          conductor: { startsWith: `BUS-${cleanDisco}` },
          kmFinal: { not: null },
        },
        orderBy: [
          { date: 'desc' },
          { createdAt: 'desc' },
        ],
        select: {
          id: true,
          date: true,
          kmFinal: true,
          kmInicial: true,
          km: true,
          conductor: true,
          ayudanteNombre: true,
          vtCode: true,
        },
      });
    } catch (recErr) {
      console.warn('Consulta de último arqueo en BD con advertencia:', recErr);
    }

    // 3. Si se pidió una fecha específica (ej. para validar un mantenimiento del chofer)
    let odometroEnFecha = null;
    if (fechaParam && /^\d{4}-\d{2}-\d{2}$/.test(fechaParam)) {
      try {
        // Primero buscar registro exacto en esa fecha
        const recExacto = await (db as any).dailyRecord.findFirst({
          where: {
            conductor: { startsWith: `BUS-${cleanDisco}` },
            date: fechaParam,
            kmFinal: { not: null },
          },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            date: true,
            kmFinal: true,
            kmInicial: true,
            km: true,
            ayudanteNombre: true,
          },
        });

        if (recExacto) {
          odometroEnFecha = {
            date: recExacto.date,
            kmFinal: parseInt(String(recExacto.kmFinal).replace(/[^0-9]/g, ''), 10) || null,
            kmInicial: parseInt(String(recExacto.kmInicial || '').replace(/[^0-9]/g, ''), 10) || null,
            kmRecorrido: parseInt(String(recExacto.km || '').replace(/[^0-9]/g, ''), 10) || null,
            esExacto: true,
            ayudante: recExacto.ayudanteNombre || 'Ayudante',
          };
        } else {
          // Si no hay registro en esa fecha exacta, buscar el más cercano anterior
          const recAnterior = await (db as any).dailyRecord.findFirst({
            where: {
              conductor: { startsWith: `BUS-${cleanDisco}` },
              date: { lte: fechaParam },
              kmFinal: { not: null },
            },
            orderBy: { date: 'desc' },
            select: {
              id: true,
              date: true,
              kmFinal: true,
              kmInicial: true,
              km: true,
              ayudanteNombre: true,
            },
          });

          if (recAnterior) {
            odometroEnFecha = {
              date: recAnterior.date,
              kmFinal: parseInt(String(recAnterior.kmFinal).replace(/[^0-9]/g, ''), 10) || null,
              kmInicial: parseInt(String(recAnterior.kmInicial || '').replace(/[^0-9]/g, ''), 10) || null,
              kmRecorrido: parseInt(String(recAnterior.km || '').replace(/[^0-9]/g, ''), 10) || null,
              esExacto: false,
              ayudante: recAnterior.ayudanteNombre || 'Ayudante',
            };
          }
        }
      } catch (fechaErr) {
        console.warn('Error consultando odómetro por fecha específica:', fechaErr);
      }
    }

    // 4. Determinar Odómetro Oficial Vigente (Jerarquía: Calibración Socio > Arqueo Ayudante)
    const kmAyudanteNum = ultimoArqueoAyudante?.kmFinal
      ? parseInt(String(ultimoArqueoAyudante.kmFinal).replace(/[^0-9]/g, ''), 10)
      : 0;

    let kmOficial = kmCalibradoSocio || kmAyudanteNum || null;
    let fechaOficial = fechaCalibradaSocio || ultimoArqueoAyudante?.date || null;
    let fuenteOficial: 'SOCIO_CALIBRACION' | 'AYUDANTE_ARQUEO' | 'FICHA_TECNICA' = 'FICHA_TECNICA';

    if (kmCalibradoSocio && kmAyudanteNum) {
      // Si la calibración del socio es más reciente que el arqueo o tiene kilometraje superior
      const socioEsMasReciente = fechaCalibradaSocio && ultimoArqueoAyudante?.date
        ? fechaCalibradaSocio >= ultimoArqueoAyudante.date
        : false;

      if (socioEsMasReciente || kmCalibradoSocio > kmAyudanteNum) {
        kmOficial = kmCalibradoSocio;
        fechaOficial = fechaCalibradaSocio;
        fuenteOficial = 'SOCIO_CALIBRACION';
      } else {
        kmOficial = kmAyudanteNum;
        fechaOficial = ultimoArqueoAyudante.date;
        fuenteOficial = 'AYUDANTE_ARQUEO';
      }
    } else if (kmAyudanteNum > 0) {
      kmOficial = kmAyudanteNum;
      fechaOficial = ultimoArqueoAyudante?.date || null;
      fuenteOficial = 'AYUDANTE_ARQUEO';
    } else if (kmCalibradoSocio && kmCalibradoSocio > 0) {
      kmOficial = kmCalibradoSocio;
      fechaOficial = fechaCalibradaSocio;
      fuenteOficial = 'SOCIO_CALIBRACION';
    }

    return NextResponse.json({
      success: true,
      data: {
        disco: cleanDisco,
        kmCalibrado: kmOficial,
        fechaCalibrada: fechaOficial,
        fuente: fuenteOficial,
        motivoCalibrado: motivoCalibradoSocio,
        ultimoArqueo: ultimoArqueoAyudante,
        odometroFecha: odometroEnFecha,
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
// Calibra oficialmente el tacómetro de una unidad y persiste en base de datos (Exclusivo Socio / Admin)
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

    const cleanDisco = String(numeroDisco || busId || '').replace(/^BUS-/i, '').padStart(2, '0');
    const motivoFinal = observacion && observacion.trim()
      ? `${motivo || 'Calibración extraordinaria'} • ${observacion.trim()}`
      : (motivo || 'Calibración extraordinaria');

    const timestampIso = new Date().toISOString();
    const fechaHoy = timestampIso.split('T')[0];
    const operador = actualizadoPor || 'Socio Propietario';

    let busActualizado = null;
    let persistidoEnBD = false;

    try {
      let prevNotas = '';
      try {
        const existing = await (db as any).bus.findUnique({
          where: { numeroDisco: cleanDisco },
          select: { notas: true },
        });
        if (existing?.notas) prevNotas = existing.notas;
      } catch {}

      const promoMatch = prevNotas.match(/\[PromoConfig\]:\s*\{.*?\}/);
      let notaAuditoria = `[Odómetro Calibrado]: ${kmNum.toLocaleString()} km el ${fechaHoy} por ${operador} (${motivoFinal})`;
      if (promoMatch) {
        notaAuditoria = `${promoMatch[0]} • ${notaAuditoria}`;
      }

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
