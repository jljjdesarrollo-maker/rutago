import { NextResponse } from 'next/server';
import { CONFIGURACION_FLOTA_DEFAULT } from '@/lib/vt-ventanas-catalogo';
import { FlotaConfiguracionFingerprint } from '@/types/vt-ventanas';

export const dynamic = 'force-dynamic';

// Estado en memoria del servidor (actualizable vía PUT por SuperAdmin o configurable en BD)
let memoryFingerprint: FlotaConfiguracionFingerprint = {
  version: CONFIGURACION_FLOTA_DEFAULT.version,
  updatedAt: CONFIGURACION_FLOTA_DEFAULT.updatedAt,
  modoRetenActivo: CONFIGURACION_FLOTA_DEFAULT.modoRetenActivo,
  fechaInicioReten: CONFIGURACION_FLOTA_DEFAULT.fechaInicioReten,
  busAnclaReten: CONFIGURACION_FLOTA_DEFAULT.busAnclaReten,
  hash: CONFIGURACION_FLOTA_DEFAULT.hash,
};

/**
 * GET /api/config/vt-version
 * Handshake ultraligero de solo ~10 bytes para micro-chequeo de versión.
 * Permite a la app móvil no consultar la BD en el 99.9% de los días.
 */
export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      data: memoryFingerprint,
    });
  } catch (error) {
    console.error('[API vt-version] Error:', error);
    return NextResponse.json(
      {
        success: true,
        data: {
          version: 1,
          updatedAt: new Date().toISOString(),
          modoRetenActivo: false,
          hash: 'vt-fallback',
        },
      },
      { status: 200 }
    );
  }
}
