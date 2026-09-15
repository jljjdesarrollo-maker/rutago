#!/usr/bin/env python3
"""Genera PDF de tarifas Loja → La Elvira con 3 secciones coloreadas:
1. Precios directos desde Loja (cascada verde/amarillo/azul)
2. Intermedios desde Malacatos (naranja/teal)
3. Intermedios desde Vilcabamba (violeta/púrpura)
"""

from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch, mm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle,
    Paragraph, Spacer, KeepTogether
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import os

# ─── Fuentes ───
font_dir = '/usr/share/fonts/truetype/'
pdfmetrics.registerFont(TTFont('NotoSerifSC', os.path.join(font_dir, 'noto-serif-sc/NotoSerifSC-Regular.ttf')))
pdfmetrics.registerFont(TTFont('NotoSerifSC-Bold', os.path.join(font_dir, 'noto-serif-sc/NotoSerifSC-Bold.ttf')))

FONT = 'NotoSerifSC'
FONT_BOLD = 'NotoSerifSC-Bold'

# ─── Colores ───
# Zona Loja (verde)
C_GREEN_BG = colors.HexColor('#E8F5E9')
C_GREEN_TXT = colors.HexColor('#1B5E20')
C_GREEN_PRICE = colors.HexColor('#2E7D32')
# Zona media (amarillo)
C_YELLOW_BG = colors.HexColor('#FFF8E1')
C_YELLOW_TXT = colors.HexColor('#F57F17')
C_YELLOW_PRICE = colors.HexColor('#F9A825')
# Zona Vilcabamba/destino (azul)
C_BLUE_BG = colors.HexColor('#E3F2FD')
C_BLUE_TXT = colors.HexColor('#0D47A1')
C_BLUE_PRICE = colors.HexColor('#1565C0')

# Intermedios Malacatos (teal/naranja)
C_MAL_BG = colors.HexColor('#FFF3E0')
C_MAL_HDR = colors.HexColor('#E65100')
C_MAL_PRICE = colors.HexColor('#EF6C00')
C_MAL_ROW1 = colors.HexColor('#FFF8E1')
C_MAL_ROW2 = colors.HexColor('#FFF3E0')

# Intermedios Vilcabamba (violeta/púrpura)
C_VILC_BG = colors.HexColor('#F3E5F5')
C_VILC_HDR = colors.HexColor('#6A1B9A')
C_VILC_PRICE = colors.HexColor('#8E24AA')
C_VILC_ROW1 = colors.HexColor('#FCE4EC')
C_VILC_ROW2 = colors.HexColor('#F3E5F5')

# General
C_WHITE = colors.white
C_DARK = colors.HexColor('#212121')
C_LINE = colors.HexColor('#BDBDBD')
C_HEADER_BG = colors.HexColor('#263238')
C_ACCENT = colors.HexColor('#FF6F00')

# ─── Datos ───
# Precios directos desde Loja
precios_directos = [
    ('Loja',             0.00,  0.00,  'green'),
    ('Dos Puentes',      0.75,  0.40,  'green'),
    ('Cajánuma',         1.25,  0.65,  'green'),
    ('Pueblo Nuevo',     1.25,  0.65,  'green'),
    ('Tres Leguas',      1.25,  0.65,  'green'),
    ('Rumizhitana',      1.25,  0.65,  'green'),
    ('Yamba',            1.25,  0.65,  'green'),
    ('Granadillo',       1.40,  0.70,  'yellow'),
    ('Porvenir',         1.40,  0.70,  'yellow'),
    ('Nangora',          1.50,  0.75,  'yellow'),
    ('Chorrillos',       1.50,  0.75,  'yellow'),
    ('Landangui',        1.75,  0.90,  'yellow'),
    ('La Peña',          1.75,  0.90,  'yellow'),
    ('Malacatos',        2.00,  1.00,  'yellow'),
    ('Taxiche',          2.00,  1.00,  'yellow'),
    ('Cavianga',         2.25,  1.15,  'blue'),
    ('Cararango',        2.25,  1.15,  'blue'),
    ('San Pedro',        2.25,  1.15,  'blue'),
    ('Vilcabamba',       2.50,  1.25,  'blue'),
    ('Cucanama',         2.50,  1.25,  'blue'),
    ('Linderos',         2.75,  1.40,  'blue'),
    ('Santorum',         3.00,  1.50,  'blue'),
    ('Solanda',          3.00,  1.50,  'blue'),
    ('Moyococha',        3.00,  1.50,  'blue'),
    ('Tumianuma',        3.25,  1.65,  'blue'),
    ('Quinara',          3.25,  1.65,  'blue'),
    ('Comunidades',      3.50,  1.75,  'blue'),
    ('La Elvira',        3.75,  1.90,  'blue'),
]

# Intermedios desde Malacatos
intermedios_mal = [
    ('Cucanama',    1.60,  0.80),
    ('Linderos',    2.00,  1.00),
    ('Santorum',    2.00,  1.00),
    ('Solanda',     2.00,  1.00),
    ('Moyococha',   2.00,  1.00),
    ('Tumianuma',   2.50,  1.25),
    ('Quinara',     2.50,  1.25),
    ('Comunidades', 2.50,  1.25),
    ('La Elvira',   3.00,  1.50),
]

# Intermedios desde Vilcabamba
intermedios_vilc = [
    ('Cucanama',    0.75,  0.40),
    ('Linderos',    1.10,  0.55),
    ('Santorum',    1.50,  0.65),
    ('Solanda',     1.50,  0.65),
    ('Moyococha',   1.50,  0.65),
    ('Tumianuma',   2.00,  1.00),
    ('Quinara',     2.00,  1.00),
    ('Comunidades', 2.00,  1.00),
    ('La Elvira',   2.40,  1.20),
]

# ─── Helpers ───
ZONE_MAP = {
    'green':  (C_GREEN_BG,  C_GREEN_TXT,  C_GREEN_PRICE),
    'yellow': (C_YELLOW_BG, C_YELLOW_TXT, C_YELLOW_PRICE),
    'blue':   (C_BLUE_BG,   C_BLUE_TXT,   C_BLUE_PRICE),
}

def styled_cell(text, font=FONT, size=8, color=C_DARK, bold=False):
    f = FONT_BOLD if bold else font
    return Paragraph(f'<font name="{f}" size="{size}" color="{color.hexval()}">{text}</font>',
                     ParagraphStyle('cell', fontName=f, fontSize=size, textColor=color,
                                     leading=size+3, alignment=0))

def price_cell(val, color, size=9, bold=True):
    f = FONT_BOLD if bold else FONT
    return Paragraph(f'<font name="{f}" size="{size}" color="{color.hexval()}">${val:.2f}</font>',
                     ParagraphStyle('price', fontName=f, fontSize=size, textColor=color,
                                     leading=size+3, alignment=1))

# ─── Build PDF ───
output_path = '/home/z/my-project/download/Tarifas_Loja_LaElvira_Completo.pdf'
os.makedirs(os.path.dirname(output_path), exist_ok=True)

doc = SimpleDocTemplate(
    output_path,
    pagesize=letter,
    leftMargin=0.6*inch, rightMargin=0.6*inch,
    topMargin=0.5*inch, bottomMargin=0.5*inch,
)

story = []
W = doc.width

# ══════════════════════════════════════════
# TÍTULO
# ══════════════════════════════════════════
title_style = ParagraphStyle('title', fontName=FONT_BOLD, fontSize=16, textColor=C_DARK,
                            leading=20, alignment=0, spaceAfter=2)
sub_style = ParagraphStyle('sub', fontName=FONT, fontSize=9, textColor=colors.HexColor('#616161'),
                           leading=12, alignment=0, spaceAfter=6)
story.append(Paragraph('TARIFAS LOJA - LA ELVIRA', title_style))
story.append(Paragraph('Transportes Vilcabambaturis Cía. Ltda.  |  Precios desde Loja (IDA)', sub_style))
story.append(Spacer(1, 4))

# ══════════════════════════════════════════
# SECCIÓN 1: PRECIOS DIRECTOS
# ══════════════════════════════════════════
sec_style = ParagraphStyle('sec', fontName=FONT_BOLD, fontSize=11, textColor=C_ACCENT,
                           leading=14, alignment=0, spaceBefore=6, spaceAfter=4)
story.append(Paragraph('1. PRECIOS DIRECTOS  (desde Loja)', sec_style))

# Header
header_data = [[
    styled_cell('#', size=7, color=C_WHITE, bold=True),
    styled_cell('PARADA', size=7, color=C_WHITE, bold=True),
    styled_cell('NORMAL', size=7, color=C_WHITE, bold=True),
    styled_cell('MEDIA', size=7, color=C_WHITE, bold=True),
]]

rows = list(header_data)
for i, (parada, normal, media, zona) in enumerate(precios_directos):
    bg, txt, prc = ZONE_MAP[zona]
    n = f'${normal:.2f}' if normal > 0 else '—'
    m = f'${media:.2f}' if media > 0 else '—'
    rows.append([
        styled_cell(str(i+1), size=7, color=txt),
        styled_cell(parada, size=8, color=txt, bold=(parada in ('Loja','Malacatos','Vilcabamba','La Elvira'))),
        price_cell(normal if normal > 0 else 0, prc, size=8, bold=True) if normal > 0 else styled_cell('—', size=8, color=txt, bold=True),
        price_cell(media if media > 0 else 0, prc, size=8, bold=False) if media > 0 else styled_cell('—', size=8, color=txt),
    ])

col_widths = [0.35*inch, W - 0.35*inch - 1.3*inch - 1.1*inch, 1.3*inch, 1.1*inch]
tbl = Table(rows, colWidths=col_widths, repeatRows=1)

style_cmds = [
    ('BACKGROUND', (0, 0), (-1, 0), C_HEADER_BG),
    ('TEXTCOLOR', (0, 0), (-1, 0), C_WHITE),
    ('ALIGN', (0, 0), (0, -1), 'CENTER'),
    ('ALIGN', (2, 0), (-1, -1), 'CENTER'),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('GRID', (0, 0), (-1, -1), 0.4, C_LINE),
    ('TOPPADDING', (0, 0), (-1, -1), 3),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ('LEFTPADDING', (0, 0), (0, -1), 4),
    ('RIGHTPADDING', (-2, 0), (-1, -1), 4),
]

# Zone row colors
for i, (parada, normal, media, zona) in enumerate(precios_directos):
    bg, txt, prc = ZONE_MAP[zona]
    row_idx = i + 1
    style_cmds.append(('BACKGROUND', (0, row_idx), (0, row_idx), bg))
    style_cmds.append(('BACKGROUND', (1, row_idx), (1, row_idx), bg))
    style_cmds.append(('BACKGROUND', (2, row_idx), (2, row_idx), bg))
    style_cmds.append(('BACKGROUND', (3, row_idx), (3, row_idx), bg))

tbl.setStyle(TableStyle(style_cmds))
story.append(tbl)
story.append(Spacer(1, 12))

# ══════════════════════════════════════════
# SECCIÓN 2: INTERMEDIOS DESDE MALACATOS
# ══════════════════════════════════════════
sec2_style = ParagraphStyle('sec2', fontName=FONT_BOLD, fontSize=11, textColor=C_MAL_HDR,
                            leading=14, alignment=0, spaceBefore=6, spaceAfter=4)
story.append(Paragraph('2. INTERMEDIOS DESDE MALACATOS', sec2_style))
story.append(Paragraph('Para pasajeros que suben en Malacatos con destino a La Elvira',
                       ParagraphStyle('sub2', fontName=FONT, fontSize=8, textColor=colors.HexColor('#795548'),
                                      leading=10, spaceAfter=4)))

header_mal = [[
    styled_cell('#', size=7, color=C_WHITE, bold=True),
    styled_cell('DESTINO', size=7, color=C_WHITE, bold=True),
    styled_cell('NORMAL', size=7, color=C_WHITE, bold=True),
    styled_cell('MEDIA', size=7, color=C_WHITE, bold=True),
]]

rows_mal = list(header_mal)
for i, (dest, normal, media) in enumerate(intermedios_mal):
    row_bg = C_MAL_ROW1 if i % 2 == 0 else C_MAL_ROW2
    rows_mal.append([
        styled_cell(str(i+1), size=7, color=C_MAL_HDR),
        styled_cell(dest, size=8, color=C_DARK, bold=(dest == 'La Elvira')),
        price_cell(normal, C_MAL_PRICE, size=9, bold=True),
        price_cell(media, C_MAL_PRICE, size=9, bold=False),
    ])

tbl_mal = Table(rows_mal, colWidths=col_widths, repeatRows=1)
style_mal = [
    ('BACKGROUND', (0, 0), (-1, 0), C_MAL_HDR),
    ('TEXTCOLOR', (0, 0), (-1, 0), C_WHITE),
    ('ALIGN', (0, 0), (0, -1), 'CENTER'),
    ('ALIGN', (2, 0), (-1, -1), 'CENTER'),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('GRID', (0, 0), (-1, -1), 0.4, colors.HexColor('#FFCC80')),
    ('TOPPADDING', (0, 0), (-1, -1), 3),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ('LEFTPADDING', (0, 0), (0, -1), 4),
    ('RIGHTPADDING', (-2, 0), (-1, -1), 4),
]
for i in range(len(intermedios_mal)):
    row_bg = C_MAL_ROW1 if i % 2 == 0 else C_MAL_ROW2
    style_mal.append(('BACKGROUND', (0, i+1), (-1, i+1), row_bg))

# Highlight last row (La Elvira)
style_mal.append(('BACKGROUND', (0, len(intermedios_mal)), (-1, len(intermedios_mal)), C_MAL_HDR))
style_mal.append(('TEXTCOLOR', (0, len(intermedios_mal)), (-1, len(intermedios_mal)), C_WHITE))

tbl_mal.setStyle(TableStyle(style_mal))
story.append(tbl_mal)
story.append(Spacer(1, 12))

# ══════════════════════════════════════════
# SECCIÓN 3: INTERMEDIOS DESDE VILCABAMBA
# ══════════════════════════════════════════
sec3_style = ParagraphStyle('sec3', fontName=FONT_BOLD, fontSize=11, textColor=C_VILC_HDR,
                            leading=14, alignment=0, spaceBefore=6, spaceAfter=4)
story.append(Paragraph('3. INTERMEDIOS DESDE VILCABAMBA', sec3_style))
story.append(Paragraph('Para pasajeros que suben en Vilcabamba con destino a La Elvira',
                       ParagraphStyle('sub3', fontName=FONT, fontSize=8, textColor=colors.HexColor('#6A1B9A'),
                                      leading=10, spaceAfter=4)))

header_vilc = [[
    styled_cell('#', size=7, color=C_WHITE, bold=True),
    styled_cell('DESTINO', size=7, color=C_WHITE, bold=True),
    styled_cell('NORMAL', size=7, color=C_WHITE, bold=True),
    styled_cell('MEDIA', size=7, color=C_WHITE, bold=True),
]]

rows_vilc = list(header_vilc)
for i, (dest, normal, media) in enumerate(intermedios_vilc):
    rows_vilc.append([
        styled_cell(str(i+1), size=7, color=C_VILC_HDR),
        styled_cell(dest, size=8, color=C_DARK, bold=(dest == 'La Elvira')),
        price_cell(normal, C_VILC_PRICE, size=9, bold=True),
        price_cell(media, C_VILC_PRICE, size=9, bold=False),
    ])

tbl_vilc = Table(rows_vilc, colWidths=col_widths, repeatRows=1)
style_vilc = [
    ('BACKGROUND', (0, 0), (-1, 0), C_VILC_HDR),
    ('TEXTCOLOR', (0, 0), (-1, 0), C_WHITE),
    ('ALIGN', (0, 0), (0, -1), 'CENTER'),
    ('ALIGN', (2, 0), (-1, -1), 'CENTER'),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('GRID', (0, 0), (-1, -1), 0.4, colors.HexColor('#CE93D8')),
    ('TOPPADDING', (0, 0), (-1, -1), 3),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ('LEFTPADDING', (0, 0), (0, -1), 4),
    ('RIGHTPADDING', (-2, 0), (-1, -1), 4),
]
for i in range(len(intermedios_vilc)):
    row_bg = C_VILC_ROW1 if i % 2 == 0 else C_VILC_ROW2
    style_vilc.append(('BACKGROUND', (0, i+1), (-1, i+1), row_bg))

# Highlight last row (La Elvira)
style_vilc.append(('BACKGROUND', (0, len(intermedios_vilc)), (-1, len(intermedios_vilc)), C_VILC_HDR))
style_vilc.append(('TEXTCOLOR', (0, len(intermedios_vilc)), (-1, len(intermedios_vilc)), C_WHITE))

tbl_vilc.setStyle(TableStyle(style_vilc))
story.append(tbl_vilc)

# ══════════════════════════════════════════
# LEYENDA
# ══════════════════════════════════════════
story.append(Spacer(1, 14))
legend_style = ParagraphStyle('legend', fontName=FONT, fontSize=7, textColor=colors.HexColor('#757575'),
                               leading=10, alignment=0)
story.append(Paragraph('LEYENDA DE ZONAS (precios directos):',
                       ParagraphStyle('legtitle', fontName=FONT_BOLD, fontSize=7, textColor=C_DARK, leading=10)))
story.append(Paragraph(
    '<font color="#1B5E20">■</font> Zona Loja (verde)  '
    '<font color="#F57F17">■</font> Zona media (amarillo)  '
    '<font color="#0D47A1">■</font> Zona Vilcabamba/La Elvira (azul)  '
    '<font color="#E65100">■</font> Intermedios desde Malacatos  '
    '<font color="#6A1B9A">■</font> Intermedios desde Vilcabamba',
    legend_style))

# Build
doc.build(story)
print(f'PDF generado: {output_path}')
