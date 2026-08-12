// Tarifas oficiales RutaGo - TRANSPORTES VILCABAMBATURIS CÍA. LTDA.
// Precios desde Loja a cada destino
// NORMAL: pasaje entero | MEDIA: medio pasaje (niños, tercera edad, discapacidad)
// El Tambo: ramifica en Malacatos (NO pasa por Vilcabamba)
// Zahuayco, La Elvira, Yangana: pasan por Vilcabamba

export interface TarifaItem {
  id: string;
  parada: string;
  normal: number;
  media: number;
}

export const TARIFA_MINIMA = 0.65; // Media tarifa más baja

// ─── Precios desde Loja ───
const preciosDesdeLoja: TarifaItem[] = [
  // ═══ LOJA - VILCABAMBA ═══
  { id: 'loja-vil-01', parada: 'Cajánuma',           normal: 1.25, media: 0.65 },
  { id: 'loja-vil-02', parada: 'Pueblo Nuevo',        normal: 1.25, media: 0.65 },
  { id: 'loja-vil-03', parada: 'Tres Leguas',         normal: 1.25, media: 0.65 },
  { id: 'loja-vil-04', parada: 'Rumizhitana',         normal: 1.25, media: 0.65 },
  { id: 'loja-vil-05', parada: 'Yamba',               normal: 1.25, media: 0.65 },
  { id: 'loja-vil-06', parada: 'Granadillo',          normal: 1.40, media: 0.70 },
  { id: 'loja-vil-07', parada: 'Porvenir',            normal: 1.40, media: 0.70 },
  { id: 'loja-vil-08', parada: 'Nangora',             normal: 1.50, media: 0.75 },
  { id: 'loja-vil-09', parada: 'Chorrillos',          normal: 1.75, media: 0.70 },
  { id: 'loja-vil-10', parada: 'Landangui',           normal: 1.75, media: 0.90 },
  { id: 'loja-vil-11', parada: 'La Peña',             normal: 1.75, media: 0.90 },
  { id: 'loja-vil-12', parada: 'Malacatos',           normal: 2.00, media: 1.00 },
  { id: 'loja-vil-13', parada: 'Taxiche',             normal: 2.00, media: 1.00 },
  { id: 'loja-vil-14', parada: 'Cavianga',            normal: 2.25, media: 1.15 },
  { id: 'loja-vil-15', parada: 'Cararango',           normal: 2.25, media: 1.15 },
  { id: 'loja-vil-16', parada: 'San Pedro',           normal: 2.25, media: 1.15 },
  { id: 'loja-vil-17', parada: 'Vilcabamba',          normal: 2.50, media: 1.25 },

  // ═══ LOJA - ZAHUAYCO (pasa por Vilcabamba) ═══
  // Paradas Vilcabamba ya incluidas arriba
  { id: 'loja-zah-01', parada: 'Masanamaca',          normal: 3.00, media: 1.50 },
  { id: 'loja-zah-02', parada: 'Quinara',             normal: 3.50, media: 1.75 },
  { id: 'loja-zah-03', parada: 'Palmira',             normal: 3.75, media: 1.90 },
  { id: 'loja-zah-04', parada: 'Zahuayco',           normal: 4.00, media: 2.00 },

  // ═══ LOJA - EL TAMBO (ramifica en Malacatos, NO pasa Vilcabamba) ═══
  // Paradas hasta Malacatos ya incluidas en Loja-Vilcabamba
  { id: 'loja-tam-01', parada: 'Ceibopamba',          normal: 2.25, media: 1.15 },
  { id: 'loja-tam-02', parada: 'San José',            normal: 2.25, media: 1.15 },
  { id: 'loja-tam-03', parada: 'Santo Domingo',       normal: 2.50, media: 1.25 },
  { id: 'loja-tam-04', parada: 'Naranjo Dulce',       normal: 2.75, media: 1.40 },
  { id: 'loja-tam-05', parada: 'Zhotahuayco',         normal: 3.00, media: 1.50 },
  { id: 'loja-tam-06', parada: 'La Merced',           normal: 3.25, media: 1.65 },
  { id: 'loja-tam-07', parada: 'San Agustín',         normal: 3.75, media: 1.90 },
  { id: 'loja-tam-08', parada: 'La Era',              normal: 3.75, media: 1.90 },
  { id: 'loja-tam-09', parada: 'La Capilla',          normal: 4.00, media: 2.00 },
  { id: 'loja-tam-10', parada: 'San Bernardo',        normal: 4.00, media: 2.00 },
  { id: 'loja-tam-11', parada: 'El Tambo',            normal: 4.00, media: 2.00 },

  // ═══ LOJA - LA ELVIRA (pasa por Vilcabamba) ═══
  { id: 'loja-elv-01', parada: 'Cucanama',            normal: 2.50, media: 1.25 },
  { id: 'loja-elv-02', parada: 'Linderos',            normal: 2.75, media: 1.40 },
  { id: 'loja-elv-03', parada: 'Moyococha',           normal: 3.00, media: 1.50 },
  { id: 'loja-elv-04', parada: 'Santorum',            normal: 3.25, media: 1.65 },
  { id: 'loja-elv-05', parada: 'Comunidades',         normal: 3.25, media: 1.65 },
  { id: 'loja-elv-06', parada: 'Tumianuma',           normal: 3.25, media: 1.65 },
  { id: 'loja-elv-07', parada: 'La Elvira',           normal: 3.75, media: 1.90 },

  // ═══ LOJA - YANGANA (pasa por Vilcabamba) ═══
  { id: 'loja-yan-01', parada: 'Suro',                normal: 3.25, media: 1.65 },
  { id: 'loja-yan-02', parada: 'Yangana',             normal: 3.60, media: 1.80 },
];

// ─── Paradas por ruta según dirección ───
// "ida" = desde Loja hacia el destino
// "vuelta" = desde el destino hacia Loja

export const RUTA_PARADAS: Record<string, { ida: string[]; vuelta: string[] }> = {
  'Loja - Vilcabamba': {
    ida: ['Cajánuma', 'Pueblo Nuevo', 'Tres Leguas', 'Rumizhitana', 'Yamba',
          'Granadillo', 'Porvenir', 'Nangora', 'Chorrillos', 'Landangui', 'La Peña',
          'Malacatos', 'Taxiche', 'Cavianga', 'Cararango', 'San Pedro', 'Vilcabamba'],
    vuelta: ['Vilcabamba', 'San Pedro', 'Cararango', 'Cavianga',
            'Taxiche', 'Malacatos', 'La Peña', 'Landangui',
            'Chorrillos', 'Nangora', 'Porvenir', 'Granadillo',
            'Yamba', 'Rumizhitana', 'Tres Leguas', 'Pueblo Nuevo', 'Cajánuma'],
  },
  'Loja - Zahuayco': {
    ida: ['Cajánuma', 'Pueblo Nuevo', 'Tres Leguas', 'Rumizhitana', 'Yamba',
          'Granadillo', 'Porvenir', 'Nangora', 'Chorrillos', 'Landangui', 'La Peña',
          'Malacatos', 'Taxiche', 'Cavianga', 'Cararango', 'San Pedro', 'Vilcabamba',
          'Masanamaca', 'Quinara', 'Palmira', 'Zahuayco'],
    vuelta: ['Zahuayco', 'Palmira', 'Quinara', 'Masanamaca',
            'Vilcabamba', 'San Pedro', 'Cararango', 'Cavianga',
            'Taxiche', 'Malacatos', 'La Peña', 'Landangui',
            'Chorrillos', 'Nangora', 'Porvenir', 'Granadillo',
            'Yamba', 'Rumizhitana', 'Tres Leguas', 'Pueblo Nuevo', 'Cajánuma'],
  },
  'Loja - El Tambo': {
    ida: ['Cajánuma', 'Pueblo Nuevo', 'Tres Leguas', 'Rumizhitana', 'Yamba',
          'Granadillo', 'Porvenir', 'Nangora', 'Chorrillos', 'Landangui', 'La Peña',
          'Malacatos', 'Taxiche', 'Ceibopamba', 'San José', 'Santo Domingo',
          'Naranjo Dulce', 'Zhotahuayco', 'La Merced', 'San Agustín', 'La Era',
          'La Capilla', 'San Bernardo', 'El Tambo'],
    vuelta: ['El Tambo', 'San Bernardo', 'La Capilla', 'La Era', 'San Agustín',
            'La Merced', 'Zhotahuayco', 'Naranjo Dulce', 'Santo Domingo',
            'San José', 'Ceibopamba', 'Taxiche', 'Malacatos',
            'La Peña', 'Landangui', 'Chorrillos', 'Nangora', 'Porvenir', 'Granadillo',
            'Yamba', 'Rumizhitana', 'Tres Leguas', 'Pueblo Nuevo', 'Cajánuma'],
  },
  'Loja - La Elvira': {
    ida: ['Cajánuma', 'Pueblo Nuevo', 'Tres Leguas', 'Rumizhitana', 'Yamba',
          'Granadillo', 'Porvenir', 'Nangora', 'Chorrillos', 'Landangui', 'La Peña',
          'Malacatos', 'Taxiche', 'Cavianga', 'Cararango', 'San Pedro', 'Vilcabamba',
          'Cucanama', 'Linderos', 'Moyococha', 'Santorum', 'Comunidades', 'Tumianuma',
          'La Elvira'],
    vuelta: ['La Elvira', 'Tumianuma', 'Comunidades', 'Santorum',
            'Moyococha', 'Linderos', 'Cucanama',
            'Vilcabamba', 'San Pedro', 'Cararango', 'Cavianga',
            'Taxiche', 'Malacatos', 'La Peña', 'Landangui',
            'Chorrillos', 'Nangora', 'Porvenir', 'Granadillo',
            'Yamba', 'Rumizhitana', 'Tres Leguas', 'Pueblo Nuevo', 'Cajánuma'],
  },
  'Loja - Yangana': {
    ida: ['Cajánuma', 'Pueblo Nuevo', 'Tres Leguas', 'Rumizhitana', 'Yamba',
          'Granadillo', 'Porvenir', 'Nangora', 'Chorrillos', 'Landangui', 'La Peña',
          'Malacatos', 'Taxiche', 'Cavianga', 'Cararango', 'San Pedro', 'Vilcabamba',
          'Masanamaca', 'Suro', 'Yangana'],
    vuelta: ['Yangana', 'Suro', 'Masanamaca',
            'Vilcabamba', 'San Pedro', 'Cararango', 'Cavianga',
            'Taxiche', 'Malacatos', 'La Peña', 'Landangui',
            'Chorrillos', 'Nangora', 'Porvenir', 'Granadillo',
            'Yamba', 'Rumizhitana', 'Tres Leguas', 'Pueblo Nuevo', 'Cajánuma'],
  },
  // Rutas inversas para frecuencias tipo "Vilcabamba-Loja"
  'Vilcabamba - Loja': {
    ida: ['Vilcabamba', 'San Pedro', 'Cararango', 'Cavianga',
          'Taxiche', 'Malacatos', 'La Peña', 'Landangui',
          'Chorrillos', 'Nangora', 'Porvenir', 'Granadillo',
          'Yamba', 'Rumizhitana', 'Tres Leguas', 'Pueblo Nuevo', 'Cajánuma'],
    vuelta: ['Cajánuma', 'Pueblo Nuevo', 'Tres Leguas', 'Rumizhitana', 'Yamba',
              'Granadillo', 'Porvenir', 'Nangora', 'Chorrillos', 'Landangui', 'La Peña',
              'Malacatos', 'Taxiche', 'Cavianga', 'Cararango', 'San Pedro', 'Vilcabamba'],
  },
  'Zahuayco - Loja': {
    ida: ['Zahuayco', 'Palmira', 'Quinara', 'Masanamaca',
          'Vilcabamba', 'San Pedro', 'Cararango', 'Cavianga',
          'Taxiche', 'Malacatos', 'La Peña', 'Landangui',
          'Chorrillos', 'Nangora', 'Porvenir', 'Granadillo',
          'Yamba', 'Rumizhitana', 'Tres Leguas', 'Pueblo Nuevo', 'Cajánuma'],
    vuelta: ['Cajánuma', 'Pueblo Nuevo', 'Tres Leguas', 'Rumizhitana', 'Yamba',
              'Granadillo', 'Porvenir', 'Nangora', 'Chorrillos', 'Landangui', 'La Peña',
              'Malacatos', 'Taxiche', 'Cavianga', 'Cararango', 'San Pedro', 'Vilcabamba',
              'Masanamaca', 'Quinara', 'Palmira', 'Zahuayco'],
  },
  'La Elvira - Loja': {
    ida: ['La Elvira', 'Tumianuma', 'Comunidades', 'Santorum',
          'Moyococha', 'Linderos', 'Cucanama',
          'Vilcabamba', 'San Pedro', 'Cararango', 'Cavianga',
          'Taxiche', 'Malacatos', 'La Peña', 'Landangui',
          'Chorrillos', 'Nangora', 'Porvenir', 'Granadillo',
          'Yamba', 'Rumizhitana', 'Tres Leguas', 'Pueblo Nuevo', 'Cajánuma'],
    vuelta: ['Cajánuma', 'Pueblo Nuevo', 'Tres Leguas', 'Rumizhitana', 'Yamba',
              'Granadillo', 'Porvenir', 'Nangora', 'Chorrillos', 'Landangui', 'La Peña',
              'Malacatos', 'Taxiche', 'Cavianga', 'Cararango', 'San Pedro', 'Vilcabamba',
              'Cucanama', 'Linderos', 'Moyococha', 'Santorum', 'Comunidades', 'Tumianuma',
              'La Elvira'],
  },
  'Yangana - Loja': {
    ida: ['Yangana', 'Suro', 'Masanamaca',
          'Vilcabamba', 'San Pedro', 'Cararango', 'Cavianga',
          'Taxiche', 'Malacatos', 'La Peña', 'Landangui',
          'Chorrillos', 'Nangora', 'Porvenir', 'Granadillo',
          'Yamba', 'Rumizhitana', 'Tres Leguas', 'Pueblo Nuevo', 'Cajánuma'],
    vuelta: ['Cajánuma', 'Pueblo Nuevo', 'Tres Leguas', 'Rumizhitana', 'Yamba',
              'Granadillo', 'Porvenir', 'Nangora', 'Chorrillos', 'Landangui', 'La Peña',
              'Malacatos', 'Taxiche', 'Cavianga', 'Cararango', 'San Pedro', 'Vilcabamba',
              'Masanamaca', 'Suro', 'Yangana'],
  },
};

// Obtener precio desde Loja para una parada
function getPrecioDesdeLoja(parada: string): { normal: number; media: number } | null {
  const item = preciosDesdeLoja.find(p => p.parada === parada);
  return item ? { normal: item.normal, media: item.media } : null;
}

// Tipo de pasajero
export type TipoPasajero = 'normal' | 'media';

// Obtener paradas con tarifas para una ruta y dirección
export function getParadasByRutaAndTipo(ruta: string, tipo: string): { parada: string; normal: number; media: number }[] {
  const rutaConfig = RUTA_PARADAS[ruta];
  if (!rutaConfig) return [];
  const paradas = tipo === 'ida' ? rutaConfig.ida : rutaConfig.vuelta;
  return paradas.map(parada => {
    const precio = getPrecioDesdeLoja(parada);
    return {
      parada,
      normal: precio?.normal ?? 0,
      media: precio?.media ?? 0,
    };
  });
}

// Obtener tarifa oficial
export function getTarifa(_ruta: string, parada: string, _tipo: string, pasajeroTipo: TipoPasajero = 'normal'): number {
  const precio = getPrecioDesdeLoja(parada);
  if (!precio) return TARIFA_MINIMA;
  return pasajeroTipo === 'media' ? precio.media : precio.normal;
}

// Obtener todas las rutas disponibles
export function getAllRutas(): string[] {
  return Object.keys(RUTA_PARADAS);
}

// Buscar la ruta más cercana dado un nombre de ruta parcial
export function matchRuta(rutaNombre: string): string {
  if (RUTA_PARADAS[rutaNombre]) return rutaNombre;
  const normalized = rutaNombre.replace(/\s*-\s*/g, ' - ').trim();
  if (RUTA_PARADAS[normalized]) return normalized;

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
