#!/usr/bin/env python3
"""Genera PDF con tabla de precios El Tambo -> Loja (vuelta).
Incluye paradas directas + tramos intermedios.
Precios actualizados resaltados en color accent + negrita."""

import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, cm
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, KeepTogether
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily

FONT_DIR = '/usr/share/fonts'

# Register fonts
pdfmetrics.registerFont(TTFont('NotoSerifSC', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Regular.ttf'))
pdfmetrics.registerFont(TTFont('NotoSerifSC-Bold', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Bold.ttf'))
registerFontFamily('NotoSerifSC', normal='NotoSerifSC', bold='NotoSerifSC-Bold')

# ━━ Cascade Palette ━━
PAGE_BG       = colors.HexColor('#f2f1f0')
TABLE_STRIPE  = colors.HexColor('#efeeec')
HEADER_FILL   = colors.HexColor('#736b51')
BORDER        = colors.HexColor('#cac2ac')
TEXT_PRIMARY   = colors.HexColor('#272623')
TEXT_MUTED     = colors.HexColor('#79766f')
ACCENT        = colors.HexColor('#8a7227')
HIGHLIGHT_BG  = colors.HexColor('#fff8e1')  # soft yellow highlight for updated rows
SECTION_BG    = colors.HexColor('#e8e6e1')   # section header background

OUTPUT_PATH = '/home/z/my-project/download/Tarifas_ElTambo_Loja_Vuelta.pdf'
os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)

doc = SimpleDocTemplate(
    OUTPUT_PATH,
    pagesize=A4,
    leftMargin=2.5 * cm,
    rightMargin=2.5 * cm,
    topMargin=2 * cm,
    bottomMargin=2 * cm,
    title='Tarifas de Transporte - El Tambo a Loja',
    author='RutaGo',
    subject='Lista de precios ruta El Tambo - Loja (vuelta)',
)

styles = getSampleStyleSheet()

title_style = ParagraphStyle(
    'CustomTitle',
    parent=styles['Title'],
    fontName='NotoSerifSC-Bold',
    fontSize=18,
    leading=24,
    textColor=TEXT_PRIMARY,
    spaceAfter=2 * mm,
    alignment=1,
)

subtitle_style = ParagraphStyle(
    'CustomSubtitle',
    parent=styles['Normal'],
    fontName='NotoSerifSC',
    fontSize=11,
    leading=15,
    textColor=TEXT_MUTED,
    spaceAfter=10 * mm,
    alignment=1,
)

section_style = ParagraphStyle(
    'SectionStyle',
    fontName='NotoSerifSC-Bold',
    fontSize=11,
    leading=14,
    textColor=TEXT_PRIMARY,
    alignment=1,
)

# ── Data: Paradas Directas El Tambo → Loja (Vuelta) ──
precios_directos = [
    (1,  'San Bernardo',  '$0.75', '$0.40', False),
    (2,  'La Capilla',    '$0.75', '$0.40', False),
    (3,  'La Era',        '$1.00', '$0.50', True),
    (4,  'San Agustin',   '$1.00', '$0.50', False),
    (5,  'La Merced',     '$1.25', '$0.65', True),
    (6,  'Zhotahuayco',   '$1.50', '$0.75', True),
    (7,  'Naranjo Dulce', '$1.50', '$0.75', True),
    (8,  'Santo Domingo', '$1.50', '$0.75', False),
    (9,  'San Jose',      '$1.75', '$0.90', False),
    (10, 'Ceibopamba',    '$2.00', '$1.00', True),
    (11, 'Malacatos',     '$2.25', '$1.15', False),
    (12, 'La Pena',       '$2.25', '$1.15', False),
    (13, 'Landangui',     '$2.50', '$1.25', False),
    (14, 'Chorrillos',    '$2.50', '$1.25', False),
    (15, 'Nangora',       '$2.50', '$1.25', False),
    (16, 'Porvenir',      '$2.75', '$1.40', False),
    (17, 'Granadillo',    '$2.75', '$1.40', False),
    (18, 'Yamba',         '$2.75', '$1.40', False),
    (19, 'Rumizhitana',   '$3.00', '$1.50', True),
    (20, 'Tres Leguas',   '$3.00', '$1.50', True),
    (21, 'Pueblo Nuevo',  '$3.00', '$1.50', True),
    (22, 'Cajanuma',      '$3.50', '$1.75', False),
    (23, 'Dos Puentes',   '$3.50', '$1.75', True),
    (24, 'Capuli',        '$4.00', '$2.00', False),
]

# ── Data: Tramos Intermedios El Tambo → Loja ──
precios_intermedios = [
    (1,  'La Era a La Merced',            '$0.75', '$0.40', True),
    (2,  'La Era a Malacatos',            '$2.00', '$1.00', True),
    (3,  'La Merced a Ceibopamba',        '$1.50', '$0.75', True),
    (4,  'La Merced a Malacatos',         '$1.75', '$0.90', True),
    (5,  'La Merced a Landangui',         '$2.00', '$1.00', True),
    (6,  'Zhotahuayco a La Merced',       '$0.75', '$0.40', True),
    (7,  'Zhotahuayco a Malacatos',       '$1.50', '$0.75', True),
    (8,  'Zhotahuayco a Ceibopamba',      '$1.00', '$0.50', True),
    (9,  'Malacatos a La Pena',           '$0.75', '$0.40', True),
    (10, 'Malacatos a Chorrillos',        '$0.75', '$0.40', True),
    (11, 'Malacatos a Nangora',           '$0.75', '$0.40', True),
    (12, 'Malacatos a Porvenir',          '$0.75', '$0.40', True),
    (13, 'Malacatos a Tres Leguas',       '$1.10', '$0.55', True),
    (14, 'Malacatos a Pueblo Nuevo',      '$1.10', '$0.55', True),
    (15, 'Malacatos a Rumizhitana',       '$1.10', '$0.55', True),
    (16, 'Malacatos a Cajanuma',          '$1.50', '$0.75', True),
    (17, 'Malacatos a Dos Puentes',       '$1.50', '$0.75', True),
]

# ── Cell Styles ──
header_style = ParagraphStyle(
    'HeaderStyle',
    fontName='NotoSerifSC-Bold',
    fontSize=10,
    leading=13,
    textColor=colors.white,
    alignment=1,
)

cell_style = ParagraphStyle(
    'CellStyle',
    fontName='NotoSerifSC',
    fontSize=9,
    leading=12,
    textColor=TEXT_PRIMARY,
    alignment=1,
)

cell_left = ParagraphStyle(
    'CellLeft',
    fontName='NotoSerifSC',
    fontSize=9,
    leading=12,
    textColor=TEXT_PRIMARY,
    alignment=0,
)

cell_highlight = ParagraphStyle(
    'CellHighlight',
    fontName='NotoSerifSC-Bold',
    fontSize=9,
    leading=12,
    textColor=ACCENT,
    alignment=1,
)

cell_left_highlight = ParagraphStyle(
    'CellLeftHighlight',
    fontName='NotoSerifSC-Bold',
    fontSize=9,
    leading=12,
    textColor=TEXT_PRIMARY,
    alignment=0,
)

section_header_style = ParagraphStyle(
    'SectionHeader',
    fontName='NotoSerifSC-Bold',
    fontSize=10,
    leading=13,
    textColor=HEADER_FILL,
    alignment=0,
)

# ── Helper: build table from data ──
def build_table(data_list):
    header_row = [
        Paragraph('#', header_style),
        Paragraph('Parada / Tramo', header_style),
        Paragraph('Normal', header_style),
        Paragraph('Media', header_style),
    ]

    table_data = [header_row]
    for num, parada, normal, media, updated in data_list:
        if updated:
            row = [
                Paragraph(str(num), cell_highlight),
                Paragraph(parada, cell_left_highlight),
                Paragraph(normal, cell_highlight),
                Paragraph(media, cell_highlight),
            ]
        else:
            row = [
                Paragraph(str(num), cell_style),
                Paragraph(parada, cell_left),
                Paragraph(normal, cell_style),
                Paragraph(media, cell_style),
            ]
        table_data.append(row)

    # Column widths
    page_width = A4[0] - 5 * cm
    col_widths = [page_width * 0.07, page_width * 0.53, page_width * 0.20, page_width * 0.20]

    table = Table(table_data, colWidths=col_widths, repeatRows=1)

    # Table style
    style_commands = [
        # Header
        ('BACKGROUND', (0, 0), (-1, 0), HEADER_FILL),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'NotoSerifSC-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
        ('TOPPADDING', (0, 0), (-1, 0), 8),

        # Body defaults
        ('FONTNAME', (0, 1), (-1, -1), 'NotoSerifSC'),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 5),
        ('TOPPADDING', (0, 1), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),

        # Grid
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('LINEBELOW', (0, 0), (-1, 0), 1.2, HEADER_FILL),

        # Alignment
        ('ALIGN', (0, 0), (0, -1), 'CENTER'),
        ('ALIGN', (2, 0), (-1, -1), 'CENTER'),
        ('ALIGN', (1, 0), (1, -1), 'LEFT'),

        ('ROUNDEDCORNERS', [4, 4, 0, 0]),
    ]

    # Alternating row colors + highlight for updated rows
    for i in range(1, len(table_data)):
        row_idx = i - 1
        is_updated = data_list[row_idx][4]
        if is_updated:
            style_commands.append(('BACKGROUND', (0, i), (-1, i), HIGHLIGHT_BG))
        elif i % 2 == 0:
            style_commands.append(('BACKGROUND', (0, i), (-1, i), TABLE_STRIPE))
        else:
            style_commands.append(('BACKGROUND', (0, i), (-1, i), colors.white))

    table.setStyle(TableStyle(style_commands))
    return table

# ── Build Story ──
story = []
story.append(Paragraph('Tarifas de Transporte', title_style))
story.append(Paragraph('Ruta El Tambo - Loja (Vuelta)', subtitle_style))

# Section: Paradas Directas
story.append(KeepTogether([
    Paragraph('Paradas Directas', section_style),
]))
story.append(Spacer(1, 2 * mm))
story.append(build_table(precios_directos))
story.append(Spacer(1, 6 * mm))

# Section: Tramos Intermedios
story.append(KeepTogether([
    Paragraph('Tramos Intermedios', section_style),
]))
story.append(Spacer(1, 2 * mm))
story.append(build_table(precios_intermedios))
story.append(Spacer(1, 6 * mm))

# Legend
page_width = A4[0] - 5 * cm
legend_style = ParagraphStyle(
    'Legend',
    fontName='NotoSerifSC',
    fontSize=8,
    leading=11,
    textColor=TEXT_MUTED,
    alignment=0,
)

legend_table = Table(
    [[Paragraph('<b>*</b> <font color="#8a7227">= Precio actualizado</font>', legend_style)]],
    colWidths=[page_width],
)
legend_table.setStyle(TableStyle([
    ('LEFTPADDING', (0, 0), (-1, -1), 0),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
    ('TOPPADDING', (0, 0), (-1, -1), 0),
]))
story.append(legend_table)
story.append(Spacer(1, 3 * mm))

footer_style = ParagraphStyle(
    'Footer',
    fontName='NotoSerifSC',
    fontSize=8,
    leading=11,
    textColor=TEXT_MUTED,
    alignment=1,
)
updated_count = sum(1 for p in precios_directos if p[4]) + sum(1 for p in precios_intermedios if p[4])
story.append(Paragraph(
    f'24 paradas directas | 17 tramos intermedios | {updated_count} precios actualizados',
    footer_style
))

doc.build(story)
print(f'PDF generado: {OUTPUT_PATH}')
