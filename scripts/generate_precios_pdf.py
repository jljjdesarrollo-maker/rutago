#!/usr/bin/env python3
"""Genera PDF con tabla de precios El Tambo → Loja (vuelta - directos)."""

import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, cm
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily

FONT_DIR = '/usr/share/fonts'

# Register fonts
pdfmetrics.registerFont(TTFont('NotoSerifSC', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Regular.ttf'))
pdfmetrics.registerFont(TTFont('NotoSerifSC-Bold', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Bold.ttf'))
registerFontFamily('NotoSerifSC', normal='NotoSerifSC', bold='NotoSerifSC-Bold')

# NotoSansSC variable font not supported by ReportLab, use NotoSerifSC for all

# ━━ Cascade Palette ━━
PAGE_BG       = colors.HexColor('#f2f1f0')
SECTION_BG    = colors.HexColor('#efeeec')
CARD_BG       = colors.HexColor('#eeeeeb')
TABLE_STRIPE  = colors.HexColor('#efeeec')
HEADER_FILL   = colors.HexColor('#736b51')
COVER_BLOCK   = colors.HexColor('#7a725b')
BORDER        = colors.HexColor('#cac2ac')
ICON          = colors.HexColor('#756844')
ACCENT        = colors.HexColor('#8a7227')
TEXT_PRIMARY   = colors.HexColor('#272623')
TEXT_MUTED     = colors.HexColor('#79766f')

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
    author='Z.ai',
    subject='Lista de precios directos ruta El Tambo - Loja (vuelta)',
)

styles = getSampleStyleSheet()

title_style = ParagraphStyle(
    'CustomTitle',
    parent=styles['Title'],
    fontName='NotoSerifSC-Bold',
    fontSize=18,
    leading=24,
    textColor=TEXT_PRIMARY,
    spaceAfter=4 * mm,
    alignment=1,  # center
)

subtitle_style = ParagraphStyle(
    'CustomSubtitle',
    parent=styles['Normal'],
    fontName='NotoSerifSC',
    fontSize=11,
    leading=15,
    textColor=TEXT_MUTED,
    spaceAfter=12 * mm,
    alignment=1,  # center
)

# Data: El Tambo → Loja (Vuelta - Directos)
precios = [
    (1, 'San Bernardo', '$0.75', '$0.40'),
    (2, 'La Capilla', '$0.75', '$0.40'),
    (3, 'La Era', '$1.25', '$0.65'),
    (4, 'San Agustin', '$1.25', '$0.65'),
    (5, 'La Merced', '$1.25', '$0.65'),
    (6, 'Zhotahuayco', '$1.25', '$0.65'),
    (7, 'Naranjo Dulce', '$1.40', '$0.70'),
    (8, 'Santo Domingo', '$1.40', '$0.70'),
    (9, 'San Jose', '$1.50', '$0.75'),
    (10, 'Ceibopamba', '$1.50', '$0.75'),
    (11, 'Malacatos', '$1.75', '$0.90'),
    (12, 'La Pena', '$1.75', '$0.90'),
    (13, 'Landangui', '$2.00', '$1.00'),
    (14, 'Chorrillos', '$2.25', '$1.15'),
    (15, 'Nangora', '$2.25', '$1.15'),
    (16, 'Porvenir', '$2.50', '$1.25'),
    (17, 'Granadillo', '$2.75', '$1.40'),
    (18, 'Yamba', '$3.00', '$1.50'),
    (19, 'Rumizhitana', '$3.25', '$1.65'),
    (20, 'Tres Leguas', '$3.75', '$1.90'),
    (21, 'Pueblo Nuevo', '$3.75', '$1.90'),
    (22, 'Cajanuma', '$4.00', '$2.00'),
    (23, 'Dos Puentes', '$4.00', '$2.00'),
    (24, 'Capuli', '$4.00', '$2.00'),
]

# Build header row
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
    fontSize=10,
    leading=13,
    textColor=TEXT_PRIMARY,
    alignment=1,
)

cell_left = ParagraphStyle(
    'CellLeft',
    fontName='NotoSerifSC',
    fontSize=10,
    leading=13,
    textColor=TEXT_PRIMARY,
    alignment=0,
)

header_row = [
    Paragraph('#', header_style),
    Paragraph('Parada', header_style),
    Paragraph('Normal', header_style),
    Paragraph('Media', header_style),
]

table_data = [header_row]
for num, parada, normal, media in precios:
    row = [
        Paragraph(str(num), cell_style),
        Paragraph(parada, cell_left),
        Paragraph(normal, cell_style),
        Paragraph(media, cell_style),
    ]
    table_data.append(row)

# Column widths
page_width = A4[0] - 5 * cm  # 2.5cm margins each side
col_widths = [page_width * 0.08, page_width * 0.48, page_width * 0.22, page_width * 0.22]

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
    ('FONTSIZE', (0, 1), (-1, -1), 10),
    ('BOTTOMPADDING', (0, 1), (-1, -1), 6),
    ('TOPPADDING', (0, 1), (-1, -1), 6),
    ('LEFTPADDING', (0, 0), (-1, -1), 6),
    ('RIGHTPADDING', (0, 0), (-1, -1), 6),

    # Grid
    ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
    ('LINEBELOW', (0, 0), (-1, 0), 1.2, HEADER_FILL),

    # Alignment
    ('ALIGN', (0, 0), (0, -1), 'CENTER'),   # #
    ('ALIGN', (2, 0), (-1, -1), 'CENTER'),   # prices
    ('ALIGN', (1, 0), (1, -1), 'LEFT'),       # parada

    # Rounded top corners
    ('ROUNDEDCORNERS', [4, 4, 0, 0]),
]

# Alternating row colors
for i in range(1, len(table_data)):
    if i % 2 == 0:
        style_commands.append(('BACKGROUND', (0, i), (-1, i), TABLE_STRIPE))
    else:
        style_commands.append(('BACKGROUND', (0, i), (-1, i), colors.white))

table.setStyle(TableStyle(style_commands))

# Build story
story = []
story.append(Paragraph('Tarifas de Transporte', title_style))
story.append(Paragraph('Ruta El Tambo - Loja (Vuelta - Paradas Directas)', subtitle_style))
story.append(table)
story.append(Spacer(1, 8 * mm))

footer_style = ParagraphStyle(
    'Footer',
    fontName='NotoSerifSC',
    fontSize=8,
    leading=11,
    textColor=TEXT_MUTED,
    alignment=1,
)
story.append(Paragraph('24 paradas principales | Rango: $0.40 - $4.00 (media) / $0.75 - $4.00 (normal)', footer_style))

doc.build(story)
print(f'PDF generado: {OUTPUT_PATH}')
