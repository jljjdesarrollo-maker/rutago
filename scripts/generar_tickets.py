#!/usr/bin/env python3
"""
Genera mockup visual de tickets: Normal vs Viaje Gratis
Impresora termica 58mm - Rongta RPP02N
"""

import asyncio
import os

OUTPUT_DIR = '/home/z/my-project/download'
os.makedirs(OUTPUT_DIR, exist_ok=True)

HTML = '''
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
    padding: 30px 20px;
    background: #E8E8E8;
    font-family: 'Courier New', 'DejaVu Sans Mono', monospace;
    gap: 20px;
  }
  .page-title {
    font-family: Arial, 'DejaVu Sans', sans-serif;
    font-size: 18px;
    font-weight: bold;
    color: #333;
    margin-bottom: 10px;
    text-align: center;
  }
  .comparison {
    display: flex;
    gap: 40px;
    flex-wrap: wrap;
    justify-content: center;
    align-items: flex-start;
  }
  .ticket-group {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }
  .group-label {
    font-family: Arial, 'DejaVu Sans', sans-serif;
    font-size: 14px;
    font-weight: bold;
    color: #555;
    padding: 6px 16px;
    border-radius: 8px;
    background: #fff;
    box-shadow: 0 2px 6px rgba(0,0,0,0.1);
  }
  .group-label.green {
    color: #16a34a;
    border: 2px solid #16a34a;
  }
  .group-label.gray {
    color: #3A3A3A;
    border: 2px solid #912D26;
  }
  .receipt-shadow {
    filter: drop-shadow(2px 4px 8px rgba(0,0,0,0.2));
  }

  /* ── RECEIPT BASE ── */
  .receipt {
    width: 384px;
    background: #fff;
    padding: 16px 14px;
    font-size: 12px;
    color: #000;
    line-height: 1.45;
    position: relative;
  }
  .receipt::before,
  .receipt::after {
    content: '';
    position: absolute;
    left: 0; right: 0;
    height: 10px;
    background: linear-gradient(135deg, #fff 33.33%, transparent 33.33%) 0 0,
                linear-gradient(225deg, #fff 33.33%, transparent 33.33%) 0 0;
    background-size: 12px 10px;
  }
  .receipt::before { bottom: -10px; }
  .receipt::after { top: -10px; }

  .center { text-align: center; }
  .bold { font-weight: bold; }
  .right { text-align: right; }
  .line-d { border-top: 2px solid #000; margin: 7px 0; }
  .line-s { border-top: 1px dashed #000; margin: 6px 0; }
  .line-t { border-top: 1px solid #ccc; margin: 4px 0; }
  .spacer { height: 5px; }
  .spacer-sm { height: 3px; }
  .row { display: flex; justify-content: space-between; align-items: center; }
  .lbl { color: #555; font-size: 11px; }
  .val { font-weight: bold; }
  .big { font-size: 17px; font-weight: bold; letter-spacing: 3px; }
  .sub { font-size: 9px; color: #666; }
  .amount { font-size: 26px; font-weight: bold; }
  .ticket-n { font-size: 15px; font-weight: bold; letter-spacing: 1px; }
  .footer { font-size: 8px; color: #888; text-align: center; }
  .mini { font-size: 8px; color: #888; text-align: center; }
  .barcode {
    text-align: center;
    padding: 4px 0;
    font-size: 18px;
    font-weight: bold;
    letter-spacing: 3px;
    transform: scaleY(1.3);
  }
  .promocion-normal {
    margin-top: 5px;
    padding: 6px 4px;
    border: 1.5px solid #000;
    text-align: center;
  }
  .promocion-normal .promo-t { font-size: 9px; font-weight: bold; letter-spacing: 1px; }
  .promocion-normal .promo-m { font-size: 11px; font-weight: bold; letter-spacing: 1px; }
  .promocion-normal .promo-f { font-size: 8px; color: #555; margin-top: 3px; }

  /* ── GRATIS TICKET ── */
  .gratis-header {
    background: #16a34a;
    color: #fff;
    padding: 8px 14px;
    margin: -16px -14px 0 -14px;
    text-align: center;
    border-radius: 0;
  }
  .gratis-stars {
    font-size: 14px;
    letter-spacing: 8px;
    line-height: 1;
  }
  .gratis-title {
    font-size: 18px;
    font-weight: bold;
    letter-spacing: 4px;
    margin-top: 4px;
  }
  .gratis-subtitle {
    font-size: 10px;
    opacity: 0.9;
    margin-top: 2px;
  }
  .gratis-amount {
    font-size: 28px;
    font-weight: bold;
    color: #16a34a;
  }
  .gratis-amount .zero {
    color: #16a34a;
  }
  .gratis-amount .label {
    font-size: 10px;
    color: #888;
    font-weight: normal;
  }
  .no-paga {
    display: inline-block;
    background: #16a34a;
    color: #fff;
    padding: 4px 12px;
    font-size: 14px;
    font-weight: bold;
    letter-spacing: 3px;
    border-radius: 4px;
    margin: 6px 0;
  }
  .gratis-footer {
    margin-top: 5px;
    padding: 6px 4px;
    border: 2px solid #16a34a;
    text-align: center;
  }
  .gratis-footer .gf-t {
    font-size: 9px;
    font-weight: bold;
    color: #16a34a;
    letter-spacing: 1px;
  }
  .gratis-footer .gf-m {
    font-size: 10px;
    font-weight: bold;
    margin-top: 2px;
  }
</style>
</head>
<body>

<div class="page-title">RutaGo - Tickets Impresora Termica 58mm (Rongta RPP02N)</div>

<div class="comparison">

  <!-- ═══════ TICKET NORMAL ═══════ -->
  <div class="ticket-group">
    <div class="group-label gray">TICKET NORMAL</div>
    <div class="receipt-shadow">
      <div class="receipt">
        <!-- Header -->
        <div class="center">
          <div class="big">RUTAGO</div>
          <div class="sub">Transportes Vilcabambaturis Cia. Ltda.</div>
        </div>
        <div class="line-d"></div>

        <!-- Route -->
        <div class="row">
          <span class="bold" style="font-size:13px;">Loja - Vilcabamba</span>
          <span class="bold">IDA</span>
        </div>
        <div class="spacer-sm"></div>
        <div class="row">
          <span class="lbl">14/08/2026</span>
          <span>08:32</span>
          <span class="lbl">Ayud: Carlos M.</span>
        </div>

        <div class="line-s"></div>

        <!-- Trip -->
        <div class="row">
          <span class="lbl">Destino:</span>
          <span class="bold" style="font-size:14px;">Vilcabamba</span>
        </div>
        <div class="row">
          <span class="lbl">Tipo:</span>
          <span class="val">ENTERO</span>
        </div>
        <div class="spacer-sm"></div>
        <div class="row">
          <span class="lbl">Tarifa:</span>
          <span class="amount">$2.50</span>
        </div>

        <div class="line-s"></div>

        <!-- Ticket number -->
        <div class="center">
          <div class="ticket-n">Boleto N. 0047</div>
        </div>
        <div class="barcode">||||| ||| || ||| |||| |</div>
        <div class="mini">0047-14082026-0832</div>

        <div class="line-s"></div>

        <!-- Promo box (normal) -->
        <div class="promocion-normal">
          <div class="promo-t">CONSERVE SU BOLETO</div>
          <div class="promo-m">PUEDE TOCARLE VIAJE GRATIS</div>
          <div class="promo-f">1 ganador por frecuencia</div>
        </div>

        <div class="line-d"></div>
        <div class="footer">Gracias por viajar con RutaGo</div>
      </div>
    </div>
  </div>

  <!-- ═══════ TICKET VIAJE GRATIS ═══════ -->
  <div class="ticket-group">
    <div class="group-label green">VIAJE GRATIS</div>
    <div class="receipt-shadow">
      <div class="receipt">
        <!-- Green header -->
        <div class="gratis-header">
          <div class="gratis-stars">* * *</div>
          <div class="gratis-title">VIAJE GRATIS</div>
          <div class="gratis-subtitle">NO DEBE PAGAR</div>
        </div>

        <div class="line-d"></div>

        <!-- Route -->
        <div class="row">
          <span class="bold" style="font-size:13px;">Loja - Vilcabamba</span>
          <span class="bold">IDA</span>
        </div>
        <div class="spacer-sm"></div>
        <div class="row">
          <span class="lbl">14/08/2026</span>
          <span>08:35</span>
          <span class="lbl">Ayud: Carlos M.</span>
        </div>

        <div class="line-s"></div>

        <!-- Trip -->
        <div class="row">
          <span class="lbl">Destino:</span>
          <span class="bold" style="font-size:14px;">Malacatos</span>
        </div>
        <div class="row">
          <span class="lbl">Tipo:</span>
          <span class="val">ENTERO</span>
        </div>
        <div class="spacer-sm"></div>
        <div class="row">
          <span class="lbl">Tarifa:</span>
          <span class="gratis-amount">
            <span class="label">NO PAGA</span>
            <span class="zero">$0.00</span>
          </span>
        </div>

        <div class="center">
          <div class="no-paga">FELICIDADES</div>
        </div>

        <div class="line-s"></div>

        <!-- Ticket number -->
        <div class="center">
          <div class="ticket-n" style="color:#16a34a;">Boleto N. 0052</div>
        </div>
        <div class="barcode" style="color:#16a34a;">||||| || ||| | ||| || ||</div>
        <div class="mini" style="color:#16a34a;">0052-14082026-0835</div>

        <div class="line-s"></div>

        <!-- Footer promo -->
        <div class="gratis-footer">
          <div class="gf-t">PASE AJENAMENTE</div>
          <div class="gf-m">Este viaje es cortesia de RutaGo</div>
        </div>

        <div class="line-d"></div>
        <div class="footer" style="color:#16a34a;">RutaGo - Su transporte confiable</div>
      </div>
    </div>
  </div>

</div>

</body>
</html>
'''

html_path = os.path.join(OUTPUT_DIR, 'tickets_comparativo.html')
with open(html_path, 'w', encoding='utf-8') as f:
    f.write(HTML)

async def screenshot():
    from playwright.async_api import async_playwright
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(viewport={'width': 900, 'height': 1200})
        await page.goto(f'file://{html_path}')
        await page.wait_for_load_state('networkidle')
        
        height = await page.evaluate('document.body.scrollHeight')
        await page.set_viewport_size({'width': 900, 'height': height + 60})
        
        img_path = os.path.join(OUTPUT_DIR, 'tickets_normal_vs_gratis.png')
        await page.screenshot(path=img_path, full_page=True)
        
        await browser.close()
        print(f"Screenshot: {img_path}")
        return img_path

try:
    asyncio.run(screenshot())
except Exception as e:
    print(f"Error: {e}")

print(f"HTML: {html_path}")
