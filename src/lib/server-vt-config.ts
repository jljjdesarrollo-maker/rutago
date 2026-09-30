import { CONFIGURACION_FLOTA_DEFAULT, calcularVentanasParaFrecuencias } from './vt-ventanas-catalogo';
import { FlotaConfiguracionCompleta, FlotaConfiguracionFingerprint, VTConfiguracionItem } from '../types/vt-ventanas';

let memoryConfig: FlotaConfiguracionCompleta = { ...CONFIGURACION_FLOTA_DEFAULT };

export function getServerConfig(): FlotaConfiguracionCompleta {
  return memoryConfig;
}

export function getServerFingerprint(): FlotaConfiguracionFingerprint {
  return {
    version: memoryConfig.version,
    updatedAt: memoryConfig.updatedAt,
    modoRetenActivo: memoryConfig.modoRetenActivo,
    fechaInicioReten: memoryConfig.fechaInicioReten,
    busAnclaReten: memoryConfig.busAnclaReten,
    hash: memoryConfig.hash,
  };
}

export function updateServerConfig(params: {
  vts?: any[];
  modoRetenActivo?: boolean;
  fechaInicioReten?: string;
  busAnclaReten?: string;
}): FlotaConfiguracionCompleta {
  const nuevaVersion = (memoryConfig.version || 1) + 1;
  const nuevoUpdatedAt = new Date().toISOString();

  let vtsActualizados: VTConfiguracionItem[] = memoryConfig.vts;
  if (Array.isArray(params.vts) && params.vts.length > 0) {
    vtsActualizados = params.vts.map((item: any) => {
      const ventanasRecalculadas = calcularVentanasParaFrecuencias(item.codigo, item.frecuencias || []);
      return {
        ...item,
        ventanas: ventanasRecalculadas,
      };
    });
  }

  memoryConfig = {
    version: nuevaVersion,
    updatedAt: nuevoUpdatedAt,
    modoRetenActivo: typeof params.modoRetenActivo === 'boolean' ? params.modoRetenActivo : memoryConfig.modoRetenActivo,
    fechaInicioReten: params.fechaInicioReten !== undefined ? params.fechaInicioReten : memoryConfig.fechaInicioReten,
    busAnclaReten: params.busAnclaReten || memoryConfig.busAnclaReten,
    hash: `vt-cfg-v${nuevaVersion}-${Date.now()}`,
    vts: vtsActualizados,
  };

  return memoryConfig;
}
