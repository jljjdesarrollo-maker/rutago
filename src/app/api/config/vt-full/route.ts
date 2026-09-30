import { NextRequest, NextResponse } from 'next/server';
import { getServerConfig, updateServerConfig } from '@/lib/server-vt-config';
import { CONFIGURACION_FLOTA_DEFAULT } from '@/lib/vt-ventanas-catalogo';

export const dynamic = 'force-dynamic';

/**
 * GET /api/config/vt-full
 * Descarga el catálogo completo de VTs, frecuencias y ventanas operativas.
 * Solo se invoca cuando el handshake de /api/config/vt-version detecta un cambio.
 */
export async function GET() {
  try {
    const fullConfig = getServerConfig();
    return NextResponse.json({
      success: true,
      data: fullConfig,
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
    const updatedConfig = updateServerConfig(body);

    return NextResponse.json({
      success: true,
      data: updatedConfig,
      message: `Configuración actualizada a versión ${updatedConfig.version} exitosamente`,
    });
  } catch (error) {
    console.error('[API vt-full PUT] Error:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Error al actualizar configuración' },
      { status: 500 }
    );
  }
}
