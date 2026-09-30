/**
 * Tipos oficiales para el módulo de Ventanas Operativas,
 * Gestión de Horarios Dinámicos y Versión Fingerprint (RutaGo)
 */

export type TipoVentanaOperativa =
  | 'VENTANA_DIURNA_LOJA'      // >= 90 min en Base Loja (Taller, Lubricadora, Fosa)
  | 'VENTANA_CORTA_LOJA'       // < 90 min en Base Loja (Escala técnica, almuerzo, diésel)
  | 'CABECERA_PARROQUIA'       // Espera en Vilcabamba, El Tambo, La Elvira, Yangana
  | 'PERNOCTA_EXTERNA'         // Duerme en Vilcabamba / Yangana / Quinara
  | 'PERNOCTA_LOJA'            // Duerme en Loja
  | 'DIA_RETEN_LIBRE';         // Día 16 (si retén está activo): 24h libres, 0 km

export interface VentanaOperativa {
  id: string;                          // ej. 'vt08-v1'
  tipo: TipoVentanaOperativa;
  ubicacion: string;                    // 'Base Loja', 'Vilcabamba', 'El Tambo', etc.
  horaInicio: string;                  // '10:30'
  horaFin: string;                     // '13:40'
  duracionMinutos: number;             // 190
  vueltaPreviaIndex: number;           // Índice de la frecuencia de llegada
  vueltaSiguienteIndex: number;        // Índice de la frecuencia de salida
  esAptaParaTaller: boolean;           // true si duracionMinutos >= 90 en Base Loja
  mantenimientosSugeridos: string[];   // Códigos de ítems de catálogo (ej: 'MNT-ACEITE-CORONA', 'MNT-MUELLES-BUJES')
  descripcionAmigable: string;         // '3h 10m libres en Loja (10:30 - 13:40)'
}

export interface VTFrecuenciaDetallada {
  id?: string;
  order: number;
  routeFrom: string;
  routeTo: string;
  time: string;                       // Hora fijada (salida de Loja o cabecera de parroquia)
  horaLlegadaEstimada: string;        // Calculada con base en tiempos de viaje oficiales
  tiempoViajeMinutos: number;         // 90 (Vilca), 120 (Tambo/Elvira), etc.
  esPernoctaRetorno?: boolean;        // true si es la primera vuelta del día 2 tras pernocta
  cabeceraSalidaReal?: string;  horaSalidaRealEfectiva?: string;        // Ej. "Salida 16:15 El Tambo -> Malacatos 17:15"
}

export interface VTConfiguracionItem {
  codigo: string;                     // 'VT1', ..., 'VT15'
  nombre: string;
  frecuencias: VTFrecuenciaDetallada[];
  ventanas: VentanaOperativa[];
  alertaEnlaceSiguiente?: string;     // Ej. "Alerta VT14->VT15: Enlace de solo 5 min en Loja (07:40 a 07:45)"
  kmTeoricoTotal: number;             // Suma de km estándar del paquete
  activo: boolean;
}

export interface FlotaConfiguracionFingerprint {
  version: number;                    // Versión incremental (default: 1)
  updatedAt: string;                  // ISO string
  modoRetenActivo: boolean;           // false: 15 días continuos | true: 16 días con retén
  fechaInicioReten?: string;          // YYYY-MM-DD
  busAnclaReten?: string;             // Disco ancla en retén al iniciar (ej. "01")
  hash: string;                       // 'vt-cfg-v1'
}

export interface FlotaConfiguracionCompleta extends FlotaConfiguracionFingerprint {
  vts: VTConfiguracionItem[];
}
