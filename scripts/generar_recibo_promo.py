#!/usr/bin/env python3
"""
Genera mockup visual del recibo RutaGo para impresora termica 58mm
y documento PDF con la promocion "Viaje Gratis"
"""

import sys, os

# Setup paths
PDF_SKILL_DIR = os.path.join(os.path.dirname(__file__), '..', 'skills', 'pdf')
_scripts = os.path.join(PDF_SKILL_DIR, 'scripts')
if _scripts not in sys.path:
    sys.path.insert(0, _scripts)

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, cm
from reportlab.lib.colors import HexColor, black, white
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer, Image,
                                 Table, TableStyle, PageBreak, KeepTogether,
                                 HRFlowable)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# Register fonts
pdfmetrics.registerFont(TTFont('SarasaMono', '/usr/share/fonts/truetype/chinese/SarasaMonoSC-Regular.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuMono', '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuSans', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'))
pdfmetrics.registerFont(TTFont('Liberation', '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf'))

# ─── Color palette (RutaGo) ───
ROJO = HexColor('#912D26')
GRIS = HexColor('#3A3A3A')
PLATA = HexColor('#D6D6D6')
BG_LIGHT = HexColor('#FAFAFA')
BG_WARM = HexColor('#FFF8F6')

OUTPUT_DIR = '/home/z/my-project/download'
os.makedirs(OUTPUT_DIR, exist_ok=True)

# ─── PART 1: Generate Receipt Mockup Image using Playwright ───

RECEIPT_HTML = '''
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    padding: 40px;
    background: #f0f0f0;
    font-family: 'Courier New', 'DejaVu Sans Mono', monospace;
    gap: 60px;
  }
  .label {
    font-family: 'DejaVu Sans', Arial, sans-serif;
    font-size: 13px;
    color: #666;
    text-align: center;
    margin-bottom: -40px;
  }
  .receipt-wrapper {
    filter: drop-shadow(2px 4px 8px rgba(0,0,0,0.15));
  }
  .receipt {
    width: 384px;  /* 48mm printable at ~203 DPI */
    background: #fff;
    padding: 16px 12px;
    font-size: 13px;
    color: #000;
    line-height: 1.5;
    position: relative;
  }
  .receipt::before {
    content: '';
    position: absolute;
    left: 0; right: 0; bottom: -10px;
    height: 10px;
    background: linear-gradient(135deg, #fff 33.33%, transparent 33.33%) 0 0,
                linear-gradient(225deg, #fff 33.33%, transparent 33.33%) 0 0;
    background-size: 12px 10px;
  }
  .receipt::after {
    content: '';
    position: absolute;
    left: 0; right: 0; top: -10px;
    height: 10px;
    background: linear-gradient(315deg, #fff 33.33%, transparent 33.33%) 0 0,
                linear-gradient(45deg, #fff 33.33%, transparent 33.33%) 0 0;
    background-size: 12px 10px;
  }
  .center { text-align: center; }
  .bold { font-weight: bold; }
  .big { font-size: 18px; font-weight: bold; letter-spacing: 3px; }
  .subtitle { font-size: 10px; color: #555; }
  .line { border-top: 1px dashed #000; margin: 6px 0; }
  .line-double { border-top: 2px solid #000; margin: 6px 0; }
  .line-thin { border-top: 1px solid #999; margin: 4px 0; }
  .spacer { height: 6px; }
  .spacer-sm { height: 3px; }
  .row { display: flex; justify-content: space-between; }
  .row-label { color: #555; }
  .row-value { font-weight: bold; }
  .amount { font-size: 22px; font-weight: bold; }
  .ticket-num { font-size: 16px; font-weight: bold; letter-spacing: 1px; }
  .promo-box {
    margin-top: 6px;
    padding: 8px 6px;
    border: 2px solid #000;
    text-align: center;
  }
  .promo-title {
    font-size: 11px;
    font-weight: bold;
    letter-spacing: 1px;
  }
  .promo-star { font-size: 9px; letter-spacing: 6px; margin: 2px 0; }
  .promo-msg {
    font-size: 14px;
    font-weight: bold;
    letter-spacing: 2px;
  }
  .promo-footer {
    font-size: 9px;
    color: #555;
    margin-top: 4px;
  }
  .footer-text { font-size: 8px; color: #777; text-align: center; }
  .tear-line {
    border-top: 2px dashed #555;
    margin: 8px 0;
    position: relative;
  }
  .tear-line::before {
    content: '✂';
    position: absolute;
    left: 50%;
    top: -9px;
    transform: translateX(-50%);
    background: #fff;
    padding: 0 4px;
    font-size: 10px;
  }
  /* Second receipt - pasajero keeps */
  .receipt-pasajero {
    width: 384px;
    background: #fff;
    padding: 16px 12px;
    font-size: 13px;
    color: #000;
    line-height: 1.5;
    position: relative;
  }
  .mini { font-size: 9px; color: #777; }
  .barcode-area {
    text-align: center;
    padding: 6px 0;
  }
  .barcode {
    display: inline-block;
    font-family: 'Libre Barcode 39', 'Code39Sans', cursive;
    font-size: 28px;
    letter-spacing: 2px;
    color: #000;
  }
  .barcode-fallback {
    font-family: 'Courier New', monospace;
    font-size: 20px;
    font-weight: bold;
    letter-spacing: 4px;
    transform: scaleY(1.4);
    display: inline-block;
  }
  /* Comparison: 3 receipt variants side by side */
  .comparison {
    display: flex;
    gap: 30px;
    flex-wrap: wrap;
    justify-content: center;
  }
  .comparison .label {
    margin-bottom: 10px;
  }
</style>
</head>
<body>

<!-- ═══════════════════════════════════════ -->
<!-- RECIBO COMPLETO: Ayudante entrega TODO  -->
<!-- ═══════════════════════════════════════ -->
<div>
  <div class="label">RECIBO COMPLETO - Se entrega integro al pasajero</div>
  <div class="receipt-wrapper">
    <div class="receipt">
      <!-- Header -->
      <div class="center">
        <div class="big">RUTAGO</div>
        <div class="subtitle">Transportes Vilcabambaturis Cia. Ltda.</div>
        <div class="subtitle">RUC: 1790000000001</div>
      </div>
      <div class="line-double"></div>

      <!-- Route info -->
      <div class="row"><span class="row-label">VT:</span><span class="bold">Loja - Vilcabamba</span></div>
      <div class="row"><span class="row-label">Dir:</span><span class="bold">IDA</span></div>
      <div class="spacer-sm"></div>
      <div class="row"><span class="row-label">Fecha:</span><span>14/08/2026</span></div>
      <div class="row"><span class="row-label">Hora:</span><span>08:32</span></div>
      <div class="row"><span class="row-label">Ayudante:</span><span>Carlos M.</span></div>

      <div class="line"></div>

      <!-- Trip details -->
      <div class="row"><span class="row-label">Origen:</span><span class="bold">Terminal Loja</span></div>
      <div class="row"><span class="row-label">Destino:</span><span class="bold">Vilcabamba</span></div>
      <div class="row"><span class="row-label">Tipo:</span><span>ENTERO</span></div>
      <div class="spacer-sm"></div>
      <div class="row">
        <span class="row-label">Tarifa:</span>
        <span class="amount">$2.50</span>
      </div>

      <div class="line"></div>

      <!-- Ticket number -->
      <div class="center">
        <div class="spacer-sm"></div>
        <div class="ticket-num">Boleto N. 0047</div>
        <div class="spacer-sm"></div>
      </div>

      <!-- Barcode area -->
      <div class="barcode-area">
        <div class="barcode-fallback">||||||| ||| ||| ||| |||| ||</div>
        <div class="mini">0047-14082026-0832</div>
      </div>

      <div class="line"></div>

      <!-- PROMO BOX -->
      <div class="promo-box">
        <div class="promo-title">CONSERVE SU BOLETO</div>
        <div class="promo-star">* * *</div>
        <div class="promo-msg">VIAJE GRATIS</div>
        <div class="promo-star">* * *</div>
        <div class="spacer-sm"></div>
        <div class="promo-footer">Participe en el sorteo diario</div>
        <div class="promo-footer">Verifique en: rutago.vercel.app/sorteo</div>
      </div>

      <div class="line-double"></div>

      <!-- Footer -->
      <div class="center">
        <div class="footer-text">Gracias por viajar con nosotros</div>
        <div class="footer-text">RutaGo - Su transporte confiable</div>
      </div>
    </div>
  </div>
</div>


<!-- ═══════════════════════════════════════════════════ -->
<!-- RECIBO CORTO: Alternativa compacta (menos papel)    -->
<!-- ═══════════════════════════════════════════════════════ -->
<div>
  <div class="label">RECIBO COMPACTO - Alternativa con menos papel</div>
  <div class="receipt-wrapper">
    <div class="receipt">
      <div class="center">
        <div class="big">RUTAGO</div>
        <div class="subtitle">Vilcabambaturis</div>
      </div>
      <div class="line-double"></div>

      <div class="row"><span class="bold">Loja > Vilcabamba</span><span class="bold">IDA</span></div>
      <div class="row"><span class="row-label">Destino:</span><span class="bold">Vilcabamba</span></div>
      <div class="row"><span>14/08/26 08:32</span><span class="bold">ENTERO</span></div>
      <div class="spacer-sm"></div>
      <div class="row">
        <span class="row-label">Tarifa:</span>
        <span class="amount">$2.50</span>
      </div>

      <div class="line"></div>

      <div class="center">
        <div class="ticket-num">N. 0047</div>
      </div>
      <div class="barcode-area">
        <div class="barcode-fallback">||||||| ||| ||| ||| |||| ||</div>
      </div>

      <div class="line"></div>

      <div class="promo-box">
        <div class="promo-title">CONSERVE SU BOLETO</div>
        <div class="promo-msg">VIAJE GRATIS</div>
        <div class="promo-footer">Sorteo diario - rutago.vercel.app/sorteo</div>
      </div>

      <div class="line-double"></div>
      <div class="center">
        <div class="footer-text">Gracias por viajar con RutaGo</div>
      </div>
    </div>
  </div>
</div>

</body>
</html>
'''

# Write receipt HTML
receipt_html_path = os.path.join(OUTPUT_DIR, 'recibo_rutago_mockup.html')
with open(receipt_html_path, 'w', encoding='utf-8') as f:
    f.write(RECEIPT_HTML)

print(f"Receipt HTML written to: {receipt_html_path}")


# ─── PART 2: Take screenshot of receipt using Playwright ───
async def take_screenshot():
    from playwright.async_api import async_playwright
    
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(viewport={'width': 600, 'height': 2000})
        
        await page.goto(f'file://{receipt_html_path}')
        await page.wait_for_load_state('networkidle')
        
        # Get full page height
        height = await page.evaluate('document.body.scrollHeight')
        
        # Screenshot at 2x for print quality
        await page.set_viewport_size({'width': 600, 'height': height + 100})
        img_path = os.path.join(OUTPUT_DIR, 'recibo_rutago_mockup.png')
        await page.screenshot(path=img_path, full_page=True)
        
        await browser.close()
        print(f"Receipt screenshot saved to: {img_path}")
        return img_path

# Run screenshot
try:
    import asyncio
    img_path = asyncio.run(take_screenshot())
except Exception as e:
    print(f"Screenshot failed ({e}), will generate PDF without image")
    img_path = None


# ─── PART 3: Generate PDF Report with Promo System ───
PDF_PATH = os.path.join(OUTPUT_DIR, 'RutaGo_Recibo_Promocion_ViajeGratis.pdf')

doc = SimpleDocTemplate(
    PDF_PATH,
    pagesize=A4,
    leftMargin=2*cm,
    rightMargin=2*cm,
    topMargin=2.5*cm,
    bottomMargin=2*cm,
    title='RutaGo - Diseno de Recibo y Promocion Viaje Gratis',
    author='RutaGo',
    subject='Mockup recibo termico 58mm + promocion viaje gratis'
)

styles = getSampleStyleSheet()

# Custom styles
styles.add(ParagraphStyle(
    'MainTitle', parent=styles['Title'],
    fontName='DejaVuSans', fontSize=24, textColor=ROJO,
    spaceAfter=6, alignment=TA_CENTER, leading=30
))
styles.add(ParagraphStyle(
    'SubTitle', parent=styles['Normal'],
    fontName='DejaVuSans', fontSize=13, textColor=GRIS,
    spaceAfter=20, alignment=TA_CENTER, leading=18
))
styles.add(ParagraphStyle(
    'SectionTitle', parent=styles['Heading2'],
    fontName='DejaVuSans', fontSize=16, textColor=ROJO,
    spaceBefore=20, spaceAfter=10, leading=22
))
styles.add(ParagraphStyle(
    'SectionSubtitle', parent=styles['Heading3'],
    fontName='DejaVuSans', fontSize=13, textColor=GRIS,
    spaceBefore=14, spaceAfter=8, leading=18
))
styles.add(ParagraphStyle(
    'BodyText2', parent=styles['Normal'],
    fontName='DejaVuSans', fontSize=11, textColor=GRIS,
    spaceAfter=8, alignment=TA_JUSTIFY, leading=18,
    firstLineIndent=0
))
styles.add(ParagraphStyle(
    'BulletItem', parent=styles['Normal'],
    fontName='DejaVuSans', fontSize=11, textColor=GRIS,
    spaceAfter=6, leading=17, leftIndent=18, bulletIndent=6,
    bulletFontName='DejaVuSans', bulletFontSize=11
))
styles.add(ParagraphStyle(
    'Caption', parent=styles['Normal'],
    fontName='DejaVuSans', fontSize=9, textColor=PLATA,
    spaceAfter=4, alignment=TA_CENTER, leading=13
))
styles.add(ParagraphStyle(
    'Highlight', parent=styles['Normal'],
    fontName='DejaVuSans', fontSize=12, textColor=ROJO,
    spaceBefore=6, spaceAfter=8, leading=18,
    alignment=TA_CENTER
))
styles.add(ParagraphStyle(
    'TableHeader', parent=styles['Normal'],
    fontName='DejaVuSans', fontSize=10, textColor=white,
    alignment=TA_CENTER, leading=14
))
styles.add(ParagraphStyle(
    'TableCell', parent=styles['Normal'],
    fontName='DejaVuSans', fontSize=10, textColor=GRIS,
    alignment=TA_CENTER, leading=14
))
styles.add(ParagraphStyle(
    'TableCellLeft', parent=styles['Normal'],
    fontName='DejaVuSans', fontSize=10, textColor=GRIS,
    alignment=TA_LEFT, leading=14
))

story = []

# ═══════════════════════════════════════
# COVER / TITLE
# ═══════════════════════════════════════
story.append(Spacer(1, 2*cm))
story.append(Paragraph('RUTAGO', styles['MainTitle']))
story.append(Paragraph('Diseno del Recibo Termico 58mm', styles['SubTitle']))
story.append(Paragraph('y Promocion "Viaje Gratis"', styles['SubTitle']))

story.append(Spacer(1, 0.5*cm))
story.append(HRFlowable(width="60%", thickness=2, color=ROJO, spaceAfter=20))

# ═══════════════════════════════════════
# SECTION 1: RECEIPT MOCKUP
# ═══════════════════════════════════════
story.append(Paragraph('1. Diseno del Recibo', styles['SectionTitle']))
story.append(Paragraph(
    'A continuacion se presenta el mockup visual de como se veria el recibo impreso en la '
    'impresora termica Rongta RPP02N (58mm, 203 DPI). El diseno incluye toda la informacion '
    'necesaria del viaje mas la seccion promocional para incentivar al pasajero a conservar el boleto.',
    styles['BodyText2']
))

story.append(Paragraph('Especificaciones de impresion:', styles['SectionSubtitle']))
story.append(Paragraph('<bullet>&bull;</bullet> Ancho del papel: 58mm (48mm area imprimible)', styles['BulletItem']))
story.append(Paragraph('<bullet>&bull;</bullet> Resolucion: 203 DPI', styles['BulletItem']))
story.append(Paragraph('<bullet>&bull;</bullet> Velocidad: hasta 80mm/s', styles['BulletItem']))
story.append(Paragraph('<bullet>&bull;</bullet> Bateria: 1500mAh (estimada 6-8 horas continuas)', styles['BulletItem']))
story.append(Paragraph('<bullet>&bull;</bullet> Conexion: Bluetooth 4.0 (compatible iOS y Android)', styles['BulletItem']))
story.append(Paragraph('<bullet>&bull;</bullet> Protocolo: ESC/POS', styles['BulletItem']))

story.append(Spacer(1, 0.3*cm))

# Content of the receipt
story.append(Paragraph('Contenido del recibo:', styles['SectionSubtitle']))
story.append(Paragraph(
    '<b>Encabezado:</b> Logo RUTAGO, nombre de la empresa (Transportes Vilcabambaturis Cia. Ltda.) '
    'y RUC. Esta informacion identifica legalmente al operador del servicio de transporte y '
    'cumple con los requisitos de identificacion comercial para comprobantes de pago en Ecuador.',
    styles['BodyText2']
))
story.append(Paragraph(
    '<b>Informacion del viaje:</b> Ruta (VT), direccion (IDA/VUELTA), fecha, hora y nombre '
    'del ayudante. La ruta permite al pasajero identificar su trayecto, mientras que la fecha y hora '
    'sirven como referencia temporal. El nombre del ayudante agrega trazabilidad en caso de '
    'reclamos o consultas.',
    styles['BodyText2']
))
story.append(Paragraph(
    '<b>Detalles del pasaje:</b> Origen (parada donde subio), destino (parada donde baja), '
    'tipo de pasajero (ENTERO o MEDIA) y tarifa cobrada. La tarifa se muestra en fuente grande '
    'y negrita para facil lectura inmediata.',
    styles['BodyText2']
))
story.append(Paragraph(
    '<b>Numero de boleto:</b> Secuencial por dia, con formato de codigo de barras visual. '
    'Este numero es la clave de la promocion "Viaje Gratis" y permite la trazabilidad individual '
    'de cada venta.',
    styles['BodyText2']
))
story.append(Paragraph(
    '<b>Seccion promocional:</b> Cuadro destacado con borde grueso que dice "CONSERVE SU BOLETO" '
    'y "VIAJE GRATIS", con referencia al sitio web donde se publica el resultado del sorteo. '
    'Esta seccion es el motor de la estrategia para que los pasajeros exijan su recibo al ayudante.',
    styles['BodyText2']
))

# Insert receipt image
if img_path and os.path.exists(img_path):
    from reportlab.lib.utils import ImageReader
    img = Image(img_path, width=16*cm, height=None)
    # Maintain aspect ratio
    from PIL import Image as PILImage
    pil_img = PILImage.open(img_path)
    w, h = pil_img.size
    aspect = h / w
    img_height = 16*cm * aspect
    # Limit height to fit on page
    max_h = 18*cm
    if img_height > max_h:
        img_height = max_h
        img_width = max_h / aspect
        img = Image(img_path, width=img_width, height=img_height)
    else:
        img = Image(img_path, width=16*cm, height=img_height)
    
    story.append(Spacer(1, 0.5*cm))
    story.append(img)
    story.append(Paragraph('Figura 1: Mockup visual del recibo RutaGo para impresora termica 58mm', styles['Caption']))

# Two variants table
story.append(Spacer(1, 0.3*cm))
story.append(Paragraph('Variantes de diseno:', styles['SectionSubtitle']))

variant_data = [
    [Paragraph('<b>Caracteristica</b>', styles['TableHeader']),
     Paragraph('<b>Recibo Completo</b>', styles['TableHeader']),
     Paragraph('<b>Recibo Compacto</b>', styles['TableHeader'])],
    [Paragraph('Info empresa', styles['TableCellLeft']),
     Paragraph('Nombre + RUC', styles['TableCell']),
     Paragraph('Solo nombre', styles['TableCell'])],
    [Paragraph('Datos viaje', styles['TableCellLeft']),
     Paragraph('Completos (6 campos)', styles['TableCell']),
     Paragraph('Reducidos (3 lineas)', styles['TableCell'])],
    [Paragraph('Promocion', styles['TableCellLeft']),
     Paragraph('Completa (5 lineas)', styles['TableCell']),
     Paragraph('Compacta (3 lineas)', styles['TableCell'])],
    [Paragraph('Papel estimado', styles['TableCellLeft']),
     Paragraph('~85mm por recibo', styles['TableCell']),
     Paragraph('~65mm por recibo', styles['TableCell'])],
    [Paragraph('Costo papel/rollo', styles['TableCellLeft']),
     Paragraph('~100 boletos/rollo', styles['TableCell']),
     Paragraph('~130 boletos/rollo', styles['TableCell'])],
]

variant_table = Table(variant_data, colWidths=[4.5*cm, 5*cm, 5*cm])
variant_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), ROJO),
    ('TEXTCOLOR', (0, 0), (-1, 0), white),
    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
    ('FONTNAME', (0, 0), (-1, 0), 'DejaVuSans'),
    ('FONTSIZE', (0, 0), (-1, -1), 10),
    ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
    ('TOPPADDING', (0, 0), (-1, -1), 8),
    ('BOTTOMPADDING', (0, 1), (-1, -1), 8),
    ('BACKGROUND', (0, 1), (-1, -1), HexColor('#FFF8F6')),
    ('GRID', (0, 0), (-1, -1), 0.5, PLATA),
    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [HexColor('#FFFFFF'), HexColor('#FFF8F6')]),
]))
story.append(variant_table)
story.append(Paragraph('Tabla 1: Comparacion de variantes del recibo', styles['Caption']))

# Page break before promo system
story.append(PageBreak())

# ═══════════════════════════════════════
# SECTION 2: PROMOCION "VIAJE GRATIS"
# ═══════════════════════════════════════
story.append(Paragraph('2. Promocion "Viaje Gratis"', styles['SectionTitle']))

story.append(Paragraph(
    'La promocion "Viaje Gratis" es una estrategia disenada para resolver un problema operativo '
    'critico: lograr que los pasajeros exijan su recibo al ayudante. Actualmente, en el transporte '
    'publico de Loja a Vilcabamba, muchos pasajeros no solicitan comprobante de pago, lo que '
    'dificulta el control de ingresos y permite que parte de la recaudacion no se registre '
    'correctamente. Con esta promocion, el propio pasajero se convierte en agente de control, '
    'ya que tiene un incentivo tangible (un viaje gratis) para exigir y conservar su boleto.',
    styles['BodyText2']
))

story.append(Paragraph('2.1 Mecanica de la Promocion', styles['SectionSubtitle']))

story.append(Paragraph(
    'Cada boleto emitido por RutaGo lleva un numero secuencial unico. Al finalizar cada jornada '
    'diaria, el sistema realiza un sorteo aleatorio entre todos los numeros de boleto emitidos ese '
    'dia en todas las rutas y vehiculos. El pasajero que tenga el boleto con el numero ganador '
    'tiene derecho a un viaje gratis en cualquier ruta de la cooperativa durante los proximos 7 '
    'dias. El resultado del sorteo se publica en el sitio web de RutaGo (rutago.vercel.app/sorteo) '
    'y tambien se puede consultar en la aplicacion movil. El ganador debe presentar el boleto '
    'fisico (impreso) al ayudante para canjear su viaje gratis.',
    styles['BodyText2']
))

story.append(Paragraph('2.2 Flujo del Proceso', styles['SectionSubtitle']))

flow_data = [
    [Paragraph('<b>Paso</b>', styles['TableHeader']),
     Paragraph('<b>Accion</b>', styles['TableHeader']),
     Paragraph('<b>Responsable</b>', styles['TableHeader']),
     Paragraph('<b>Sistema</b>', styles['TableHeader'])],
    [Paragraph('1', styles['TableCell']),
     Paragraph('Pasajero sube al bus y paga', styles['TableCellLeft']),
     Paragraph('Pasajero', styles['TableCell']),
     Paragraph('-', styles['TableCell'])],
    [Paragraph('2', styles['TableCell']),
     Paragraph('Ayudante registra venta en RutaGo', styles['TableCellLeft']),
     Paragraph('Ayudante', styles['TableCell']),
     Paragraph('Genera N. boleto', styles['TableCell'])],
    [Paragraph('3', styles['TableCell']),
     Paragraph('Impresora imprime recibo con promo', styles['TableCellLeft']),
     Paragraph('Sistema', styles['TableCell']),
     Paragraph('ESC/POS Bluetooth', styles['TableCell'])],
    [Paragraph('4', styles['TableCell']),
     Paragraph('Ayudante entrega recibo al pasajero', styles['TableCellLeft']),
     Paragraph('Ayudante', styles['TableCell']),
     Paragraph('-', styles['TableCell'])],
    [Paragraph('5', styles['TableCell']),
     Paragraph('Pasajero conserva el boleto', styles['TableCellLeft']),
     Paragraph('Pasajero', styles['TableCell']),
     Paragraph('-', styles['TableCell'])],
    [Paragraph('6', styles['TableCell']),
     Paragraph('Fin de jornada: sorteo automatico', styles['TableCellLeft']),
     Paragraph('Sistema', styles['TableCell']),
     Paragraph('Random selection', styles['TableCell'])],
    [Paragraph('7', styles['TableCell']),
     Paragraph('Publicacion del numero ganador', styles['TableCellLeft']),
     Paragraph('Sistema', styles['TableCell']),
     Paragraph('Web + App', styles['TableCell'])],
    [Paragraph('8', styles['TableCell']),
     Paragraph('Ganador presenta boleto fisico', styles['TableCellLeft']),
     Paragraph('Pasajero', styles['TableCell']),
     Paragraph('Validacion', styles['TableCell'])],
    [Paragraph('9', styles['TableCell']),
     Paragraph('Registro del viaje gratis canjeado', styles['TableCellLeft']),
     Paragraph('Ayudante', styles['TableCell']),
     Paragraph('Marca como usado', styles['TableCell'])],
]

flow_table = Table(flow_data, colWidths=[1.2*cm, 6.5*cm, 3*cm, 3.8*cm])
flow_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), ROJO),
    ('TEXTCOLOR', (0, 0), (-1, 0), white),
    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
    ('ALIGN', (1, 1), (1, -1), 'LEFT'),
    ('FONTNAME', (0, 0), (-1, 0), 'DejaVuSans'),
    ('FONTSIZE', (0, 0), (-1, -1), 9),
    ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
    ('TOPPADDING', (0, 0), (-1, -1), 6),
    ('BOTTOMPADDING', (0, 1), (-1, -1), 6),
    ('GRID', (0, 0), (-1, -1), 0.5, PLATA),
    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [HexColor('#FFFFFF'), HexColor('#FFF8F6')]),
]))
story.append(flow_table)
story.append(Paragraph('Tabla 2: Flujo del proceso de promocion', styles['Caption']))

story.append(Paragraph('2.3 Analisis de Costo-Beneficio', styles['SectionSubtitle']))

story.append(Paragraph(
    'El costo de implementar esta promocion es practicamente nulo frente a los beneficios que genera. '
    'Se otorga un solo viaje gratis por dia (que representa entre $0.75 y $4.00 dependiendo de la ruta), '
    'mientras que el beneficio es que cada pasajero exigira su recibo, lo que incrementa el registro '
    'de ventas y mejora el control de ingresos. Considerando que en el trayecto Loja-Vilcabamba de '
    '75 minutos pueden subir entre 5 y 60 pasajeros en un solo viaje, y que actualmente no todos '
    'los pasajeros reciben comprobante, esta promocion tiene el potencial de incrementar significativamente '
    'la trazabilidad de cada venta realizada durante la jornada.',
    styles['BodyText2']
))

story.append(Paragraph(
    'Adicionalmente, el efecto psicologico de un sorteo genera expectativa y fidelizacion. '
    'Los pasajeros regulares que viajan diariamente (como los que se desplazan de Loja a Vilcabamba '
    'para trabajo o estudio) se convierten en usuarios activos de RutaGo, no solo como pasajeros '
    'sino como participantes constantes de la promocion. Esto refuerza el habito de pedir el boleto '
    'y reduce la posibilidad de que el ayudante deje de registrar una venta.',
    styles['BodyText2']
))

# Cost-benefit table
story.append(Spacer(1, 0.3*cm))
cost_data = [
    [Paragraph('<b>Concepto</b>', styles['TableHeader']),
     Paragraph('<b>Valor</b>', styles['TableHeader']),
     Paragraph('<b>Notas</b>', styles['TableHeader'])],
    [Paragraph('Viaje gratis/dia', styles['TableCellLeft']),
     Paragraph('$0.75 - $4.00', styles['TableCell']),
     Paragraph('Segun ruta del ganador', styles['TableCell'])],
    [Paragraph('Costo papel/rollo (58mm x 30m)', styles['TableCellLeft']),
     Paragraph('~$1.50', styles['TableCell']),
     Paragraph('~100-130 recibos por rollo', styles['TableCell'])],
    [Paragraph('Costo promocion/mes', styles['TableCellLeft']),
     Paragraph('$22 - $120', styles['TableCell']),
     Paragraph('30 viajes gratis (1/dia)', styles['TableCell'])],
    [Paragraph('Beneficio: control de ingresos', styles['TableCellLeft']),
     Paragraph('Incuantificable', styles['TableCell']),
     Paragraph('100% de ventas registradas', styles['TableCell'])],
    [Paragraph('Beneficio: imagen de marca', styles['TableCellLeft']),
     Paragraph('Alto', styles['TableCell']),
     Paragraph('Diferenciacion vs competencia', styles['TableCell'])],
]

cost_table = Table(cost_data, colWidths=[5.5*cm, 3.5*cm, 5.5*cm])
cost_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), ROJO),
    ('TEXTCOLOR', (0, 0), (-1, 0), white),
    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
    ('ALIGN', (0, 1), (0, -1), 'LEFT'),
    ('ALIGN', (2, 1), (2, -1), 'LEFT'),
    ('FONTNAME', (0, 0), (-1, 0), 'DejaVuSans'),
    ('FONTSIZE', (0, 0), (-1, -1), 9),
    ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
    ('TOPPADDING', (0, 0), (-1, -1), 6),
    ('BOTTOMPADDING', (0, 1), (-1, -1), 6),
    ('GRID', (0, 0), (-1, -1), 0.5, PLATA),
    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [HexColor('#FFFFFF'), HexColor('#FFF8F6')]),
]))
story.append(cost_table)
story.append(Paragraph('Tabla 3: Analisis de costo-beneficio mensual', styles['Caption']))

story.append(Paragraph('2.4 Variantes de Frecuencia del Sorteo', styles['SectionSubtitle']))

story.append(Paragraph(
    'El sorteo puede configurarse con diferentes frecuencias segun la estrategia que se desee seguir. '
    'La opcion mas recomendable al inicio es el sorteo diario, ya que genera expectativa inmediata '
    'y mantiene el interes constante entre los pasajeros regulares. Sin embargo, tambien se pueden '
    'evaluar variantes como sorteo semanal con premio acumulado (por ejemplo, 7 viajes gratis '
    'en lugar de 1, lo cual genera mayor emocion y difusion boca a boca), o sorteos especiales en '
    'fechas festivas donde se sortean multiples premios en un solo dia. La flexibilidad del sistema '
    'RutaGo permite ajustar esta configuracion en cualquier momento sin cambios en el hardware.',
    styles['BodyText2']
))

freq_data = [
    [Paragraph('<b>Frecuencia</b>', styles['TableHeader']),
     Paragraph('<b>Premio</b>', styles['TableHeader']),
     Paragraph('<b>Costo/mes</b>', styles['TableHeader']),
     Paragraph('<b>Impacto psicologico</b>', styles['TableHeader'])],
    [Paragraph('Diario (recomendado)', styles['TableCellLeft']),
     Paragraph('1 viaje gratis', styles['TableCell']),
     Paragraph('$22 - $120', styles['TableCell']),
     Paragraph('Alto - expectativa diaria', styles['TableCell'])],
    [Paragraph('Semanal', styles['TableCellLeft']),
     Paragraph('5-7 viajes gratis', styles['TableCell']),
     Paragraph('$15 - $112', styles['TableCell']),
     Paragraph('Muy alto - premio mayor', styles['TableCell'])],
    [Paragraph('Quincenal', styles['TableCellLeft']),
     Paragraph('10-14 viajes gratis', styles['TableCell']),
     Paragraph('$11 - $112', styles['TableCell']),
     Paragraph('Medio - periodicidad larga', styles['TableCell'])],
    [Paragraph('Mensual', styles['TableCellLeft']),
     Paragraph('20-30 viajes gratis', styles['TableCell']),
     Paragraph('$15 - $120', styles['TableCell']),
     Paragraph('Bajo - pierde urgencia', styles['TableCell'])],
]

freq_table = Table(freq_data, colWidths=[3.5*cm, 3.5*cm, 3*cm, 4.5*cm])
freq_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), ROJO),
    ('TEXTCOLOR', (0, 0), (-1, 0), white),
    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
    ('ALIGN', (0, 1), (0, -1), 'LEFT'),
    ('FONTNAME', (0, 0), (-1, 0), 'DejaVuSans'),
    ('FONTSIZE', (0, 0), (-1, -1), 9),
    ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
    ('TOPPADDING', (0, 0), (-1, -1), 6),
    ('BOTTOMPADDING', (0, 1), (-1, -1), 6),
    ('GRID', (0, 0), (-1, -1), 0.5, PLATA),
    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [HexColor('#FFFFFF'), HexColor('#FFF8F6')]),
    ('BACKGROUND', (0, 1), (-1, 1), HexColor('#E8F5E9')),
]))
story.append(freq_table)
story.append(Paragraph('Tabla 4: Variantes de frecuencia del sorteo', styles['Caption']))

story.append(Paragraph('2.5 Consideraciones Operativas', styles['SectionSubtitle']))

story.append(Paragraph(
    '<b>Impresion automatica:</b> Cuando el ayudante registra una venta en RutaGo y tiene la '
    'impresora Rongta RPP02N conectada via Bluetooth, el sistema envia automaticamente la orden '
    'de impresion del recibo. El ayudante solo debe entregar el papel al pasajero. El tiempo de '
    'impresion estimado es de 1-2 segundos por recibo, lo que no interrumpe el flujo de atencion '
    'al pasajero. Si la impresora no esta conectada o se agota el papel, RutaGo muestra una '
    'alerta en pantalla pero permite continuar registrando ventas sin interrupcion.',
    styles['BodyText2']
))

story.append(Paragraph(
    '<b>Validacion del premio:</b> Cuando el ganador presenta su boleto fisico, el ayudante '
    'verifica en la aplicacion que el numero coincide con el publicado. El sistema marca el '
    'boleto como "canjeado" para evitar doble uso. El pasajero puede viajar gratis en cualquier '
    'ruta de la cooperativa (no necesariamente la misma ruta donde compro el boleto ganador).',
    styles['BodyText2']
))

story.append(Paragraph(
    '<b>Publicidad en el bus:</b> Se recomienda colocar un letrero visible dentro del bus que '
    'diga "Pida su boleto RutaGo y participe por un VIAJE GRATIS. Verifique en '
    'rutago.vercel.app/sorteo". Este letrero refuerza la promocion y sirve como recordatorio '
    'constante para los pasajeros que ya no estan pidiendo su recibo.',
    styles['BodyText2']
))

story.append(Paragraph(
    '<b>Escalabilidad:</b> Esta promocion es escalable a todas las rutas de la cooperativa '
    'simultaneamente, ya que el sorteo es global (no por ruta). Esto significa que un pasajero '
    'que viaja en la ruta Loja-El Tambo puede ganar un viaje gratis para usarlo en la ruta '
    'Loja-Vilcabamba. Cuantas mas rutas participen, mayor sera la base de boletos y mayor '
    'la emocion del sorteo, lo que a su vez incentiva a mas pasajeros a participar activamente.',
    styles['BodyText2']
))

story.append(Paragraph(
    '<b>Contexto del trayecto Loja-Vilcabamba:</b> Con una duracion de 75 minutos y una '
    'ocupacion variable de 5 a 45 pasajeros por viaje, llegando a atender hasta 60 personas '
    'diferentes entre subidas y bajadas en paradas intermedias, esta ruta es ideal para la '
    'promocion. La alta rotacion de pasajeros significa que se emiten muchos boletos por viaje, '
    'lo que aumenta las posibilidades de que cada pasajero sienta que tiene una oportunidad real '
    'de ganar. Incluso en viajes con baja ocupacion (5 pasajeros), la probabilidad de ganar es '
    'del 20%, lo cual es considerablemente atractivo.',
    styles['BodyText2']
))

# Probability table
story.append(Spacer(1, 0.3*cm))
prob_data = [
    [Paragraph('<b>Pasajeros/Viaje</b>', styles['TableHeader']),
     Paragraph('<b>Boletos emitidos</b>', styles['TableHeader']),
     Paragraph('<b>Probabilidad de ganar</b>', styles['TableHeader']),
     Paragraph('<b>Percepcion del pasajero</b>', styles['TableHeader'])],
    [Paragraph('5 (baja ocupacion)', styles['TableCellLeft']),
     Paragraph('5', styles['TableCell']),
     Paragraph('20%', styles['TableCell']),
     Paragraph('Muy alta', styles['TableCell'])],
    [Paragraph('15 (media)', styles['TableCellLeft']),
     Paragraph('15', styles['TableCell']),
     Paragraph('6.7%', styles['TableCell']),
     Paragraph('Alta', styles['TableCell'])],
    [Paragraph('30 (alta)', styles['TableCellLeft']),
     Paragraph('30', styles['TableCell']),
     Paragraph('3.3%', styles['TableCell']),
     Paragraph('Media', styles['TableCell'])],
    [Paragraph('45 (completo)', styles['TableCellLeft']),
     Paragraph('45', styles['TableCell']),
     Paragraph('2.2%', styles['TableCell']),
     Paragraph('Media-baja', styles['TableCell'])],
    [Paragraph('60 (total subidas/bajadas)', styles['TableCellLeft']),
     Paragraph('60', styles['TableCell']),
     Paragraph('1.7%', styles['TableCell']),
     Paragraph('Baja pero posible', styles['TableCell'])],
]

prob_table = Table(prob_data, colWidths=[4*cm, 3*cm, 3.5*cm, 4*cm])
prob_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), ROJO),
    ('TEXTCOLOR', (0, 0), (-1, 0), white),
    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
    ('ALIGN', (0, 1), (0, -1), 'LEFT'),
    ('FONTNAME', (0, 0), (-1, 0), 'DejaVuSans'),
    ('FONTSIZE', (0, 0), (-1, -1), 9),
    ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
    ('TOPPADDING', (0, 0), (-1, -1), 6),
    ('BOTTOMPADDING', (0, 1), (-1, -1), 6),
    ('GRID', (0, 0), (-1, -1), 0.5, PLATA),
    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [HexColor('#FFFFFF'), HexColor('#FFF8F6')]),
]))
story.append(prob_table)
story.append(Paragraph('Tabla 5: Probabilidades por nivel de ocupacion (sorteo por viaje)', styles['Caption']))

story.append(Paragraph(
    '<b>Nota importante:</b> Si el sorteo es por viaje (cada viaje tiene su propio ganador), '
    'las probabilidades son mucho mas altas y atractivas para el pasajero. Si el sorteo es '
    'diario global (un solo ganador entre todos los boletos del dia en todas las rutas), la '
    'probabilidad se reduce pero el premio se percibe como mas valioso. Se recomienda iniciar '
    'con sorteos por viaje para maximizar el impacto inicial y luego evaluar cambiar a sorteo '
    'diario global segun la respuesta de los pasajeros.',
    styles['BodyText2']
))

# Build PDF
doc.build(story)
print(f"PDF saved to: {PDF_PATH}")
print(f"HTML receipt mockup: {receipt_html_path}")
