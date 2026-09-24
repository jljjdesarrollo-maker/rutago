import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export interface DeviceBindingGlobalConfig {
  enabled: boolean;
  updatedAt: string;
  updatedBy?: string;
}

const DEFAULT_DEVICE_BINDING_CONFIG: DeviceBindingGlobalConfig = {
  enabled: false, // Por defecto en OFF para no bloquear a nadie hasta que el SuperAdmin lo decida
  updatedAt: new Date().toISOString(),
  updatedBy: 'SUPERADMIN_DEFAULT',
};

const BUNDLED_FILE_PATH = path.join(process.cwd(), 'db', 'device-binding-config.json');

function getRuntimeFilePath(): string {
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.cwd().startsWith('/var/task')) {
    return path.join(os.tmpdir(), 'rutago-device-binding-config.json');
  }
  return path.join(process.cwd(), 'db', 'device-binding-config.json');
}

const globalStore = globalThis as unknown as {
  __rutago_device_binding_config__?: DeviceBindingGlobalConfig;
};

export async function getDeviceBindingGlobalConfigAsync(): Promise<DeviceBindingGlobalConfig> {
  if (globalStore.__rutago_device_binding_config__) {
    return globalStore.__rutago_device_binding_config__;
  }

  let config: DeviceBindingGlobalConfig = { ...DEFAULT_DEVICE_BINDING_CONFIG };

  // 1. Intentar consultar desde PostgreSQL en la nube vía BusVT (SYS_CONFIG_DEVICE_BINDING)
  try {
    const record = await (db as any).busVT.findUnique({
      where: { codigo: 'SYS_CONFIG_DEVICE_BINDING' },
    });
    if (record?.frecuencias && typeof record.frecuencias === 'object' && !Array.isArray(record.frecuencias)) {
      const stored = record.frecuencias as unknown as DeviceBindingGlobalConfig;
      if (typeof stored.enabled === 'boolean') {
        config = { ...DEFAULT_DEVICE_BINDING_CONFIG, ...stored };
        globalStore.__rutago_device_binding_config__ = config;
        return config;
      }
    }
  } catch {
    // Si la BD no está disponible en este instante, continuar con archivo / memoria
  }

  // 2. Fallback de archivo local
  const runtimePath = getRuntimeFilePath();
  const pathsToTry = [runtimePath, BUNDLED_FILE_PATH];

  for (const p of pathsToTry) {
    try {
      if (fs.existsSync(p)) {
        const raw = fs.readFileSync(p, 'utf-8');
        const parsed = JSON.parse(raw);
        if (typeof parsed.enabled === 'boolean') {
          config = parsed;
          break;
        }
      }
    } catch {
      // Ignorar fallback
    }
  }

  globalStore.__rutago_device_binding_config__ = config;
  return config;
}

export function getDeviceBindingGlobalConfig(): DeviceBindingGlobalConfig {
  if (globalStore.__rutago_device_binding_config__) {
    return globalStore.__rutago_device_binding_config__;
  }

  let config: DeviceBindingGlobalConfig = { ...DEFAULT_DEVICE_BINDING_CONFIG };
  const runtimePath = getRuntimeFilePath();
  const pathsToTry = [runtimePath, BUNDLED_FILE_PATH];

  for (const p of pathsToTry) {
    try {
      if (fs.existsSync(p)) {
        const raw = fs.readFileSync(p, 'utf-8');
        const parsed = JSON.parse(raw);
        if (typeof parsed.enabled === 'boolean') {
          config = parsed;
          break;
        }
      }
    } catch {
      // Ignorar fallback
    }
  }

  globalStore.__rutago_device_binding_config__ = config;
  return config;
}

export async function saveDeviceBindingGlobalConfigAsync(config: DeviceBindingGlobalConfig): Promise<void> {
  globalStore.__rutago_device_binding_config__ = config;
  saveDeviceBindingGlobalConfig(config);

  // Persistir en PostgreSQL de forma durable (sobrevive a Vercel Serverless cold starts)
  try {
    await (db as any).busVT.upsert({
      where: { codigo: 'SYS_CONFIG_DEVICE_BINDING' },
      create: {
        codigo: 'SYS_CONFIG_DEVICE_BINDING',
        nombre: 'Sistema Config Device Binding (Global)',
        activo: config.enabled,
        frecuencias: config as any,
      },
      update: {
        activo: config.enabled,
        frecuencias: config as any,
      },
    });
  } catch (err) {
    console.error('Error persistiendo device-binding en PostgreSQL:', err);
  }
}

export function saveDeviceBindingGlobalConfig(config: DeviceBindingGlobalConfig): void {
  globalStore.__rutago_device_binding_config__ = config;
  const runtimePath = getRuntimeFilePath();
  try {
    const dir = path.dirname(runtimePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(runtimePath, JSON.stringify(config, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error persistiendo device-binding-config:', err);
  }
}

// GET /api/config/device-binding
export async function GET() {
  try {
    const config = await getDeviceBindingGlobalConfigAsync();
    return NextResponse.json({
      success: true,
      config,
    });
  } catch (error) {
    console.error('Error GET device-binding config:', error);
    return NextResponse.json({
      success: true,
      config: DEFAULT_DEVICE_BINDING_CONFIG,
    });
  }
}

// PUT /api/config/device-binding (Solo SuperAdmin)
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { enabled } = body;

    const current = await getDeviceBindingGlobalConfigAsync();
    const updated: DeviceBindingGlobalConfig = {
      enabled: Boolean(enabled),
      updatedAt: new Date().toISOString(),
      updatedBy: 'SuperAdmin 9999',
    };

    await saveDeviceBindingGlobalConfigAsync(updated);

    return NextResponse.json({
      success: true,
      config: updated,
      message: updated.enabled
        ? 'Vinculación de Dispositivo Físico ACTIVADA en toda la flota'
        : 'Vinculación de Dispositivo Físico DESACTIVADA (acceso libre con PIN)',
    });
  } catch (error) {
    console.error('Error PUT device-binding config:', error);
    return NextResponse.json(
      { success: false, error: 'Error al actualizar configuración de dispositivo' },
      { status: 500 }
    );
  }
}
