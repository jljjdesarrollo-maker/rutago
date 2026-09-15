import { type TipoOperacionBus } from './fleet';

export type BenchmarkPeriod = 'HOY' | '7_DIAS' | 'ESTE_MES' | 'MES_ANTERIOR' | 'HISTORICO';

export type BenchmarkCircuitGroup = 'TRONCAL_VT' | 'ALIMENTADOR_P';

export interface ComparativaMedia {
  diferencia: number; // ipf - promedioGrupoIPF
  porcentajeDiferencia: number; // ((ipf / promedioGrupoIPF) - 1) * 100
  estado: 'SUPERIOR' | 'EN_PROMEDIO' | 'INFERIOR';
}

export interface BusBenchmarkMetric {
  busId: string; // "BUS-01", "BUS-10"
  numeroDisco: string; // "01", "10", "16"
  placa: string; // "TAA-5152"
  marca: string; // "Hino AK"
  capacidadAsientos: number;
  tipoOperacion: TipoOperacionBus;
  esSocioLider: boolean;
  diasOperados: number;
  vueltasTotales: number;
  vueltasEfectivas: number; // Vueltas realizadas normalmente o especiales
  vueltasNoRealizadas: number;
  produccionTotal: number; // Efectivo + Caja Común + Sobrante
  efectivoTotal: number;
  cajaComunTotal: number;
  totalGastos: number;
  utilidadNeta: number; // Producción - Gastos
  kmTotales: number;
  ipf: number; // Ingreso Promedio por Frecuencia = produccionTotal / (vueltasEfectivas > 0 ? vueltasEfectivas : 1)
  ingresoPorDia: number;
  rendimientoPorKm: number; // produccionTotal / (kmTotales > 0 ? kmTotales : 1)
  comparativaMediaIPF: ComparativaMedia;
  ultimoRegistro?: string; // Fecha del último arqueo
}

export interface CircuitGroupBenchmark {
  circuito: BenchmarkCircuitGroup;
  titulo: string;
  subtitulo: string;
  capacidadReferencia: number; // 45 o 28
  totalUnidades: number;
  unidadesConRegistros: number;
  produccionConsolidada: number;
  efectivoConsolidado: number;
  cajaComunConsolidada: number;
  vueltasConsolidadas: number;
  vueltasNoRealizadasConsolidadas: number;
  ipfPromedioGrupo: number; // Ingreso Promedio por Frecuencia de todo el grupo
  produccionPromedioPorUnidad: number;
  kmConsolidados: number;
  ranking: BusBenchmarkMetric[]; // Ordenado por IPF desc
}

export interface FleetBenchmarkSummary {
  periodo: BenchmarkPeriod;
  periodoLabel: string;
  fechaInicio: string;
  fechaFin: string;
  diasEnPeriodo: number;
  totalRegistrosAuditados: number;
  troncal: CircuitGroupBenchmark;
  alimentadores: CircuitGroupBenchmark;
  fechaCalculo: string;
}
