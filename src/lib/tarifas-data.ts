// Tarifas oficiales RutaGo - TRANSPORTES VILCABAMBATURIS CÍA. LTDA.
// TARIFA_MINIMA = $0.75
// IMPORTANTE: El Tambo NO pasa por Vilcabamba (ramifica en Malacatos)
// Zahuayco, La Elvira, Yangana SÍ pasan por Vilcabamba

export interface TarifaItem {
  id: string;
  ruta: string;
  parada: string;
  tarifa: number;
  tipo: string;
}

export const TARIFA_MINIMA = 0.75;

const tarifas: TarifaItem[] = [
  // ─── LOJA - VILCABAMBA (Ida) ───
  { id: 'lv-01', ruta: 'Loja - Vilcabamba', parada: 'Loja', tarifa: 0.75, tipo: 'ida' },
  { id: 'lv-02', ruta: 'Loja - Vilcabamba', parada: 'Quingeo', tarifa: 1.00, tipo: 'ida' },
  { id: 'lv-03', ruta: 'Loja - Vilcabamba', parada: 'San Pedro de Vilcabamba', tarifa: 1.25, tipo: 'ida' },
  { id: 'lv-04', ruta: 'Loja - Vilcabamba', parada: 'Malacatos', tarifa: 1.50, tipo: 'ida' },
  { id: 'lv-05', ruta: 'Loja - Vilcabamba', parada: 'Vilcabamba', tarifa: 2.00, tipo: 'ida' },
  { id: 'lv-06', ruta: 'Loja - Vilcabamba', parada: 'Zahuayco', tarifa: 2.25, tipo: 'ida' },
  { id: 'lv-07', ruta: 'Loja - Vilcabamba', parada: 'La Elvira', tarifa: 2.50, tipo: 'ida' },
  { id: 'lv-08', ruta: 'Loja - Vilcabamba', parada: 'Yangana', tarifa: 2.75, tipo: 'ida' },
  { id: 'lv-09', ruta: 'Loja - Vilcabamba', parada: 'Tambillo', tarifa: 2.50, tipo: 'ida' },
  { id: 'lv-10', ruta: 'Loja - Vilcabamba', parada: 'El Cisne', tarifa: 2.75, tipo: 'ida' },

  // ─── LOJA - VILCABAMBA (Vuelta) ───
  { id: 'lv-v01', ruta: 'Loja - Vilcabamba', parada: 'Vilcabamba', tarifa: 0.75, tipo: 'vuelta' },
  { id: 'lv-v02', ruta: 'Loja - Vilcabamba', parada: 'Malacatos', tarifa: 1.25, tipo: 'vuelta' },
  { id: 'lv-v03', ruta: 'Loja - Vilcabamba', parada: 'San Pedro de Vilcabamba', tarifa: 1.50, tipo: 'vuelta' },
  { id: 'lv-v04', ruta: 'Loja - Vilcabamba', parada: 'Quingeo', tarifa: 1.75, tipo: 'vuelta' },
  { id: 'lv-v05', ruta: 'Loja - Vilcabamba', parada: 'Loja', tarifa: 2.00, tipo: 'vuelta' },
  { id: 'lv-v06', ruta: 'Loja - Vilcabamba', parada: 'Zahuayco', tarifa: 1.00, tipo: 'vuelta' },
  { id: 'lv-v07', ruta: 'Loja - Vilcabamba', parada: 'La Elvira', tarifa: 0.75, tipo: 'vuelta' },
  { id: 'lv-v08', ruta: 'Loja - Vilcabamba', parada: 'Yangana', tarifa: 1.00, tipo: 'vuelta' },
  { id: 'lv-v09', ruta: 'Loja - Vilcabamba', parada: 'Tambillo', tarifa: 1.25, tipo: 'vuelta' },
  { id: 'lv-v10', ruta: 'Loja - Vilcabamba', parada: 'El Cisne', tarifa: 1.00, tipo: 'vuelta' },

  // ─── LOJA - EL TAMBO (Ida) ───
  // El Tambo NO pasa por Vilcabamba - ramifica en Malacatos
  { id: 'lt-01', ruta: 'Loja - El Tambo', parada: 'Loja', tarifa: 0.75, tipo: 'ida' },
  { id: 'lt-02', ruta: 'Loja - El Tambo', parada: 'Quingeo', tarifa: 1.00, tipo: 'ida' },
  { id: 'lt-03', ruta: 'Loja - El Tambo', parada: 'Malacatos', tarifa: 1.25, tipo: 'ida' },
  { id: 'lt-04', ruta: 'Loja - El Tambo', parada: 'El Tambo', tarifa: 1.75, tipo: 'ida' },
  { id: 'lt-05', ruta: 'Loja - El Tambo', parada: 'El Tundo', tarifa: 2.00, tipo: 'ida' },
  { id: 'lt-06', ruta: 'Loja - El Tambo', parada: 'La Vega', tarifa: 2.25, tipo: 'ida' },

  // ─── LOJA - EL TAMBO (Vuelta) ───
  { id: 'lt-v01', ruta: 'Loja - El Tambo', parada: 'El Tambo', tarifa: 0.75, tipo: 'vuelta' },
  { id: 'lt-v02', ruta: 'Loja - El Tambo', parada: 'Malacatos', tarifa: 1.25, tipo: 'vuelta' },
  { id: 'lt-v03', ruta: 'Loja - El Tambo', parada: 'Quingeo', tarifa: 1.50, tipo: 'vuelta' },
  { id: 'lt-v04', ruta: 'Loja - El Tambo', parada: 'Loja', tarifa: 1.75, tipo: 'vuelta' },
  { id: 'lt-v05', ruta: 'Loja - El Tambo', parada: 'El Tundo', tarifa: 1.00, tipo: 'vuelta' },
  { id: 'lt-v06', ruta: 'Loja - El Tambo', parada: 'La Vega', tarifa: 0.75, tipo: 'vuelta' },

  // ─── LOJA - ZAHUAYCO (Ida) - pasa por Vilcabamba ───
  { id: 'lz-01', ruta: 'Loja - Zahuayco', parada: 'Loja', tarifa: 0.75, tipo: 'ida' },
  { id: 'lz-02', ruta: 'Loja - Zahuayco', parada: 'Vilcabamba', tarifa: 1.50, tipo: 'ida' },
  { id: 'lz-03', ruta: 'Loja - Zahuayco', parada: 'Zahuayco', tarifa: 2.25, tipo: 'ida' },

  // ─── LOJA - ZAHUAYCO (Vuelta) ───
  { id: 'lz-v01', ruta: 'Loja - Zahuayco', parada: 'Zahuayco', tarifa: 0.75, tipo: 'vuelta' },
  { id: 'lz-v02', ruta: 'Loja - Zahuayco', parada: 'Vilcabamba', tarifa: 1.00, tipo: 'vuelta' },
  { id: 'lz-v03', ruta: 'Loja - Zahuayco', parada: 'Loja', tarifa: 1.75, tipo: 'vuelta' },

  // ─── LOJA - LA ELVIRA (Ida) - pasa por Vilcabamba ───
  { id: 'le-01', ruta: 'Loja - La Elvira', parada: 'Loja', tarifa: 0.75, tipo: 'ida' },
  { id: 'le-02', ruta: 'Loja - La Elvira', parada: 'Vilcabamba', tarifa: 1.50, tipo: 'ida' },
  { id: 'le-03', ruta: 'Loja - La Elvira', parada: 'La Elvira', tarifa: 2.50, tipo: 'ida' },

  // ─── LOJA - LA ELVIRA (Vuelta) ───
  { id: 'le-v01', ruta: 'Loja - La Elvira', parada: 'La Elvira', tarifa: 0.75, tipo: 'vuelta' },
  { id: 'le-v02', ruta: 'Loja - La Elvira', parada: 'Vilcabamba', tarifa: 1.25, tipo: 'vuelta' },
  { id: 'le-v03', ruta: 'Loja - La Elvira', parada: 'Loja', tarifa: 2.00, tipo: 'vuelta' },

  // ─── LOJA - YANGANA (Ida) - pasa por Vilcabamba ───
  { id: 'ly-01', ruta: 'Loja - Yangana', parada: 'Loja', tarifa: 0.75, tipo: 'ida' },
  { id: 'ly-02', ruta: 'Loja - Yangana', parada: 'Vilcabamba', tarifa: 1.50, tipo: 'ida' },
  { id: 'ly-03', ruta: 'Loja - Yangana', parada: 'Yangana', tarifa: 2.75, tipo: 'ida' },

  // ─── LOJA - YANGANA (Vuelta) ───
  { id: 'ly-v01', ruta: 'Loja - Yangana', parada: 'Yangana', tarifa: 0.75, tipo: 'vuelta' },
  { id: 'ly-v02', ruta: 'Loja - Yangana', parada: 'Vilcabamba', tarifa: 1.25, tipo: 'vuelta' },
  { id: 'ly-v03', ruta: 'Loja - Yangana', parada: 'Loja', tarifa: 2.25, tipo: 'vuelta' },
];

export function getTarifasByRuta(ruta: string, tipo?: string): TarifaItem[] {
  return tarifas.filter(t => {
    const matchRuta = t.ruta === ruta;
    const matchTipo = tipo ? t.tipo === tipo : true;
    return matchRuta && matchTipo;
  });
}

export function getTarifa(ruta: string, parada: string, tipo: string): number {
  const tarifa = tarifas.find(t => t.ruta === ruta && t.parada === parada && t.tipo === tipo);
  return tarifa?.tarifa ?? TARIFA_MINIMA;
}

export function getAllRutas(): string[] {
  return [...new Set(tarifas.map(t => t.ruta))];
}

export function getParadasByRutaAndTipo(ruta: string, tipo: string): { parada: string; tarifa: number }[] {
  return tarifas.filter(t => t.ruta === ruta && t.tipo === tipo).map(t => ({ parada: t.parada, tarifa: t.tarifa }));
}

export default tarifas;
