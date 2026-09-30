import { NextResponse } from 'next/server';
import { getServerFingerprint } from '@/lib/server-vt-config';

export const dynamic = 'force-dynamic';

/**
 * GET /api/config/vt-version
 * Handshake ultraligero de solo ~10 bytes para micro-chequeo de versión.
 * Permite a la app móvil no consultar la BD en el 99.9% de los días.
 */
export async function GET() {
  try {
    const fingerprint = getServerFingerprint();
    return NextResponse.json({
      success: true,
      data: fingerprint,
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
