import { NextRequest, NextResponse } from 'next/server';
import { CONFIGURACION_FLOTA_DEFAULT, calcularVentanasParaFrecuencias } from '@/lib/vt-ventanas-catalogo';
import { FlotaConfiguracionCompleta, VTConfiguracionItem } from '@/types/vt-ventanas';

export const dynamic = 'force-dynamic';

// Estado en memoria del servidor
let memoryFullConfig: FlotaConfiguracionCompleta = { ...CONFIGURACION_FLOTA_DEFAULT };

/**
 * GET /api/config/vt-full
 * Descarga el catálogo completo de VTs, frecuencias y ventanas operativas.
 * Solo se invoca cuando el handshake de /api/config/vt-version detecta un cambio.
 */
export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      data: memoryFullConfig,
    });
  } catch (error) {
    console.error('[API vt-full] Error:', error);
    return NextResponse.json(
      {
        success: true,
        data: CONFIGURACION_FLOTA_DEFAULT,
        fallback: true,
      },
      { status: 200 }
    );
  }
}

/**
 * PUT /api/config/vt-full
 * Actualización administrativa (SuperAdmin):
 * Permite cambiar horarios de turnos, recalcular ventanas o activar/desactivar el modo Retén.
 * Incrementa automáticamente el version fingerprint para notificar a la flota.
 */
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { vts, modoRetenActivo, fechaInicioReten, busAnclaReten } = body;

    const nuevaVersion = (memoryFullConfig.version || 1) + 1;
    const nuevoUpdatedAt = new Date().toISOString();

    // Si se enviaron VTs modificados, recalcular sus ventanas automáticamente
    let vtsActualizados: VTConfiguracionItem[] = memoryFullConfig.vts;
    if (Array.isArray(vts) && vts.length > 0) {
      vtsActualizados = vts.map((item: any) => {
        const ventanasRecalculadas = calcularVentanasParaFrecuencias(item.codigo, item.frecuencias || []);
        return {
          ...item,
          ventanas: ventanasRecalculadas,
        };
      });
    }

    memoryFullConfig = {
      version: nuevaVersion,
      updatedAt: nuevoUpdatedAt,
      modoRetenActivo: typeof modoRetenActivo === 'boolean' ? modoRetenActivo : memoryFullConfig.modoRetenActivo,
      fechaInicioReten: fechaInicioReten !== undefined ? fechaInicioReten : memoryFullConfig.fechaInicioReten,
      busAnclaReten: busAnclaReten || memoryFullConfig.busAnclaReten,
      hash: `vt-cfg-v${nuevaVersion}-${Date.now()}`,
      vts: vtsActualizados,
    };

    return NextResponse.json({
      success: true,
      data: memoryFullConfig,
      message: `Configuración actualizada a versión ${nuevaVersion} exitosamente`,
    });
  } catch (error) {
    console.error('[API vt-full PUT] Error:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Error al actualizar configuración' },
      { status: 500 }
    );
  }
}
