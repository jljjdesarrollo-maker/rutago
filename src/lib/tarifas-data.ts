// Tarifas oficiales RutaGo - TRANSPORTES VILCABAMBATURIS CÍA. LTDA.
// NORMAL: pasaje entero | MEDIA: medio pasaje (niños, tercera edad, discapacidad)
// El Tambo: ramifica en Malacatos (NO pasa por Vilcabamba)
// Zahuayco, La Elvira, Yangana: pasan por Vilcabamba
//
// Actualizado: Agosto 2025 — precios diferenciados por dirección (ida/vuelta)

export interface TarifaItem {
  id: string;
  parada: string;
  normal: number;
  media: number;
}

export const TARIFA_MINIMA = 0.40; // Media tarifa más baja

// ─── Zonas por parada (para cuadrícula coloreada) ───
// green  = cerca de Loja (inicio del recorrido)
// yellow = zona media
// blue   = cerca de Vilcabamba (final del recorrido)
export type ZonaColor = 'green' | 'yellow' | 'blue';

export const PARADA_ZONA: Record<string, ZonaColor> = {
  // Zona cercana a Loja
  'Dos Puentes': 'green',
  'Cajánuma': 'green',
  'Pueblo Nuevo': 'green',
  'Capulí': 'green',
  'Loja': 'green',
  // Zona media
  'Tres Leguas': 'yellow',
  'Rumizhitana': 'yellow',
  'Yamba': 'yellow',
  'Granadillo': 'yellow',
  'Porvenir': 'yellow',
  'Nangora': 'yellow',
  'Chorrillos': 'yellow',
  'Landangui': 'yellow',
  'La Peña': 'yellow',
  'Malacatos': 'yellow',
  'Taxiche': 'yellow',
  // Zona cercana a Vilcabamba
  'Cavianga': 'blue',
  'Cararango': 'blue',
  'San Pedro': 'blue',
  'Vilcabamba': 'blue',
  // Tramos intermedios → se asignan por origen
  'Rumi→Prv': 'yellow',
  'Rumi→Mal': 'yellow',
  'Rumi→Vilc': 'yellow',
  'Nango→Mal': 'yellow',
  'Nango→Vilc': 'yellow',
  'Nango→Carar': 'yellow',
  'Land→Mal': 'yellow',
  'Land→Vilc': 'yellow',
  'Mal→Vilc': 'yellow',
  'T.Leguas→Mal': 'yellow',
  'Taxiche→Vilc': 'blue',
  'Cararango→Vilc': 'blue',
  'S.Pedro→Vilc': 'blue',
  // Vuelta intermedios
  'Mal→Rumi': 'yellow',
  'Mal→Nango': 'yellow',
  'Mal→Porv': 'yellow',
};

export const ZONA_COLORS: Record<ZonaColor, { bg: string; bgSelected: string; text: string; border: string; price: string; sub: string }> = {
  green: {
    bg: 'bg-green-50',
    bgSelected: 'bg-green-600',
    text: 'text-green-900',
    border: 'border-green-200',
    price: 'text-green-700',
    sub: 'text-green-400',
  },
  yellow: {
    bg: 'bg-amber-50',
    bgSelected: 'bg-amber-500',
    text: 'text-amber-900',
    border: 'border-amber-200',
    price: 'text-amber-700',
    sub: 'text-amber-400',
  },
  blue: {
    bg: 'bg-blue-50',
    bgSelected: 'bg-blue-600',
    text: 'text-blue-900',
    border: 'border-blue-200',
    price: 'text-blue-700',
    sub: 'text-blue-400',
  },
};

export function getZonaParada(parada: string): ZonaColor {
  return PARADA_ZONA[parada] || 'yellow';
}

export function isParadaPrincipal(parada: string): boolean {
  // Paradas principales: no contienen → en el nombre
  return !parada.includes('→');
}

// ─── Precios IDA (desde Loja hacia el destino) ───
const preciosIda: Record<string, { normal: number; media: number }> = {
  // ═══ LOJA - VILCABAMBA ═══
  'Dos Puentes':  { normal: 0.75, media: 0.40 },
  'Cajánuma':     { normal: 1.25, media: 0.65 },
  'Pueblo Nuevo': { normal: 1.25, media: 0.65 },
  'Tres Leguas':  { normal: 1.25, media: 0.65 },
  'Rumizhitana':  { normal: 1.25, media: 0.65 },
  'Yamba':        { normal: 1.25, media: 0.65 },
  'Granadillo':   { normal: 1.40, media: 0.70 },
  'Porvenir':     { normal: 1.40, media: 0.70 },
  'Nangora':      { normal: 1.50, media: 0.75 },
  'Chorrillos':   { normal: 1.50, media: 0.75 },
  'Landangui':    { normal: 1.75, media: 0.90 },
  'La Peña':      { normal: 1.75, media: 0.90 },
  'Malacatos':    { normal: 2.00, media: 1.00 },
  'Taxiche':      { normal: 2.00, media: 1.00 },
  'Cavianga':     { normal: 2.25, media: 1.15 },
  'Cararango':    { normal: 2.25, media: 1.15 },
  'San Pedro':    { normal: 2.25, media: 1.15 },
  'Vilcabamba':   { normal: 2.50, media: 1.25 },
  // Tramos intermedios ida (desde Loja hacia Vilcabamba)
  'Rumi→Vilc':    { normal: 1.50, media: 0.75 },
  'Rumi→Mal':     { normal: 1.10, media: 0.55 },
  'Rumi→Prv':     { normal: 0.75, media: 0.40 },
  'Nango→Vilc':   { normal: 1.25, media: 0.65 },
  'Nango→Mal':    { normal: 0.75, media: 0.40 },
  'Land→Vilc':    { normal: 1.10, media: 0.55 },
  'Land→Mal':     { normal: 0.75, media: 0.40 },
  'Mal→Vilc':     { normal: 1.10, media: 0.55 },
  'T.Leguas→Mal': { normal: 1.10, media: 0.55 },
  'Nango→Carar':  { normal: 1.00, media: 0.50 },
  'Taxiche→Vilc': { normal: 0.75, media: 0.40 },
  'Cararango→Vilc': { normal: 0.75, media: 0.40 },
  'S.Pedro→Vilc': { normal: 0.75, media: 0.40 },
  // ═══ LOJA - ZAHUAYCO (pasa por Vilcabamba) ═══
  'Masanamaca': { normal: 3.00, media: 1.50 },
  'Quinara':    { normal: 3.50, media: 1.75 },
  'Palmira':    { normal: 3.75, media: 1.90 },
  'Zahuayco':   { normal: 4.00, media: 2.00 },

  // ═══ LOJA - EL TAMBO (ramifica en Malacatos, NO pasa Vilcabamba) ═══
  'Ceibopamba':    { normal: 2.25, media: 1.15 },
  'San José':      { normal: 2.25, media: 1.15 },
  'Santo Domingo': { normal: 2.50, media: 1.25 },
  'Naranjo Dulce': { normal: 2.75, media: 1.40 },
  'Zhotahuayco':   { normal: 3.00, media: 1.50 },
  'La Merced':     { normal: 3.25, media: 1.65 },
  'San Agustín':   { normal: 3.75, media: 1.90 },
  'La Era':        { normal: 3.75, media: 1.90 },
  'La Capilla':    { normal: 4.00, media: 2.00 },
  'San Bernardo':  { normal: 4.00, media: 2.00 },
  'El Tambo':      { normal: 4.00, media: 2.00 },

  // ═══ LOJA - LA ELVIRA (pasa por Vilcabamba) ═══
  'Cucanama':    { normal: 2.50, media: 1.25 },
  'Linderos':    { normal: 2.75, media: 1.40 },
  'Moyococha':   { normal: 3.00, media: 1.50 },
  'Santorum':    { normal: 3.25, media: 1.65 },
  'Comunidades': { normal: 3.25, media: 1.65 },
  'Tumianuma':   { normal: 3.25, media: 1.65 },
  'La Elvira':   { normal: 3.75, media: 1.90 },

  // ═══ LOJA - YANGANA (pasa por Vilcabamba) ═══
  'Suro':    { normal: 3.25, media: 1.65 },
  'Yangana': { normal: 3.60, media: 1.80 },
};

// ─── Precios VUELTA (desde el destino hacia Loja) ───
// Aplican cuando el bus viaja HACIA Loja (cualquier ruta)
const preciosVuelta: Record<string, { normal: number; media: number }> = {
  'San Pedro':    { normal: 0.75, media: 0.40 },
  'Cararango':    { normal: 0.75, media: 0.40 },
  'Cavianga':     { normal: 0.75, media: 0.40 },
  'Taxiche':      { normal: 0.75, media: 0.40 },
  'Malacatos':    { normal: 1.10, media: 0.55 },
  'Landangui':    { normal: 1.10, media: 0.55 },
  'Chorrillos':   { normal: 1.25, media: 0.65 },
  'Nangora':      { normal: 1.25, media: 0.65 },
  'Porvenir':     { normal: 1.25, media: 0.65 },
  'Granadillo':   { normal: 1.50, media: 0.75 },
  'Yamba':        { normal: 1.50, media: 0.75 },
  'Rumizhitana':  { normal: 1.50, media: 0.75 },
  'Tres Leguas':  { normal: 1.50, media: 0.75 },
  'Pueblo Nuevo': { normal: 1.50, media: 0.75 },
  'Cajánuma':     { normal: 2.00, media: 1.00 },
  'Dos Puentes':  { normal: 2.00, media: 1.00 },
  'Capulí':       { normal: 2.50, media: 1.25 },
  'Loja':         { normal: 2.50, media: 1.25 },
  // Tramos intermedios desde Malacatos (vuelta hacia Loja)
  'Mal→Rumi':     { normal: 1.10, media: 0.60 },
  'Mal→Nango':    { normal: 0.75, media: 0.40 },
  'Mal→Porv':     { normal: 0.75, media: 0.40 },
  // Rutas que pasan por Vilcabamba (Zahuayco, La Elvira, Yangana) comparten mismos precios
  'Vilcabamba':   { normal: 2.50, media: 1.25 },
  'Masanamaca':   { normal: 3.00, media: 1.50 },
  'Quinara':      { normal: 3.50, media: 1.75 },
  'Palmira':      { normal: 3.75, media: 1.90 },
  'Zahuayco':     { normal: 4.00, media: 2.00 },
  'Cucanama':     { normal: 2.50, media: 1.25 },
  'Linderos':     { normal: 2.75, media: 1.40 },
  'Moyococha':    { normal: 3.00, media: 1.50 },
  'Santorum':     { normal: 3.25, media: 1.65 },
  'Comunidades':  { normal: 3.25, media: 1.65 },
  'Tumianuma':    { normal: 3.25, media: 1.65 },
  'La Elvira':    { normal: 3.75, media: 1.90 },
  'Suro':         { normal: 3.25, media: 1.65 },
  'Yangana':      { normal: 3.60, media: 1.80 },
  // El Tambo: mismos precios ida para vuelta (no hay lista diferenciada)
  'Ceibopamba':    { normal: 2.25, media: 1.15 },
  'San José':      { normal: 2.25, media: 1.15 },
  'Santo Domingo': { normal: 2.50, media: 1.25 },
  'Naranjo Dulce': { normal: 2.75, media: 1.40 },
  'Zhotahuayco':   { normal: 3.00, media: 1.50 },
  'La Merced':     { normal: 3.25, media: 1.65 },
  'San Agustín':   { normal: 3.75, media: 1.90 },
  'La Era':        { normal: 3.75, media: 1.90 },
  'La Capilla':    { normal: 4.00, media: 2.00 },
  'San Bernardo':  { normal: 4.00, media: 2.00 },
  'El Tambo':      { normal: 4.00, media: 2.00 },
};

// ─── Paradas por ruta según dirección ───
// "ida" = desde el origen de la ruta hacia el destino
// "vuelta" = desde el destino de vuelta al origen

export const RUTA_PARADAS: Record<string, { ida: string[]; vuelta: string[] }> = {
  'Loja - Vilcabamba': {
    ida: ['Dos Puentes', 'Cajánuma', 'Pueblo Nuevo', 'Tres Leguas', 'Rumizhitana', 'Yamba',
          'Granadillo', 'Porvenir', 'Nangora', 'Chorrillos', 'Landangui', 'La Peña',
          'Malacatos', 'Taxiche', 'Cavianga', 'Cararango', 'San Pedro', 'Vilcabamba',
          'Rumi→Vilc', 'Rumi→Mal', 'Rumi→Prv', 'Nango→Vilc', 'Nango→Mal', 'Nango→Carar', 'Land→Vilc', 'Land→Mal', 'Mal→Vilc',
          'T.Leguas→Mal', 'Taxiche→Vilc', 'Cararango→Vilc', 'S.Pedro→Vilc'],
    vuelta: ['San Pedro', 'Cararango', 'Cavianga',
            'Taxiche', 'Malacatos', 'La Peña', 'Landangui',
            'Chorrillos', 'Nangora', 'Porvenir', 'Granadillo',
            'Yamba', 'Rumizhitana', 'Tres Leguas', 'Pueblo Nuevo', 'Cajánuma', 'Dos Puentes', 'Capulí',
            'Mal→Rumi', 'Mal→Nango', 'Mal→Porv'],
  },
  'Loja - Zahuayco': {
    ida: ['Dos Puentes', 'Cajánuma', 'Pueblo Nuevo', 'Tres Leguas', 'Rumizhitana', 'Yamba',
          'Granadillo', 'Porvenir', 'Nangora', 'Chorrillos', 'Landangui', 'La Peña',
          'Malacatos', 'Taxiche', 'Cavianga', 'Cararango', 'San Pedro', 'Vilcabamba',
          'Masanamaca', 'Quinara', 'Palmira', 'Zahuayco',
          'Rumi→Vilc', 'Rumi→Mal', 'Rumi→Prv', 'Nango→Vilc', 'Nango→Mal', 'Land→Vilc', 'Land→Mal', 'Mal→Vilc'],
    vuelta: ['Zahuayco', 'Palmira', 'Quinara', 'Masanamaca',
            'Vilcabamba', 'San Pedro', 'Cararango', 'Cavianga',
            'Taxiche', 'Malacatos', 'La Peña', 'Landangui',
            'Chorrillos', 'Nangora', 'Porvenir', 'Granadillo',
            'Yamba', 'Rumizhitana', 'Tres Leguas', 'Pueblo Nuevo', 'Cajánuma', 'Dos Puentes', 'Capulí',
            'Mal→Rumi', 'Mal→Nango', 'Mal→Porv'],
  },
  'Loja - El Tambo': {
    ida: ['Dos Puentes', 'Cajánuma', 'Pueblo Nuevo', 'Tres Leguas', 'Rumizhitana', 'Yamba',
          'Granadillo', 'Porvenir', 'Nangora', 'Chorrillos', 'Landangui', 'La Peña',
          'Malacatos', 'Ceibopamba', 'San José', 'Santo Domingo',
          'Naranjo Dulce', 'Zhotahuayco', 'La Merced', 'San Agustín', 'La Era',
          'La Capilla', 'San Bernardo', 'El Tambo'],
    vuelta: ['El Tambo', 'San Bernardo', 'La Capilla', 'La Era', 'San Agustín',
            'La Merced', 'Zhotahuayco', 'Naranjo Dulce', 'Santo Domingo',
            'San José', 'Ceibopamba', 'Malacatos',
            'La Peña', 'Landangui', 'Chorrillos', 'Nangora', 'Porvenir', 'Granadillo',
            'Yamba', 'Rumizhitana', 'Tres Leguas', 'Pueblo Nuevo', 'Cajánuma', 'Dos Puentes', 'Capulí'],
  },
  'Loja - La Elvira': {
    ida: ['Dos Puentes', 'Cajánuma', 'Pueblo Nuevo', 'Tres Leguas', 'Rumizhitana', 'Yamba',
          'Granadillo', 'Porvenir', 'Nangora', 'Chorrillos', 'Landangui', 'La Peña',
          'Malacatos', 'Taxiche', 'Cavianga', 'Cararango', 'San Pedro', 'Vilcabamba',
          'Cucanama', 'Linderos', 'Moyococha', 'Santorum', 'Comunidades', 'Tumianuma',
          'La Elvira',
          'Rumi→Vilc', 'Rumi→Mal', 'Rumi→Prv', 'Nango→Vilc', 'Nango→Mal', 'Land→Vilc', 'Land→Mal', 'Mal→Vilc'],
    vuelta: ['La Elvira', 'Tumianuma', 'Comunidades', 'Santorum',
            'Moyococha', 'Linderos', 'Cucanama',
            'Vilcabamba', 'San Pedro', 'Cararango', 'Cavianga',
            'Taxiche', 'Malacatos', 'La Peña', 'Landangui',
            'Chorrillos', 'Nangora', 'Porvenir', 'Granadillo',
            'Yamba', 'Rumizhitana', 'Tres Leguas', 'Pueblo Nuevo', 'Cajánuma', 'Dos Puentes', 'Capulí',
            'Mal→Rumi', 'Mal→Nango', 'Mal→Porv'],
  },
  'Loja - Yangana': {
    ida: ['Dos Puentes', 'Cajánuma', 'Pueblo Nuevo', 'Tres Leguas', 'Rumizhitana', 'Yamba',
          'Granadillo', 'Porvenir', 'Nangora', 'Chorrillos', 'Landangui', 'La Peña',
          'Malacatos', 'Taxiche', 'Cavianga', 'Cararango', 'San Pedro', 'Vilcabamba',
          'Masanamaca', 'Suro', 'Yangana',
          'Rumi→Vilc', 'Rumi→Mal', 'Rumi→Prv', 'Nango→Vilc', 'Nango→Mal', 'Land→Vilc', 'Land→Mal', 'Mal→Vilc'],
    vuelta: ['Yangana', 'Suro', 'Masanamaca',
            'Vilcabamba', 'San Pedro', 'Cararango', 'Cavianga',
            'Taxiche', 'Malacatos', 'La Peña', 'Landangui',
            'Chorrillos', 'Nangora', 'Porvenir', 'Granadillo',
            'Yamba', 'Rumizhitana', 'Tres Leguas', 'Pueblo Nuevo', 'Cajánuma', 'Dos Puentes', 'Capulí',
            'Mal→Rumi', 'Mal→Nango', 'Mal→Porv'],
  },
  // Rutas inversas para frecuencias tipo "Vilcabamba-Loja"
  'Vilcabamba - Loja': {
    ida: ['San Pedro', 'Cararango', 'Cavianga',
          'Taxiche', 'Malacatos', 'La Peña', 'Landangui',
          'Chorrillos', 'Nangora', 'Porvenir', 'Granadillo',
          'Yamba', 'Rumizhitana', 'Tres Leguas', 'Pueblo Nuevo', 'Cajánuma', 'Dos Puentes', 'Capulí', 'Loja'],
    vuelta: ['Loja', 'Capulí', 'Dos Puentes', 'Cajánuma', 'Pueblo Nuevo', 'Tres Leguas', 'Rumizhitana', 'Yamba',
              'Granadillo', 'Porvenir', 'Nangora', 'Chorrillos', 'Landangui', 'La Peña',
              'Malacatos', 'Taxiche', 'Cavianga', 'Cararango', 'San Pedro', 'Vilcabamba'],
  },
  'Zahuayco - Loja': {
    ida: ['Zahuayco', 'Palmira', 'Quinara', 'Masanamaca',
          'Vilcabamba', 'San Pedro', 'Cararango', 'Cavianga',
          'Taxiche', 'Malacatos', 'La Peña', 'Landangui',
          'Chorrillos', 'Nangora', 'Porvenir', 'Granadillo',
          'Yamba', 'Rumizhitana', 'Tres Leguas', 'Pueblo Nuevo', 'Cajánuma', 'Dos Puentes', 'Capulí'],
    vuelta: ['Capulí', 'Dos Puentes', 'Cajánuma', 'Pueblo Nuevo', 'Tres Leguas', 'Rumizhitana', 'Yamba',
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
          'Yamba', 'Rumizhitana', 'Tres Leguas', 'Pueblo Nuevo', 'Cajánuma', 'Dos Puentes', 'Capulí'],
    vuelta: ['Capulí', 'Dos Puentes', 'Cajánuma', 'Pueblo Nuevo', 'Tres Leguas', 'Rumizhitana', 'Yamba',
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
          'Yamba', 'Rumizhitana', 'Tres Leguas', 'Pueblo Nuevo', 'Cajánuma', 'Dos Puentes', 'Capulí'],
    vuelta: ['Capulí', 'Dos Puentes', 'Cajánuma', 'Pueblo Nuevo', 'Tres Leguas', 'Rumizhitana', 'Yamba',
              'Granadillo', 'Porvenir', 'Nangora', 'Chorrillos', 'Landangui', 'La Peña',
              'Malacatos', 'Taxiche', 'Cavianga', 'Cararango', 'San Pedro', 'Vilcabamba',
              'Masanamaca', 'Suro', 'Yangana'],
  },
};

// ─── Funciones de precio con soporte por dirección ───
//
// Lógica de precios (tipo semántico asignado por el API):
// - "ida"   = el bus se ALEJA de Loja → usar preciosIda
// - "vuelta" = el bus VIAJA HACIA Loja → usar preciosVuelta
//
// El API asigna dirección según el origen:
//   Si origen = Loja →  "ida" (alejándose)
//   Si origen ≠ Loja → "vuelta" (hacia Loja)
//
// normalizeRutaTipo solo cambia el nombre de ruta ("Vilcabamba-Loja" → "Loja-Vilcabamba")
// SIN invertir el tipo, porque el API ya lo asigna semánticamente correcto.

function viajaHaciaLoja(ruta: string, tipo: string): boolean {
  // Ruta "Loja - X": ida se aleja de Loja, vuelta regresa a Loja
  if (ruta.startsWith('Loja')) return tipo === 'vuelta';
  // Ruta "X - Loja": ida va hacia Loja (usar preciosVuelta), vuelta se aleja (usar preciosIda)
  if (ruta.endsWith('Loja')) return tipo === 'ida';
  return false;
}

// Obtener precio considerando la dirección del viaje
function getPrecio(parada: string, ruta: string, tipo: string): { normal: number; media: number } | null {
  if (viajaHaciaLoja(ruta, tipo)) {
    const vuelta = preciosVuelta[parada];
    if (vuelta) return vuelta;
    // Si la parada no tiene precio de vuelta, buscar en precios base
  }
  // Buscar primero en ida (base), luego en vuelta como fallback
  const ida = preciosIda[parada];
  if (ida) return ida;
  const vuelta = preciosVuelta[parada];
  return vuelta || null;
}

// Tipo de pasajero
export type TipoPasajero = 'normal' | 'media';

// Obtener paradas con tarifas para una ruta y dirección (USA PRECIOS POR DIRECCIÓN)
export function getParadasByRutaAndTipo(ruta: string, tipo: string): { parada: string; normal: number; media: number }[] {
  // Normalize: para rutas "X - Loja", mapear a "Loja - X" pero mantener tipo semántico
  // "Vilcabamba - Loja" tipo="vuelta" (API) → "Loja - Vilcabamba" tipo="vuelta"
  //   → usa paradas vuelta = [Vilcabamba, San Pedro, ...] y preciosVuelta ✓
  // "Vilcabamba - Loja" tipo="ida" (API) → "Loja - Vilcabamba" tipo="ida"
  //   → usa paradas ida = [Dos Puentes, Cajánuma, ...] y preciosIda ✓
  let effectiveRuta = ruta;
  let effectiveTipo = tipo;
  if (ruta.endsWith('Loja') && !ruta.startsWith('Loja')) {
    // "Vilcabamba - Loja" → mapear a "Loja - Vilcabamba" manteniendo el tipo semántico
    // El API ya asigna el tipo correcto: "ida"=alejándose de Loja, "vuelta"=hacia Loja
    // Solo necesitamos el nombre de ruta base, SIN invertir el tipo
    const baseName = ruta.replace(' - Loja', '');
    effectiveRuta = `Loja - ${baseName}`;
    // NO invertir effectiveTipo — ya viene correcto del API
  }

  const rutaConfig = RUTA_PARADAS[effectiveRuta];
  if (!rutaConfig) {
    // Fallback: try original ruta
    const origConfig = RUTA_PARADAS[ruta];
    if (!origConfig) return [];
    const paradas = tipo === 'ida' ? origConfig.ida : origConfig.vuelta;
    return paradas.map(parada => {
      const precio = getPrecio(parada, ruta, tipo);
      return { parada, normal: precio?.normal ?? 0, media: precio?.media ?? 0 };
    });
  }

  const paradas = effectiveTipo === 'ida' ? rutaConfig.ida : rutaConfig.vuelta;
  return paradas.map(parada => {
    const precio = getPrecio(parada, effectiveRuta, effectiveTipo);
    return {
      parada,
      normal: precio?.normal ?? 0,
      media: precio?.media ?? 0,
    };
  });
}

// Normalizar ruta y tipo para rutas "X - Loja"
function normalizeRutaTipo(ruta: string, tipo: string): { ruta: string; tipo: string } {
  if (ruta.endsWith('Loja') && !ruta.startsWith('Loja')) {
    // "Vilcabamba - Loja" → mapear a "Loja - Vilcabamba" manteniendo tipo semántico
    // El API ya asigna tipo correcto, NO invertir
    const baseName = ruta.replace(' - Loja', '');
    return { ruta: `Loja - ${baseName}`, tipo };
  }
  return { ruta, tipo };
}

// Obtener tarifa oficial (USA PRECIOS POR DIRECCIÓN)
export function getTarifa(ruta: string, parada: string, tipo: string, pasajeroTipo: TipoPasajero = 'normal'): number {
  const { ruta: nr, tipo: nt } = normalizeRutaTipo(ruta, tipo);
  const precio = getPrecio(parada, nr, nt);
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

// Exportar lista completa de tarifas ida para referencia
export const preciosDesdeLoja: TarifaItem[] = Object.entries(preciosIda).map(([parada, p], i) => ({
  id: `ida-${String(i).padStart(2, '0')}`,
  parada,
  normal: p.normal,
  media: p.media,
}));

export default preciosDesdeLoja;
