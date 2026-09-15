#!/usr/bin/env python3
"""Genera PDF con tabla de precios Loja-El Tambo (ambas direcciones).
Incluye paradas directas + tramos intermedios para cada ruta."""

import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, cm
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, KeepTogether, PageBreak
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily

FONT_DIR = '/usr/share/fonts'

pdfmetrics.registerFont(TTFont('NotoSerifSC', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Regular.ttf'))
pdfmetrics.registerFont(TTFont('NotoSerifSC-Bold', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Bold.ttf'))
registerFontFamily('NotoSerifSC', normal='NotoSerifSC', bold='NotoSerifSC-Bold')

# ━━ Cascade Palette ━━
HEADER_FILL   = colors.HexColor('#736b51')
BORDER        = colors.HexColor('#cac2ac')
TEXT_PRIMARY   = colors.HexColor('#272623')
TEXT_MUTED     = colors.HexColor('#79766f')
TABLE_STRIPE  = colors.HexColor('#efeeec')
SECTION_BG    = colors.HexColor('#e8e6e1')

OUTPUT_PATH = '/home/z/my-project/download/Tarifas_Loja_ElTambo_Completo.pdf'
os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)

doc = SimpleDocTemplate(
    OUTPUT_PATH,
    pagesize=A4,
    leftMargin=2.5 * cm,
    rightMargin=2.5 * cm,
    topMargin=2 * cm,
    bottomMargin=2 * cm,
    title='Tarifas de Transporte - Loja / El Tambo',
    author='RutaGo',
)

styles = getSampleStyleSheet()

# ── Styles ──
title_style = ParagraphStyle('T', fontName='NotoSerifSC-Bold', fontSize=18, leading=24,
    textColor=TEXT_PRIMARY, spaceAfter=2*mm, alignment=1)
subtitle_style = ParagraphStyle('ST', fontName='NotoSerifSC', fontSize=11, leading=15,
    textColor=TEXT_MUTED, spaceAfter=8*mm, alignment=1)
section_style = ParagraphStyle('SEC', fontName='NotoSerifSC-Bold', fontSize=12, leading=15,
    textColor=HEADER_FILL, alignment=0, spaceBefore=4*mm)
header_s = ParagraphStyle('H', fontName='NotoSerifSC-Bold', fontSize=9, leading=12,
    textColor=colors.white, alignment=1)
cell_s = ParagraphStyle('C', fontName='NotoSerifSC', fontSize=8.5, leading=11,
    textColor=TEXT_PRIMARY, alignment=1)
cell_l = ParagraphStyle('CL', fontName='NotoSerifSC', fontSize=8.5, leading=11,
    textColor=TEXT_PRIMARY, alignment=0)
footer_s = ParagraphStyle('F', fontName='NotoSerifSC', fontSize=7.5, leading=10,
    textColor=TEXT_MUTED, alignment=1)

# ━━━ DATA ━━━

# IDA: Loja → El Tambo (paradas directas, orden de ruta)
ida_directos = [
    (1,  'Dos Puentes',    '$0.75', '$0.40'),
    (2,  'Cajanuma',       '$1.25', '$0.65'),
    (3,  'Pueblo Nuevo',   '$1.25', '$0.65'),
    (4,  'Tres Leguas',    '$1.75', '$0.90'),
    (5,  'Rumizhitana',    '$1.75', '$0.90'),
    (6,  'Yamba',          '$1.75', '$0.90'),
    (7,  'Granadillo',     '$1.75', '$0.90'),
    (8,  'Porvenir',       '$2.00', '$1.00'),
    (9,  'Nangora',        '$2.00', '$1.00'),
    (10, 'Chorrillos',     '$2.00', '$1.00'),
    (11, 'Landangui',      '$2.00', '$1.00'),
    (12, 'La Pena',        '$2.25', '$1.15'),
    (13, 'Malacatos',      '$2.25', '$1.15'),
    (14, 'Ceibopamba',     '$2.25', '$1.15'),
    (15, 'San Jose',       '$2.25', '$1.15'),
    (16, 'Santo Domingo',  '$2.50', '$1.25'),
    (17, 'Naranjo Dulce',  '$2.75', '$1.40'),
    (18, 'Zhotahuayco',    '$3.00', '$1.50'),
    (19, 'La Merced',      '$3.25', '$1.65'),
    (20, 'San Agustin',    '$3.75', '$1.90'),
    (21, 'La Era',         '$3.75', '$1.90'),
    (22, 'La Capilla',     '$4.00', '$2.00'),
    (23, 'San Bernardo',   '$4.00', '$2.00'),
    (24, 'El Tambo',       '$4.00', '$2.00'),
]

ida_intermedios = [
    (1,  'Malacatos a Ceibopamba',    '$0.75', '$0.40'),
    (2,  'Malacatos a Trinidad',      '$0.75', '$0.40'),
    (3,  'Malacatos a San Jose',       '$0.75', '$0.40'),
    (4,  'Malacatos a Santo Domingo',  '$1.00', '$0.50'),
    (5,  'Malacatos a Naranjo Dulce',  '$1.25', '$0.65'),
    (6,  'Malacatos a Zhotahuayco',    '$1.50', '$0.75'),
    (7,  'Malacatos a La Merced',      '$1.75', '$0.90'),
    (8,  'Malacatos a San Agustin',    '$1.75', '$0.90'),
    (9,  'Malacatos a La Era',         '$2.00', '$1.00'),
    (10, 'Malacatos a La Capilla',     '$2.25', '$1.15'),
    (11, 'Malacatos a San Bernardo',   '$2.25', '$1.15'),
    (12, 'Malacatos a El Tambo',       '$2.25', '$1.15'),
]

# VUELTA: El Tambo → Loja (paradas directas, orden de ruta)
vuelta_directos = [
    (1,  'San Bernardo',  '$0.75', '$0.40'),
    (2,  'La Capilla',    '$0.75', '$0.40'),
    (3,  'La Era',        '$1.00', '$0.50'),
    (4,  'San Agustin',   '$1.00', '$0.50'),
    (5,  'La Merced',     '$1.25', '$0.65'),
    (6,  'Zhotahuayco',   '$1.50', '$0.75'),
    (7,  'Naranjo Dulce', '$1.50', '$0.75'),
    (8,  'Santo Domingo', '$1.50', '$0.75'),
    (9,  'San Jose',      '$1.75', '$0.90'),
    (10, 'Ceibopamba',    '$2.00', '$1.00'),
    (11, 'Malacatos',     '$2.25', '$1.15'),
    (12, 'La Pena',       '$2.25', '$1.15'),
    (13, 'Landangui',     '$2.50', '$1.25'),
    (14, 'Chorrillos',    '$2.50', '$1.25'),
    (15, 'Nangora',       '$2.50', '$1.25'),
    (16, 'Porvenir',      '$2.75', '$1.40'),
    (17, 'Granadillo',    '$2.75', '$1.40'),
    (18, 'Yamba',         '$2.75', '$1.40'),
    (19, 'Rumizhitana',   '$3.00', '$1.50'),
    (20, 'Tres Leguas',   '$3.00', '$1.50'),
    (21, 'Pueblo Nuevo',  '$3.00', '$1.50'),
    (22, 'Cajanuma',      '$3.50', '$1.75'),
    (23, 'Dos Puentes',   '$3.50', '$1.75'),
    (24, 'Capuli',        '$4.00', '$2.00'),
]

vuelta_intermedios = [
    (1,  'La Era a La Merced',            '$0.75', '$0.40'),
    (2,  'La Era a Malacatos',            '$2.00', '$1.00'),
    (3,  'La Merced a Ceibopamba',        '$1.50', '$0.75'),
    (4,  'La Merced a Malacatos',         '$1.75', '$0.90'),
    (5,  'La Merced a Landangui',         '$2.00', '$1.00'),
    (6,  'Zhotahuayco a La Merced',       '$0.75', '$0.40'),
    (7,  'Zhotahuayco a Malacatos',       '$1.50', '$0.75'),
    (8,  'Zhotahuayco a Ceibopamba',      '$1.00', '$0.50'),
    (9,  'Malacatos a La Pena',           '$0.75', '$0.40'),
    (10, 'Malacatos a Chorrillos',        '$0.75', '$0.40'),
    (11, 'Malacatos a Nangora',           '$0.75', '$0.40'),
    (12, 'Malacatos a Porvenir',          '$0.75', '$0.40'),
    (13, 'Malacatos a Tres Leguas',       '$1.10', '$0.55'),
    (14, 'Malacatos a Pueblo Nuevo',      '$1.10', '$0.55'),
    (15, 'Malacatos a Rumizhitana',       '$1.10', '$0.55'),
    (16, 'Malacatos a Cajanuma',          '$1.50', '$0.75'),
    (17, 'Malacatos a Dos Puentes',       '$1.50', '$0.75'),
]

# ── Table builder ──
page_w = A4[0] - 5 * cm
col_w = [page_w * 0.07, page_w * 0.53, page_w * 0.20, page_w * 0.20]

def build_table(data):
    hdr = [Paragraph('#', header_s), Paragraph('Parada / Tramo', header_s),
           Paragraph('Normal', header_s), Paragraph('Media', header_s)]
    rows = [hdr]
    for n, p, nr, md in data:
        rows.append([Paragraph(str(n), cell_s), Paragraph(p, cell_l),
                      Paragraph(nr, cell_s), Paragraph(md, cell_s)])
    t = Table(rows, colWidths=col_w, repeatRows=1)
    cmds = [
        ('BACKGROUND', (0,0), (-1,0), HEADER_FILL),
        ('BOTTOMPADDING', (0,0), (-1,0), 6), ('TOPPADDING', (0,0), (-1,0), 6),
        ('BOTTOMPADDING', (0,1), (-1,-1), 4), ('TOPPADDING', (0,1), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 5), ('RIGHTPADDING', (0,0), (-1,-1), 5),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER),
        ('LINEBELOW', (0,0), (-1,0), 1, HEADER_FILL),
        ('ALIGN', (0,0), (0,-1), 'CENTER'), ('ALIGN', (2,0), (-1,-1), 'CENTER'),
        ('ALIGN', (1,0), (1,-1), 'LEFT'),
        ('ROUNDEDCORNERS', [4,4,0,0]),
    ]
    for i in range(1, len(rows)):
        bg = TABLE_STRIPE if i % 2 == 0 else colors.white
        cmds.append(('BACKGROUND', (0,i), (-1,i), bg))
    t.setStyle(TableStyle(cmds))
    return t

# ── Build Story ──
story = []

# ═══ RUTA 1: LOJA → EL TAMBO ═══
story.append(Paragraph('Tarifas de Transporte', title_style))
story.append(Paragraph('Ruta Loja - El Tambo (Ida)', subtitle_style))

story.append(Paragraph('Paradas Directas', section_style))
story.append(Spacer(1, 2*mm))
story.append(build_table(ida_directos))
story.append(Spacer(1, 5*mm))

story.append(Paragraph('Tramos Intermedios', section_style))
story.append(Spacer(1, 2*mm))
story.append(build_table(ida_intermedios))

story.append(Spacer(1, 4*mm))
story.append(Paragraph(f'24 paradas directas | 12 tramos intermedios', footer_s))

# ═══ RUTA 2: EL TAMBO → LOJA ═══
story.append(PageBreak())
story.append(Paragraph('Tarifas de Transporte', title_style))
story.append(Paragraph('Ruta El Tambo - Loja (Vuelta)', subtitle_style))

story.append(Paragraph('Paradas Directas', section_style))
story.append(Spacer(1, 2*mm))
story.append(build_table(vuelta_directos))
story.append(Spacer(1, 5*mm))

story.append(Paragraph('Tramos Intermedios', section_style))
story.append(Spacer(1, 2*mm))
story.append(build_table(vuelta_intermedios))

story.append(Spacer(1, 4*mm))
story.append(Paragraph(f'24 paradas directas | 17 tramos intermedios', footer_s))

doc.build(story)
print(f'PDF generado: {OUTPUT_PATH}')
