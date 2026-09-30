/**
 * Catálogo Maestro y Motor Recalculador de Ventanas Operativas (RutaGo)
 * Conforme a las reglas de viaje oficiales de Transportes Vilcabamba Turis
 */

import {
  VentanaOperativa,
  VTFrecuenciaDetallada,
  VTConfiguracionItem,
  FlotaConfiguracionCompleta,
  TipoVentanaOperativa,
} from '../types/vt-ventanas';
import { VT_DATA } from './seed-vts';

// ─── TIEMPOS DE VIAJE OFICIALES (MINUTOS) ───
export const TIEMPOS_VIAJE_OFICIALES = {
  LOJA_A_VILCABAMBA: 90,        // 1h 30m
  VILCABAMBA_A_LOJA: 90,        // 1h 30m
  LOJA_A_EL_TAMBO: 120,         // 2h 00m
  EL_TAMBO_A_MALACATOS: 60,     // 1h 00m (tramo previo hacia Malacatos)
  MALACATOS_A_LOJA: 60,         // 1h 00m (tiempo desde control Malacatos a Loja)
  LOJA_A_LA_ELVIRA: 120,        // 2h 00m
  LA_ELVIRA_A_VILCABAMBA: 30,   // 30 min (tramo previo hacia Vilcabamba)
  LOJA_A_YANGANA: 120,          // 2h 00m
  YANGANA_A_VILCABAMBA: 30,     // 30 min
  LOJA_A_ZAHUAYCO: 120,         // 2h 00m
  ZAHUAYCO_A_VILCABAMBA: 30,    // 30 min
};

// ─── HELPERS DE TIEMPO ───
export function horaAMinutos(hora: string): number {
  if (!hora || !hora.includes(':')) return 0;
  const [h, m] = hora.split(':').map((n) => parseInt(n, 10));
  return (h || 0) * 60 + (m || 0);
}

export function minutosAHora(minutosTotales: number): string {
  // Normalizar dentro de 24 horas
  let m = minutosTotales % (24 * 60);
  if (m < 0) m += 24 * 60;
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

export function sumarMinutosAHora(hora: string, minutos: number): string {
  return minutosAHora(horaAMinutos(hora) + minutos);
}

export function diferenciaMinutosEntreHoras(horaInicio: string, horaFin: string): number {
  const mIni = horaAMinutos(horaInicio);
  const mFin = horaAMinutos(horaFin);
  if (mFin >= mIni) {
    return mFin - mIni;
  }
  // Cruza la medianoche
  return 24 * 60 - mIni + mFin;
}

export function formatearMinutosLegible(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

// ─── RESOLVER DURACIÓN Y DESTINO SEGÚN RUTA ───
export function resolverParametrosRuta(
  routeFrom: string,
  routeTo: string,
  horaFijada: string
): { tiempoViajeMinutos: number; horaLlegada: string; cabeceraSalidaReal?: string } {
  const from = (routeFrom || '').trim().toLowerCase();
  const to = (routeTo || '').trim().toLowerCase();

  // 1. Loja -> Parroquias
  if (from === 'loja') {
    if (to.includes('tambo')) {
      return {
        tiempoViajeMinutos: TIEMPOS_VIAJE_OFICIALES.LOJA_A_EL_TAMBO,
        horaLlegada: sumarMinutosAHora(horaFijada, TIEMPOS_VIAJE_OFICIALES.LOJA_A_EL_TAMBO),
      };
    }
    if (to.includes('elvira')) {
      return {
        tiempoViajeMinutos: TIEMPOS_VIAJE_OFICIALES.LOJA_A_LA_ELVIRA,
        horaLlegada: sumarMinutosAHora(horaFijada, TIEMPOS_VIAJE_OFICIALES.LOJA_A_LA_ELVIRA),
      };
    }
    if (to.includes('yangana')) {
      return {
        tiempoViajeMinutos: TIEMPOS_VIAJE_OFICIALES.LOJA_A_YANGANA,
        horaLlegada: sumarMinutosAHora(horaFijada, TIEMPOS_VIAJE_OFICIALES.LOJA_A_YANGANA),
      };
    }
    if (to.includes('zahuayco') || to.includes('zahuyco')) {
      return {
        tiempoViajeMinutos: TIEMPOS_VIAJE_OFICIALES.LOJA_A_ZAHUAYCO,
        horaLlegada: sumarMinutosAHora(horaFijada, TIEMPOS_VIAJE_OFICIALES.LOJA_A_ZAHUAYCO),
      };
    }
    // Default a Vilcabamba
    return {
      tiempoViajeMinutos: TIEMPOS_VIAJE_OFICIALES.LOJA_A_VILCABAMBA,
      horaLlegada: sumarMinutosAHora(horaFijada, TIEMPOS_VIAJE_OFICIALES.LOJA_A_VILCABAMBA),
    };
  }

  // 2. Retorno El Tambo -> Loja
  // REGLA OFICIAL: La hora señalada en el rol es de paso por MALACATOS.
  // La unidad salió de El Tambo 60 min antes.
  if (from.includes('tambo') && to === 'loja') {
    const salidaRealElTambo = sumarMinutosAHora(horaFijada, -TIEMPOS_VIAJE_OFICIALES.EL_TAMBO_A_MALACATOS);
    const llegadaLoja = sumarMinutosAHora(horaFijada, TIEMPOS_VIAJE_OFICIALES.MALACATOS_A_LOJA);
    return {
      tiempoViajeMinutos: TIEMPOS_VIAJE_OFICIALES.EL_TAMBO_A_MALACATOS + TIEMPOS_VIAJE_OFICIALES.MALACATOS_A_LOJA,
      horaLlegada: llegadaLoja,
      cabeceraSalidaReal: `Salida de El Tambo: ${salidaRealElTambo} (Paso por Malacatos: ${horaFijada})`,
    };
  }

  // 3. Retorno La Elvira / Yangana / Zahuayco -> Loja
  // REGLA OFICIAL: La hora señalada en el rol es desde VILCABAMBA.
  // La unidad salió de la parroquia 30 min antes.
  if ((from.includes('elvira') || from.includes('yangana') || from.includes('zahu')) && to === 'loja') {
    const salidaRealCabecera = sumarMinutosAHora(horaFijada, -TIEMPOS_VIAJE_OFICIALES.LA_ELVIRA_A_VILCABAMBA);
    const llegadaLoja = sumarMinutosAHora(horaFijada, TIEMPOS_VIAJE_OFICIALES.VILCABAMBA_A_LOJA);
    return {
      tiempoViajeMinutos: TIEMPOS_VIAJE_OFICIALES.LA_ELVIRA_A_VILCABAMBA + TIEMPOS_VIAJE_OFICIALES.VILCABAMBA_A_LOJA,
      horaLlegada: llegadaLoja,
      cabeceraSalidaReal: `Salida de Cabecera: ${salidaRealCabecera} (Paso por Vilcabamba: ${horaFijada})`,
    };
  }

  // 4. Retorno Estándar Vilcabamba -> Loja
  return {
    tiempoViajeMinutos: TIEMPOS_VIAJE_OFICIALES.VILCABAMBA_A_LOJA,
    horaLlegada: sumarMinutosAHora(horaFijada, TIEMPOS_VIAJE_OFICIALES.VILCABAMBA_A_LOJA),
  };
}

// ─── REGLAS DE ASIGNACIÓN DE TALLER SEGÚN VENTANA ───
export function asignarMantenimientosSugeridos(tipo: TipoVentanaOperativa, duracionMinutos: number): string[] {
  if (tipo === 'DIA_RETEN_LIBRE') {
    return [
      'MNT-EMBRAGUE-KIT',         // 100k
      'MNT-CAJA-CAMBIOS',         // 280k
      'MNT-BRONCES-PALILLOS',     // 140k
      'MNT-MUELLES-BUJES',        // 50k
      'MNT-CORONA-ACEITE',        // 30k
      'MNT-ROTACION-LLANTAS',     // 15k
    ];
  }

  if (tipo === 'VENTANA_DIURNA_LOJA') {
    if (duracionMinutos >= 180) {
      // >= 3 horas libres en Loja: Apta para trabajos intermedios y mayores rápidos
      return [
        'MNT-CORONA-ACEITE',      // 30k (Aceite Caja y Corona)
        'MNT-MUELLES-BUJES',      // 50k (Revisión y cambio bujes/hojas)
        'MNT-ACEITE-MOTOR',       // 5k (Lubricadora completa)
        'MNT-ZAPATAS-FRENOS',     // 11k (Revisión zapatas y tambores)
        'MNT-ROTACION-LLANTAS',   // 15k (Vulcanizadora)
      ];
    }
    // 90 a 179 minutos libres en Loja: Apta para lubricadora y ajustes
    return [
      'MNT-ACEITE-MOTOR',         // 5k (Cambio de aceite y filtros)
      'MNT-ENGRASE-CHASIS',       // 1.5k (Fosa de engrase y lavado inferior)
      'MNT-REGULACION-RACHES',    // 800 km (Regulación rápida de raches)
      'MNT-FILTRO-DIESEL',        // Trampa y filtro diésel
      'MNT-SOPLADO-FILTROS',      // Filtro de aire
    ];
  }

  if (tipo === 'VENTANA_CORTA_LOJA') {
    // 30 a 89 minutos en Loja: Escala corta
    return [
      'MNT-REGULACION-RACHES',    // Rápido en terminal
      'MNT-REVISION-LIQUIDOS',    // Refrigerante, hidrolina, frenos
      'MNT-ABASTECER-DIESEL',
    ];
  }

  return [];
}

// ─── MOTOR RECALCULADOR DE VENTANAS OPERATIVAS ───
export function calcularVentanasParaFrecuencias(
  codigoVT: string,
  frecuencias: VTFrecuenciaDetallada[]
): VentanaOperativa[] {
  const ventanas: VentanaOperativa[] = [];

  for (let i = 0; i < frecuencias.length - 1; i++) {
    const actual = frecuencias[i];
    const siguiente = frecuencias[i + 1];

    const horaLlegada = actual.horaLlegadaEstimada;
    const horaSalidaSiguiente = siguiente.time;
    const duracion = diferenciaMinutosEntreHoras(horaLlegada, horaSalidaSiguiente);

    // Determinar la ubicación de la espera
    const destinoLlegada = (actual.routeTo || '').trim().toLowerCase();
    const esBaseLoja = destinoLlegada === 'loja';

    let tipo: TipoVentanaOperativa = 'CABECERA_PARROQUIA';
    let ubicacion = actual.routeTo;

    if (esBaseLoja) {
      ubicacion = 'Base Loja';
      if (duracion >= 90) {
        tipo = 'VENTANA_DIURNA_LOJA';
      } else {
        tipo = 'VENTANA_CORTA_LOJA';
      }
    } else {
      // Cabecera externa (Vilcabamba, El Tambo, etc.)
      ubicacion = actual.routeTo;
      if (duracion >= 360) {
        tipo = 'PERNOCTA_EXTERNA';
      } else {
        tipo = 'CABECERA_PARROQUIA';
      }
    }

    const mantenimientos = asignarMantenimientosSugeridos(tipo, duracion);
    const tiempoTxt = formatearMinutosLegible(duracion);

    ventanas.push({
      id: `${codigoVT.toLowerCase()}-v${i + 1}`,
      tipo,
      ubicacion,
      horaInicio: horaLlegada,
      horaFin: horaSalidaSiguiente,
      duracionMinutos: duracion,
      vueltaPreviaIndex: i,
      vueltaSiguienteIndex: i + 1,
      esAptaParaTaller: tipo === 'VENTANA_DIURNA_LOJA',
      mantenimientosSugeridos: mantenimientos,
      descripcionAmigable: `${tiempoTxt} libres en ${ubicacion} (${horaLlegada} - ${horaSalidaSiguiente})`,
    });
  }

  return ventanas;
}

// ─── GENERADOR OFICIAL DEL CATÁLOGO COMPLETO (VT1 a VT15) ───
export function generarCatalogoOficialVTs(): VTConfiguracionItem[] {
  return VT_DATA.map((item) => {
    // 1. Enriquecer frecuencias con tiempos de viaje oficiales y cabeceras
    const frecuenciasDetalladas: VTFrecuenciaDetallada[] = item.frecuencias.map((f, idx) => {
      const res = resolverParametrosRuta(f.routeFrom, f.routeTo, f.time);
      return {
        order: idx + 1,
        routeFrom: f.routeFrom,
        routeTo: f.routeTo,
        time: f.time,
        horaLlegadaEstimada: res.horaLlegada,
        tiempoViajeMinutos: res.tiempoViajeMinutos,
        cabeceraSalidaReal: res.cabeceraSalidaReal,
        esPernoctaRetorno: idx === item.frecuencias.length - 1 && item.frecuencias.length >= 6,
      };
    });

    // 2. Calcular ventanas operativas
    const ventanas = calcularVentanasParaFrecuencias(item.codigo, frecuenciasDetalladas);

    // 3. Evaluar alertas de enlace crítico
    let alertaEnlaceSiguiente: string | undefined;
    if (item.codigo === 'VT14') {
      alertaEnlaceSiguiente =
        '⚠️ Enlace Crítico con VT15: Llegada a Loja 07:40 y salida VT15 07:45 (solo 5 min de holgura). Abastecer diésel y revisar unidad la noche previa en Vilcabamba.';
    }

    // 4. Kilometraje teórico aproximado del paquete
    const kmTeorico = frecuenciasDetalladas.length * 42; // Base estándar Loja-Vilca

    return {
      codigo: item.codigo,
      nombre: item.nombre,
      frecuencias: frecuenciasDetalladas,
      ventanas,
      alertaEnlaceSiguiente,
      kmTeoricoTotal: kmTeorico,
      activo: true,
    };
  });
}

// ─── CONFIGURACIÓN MAESTRA POR DEFECTO ───
export const CONFIGURACION_FLOTA_DEFAULT: FlotaConfiguracionCompleta = {
  version: 1,
  updatedAt: '2026-09-30T16:30:00.000Z',
  modoRetenActivo: false, // Actualmente desactivado (15 días continuos)
  fechaInicioReten: undefined,
  busAnclaReten: '01',
  hash: 'vt-cfg-v1-20260930',
  vts: generarCatalogoOficialVTs(),
};
