import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';

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
    const config = getDeviceBindingGlobalConfig();
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

    const current = getDeviceBindingGlobalConfig();
    const updated: DeviceBindingGlobalConfig = {
      enabled: Boolean(enabled),
      updatedAt: new Date().toISOString(),
      updatedBy: 'SuperAdmin 9999',
    };

    saveDeviceBindingGlobalConfig(updated);

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
