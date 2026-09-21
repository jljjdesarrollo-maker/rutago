import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export interface BusMantenimientoConfig {
  busId: string;
  moduloActivo: boolean;
  nivelControl: 'BASICO' | 'MEDIO' | 'TOTAL';
  itemsActivos?: Record<string, boolean>;
  decisionTomada: boolean;
  fechaDecision: string;
  origenDispositivo?: string;
  updatedAt: string;
}

const FILE_PATH = path.join(process.cwd(), 'db', 'mantenimiento-config.json');

// Configuración inicial pre-calibrada oficial para el Bus 01 del Socio Líder
const DEFAULT_CONFIGS: Record<string, BusMantenimientoConfig> = {
  'BUS-01': {
    busId: 'BUS-01',
    moduloActivo: true,
    nivelControl: 'TOTAL',
    decisionTomada: true,
    fechaDecision: '2026-09-21',
    origenDispositivo: 'Socio Líder (José Leonardo Jaya Jaramillo)',
    updatedAt: new Date().toISOString(),
  },
};

// Variable en memoria compartida por el runtime Node
const globalStore = globalThis as unknown as {
  __rutago_mantenimiento_configs__?: Record<string, BusMantenimientoConfig>;
};

function cargarConfiguraciones(): Record<string, BusMantenimientoConfig> {
  if (globalStore.__rutago_mantenimiento_configs__) {
    return globalStore.__rutago_mantenimiento_configs__;
  }

  let configs: Record<string, BusMantenimientoConfig> = { ...DEFAULT_CONFIGS };

  try {
    if (fs.existsSync(FILE_PATH)) {
      const raw = fs.readFileSync(FILE_PATH, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        configs = { ...DEFAULT_CONFIGS, ...parsed };
      }
    } else {
      guardarEnArchivo(configs);
    }
  } catch (err) {
    console.warn('Aviso: No se pudo leer archivo mantenimiento-config.json, usando memoria:', err);
  }

  globalStore.__rutago_mantenimiento_configs__ = configs;
  return configs;
}

function guardarEnArchivo(configs: Record<string, BusMantenimientoConfig>): void {
  try {
    const dir = path.dirname(FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(FILE_PATH, JSON.stringify(configs, null, 2), 'utf8');
  } catch (err) {
    console.warn('Aviso: No se pudo escribir en mantenimiento-config.json:', err);
  }
}

// GET /api/config/mantenimiento?busId=BUS-01
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const busId = searchParams.get('busId');
    const configs = cargarConfiguraciones();

    if (busId) {
      const busConfig = configs[busId] || {
        busId,
        moduloActivo: busId === 'BUS-01',
        nivelControl: busId === 'BUS-01' ? 'TOTAL' : 'BASICO',
        decisionTomada: busId === 'BUS-01',
        fechaDecision: new Date().toISOString().split('T')[0],
        updatedAt: new Date().toISOString(),
      };
      return NextResponse.json({
        success: true,
        data: busConfig,
      });
    }

    return NextResponse.json({
      success: true,
      data: configs,
    });
  } catch (error) {
    console.error('Error al consultar configuracion de mantenimiento:', error);
    return NextResponse.json(
      { success: false, message: 'Error al consultar configuración' },
      { status: 500 }
    );
  }
}

// POST o PUT /api/config/mantenimiento
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      busId,
      moduloActivo,
      nivelControl,
      itemsActivos,
      decisionTomada,
      fechaDecision,
      origenDispositivo,
    } = body;

    if (!busId) {
      return NextResponse.json(
        { success: false, message: 'busId es requerido' },
        { status: 400 }
      );
    }

    const configs = cargarConfiguraciones();
    const prev = configs[busId] || {
      busId,
      moduloActivo: false,
      nivelControl: 'BASICO',
      decisionTomada: false,
      fechaDecision: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString(),
    };

    const updated: BusMantenimientoConfig = {
      ...prev,
      busId,
      moduloActivo: typeof moduloActivo === 'boolean' ? moduloActivo : prev.moduloActivo,
      nivelControl:
        nivelControl === 'TOTAL' || nivelControl === 'MEDIO' || nivelControl === 'BASICO'
          ? nivelControl
          : prev.nivelControl,
      itemsActivos: itemsActivos ? { ...(prev.itemsActivos || {}), ...itemsActivos } : prev.itemsActivos,
      decisionTomada: typeof decisionTomada === 'boolean' ? decisionTomada : true,
      fechaDecision: fechaDecision || prev.fechaDecision || new Date().toISOString().split('T')[0],
      origenDispositivo: origenDispositivo || prev.origenDispositivo || 'Cliente Web / Móvil',
      updatedAt: new Date().toISOString(),
    };

    configs[busId] = updated;
    globalStore.__rutago_mantenimiento_configs__ = configs;
    guardarEnArchivo(configs);

    return NextResponse.json({
      success: true,
      data: updated,
      message: `Configuración de mantenimiento para ${busId} guardada en servidor con éxito`,
    });
  } catch (error) {
    console.error('Error al guardar configuracion de mantenimiento:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Error al guardar' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  return PUT(req);
}
