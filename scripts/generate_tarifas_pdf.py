import sys, os
sys.path.insert(0, '/home/z/my-project/skills/pdf/scripts')

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, cm
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

FONT_DIR = '/usr/share/fonts'
pdfmetrics.registerFont(TTFont('DejaVu', f'{FONT_DIR}/truetype/dejavu/DejaVuSans.ttf'))
pdfmetrics.registerFont(TTFont('DejaVu-Bold', f'{FONT_DIR}/truetype/dejavu/DejaVuSans-Bold.ttf'))

OUTPUT = '/home/z/my-project/download/RutaGo_Tarifas_Precios.pdf'

doc = SimpleDocTemplate(
    OUTPUT,
    pagesize=A4,
    topMargin=1.5*cm, bottomMargin=1.5*cm,
    leftMargin=1.5*cm, rightMargin=1.5*cm,
    title='RutaGo - Tarifas de Precios',
    author='RutaGo',
    subject='Listado completo de tarifas por ruta',
)

W = A4[0] - 3*cm  # usable width

# ─── Styles ───
s_title = ParagraphStyle('Title', fontName='DejaVu-Bold', fontSize=22, leading=28, spaceAfter=4*mm, textColor=colors.HexColor('#1e3a5f'))
s_subtitle = ParagraphStyle('Subtitle', fontName='DejaVu', fontSize=11, leading=14, spaceAfter=8*mm, textColor=colors.HexColor('#64748b'))
s_route = ParagraphStyle('Route', fontName='DejaVu-Bold', fontSize=13, leading=18, spaceBefore=6*mm, spaceAfter=3*mm, textColor=colors.HexColor('#1e40af'), borderPadding=(0,0,0,0))
s_dir = ParagraphStyle('Dir', fontName='DejaVu-Bold', fontSize=10, leading=14, spaceBefore=3*mm, spaceAfter=2*mm, textColor=colors.HexColor('#475569'))
s_header = ParagraphStyle('Header', fontName='DejaVu-Bold', fontSize=8, leading=10, textColor=colors.white)
s_cell = ParagraphStyle('Cell', fontName='DejaVu', fontSize=8, leading=10)
s_cell_center = ParagraphStyle('CellC', fontName='DejaVu', fontSize=8, leading=10, alignment=1)
s_footer = ParagraphStyle('Footer', fontName='DejaVu', fontSize=7, leading=9, textColor=colors.HexColor('#94a3b8'), alignment=1)
s_note = ParagraphStyle('Note', fontName='DejaVu', fontSize=8, leading=11, textColor=colors.HexColor('#64748b'), spaceBefore=4*mm)

# ─── Data from RUTA_PARADAS ───
RUTAS = {
    'Loja - Vilcabamba': {
        'ida': [
            'Dos Puentes', 'Cajánuma', 'Pueblo Nuevo', 'Tres Leguas', 'Rumizhitana', 'Yamba',
            'Granadillo', 'Porvenir', 'Nangora', 'Chorrillos', 'Landangui', 'La Peña', 'Malacatos',
            'Taxiche', 'Cavianga', 'Cararango', 'San Pedro', 'Vilcabamba', 'Peña→Mal', 'Land→Mal',
            'Chorri→Mal', 'Nango→Mal', 'Porv→Mal', 'Gran→Mal', 'Yamba→Mal', 'Rumi→Mal', 'T.Leguas→Mal',
            'P.Nuevo→Mal', 'Caja→Mal', 'D.Puen→Mal', 'Capulí→Mal',
            'S.Pedro→Vilc', 'Carar→Vilc', 'Cavian→Vilc', 'Taxich→Vilc', 'Mal→Vilc', 'Land→Vilc', 'Peña→Vilc',
            'Chorri→Vilc', 'Nango→Vilc', 'Porv→Vilc', 'Gran→Vilc', 'Yamba→Vilc', 'Rumi→Vilc', 'T.Leguas→Vilc',
            'P.Nuevo→Vilc', 'Caja→Vilc', 'D.Puen→Vilc', 'Capulí→Vilc',
        ],
        'vuelta': [
            'Vilcabamba', 'San Pedro', 'Cararango', 'Cavianga', 'Taxiche', 'Malacatos', 'La Peña', 'Landangui',
            'Chorrillos', 'Nangora', 'Porvenir', 'Granadillo', 'Yamba', 'Rumizhitana', 'Tres Leguas',
            'Pueblo Nuevo', 'Cajánuma', 'Dos Puentes', 'Capulí',
            'Mal→LaPeña', 'Mal→Land', 'Mal→Chorri', 'Mal→Nango', 'Mal→Porv',
            'Mal→Gran', 'Mal→Yamba', 'Mal→Rumi', 'Mal→T.Leguas', 'Mal→P.Nuevo',
            'Mal→Caja', 'Mal→D.Puen', 'Mal→Capulí',
            'D.Puen→Loja', 'Caja→Loja', 'P.Nuevo→Loja', 'T.Leguas→Loja',
            'Rumi→Loja', 'Yamba→Loja', 'Gran→Loja', 'Porv→Loja',
            'Nango→Loja', 'Chorri→Loja', 'Land→Loja', 'Peña→Loja',
            'Mal→Loja', 'Taxich→Loja', 'Cavian→Loja', 'Carar→Loja', 'S.Pedro→Loja',
        ],
    },
    'Loja - Zahuayco': {
        'ida': [
            'Dos Puentes', 'Cajánuma', 'Pueblo Nuevo', 'Tres Leguas', 'Rumizhitana', 'Yamba',
            'Granadillo', 'Porvenir', 'Nangora', 'Chorrillos', 'Landangui', 'La Peña', 'Malacatos',
            'Taxiche', 'Cavianga', 'Cararango', 'San Pedro', 'Vilcabamba', 'Masanamaca', 'Quinara',
            'Chumberos', 'Palmira', 'Zahuayco', 'Vilc→Masan', 'Vilc→Quina', 'Vilc→Chumb', 'Vilc→Palm',
            'Vilc→Zahua', 'Mal→Masan', 'Mal→Quina', 'Mal→Chumb', 'Mal→Palm', 'Mal→Zahua',
        ],
        'vuelta': [
            'Zahuayco', 'Palmira', 'Quinara', 'Masanamaca', 'Vilcabamba', 'San Pedro', 'Cararango',
            'Cavianga', 'Taxiche', 'Malacatos', 'La Peña', 'Landangui', 'Chorrillos', 'Nangora',
            'Porvenir', 'Granadillo', 'Yamba', 'Rumizhitana', 'Tres Leguas', 'Pueblo Nuevo',
            'Cajánuma', 'Dos Puentes', 'Capulí',
        ],
    },
    'Loja - El Tambo': {
        'ida': [
            'Dos Puentes', 'Cajánuma', 'Pueblo Nuevo', 'Tres Leguas', 'Rumizhitana', 'Yamba',
            'Granadillo', 'Porvenir', 'Nangora', 'Chorrillos', 'Landangui', 'La Peña', 'Malacatos',
            'Ceibopamba', 'Trinidad', 'San José', 'Santo Domingo', 'Naranjo Dulce', 'Zhotahuayco',
            'La Merced', 'San Agustín', 'La Era', 'La Capilla', 'San Bernaved', 'El Tambo', 'Mal→Ceibop',
            'Mal→Trinidad', 'Mal→S.Jose', 'Mal→StoDom', 'Mal→N.Dulce', 'Mal→Zhotahu', 'Mal→LaMerc',
            'Mal→S.Agust', 'Mal→LaEra', 'Mal→LaCap', 'Mal→S.Bern', 'Mal→ElTambo',
        ],
        'vuelta': [
            'El Tambo', 'San Bernaved', 'La Capilla', 'La Era', 'San Agustín', 'La Merced', 'Zhotahuayco',
            'Naranjo Dulce', 'Santo Domingo', 'San José', 'Ceibopamba', 'Trinidad', 'Malacatos',
            'La Peña', 'Landangui', 'Chorrillos', 'Nangora', 'Porvenir', 'Granadillo', 'Yamba',
            'Rumizhitana', 'Tres Leguas', 'Pueblo Nuevo', 'Cajánuma', 'Dos Puentes', 'Capulí',
            'Mal→LaPeña', 'Mal→Land', 'Mal→Chorri', 'Mal→Nango', 'Mal→Porv',
            'Mal→Gran', 'Mal→Yamba', 'Mal→Rumi', 'Mal→T.Leguas', 'Mal→P.Nuevo',
            'Mal→Caja', 'Mal→D.Puen', 'Mal→Capulí',
            'D.Puen→Loja', 'Caja→Loja', 'P.Nuevo→Loja', 'T.Leguas→Loja',
            'Rumi→Loja', 'Yamba→Loja', 'Gran→Loja', 'Porv→Loja',
            'Nango→Loja', 'Chorri→Loja', 'Land→Loja', 'Peña→Loja', 'Mal→Loja',
            'LaCap→Loja', 'S.Bern→Loja',
        ],
    },
    'Loja - La Elvira': {
        'ida': [
            'Dos Puentes', 'Cajánuma', 'Pueblo Nuevo', 'Tres Leguas', 'Rumizhitana', 'Yamba',
            'Granadillo', 'Porvenir', 'Nangora', 'Chorrillos', 'Landangui', 'La Peña', 'Malacatos',
            'Taxiche', 'Cavianga', 'Cararango', 'San Pedro', 'Vilcabamba', 'Cucanama', 'Linderos',
            'Santorum', 'Solanda', 'Moyococha', 'Tumianuma', 'Quinara', 'Comunidades', 'La Elvira',
            'Mal→Cucan', 'Mal→Lind', 'Mal→Santo', 'Mal→Solan', 'Mal→Moyoc', 'Mal→Tumia', 'Mal→Quina',
            'Mal→Comun', 'Mal→Elvira', 'Vilc→Cucan', 'Vilc→Lind', 'Vilc→Santo', 'Vilc→Solan',
            'Vilc→Moyoc', 'Vilc→Tumia', 'Vilc→Quina', 'Vilc→Comun', 'Vilc→Elvira',
        ],
        'vuelta': [
            'La Elvira', 'Comunidades', 'Quinara', 'Tumianuma', 'Moyococha', 'Solanda', 'Santorum',
            'Linderos', 'Cucanama', 'Vilcabamba', 'San Pedro', 'Cararango', 'Cavianga', 'Taxiche',
            'Malacatos', 'La Peña', 'Landangui', 'Chorrillos', 'Nangora', 'Porvenir', 'Granadillo',
            'Yamba', 'Rumizhitana', 'Tres Leguas', 'Pueblo Nuevo', 'Cajánuma', 'Dos Puentes', 'Capulí',
            'Mal→LaPeña', 'Mal→Land', 'Mal→Chorri', 'Mal→Nango', 'Mal→Porv',
            'Mal→Gran', 'Mal→Yamba', 'Mal→Rumi', 'Mal→T.Leguas', 'Mal→P.Nuevo',
            'Mal→Caja', 'Mal→D.Puen', 'Mal→Capulí',
            'D.Puen→Loja', 'Caja→Loja', 'P.Nuevo→Loja', 'T.Leguas→Loja',
            'Rumi→Loja', 'Yamba→Loja', 'Gran→Loja', 'Porv→Loja',
            'Nango→Loja', 'Chorri→Loja', 'Land→Loja', 'Peña→Loja',
            'Mal→Loja', 'Taxich→Loja', 'Cavian→Loja', 'Carar→Loja', 'S.Pedro→Loja',
            'Vilc→Loja',
            'Mal→Cucan', 'Mal→Lind', 'Mal→Santo', 'Mal→Solan', 'Mal→Moyoc', 'Mal→Tumia',
            'Mal→Quina', 'Mal→Comun', 'Mal→Elvira', 'Vilc→Cucan', 'Vilc→Lind', 'Vilc→Santo',
            'Vilc→Solan', 'Vilc→Moyoc', 'Vilc→Tumia', 'Vilc→Quina', 'Vilc→Comun', 'Vilc→Elvira',
        ],
    },
    'Loja - Yangana': {
        'ida': [
            'Dos Puentes', 'Cajánuma', 'Pueblo Nuevo', 'Tres Leguas', 'Rumizhitana', 'Yamba',
            'Granadillo', 'Porvenir', 'Nangora', 'Chorrillos', 'Landangui', 'La Peña', 'Malacatos',
            'Taxiche', 'Cavianga', 'Cararango', 'San Pedro', 'Vilcabamba', 'Masanamaca', 'Suro',
            'Yangana', 'Vilc→Masan', 'Vilc→Suro', 'Vilc→Yangana', 'Mal→Masan', 'Mal→Suro', 'Mal→Yangana',
        ],
        'vuelta': [
            'Yangana', 'Suro', 'Masanamaca', 'Vilcabamba', 'San Pedro', 'Cararango', 'Cavianga',
            'Taxiche', 'Malacatos', 'La Peña', 'Landangui', 'Chorrillos', 'Nangora', 'Porvenir',
            'Granadillo', 'Yamba', 'Rumizhitana', 'Tres Leguas', 'Pueblo Nuevo', 'Cajánuma',
            'Dos Puentes', 'Capulí',
            'Vilc→S.Pedro', 'Vilc→Carar', 'Vilc→Cavian', 'Vilc→Taxich', 'Vilc→Malac',
            'Vilc→Land', 'Vilc→Chorri', 'Vilc→Nango', 'Vilc→Porv', 'Vilc→Gran',
            'Vilc→Yamba', 'Vilc→Rumi', 'Vilc→T.Leguas', 'Vilc→P.Nuevo', 'Vilc→Caja',
            'Vilc→D.Puen', 'Vilc→Capulí',
            'Mal→LaPeña', 'Mal→Land', 'Mal→Chorri', 'Mal→Nango', 'Mal→Porv',
            'Mal→Gran', 'Mal→Yamba', 'Mal→Rumi', 'Mal→T.Leguas', 'Mal→P.Nuevo',
            'Mal→Caja', 'Mal→D.Puen', 'Mal→Capulí',
        ],
    },
    'Vilcabamba - Loja': {
        'ida': [
            'San Pedro', 'Cararango', 'Cavianga', 'Taxiche', 'Malacatos', 'La Peña', 'Landangui',
            'Chorrillos', 'Nangora', 'Porvenir', 'Granadillo', 'Yamba', 'Rumizhitana', 'Tres Leguas',
            'Pueblo Nuevo', 'Cajánuma', 'Dos Puentes', 'Capulí', 'Loja',
        ],
        'vuelta': [
            'Loja', 'Capulí', 'Dos Puentes', 'Cajánuma', 'Pueblo Nuevo', 'Tres Leguas', 'Rumizhitana',
            'Yamba', 'Granadillo', 'Porvenir', 'Nangora', 'Chorrillos', 'Landangui', 'La Peña',
            'Malacatos', 'Taxiche', 'Cavianga', 'Cararango', 'San Pedro', 'Vilcabamba',
        ],
    },
    'Zahuayco - Loja': {
        'ida': [
            'Zahuayco', 'Palmira', 'Quinara', 'Masanamaca', 'Vilcabamba', 'San Pedro', 'Cararango',
            'Cavianga', 'Taxiche', 'Malacatos', 'La Peña', 'Landangui', 'Chorrillos', 'Nangora',
            'Porvenir', 'Granadillo', 'Yamba', 'Rumizhitana', 'Tres Leguas', 'Pueblo Nuevo',
            'Cajánuma', 'Dos Puentes', 'Capulí',
        ],
        'vuelta': [
            'Capulí', 'Dos Puentes', 'Cajánuma', 'Pueblo Nuevo', 'Tres Leguas', 'Rumizhitana',
            'Yamba', 'Granadillo', 'Porvenir', 'Nangora', 'Chorrillos', 'Landangui', 'La Peña',
            'Malacatos', 'Taxiche', 'Cavianga', 'Cararango', 'San Pedro', 'Vilcabamba', 'Masanamaca',
            'Quinara', 'Palmira', 'Zahuayco',
        ],
    },
    'La Elvira - Loja': {
        'ida': [
            'La Elvira', 'Tumianuma', 'Comunidades', 'Santorum', 'Moyococha', 'Linderos', 'Cucanama',
            'Vilcabamba', 'San Pedro', 'Cararango', 'Cavianga', 'Taxiche', 'Malacatos', 'La Peña',
            'Landangui', 'Chorrillos', 'Nangora', 'Porvenir', 'Granadillo', 'Yamba', 'Rumizhitana',
            'Tres Leguas', 'Pueblo Nuevo', 'Cajánuma', 'Dos Puentes', 'Capulí',
        ],
        'vuelta': [
            'Capulí', 'Dos Puentes', 'Cajánuma', 'Pueblo Nuevo', 'Tres Leguas', 'Rumizhitana',
            'Yamba', 'Granadillo', 'Porvenir', 'Nangora', 'Chorrillos', 'Landangui', 'La Peña',
            'Malacatos', 'Taxiche', 'Cavianga', 'Cararango', 'San Pedro', 'Vilcabamba', 'Cucanama',
            'Linderos', 'Moyococha', 'Santorum', 'Comunidades', 'Tumianuma', 'La Elvira',
        ],
    },
    'Yangana - Loja': {
        'ida': [
            'Yangana', 'Suro', 'Masanamaca', 'Vilcabamba', 'San Pedro', 'Cararango', 'Cavianga',
            'Taxiche', 'Malacatos', 'La Peña', 'Landangui', 'Chorrillos', 'Nangora', 'Porvenir',
            'Granadillo', 'Yamba', 'Rumizhitana', 'Tres Leguas', 'Pueblo Nuevo', 'Cajánuma',
            'Dos Puentes', 'Capulí',
        ],
        'vuelta': [
            'Capulí', 'Dos Puentes', 'Cajánuma', 'Pueblo Nuevo', 'Tres Leguas', 'Rumizhitana',
            'Yamba', 'Granadillo', 'Porvenir', 'Nangora', 'Chorrillos', 'Landangui', 'La Peña',
            'Malacatos', 'Taxiche', 'Cavianga', 'Cararango', 'San Pedro', 'Vilcabamba', 'Masanamaca',
            'Suro', 'Yangana',
        ],
    },
}

# ─── Build tables ───
HEADER_BG = colors.HexColor('#1e3a5f')
ALT_ROW = colors.HexColor('#f1f5f9')
WHITE = colors.white

def make_table(paradas, label):
    data = [[
        Paragraph('#', s_header),
        Paragraph('Parada', s_header),
        Paragraph('Normal', s_header),
        Paragraph('Media', s_header),
    ]]
    for i, p in enumerate(paradas, 1):
        data.append([
            Paragraph(str(i), s_cell_center),
            Paragraph(p, s_cell),
            Paragraph('$0.00', s_cell_center),
            Paragraph('$0.00', s_cell_center),
        ])
    col_w = [0.08*W, 0.57*W, 0.175*W, 0.175*W]
    t = Table(data, colWidths=col_w, repeatRows=1)
    style_cmds = [
        ('BACKGROUND', (0,0), (-1,0), HEADER_BG),
        ('TEXTCOLOR', (0,0), (-1,0), WHITE),
        ('FONTNAME', (0,0), (-1,0), 'DejaVu-Bold'),
        ('FONTSIZE', (0,0), (-1,0), 8),
        ('BOTTOMPADDING', (0,0), (-1,0), 6),
        ('TOPPADDING', (0,0), (-1,0), 6),
        ('GRID', (0,0), (-1,-1), 0.4, colors.HexColor('#cbd5e1')),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,1), (-1,-1), 3),
        ('BOTTOMPADDING', (0,1), (-1,-1), 3),
    ]
    for i in range(2, len(data), 2):
        style_cmds.append(('BACKGROUND', (0,i), (-1,i), ALT_ROW))
    t.setStyle(TableStyle(style_cmds))
    return t

elements = []

# ─── Title ───
elements.append(Paragraph('RutaGo - Tarifas de Precios', s_title))
elements.append(Paragraph('TRANSPORTES VILCABAMBATURIS C.I.A. LTDA. | Todos los precios en $0.00 (sin tarifa asignada)', s_subtitle))
elements.append(Spacer(1, 2*mm))

# ─── Summary row ───
total_paradas = sum(len(d['ida']) + len(d['vuelta']) for d in RUTAS.values())
elements.append(Paragraph(f'Total rutas: {len(RUTAS)} | Total paradas (ida + vuelta): {total_paradas}', s_note))
elements.append(Spacer(1, 4*mm))

for ruta_name, dirs in RUTAS.items():
    # Route heading
    elements.append(Paragraph(ruta_name, s_route))
    
    # Ida table
    elements.append(Paragraph('IDA (hacia destino)', s_dir))
    elements.append(make_table(dirs['ida'], 'Ida'))
    
    # Vuelta table
    elements.append(Paragraph('VUELTA (hacia Loja)', s_dir))
    elements.append(make_table(dirs['vuelta'], 'Vuelta'))

doc.build(elements)
print(f'PDF generado: {OUTPUT}')
print(f'Rutas: {len(RUTAS)} | Paradas totales: {total_paradas}')
