import { NextRequest, NextResponse } from 'next/server';
import { DEFAULT_CONFIG_KILOMETRAJE_RUTAS, ConfiguracionKilometrajeRutas } from '@/types/rutas-km';

export const dynamic = 'force-dynamic';

// Variable de respaldo en memoria si la BD no está configurada o en offline
let memoryConfig: ConfiguracionKilometrajeRutas = { ...DEFAULT_CONFIG_KILOMETRAJE_RUTAS };

// GET /api/config/rutas-km
export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      data: memoryConfig,
    });
  } catch (error) {
    console.error('Error al obtener configuracion de kilometraje de rutas:', error);
    return NextResponse.json({
      success: true,
      data: DEFAULT_CONFIG_KILOMETRAJE_RUTAS,
      fallback: true,
    });
  }
}

// PUT /api/config/rutas-km (Protegido para SuperAdmin 9999)
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { tramos, toleranciaDefectoPorciento, toleranciaInferiorPorciento, maxSaltoDiarioKm, version } = body;

    memoryConfig = {
      version: typeof version === 'number' ? version + 1 : (memoryConfig.version || 1) + 1,
      tramos: Array.isArray(tramos) ? tramos : memoryConfig.tramos,
      toleranciaDefectoPorciento: typeof toleranciaDefectoPorciento === 'number' ? toleranciaDefectoPorciento : 25,
      toleranciaInferiorPorciento: typeof toleranciaInferiorPorciento === 'number' ? toleranciaInferiorPorciento : 10,
      maxSaltoDiarioKm: typeof maxSaltoDiarioKm === 'number' ? maxSaltoDiarioKm : 600,
      updatedAt: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      data: memoryConfig,
      message: 'Configuración de kilometraje de rutas actualizada correctamente',
    });
  } catch (error) {
    console.error('Error al guardar configuracion de kilometraje:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Error inesperado' },
      { status: 500 }
    );
  }
}
