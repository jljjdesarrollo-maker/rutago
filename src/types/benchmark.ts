import { type TipoOperacionBus } from './fleet';

export type BenchmarkPeriod = 'HOY' | '7_DIAS' | 'CICLO_15D' | 'ESTE_MES' | 'MES_ANTERIOR' | 'HISTORICO';

export type BenchmarkCircuitGroup = 'TRONCAL_VT' | 'ALIMENTADOR_P';

export type MadurezMuestralNivel = 'CALIBRACION' | 'EN_PROGRESO' | 'CERTIFICADO';

export interface MadurezMuestral {
  nivel: MadurezMuestralNivel;
  badge: string; // "🌱 Calibración (1 a 4 días)", "🟡 En Progreso (5 a 14 días)", "🟢 Ciclo VT Certificado"
  badgeCorto: string; // "🌱 Calibración (X/15)", "🟡 En Progreso (X/15)", "🟢 Certificado (15+)"
  label: string; // "Calibración Temprana", "Tendencia en Formación", "Muestra Certificada"
  descripcion: string;
  diasOperados: number;
  umbralCertificado: number; // 15
}

export interface EvolucionTemporalCiclo {
  ierActual: number;
  ierAnterior: number | null;
  deltaIER: number | null; // ierActual - ierAnterior (ej. +9.0)
  produccionActual: number;
  produccionAnterior: number | null;
  deltaProduccion: number | null; // produccionActual - produccionAnterior (ej. +1100.00)
  ipfActual: number;
  ipfAnterior: number | null;
  deltaIPF: number | null;
  vueltasActual: number;
  vueltasAnterior: number | null;
  diasActual: number;
  diasAnterior: number | null;
  mensajeEvolucion: string;
  tendencia: 'MEJORA' | 'ESTABLE' | 'DESCENSO' | 'INICIAL';
}

export interface PodioProduccionItem {
  posicion: 1 | 2 | 3;
  medalla: '🥇' | '🥈' | '🥉';
  busId: string;
  numeroDisco: string;
  nombreDisplay: string;
  codigoAnonimo: string;
  produccionTotal: number;
  ipf: number;
  vueltasEfectivas: number;
  diasOperados: number;
  esUnidadPropia: boolean;
}

export interface BrechaEfectivoTuUnidad {
  busId: string;
  disco: string;
  produccionTuUnidad: number;
  mediaGrupo: number;
  brechaEfectivo: number; // produccionTuUnidad - mediaGrupo (negativo = dinero que faltó / en la calle)
  brechaPorDia: number; // brechaEfectivo / (diasOperados > 0 ? diasOperados : 1)
  lider: {
    nombreDisplay: string;
    produccionTotal: number;
  };
  diferenciaVsLider: number; // produccionTuUnidad - lider.produccionTotal
  diasOperados: number;
  vueltasEfectivas: number;
  ipf: number;
}

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

  // Atributos de Identidad y Anonimización (Fase 8)
  esUnidadPropia: boolean; // True si es la unidad del socio autenticado
  codigoAnonimo: string; // "#T-01", "#T-02", "#A-01"
  nombreDisplay: string; // "Bus 01 (Tu Unidad)" vs "Unidad Troncal #T-02"
  placaDisplay: string; // "TAA-5152" vs "Confidencial"
  propietarioDisplay: string; // "José Leonardo Jaya Jaramillo (Tú)" vs "Socio Cooperativa"
  datosPrivadosOcultos: boolean; // True si los libros de caja y gastos están blindados
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

  // Nuevas Métricas Etapa 8: Inteligencia de Benchmark y Ciclo VT
  ier: number; // Índice de Eficiencia Relativa (Base 100): (ipf / promedioGrupoIPF) * 100
  madurezMuestral: MadurezMuestral;
  brechaEfectivoMedia: number; // produccionTotal - produccionPromedioPorUnidad
  diferenciaVsLider: number; // produccionTotal - lider.produccionTotal
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

  // Nuevos Indicadores Etapa 8
  podioProduccion: PodioProduccionItem[];
  brechaTuUnidad: BrechaEfectivoTuUnidad | null;
  evolucionTemporalTuUnidad: EvolucionTemporalCiclo | null;
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
  activeBusId: string;
  isSuperAdminMode?: boolean;
}
