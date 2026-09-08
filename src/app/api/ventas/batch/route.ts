import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// POST /api/ventas/batch — Sync multiple ventas in one request
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ventas } = body as { ventas: Record<string, unknown>[] };

    if (!Array.isArray(ventas) || ventas.length === 0 || ventas.length > 50) {
      return NextResponse.json({ error: 'Envia 1-50 ventas' }, { status: 400 });
    }

    const results: { localId: string; serverId: string; ok: boolean; error?: string }[] = [];

    for (const v of ventas) {
      try {
        const {
          fecha, fechaOperacion, diaTurno, fechaEmision,
          vtCode, frecuenciaId, ruta, parada, tipo, pasajeroTipo,
          tarifaOficial, cobrado, hora, ayudanteId, ayudanteNombre,
          createdAt, localId, lat, lng
        } = v as Record<string, unknown>;

        const opFecha = ((fechaOperacion || fecha) as string) || '';

        if (!opFecha || !vtCode || typeof cobrado !== 'number') {
          results.push({ localId: (localId as string) || '', serverId: '', ok: false, error: 'Campos obligatorios faltantes' });
          continue;
        }

        // Validación financiera server-side
        if (cobrado < 0) {
          results.push({ localId: (localId as string) || '', serverId: '', ok: false, error: 'cobrado no puede ser negativo' });
          continue;
        }

        const tarifaNum = typeof tarifaOficial === 'number' ? tarifaOficial : 0;
        if (tarifaNum < 0) {
          results.push({ localId: (localId as string) || '', serverId: '', ok: false, error: 'tarifaOficial no puede ser negativa' });
          continue;
        }

        let validFrecuenciaId: string | null = null;
        if (frecuenciaId && typeof frecuenciaId === 'string') {
          try {
            const frec = await prisma.frecuencia.findUnique({ where: { id: frecuenciaId } });
            if (frec) validFrecuenciaId = frecuenciaId;
          } catch { /* ignore */ }
        }

        const emisionDate = fechaEmision ? new Date(fechaEmision as string) : (createdAt ? new Date(createdAt as string) : new Date());
        const diaNum = typeof diaTurno === 'number' ? diaTurno : 1;

        const venta = await prisma.ventaBoleto.create({
          data: {
            fecha: opFecha,
            fechaOperacion: opFecha,
            diaTurno: diaNum,
            vtCode: vtCode as string,
            frecuenciaId: validFrecuenciaId,
            ruta: (ruta as string) || '',
            parada: (parada as string) || '',
            tipo: (tipo as string) || '',
            pasajeroTipo: (pasajeroTipo as string) || 'normal',
            tarifaOficial: typeof tarifaOficial === 'number' ? tarifaOficial : 0,
            cobrado: cobrado as number,
            hora: (hora as string) || '',
            ayudanteId: (ayudanteId as string) || '',
            ayudanteNombre: (ayudanteNombre as string) || '',
            ...(lat != null ? { lat: parseFloat(lat as string) || null } : {}),
            ...(lng != null ? { lng: parseFloat(lng as string) || null } : {}),
            syncStatus: 'synced',
            fechaEmision: emisionDate,
            syncedAt: new Date(),
            createdAt: createdAt ? new Date(createdAt as string) : emisionDate,
          },
        });

        results.push({ localId: (localId as string) || '', serverId: venta.id, ok: true });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error al guardar';
        results.push({ localId: (v.localId as string) || '', serverId: '', ok: false, error: msg });
      }
    }

    return NextResponse.json({ results });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error en batch sync';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
