import { PrismaClient } from '@prisma/client';
import { VT_DATA, VTFrecuencia } from './seed-vts';

export interface VTJsonFrecuencia {
  routeFrom: string;
  routeTo: string;
  time: string;
}

/**
 * Asegura que todas las frecuencias de un VT estén registradas en la tabla `Frecuencia`
 * para garantizar integridad referencial con `VentaBoleto`.
 */
export async function ensureVTFrecuencias(prisma: PrismaClient, vtCode: string) {
  if (!vtCode) return [];

  // 1. Revisar si ya existen en tabla Frecuencia
  const existing = await prisma.frecuencia.findMany({
    where: { vtCode, activo: true },
    orderBy: { hora: 'asc' },
  });

  if (existing.length > 0) {
    return existing;
  }

  // 2. Si no existen, obtener del BusVT o del seed VT_DATA
  let rawFrecs: VTFrecuencia[] = [];
  try {
    const bus = await prisma.busVT.findUnique({ where: { codigo: vtCode } });
    if (bus && Array.isArray(bus.frecuencias) && bus.frecuencias.length > 0) {
      rawFrecs = (bus.frecuencias as unknown) as VTFrecuencia[];
    }
  } catch { /* ignore */ }

  if (rawFrecs.length === 0) {
    const defaultVT = VT_DATA.find(v => v.codigo === vtCode);
    if (defaultVT && Array.isArray(defaultVT.frecuencias)) {
      rawFrecs = defaultVT.frecuencias;
    }
  }

  if (rawFrecs.length === 0) return [];

  // 3. Auto-persistir en tabla Frecuencia
  for (let idx = 0; idx < rawFrecs.length; idx++) {
    const f = rawFrecs[idx];
    const from = f.routeFrom || 'Loja';
    const to = f.routeTo || 'Vilcabamba';
    const esIda = from === 'Loja';
    const id = `${vtCode}_frec_${idx}`;

    try {
      await prisma.frecuencia.upsert({
        where: { id },
        create: {
          id,
          vtCode,
          nombre: `${from}-${to}`,
          ruta: `${from} - ${to}`,
          hora: f.time,
          direccion: esIda ? 'ida' : 'vuelta',
          activo: true,
        },
        update: {
          nombre: `${from}-${to}`,
          ruta: `${from} - ${to}`,
          hora: f.time,
          direccion: esIda ? 'ida' : 'vuelta',
          activo: true,
        },
      });
    } catch { /* ignore */ }
  }

  return prisma.frecuencia.findMany({
    where: { vtCode, activo: true },
    orderBy: { hora: 'asc' },
  });
}

/**
 * Resuelve y valida el `frecuenciaId` oficial para un boleto emitido o histórico.
 * Si el `frecuenciaId` viene del cliente (ej. VT5_frec_2), asegura su existencia en BD.
 * Si no viene o no existe, deduce la frecuencia por sentido (ida/vuelta), ruta y cercanía horaria.
 */
export async function resolveValidFrecuenciaId(
  prisma: PrismaClient,
  params: {
    vtCode: string;
    frecuenciaId?: string | null;
    hora?: string | null;
    ruta?: string | null;
    tipo?: string | null;
  }
): Promise<string | null> {
  const { vtCode, frecuenciaId, hora, ruta, tipo } = params;
  if (!vtCode) return null;

  // 1. Si viene un frecuenciaId explícito, asegurar frecuencias y verificar si existe
  if (frecuenciaId && typeof frecuenciaId === 'string') {
    try {
      const direct = await prisma.frecuencia.findUnique({ where: { id: frecuenciaId } });
      if (direct) return direct.id;

      // Si no existe directamente, asegurar catálogo del VT e intentar nuevamente
      await ensureVTFrecuencias(prisma, vtCode);
      const afterEnsure = await prisma.frecuencia.findUnique({ where: { id: frecuenciaId } });
      if (afterEnsure) return afterEnsure.id;
    } catch { /* ignore */ }
  }

  // 2. Si no hay frecuenciaId o no se encontró, resolver por catálogo del VT
  try {
    const frecs = await ensureVTFrecuencias(prisma, vtCode);
    if (frecs.length === 0) return null;

    // Determinar dirección: ida (Loja -> Vilcabamba/Yangana) o vuelta (Vilcabamba/Yangana -> Loja)
    const isIda =
      tipo === 'ida' ||
      (ruta ? ruta.toLowerCase().startsWith('loja') || ruta.toLowerCase().includes('loja -') : false);

    const isVuelta =
      tipo === 'vuelta' ||
      (ruta ? !ruta.toLowerCase().startsWith('loja') && ruta.toLowerCase().includes('- loja') : false);

    let candidates = frecs;
    if (isIda) {
      const idaFrecs = frecs.filter(f => f.direccion === 'ida');
      if (idaFrecs.length > 0) candidates = idaFrecs;
    } else if (isVuelta) {
      const vueltaFrecs = frecs.filter(f => f.direccion === 'vuelta');
      if (vueltaFrecs.length > 0) candidates = vueltaFrecs;
    }

    if (!hora) {
      return candidates[0]?.id || null;
    }

    // Comparar hora del boleto con hora programada de la frecuencia
    const [tH, tM] = hora.split(':').map(Number);
    const ticketMin = (isNaN(tH) ? 0 : tH) * 60 + (isNaN(tM) ? 0 : tM);

    let bestFrec = candidates[0];
    let minDiff = Infinity;

    for (const f of candidates) {
      const [fH, fM] = f.hora.split(':').map(Number);
      const frecMin = (isNaN(fH) ? 0 : fH) * 60 + (isNaN(fM) ? 0 : fM);
      const diff = Math.abs(ticketMin - frecMin);
      if (diff < minDiff) {
        minDiff = diff;
        bestFrec = f;
      }
    }

    // Tolerancia de 210 min (3.5 horas) para acomodar vueltas largas o retrasos
    if (bestFrec && minDiff <= 210) {
      return bestFrec.id;
    }

    return bestFrec?.id || null;
  } catch {
    return null;
  }
}

/**
 * Auto-vincula boletos huérfanos que están en la base de datos sin `frecuenciaId`.
 * Se ejecuta al consultar `/api/ventas` para sanar automáticamente los registros del día.
 */
export async function autoVincularVentasHuerfanas(
  prisma: PrismaClient,
  vtCode?: string | null,
  fecha?: string | null
): Promise<number> {
  try {
    const unlinked = await prisma.ventaBoleto.findMany({
      where: {
        frecuenciaId: null,
        ...(vtCode ? { vtCode } : {}),
        ...(fecha
          ? {
              OR: [{ fechaOperacion: fecha }, { fecha: fecha }],
            }
          : {}),
      },
      take: 200,
    });

    if (unlinked.length === 0) return 0;

    let repaired = 0;
    for (const v of unlinked) {
      if (!v.vtCode) continue;
      const resolvedId = await resolveValidFrecuenciaId(prisma, {
        vtCode: v.vtCode,
        frecuenciaId: null,
        hora: v.hora,
        ruta: v.ruta,
        tipo: v.tipo,
      });

      if (resolvedId) {
        await prisma.ventaBoleto.update({
          where: { id: v.id },
          data: { frecuenciaId: resolvedId },
        });
        repaired++;
      }
    }

    return repaired;
  } catch {
    return 0;
  }
}
