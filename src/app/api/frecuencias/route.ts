import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface VTJsonFrecuencia {
  routeFrom: string;
  routeTo: string;
  time: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const vtCode = searchParams.get('vtCode');
    const all = searchParams.get('all');

    // Si se pide todas las frecuencias del sistema (para reasignación)
    if (all === 'true') {
      const todasFrecuencias = await prisma.frecuencia.findMany({
        where: { activo: true },
        orderBy: [{ hora: 'asc' }, { ruta: 'asc' }],
      });

      // También obtener frecuencias desde BusVT JSONs que no estén en tabla Frecuencia
      const busesVT = await prisma.busVT.findMany({
        where: { frecuencias: { not: null } },
      });

      const frecIds = new Set(todasFrecuencias.map(f => f.id));
      const jsonFrecs: typeof todasFrecuencias = [];

      for (const bus of busesVT) {
        const arr = (bus.frecuencias || []) as VTJsonFrecuencia[];
        arr.forEach((f, idx) => {
          const from = f.routeFrom || 'Loja';
          const to = f.routeTo || 'Vilcabamba';
          const esIda = from === 'Loja';
          jsonFrecs.push({
            id: `${bus.codigo}_frec_${idx}`,
            vtCode: bus.codigo,
            nombre: `${from}-${to}`,
            ruta: `${from} - ${to}`,
            hora: f.time,
            direccion: esIda ? 'ida' : 'vuelta',
            activo: true,
            createdAt: bus.createdAt || new Date(),
          });
        });
      }

      // Combinar: tabla Frecuencia + JSON de BusVT
      const combined = [...todasFrecuencias, ...jsonFrecs];
      // Deduplicar por id
      const seen = new Set<string>();
      const unique = combined.filter(f => {
        if (seen.has(f.id)) return false;
        seen.add(f.id);
        return true;
      });

      return NextResponse.json(unique);
    }

    if (!vtCode) {
      return NextResponse.json({ error: 'vtCode requerido' }, { status: 400 });
    }

    // 1. Buscar en tabla Frecuencia (boletos)
    let frecuencias = await prisma.frecuencia.findMany({
      where: { vtCode, activo: true },
      orderBy: { hora: 'asc' },
    });

    // 2. Si no hay, tomar del JSON del BusVT (control-transporte)
    if (frecuencias.length === 0) {
      const busVT = await prisma.busVT.findUnique({
        where: { codigo: vtCode },
      });

      if (busVT && Array.isArray(busVT.frecuencias) && busVT.frecuencias.length > 0) {
        const jsonFrecs = busVT.frecuencias as VTJsonFrecuencia[];
        // Convertir formato JSON a formato FrecuenciaData
        // Cada registro: routeFrom="Loja", routeTo="Vilcabamba", time="06:15"
        frecuencias = jsonFrecs.map((f, idx) => {
          const from = f.routeFrom || 'Loja';
          const to = f.routeTo || 'Vilcabamba';
          const esIda = from === 'Loja';
          return {
            id: `${vtCode}_frec_${idx}`,
            vtCode,
            nombre: `${from}-${to}`,
            ruta: `${from} - ${to}`,
            hora: f.time,
            direccion: esIda ? 'ida' : 'vuelta',
            activo: true,
            createdAt: new Date().toISOString(),
          };
        });
      }
    }

    return NextResponse.json(frecuencias);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error al obtener frecuencias';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json({ error: 'id requerido' }, { status: 400 });
    }

    // Whitelist: solo permitir actualizar estos campos
    const ALLOWED: (keyof Record<string, unknown>)[] = ['hora', 'ruta', 'direccion', 'nombre', 'activo', 'vtCode'];
    const safeData: Record<string, unknown> = {};
    for (const key of ALLOWED) {
      if (key in data) safeData[key] = data[key];
    }

    const frecuencia = await prisma.frecuencia.update({
      where: { id },
      data: safeData,
    });

    return NextResponse.json(frecuencia);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error al actualizar frecuencia';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
