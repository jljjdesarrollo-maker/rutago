// Tarifas oficiales RutaGo - TRANSPORTES VILCABAMBATURIS CÍA. LTDA.
// TARIFA_MINIMA = $0.75
// TODOS los precios son desde Loja hacia cada destino
// El Tambo: mismos precios hasta Malacatos, luego ramifica (NO pasa Vilcabamba)
// Zahuayco, La Elvira, Yangana, Tambillo, El Cisne: SIEMPRE pasan por Vilcabamba

export interface TarifaItem {
  id: string;
  parada: string;
  tarifa: number; // precio desde Loja
}

export const TARIFA_MINIMA = 0.75;

// ─── Precios desde Loja ───
const preciosDesdeLoja: TarifaItem[] = [
  // Paradas comunes: Loja → Malacatos (todas las rutas comparten estos precios)
  { id: 'loja', parada: 'Loja', tarifa: 0.75 },
  { id: 'quingeo', parada: 'Quingeo', tarifa: 1.00 },
  { id: 'sanpedro', parada: 'San Pedro', tarifa: 1.25 },
  { id: 'malacatos', parada: 'Malacatos', tarifa: 1.50 },

  // Ruta Vilcabamba y sus extensiones (Zahuayco, La Elvira, Yangana, Tambillo, El Cisne)
  { id: 'vilcabamba', parada: 'Vilcabamba', tarifa: 2.00 },
  { id: 'zahuayco', parada: 'Zahuayco', tarifa: 2.25 },
  { id: 'laelvira', parada: 'La Elvira', tarifa: 2.50 },
  { id: 'yangana', parada: 'Yangana', tarifa: 2.75 },
  { id: 'tambillo', parada: 'Tambillo', tarifa: 2.50 },
  { id: 'elcisne', parada: 'El Cisne', tarifa: 2.75 },

  // Ruta El Tambo (ramifica en Malacatos, NO pasa por Vilcabamba)
  { id: 'eltambo', parada: 'El Tambo', tarifa: 1.75 },
  { id: 'eltundo', parada: 'El Tundo', tarifa: 2.00 },
  { id: 'lavega', parada: 'La Vega', tarifa: 2.25 },
];

// ─── Paradas por ruta según dirección ───
// "ida" = desde Loja hacia el destino (se muestran las paradas en orden)
// "vuelta" = desde el destino hacia Loja (se muestran las paradas en orden inverso)

export const RUTA_PARADAS: Record<string, { ida: string[]; vuelta: string[] }> = {
  // Vilcabamba y extensiones pasan SIEMPRE por Vilcabamba
  'Loja - Vilcabamba': {
    ida: ['Loja', 'Quingeo', 'San Pedro', 'Malacatos', 'Vilcabamba'],
    vuelta: ['Vilcabamba', 'Malacatos', 'San Pedro', 'Quingeo', 'Loja'],
  },
  'Loja - Zahuayco': {
    ida: ['Loja', 'Quingeo', 'San Pedro', 'Malacatos', 'Vilcabamba', 'Zahuayco'],
    vuelta: ['Zahuayco', 'Vilcabamba', 'Malacatos', 'San Pedro', 'Quingeo', 'Loja'],
  },
  'Loja - La Elvira': {
    ida: ['Loja', 'Quingeo', 'San Pedro', 'Malacatos', 'Vilcabamba', 'La Elvira'],
    vuelta: ['La Elvira', 'Vilcabamba', 'Malacatos', 'San Pedro', 'Quingeo', 'Loja'],
  },
  'Loja - Yangana': {
    ida: ['Loja', 'Quingeo', 'San Pedro', 'Malacatos', 'Vilcabamba', 'Yangana'],
    vuelta: ['Yangana', 'Vilcabamba', 'Malacatos', 'San Pedro', 'Quingeo', 'Loja'],
  },
  'Loja - Tambillo': {
    ida: ['Loja', 'Quingeo', 'San Pedro', 'Malacatos', 'Vilcabamba', 'Tambillo'],
    vuelta: ['Tambillo', 'Vilcabamba', 'Malacatos', 'San Pedro', 'Quingeo', 'Loja'],
  },
  'Loja - El Cisne': {
    ida: ['Loja', 'Quingeo', 'San Pedro', 'Malacatos', 'Vilcabamba', 'El Cisne'],
    vuelta: ['El Cisne', 'Vilcabamba', 'Malacatos', 'San Pedro', 'Quingeo', 'Loja'],
  },
  // El Tambo ramifica en Malacatos (NO pasa por Vilcabamba)
  'Loja - El Tambo': {
    ida: ['Loja', 'Quingeo', 'San Pedro', 'Malacatos', 'El Tambo'],
    vuelta: ['El Tambo', 'Malacatos', 'San Pedro', 'Quingeo', 'Loja'],
  },
  'Vilcabamba - Loja': {
    ida: ['Vilcabamba', 'Malacatos', 'San Pedro', 'Quingeo', 'Loja'],
    vuelta: ['Loja', 'Quingeo', 'San Pedro', 'Malacatos', 'Vilcabamba'],
  },
  'Zahuayco - Loja': {
    ida: ['Zahuayco', 'Vilcabamba', 'Malacatos', 'San Pedro', 'Quingeo', 'Loja'],
    vuelta: ['Loja', 'Quingeo', 'San Pedro', 'Malacatos', 'Vilcabamba', 'Zahuayco'],
  },
  'La Elvira - Loja': {
    ida: ['La Elvira', 'Vilcabamba', 'Malacatos', 'San Pedro', 'Quingeo', 'Loja'],
    vuelta: ['Loja', 'Quingeo', 'San Pedro', 'Malacatos', 'Vilcabamba', 'La Elvira'],
  },
  'Yangana - Loja': {
    ida: ['Yangana', 'Vilcabamba', 'Malacatos', 'San Pedro', 'Quingeo', 'Loja'],
    vuelta: ['Loja', 'Quingeo', 'San Pedro', 'Malacatos', 'Vilcabamba', 'Yangana'],
  },
};

// Precio desde Loja a una parada
function getPrecioDesdeLoja(parada: string): number {
  const item = preciosDesdeLoja.find(p => p.parada === parada);
  return item?.tarifa ?? TARIFA_MINIMA;
}

// Obtener paradas con tarifa para una ruta y dirección
// La tarifa siempre es el precio desde Loja a esa parada
export function getParadasByRutaAndTipo(ruta: string, tipo: string): { parada: string; tarifa: number }[] {
  const rutaConfig = RUTA_PARADAS[ruta];
  if (!rutaConfig) return [];
  const paradas = tipo === 'ida' ? rutaConfig.ida : rutaConfig.vuelta;
  return paradas.map(parada => ({
    parada,
    tarifa: getPrecioDesdeLoja(parada),
  }));
}

// Obtener tarifa oficial (siempre precio desde Loja)
export function getTarifa(_ruta: string, parada: string, _tipo: string): number {
  return getPrecioDesdeLoja(parada);
}

// Obtener todas las rutas disponibles
export function getAllRutas(): string[] {
  return Object.keys(RUTA_PARADAS);
}

// Buscar la ruta más cercana dado un nombre de ruta parcial
export function matchRuta(rutaNombre: string): string {
  // Intentar match directo
  if (RUTA_PARADAS[rutaNombre]) return rutaNombre;

  // Normalizar: "Loja-Vilcabamba" → buscar "Loja - Vilcabamba"
  const normalized = rutaNombre.replace(/\s*-\s*/g, ' - ').trim();
  if (RUTA_PARADAS[normalized]) return normalized;

  // Buscar por partes
  const parts = rutaNombre.split(/[-–]/).map(s => s.trim());
  for (const key of Object.keys(RUTA_PARADAS)) {
    const keyParts = key.split(' - ');
    if (parts.length >= 2 && keyParts.length >= 2) {
      const match = (
        (keyParts[0].toLowerCase().includes(parts[0].toLowerCase()) ||
         parts[0].toLowerCase().includes(keyParts[0].toLowerCase())) &&
        (keyParts[1].toLowerCase().includes(parts[1].toLowerCase()) ||
         parts[1].toLowerCase().includes(keyParts[1].toLowerCase()))
      );
      if (match) return key;
    }
  }

  return rutaNombre;
}

export default preciosDesdeLoja;
