/**
 * Calibración Oficial de Odómetros para la Unidad 01 (14-Octubre a 02-Noviembre de 2026)
 * Metodología: Ponderada por Grupo VT para preservar la realidad del consumo de diésel ($/km).
 * Anclaje Inicial: 900,853 km al 14/10/2026
 * Anclaje Final:   907,085 km al 02/11/2026
 * Delta Total:     +6,232 km en 19 jornadas
 */

export interface CalibracionJornada {
  fecha: string;
  vt: string;
  vueltas: number;
  kmDia: number;
  kmSalida: number;
  kmLlegada: number;
}

export const CALIBRACION_OCT_NOV_2026: CalibracionJornada[] = [
  { fecha: '2026-10-15', vt: 'VT10', vueltas: 6, kmDia: 339, kmSalida: 900853, kmLlegada: 901192 },
  { fecha: '2026-10-16', vt: 'VT11', vueltas: 6, kmDia: 315, kmSalida: 901192, kmLlegada: 901507 },
  { fecha: '2026-10-17', vt: 'VT12', vueltas: 6, kmDia: 315, kmSalida: 901507, kmLlegada: 901822 },
  { fecha: '2026-10-18', vt: 'VT13', vueltas: 6, kmDia: 291, kmSalida: 901822, kmLlegada: 902113 },
  { fecha: '2026-10-19', vt: 'VT14', vueltas: 8, kmDia: 388, kmSalida: 902113, kmLlegada: 902501 }, // Incluye mant. 902,416 km
  { fecha: '2026-10-20', vt: 'VT15', vueltas: 6, kmDia: 291, kmSalida: 902501, kmLlegada: 902792 },
  { fecha: '2026-10-21', vt: 'VT1',  vueltas: 8, kmDia: 445, kmSalida: 902792, kmLlegada: 903237 },
  { fecha: '2026-10-22', vt: 'VT2',  vueltas: 6, kmDia: 291, kmSalida: 903237, kmLlegada: 903528 },
  { fecha: '2026-10-23', vt: 'VT3',  vueltas: 6, kmDia: 374, kmSalida: 903528, kmLlegada: 903902 },
  { fecha: '2026-10-24', vt: 'VT4',  vueltas: 6, kmDia: 374, kmSalida: 903902, kmLlegada: 904276 },
  { fecha: '2026-10-25', vt: 'VT5',  vueltas: 6, kmDia: 291, kmSalida: 904276, kmLlegada: 904567 },
  { fecha: '2026-10-26', vt: 'VT6',  vueltas: 6, kmDia: 291, kmSalida: 904567, kmLlegada: 904858 },
  { fecha: '2026-10-27', vt: 'VT7',  vueltas: 8, kmDia: 388, kmSalida: 904858, kmLlegada: 905246 },
  { fecha: '2026-10-28', vt: 'VT8',  vueltas: 6, kmDia: 291, kmSalida: 905246, kmLlegada: 905537 },
  { fecha: '2026-10-29', vt: 'VT9',  vueltas: 6, kmDia: 291, kmSalida: 905537, kmLlegada: 905828 },
  { fecha: '2026-10-30', vt: 'VT10', vueltas: 6, kmDia: 339, kmSalida: 905828, kmLlegada: 906167 },
  { fecha: '2026-10-31', vt: 'VT11', vueltas: 6, kmDia: 315, kmSalida: 906167, kmLlegada: 906482 },
  { fecha: '2026-11-01', vt: 'VT12', vueltas: 6, kmDia: 315, kmSalida: 906482, kmLlegada: 906797 },
  { fecha: '2026-11-02', vt: 'VT13', vueltas: 6, kmDia: 288, kmSalida: 906797, kmLlegada: 907085 },
];

export const KM_BASE_INICIAL_OCT14 = 900853;
export const KM_BASE_FINAL_NOV02 = 907085;
export const DELTA_TOTAL_QUINCENA = 6232;
