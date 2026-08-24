import sys, os, re

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, cm
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
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

W = A4[0] - 3*cm

s_title = ParagraphStyle('Title', fontName='DejaVu-Bold', fontSize=20, leading=26, spaceAfter=3*mm, textColor=colors.HexColor('#1e3a5f'))
s_subtitle = ParagraphStyle('Subtitle', fontName='DejaVu', fontSize=9, leading=12, spaceAfter=6*mm, textColor=colors.HexColor('#64748b'))
s_route = ParagraphStyle('Route', fontName='DejaVu-Bold', fontSize=12, leading=16, spaceBefore=5*mm, spaceAfter=2*mm, textColor=colors.HexColor('#1e40af'))
s_dir = ParagraphStyle('Dir', fontName='DejaVu-Bold', fontSize=9, leading=13, spaceBefore=3*mm, spaceAfter=2*mm, textColor=colors.HexColor('#475569'))
s_header = ParagraphStyle('Header', fontName='DejaVu-Bold', fontSize=7.5, leading=10, textColor=colors.white)
s_cell = ParagraphStyle('Cell', fontName='DejaVu', fontSize=7.5, leading=10)
s_cell_center = ParagraphStyle('CellC', fontName='DejaVu', fontSize=7.5, leading=10, alignment=1)
s_note = ParagraphStyle('Note', fontName='DejaVu', fontSize=8, leading=11, textColor=colors.HexColor('#64748b'), spaceBefore=3*mm)
s_zero = ParagraphStyle('Zero', fontName='DejaVu', fontSize=7.5, leading=10, alignment=1, textColor=colors.HexColor('#cbd5e1'))
s_price = ParagraphStyle('Price', fontName='DejaVu-Bold', fontSize=7.5, leading=10, alignment=1, textColor=colors.HexColor('#16a34a'))

# ─── Read prices from tarifas-data.ts ───
with open('/home/z/my-project/src/lib/tarifas-data.ts', 'r') as f:
    ts_content = f.read()

# Parse preciosIda
def parse_price_map(section_text):
    prices = {}
    for m in re.finditer(r"'([^']+)':\s*\{\s*normal:\s*([0-9.]+),\s*media:\s*([0-9.]+)\s*\}", section_text):
        parada, normal, media = m.group(1), float(m.group(2)), float(m.group(3))
        prices[parada] = (normal, media)
    return prices

# Extract preciosIda section
ida_match = re.search(r'const preciosIda.*?=(\s*\{.*?\n\});', ts_content, re.DOTALL)
precios_ida = parse_price_map(ida_match.group(1)) if ida_match else {}

# Extract preciosVuelta section
vuelta_match = re.search(r'const preciosVuelta.*?=(\s*\{.*?\n\});', ts_content, re.DOTALL)
precios_vuelta = parse_price_map(vuelta_match.group(1)) if vuelta_match else {}

# Extract specific vuelta maps
vuelta_maps = {}
for name in ['preciosVueltaElTambo', 'preciosVueltaYangana', 'preciosVueltaVilcabamba', 'preciosVueltaLaElvira']:
    m = re.search(rf'const {name}.*?=(\s*\{{.*?\n\}});', ts_content, re.DOTALL)
    if m:
        vuelta_maps[name] = parse_price_map(m.group(1))

# ─── Route definitions (updated with Capuli first) ───
RUTAS = {
    'Loja - Vilcabamba': {
        'ida': [
            'Capulí', 'Dos Puentes', 'Caj\u00e1numa', 'Pueblo Nuevo', 'Tres Leguas', 'Rumizhitana', 'Yamba',
            'Granadillo', 'Porvenir', 'Nangora', 'Chorrillos', 'Landangui', 'La Pe\u00f1a', 'Malacatos',
            'Taxiche', 'Cavianga', 'Cararango', 'San Pedro', 'Vilcabamba', 'Pe\u00f1a\u2192Mal', 'Land\u2192Mal',
            'Chorri\u2192Mal', 'Nango\u2192Mal', 'Porv\u2192Mal', 'Gran\u2192Mal', 'Yamba\u2192Mal', 'Rumi\u2192Mal', 'T.Leguas\u2192Mal',
            'P.Nuevo\u2192Mal', 'Caja\u2192Mal', 'D.Puen\u2192Mal', 'Capul\u00ed\u2192Mal',
            'S.Pedro\u2192Vilc', 'Carar\u2192Vilc', 'Cavian\u2192Vilc', 'Taxich\u2192Vilc', 'Mal\u2192Vilc', 'Land\u2192Vilc', 'Pe\u00f1a\u2192Vilc',
            'Chorri\u2192Vilc', 'Nango\u2192Vilc', 'Porv\u2192Vilc', 'Gran\u2192Vilc', 'Yamba\u2192Vilc', 'Rumi\u2192Vilc', 'T.Leguas\u2192Vilc',
            'P.Nuevo\u2192Vilc', 'Caja\u2192Vilc', 'D.Puen\u2192Vilc', 'Capul\u00ed\u2192Vilc',
        ],
        'vuelta': [
            'San Pedro', 'Cararango', 'Cavianga', 'Taxiche', 'Malacatos', 'La Pe\u00f1a', 'Landangui',
            'Chorrillos', 'Nangora', 'Porvenir', 'Granadillo', 'Yamba', 'Rumizhitana', 'Tres Leguas',
            'Pueblo Nuevo', 'Caj\u00e1numa', 'Dos Puentes', 'Capul\u00ed', 'Loja',
            'Mal\u2192Pe\u00f1a', 'Mal\u2192Land', 'Mal\u2192Chorri', 'Mal\u2192Nango', 'Mal\u2192Porv',
            'Mal\u2192Gran', 'Mal\u2192Yamba', 'Mal\u2192Rumi', 'Mal\u2192T.Leguas', 'Mal\u2192P.Nuevo',
            'Mal\u2192Caja', 'Mal\u2192D.Puen', 'Mal\u2192Capul\u00ed',
            'D.Puen\u2192Loja', 'Caja\u2192Loja', 'P.Nuevo\u2192Loja', 'T.Leguas\u2192Loja',
            'Rumi\u2192Loja', 'Yamba\u2192Loja', 'Gran\u2192Loja', 'Porv\u2192Loja',
            'Nango\u2192Loja', 'Chorri\u2192Loja', 'Land\u2192Loja', 'Pe\u00f1a\u2192Loja',
            'Mal\u2192Loja', 'Taxich\u2192Loja', 'Cavian\u2192Loja', 'Carar\u2192Loja', 'S.Pedro\u2192Loja',
        ],
    },
    'Loja - Zahuayco': {
        'ida': [
            'Capulí', 'Dos Puentes', 'Caj\u00e1numa', 'Pueblo Nuevo', 'Tres Leguas', 'Rumizhitana', 'Yamba',
            'Granadillo', 'Porvenir', 'Nangora', 'Chorrillos', 'Landangui', 'La Pe\u00f1a', 'Malacatos',
            'Taxiche', 'Cavianga', 'Cararango', 'San Pedro', 'Vilcabamba', 'Masanamaca', 'Quinara',
            'Chumberos', 'Palmira', 'Zahuayco', 'Vilc\u2192Masan', 'Vilc\u2192Quina', 'Vilc\u2192Chumb', 'Vilc\u2192Palm',
            'Vilc\u2192Zahua', 'Mal\u2192Masan', 'Mal\u2192Quina', 'Mal\u2192Chumb', 'Mal\u2192Palm', 'Mal\u2192Zahua',
        ],
        'vuelta': [
            'Zahuayco', 'Palmira', 'Quinara', 'Masanamaca', 'Vilcabamba', 'San Pedro', 'Cararango',
            'Cavianga', 'Taxiche', 'Malacatos', 'La Pe\u00f1a', 'Landangui', 'Chorrillos', 'Nangora',
            'Porvenir', 'Granadillo', 'Yamba', 'Rumizhitana', 'Tres Leguas', 'Pueblo Nuevo',
            'Caj\u00e1numa', 'Dos Puentes', 'Capul\u00ed',
        ],
    },
    'Loja - El Tambo': {
        'ida': [
            'Capulí', 'Dos Puentes', 'Caj\u00e1numa', 'Pueblo Nuevo', 'Tres Leguas', 'Rumizhitana', 'Yamba',
            'Granadillo', 'Porvenir', 'Nangora', 'Chorrillos', 'Landangui', 'La Pe\u00f1a', 'Malacatos',
            'Ceibopamba', 'Trinidad', 'San Jos\u00e9', 'Santo Domingo', 'Naranjo Dulce', 'Zhotahuayco',
            'La Merced', 'San Agust\u00edn', 'La Era', 'La Capilla', 'San Bernaved', 'El Tambo', 'Mal\u2192Ceibop',
            'Mal\u2192Trinidad', 'Mal\u2192S.Jose', 'Mal\u2192StoDom', 'Mal\u2192N.Dulce', 'Mal\u2192Zhotahu', 'Mal\u2192LaMerc',
            'Mal\u2192S.Agust', 'Mal\u2192LaEra', 'Mal\u2192LaCap', 'Mal\u2192S.Bern', 'Mal\u2192ElTambo',
        ],
        'vuelta': [
            'El Tambo', 'San Bernaved', 'La Capilla', 'La Era', 'San Agust\u00edn', 'La Merced', 'Zhotahuayco',
            'Naranjo Dulce', 'Santo Domingo', 'San Jos\u00e9', 'Ceibopamba', 'Trinidad', 'Malacatos',
            'La Pe\u00f1a', 'Landangui', 'Chorrillos', 'Nangora', 'Porvenir', 'Granadillo', 'Yamba',
            'Rumizhitana', 'Tres Leguas', 'Pueblo Nuevo', 'Caj\u00e1numa', 'Dos Puentes', 'Capul\u00ed',
            'Mal\u2192Pe\u00f1a', 'Mal\u2192Land', 'Mal\u2192Chorri', 'Mal\u2192Nango', 'Mal\u2192Porv',
            'Mal\u2192Gran', 'Mal\u2192Yamba', 'Mal\u2192Rumi', 'Mal\u2192T.Leguas', 'Mal\u2192P.Nuevo',
            'Mal\u2192Caja', 'Mal\u2192D.Puen', 'Mal\u2192Capul\u00ed',
            'D.Puen\u2192Loja', 'Caja\u2192Loja', 'P.Nuevo\u2192Loja', 'T.Leguas\u2192Loja',
            'Rumi\u2192Loja', 'Yamba\u2192Loja', 'Gran\u2192Loja', 'Porv\u2192Loja',
            'Nango\u2192Loja', 'Chorri\u2192Loja', 'Land\u2192Loja', 'Pe\u00f1a\u2192Loja', 'Mal\u2192Loja',
            'LaCap\u2192Loja', 'S.Bern\u2192Loja',
        ],
    },
    'Loja - La Elvira': {
        'ida': [
            'Capulí', 'Dos Puentes', 'Caj\u00e1numa', 'Pueblo Nuevo', 'Tres Leguas', 'Rumizhitana', 'Yamba',
            'Granadillo', 'Porvenir', 'Nangora', 'Chorrillos', 'Landangui', 'La Pe\u00f1a', 'Malacatos',
            'Taxiche', 'Cavianga', 'Cararango', 'San Pedro', 'Vilcabamba', 'Cucanama', 'Linderos',
            'Santorum', 'Solanda', 'Moyococha', 'Tumianuma', 'Quinara', 'Comunidades', 'La Elvira',
            'Mal\u2192Cucan', 'Mal\u2192Lind', 'Mal\u2192Santo', 'Mal\u2192Solan', 'Mal\u2192Moyoc', 'Mal\u2192Tumia', 'Mal\u2192Quina',
            'Mal\u2192Comun', 'Mal\u2192Elvira', 'Vilc\u2192Cucan', 'Vilc\u2192Lind', 'Vilc\u2192Santo', 'Vilc\u2192Solan',
            'Vilc\u2192Moyoc', 'Vilc\u2192Tumia', 'Vilc\u2192Quina', 'Vilc\u2192Comun', 'Vilc\u2192Elvira',
        ],
        'vuelta': [
            'La Elvira', 'Comunidades', 'Quinara', 'Tumianuma', 'Moyococha', 'Solanda', 'Santorum',
            'Linderos', 'Cucanama', 'Vilcabamba', 'San Pedro', 'Cararango', 'Cavianga', 'Taxiche',
            'Malacatos', 'La Pe\u00f1a', 'Landangui', 'Chorrillos', 'Nangora', 'Porvenir', 'Granadillo',
            'Yamba', 'Rumizhitana', 'Tres Leguas', 'Pueblo Nuevo', 'Caj\u00e1numa', 'Dos Puentes', 'Capul\u00ed',
            'Mal\u2192Pe\u00f1a', 'Mal\u2192Land', 'Mal\u2192Chorri', 'Mal\u2192Nango', 'Mal\u2192Porv',
            'Mal\u2192Gran', 'Mal\u2192Yamba', 'Mal\u2192Rumi', 'Mal\u2192T.Leguas', 'Mal\u2192P.Nuevo',
            'Mal\u2192Caja', 'Mal\u2192D.Puen', 'Mal\u2192Capul\u00ed',
            'D.Puen\u2192Loja', 'Caja\u2192Loja', 'P.Nuevo\u2192Loja', 'T.Leguas\u2192Loja',
            'Rumi\u2192Loja', 'Yamba\u2192Loja', 'Gran\u2192Loja', 'Porv\u2192Loja',
            'Nango\u2192Loja', 'Chorri\u2192Loja', 'Land\u2192Loja', 'Pe\u00f1a\u2192Loja',
            'Mal\u2192Loja', 'Taxich\u2192Loja', 'Cavian\u2192Loja', 'Carar\u2192Loja', 'S.Pedro\u2192Loja',
            'Vilc\u2192Loja',
            'Mal\u2192Cucan', 'Mal\u2192Lind', 'Mal\u2192Santo', 'Mal\u2192Solan', 'Mal\u2192Moyoc', 'Mal\u2192Tumia',
            'Mal\u2192Quina', 'Mal\u2192Comun', 'Mal\u2192Elvira', 'Vilc\u2192Cucan', 'Vilc\u2192Lind', 'Vilc\u2192Santo',
            'Vilc\u2192Solan', 'Vilc\u2192Moyoc', 'Vilc\u2192Tumia', 'Vilc\u2192Quina', 'Vilc\u2192Comun', 'Vilc\u2192Elvira',
        ],
    },
    'Loja - Yangana': {
        'ida': [
            'Capulí', 'Dos Puentes', 'Caj\u00e1numa', 'Pueblo Nuevo', 'Tres Leguas', 'Rumizhitana', 'Yamba',
            'Granadillo', 'Porvenir', 'Nangora', 'Chorrillos', 'Landangui', 'La Pe\u00f1a', 'Malacatos',
            'Taxiche', 'Cavianga', 'Cararango', 'San Pedro', 'Vilcabamba', 'Masanamaca', 'Suro',
            'Yangana', 'Vilc\u2192Masan', 'Vilc\u2192Suro', 'Vilc\u2192Yangana', 'Mal\u2192Masan', 'Mal\u2192Suro', 'Mal\u2192Yangana',
        ],
        'vuelta': [
            'Yangana', 'Suro', 'Masanamaca', 'Vilcabamba', 'San Pedro', 'Cararango', 'Cavianga',
            'Taxiche', 'Malacatos', 'La Pe\u00f1a', 'Landangui', 'Chorrillos', 'Nangora', 'Porvenir',
            'Granadillo', 'Yamba', 'Rumizhitana', 'Tres Leguas', 'Pueblo Nuevo', 'Caj\u00e1numa',
            'Dos Puentes', 'Capul\u00ed',
            'Vilc\u2192S.Pedro', 'Vilc\u2192Carar', 'Vilc\u2192Cavian', 'Vilc\u2192Taxich', 'Vilc\u2192Malac',
            'Vilc\u2192Land', 'Vilc\u2192Chorri', 'Vilc\u2192Nango', 'Vilc\u2192Porv', 'Vilc\u2192Gran',
            'Vilc\u2192Yamba', 'Vilc\u2192Rumi', 'Vilc\u2192T.Leguas', 'Vilc\u2192P.Nuevo', 'Vilc\u2192Caja',
            'Vilc\u2192D.Puen', 'Vilc\u2192Capul\u00ed',
            'Mal\u2192Pe\u00f1a', 'Mal\u2192Land', 'Mal\u2192Chorri', 'Mal\u2192Nango', 'Mal\u2192Porv',
            'Mal\u2192Gran', 'Mal\u2192Yamba', 'Mal\u2192Rumi', 'Mal\u2192T.Leguas', 'Mal\u2192P.Nuevo',
            'Mal\u2192Caja', 'Mal\u2192D.Puen', 'Mal\u2192Capul\u00ed',
        ],
    },
    # Rutas invertidas eliminadas (eran duplicados de las rutas base arriba):
    # 'Vilcabamba - Loja' = 'Loja - Vilcabamba' al revés
    # 'Zahuayco - Loja'  = 'Loja - Zahuayco'  al revés
    # 'La Elvira - Loja' = 'Loja - La Elvira'  al revés
    # 'Yangana - Loja'   = 'Loja - Yangana'   al revés
}

HEADER_BG = colors.HexColor('#1e3a5f')
ALT_ROW = colors.HexColor('#f1f5f9')
WHITE = colors.white
ZERO_COLOR = colors.HexColor('#e2e8f0')

# Price lookup: only from the correct map, NO fallback
def get_price_ida(parada):
    if parada in precios_ida:
        return precios_ida[parada]
    return (0, 0)

def get_price_vuelta(parada):
    if parada in precios_vuelta:
        return precios_vuelta[parada]
    for name, pm in vuelta_maps.items():
        if parada in pm:
            return pm[parada]
    return (0, 0)

def make_table(paradas, price_fn):
    data = [[
        Paragraph('#', s_header),
        Paragraph('Parada', s_header),
        Paragraph('Normal', s_header),
        Paragraph('Medio', s_header),
    ]]
    for i, p in enumerate(paradas, 1):
        normal, media = price_fn(p)
        if normal > 0:
            n_cell = Paragraph(f'${normal:.2f}', s_price)
            m_cell = Paragraph(f'${media:.2f}', s_price)
        else:
            n_cell = Paragraph('$0.00', s_zero)
            m_cell = Paragraph('$0.00', s_zero)
        data.append([
            Paragraph(str(i), s_cell_center),
            Paragraph(p, s_cell),
            n_cell,
            m_cell,
        ])
    col_w = [0.07*W, 0.58*W, 0.175*W, 0.175*W]
    t = Table(data, colWidths=col_w, repeatRows=1)
    style_cmds = [
        ('BACKGROUND', (0,0), (-1,0), HEADER_BG),
        ('TEXTCOLOR', (0,0), (-1,0), WHITE),
        ('GRID', (0,0), (-1,-1), 0.3, colors.HexColor('#cbd5e1')),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,0), 5),
        ('BOTTOMPADDING', (0,0), (-1,0), 5),
        ('TOPPADDING', (0,1), (-1,-1), 2.5),
        ('BOTTOMPADDING', (0,1), (-1,-1), 2.5),
    ]
    for i in range(2, len(data), 2):
        style_cmds.append(('BACKGROUND', (0,i), (-1,i), ALT_ROW))
    t.setStyle(TableStyle(style_cmds))
    return t

elements = []
elements.append(Paragraph('RutaGo - Tarifas de Precios', s_title))
elements.append(Paragraph('TRANSPORTES VILCABAMBATURIS C.I.A. LTDA. | IDA + VUELTA Loja ↔ Vilcabamba completas', s_subtitle))

# Count stats
loaded_ida = sum(1 for p in precios_ida.values() if p != (0,0))
loaded_vuelta = sum(1 for p in precios_vuelta.values() if p != (0,0))
elements.append(Paragraph(f'Rutas: {len(RUTAS)} | IDA cargados: {loaded_ida} | VUELTA cargados: {loaded_vuelta} | Pendientes: {len(precios_ida) + len(precios_vuelta) - loaded_ida - loaded_vuelta}', s_note))
elements.append(Spacer(1, 3*mm))

for ruta_name, dirs in RUTAS.items():
    elements.append(Paragraph(ruta_name, s_route))
    elements.append(Paragraph('IDA (hacia destino)', s_dir))
    elements.append(make_table(dirs['ida'], get_price_ida))
    elements.append(Paragraph('VUELTA (hacia Loja)', s_dir))
    elements.append(make_table(dirs['vuelta'], get_price_vuelta))

doc.build(elements)
print(f'PDF generado: {OUTPUT}')
