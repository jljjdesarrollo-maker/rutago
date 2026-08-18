#!/usr/bin/env python3
"""Genera PDF plantilla de RETORNO: La Elvira → Loja
con 2 columnas vacías (Normal / Media) para llenar manualmente.
3 secciones con colores diferenciados:
1. Directos: La Elvira → Loja (todos los tramos)
2. Intermedios: La Elvira → Malacatos
3. Intermedios: La Elvira → Vilcabamba
"""

from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
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
C_HEADER_BG = colors.HexColor('#263238')
C_DARK = colors.HexColor('#212121')
C_LINE = colors.HexColor('#BDBDBD')
C_WHITE = colors.white
C_ACCENT = colors.HexColor('#FF6F00')
C_EMPTY_BG = colors.HexColor('#FAFAFA')
C_EMPTY_BORDER = colors.HexColor('#E0E0E0')

# Zona Elvira (rojo suave para retorno)
C_ELVIRA_BG = colors.HexColor('#FFEBEE')
C_ELVIRA_TXT = colors.HexColor('#B71C1C')
C_ELVIRA_LINE = colors.HexColor('#EF9A9A')

# Intermedios Elvira→Malacatos (teal)
C_EMAL_HDR = colors.HexColor('#00695C')
C_EMAL_ROW1 = colors.HexColor('#E0F2F1')
C_EMAL_ROW2 = colors.HexColor('#B2DFDB')
C_EMAL_LINE = colors.HexColor('#80CBC4')

# Intermedios Elvira→Vilcabamba (indigo)
C_EVILC_HDR = colors.HexColor('#283593')
C_EVILC_ROW1 = colors.HexColor('#E8EAF6')
C_EVILC_ROW2 = colors.HexColor('#C5CAE9')
C_EVILC_LINE = colors.HexColor('#9FA8DA')

# ─── Datos (orden retorno La Elvira → Loja) ───
# Sección 1: Directos La Elvira → Loja
directos_retorno = [
    ('La Elvira',   'elvira'),
    ('Comunidades', 'elvira'),
    ('Quinara',     'elvira'),
    ('Tumianuma',   'elvira'),
    ('Moyococha',   'elvira'),
    ('Solanda',     'elvira'),
    ('Santorum',    'elvira'),
    ('Linderos',    'elvira'),
    ('Cucanama',    'elvira'),
    ('Vilcabamba',  'elvira'),
    ('San Pedro',   'troncal'),
    ('Cararango',   'troncal'),
    ('Cavianga',    'troncal'),
    ('Taxiche',     'troncal'),
    ('Malacatos',   'troncal'),
    ('La Peña',     'troncal'),
    ('Landangui',   'troncal'),
    ('Chorrillos',  'troncal'),
    ('Nangora',     'troncal'),
    ('Porvenir',    'troncal'),
    ('Granadillo',  'troncal'),
    ('Yamba',       'troncal'),
    ('Rumizhitana', 'troncal'),
    ('Tres Leguas', 'troncal'),
    ('Pueblo Nuevo','troncal'),
    ('Cajánuma',    'troncal'),
    ('Dos Puentes', 'troncal'),
    ('Capulí',      'troncal'),
]

# Sección 2: Intermedios La Elvira → Malacatos (pasajeros suben en segmento Elvira, bajan en Malacatos)
intermedios_emal = [
    ('Cucanama',    'emal'),
    ('Linderos',    'emal'),
    ('Santorum',    'emal'),
    ('Solanda',     'emal'),
    ('Moyococha',   'emal'),
    ('Tumianuma',   'emal'),
    ('Quinara',     'emal'),
    ('Comunidades', 'emal'),
    ('Malacatos',   'emal'),
]

# Sección 3: Intermedios La Elvira → Vilcabamba
intermedios_evilc = [
    ('Cucanama',    'evilc'),
    ('Linderos',    'evilc'),
    ('Santorum',    'evilc'),
    ('Solanda',     'evilc'),
    ('Moyococha',   'evilc'),
    ('Tumianuma',   'evilc'),
    ('Quinara',     'evilc'),
    ('Comunidades', 'evilc'),
    ('Vilcabamba',  'evilc'),
]

# ─── Helpers ───
ROW_STYLES = {
    'elvira':  (C_ELVIRA_BG, C_ELVIRA_TXT, C_ELVIRA_LINE),
    'troncal': (C_EMPTY_BG, C_DARK, C_LINE),
    'emal':    (C_EMAL_ROW1, C_DARK, C_EMAL_LINE),
    'evilc':   (C_EVILC_ROW1, C_DARK, C_EVILC_LINE),
}

def cell(text, font=FONT, size=8, color=C_DARK, bold=False, align=0):
    f = FONT_BOLD if bold else font
    s = ParagraphStyle('c', fontName=f, fontSize=size, textColor=color, leading=size+4, alignment=align)
    return Paragraph(f'<font name="{f}" size="{size}" color="{color.hexval()}">{text}</font>', s)

def empty_cell(bg=C_EMPTY_BG):
    """Celda vacía con fondo suave para llenar a mano"""
    s = ParagraphStyle('empty', fontName=FONT, fontSize=9, textColor=colors.HexColor('#BDBDBD'),
                       leading=13, alignment=1)
    return Paragraph('_____________', s)

def build_section(title, subtitle, stops, header_color, row_colors, grid_color, dest_label='DESTINO'):
    """Build a table section with empty price columns"""
    elements = []
    sec_s = ParagraphStyle('sec', fontName=FONT_BOLD, fontSize=11, textColor=header_color,
                           leading=14, alignment=0, spaceBefore=8, spaceAfter=2)
    sub_s = ParagraphStyle('sub', fontName=FONT, fontSize=8, textColor=colors.HexColor('#757575'),
                           leading=10, alignment=0, spaceAfter=4)
    elements.append(Paragraph(title, sec_s))
    elements.append(Paragraph(subtitle, sub_s))

    rows = [[
        cell('#', size=7, color=C_WHITE, bold=True),
        cell(dest_label, size=7, color=C_WHITE, bold=True),
        cell('NORMAL', size=7, color=C_WHITE, bold=True, align=1),
        cell('MEDIA', size=7, color=C_WHITE, bold=True, align=1),
    ]]

    for i, (stop, zone) in enumerate(stops):
        bg, txt, ln = ROW_STYLES[zone]
        is_dest = stop in ('Malacatos', 'Vilcabamba', 'Loja', 'La Elvira')
        # Alternate row shade for emal/evilc
        if zone == 'emal':
            bg = C_EMAL_ROW1 if i % 2 == 0 else C_EMAL_ROW2
        elif zone == 'evilc':
            bg = C_EVILC_ROW1 if i % 2 == 0 else C_EVILC_ROW2

        rows.append([
            cell(str(i+1), size=7, color=txt),
            cell(stop, size=8, color=txt, bold=is_dest),
            empty_cell(bg),
            empty_cell(bg),
        ])

    W_total = 7.3 * inch  # approx usable width
    col_w = [0.35*inch, W_total - 0.35*inch - 1.5*inch - 1.3*inch, 1.5*inch, 1.3*inch]
    tbl = Table(rows, colWidths=col_w, repeatRows=1)

    style_cmds = [
        ('BACKGROUND', (0, 0), (-1, 0), header_color),
        ('TEXTCOLOR', (0, 0), (-1, 0), C_WHITE),
        ('ALIGN', (0, 0), (0, -1), 'CENTER'),
        ('ALIGN', (2, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, grid_color),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
    ]

    for i, (stop, zone) in enumerate(stops):
        bg, txt, ln = ROW_STYLES[zone]
        if zone == 'emal':
            bg = C_EMAL_ROW1 if i % 2 == 0 else C_EMAL_ROW2
        elif zone == 'evilc':
            bg = C_EVILC_ROW1 if i % 2 == 0 else C_EVILC_ROW2
        style_cmds.append(('BACKGROUND', (0, i+1), (1, i+1), bg))
        style_cmds.append(('BACKGROUND', (2, i+1), (-1, i+1), colors.HexColor('#FFFFFF')))

    # Highlight origin row
    style_cmds.append(('BACKGROUND', (0, 1), (-1, 1), header_color))
    style_cmds.append(('TEXTCOLOR', (0, 1), (-1, 1), C_WHITE))

    # Highlight destination row (last)
    last = len(stops)
    style_cmds.append(('BACKGROUND', (0, last), (-1, last), header_color))
    style_cmds.append(('TEXTCOLOR', (0, last), (-1, last), C_WHITE))

    tbl.setStyle(TableStyle(style_cmds))
    elements.append(tbl)
    return elements


# ─── Build PDF ───
output_path = '/home/z/my-project/download/Tarifas_LaElvira_Loja_RETORNO_Plantilla.pdf'
os.makedirs(os.path.dirname(output_path), exist_ok=True)

doc = SimpleDocTemplate(
    output_path,
    pagesize=letter,
    leftMargin=0.6*inch, rightMargin=0.6*inch,
    topMargin=0.5*inch, bottomMargin=0.5*inch,
)

story = []

# Título
title_s = ParagraphStyle('title', fontName=FONT_BOLD, fontSize=15, textColor=C_DARK,
                         leading=18, alignment=0, spaceAfter=1)
ret_s = ParagraphStyle('ret', fontName=FONT_BOLD, fontSize=10, textColor=colors.HexColor('#D32F2F'),
                       leading=13, alignment=0, spaceAfter=2)
sub_s = ParagraphStyle('sub', fontName=FONT, fontSize=8, textColor=colors.HexColor('#9E9E9E'),
                       leading=10, alignment=0, spaceAfter=6)

story.append(Paragraph('TARIFAS LA ELVIRA - LOJA', title_s))
story.append(Paragraph('PLANTILLA DE RETORNO  |  Precios por llenar manualmente', ret_s))
story.append(Paragraph('Transportes Vilcabambaturis Cía. Ltda.  |  Agosto 2025', sub_s))
story.append(Spacer(1, 4))

# Sección 1: Directos
story.extend(build_section(
    '1. PRECIOS DIRECTOS  (La Elvira a Loja)',
    'Pasajeros que suben en cualquier parada con destino a Loja',
    directos_retorno,
    C_ELVIRA_TXT, None, C_ELVIRA_LINE,
    dest_label='PARADA',
))

story.append(Spacer(1, 10))

# Sección 2: Intermedios La Elvira → Malacatos
story.extend(build_section(
    '2. INTERMEDIOS  (La Elvira a Malacatos)',
    'Pasajeros que suben en el segmento La Elvira y se bajan en Malacatos',
    intermedios_emal,
    C_EMAL_HDR, None, C_EMAL_LINE,
))

story.append(Spacer(1, 10))

# Sección 3: Intermedios La Elvira → Vilcabamba
story.extend(build_section(
    '3. INTERMEDIOS  (La Elvira a Vilcabamba)',
    'Pasajeros que suben en el segmento La Elvira y se bajan en Vilcabamba',
    intermedios_evilc,
    C_EVILC_HDR, None, C_EVILC_LINE,
))

# Leyenda
story.append(Spacer(1, 12))
leg_s = ParagraphStyle('leg', fontName=FONT, fontSize=7, textColor=colors.HexColor('#757575'), leading=10)
story.append(Paragraph(
    '<font color="#B71C1C">■</font> Zona La Elvira  '
    '<font color="#9E9E9E">■</font> Zona troncal (Vilcabamba-Malacatos-Loja)  '
    '<font color="#00695C">■</font> Intermedios La Elvira→Malacatos  '
    '<font color="#283593">■</font> Intermedios La Elvira→Vilcabamba',
    leg_s))

story.append(Spacer(1, 6))
note_s = ParagraphStyle('note', fontName=FONT, fontSize=7, textColor=colors.HexColor('#BDBDBD'), leading=9)
story.append(Paragraph('Las columnas NORMAL y MEDIA deben ser llenadas manualmente con los precios oficiales de retorno.', note_s))

doc.build(story)
print(f'PDF plantilla generado: {output_path}')
