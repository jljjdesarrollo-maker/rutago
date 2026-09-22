import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export interface BusMantenimientoConfig {
  busId: string;
  moduloActivo: boolean;
  nivelControl: "BASICO" | "MEDIO" | "TOTAL";
  itemsActivos?: Record<string, boolean>;
  combosPersonalizados?: Record<string, any>;
  catalogoPersonalizado?: any[];
  decisionTomada: boolean;
  fechaDecision: string;
  origenDispositivo?: string;
  updatedAt: string;
}

// Ruta empaquetada (solo lectura en producción serverless)
const BUNDLED_FILE_PATH = path.join(process.cwd(), "db", "mantenimiento-config.json");

// Ruta escribible en tiempo de ejecución (en Vercel / AWS Lambda se usa os.tmpdir() que sí tiene permisos de escritura)
function getRuntimeFilePath(): string {
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.cwd().startsWith("/var/task")) {
    return path.join(os.tmpdir(), "rutago-mantenimiento-config.json");
  }
  return path.join(process.cwd(), "db", "mantenimiento-config.json");
}

// Configuración inicial pre-calibrada oficial para el Bus 01 del Socio Líder
const DEFAULT_CONFIGS: Record<string, BusMantenimientoConfig> = {
  "BUS-01": {
    busId: "BUS-01",
    moduloActivo: true,
    nivelControl: "TOTAL",
    decisionTomada: true,
    fechaDecision: "2026-09-21",
    origenDispositivo: "Socio Líder (José Leonardo Jaya Jaramillo)",
    combosPersonalizados: {},
    updatedAt: new Date().toISOString(),
  },
};

// Variable en memoria compartida por el runtime Node
const globalStore = globalThis as unknown as {
  __rutago_mantenimiento_configs__?: Record<string, BusMantenimientoConfig>;
};

function guardarEnArchivo(configs: Record<string, BusMantenimientoConfig>): void {
  const runtimePath = getRuntimeFilePath();
  try {
    const dir = path.dirname(runtimePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(runtimePath, JSON.stringify(configs, null, 2), "utf8");
  } catch (err: any) {
    if (err?.code === "EROFS") {
      try {
        const tmpPath = path.join(os.tmpdir(), "rutago-mantenimiento-config.json");
        fs.writeFileSync(tmpPath, JSON.stringify(configs, null, 2), "utf8");
        return;
      } catch {
        // En memoria sigue disponible
      }
    }
    console.warn("Aviso: Persistencia temporal en archivo no disponible, manteniendo en memoria:", err?.message || err);
  }
}

async function cargarConfiguracionesAsync(): Promise<Record<string, BusMantenimientoConfig>> {
  if (globalStore.__rutago_mantenimiento_configs__) {
    return globalStore.__rutago_mantenimiento_configs__;
  }

  let configs: Record<string, BusMantenimientoConfig> = { ...DEFAULT_CONFIGS };

  // 1. Intentar consultar desde PostgreSQL en la nube vía BusVT (SYS_CONFIG_MANTENIMIENTO)
  try {
    const record = await (db as any).busVT.findUnique({
      where: { codigo: "SYS_CONFIG_MANTENIMIENTO" },
    });
    if (record?.frecuencias && typeof record.frecuencias === "object" && !Array.isArray(record.frecuencias)) {
      configs = { ...DEFAULT_CONFIGS, ...(record.frecuencias as Record<string, BusMantenimientoConfig>) };
      globalStore.__rutago_mantenimiento_configs__ = configs;
      return configs;
    }
  } catch {
    // Si la BD no está disponible, continuar con archivo
  }

  // 2. Fallback a archivos en disco
  const runtimePath = getRuntimeFilePath();
  const pathsToTry = [runtimePath, BUNDLED_FILE_PATH];
  for (const p of pathsToTry) {
    try {
      if (fs.existsSync(p)) {
        const raw = fs.readFileSync(p, "utf8");
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          configs = { ...DEFAULT_CONFIGS, ...parsed };
          break;
        }
      }
    } catch {
      // Intentar siguiente ruta de respaldo
    }
  }

  globalStore.__rutago_mantenimiento_configs__ = configs;
  return configs;
}

async function guardarConfiguracionesAsync(configs: Record<string, BusMantenimientoConfig>): Promise<void> {
  globalStore.__rutago_mantenimiento_configs__ = configs;
  guardarEnArchivo(configs);

  try {
    await (db as any).busVT.upsert({
      where: { codigo: "SYS_CONFIG_MANTENIMIENTO" },
      create: {
        codigo: "SYS_CONFIG_MANTENIMIENTO",
        nombre: "Sistema Config Mantenimiento (Global)",
        activo: false,
        frecuencias: configs,
      },
      update: {
        frecuencias: configs,
        activo: false,
      },
    });
  } catch (dbErr) {
    console.warn("Aviso: Persistencia en PostgreSQL diferida o no disponible:", dbErr);
  }
}

// GET /api/config/mantenimiento?busId=BUS-01
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const busId = searchParams.get("busId");
    const configs = await cargarConfiguracionesAsync();

    if (busId) {
      const busConfig = configs[busId] || {
        busId,
        moduloActivo: busId === "BUS-01",
        nivelControl: busId === "BUS-01" ? "TOTAL" : "BASICO",
        decisionTomada: busId === "BUS-01",
        fechaDecision: new Date().toISOString().split("T")[0],
        combosPersonalizados: {},
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
    console.error("Error al consultar configuracion de mantenimiento:", error);
    return NextResponse.json(
      { success: false, message: "Error al consultar configuración" },
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
      combosPersonalizados,
      comboActualizado,
      comboEliminadoEstacionId,
      catalogoPersonalizado,
      decisionTomada,
      fechaDecision,
      origenDispositivo,
    } = body;

    if (!busId) {
      return NextResponse.json(
        { success: false, message: "busId es requerido" },
        { status: 400 }
      );
    }

    const configs = await cargarConfiguracionesAsync();
    const prev = configs[busId] || {
      busId,
      moduloActivo: false,
      nivelControl: "BASICO",
      decisionTomada: false,
      fechaDecision: new Date().toISOString().split("T")[0],
      combosPersonalizados: {},
      updatedAt: new Date().toISOString(),
    };

    const prevCombos = { ...(prev.combosPersonalizados || {}) };

    if (combosPersonalizados && typeof combosPersonalizados === "object") {
      Object.assign(prevCombos, combosPersonalizados);
    }

    if (comboActualizado && comboActualizado.estacionId) {
      prevCombos[comboActualizado.estacionId] = comboActualizado;
    }

    if (comboEliminadoEstacionId && prevCombos[comboEliminadoEstacionId]) {
      delete prevCombos[comboEliminadoEstacionId];
    }

    const updated: BusMantenimientoConfig = {
      ...prev,
      busId,
      moduloActivo: typeof moduloActivo === "boolean" ? moduloActivo : prev.moduloActivo,
      nivelControl:
        nivelControl === "TOTAL" || nivelControl === "MEDIO" || nivelControl === "BASICO"
          ? nivelControl
          : prev.nivelControl,
      itemsActivos: itemsActivos ? { ...(prev.itemsActivos || {}), ...itemsActivos } : prev.itemsActivos,
      combosPersonalizados: prevCombos,
      catalogoPersonalizado: Array.isArray(catalogoPersonalizado)
        ? catalogoPersonalizado
        : prev.catalogoPersonalizado,
      decisionTomada: typeof decisionTomada === "boolean" ? decisionTomada : true,
      fechaDecision: fechaDecision || prev.fechaDecision || new Date().toISOString().split("T")[0],
      origenDispositivo: origenDispositivo || prev.origenDispositivo || "Cliente Web / Móvil",
      updatedAt: new Date().toISOString(),
    };

    configs[busId] = updated;
    await guardarConfiguracionesAsync(configs);

    return NextResponse.json({
      success: true,
      data: updated,
      message: `Configuración y recetas de mantenimiento para ${busId} guardadas en servidor con éxito`,
    });
  } catch (error) {
    console.error("Error al guardar configuracion de mantenimiento:", error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Error al guardar" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  return PUT(req);
}
