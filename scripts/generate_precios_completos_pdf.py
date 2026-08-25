#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Genera PDF completo con TODOS los precios oficiales RutaGo.
Incluye rutas troncal que aplica a cada ruta.
"""

import os
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.units import mm, cm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak,
    KeepTogether
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily

FONT_DIR = '/usr/share/fonts'

# Register fonts
pdfmetrics.registerFont(TTFont('NotoSerifSC', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Regular.ttf'))
pdfmetrics.registerFont(TTFont('NotoSerifSC-Bold', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Bold.ttf'))
registerFontFamily('NotoSerifSC', normal='NotoSerifSC', bold='NotoSerifSC-Bold')

pdfmetrics.registerFont(TTFont('LiberationSans', f'{FONT_DIR}/truetype/liberation/LiberationSans-Regular.ttf'))
pdfmetrics.registerFont(TTFont('LiberationSans-Bold', f'{FONT_DIR}/truetype/liberation/LiberationSans-Bold.ttf'))
registerFontFamily('LiberationSans', normal='LiberationSans', bold='LiberationSans-Bold')

# Colors
PRIMARY = colors.HexColor('#1e3a5f')
SECONDARY = colors.HexColor('#2c5282')
ACCENT = colors.HexColor('#3182ce')
HEADER_BG = colors.HexColor('#1e3a5f')
HEADER_TEXT = colors.white
ROW_EVEN = colors.HexColor('#f7fafc')
ROW_ODD = colors.white
TRONCAL_BG = colors.HexColor('#ebf8ff')
INTERMEDIO_BG = colors.HexColor('#fefcbf')
ZERO_BG = colors.HexColor('#fed7d7')
SECTION_BG = colors.HexColor('#2c5282')
SUBSECTION_BG = colors.HexColor('#4299e1')

FONT = 'LiberationSans'
FONT_B = 'LiberationSans-Bold'
FONT_CN = 'NotoSerifSC'
FONT_CN_B = 'NotoSerifSC-Bold'

# Page setup - landscape A4 for wide tables
PAGE_W, PAGE_H = landscape(A4)
MARGIN = 15 * mm

OUTPUT_PATH = '/home/z/my-project/download/RutaGo_Tarifas_Completas.pdf'

# ─── DATA ────────────────────────────────────────────────────────────────

# Intermedios name mapping (short code -> full display name)
INTERMEDIOS_NAMES = {
    # Troncal intermedios IDA (X→Mal)
    'Peña→Mal': 'La Peña → Malacatos',
    'Land→Mal': 'Landangui → Malacatos',
    'Chorri→Mal': 'Chorrillos → Malacatos',
    'Nango→Mal': 'Nangora → Malacatos',
    'Porv→Mal': 'Porvenir → Malacatos',
    'Gran→Mal': 'Granadillo → Malacatos',
    'Yamba→Mal': 'Yamba → Malacatos',
    'Rumi→Mal': 'Rumizhitana → Malacatos',
    'T.Leguas→Mal': 'Tres Leguas → Malacatos',
    'P.Nuevo→Mal': 'Pueblo Nuevo → Malacatos',
    'Caja→Mal': 'Cajánuma → Malacatos',
    'D.Puen→Mal': 'Dos Puentes → Malacatos',
    'Capulí→Mal': 'Capulí → Malacatos',
    # Troncal intermedios IDA (X→Vilc)
    'S.Pedro→Vilc': 'San Pedro → Vilcabamba',
    'Carar→Vilc': 'Cararango → Vilcabamba',
    'Cavian→Vilc': 'Cavianga → Vilcabamba',
    'Taxich→Vilc': 'Taxiche → Vilcabamba',
    'Mal→Vilc': 'Malacatos → Vilcabamba',
    'Land→Vilc': 'Landangui → Vilcabamba',
    'Peña→Vilc': 'La Peña → Vilcabamba',
    'Chorri→Vilc': 'Chorrillos → Vilcabamba',
    'Nango→Vilc': 'Nangora → Vilcabamba',
    'Porv→Vilc': 'Porvenir → Vilcabamba',
    'Gran→Vilc': 'Granadillo → Vilcabamba',
    'Yamba→Vilc': 'Yamba → Vilcabamba',
    'Rumi→Vilc': 'Rumizhitana → Vilcabamba',
    'T.Leguas→Vilc': 'Tres Leguas → Vilcabamba',
    'P.Nuevo→Vilc': 'Pueblo Nuevo → Vilcabamba',
    'Caja→Vilc': 'Cajánuma → Vilcabamba',
    'D.Puen→Vilc': 'Dos Puentes → Vilcabamba',
    'Capulí→Vilc': 'Capulí → Vilcabamba',
    # El Tambo intermedios IDA (Mal→X)
    'Mal→Ceibop': 'Malacatos → Ceibopamba',
    'Mal→Trinidad': 'Malacatos → Trinidad',
    'Mal→S.Jose': 'Malacatos → San José',
    'Mal→StoDom': 'Malacatos → Sto. Domingo',
    'Mal→N.Dulce': 'Malacatos → Naranjo Dulce',
    'Mal→Zhotahu': 'Malacatos → Zhotahuayco',
    'Mal→LaMerc': 'Malacatos → La Merced',
    'Mal→S.Agust': 'Malacatos → San Agustín',
    'Mal→LaEra': 'Malacatos → La Era',
    'Mal→LaCap': 'Malacatos → La Capilla',
    'Mal→S.Bern': 'Malacatos → San Bernaved',
    'Mal→ElTambo': 'Malacatos → El Tambo',
    # El Tambo intermedios IDA (X→ElTambo)
    'Caja→ElTambo': 'Cajánuma → El Tambo',
    'P.Nuevo→ElTambo': 'Pueblo Nuevo → El Tambo',
    'T.Leguas→ElTambo': 'Tres Leguas → El Tambo',
    'Rumi→ElTambo': 'Rumizhitana → El Tambo',
    'Yamba→ElTambo': 'Yamba → El Tambo',
    'Gran→ElTambo': 'Granadillo → El Tambo',
    'Porv→ElTambo': 'Porvenir → El Tambo',
    'Nango→ElTambo': 'Nangora → El Tambo',
    'Chorri→ElTambo': 'Chorrillos → El Tambo',
    'Land→ElTambo': 'Landangui → El Tambo',
    'Peña→ElTambo': 'La Peña → El Tambo',
    # Zahuayco/Yangana intermedios IDA (Vilc→X)
    'Vilc→Masan': 'Vilcabamba → Masanamaca',
    'Vilc→Quina': 'Vilcabamba → Quinara',
    'Vilc→Chumb': 'Vilcabamba → Chumberos',
    'Vilc→Palm': 'Vilcabamba → Palmira',
    'Vilc→Zahua': 'Vilcabamba → Zahuayco',
    'Vilc→Suro': 'Vilcabamba → Suro',
    'Vilc→Yangana': 'Vilcabamba → Yangana',
    # Zahuayco/Yangana intermedios IDA (Mal→X)
    'Mal→Masan': 'Malacatos → Masanamaca',
    'Mal→Quina': 'Malacatos → Quinara',
    'Mal→Chumb': 'Malacatos → Chumberos',
    'Mal→Palm': 'Malacatos → Palmira',
    'Mal→Zahua': 'Malacatos → Zahuayco',
    'Mal→Suro': 'Malacatos → Suro',
    'Mal→Yangana': 'Malacatos → Yangana',
    # La Elvira intermedios IDA (Mal→X)
    'Mal→Cucan': 'Malacatos → Cucanama',
    'Mal→Lind': 'Malacatos → Linderos',
    'Mal→Santo': 'Malacatos → Santorum',
    'Mal→Solan': 'Malacatos → Solanda',
    'Mal→Moyoc': 'Malacatos → Moyococha',
    'Mal→Tumia': 'Malacatos → Tumianuma',
    'Mal→Comun': 'Malacatos → Comunidades',
    'Mal→Elvira': 'Malacatos → La Elvira',
    # La Elvira intermedios IDA (Vilc→X)
    'Vilc→Cucan': 'Vilcabamba → Cucanama',
    'Vilc→Lind': 'Vilcabamba → Linderos',
    'Vilc→Santo': 'Vilcabamba → Santorum',
    'Vilc→Solan': 'Vilcabamba → Solanda',
    'Vilc→Moyoc': 'Vilcabamba → Moyococha',
    'Vilc→Tumia': 'Vilcabamba → Tumianuma',
    'Vilc→Comun': 'Vilcabamba → Comunidades',
    'Vilc→Elvira': 'Vilcabamba → La Elvira',
    # VUELTA intermedios (Mal→X hacia Loja)
    'Mal→Peña': 'Malacatos → La Peña',
    'Mal→Land': 'Malacatos → Landangui',
    'Mal→Chorri': 'Malacatos → Chorrillos',
    'Mal→Nango': 'Malacatos → Nangora',
    'Mal→Porv': 'Malacatos → Porvenir',
    'Mal→Gran': 'Malacatos → Granadillo',
    'Mal→Yamba': 'Malacatos → Yamba',
    'Mal→Rumi': 'Malacatos → Rumizhitana',
    'Mal→T.Leguas': 'Malacatos → Tres Leguas',
    'Mal→P.Nuevo': 'Malacatos → Pueblo Nuevo',
    'Mal→Caja': 'Malacatos → Cajánuma',
    'Mal→D.Puen': 'Malacatos → Dos Puentes',
    'Mal→Capulí': 'Malacatos → Capulí',
    # VUELTA intermedios (X→Loja)
    'S.Pedro→Loja': 'San Pedro → Loja',
    'Carar→Loja': 'Cararango → Loja',
    'Cavian→Loja': 'Cavianga → Loja',
    'Taxich→Loja': 'Taxiche → Loja',
    'Mal→Loja': 'Malacatos → Loja',
    'Peña→Loja': 'La Peña → Loja',
    'Land→Loja': 'Landangui → Loja',
    'Chorri→Loja': 'Chorrillos → Loja',
    'Nango→Loja': 'Nangora → Loja',
    'Porv→Loja': 'Porvenir → Loja',
    'Gran→Loja': 'Granadillo → Loja',
    'Yamba→Loja': 'Yamba → Loja',
    'Rumi→Loja': 'Rumizhitana → Loja',
    'T.Leguas→Loja': 'Tres Leguas → Loja',
    'P.Nuevo→Loja': 'Pueblo Nuevo → Loja',
    'Caja→Loja': 'Cajánuma → Loja',
    'D.Puen→Loja': 'Dos Puentes → Loja',
    'Capulí→Loja': 'Capulí → Loja',
    # El Tambo VUELTA intermedios
    'LaCap→Loja': 'La Capilla → Loja',
    'S.Bern→Loja': 'San Bernaved → Loja',
    # Yangana VUELTA intermedios (Vilc→X)
    'Vilc→S.Pedro': 'Vilcabamba → San Pedro',
    'Vilc→Carar': 'Vilcabamba → Cararango',
    'Vilc→Cavian': 'Vilcabamba → Cavianga',
    'Vilc→Taxich': 'Vilcabamba → Taxiche',
    'Vilc→Malac': 'Vilcabamba → Malacatos',
    'Vilc→Land': 'Vilcabamba → Landangui',
    'Vilc→Chorri': 'Vilcabamba → Chorrillos',
    'Vilc→Nango': 'Vilcabamba → Nangora',
    'Vilc→Porv': 'Vilcabamba → Porvenir',
    'Vilc→Gran': 'Vilcabamba → Granadillo',
    'Vilc→Yamba': 'Vilcabamba → Yamba',
    'Vilc→Rumi': 'Vilcabamba → Rumizhitana',
    'Vilc→T.Leguas': 'Vilcabamba → Tres Leguas',
    'Vilc→P.Nuevo': 'Vilcabamba → Pueblo Nuevo',
    'Vilc→Caja': 'Vilcabamba → Cajánuma',
    'Vilc→D.Puen': 'Vilcabamba → Dos Puentes',
    'Vilc→Capulí': 'Vilcabamba → Capulí',
    # VUELTA Mal→X para La Elvira/Zahuayco/Yangana (ramal)
    'Mal→LaPeña': 'Malacatos → La Peña',
}


def get_display_name(key):
    """Get display name for a parada key."""
    if key in INTERMEDIOS_NAMES:
        return INTERMEDIOS_NAMES[key]
    return key


def is_intermedio(key):
    """Check if a parada key is an intermediate (contains arrow)."""
    return '→' in key or '→' in key


def fmt(val):
    """Format price value."""
    if val == 0:
        return '-'
    return f'${val:.2f}'


# ═══ PRECIOS IDA ═══

# Troncal IDA (Loja → Vilcabamba) - compartida por Zahuayco, La Elvira, Yangana
TRONCAL_IDA = {
    'Capulí': (0.75, 0.40),
    'Dos Puentes': (0.75, 0.40),
    'Cajánuma': (1.25, 0.65),
    'Pueblo Nuevo': (1.25, 0.65),
    'Tres Leguas': (1.25, 0.65),
    'Rumizhitana': (1.25, 0.65),
    'Yamba': (1.25, 0.65),
    'Granadillo': (1.40, 0.70),
    'Porvenir': (1.40, 0.70),
    'Nangora': (1.50, 0.75),
    'Chorrillos': (1.50, 0.75),
    'Landangui': (1.75, 0.90),
    'La Peña': (1.75, 0.90),
    'Malacatos': (2.00, 1.00),
    'Taxiche': (2.25, 1.15),
    'Cavianga': (2.50, 1.25),
    'Cararango': (2.50, 1.25),
    'San Pedro': (2.50, 1.25),
    'Vilcabamba': (2.50, 1.25),
}

# Intermedios troncal IDA: X → Malacatos
INTER_TRONCAL_IDA_X_MAL = {
    'Peña→Mal': ('La Peña → Malacatos', 0.75, 0.40),
    'Land→Mal': ('Landangui → Malacatos', 1.10, 0.55),
    'Chorri→Mal': ('Chorrillos → Malacatos', 1.25, 0.65),
    'Nango→Mal': ('Nangora → Malacatos', 1.25, 0.65),
    'Porv→Mal': ('Porvenir → Malacatos', 1.50, 0.75),
    'Gran→Mal': ('Granadillo → Malacatos', 1.50, 0.75),
    'Yamba→Mal': ('Yamba → Malacatos', 1.50, 0.75),
    'Rumi→Mal': ('Rumizhitana → Malacatos', 1.50, 0.75),
    'T.Leguas→Mal': ('Tres Leguas → Malacatos', 1.50, 0.75),
    'P.Nuevo→Mal': ('Pueblo Nuevo → Malacatos', 1.50, 0.75),
    'Caja→Mal': ('Cajánuma → Malacatos', 2.00, 1.00),
    'D.Puen→Mal': ('Dos Puentes → Malacatos', 2.00, 1.00),
    'Capulí→Mal': ('Capulí → Malacatos', 2.50, 1.25),
}

# Intermedios troncal IDA: X → Vilcabamba
INTER_TRONCAL_IDA_X_VILC = {
    'S.Pedro→Vilc': ('San Pedro → Vilcabamba', 0.75, 0.40),
    'Carar→Vilc': ('Cararango → Vilcabamba', 0.75, 0.40),
    'Cavian→Vilc': ('Cavianga → Vilcabamba', 0.75, 0.40),
    'Taxich→Vilc': ('Taxiche → Vilcabamba', 0.75, 0.40),
    'Mal→Vilc': ('Malacatos → Vilcabamba', 1.10, 0.55),
    'Land→Vilc': ('Landangui → Vilcabamba', 1.10, 0.55),
    'Peña→Vilc': ('La Peña → Vilcabamba', 1.10, 0.55),
    'Chorri→Vilc': ('Chorrillos → Vilcabamba', 1.25, 0.65),
    'Nango→Vilc': ('Nangora → Vilcabamba', 1.25, 0.65),
    'Porv→Vilc': ('Porvenir → Vilcabamba', 1.25, 0.65),
    'Gran→Vilc': ('Granadillo → Vilcabamba', 1.50, 0.75),
    'Yamba→Vilc': ('Yamba → Vilcabamba', 1.50, 0.75),
    'Rumi→Vilc': ('Rumizhitana → Vilcabamba', 1.50, 0.75),
    'T.Leguas→Vilc': ('Tres Leguas → Vilcabamba', 1.50, 0.75),
    'P.Nuevo→Vilc': ('Pueblo Nuevo → Vilcabamba', 1.50, 0.75),
    'Caja→Vilc': ('Cajánuma → Vilcabamba', 2.00, 1.00),
    'D.Puen→Vilc': ('Dos Puentes → Vilcabamba', 2.00, 1.00),
    'Capulí→Vilc': ('Capulí → Vilcabamba', 2.50, 1.25),
}

# El Tambo IDA directos (desde Loja)
ELTAMBO_IDA = {
    'Ceibopamba': (2.25, 1.15),
    'Trinidad': (2.25, 1.15),
    'San José': (2.25, 1.15),
    'Santo Domingo': (2.50, 1.25),
    'Naranjo Dulce': (2.75, 1.40),
    'Zhotahuayco': (3.00, 1.50),
    'La Merced': (3.25, 1.65),
    'San Agustín': (3.75, 1.90),
    'La Era': (3.75, 1.90),
    'La Capilla': (4.00, 2.00),
    'San Bernaved': (4.00, 2.00),
    'El Tambo': (4.00, 2.00),
}

# El Tambo intermedios IDA (Mal→X)
ELTAMBO_INTER_MAL = {
    'Mal→Ceibop': ('Malacatos → Ceibopamba', 0.75, 0.40),
    'Mal→Trinidad': ('Malacatos → Trinidad', 0.75, 0.40),
    'Mal→S.Jose': ('Malacatos → San José', 0.75, 0.40),
    'Mal→StoDom': ('Malacatos → Sto. Domingo', 1.00, 0.50),
    'Mal→N.Dulce': ('Malacatos → Naranjo Dulce', 1.25, 0.65),
    'Mal→Zhotahu': ('Malacatos → Zhotahuayco', 1.50, 0.75),
    'Mal→LaMerc': ('Malacatos → La Merced', 1.75, 0.90),
    'Mal→S.Agust': ('Malacatos → San Agustín', 1.75, 0.90),
    'Mal→LaEra': ('Malacatos → La Era', 2.00, 1.00),
    'Mal→LaCap': ('Malacatos → La Capilla', 2.25, 1.15),
    'Mal→S.Bern': ('Malacatos → San Bernaved', 2.25, 1.15),
    'Mal→ElTambo': ('Malacatos → El Tambo', 2.25, 1.15),
}

# El Tambo intermedios IDA (X→ElTambo desde troncal)
ELTAMBO_INTER_TRONCAL = {
    'Caja→ElTambo': ('Cajánuma → El Tambo', 3.50, 1.75),
    'P.Nuevo→ElTambo': ('Pueblo Nuevo → El Tambo', 3.50, 1.75),
    'T.Leguas→ElTambo': ('Tres Leguas → El Tambo', 3.50, 1.75),
    'Rumi→ElTambo': ('Rumizhitana → El Tambo', 3.50, 1.75),
    'Yamba→ElTambo': ('Yamba → El Tambo', 3.50, 1.75),
    'Gran→ElTambo': ('Granadillo → El Tambo', 3.25, 1.65),
    'Porv→ElTambo': ('Porvenir → El Tambo', 3.25, 1.65),
    'Nango→ElTambo': ('Nangora → El Tambo', 3.00, 1.50),
    'Chorri→ElTambo': ('Chorrillos → El Tambo', 2.75, 1.40),
    'Land→ElTambo': ('Landangui → El Tambo', 2.75, 1.40),
    'Peña→ElTambo': ('La Peña → El Tambo', 2.50, 1.25),
}

# Zahuayco IDA directos
ZAHUAYCO_IDA = {
    'Masanamaca': (3.00, 1.50),
    'Quinara': (3.25, 1.65),
    'Chumberos': (3.75, 1.90),
    'Palmira': (3.75, 1.90),
    'Zahuayco': (4.00, 2.00),
}

# Zahuayco/Yangana intermedios IDA (Vilc→X)
ZAHUAYCO_INTER_VILC = {
    'Vilc→Masan': ('Vilcabamba → Masanamaca', 1.10, 0.55),
    'Vilc→Quina': ('Vilcabamba → Quinara', 2.00, 1.00),
    'Vilc→Chumb': ('Vilcabamba → Chumberos', 2.00, 1.00),
    'Vilc→Palm': ('Vilcabamba → Palmira', 2.25, 1.15),
    'Vilc→Zahua': ('Vilcabamba → Zahuayco', 2.50, 1.25),
}

# Zahuayco/Yangana intermedios IDA (Mal→X) - compartidos
ZAHUAYCO_INTER_MAL = {
    'Mal→Masan': ('Malacatos → Masanamaca', 2.00, 1.00),
    'Mal→Quina': ('Malacatos → Quinara', 2.00, 1.00),
    'Mal→Chumb': ('Malacatos → Chumberos', 2.50, 1.25),
    'Mal→Palm': ('Malacatos → Palmira', 2.90, 1.45),
    'Mal→Zahua': ('Malacatos → Zahuayco', 3.15, 1.60),
}

# Yangana IDA directos
YANGANA_IDA = {
    'Suro': (3.25, 1.65),
    'Yangana': (3.75, 1.90),
}

# Yangana intermedios IDA
YANGANA_INTER_VILC = {
    'Vilc→Suro': ('Vilcabamba → Suro', 1.60, 0.80),
    'Vilc→Yangana': ('Vilcabamba → Yangana', 2.00, 1.00),
}
YANGANA_INTER_MAL = {
    'Mal→Suro': ('Malacatos → Suro', 2.00, 1.00),
    'Mal→Yangana': ('Malacatos → Yangana', 2.50, 1.25),
}

# La Elvira IDA directos
ELVIRA_IDA = {
    'Cucanama': (2.50, 1.25),
    'Linderos': (2.75, 1.40),
    'Santorum': (3.00, 1.50),
    'Solanda': (3.00, 1.50),
    'Moyococha': (3.00, 1.50),
    'Tumianuma': (3.25, 1.65),
    'Comunidades': (3.50, 1.65),
    'La Elvira': (3.75, 1.90),
}

# La Elvira intermedios IDA (Mal→X)
ELVIRA_INTER_MAL = {
    'Mal→Cucan': ('Malacatos → Cucanama', 1.60, 0.80),
    'Mal→Lind': ('Malacatos → Linderos', 2.00, 1.00),
    'Mal→Santo': ('Malacatos → Santorum', 2.00, 1.00),
    'Mal→Solan': ('Malacatos → Solanda', 2.00, 1.00),
    'Mal→Moyoc': ('Malacatos → Moyococha', 2.00, 1.00),
    'Mal→Tumia': ('Malacatos → Tumianuma', 2.50, 1.25),
    'Mal→Quina_Elv': ('Malacatos → Quinara', 2.50, 1.25),
    'Mal→Comun': ('Malacatos → Comunidades', 2.50, 1.25),
    'Mal→Elvira': ('Malacatos → La Elvira', 3.00, 1.50),
}

# La Elvira intermedios IDA (Vilc→X)
ELVIRA_INTER_VILC = {
    'Vilc→Cucan': ('Vilcabamba → Cucanama', 0.75, 0.40),
    'Vilc→Lind': ('Vilcabamba → Linderos', 1.10, 0.55),
    'Vilc→Santo': ('Vilcabamba → Santorum', 1.50, 0.75),
    'Vilc→Solan': ('Vilcabamba → Solanda', 1.50, 0.75),
    'Vilc→Moyoc': ('Vilcabamba → Moyococha', 1.50, 0.75),
    'Vilc→Tumia': ('Vilcabamba → Tumianuma', 2.00, 1.00),
    'Vilc→Quina_Elv': ('Vilcabamba → Quinara', 2.00, 1.00),
    'Vilc→Comun': ('Vilcabamba → Comunidades', 2.00, 1.00),
    'Vilc→Elvira': ('Vilcabamba → La Elvira', 2.40, 1.20),
}

# ═══ PRECIOS VUELTA ═══

# Troncal VUELTA (Vilcabamba→Loja) - compartida por Zahuayco, La Elvira, Yangana
TRONCAL_VUELTA = {
    'Dos Puentes': (2.00, 1.00),
    'Cajánuma': (2.00, 1.00),
    'Pueblo Nuevo': (1.50, 0.75),
    'Tres Leguas': (1.50, 0.75),
    'Rumizhitana': (1.50, 0.75),
    'Yamba': (1.50, 0.75),
    'Granadillo': (1.50, 0.75),
    'Porvenir': (1.25, 0.65),
    'Nangora': (1.25, 0.65),
    'Chorrillos': (1.25, 0.65),
    'Landangui': (1.10, 0.55),
    'La Peña': (1.10, 0.55),
    'Malacatos': (1.10, 0.55),
    'Taxiche': (0.75, 0.40),
    'Cavianga': (0.75, 0.40),
    'Cararango': (0.75, 0.40),
    'San Pedro': (0.75, 0.40),
    'Capulí': (2.50, 1.25),
    'Loja': (2.50, 1.25),
}

# Intermedios VUELTA: Mal→X (hacia Loja)
INTER_VUELTA_MAL = {
    'Mal→Peña': ('Malacatos → La Peña', 0.75, 0.40),
    'Mal→Land': ('Malacatos → Landangui', 0.75, 0.40),
    'Mal→Chorri': ('Malacatos → Chorrillos', 0.75, 0.40),
    'Mal→Nango': ('Malacatos → Nangora', 0.75, 0.40),
    'Mal→Porv': ('Malacatos → Porvenir', 1.10, 0.55),
    'Mal→Gran': ('Malacatos → Granadillo', 1.10, 0.55),
    'Mal→Yamba': ('Malacatos → Yamba', 1.10, 0.55),
    'Mal→Rumi': ('Malacatos → Rumizhitana', 1.10, 0.55),
    'Mal→T.Leguas': ('Malacatos → Tres Leguas', 1.10, 0.55),
    'Mal→P.Nuevo': ('Malacatos → Pueblo Nuevo', 1.10, 0.55),
    'Mal→Caja': ('Malacatos → Cajánuma', 1.50, 0.75),
    'Mal→D.Puen': ('Malacatos → Dos Puentes', 1.50, 0.75),
    'Mal→Capulí': ('Malacatos → Capulí', 2.00, 1.00),
}

# Intermedios VUELTA: X→Loja
INTER_VUELTA_X_LOJA = {
    'S.Pedro→Loja': ('San Pedro → Loja', 2.25, 1.15),
    'Carar→Loja': ('Cararango → Loja', 2.25, 1.15),
    'Cavian→Loja': ('Cavianga → Loja', 2.25, 1.15),
    'Taxich→Loja': ('Taxiche → Loja', 2.00, 1.00),
    'Mal→Loja': ('Malacatos → Loja', 2.00, 1.00),
    'Peña→Loja': ('La Peña → Loja', 1.75, 0.90),
    'Land→Loja': ('Landangui → Loja', 1.75, 0.90),
    'Chorri→Loja': ('Chorrillos → Loja', 1.50, 0.75),
    'Nango→Loja': ('Nangora → Loja', 1.50, 0.75),
    'Porv→Loja': ('Porvenir → Loja', 1.40, 0.70),
    'Gran→Loja': ('Granadillo → Loja', 1.40, 0.70),
    'Yamba→Loja': ('Yamba → Loja', 1.25, 0.65),
    'Rumi→Loja': ('Rumizhitana → Loja', 1.25, 0.65),
    'T.Leguas→Loja': ('Tres Leguas → Loja', 1.25, 0.65),
    'P.Nuevo→Loja': ('Pueblo Nuevo → Loja', 1.25, 0.65),
    'Caja→Loja': ('Cajánuma → Loja', 1.25, 0.65),
    'D.Puen→Loja': ('Dos Puentes → Loja', 0.75, 0.40),
    'Capulí→Loja': ('Capulí → Loja', 0.75, 0.40),
}

# El Tambo VUELTA directos
ELTAMBO_VUELTA = {
    'El Tambo': (0, 0),
    'San Bernaved': (0.75, 0.40),
    'La Capilla': (0.75, 0.40),
    'La Era': (1.00, 0.50),
    'San Agustín': (1.00, 0.65),
    'La Merced': (1.00, 0.75),
    'Zhotahuayco': (1.00, 0.90),
    'Naranjo Dulce': (1.75, 0.90),
    'Santo Domingo': (2.00, 1.00),
    'San José': (2.25, 1.15),
    'Ceibopamba': (2.25, 1.15),
    'Trinidad': (2.25, 1.15),
    'Malacatos': (2.25, 1.15),
    'La Peña': (2.25, 1.15),
    'Landangui': (2.75, 1.40),
    'Chorrillos': (2.75, 1.40),
    'Nangora': (3.00, 1.50),
    'Porvenir': (3.25, 1.60),
    'Granadillo': (3.25, 1.60),
    'Yamba': (3.50, 1.75),
    'Rumizhitana': (3.50, 1.75),
    'Tres Leguas': (3.50, 1.75),
    'Pueblo Nuevo': (3.50, 1.75),
    'Cajánuma': (3.50, 1.75),
    'Dos Puentes': (3.50, 1.75),
    'Capulí': (4.00, 2.00),
    'Loja': (4.00, 2.00),
}

# Zahuayco VUELTA directos
ZAHUAYCO_VUELTA = {
    'Loja': (3.50, 1.75),
    'Capulí': (3.50, 1.75),
    'Dos Puentes': (3.50, 1.75),
    'Cajánuma': (3.50, 1.75),
    'Pueblo Nuevo': (3.50, 1.75),
    'Tres Leguas': (3.50, 1.75),
    'Rumizhitana': (3.50, 1.75),
    'Yamba': (3.25, 1.65),
    'Granadillo': (3.25, 1.65),
    'Porvenir': (3.25, 1.65),
    'Nangora': (3.25, 1.65),
    'Chorrillos': (3.15, 1.60),
    'Landangui': (3.15, 1.60),
    'La Peña': (3.15, 1.60),
    'Malacatos': (3.15, 1.60),
    'Taxiche': (3.15, 1.60),
    'Cavianga': (2.75, 1.40),
    'Cararango': (2.75, 1.40),
    'San Pedro': (2.75, 1.40),
    'Vilcabamba': (2.00, 1.00),
    'Masanamaca': (1.25, 0.65),
    'Quinara': (1.00, 0.50),
    'Chumberos': (1.00, 0.50),
    'Palmira': (0.75, 0.40),
}

# Zahuayco VUELTA intermedios
ZAHUAYCO_VUELTA_INTER = {
    'Mal→Loja_Z': ('Malacatos → Loja', 2.00, 1.00),
    'Mal→Masan_Z': ('Malacatos → Masanamaca', 2.00, 1.00),
    'Mal→Quina_Z': ('Malacatos → Quinara', 2.00, 1.00),
    'Mal→Chumb_Z': ('Malacatos → Chumberos', 2.50, 1.25),
    'Mal→Palm_Z': ('Malacatos → Palmira', 2.90, 1.45),
    'Mal→Zahua_Z': ('Malacatos → Zahuayco', 3.15, 1.60),
    'Vilc→Masan_Z': ('Vilcabamba → Masanamaca', 1.10, 0.55),
    'Vilc→Quina_Z': ('Vilcabamba → Quinara', 2.00, 1.00),
    'Vilc→Chumb_Z': ('Vilcabamba → Chumberos', 2.00, 1.00),
    'Vilc→Palm_Z': ('Vilcabamba → Palmira', 2.25, 1.15),
    'Vilc→Zahua_Z': ('Vilcabamba → Zahuayco', 2.50, 1.25),
}

# Yangana VUELTA directos
YANGANA_VUELTA = {
    'Yangana': (0, 0),
    'Suro': (0.75, 0.40),
    'Loja': (3.75, 1.90),
    'Capulí': (3.75, 1.90),
    'Dos Puentes': (3.75, 1.90),
    'Cajánuma': (3.00, 1.50),
    'Pueblo Nuevo': (3.00, 1.50),
    'Tres Leguas': (3.00, 1.50),
    'Rumizhitana': (3.00, 1.50),
    'Yamba': (2.75, 1.40),
    'Granadillo': (2.75, 1.40),
    'Porvenir': (2.75, 1.40),
    'Nangora': (2.75, 1.40),
    'Chorrillos': (2.50, 1.25),
    'Landangui': (2.50, 1.25),
    'La Peña': (2.50, 1.25),
    'Malacatos': (2.50, 1.25),
    'Taxiche': (2.00, 1.00),
    'Cavianga': (2.00, 1.00),
    'Cararango': (2.00, 1.00),
    'San Pedro': (2.00, 1.00),
    'Vilcabamba': (2.00, 1.00),
    'Masanamaca': (1.00, 0.50),
}

# Yangana VUELTA intermedios
YANGANA_VUELTA_INTER = {
    'Mal→Masan_Y': ('Malacatos → Masanamaca', 1.60, 0.80),
    'Mal→Suro_Y': ('Malacatos → Suro', 2.00, 1.00),
    'Mal→Yangana_Y': ('Malacatos → Yangana', 2.50, 1.25),
    'Vilc→Masan_Y': ('Vilcabamba → Masanamaca', 1.10, 0.55),
    'Vilc→Suro_Y': ('Vilcabamba → Suro', 1.60, 0.80),
    'Vilc→Yangana_Y': ('Vilcabamba → Yangana', 2.00, 1.00),
}

# Vilcabamba VUELTA directos
VILCABAMBA_VUELTA = {
    'Vilcabamba': (0, 0),
    'San Pedro': (0.75, 0.40),
    'Cararango': (0.75, 0.40),
    'Cavianga': (0.75, 0.40),
    'Taxiche': (0.75, 0.40),
    'Malacatos': (1.10, 0.55),
    'Landangui': (1.10, 0.55),
    'La Peña': (1.10, 0.55),
    'Chorrillos': (1.25, 0.65),
    'Nangora': (1.25, 0.65),
    'Porvenir': (1.25, 0.65),
    'Granadillo': (1.50, 0.75),
    'Yamba': (1.50, 0.75),
    'Rumizhitana': (1.50, 0.75),
    'Tres Leguas': (1.50, 0.75),
    'Pueblo Nuevo': (1.50, 0.75),
    'Cajánuma': (2.00, 1.00),
    'Dos Puentes': (2.00, 1.00),
    'Capulí': (2.50, 1.25),
    'Loja': (2.50, 1.25),
}

# La Elvira VUELTA directos
ELVIRA_VUELTA = {
    'La Elvira': (0, 0),
    'Loja': (3.75, 1.90),
    'Capulí': (3.75, 1.90),
    'Dos Puentes': (3.75, 1.90),
    'Cajánuma': (3.50, 1.75),
    'Pueblo Nuevo': (3.50, 1.75),
    'Tres Leguas': (3.50, 1.75),
    'Rumizhitana': (3.50, 1.75),
    'Yamba': (3.50, 1.75),
    'Granadillo': (3.25, 1.65),
    'Porvenir': (3.25, 1.65),
    'Nangora': (3.25, 1.65),
    'Chorrillos': (3.00, 1.50),
    'Landangui': (3.00, 1.50),
    'La Peña': (3.00, 1.50),
    'Malacatos': (3.00, 1.50),
    'Taxiche': (2.75, 1.40),
    'Cavianga': (2.75, 1.40),
    'Cararango': (2.75, 1.40),
    'San Pedro': (2.50, 1.25),
    'Vilcabamba': (2.50, 1.25),
    'Cucanama': (2.25, 1.15),
    'Linderos': (2.00, 1.00),
    'Santorum': (1.75, 0.90),
    'Solanda': (1.50, 0.75),
    'Moyococha': (1.50, 0.75),
    'Tumianuma': (1.00, 0.50),
    'Comunidades': (0.75, 0.40),
}

# La Elvira VUELTA intermedios (Mal→X)
ELVIRA_VUELTA_INTER_MAL = {
    'Mal→Cucan_E': ('Malacatos → Cucanama', 1.60, 0.80),
    'Mal→Lind_E': ('Malacatos → Linderos', 2.00, 1.00),
    'Mal→Santo_E': ('Malacatos → Santorum', 2.00, 1.00),
    'Mal→Solan_E': ('Malacatos → Solanda', 2.00, 1.00),
    'Mal→Moyoc_E': ('Malacatos → Moyococha', 2.00, 1.00),
    'Mal→Tumia_E': ('Malacatos → Tumianuma', 2.50, 1.25),
    'Mal→Quina_E': ('Malacatos → Quinara', 2.50, 1.25),
    'Mal→Comun_E': ('Malacatos → Comunidades', 2.50, 1.25),
    'Mal→Elvira_E': ('Malacatos → La Elvira', 3.00, 1.50),
}

# La Elvira VUELTA intermedios (Vilc→X)
ELVIRA_VUELTA_INTER_VILC = {
    'Vilc→Cucan_E': ('Vilcabamba → Cucanama', 0.75, 0.40),
    'Vilc→Lind_E': ('Vilcabamba → Linderos', 1.10, 0.55),
    'Vilc→Santo_E': ('Vilcabamba → Santorum', 1.50, 0.75),
    'Vilc→Solan_E': ('Vilcabamba → Solanda', 1.50, 0.75),
    'Vilc→Moyoc_E': ('Vilcabamba → Moyococha', 1.50, 0.75),
    'Vilc→Tumia_E': ('Vilcabamba → Tumianuma', 2.00, 1.00),
    'Vilc→Quina_E': ('Vilcabamba → Quinara', 2.00, 1.00),
    'Vilc→Comun_E': ('Vilcabamba → Comunidades', 2.00, 1.00),
    'Vilc→Elvira_E': ('Vilcabamba → La Elvira', 2.40, 1.20),
    'Vilc→Loja_E': ('Vilcabamba → Loja', 2.25, 1.15),
}


def build_direct_table(data_dict, title, subtitle=None, origin_label=None):
    """Build a table for direct prices."""
    elements = []
    
    # Title
    style_title = ParagraphStyle(
        'SectionTitle', fontName=FONT_B, fontSize=11, textColor=PRIMARY,
        spaceAfter=2, spaceBefore=10, leading=14
    )
    elements.append(Paragraph(title, style_title))
    
    if subtitle:
        style_sub = ParagraphStyle(
            'SubTitle', fontName=FONT, fontSize=8, textColor=colors.HexColor('#4a5568'),
            spaceAfter=4, leading=10
        )
        elements.append(Paragraph(subtitle, style_sub))
    
    # Header
    header = [
        Paragraph('<b>#</b>', ParagraphStyle('h', fontName=FONT_B, fontSize=7, textColor=HEADER_TEXT, alignment=1)),
        Paragraph('<b>Parada / Destino</b>', ParagraphStyle('h', fontName=FONT_B, fontSize=7, textColor=HEADER_TEXT)),
        Paragraph('<b>Normal</b>', ParagraphStyle('h', fontName=FONT_B, fontSize=7, textColor=HEADER_TEXT, alignment=2)),
        Paragraph('<b>Media Tarifa</b>', ParagraphStyle('h', fontName=FONT_B, fontSize=7, textColor=HEADER_TEXT, alignment=2)),
    ]
    
    rows = [header]
    for i, (parada, (normal, media)) in enumerate(data_dict.items(), 1):
        is_zero = normal == 0 and media == 0
        bg_color = ZERO_BG if is_zero else (ROW_EVEN if i % 2 == 0 else ROW_ODD)
        
        row = [
            Paragraph(str(i), ParagraphStyle('c', fontName=FONT, fontSize=7, alignment=1)),
            Paragraph(parada, ParagraphStyle('c', fontName=FONT, fontSize=7)),
            Paragraph(fmt(normal), ParagraphStyle('c', fontName=FONT, fontSize=7, alignment=2)),
            Paragraph(fmt(media), ParagraphStyle('c', fontName=FONT, fontSize=7, alignment=2)),
        ]
        rows.append(row)
    
    avail_w = PAGE_W - 2 * MARGIN
    col_widths = [avail_w * 0.06, avail_w * 0.54, avail_w * 0.20, avail_w * 0.20]
    
    t = Table(rows, colWidths=col_widths, repeatRows=1)
    
    style_cmds = [
        ('BACKGROUND', (0, 0), (-1, 0), HEADER_BG),
        ('TEXTCOLOR', (0, 0), (-1, 0), HEADER_TEXT),
        ('FONTSIZE', (0, 0), (-1, -1), 7),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 4),
        ('TOPPADDING', (0, 0), (-1, 0), 4),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 3),
        ('TOPPADDING', (0, 1), (-1, -1), 3),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e0')),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]
    
    # Alternating row colors
    for i, (parada, (normal, media)) in enumerate(data_dict.items(), 1):
        is_zero = normal == 0 and media == 0
        if is_zero:
            style_cmds.append(('BACKGROUND', (0, i), (-1, i), ZERO_BG))
        elif i % 2 == 0:
            style_cmds.append(('BACKGROUND', (0, i), (-1, i), ROW_EVEN))
    
    t.setStyle(TableStyle(style_cmds))
    elements.append(t)
    elements.append(Spacer(1, 6))
    return elements


def build_inter_table(data_dict, title, subtitle=None):
    """Build a table for intermediate prices. data_dict: {key: (display_name, normal, media)}."""
    elements = []
    
    style_title = ParagraphStyle(
        'InterTitle', fontName=FONT_B, fontSize=9, textColor=colors.HexColor('#744210'),
        spaceAfter=2, spaceBefore=6, leading=12
    )
    elements.append(Paragraph(title, style_title))
    
    if subtitle:
        style_sub = ParagraphStyle(
            'InterSub', fontName=FONT, fontSize=7, textColor=colors.HexColor('#975a16'),
            spaceAfter=3, leading=9
        )
        elements.append(Paragraph(subtitle, style_sub))
    
    header = [
        Paragraph('<b>#</b>', ParagraphStyle('h', fontName=FONT_B, fontSize=6.5, textColor=HEADER_TEXT, alignment=1)),
        Paragraph('<b>Tramo Intermedio</b>', ParagraphStyle('h', fontName=FONT_B, fontSize=6.5, textColor=HEADER_TEXT)),
        Paragraph('<b>Normal</b>', ParagraphStyle('h', fontName=FONT_B, fontSize=6.5, textColor=HEADER_TEXT, alignment=2)),
        Paragraph('<b>Media Tarifa</b>', ParagraphStyle('h', fontName=FONT_B, fontSize=6.5, textColor=HEADER_TEXT, alignment=2)),
    ]
    
    rows = [header]
    for i, (key, (display, normal, media)) in enumerate(data_dict.items(), 1):
        row = [
            Paragraph(str(i), ParagraphStyle('c', fontName=FONT, fontSize=6.5, alignment=1)),
            Paragraph(display, ParagraphStyle('c', fontName=FONT, fontSize=6.5)),
            Paragraph(fmt(normal), ParagraphStyle('c', fontName=FONT, fontSize=6.5, alignment=2)),
            Paragraph(fmt(media), ParagraphStyle('c', fontName=FONT, fontSize=6.5, alignment=2)),
        ]
        rows.append(row)
    
    avail_w = PAGE_W - 2 * MARGIN
    col_widths = [avail_w * 0.06, avail_w * 0.54, avail_w * 0.20, avail_w * 0.20]
    
    t = Table(rows, colWidths=col_widths, repeatRows=1)
    
    style_cmds = [
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#92400e')),
        ('TEXTCOLOR', (0, 0), (-1, 0), HEADER_TEXT),
        ('FONTSIZE', (0, 0), (-1, -1), 6.5),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 3),
        ('TOPPADDING', (0, 0), (-1, 0), 3),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 2),
        ('TOPPADDING', (0, 1), (-1, -1), 2),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#d69e2e')),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]
    
    for i in range(1, len(rows)):
        bg = INTERMEDIO_BG if i % 2 == 1 else colors.HexColor('#fefce8')
        style_cmds.append(('BACKGROUND', (0, i), (-1, i), bg))
    
    t.setStyle(TableStyle(style_cmds))
    elements.append(t)
    elements.append(Spacer(1, 4))
    return elements


def build_route_header(ruta_name, direction, color=SECTION_BG):
    """Build a route section header."""
    avail_w = PAGE_W - 2 * MARGIN
    
    style = ParagraphStyle(
        'RouteHeader', fontName=FONT_B, fontSize=13, textColor=HEADER_TEXT,
        alignment=1, spaceBefore=8, spaceAfter=4, leading=16
    )
    p = Paragraph(f'<b>{ruta_name}</b>', style)
    
    t = Table([[p]], colWidths=[avail_w])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), color),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
    ]))
    return t


def add_page_number(canvas, doc):
    """Add page number to footer."""
    canvas.saveState()
    canvas.setFont(FONT, 8)
    canvas.setFillColor(colors.HexColor('#718096'))
    page_num = canvas.getPageNumber()
    text = f"RutaGo - Tarifas Oficiales de Transporte  |  Pag. {page_num}"
    canvas.drawCentredString(PAGE_W / 2, 8 * mm, text)
    canvas.restoreState()


def main():
    doc = SimpleDocTemplate(
        OUTPUT_PATH,
        pagesize=landscape(A4),
        leftMargin=MARGIN,
        rightMargin=MARGIN,
        topMargin=15 * mm,
        bottomMargin=15 * mm,
        title='RutaGo - Tarifas Oficiales Completas',
        author='Transportes Vilcabbaturis Cia. Ltda.',
        subject='Tarifario oficial de todas las rutas',
    )
    
    story = []
    avail_w = PAGE_W - 2 * MARGIN
    
    # ═══ COVER ═══
    cover_title = ParagraphStyle(
        'CoverTitle', fontName=FONT_B, fontSize=28, textColor=PRIMARY,
        alignment=1, spaceAfter=8, leading=34
    )
    cover_sub = ParagraphStyle(
        'CoverSub', fontName=FONT, fontSize=14, textColor=SECONDARY,
        alignment=1, spaceAfter=4, leading=18
    )
    cover_info = ParagraphStyle(
        'CoverInfo', fontName=FONT, fontSize=10, textColor=colors.HexColor('#718096'),
        alignment=1, spaceAfter=3, leading=13
    )
    
    story.append(Spacer(1, 60))
    story.append(Paragraph('<b>RUTAGO</b>', cover_title))
    story.append(Paragraph('Tarifas Oficiales de Transporte', cover_sub))
    story.append(Spacer(1, 15))
    story.append(Paragraph('TRANSPORTES VILCABBATURIS CIA. LTDA.', ParagraphStyle(
        'Co', fontName=FONT_B, fontSize=11, textColor=ACCENT, alignment=1, leading=14
    )))
    story.append(Spacer(1, 30))
    
    # Summary box
    legend_data = [
        [Paragraph('<b>Rutas Incluidas</b>', ParagraphStyle('l', fontName=FONT_B, fontSize=9, textColor=PRIMARY)),
         Paragraph('<b>Tipo de Tarifa</b>', ParagraphStyle('l', fontName=FONT_B, fontSize=9, textColor=PRIMARY))],
        [Paragraph('Loja - Vilcabamba (Troncal)', ParagraphStyle('l', fontName=FONT, fontSize=8)),
         Paragraph('Normal: pasaje entero', ParagraphStyle('l', fontName=FONT, fontSize=8))],
        [Paragraph('Loja - El Tambo', ParagraphStyle('l', fontName=FONT, fontSize=8)),
         Paragraph('Media tarifa: medio pasaje', ParagraphStyle('l', fontName=FONT, fontSize=8))],
        [Paragraph('Loja - Zahuayco', ParagraphStyle('l', fontName=FONT, fontSize=8)),
         Paragraph('(ninos, tercera edad, discapacidad)', ParagraphStyle('l', fontName=FONT, fontSize=8))],
        [Paragraph('Loja - La Elvira', ParagraphStyle('l', fontName=FONT, fontSize=8)),
         Paragraph('', ParagraphStyle('l', fontName=FONT, fontSize=8))],
        [Paragraph('Loja - Yangana', ParagraphStyle('l', fontName=FONT, fontSize=8)),
         Paragraph('', ParagraphStyle('l', fontName=FONT, fontSize=8))],
    ]
    legend_t = Table(legend_data, colWidths=[avail_w * 0.50, avail_w * 0.50])
    legend_t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), TRONCAL_BG),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e0')),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    story.append(legend_t)
    story.append(Spacer(1, 20))
    
    note_style = ParagraphStyle('note', fontName=FONT, fontSize=8, textColor=colors.HexColor('#718096'), alignment=1, leading=11)
    story.append(Paragraph('Troncal Loja-Vilcabamba: compartida por rutas Zahuayco, La Elvira y Yangana', note_style))
    story.append(Paragraph('El Tambo: ramifica en Malacatos (NO pasa por Vilcabamba)', note_style))
    story.append(Paragraph('Actualizado: Agosto 2026', note_style))
    
    story.append(PageBreak())
    
    # ═══ SECCION 1: IDA ═══
    story.append(build_route_header('PRECIOS IDA (Desde Loja Hacia el Destino)', ''))
    story.append(Spacer(1, 4))
    
    # 1.1 Troncal IDA
    story.append(build_route_header('1. TRONCAL LOJA - VILCABAMBA (Compartida: Zahuayco, La Elvira, Yangana)', '', SUBSECTION_BG))
    story.extend(build_direct_table(TRONCAL_IDA,
        'Directos: Loja → Parada Troncal',
        'Precios desde Loja hasta cada parada de la troncal Loja-Vilcabamba'))
    
    story.extend(build_inter_table(INTER_TRONCAL_IDA_X_MAL,
        'Intermedios Troncal: Parada → Malacatos',
        'Precios desde cada parada intermedia hasta Malacatos (sube al bus en parada intermedia)'))
    
    story.extend(build_inter_table(INTER_TRONCAL_IDA_X_VILC,
        'Intermedios Troncal: Parada → Vilcabamba',
        'Precios desde cada parada intermedia hasta Vilcabamba (sube al bus en parada intermedia)'))
    
    # 1.2 El Tambo IDA
    story.append(build_route_header('2. LOJA - EL TAMBO (Ramifica en Malacatos, NO pasa Vilcabamba)', '', colors.HexColor('#c53030')))
    story.extend(build_direct_table(ELTAMBO_IDA,
        'Directos: Loja → Parada El Tambo',
        'Precios desde Loja hasta cada parada del ramal El Tambo'))
    
    story.extend(build_inter_table(ELTAMBO_INTER_MAL,
        'Intermedios El Tambo: Malacatos → Parada',
        'Precios desde Malacatos hasta cada parada del ramal El Tambo'))
    
    story.extend(build_inter_table(ELTAMBO_INTER_TRONCAL,
        'Intermedios El Tambo: Parada Troncal → El Tambo',
        'Precios desde paradas de la troncal hasta El Tambo'))
    
    # 1.3 Zahuayco IDA
    story.append(build_route_header('3. LOJA - ZAHUAYCO (Pasa por Vilcabamba)', '', colors.HexColor('#2b6cb0')))
    story.extend(build_direct_table(ZAHUAYCO_IDA,
        'Directos: Loja → Parada Zahuayco',
        'Precios desde Loja hasta cada parada del ramal Zahuayco'))
    
    story.extend(build_inter_table(ZAHUAYCO_INTER_VILC,
        'Intermedios Zahuayco: Vilcabamba → Parada',
        'Precios desde Vilcabamba hacia Zahuayco'))
    
    story.extend(build_inter_table(ZAHUAYCO_INTER_MAL,
        'Intermedios Zahuayco: Malacatos → Parada',
        'Precios desde Malacatos hacia Zahuayco'))
    
    # 1.4 La Elvira IDA
    story.append(build_route_header('4. LOJA - LA ELVIRA (Pasa por Vilcabamba)', '', colors.HexColor('#6b46c1')))
    story.extend(build_direct_table(ELVIRA_IDA,
        'Directos: Loja → Parada La Elvira',
        'Precios desde Loja hasta cada parada del ramal La Elvira'))
    
    story.extend(build_inter_table(ELVIRA_INTER_MAL,
        'Intermedios La Elvira: Malacatos → Parada',
        'Precios desde Malacatos hacia La Elvira'))
    
    story.extend(build_inter_table(ELVIRA_INTER_VILC,
        'Intermedios La Elvira: Vilcabamba → Parada',
        'Precios desde Vilcabamba hacia La Elvira'))
    
    # 1.5 Yangana IDA
    story.append(build_route_header('5. LOJA - YANGANA (Pasa por Vilcabamba)', '', colors.HexColor('#276749')))
    story.extend(build_direct_table(YANGANA_IDA,
        'Directos: Loja → Parada Yangana',
        'Precios desde Loja hasta cada parada del ramal Yangana'))
    
    yangana_ida_inter = {**YANGANA_INTER_VILC, **YANGANA_INTER_MAL}
    story.extend(build_inter_table(yangana_ida_inter,
        'Intermedios Yangana: Vilcabamba/Malacatos → Parada',
        'Precios desde Vilcabamba y Malacatos hacia Yangana'))
    
    # ═══ SECCION 2: VUELTA ═══
    story.append(PageBreak())
    story.append(build_route_header('PRECIOS VUELTA (Desde el Destino Hacia Loja)', ''))
    story.append(Spacer(1, 4))
    
    # 2.1 Troncal VUELTA
    story.append(build_route_header('6. TRONCAL VILCABAMBA - LOJA (Compartida: Zahuayco, La Elvira, Yangana)', '', SUBSECTION_BG))
    story.extend(build_direct_table(TRONCAL_VUELTA,
        'Directos: Vilcabamba → Parada Troncal',
        'Precios desde Vilcabamba hasta cada parada de la troncal hacia Loja'))
    
    story.extend(build_inter_table(INTER_VUELTA_MAL,
        'Intermedios Troncal Vuelta: Malacatos → Parada',
        'Precios desde Malacatos hacia cada parada de la troncal (hacia Loja)'))
    
    story.extend(build_inter_table(INTER_VUELTA_X_LOJA,
        'Intermedios Troncal Vuelta: Parada → Loja',
        'Precios desde cada parada intermedia directamente hasta Loja'))
    
    # 2.2 Vilcabamba VUELTA
    story.append(build_route_header('7. VILCABAMBA - LOJA', '', colors.HexColor('#2c5282')))
    story.extend(build_direct_table(VILCABAMBA_VUELTA,
        'Directos: Vilcabamba → Parada',
        'Precios desde Vilcabamba hacia cada parada hasta Loja'))
    
    # 2.3 El Tambo VUELTA
    story.append(build_route_header('8. EL TAMBO - LOJA', '', colors.HexColor('#c53030')))
    story.extend(build_direct_table(ELTAMBO_VUELTA,
        'Directos: El Tambo → Parada',
        'Precios desde El Tambo hacia cada parada hasta Loja'))
    
    # 2.4 Zahuayco VUELTA
    story.append(build_route_header('9. ZAHUAYCO - LOJA', '', colors.HexColor('#2b6cb0')))
    story.extend(build_direct_table(ZAHUAYCO_VUELTA,
        'Directos: Zahuayco → Parada',
        'Precios desde Zahuayco hacia cada parada hasta Loja'))
    
    story.extend(build_inter_table(ZAHUAYCO_VUELTA_INTER,
        'Intermedios Zahuayco Vuelta: Ramal',
        'Precios intermedios del ramal Zahuayco en direccion vuelta'))
    
    # 2.5 La Elvira VUELTA
    story.append(build_route_header('10. LA ELVIRA - LOJA', '', colors.HexColor('#6b46c1')))
    story.extend(build_direct_table(ELVIRA_VUELTA,
        'Directos: La Elvira → Parada',
        'Precios desde La Elvira hacia cada parada hasta Loja'))
    
    story.extend(build_inter_table(ELVIRA_VUELTA_INTER_MAL,
        'Intermedios La Elvira Vuelta: Malacatos → Parada',
        'Precios desde Malacatos hacia paradas del ramal La Elvira'))
    
    story.extend(build_inter_table(ELVIRA_VUELTA_INTER_VILC,
        'Intermedios La Elvira Vuelta: Vilcabamba → Parada',
        'Precios desde Vilcabamba hacia paradas del ramal La Elvira (incluye Vilc→Loja $2.25)'))
    
    # 2.6 Yangana VUELTA
    story.append(build_route_header('11. YANGANA - LOJA', '', colors.HexColor('#276749')))
    story.extend(build_direct_table(YANGANA_VUELTA,
        'Directos: Yangana → Parada',
        'Precios desde Yangana hacia cada parada hasta Loja'))
    
    story.extend(build_inter_table(YANGANA_VUELTA_INTER,
        'Intermedios Yangana Vuelta: Ramal',
        'Precios intermedios del ramal Yangana en direccion vuelta'))
    
    # Build PDF
    doc.build(story, onFirstPage=add_page_number, onLaterPages=add_page_number)
    print(f'PDF generado: {OUTPUT_PATH}')
    
    # Check file size
    size = os.path.getsize(OUTPUT_PATH)
    print(f'Tamano: {size / 1024:.1f} KB')


if __name__ == '__main__':
    main()
