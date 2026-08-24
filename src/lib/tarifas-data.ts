// Tarifas oficiales RutaGo - TRANSPORTES VILCABAMBATURIS CÍA. LTDA.
// NORMAL: pasaje entero | MEDIA: medio pasaje (niños, tercera edad, discapacidad)
// El Tambo: ramifica en Malacatos (NO pasa por Vilcabamba)
// Zahuayco, La Elvira, Yangana: pasan por Vilcabamba
//
// Actualizado: Agosto 2026 — precios del tarifario oficial XLSX

export interface TarifaItem {
  id: string;
  parada: string;
  normal: number;
  media: number;
}

export const TARIFA_MINIMA = 0; // Media tarifa más baja

// ─── Zonas por parada (para cuadrícula coloreada) ───
// green  = cerca de Loja (inicio del recorrido)
// yellow = zona media
// blue   = cerca de Vilcabamba (final del recorrido)
export type ZonaColor = 'green' | 'yellow' | 'blue' | 'orange' | 'purple';

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
  // Zona cercana a El Tambo (desde Ceibopamba)
  'Ceibopamba': 'blue',
  'San José': 'blue',
  'Santo Domingo': 'blue',
  'Naranjo Dulce': 'blue',
  'Zhotahuayco': 'blue',
  'La Merced': 'blue',
  'San Agustín': 'blue',
  'La Era': 'blue',
  'La Capilla': 'blue',
  'San Bernaved': 'blue',
  'El Tambo': 'blue',
  // Zona Lejana (Zahuayco, La Elvira, Yangana)
  'Masanamaca': 'blue',
  'Quinara': 'blue',
  'Palmira': 'blue',
  'Zahuayco': 'blue',
  'Cucanama': 'blue',
  'Linderos': 'blue',
  'Moyococha': 'blue',
  'Santorum': 'blue',
  'Comunidades': 'blue',
  'Tumianuma': 'blue',
  'Solanda': 'blue',
  'La Elvira': 'blue',
  'Suro': 'blue',
  'Yangana': 'blue',
  // Intermedios se asignan dinámicamente por prefix en getZonaParada()
  // Mal→X y X→Mal → orange | Vilc→X → purple
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
  orange: {
    bg: 'bg-orange-50',
    bgSelected: 'bg-orange-500',
    text: 'text-orange-900',
    border: 'border-orange-200',
    price: 'text-orange-700',
    sub: 'text-orange-400',
  },
  purple: {
    bg: 'bg-purple-50',
    bgSelected: 'bg-purple-600',
    text: 'text-purple-900',
    border: 'border-purple-200',
    price: 'text-purple-700',
    sub: 'text-purple-400',
  },
};

export function getZonaParada(parada: string): ZonaColor {
  if (PARADA_ZONA[parada]) return PARADA_ZONA[parada];
  // Intermedios: color por hub de origen
  if (parada.startsWith('Vilc→')) return 'purple';
  if (parada.endsWith('→Vilc')) return 'purple';
  if (parada.startsWith('Mal→') || parada.endsWith('→Mal')) return 'orange';
  return 'yellow';
}

export function isParadaPrincipal(parada: string): boolean {
  // Paradas principales: no contienen → en el nombre
  return !parada.includes('→');
}

// ─── Precios IDA (desde Loja hacia el destino) ───
// ─── Precios IDA (desde Loja hacia el destino) ───
const preciosIda: Record<string, { normal: number; media: number }> = {
  // ═══ LOJA - VILCABAMBA ═══
  'Capulí': { normal: 0.75, media: 0.40 },
  'Dos Puentes': { normal: 0.75, media: 0.4 },
  'Cajánuma': { normal: 1.25, media: 0.65 },
  'Pueblo Nuevo': { normal: 1.25, media: 0.65 },
  'Tres Leguas': { normal: 1.25, media: 0.65 },
  'Rumizhitana': { normal: 1.25, media: 0.65 },
  'Yamba': { normal: 1.25, media: 0.65 },
  'Granadillo': { normal: 1.4, media: 0.7 },
  'Porvenir': { normal: 1.4, media: 0.7 },
  'Nangora': { normal: 1.5, media: 0.75 },
  'Chorrillos': { normal: 1.5, media: 0.75 },
  'Landangui': { normal: 1.75, media: 0.9 },
  'La Peña': { normal: 1.75, media: 0.9 },
  'Malacatos': { normal: 2.0, media: 1.0 },
  'Taxiche': { normal: 2.0, media: 1.0 },
  'Cavianga': { normal: 2.25, media: 1.15 },
  'Cararango': { normal: 2.25, media: 1.15 },
  'San Pedro': { normal: 2.25, media: 1.15 },
  'Vilcabamba': { normal: 2.5, media: 1.25 },
  // Tramos intermedios ida (desde parada hacia Malacatos)
  'Peña→Mal': { normal: 0.75, media: 0.40 },
  'Land→Mal': { normal: 0.75, media: 0.40 },
  'Chorri→Mal': { normal: 0.75, media: 0.40 },
  'Nango→Mal': { normal: 0.75, media: 0.40 },
  'Porv→Mal': { normal: 1.10, media: 0.55 },
  'Gran→Mal': { normal: 1.10, media: 0.55 },
  'Yamba→Mal': { normal: 1.10, media: 0.55 },
  'Rumi→Mal': { normal: 1.10, media: 0.55 },
  'T.Leguas→Mal': { normal: 1.10, media: 0.55 },
  'P.Nuevo→Mal': { normal: 1.10, media: 0.55 },
  'Caja→Mal': { normal: 1.50, media: 0.75 },
  'D.Puen→Mal': { normal: 1.50, media: 0.75 },
  'Capulí→Mal': { normal: 2.00, media: 1.00 },
  // Tramos intermedios ida (desde parada hacia Vilcabamba)
  'S.Pedro→Vilc': { normal: 0.75, media: 0.40 },
  'Carar→Vilc': { normal: 0.75, media: 0.40 },
  'Cavian→Vilc': { normal: 0.75, media: 0.40 },
  'Taxich→Vilc': { normal: 0.75, media: 0.40 },
  'Mal→Vilc': { normal: 1.10, media: 0.55 },
  'Land→Vilc': { normal: 1.10, media: 0.55 },
  'Peña→Vilc': { normal: 1.10, media: 0.55 },
  'Chorri→Vilc': { normal: 1.25, media: 0.65 },
  'Nango→Vilc': { normal: 1.25, media: 0.65 },
  'Porv→Vilc': { normal: 1.25, media: 0.65 },
  'Gran→Vilc': { normal: 1.50, media: 0.75 },
  'Yamba→Vilc': { normal: 1.50, media: 0.75 },
  'Rumi→Vilc': { normal: 1.50, media: 0.75 },
  'T.Leguas→Vilc': { normal: 1.50, media: 0.75 },
  'P.Nuevo→Vilc': { normal: 1.50, media: 0.75 },
  'Caja→Vilc': { normal: 2.00, media: 1.00 },
  'D.Puen→Vilc': { normal: 2.00, media: 1.00 },
  'Capulí→Vilc': { normal: 2.50, media: 1.25 },
  // ═══ LOJA - EL TAMBO (ramifica en Malacatos, NO pasa Vilcabamba) ═══
  'Ceibopamba': { normal: 0, media: 0 },
  'Trinidad': { normal: 0, media: 0 },
  'San José': { normal: 0, media: 0 },
  'Santo Domingo': { normal: 0, media: 0 },
  'Naranjo Dulce': { normal: 0, media: 0 },
  'Zhotahuayco': { normal: 0, media: 0 },
  'La Merced': { normal: 0, media: 0 },
  'San Agustín': { normal: 0, media: 0 },
  'La Era': { normal: 0, media: 0 },
  'La Capilla': { normal: 0, media: 0 },
  'San Bernaved': { normal: 0, media: 0 },
  'El Tambo': { normal: 0, media: 0 },
  // Intermedios El Tambo IDA (desde Malacatos hacia El Tambo)
  'Mal→Ceibop': { normal: 0, media: 0 },
  'Mal→Trinidad': { normal: 0, media: 0 },
  'Mal→S.Jose': { normal: 0, media: 0 },
  'Mal→StoDom': { normal: 0, media: 0 },
  'Mal→N.Dulce': { normal: 0, media: 0 },
  'Mal→Zhotahu': { normal: 0, media: 0 },
  'Mal→LaMerc': { normal: 0, media: 0 },
  'Mal→S.Agust': { normal: 0, media: 0 },
  'Mal→LaEra': { normal: 0, media: 0 },
  'Mal→LaCap': { normal: 0, media: 0 },
  'Mal→S.Bern': { normal: 0, media: 0 },
  'Mal→ElTambo': { normal: 0, media: 0 },
  // ═══ LOJA - ZAHUAYCO (pasa por Vilcabamba) ═══
  'Masanamaca': { normal: 0, media: 0 },
  'Quinara': { normal: 0, media: 0 },
  'Chumberos': { normal: 0, media: 0 },
  'Palmira': { normal: 0, media: 0 },
  'Zahuayco': { normal: 0, media: 0 },
  // Intermedios Zahuayco/Yangana IDA (desde Vilcabamba)
  'Vilc→Masan': { normal: 0, media: 0 },
  'Vilc→Quina': { normal: 0, media: 0 },
  'Vilc→Chumb': { normal: 0, media: 0 },
  'Vilc→Palm': { normal: 0, media: 0 },
  'Vilc→Zahua': { normal: 0, media: 0 },
  'Vilc→Suro': { normal: 0, media: 0 },
  'Vilc→Yangana': { normal: 0, media: 0 },
  // Intermedios Zahuayco/Yangana IDA (desde Malacatos)
  'Mal→Masan': { normal: 0, media: 0 },
  'Mal→Quina': { normal: 0, media: 0 },
  'Mal→Chumb': { normal: 0, media: 0 },
  'Mal→Palm': { normal: 0, media: 0 },
  'Mal→Zahua': { normal: 0, media: 0 },
  'Mal→Suro': { normal: 0, media: 0 },
  'Mal→Yangana': { normal: 0, media: 0 },
  // ═══ LOJA - LA ELVIRA (pasa por Vilcabamba) ═══
  'Cucanama': { normal: 0, media: 0 },
  'Linderos': { normal: 0, media: 0 },
  'Santorum': { normal: 0, media: 0 },
  'Solanda': { normal: 0, media: 0 },
  'Moyococha': { normal: 0, media: 0 },
  'Tumianuma': { normal: 0, media: 0 },
  'Comunidades': { normal: 0, media: 0 },
  'La Elvira': { normal: 0, media: 0 },
  // Intermedios La Elvira IDA (desde Malacatos hacia La Elvira)
  'Mal→Cucan': { normal: 0, media: 0 },
  'Mal→Lind': { normal: 0, media: 0 },
  'Mal→Santo': { normal: 0, media: 0 },
  'Mal→Solan': { normal: 0, media: 0 },
  'Mal→Moyoc': { normal: 0, media: 0 },
  'Mal→Tumia': { normal: 0, media: 0 },
  'Mal→Comun': { normal: 0, media: 0 },
  'Mal→Elvira': { normal: 0, media: 0 },
  // Intermedios La Elvira IDA (desde Vilcabamba hacia La Elvira)
  'Vilc→Cucan': { normal: 0, media: 0 },
  'Vilc→Lind': { normal: 0, media: 0 },
  'Vilc→Santo': { normal: 0, media: 0 },
  'Vilc→Solan': { normal: 0, media: 0 },
  'Vilc→Moyoc': { normal: 0, media: 0 },
  'Vilc→Tumia': { normal: 0, media: 0 },
  'Vilc→Comun': { normal: 0, media: 0 },
  'Vilc→Elvira': { normal: 0, media: 0 },
  // ═══ LOJA - YANGANA (pasa por Vilcabamba) ═══
  'Suro': { normal: 0, media: 0 },
  'Yangana': { normal: 0, media: 0 },
};

// ─── Precios VUELTA (desde el destino hacia Loja) ───
// ✅ = oficial del PDF retorno  |  ⏳ TEMPORAL = precio IDA hasta recibir oficial
const preciosVuelta: Record<string, { normal: number; media: number }> = {
  // Troncal Loja ↔ Vilcabamba (compartida por Zahuayco, La Elvira, Yangana)
  'Dos Puentes': { normal: 2.0, media: 1.0 },       // ✅
  'Cajánuma': { normal: 2.0, media: 1.0 },       // ✅
  'Pueblo Nuevo': { normal: 1.5, media: 0.75 },       // ✅
  'Tres Leguas': { normal: 1.5, media: 0.75 },       // ✅
  'Rumizhitana': { normal: 1.5, media: 0.75 },       // ✅
  'Yamba': { normal: 1.5, media: 0.75 },       // ✅
  'Granadillo': { normal: 1.5, media: 0.75 },       // ✅
  'Porvenir': { normal: 1.25, media: 0.65 },       // ✅
  'Nangora': { normal: 1.25, media: 0.65 },       // ✅
  'Chorrillos': { normal: 1.25, media: 0.65 },       // ✅
  'Landangui': { normal: 1.1, media: 0.55 },       // ✅
  'La Peña': { normal: 1.1, media: 0.55 },       // ✅
  'Malacatos': { normal: 1.1, media: 0.55 },       // ✅
  'Taxiche': { normal: 0.75, media: 0.4 },       // ✅
  'Cavianga': { normal: 0.75, media: 0.4 },       // ✅
  'Cararango': { normal: 0.75, media: 0.4 },       // ✅
  'San Pedro': { normal: 0.75, media: 0.4 },       // ✅
  'Capulí': { normal: 2.5, media: 1.25 },       // ✅
  'Loja': { normal: 2.5, media: 1.25 },       // ✅
  // Zona El Tambo (solo usada si no encuentra en preciosVueltaElTambo)
  'Ceibopamba': { normal: 0, media: 0 },          // ⏳ TEMPORAL
  'Trinidad': { normal: 0, media: 0 },            // ⏳ TEMPORAL
  'San José': { normal: 0, media: 0 },             // ⏳ TEMPORAL
  'Santo Domingo': { normal: 0, media: 0 },        // ⏳ TEMPORAL
  'Naranjo Dulce': { normal: 0, media: 0 },        // ⏳ TEMPORAL
  'Zhotahuayco': { normal: 0, media: 0 },         // ⏳ TEMPORAL
  'La Merced': { normal: 0, media: 0 },            // ⏳ TEMPORAL
  'San Agustín': { normal: 0, media: 0 },          // ⏳ TEMPORAL
  'La Era': { normal: 0, media: 0 },               // ⏳ TEMPORAL
  'La Capilla': { normal: 0, media: 0 },            // ⏳ TEMPORAL
  'San Bernaved': { normal: 0, media: 0 },          // ⏳ TEMPORAL
  'El Tambo': { normal: 0, media: 0 },              // ⏳ TEMPORAL
  // Zona Zahuayco
  'Masanamaca': { normal: 0, media: 0 },           // ⏳ TEMPORAL
  'Quinara': { normal: 0, media: 0 },              // ⏳ TEMPORAL
  'Chumberos': { normal: 0, media: 0 },            // ⏳ TEMPORAL
  'Palmira': { normal: 0, media: 0 },              // ⏳ TEMPORAL
  'Zahuayco': { normal: 0, media: 0 },            // ⏳ TEMPORAL
  // Zona La Elvira
  'Cucanama': { normal: 0, media: 0 },             // ⏳ TEMPORAL
  'Linderos': { normal: 0, media: 0 },              // ⏳ TEMPORAL
  'Santorum': { normal: 0, media: 0 },             // ⏳ TEMPORAL
  'Solanda': { normal: 0, media: 0 },               // ⏳ TEMPORAL
  'Moyococha': { normal: 0, media: 0 },            // ⏳ TEMPORAL
  'Tumianuma': { normal: 0, media: 0 },            // ⏳ TEMPORAL
  'Comunidades': { normal: 0, media: 0 },          // ⏳ TEMPORAL
  'La Elvira': { normal: 0, media: 0 },            // ✅
  // Zona Yangana (precios vuelta específicos en preciosVueltaYangana)
  'Suro': { normal: 0, media: 0 },                 // ⏳ TEMPORAL (Zahuayco usa este)
  'Yangana': { normal: 0, media: 0 },              // ⏳ TEMPORAL (respaldo, Yangana usa preciosVueltaYangana)
  // Intermedios vuelta: desde Malacatos hacia Loja (Mal→X)
  'Mal→Peña': { normal: 0.75, media: 0.4 },
  'Mal→Land': { normal: 0.75, media: 0.4 },
  'Mal→Chorri': { normal: 0.75, media: 0.4 },
  'Mal→Nango': { normal: 0.75, media: 0.4 },
  'Mal→Porv': { normal: 1.1, media: 0.55 },
  'Mal→Gran': { normal: 1.1, media: 0.55 },
  'Mal→Yamba': { normal: 1.1, media: 0.55 },
  'Mal→Rumi': { normal: 1.1, media: 0.55 },
  'Mal→T.Leguas': { normal: 1.1, media: 0.55 },
  'Mal→P.Nuevo': { normal: 1.1, media: 0.55 },
  'Mal→Caja': { normal: 1.5, media: 0.75 },
  'Mal→D.Puen': { normal: 1.5, media: 0.75 },
  'Mal→Capulí': { normal: 2.0, media: 1.0 },
  // Intermedios vuelta: desde parada hacia Loja (X→Loja)
  'S.Pedro→Loja': { normal: 2.25, media: 1.15 },
  'Carar→Loja': { normal: 2.25, media: 1.15 },
  'Cavian→Loja': { normal: 2.25, media: 1.15 },
  'Taxich→Loja': { normal: 2.0, media: 1.0 },
  'Mal→Loja': { normal: 2.0, media: 1.0 },
  'Peña→Loja': { normal: 1.75, media: 0.9 },
  'Land→Loja': { normal: 1.75, media: 0.9 },
  'Chorri→Loja': { normal: 1.5, media: 0.75 },
  'Nango→Loja': { normal: 1.5, media: 0.75 },
  'Porv→Loja': { normal: 1.4, media: 0.7 },
  'Gran→Loja': { normal: 1.4, media: 0.7 },
  'Yamba→Loja': { normal: 1.25, media: 0.65 },
  'Rumi→Loja': { normal: 1.25, media: 0.65 },
  'T.Leguas→Loja': { normal: 1.25, media: 0.65 },
  'P.Nuevo→Loja': { normal: 1.25, media: 0.65 },
  'Caja→Loja': { normal: 1.25, media: 0.65 },
  'D.Puen→Loja': { normal: 0.75, media: 0.4 },
  'Capulí→Loja': { normal: 0.75, media: 0.4 },
  // Intermedios El Tambo vuelta (desde Malacatos hacia El Tambo)
  'Mal→Ceibop': { normal: 0, media: 0 },
  'Mal→Trinidad': { normal: 0, media: 0 },
  'Mal→S.Jose': { normal: 0, media: 0 },
  'Mal→StoDom': { normal: 0, media: 0 },
  'Mal→N.Dulce': { normal: 0, media: 0 },
  'Mal→Zhotahu': { normal: 0, media: 0 },
  'Mal→LaMerc': { normal: 0, media: 0 },
  'Mal→S.Agust': { normal: 0, media: 0 },
  'Mal→LaEra': { normal: 0, media: 0 },
  'Mal→LaCap': { normal: 0, media: 0 },
  'Mal→S.Bern': { normal: 0, media: 0 },
  'Mal→ElTambo': { normal: 0, media: 0 },
  // Intermedios Zahuayco/Yangana vuelta (desde Vilcabamba/Malacatos)
  'Vilc→Masan': { normal: 0, media: 0 },
  'Vilc→Quina': { normal: 0, media: 0 },
  'Vilc→Chumb': { normal: 0, media: 0 },
  'Vilc→Palm': { normal: 0, media: 0 },
  'Vilc→Zahua': { normal: 0, media: 0 },
  'Vilc→Suro': { normal: 0, media: 0 },
  'Vilc→Yangana': { normal: 0, media: 0 },
  'Mal→Masan': { normal: 0, media: 0 },
  'Mal→Quina': { normal: 0, media: 0 },
  'Mal→Chumb': { normal: 0, media: 0 },
  'Mal→Palm': { normal: 0, media: 0 },
  'Mal→Zahua': { normal: 0, media: 0 },
  'Mal→Suro': { normal: 0, media: 0 },
  'Mal→Yangana': { normal: 0, media: 0 },
  // Intermedios La Elvira vuelta (desde Vilcabamba/Malacatos)
  'Mal→Cucan': { normal: 0, media: 0 },
  'Mal→Lind': { normal: 0, media: 0 },
  'Mal→Santo': { normal: 0, media: 0 },
  'Mal→Solan': { normal: 0, media: 0 },
  'Mal→Moyoc': { normal: 0, media: 0 },
  'Mal→Tumia': { normal: 0, media: 0 },
  'Mal→Comun': { normal: 0, media: 0 },
  'Mal→Elvira': { normal: 0, media: 0 },
  'Vilc→Cucan': { normal: 0, media: 0 },
  'Vilc→Lind': { normal: 0, media: 0 },
  'Vilc→Santo': { normal: 0, media: 0 },
  'Vilc→Solan': { normal: 0, media: 0 },
  'Vilc→Moyoc': { normal: 0, media: 0 },
  'Vilc→Tumia': { normal: 0, media: 0 },
  'Vilc→Comun': { normal: 0, media: 0 },
  'Vilc→Elvira': { normal: 0, media: 0 },
};

// ─── Precios VUELTA específicos: EL TAMBO → LOJA ───
// Directos desde El Tambo hacia cada parada
const preciosVueltaElTambo: Record<string, { normal: number; media: number }> = {
  'El Tambo': { normal: 0, media: 0 },
  'San Bernaved': { normal: 0, media: 0 },
  'La Capilla': { normal: 0, media: 0 },
  'La Era': { normal: 0, media: 0 },
  'San Agustín': { normal: 0, media: 0 },
  'La Merced': { normal: 0, media: 0 },
  'Zhotahuayco': { normal: 0, media: 0 },
  'Naranjo Dulce': { normal: 0, media: 0 },
  'Santo Domingo': { normal: 0, media: 0 },
  'San José': { normal: 0, media: 0 },
  'Ceibopamba': { normal: 0, media: 0 },
  'Trinidad': { normal: 0, media: 0 },
  'Malacatos': { normal: 0, media: 0 },
  'La Peña': { normal: 0, media: 0 },
  'Landangui': { normal: 0, media: 0 },
  'Chorrillos': { normal: 0, media: 0 },
  'Nangora': { normal: 0, media: 0 },
  'Porvenir': { normal: 0, media: 0 },
  'Granadillo': { normal: 0, media: 0 },
  'Yamba': { normal: 0, media: 0 },
  'Rumizhitana': { normal: 0, media: 0 },
  'Tres Leguas': { normal: 0, media: 0 },
  'Pueblo Nuevo': { normal: 0, media: 0 },
  'Cajánuma': { normal: 0, media: 0 },
  'Dos Puentes': { normal: 0, media: 0 },
  'Capulí': { normal: 0, media: 0 },
  // Intermedios El Tambo IDA (desde Malacatos hacia El Tambo)
  'Mal→Ceibop': { normal: 0, media: 0 },
  'Mal→Trinidad': { normal: 0, media: 0 },
  'Mal→S.Jose': { normal: 0, media: 0 },
  'Mal→StoDom': { normal: 0, media: 0 },
  'Mal→N.Dulce': { normal: 0, media: 0 },
  'Mal→Zhotahu': { normal: 0, media: 0 },
  'Mal→LaMerc': { normal: 0, media: 0 },
  'Mal→S.Agust': { normal: 0, media: 0 },
  'Mal→LaEra': { normal: 0, media: 0 },
  'Mal→LaCap': { normal: 0, media: 0 },
  'Mal→S.Bern': { normal: 0, media: 0 },
  'Mal→ElTambo': { normal: 0, media: 0 },
  // Intermedios El Tambo vuelta: X → Loja (troncal usa preciosVuelta compartido)
  'LaCap→Loja': { normal: 0, media: 0 },
  'S.Bern→Loja': { normal: 0, media: 0 },
};

// ─── Precios VUELTA específicos: YANGANA → LOJA ───
// Directos desde Yangana hacia cada parada
// Los que están en $0.00 = no se vende directo desde Yangana a esa parada
const preciosVueltaYangana: Record<string, { normal: number; media: number }> = {
  'Yangana': { normal: 0, media: 0 },
  'Suro': { normal: 0, media: 0 },
  'Dos Puentes': { normal: 0, media: 0 },
  'Cajánuma': { normal: 0, media: 0 },
  'Pueblo Nuevo': { normal: 0, media: 0 },
  'Tres Leguas': { normal: 0, media: 0 },
  'Rumizhitana': { normal: 0, media: 0 },
  'Yamba': { normal: 0, media: 0 },
  'Granadillo': { normal: 0, media: 0 },
  'Porvenir': { normal: 0, media: 0 },
  'Nangora': { normal: 0, media: 0 },
  'Chorrillos': { normal: 0, media: 0 },
  'Landangui': { normal: 0, media: 0 },
  'La Peña': { normal: 0, media: 0 },
  'Malacatos': { normal: 0, media: 0 },
  'Taxiche': { normal: 0, media: 0 },
  'Cavianga': { normal: 0, media: 0 },
  'Cararango': { normal: 0, media: 0 },
  'San Pedro': { normal: 0, media: 0 },
  'Vilcabamba': { normal: 0, media: 0 },
  'Masanamaca': { normal: 0, media: 0 },
  'Capulí': { normal: 0, media: 0 },
  // Intermedios: se buscan en preciosVuelta compartido (Vilc→X, Mal→X)
};

// ─── Precios VUELTA específicos: VILCABAMBA → LOJA ───
// Directos desde Vilcabamba hacia cada parada
const preciosVueltaVilcabamba: Record<string, { normal: number; media: number }> = {
  'Vilcabamba': { normal: 0, media: 0 },
  'San Pedro': { normal: 0, media: 0 },
  'Cararango': { normal: 0, media: 0 },
  'Cavianga': { normal: 0, media: 0 },
  'Taxiche': { normal: 0, media: 0 },
  'Malacatos': { normal: 0, media: 0 },
  'Landangui': { normal: 0, media: 0 },
  'La Peña': { normal: 0, media: 0 },
  'Chorrillos': { normal: 0, media: 0 },
  'Nangora': { normal: 0, media: 0 },
  'Porvenir': { normal: 0, media: 0 },
  'Granadillo': { normal: 0, media: 0 },
  'Yamba': { normal: 0, media: 0 },
  'Rumizhitana': { normal: 0, media: 0 },
  'Tres Leguas': { normal: 0, media: 0 },
  'Pueblo Nuevo': { normal: 0, media: 0 },
  'Cajánuma': { normal: 0, media: 0 },
  'Dos Puentes': { normal: 0, media: 0 },
  'Capulí': { normal: 0, media: 0 },
};

// ─── Precios VUELTA específicos: LA ELVIRA → LOJA ───
// Directos desde La Elvira hacia cada parada
// Los que están en $0.00 = no se vende directo desde La Elvira a esa parada
const preciosVueltaLaElvira: Record<string, { normal: number; media: number }> = {
  'La Elvira': { normal: 0, media: 0 },
  'Dos Puentes': { normal: 0, media: 0 },
  'Comunidades': { normal: 0, media: 0 },
  'Cajánuma': { normal: 0, media: 0 },
  'Pueblo Nuevo': { normal: 0, media: 0 },
  'Tres Leguas': { normal: 0, media: 0 },
  'Rumizhitana': { normal: 0, media: 0 },
  'Yamba': { normal: 0, media: 0 },
  'Granadillo': { normal: 0, media: 0 },
  'Porvenir': { normal: 0, media: 0 },
  'Nangora': { normal: 0, media: 0 },
  'Chorrillos': { normal: 0, media: 0 },
  'Landangui': { normal: 0, media: 0 },
  'La Peña': { normal: 0, media: 0 },
  'Malacatos': { normal: 0, media: 0 },
  'Taxiche': { normal: 0, media: 0 },
  'Cavianga': { normal: 0, media: 0 },
  'Cararango': { normal: 0, media: 0 },
  'San Pedro': { normal: 0, media: 0 },
  'Vilcabamba': { normal: 0, media: 0 },
  'Cucanama': { normal: 0, media: 0 },
  'Linderos': { normal: 0, media: 0 },
  'Santorum': { normal: 0, media: 0 },
  'Solanda': { normal: 0, media: 0 },
  'Moyococha': { normal: 0, media: 0 },
  'Tumianuma': { normal: 0, media: 0 },
  'Quinara': { normal: 0, media: 0 },
  // Intermedios: se buscan en preciosVuelta compartido (Vilc→X, Mal→X, X→Loja)
  // Vilc→Loja es específico de La Elvira ($2.25 vs $2.50 troncal)
  'Vilc→Loja': { normal: 0, media: 0 },
};

// ─── Paradas por ruta según dirección ───
// "ida" = desde el origen de la ruta hacia el destino
// "vuelta" = desde el destino de vuelta al origen

export const RUTA_PARADAS: Record<string, { ida: string[]; vuelta: string[] }> = {
  'Loja - Vilcabamba': {
    ida: [
          'Capulí', 'Dos Puentes', 'Cajánuma', 'Pueblo Nuevo', 'Tres Leguas', 'Rumizhitana', 'Yamba',
          'Granadillo', 'Porvenir', 'Nangora', 'Chorrillos', 'Landangui', 'La Peña', 'Malacatos',
          'Taxiche', 'Cavianga', 'Cararango', 'San Pedro', 'Vilcabamba', 'Peña→Mal', 'Land→Mal',
          'Chorri→Mal', 'Nango→Mal', 'Porv→Mal', 'Gran→Mal', 'Yamba→Mal', 'Rumi→Mal', 'T.Leguas→Mal',
          'P.Nuevo→Mal', 'Caja→Mal', 'D.Puen→Mal', 'Capulí→Mal',
          'S.Pedro→Vilc', 'Carar→Vilc', 'Cavian→Vilc', 'Taxich→Vilc', 'Mal→Vilc', 'Land→Vilc', 'Peña→Vilc',
          'Chorri→Vilc', 'Nango→Vilc', 'Porv→Vilc', 'Gran→Vilc', 'Yamba→Vilc', 'Rumi→Vilc', 'T.Leguas→Vilc',
          'P.Nuevo→Vilc', 'Caja→Vilc', 'D.Puen→Vilc', 'Capulí→Vilc',
    ],
    vuelta: [
          'Vilcabamba', 'San Pedro', 'Cararango', 'Cavianga', 'Taxiche', 'Malacatos', 'La Peña', 'Landangui',
          'Chorrillos', 'Nangora', 'Porvenir', 'Granadillo', 'Yamba', 'Rumizhitana', 'Tres Leguas',
          'Pueblo Nuevo', 'Cajánuma', 'Dos Puentes', 'Capulí',
          // Intermedios desde Malacatos hacia Loja (orange, cerca→lejos)
          'Mal→LaPeña', 'Mal→Land', 'Mal→Chorri', 'Mal→Nango', 'Mal→Porv',
          'Mal→Gran', 'Mal→Yamba', 'Mal→Rumi', 'Mal→T.Leguas', 'Mal→P.Nuevo',
          'Mal→Caja', 'Mal→D.Puen', 'Mal→Capulí',
          // Intermedios desde parada hacia Loja (cerca→lejos desde Loja)
          'D.Puen→Loja', 'Caja→Loja', 'P.Nuevo→Loja', 'T.Leguas→Loja',
          'Rumi→Loja', 'Yamba→Loja', 'Gran→Loja', 'Porv→Loja',
          'Nango→Loja', 'Chorri→Loja', 'Land→Loja', 'Peña→Loja',
          'Mal→Loja', 'Taxich→Loja', 'Cavian→Loja', 'Carar→Loja', 'S.Pedro→Loja',
    ],
  },
  'Loja - Zahuayco': {
    ida: [
          'Capulí', 'Dos Puentes', 'Cajánuma', 'Pueblo Nuevo', 'Tres Leguas', 'Rumizhitana', 'Yamba',
          'Granadillo', 'Porvenir', 'Nangora', 'Chorrillos', 'Landangui', 'La Peña', 'Malacatos',
          'Taxiche', 'Cavianga', 'Cararango', 'San Pedro', 'Vilcabamba', 'Masanamaca', 'Quinara',
          'Chumberos', 'Palmira', 'Zahuayco', 'Vilc→Masan', 'Vilc→Quina', 'Vilc→Chumb', 'Vilc→Palm',
          'Vilc→Zahua', 'Mal→Masan', 'Mal→Quina', 'Mal→Chumb', 'Mal→Palm', 'Mal→Zahua',
    ],
    vuelta: [
          'Zahuayco', 'Palmira', 'Quinara', 'Masanamaca', 'Vilcabamba', 'San Pedro', 'Cararango',
          'Cavianga', 'Taxiche', 'Malacatos', 'La Peña', 'Landangui', 'Chorrillos', 'Nangora',
          'Porvenir', 'Granadillo', 'Yamba', 'Rumizhitana', 'Tres Leguas', 'Pueblo Nuevo',
          'Cajánuma', 'Dos Puentes', 'Capulí',
    ],
  },
  'Loja - El Tambo': {
    ida: [
          'Dos Puentes', 'Cajánuma', 'Pueblo Nuevo', 'Tres Leguas', 'Rumizhitana', 'Yamba',
          'Granadillo', 'Porvenir', 'Nangora', 'Chorrillos', 'Landangui', 'La Peña', 'Malacatos',
          'Ceibopamba', 'Trinidad', 'San José', 'Santo Domingo', 'Naranjo Dulce', 'Zhotahuayco',
          'La Merced', 'San Agustín', 'La Era', 'La Capilla', 'San Bernaved', 'El Tambo', 'Mal→Ceibop',
          'Mal→Trinidad', 'Mal→S.Jose', 'Mal→StoDom', 'Mal→N.Dulce', 'Mal→Zhotahu', 'Mal→LaMerc',
          'Mal→S.Agust', 'Mal→LaEra', 'Mal→LaCap', 'Mal→S.Bern', 'Mal→ElTambo',
    ],
    vuelta: [
          'El Tambo', 'San Bernaved', 'La Capilla', 'La Era', 'San Agustín', 'La Merced', 'Zhotahuayco',
          'Naranjo Dulce', 'Santo Domingo', 'San José', 'Ceibopamba', 'Trinidad', 'Malacatos',
          'La Peña', 'Landangui', 'Chorrillos', 'Nangora', 'Porvenir', 'Granadillo', 'Yamba',
          'Rumizhitana', 'Tres Leguas', 'Pueblo Nuevo', 'Cajánuma', 'Dos Puentes', 'Capulí',
          // Intermedios desde Malacatos hacia Loja (orange, cerca→lejos)
          'Mal→LaPeña', 'Mal→Land', 'Mal→Chorri', 'Mal→Nango', 'Mal→Porv',
          'Mal→Gran', 'Mal→Yamba', 'Mal→Rumi', 'Mal→T.Leguas', 'Mal→P.Nuevo',
          'Mal→Caja', 'Mal→D.Puen', 'Mal→Capulí',
          // Intermedios desde parada hacia Loja (troncal)
          'D.Puen→Loja', 'Caja→Loja', 'P.Nuevo→Loja', 'T.Leguas→Loja',
          'Rumi→Loja', 'Yamba→Loja', 'Gran→Loja', 'Porv→Loja',
          'Nango→Loja', 'Chorri→Loja', 'Land→Loja', 'Peña→Loja', 'Mal→Loja',
          // Intermedios desde parada hacia Loja (rama El Tambo)
          'LaCap→Loja', 'S.Bern→Loja',
    ],
  },
  'Loja - La Elvira': {
    ida: [
          'Capulí', 'Dos Puentes', 'Cajánuma', 'Pueblo Nuevo', 'Tres Leguas', 'Rumizhitana', 'Yamba',
          'Granadillo', 'Porvenir', 'Nangora', 'Chorrillos', 'Landangui', 'La Peña', 'Malacatos',
          'Taxiche', 'Cavianga', 'Cararango', 'San Pedro', 'Vilcabamba', 'Cucanama', 'Linderos',
          'Santorum', 'Solanda', 'Moyococha', 'Tumianuma', 'Quinara', 'Comunidades', 'La Elvira',
          'Mal→Cucan', 'Mal→Lind', 'Mal→Santo', 'Mal→Solan', 'Mal→Moyoc', 'Mal→Tumia', 'Mal→Quina',
          'Mal→Comun', 'Mal→Elvira', 'Vilc→Cucan', 'Vilc→Lind', 'Vilc→Santo', 'Vilc→Solan',
          'Vilc→Moyoc', 'Vilc→Tumia', 'Vilc→Quina', 'Vilc→Comun', 'Vilc→Elvira',
    ],
    vuelta: [
          'La Elvira', 'Comunidades', 'Quinara', 'Tumianuma', 'Moyococha', 'Solanda', 'Santorum',
          'Linderos', 'Cucanama', 'Vilcabamba', 'San Pedro', 'Cararango', 'Cavianga', 'Taxiche',
          'Malacatos', 'La Peña', 'Landangui', 'Chorrillos', 'Nangora', 'Porvenir', 'Granadillo',
          'Yamba', 'Rumizhitana', 'Tres Leguas', 'Pueblo Nuevo', 'Cajánuma', 'Dos Puentes',
          'Capulí',
          // Intermedios desde Malacatos hacia Loja (orange, cerca→lejos)
          'Mal→LaPeña', 'Mal→Land', 'Mal→Chorri', 'Mal→Nango', 'Mal→Porv',
          'Mal→Gran', 'Mal→Yamba', 'Mal→Rumi', 'Mal→T.Leguas', 'Mal→P.Nuevo',
          'Mal→Caja', 'Mal→D.Puen', 'Mal→Capulí',
          // Intermedios desde parada hacia Loja (troncal)
          'D.Puen→Loja', 'Caja→Loja', 'P.Nuevo→Loja', 'T.Leguas→Loja',
          'Rumi→Loja', 'Yamba→Loja', 'Gran→Loja', 'Porv→Loja',
          'Nango→Loja', 'Chorri→Loja', 'Land→Loja', 'Peña→Loja',
          'Mal→Loja', 'Taxich→Loja', 'Cavian→Loja', 'Carar→Loja', 'S.Pedro→Loja',
          'Vilc→Loja',
          // Intermedios La Elvira: X → Malacatos (orange) y X → Vilcabamba (purple)
          'Mal→Cucan', 'Mal→Lind', 'Mal→Santo', 'Mal→Solan', 'Mal→Moyoc', 'Mal→Tumia',
          'Mal→Quina', 'Mal→Comun', 'Mal→Elvira', 'Vilc→Cucan', 'Vilc→Lind', 'Vilc→Santo',
          'Vilc→Solan', 'Vilc→Moyoc', 'Vilc→Tumia', 'Vilc→Quina', 'Vilc→Comun', 'Vilc→Elvira',
    ],
  },
  'Loja - Yangana': {
    ida: [
          'Capulí', 'Dos Puentes', 'Cajánuma', 'Pueblo Nuevo', 'Tres Leguas', 'Rumizhitana', 'Yamba',
          'Granadillo', 'Porvenir', 'Nangora', 'Chorrillos', 'Landangui', 'La Peña', 'Malacatos',
          'Taxiche', 'Cavianga', 'Cararango', 'San Pedro', 'Vilcabamba', 'Masanamaca', 'Suro',
          'Yangana', 'Vilc→Masan', 'Vilc→Suro', 'Vilc→Yangana', 'Mal→Masan', 'Mal→Suro', 'Mal→Yangana',
    ],
    vuelta: [
          'Yangana', 'Suro', 'Masanamaca', 'Vilcabamba', 'San Pedro', 'Cararango', 'Cavianga',
          'Taxiche', 'Malacatos', 'La Peña', 'Landangui', 'Chorrillos', 'Nangora', 'Porvenir',
          'Granadillo', 'Yamba', 'Rumizhitana', 'Tres Leguas', 'Pueblo Nuevo', 'Cajánuma',
          'Dos Puentes', 'Capulí',
          // Intermedios desde Vilcabamba hacia Loja
          'Vilc→S.Pedro', 'Vilc→Carar', 'Vilc→Cavian', 'Vilc→Taxich', 'Vilc→Malac',
          'Vilc→Land', 'Vilc→Chorri', 'Vilc→Nango', 'Vilc→Porv', 'Vilc→Gran',
          'Vilc→Yamba', 'Vilc→Rumi', 'Vilc→T.Leguas', 'Vilc→P.Nuevo', 'Vilc→Caja',
          'Vilc→D.Puen', 'Vilc→Capulí',
          // Intermedios desde Malacatos hacia Loja
          'Mal→LaPeña', 'Mal→Land', 'Mal→Chorri', 'Mal→Nango', 'Mal→Porv',
          'Mal→Gran', 'Mal→Yamba', 'Mal→Rumi', 'Mal→T.Leguas', 'Mal→P.Nuevo',
          'Mal→Caja', 'Mal→D.Puen', 'Mal→Capulí',
    ],
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
    // Ruta El Tambo tiene precios de vuelta propios (no comparte troncal con Vilcabamba)
    if (ruta === 'Loja - El Tambo') {
      const tamboVuelta = preciosVueltaElTambo[parada];
      if (tamboVuelta) return tamboVuelta;
    }
    // Ruta Yangana tiene precios de vuelta propios (directos desde Yangana)
    if (ruta === 'Loja - Yangana') {
      const yangVuelta = preciosVueltaYangana[parada];
      if (yangVuelta) return yangVuelta;
    }
    // Ruta Vilcabamba tiene precios de vuelta propios (directos desde Vilcabamba)
    if (ruta === 'Loja - Vilcabamba') {
      const vilcVuelta = preciosVueltaVilcabamba[parada];
      if (vilcVuelta) return vilcVuelta;
    }
    // Ruta La Elvira tiene precios de vuelta propios (directos desde La Elvira)
    if (ruta === 'Loja - La Elvira') {
      const elviraVuelta = preciosVueltaLaElvira[parada];
      if (elviraVuelta) return elviraVuelta;
    }
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
