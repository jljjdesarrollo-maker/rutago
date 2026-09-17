export interface TramoKilometraje {
  id: string;              // ej: 'LOJA_VILCA_IDA'
  origen: string;          // 'Loja'
  destino: string;         // 'Vilcabamba'
  sentido: 'IDA' | 'RETORNO';
  distanciaKm: number;     // ej: 42.0
  activo: boolean;         // true
  updatedAt: string;       // ISO string de auditoría
}

export interface ConfiguracionKilometrajeRutas {
  version: number;
  tramos: TramoKilometraje[];
  toleranciaDefectoPorciento: number; // Margen elástico superior (default: 25%)
  toleranciaInferiorPorciento: number; // Margen elástico inferior (default: 10%)
  maxSaltoDiarioKm: number;           // Tope anti-outlier absoluto (default: 600 km)
  updatedAt?: string;
}

export const DEFAULT_TRAMOS_KM: TramoKilometraje[] = [
  {
    id: 'LOJA_VILCA_IDA',
    origen: 'Loja',
    destino: 'Vilcabamba',
    sentido: 'IDA',
    distanciaKm: 42.0,
    activo: true,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'VILCA_LOJA_RET',
    origen: 'Vilcabamba',
    destino: 'Loja',
    sentido: 'RETORNO',
    distanciaKm: 42.0,
    activo: true,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'LOJA_TAMBO_IDA',
    origen: 'Loja',
    destino: 'El Tambo',
    sentido: 'IDA',
    distanciaKm: 52.5,
    activo: true,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'TAMBO_LOJA_RET',
    origen: 'El Tambo',
    destino: 'Loja',
    sentido: 'RETORNO',
    distanciaKm: 52.5,
    activo: true,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'LOJA_YANG_IDA',
    origen: 'Loja',
    destino: 'Yangana',
    sentido: 'IDA',
    distanciaKm: 67.0,
    activo: true,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'YANG_LOJA_RET',
    origen: 'Yangana',
    destino: 'Loja',
    sentido: 'RETORNO',
    distanciaKm: 67.0,
    activo: true,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'LOJA_ELVIRA_IDA',
    origen: 'Loja',
    destino: 'La Elvira',
    sentido: 'IDA',
    distanciaKm: 78.0,
    activo: true,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'ELVIRA_LOJA_RET',
    origen: 'La Elvira',
    destino: 'Loja',
    sentido: 'RETORNO',
    distanciaKm: 78.0,
    activo: true,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'LOJA_ZAHU_IDA',
    origen: 'Loja',
    destino: 'Zahuayco',
    sentido: 'IDA',
    distanciaKm: 91.0,
    activo: true,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'ZAHU_LOJA_RET',
    origen: 'Zahuayco',
    destino: 'Loja',
    sentido: 'RETORNO',
    distanciaKm: 91.0,
    activo: true,
    updatedAt: new Date().toISOString(),
  },
];

export const DEFAULT_CONFIG_KILOMETRAJE_RUTAS: ConfiguracionKilometrajeRutas = {
  version: 1,
  tramos: DEFAULT_TRAMOS_KM,
  toleranciaDefectoPorciento: 25,
  toleranciaInferiorPorciento: 10,
  maxSaltoDiarioKm: 600,
  updatedAt: new Date().toISOString(),
};
