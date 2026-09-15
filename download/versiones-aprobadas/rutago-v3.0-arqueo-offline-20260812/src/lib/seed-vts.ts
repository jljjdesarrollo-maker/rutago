/**
 * Seed data for BusVT (Vehículos Tipo)
 * TRANSPORTES VILCABAMBATURIS CÍA. LTDA.
 * Datos reales de frecuencias por unidad
 */

export interface VTFrecuencia {
  routeFrom: string;
  routeTo: string;
  time: string;
}

export interface VTData {
  codigo: string;
  nombre: string;
  frecuencias: VTFrecuencia[];
}

export const VT_DATA: VTData[] = [
  {
    codigo: 'VT1',
    nombre: 'VT1',
    frecuencias: [
      { routeFrom: 'Loja', routeTo: 'Vilcabamba', time: '06:15' },
      { routeFrom: 'Vilcabamba', routeTo: 'Loja', time: '08:20' },
      { routeFrom: 'Loja', routeTo: 'Vilcabamba', time: '10:25' },
      { routeFrom: 'Vilcabamba', routeTo: 'Loja', time: '12:25' },
      { routeFrom: 'Loja', routeTo: 'Vilcabamba', time: '15:45' },
      { routeFrom: 'Vilcabamba', routeTo: 'Loja', time: '17:30' },
      { routeFrom: 'Loja', routeTo: 'Yangana', time: '20:45' },
      { routeFrom: 'Yangana', routeTo: 'Loja', time: '07:00' },
    ],
  },
  {
    codigo: 'VT2',
    nombre: 'VT2',
    frecuencias: [
      { routeFrom: 'Loja', routeTo: 'Vilcabamba', time: '09:15' },
      { routeFrom: 'Vilcabamba', routeTo: 'Loja', time: '11:15' },
      { routeFrom: 'Loja', routeTo: 'Vilcabamba', time: '13:45' },
      { routeFrom: 'Vilcabamba', routeTo: 'Loja', time: '15:40' },
      { routeFrom: 'Loja', routeTo: 'Vilcabamba', time: '17:45' },
      { routeFrom: 'Vilcabamba', routeTo: 'Loja', time: '19:25' },
    ],
  },
  {
    codigo: 'VT3',
    nombre: 'VT3',
    frecuencias: [
      { routeFrom: 'Loja', routeTo: 'Vilcabamba', time: '05:40' },
      { routeFrom: 'Vilcabamba', routeTo: 'Loja', time: '07:40' },
      { routeFrom: 'Loja', routeTo: 'La Elvira', time: '12:30' },
      { routeFrom: 'La Elvira', routeTo: 'Loja', time: '17:40' },
      { routeFrom: 'Loja', routeTo: 'Vilcabamba', time: '20:15' },
      { routeFrom: 'Vilcabamba', routeTo: 'Loja', time: '06:30' },
    ],
  },
  {
    codigo: 'VT4',
    nombre: 'VT4',
    frecuencias: [
      { routeFrom: 'Loja', routeTo: 'Vilcabamba', time: '08:45' },
      { routeFrom: 'Vilcabamba', routeTo: 'Loja', time: '10:45' },
      { routeFrom: 'Loja', routeTo: 'Vilcabamba', time: '12:45' },
      { routeFrom: 'Vilcabamba', routeTo: 'Loja', time: '14:25' },
      { routeFrom: 'Loja', routeTo: 'La Elvira', time: '16:25' },
      { routeFrom: 'La Elvira', routeTo: 'Loja', time: '08:00' },
    ],
  },
  {
    codigo: 'VT6',
    nombre: 'VT6',
    frecuencias: [
      { routeFrom: 'Loja', routeTo: 'Vilcabamba', time: '09:45' },
      { routeFrom: 'Vilcabamba', routeTo: 'Loja', time: '11:45' },
      { routeFrom: 'Loja', routeTo: 'Vilcabamba', time: '14:45' },
      { routeFrom: 'Vilcabamba', routeTo: 'Loja', time: '16:50' },
      { routeFrom: 'Loja', routeTo: 'Vilcabamba', time: '18:40' },
      { routeFrom: 'Vilcabamba', routeTo: 'Loja', time: '20:45' },
    ],
  },
  {
    codigo: 'VT7',
    nombre: 'VT7',
    frecuencias: [
      { routeFrom: 'Loja', routeTo: 'Vilcabamba', time: '06:25' },
      { routeFrom: 'Vilcabamba', routeTo: 'Loja', time: '08:50' },
      { routeFrom: 'Loja', routeTo: 'Vilcabamba', time: '10:45' },
      { routeFrom: 'Vilcabamba', routeTo: 'Loja', time: '12:45' },
      { routeFrom: 'Loja', routeTo: 'Vilcabamba', time: '15:15' },
      { routeFrom: 'Vilcabamba', routeTo: 'Loja', time: '17:10' },
      { routeFrom: 'Loja', routeTo: 'Vilcabamba', time: '18:55' },
      { routeFrom: 'Vilcabamba', routeTo: 'Loja', time: '21:30' },
    ],
  },
  {
    codigo: 'VT8',
    nombre: 'VT8',
    frecuencias: [
      { routeFrom: 'Loja', routeTo: 'Vilcabamba', time: '06:45' },
      { routeFrom: 'Vilcabamba', routeTo: 'Loja', time: '09:00' },
      { routeFrom: 'Loja', routeTo: 'Vilcabamba', time: '13:40' },
      { routeFrom: 'Vilcabamba', routeTo: 'Loja', time: '15:30' },
      { routeFrom: 'Loja', routeTo: 'Vilcabamba', time: '19:45' },
      { routeFrom: 'Vilcabamba', routeTo: 'Loja', time: '05:10' },
    ],
  },
  {
    codigo: 'VT9',
    nombre: 'VT9',
    frecuencias: [
      { routeFrom: 'Loja', routeTo: 'Vilcabamba', time: '07:15' },
      { routeFrom: 'Vilcabamba', routeTo: 'Loja', time: '09:15' },
      { routeFrom: 'Loja', routeTo: 'Vilcabamba', time: '11:15' },
      { routeFrom: 'Vilcabamba', routeTo: 'Loja', time: '13:15' },
      { routeFrom: 'Loja', routeTo: 'Vilcabamba', time: '16:45' },
      { routeFrom: 'Vilcabamba', routeTo: 'Loja', time: '18:30' },
    ],
  },
  {
    codigo: 'VT10',
    nombre: 'VT10',
    frecuencias: [
      { routeFrom: 'Loja', routeTo: 'El Tambo', time: '06:40' },
      { routeFrom: 'El Tambo', routeTo: 'Loja', time: '10:15' },
      { routeFrom: 'Loja', routeTo: 'El Tambo', time: '12:10' },
      { routeFrom: 'El Tambo', routeTo: 'Loja', time: '17:15' },
      { routeFrom: 'Loja', routeTo: 'Vilcabamba', time: '19:30' },
      { routeFrom: 'Vilcabamba', routeTo: 'Loja', time: '05:40' },
    ],
  },
  {
    codigo: 'VT11',
    nombre: 'VT11',
    frecuencias: [
      { routeFrom: 'Loja', routeTo: 'Vilcabamba', time: '07:30' },
      { routeFrom: 'Vilcabamba', routeTo: 'Loja', time: '10:10' },
      { routeFrom: 'Loja', routeTo: 'Vilcabamba', time: '13:15' },
      { routeFrom: 'Vilcabamba', routeTo: 'Loja', time: '14:45' },
      { routeFrom: 'Loja', routeTo: 'El Tambo', time: '17:25' },
      { routeFrom: 'El Tambo', routeTo: 'Loja', time: '06:55' },
    ],
  },
  {
    codigo: 'VT12',
    nombre: 'VT12',
    frecuencias: [
      { routeFrom: 'Loja', routeTo: 'Vilcabamba', time: '08:30' },
      { routeFrom: 'Vilcabamba', routeTo: 'Loja', time: '10:30' },
      { routeFrom: 'Loja', routeTo: 'Vilcabamba', time: '12:20' },
      { routeFrom: 'Vilcabamba', routeTo: 'Loja', time: '14:15' },
      { routeFrom: 'Loja', routeTo: 'El Tambo', time: '18:20' },
      { routeFrom: 'El Tambo', routeTo: 'Loja', time: '07:50' },
    ],
  },
  {
    codigo: 'VT13',
    nombre: 'VT13',
    frecuencias: [
      { routeFrom: 'Loja', routeTo: 'Vilcabamba', time: '09:25' },
      { routeFrom: 'Vilcabamba', routeTo: 'Loja', time: '11:25' },
      { routeFrom: 'Loja', routeTo: 'Vilcabamba', time: '14:15' },
      { routeFrom: 'Vilcabamba', routeTo: 'Loja', time: '16:20' },
      { routeFrom: 'Loja', routeTo: 'Vilcabamba', time: '18:25' },
      { routeFrom: 'Vilcabamba', routeTo: 'Loja', time: '20:15' },
    ],
  },
  {
    codigo: 'VT14',
    nombre: 'VT14',
    frecuencias: [
      { routeFrom: 'Loja', routeTo: 'Vilcabamba', time: '05:50' },
      { routeFrom: 'Vilcabamba', routeTo: 'Loja', time: '08:30' },
      { routeFrom: 'Loja', routeTo: 'Vilcabamba', time: '11:30' },
      { routeFrom: 'Vilcabamba', routeTo: 'Loja', time: '13:30' },
      { routeFrom: 'Loja', routeTo: 'Vilcabamba', time: '17:15' },
      { routeFrom: 'Vilcabamba', routeTo: 'Loja', time: '18:55' },
      { routeFrom: 'Loja', routeTo: 'Vilcabamba', time: '21:15' },
      { routeFrom: 'Vilcabamba', routeTo: 'Loja', time: '06:10' },
    ],
  },
  {
    codigo: 'VT15',
    nombre: 'VT15',
    frecuencias: [
      { routeFrom: 'Loja', routeTo: 'Vilcabamba', time: '07:45' },
      { routeFrom: 'Vilcabamba', routeTo: 'Loja', time: '09:45' },
      { routeFrom: 'Loja', routeTo: 'Vilcabamba', time: '11:45' },
      { routeFrom: 'Vilcabamba', routeTo: 'Loja', time: '13:55' },
      { routeFrom: 'Loja', routeTo: 'Vilcabamba', time: '16:15' },
      { routeFrom: 'Vilcabamba', routeTo: 'Loja', time: '18:10' },
    ],
  },
];
