# Fix both generators to be route-aware for VUELTA lookup
# Check route-specific override map FIRST, then fall back to shared preciosVuelta

import re

# ─── Fix HTML Preview ───
PREVIEW = '/home/z/my-project/scripts/generate_tarifas_preview.py'
with open(PREVIEW, 'r', encoding='utf-8') as f:
    html_code = f.read()

# 1. Add 'Loja' to El Tambo VUELTA list (after 'Capulí')
# Find: 'Capul\u00ed',\n    'Mal\u2192Pe\u00f1a'
# This is in the El Tambo vuelta section
old = "  'Capul\u00ed',\n    'Mal\u2192Pe\u00f1a'"
new = "  'Capul\u00ed',\n    'Loja',\n    'Mal\u2192Pe\u00f1a'"
if old in html_code:
    html_code = html_code.replace(old, new, 1)
    print("Preview: Added 'Loja' to El Tambo VUELTA list")
else:
    print("Preview: Could not find El Tambo VUELTA list insertion point")

# 2. Replace gp function with route-aware version
old_gp = """function gp(p,d){
  if(d==='ida')return PRECIOS_IDA[p]||[0,0];
  if(PRECIOS_VUELTA[p])return PRECIOS_VUELTA[p];
  for(const k of Object.keys(VUELTA_MAPS)){if(VUELTA_MAPS[k][p])return VUELTA_MAPS[k][p];}
  return [0,0];
}"""

new_gp = """function gp(p,d,r){
  if(d==='ida')return PRECIOS_IDA[p]||[0,0];
  var rm={'Loja - Vilcabamba':'preciosVueltaVilcabamba','Loja - El Tambo':'preciosVueltaElTambo','Loja - Yangana':'preciosVueltaYangana','Loja - La Elvira':'preciosVueltaLaElvira'};
  if(r&&rm[r]&&VUELTA_MAPS[rm[r]]&&VUELTA_MAPS[rm[r]][p])return VUELTA_MAPS[rm[r]][p];
  if(PRECIOS_VUELTA[p])return PRECIOS_VUELTA[p];
  for(const k of Object.keys(VUELTA_MAPS)){if(VUELTA_MAPS[k][p])return VUELTA_MAPS[k][p];}
  return [0,0];
}"""

if old_gp in html_code:
    html_code = html_code.replace(old_gp, new_gp)
    print("Preview: Updated gp() to route-aware")
else:
    print("Preview: Could not find gp() function to replace")

# 3. Update all gp(p,cD) calls to gp(p,cD,cR)
count = html_code.count('gp(p,cD)')
html_code = html_code.replace('gp(p,cD)', 'gp(p,cD,cR)')
print(f"Preview: Updated {count} gp() calls to include route")

with open(PREVIEW, 'w', encoding='utf-8') as f:
    f.write(html_code)

# ─── Fix PDF Generator ───
PDF = '/home/z/my-project/scripts/generate_tarifas_pdf.py'
with open(PDF, 'r', encoding='utf-8') as f:
    pdf_code = f.read()

# 1. Add 'Loja' to El Tambo VUELTA list
old_pdf = "  'Capul\u00ed',\n    'Mal\u2192Pe\u00f1a'"
new_pdf = "  'Capul\u00ed',\n    'Loja',\n    'Mal\u2192Pe\u00f1a'"
if old_pdf in pdf_code:
    # Only replace in the El Tambo section
    # Find the section context to be specific
    pdf_code = pdf_code.replace(old_pdf, new_pdf, 1)
    print("PDF: Added 'Loja' to El Tambo VUELTA list")
else:
    print("PDF: Could not find El Tambo VUELTA list insertion point")

# 2. Replace get_price_vuelta with route-aware version
old_pdf_fn = """def get_price_vuelta(parada):
    if parada in precios_vuelta:
        return precios_vuelta[parada]
    for name, pm in vuelta_maps.items():
        if parada in pm:
            return pm[parada]
    return (0, 0)"""

new_pdf_fn = """ROUTE_MAP_KEYS = {
    'Loja - Vilcabamba': 'preciosVueltaVilcabamba',
    'Loja - El Tambo': 'preciosVueltaElTambo',
    'Loja - Yangana': 'preciosVueltaYangana',
    'Loja - La Elvira': 'preciosVueltaLaElvira',
}

def get_price_vuelta(parada, ruta_name=None):
    if ruta_name and ruta_name in ROUTE_MAP_KEYS:
        map_name = ROUTE_MAP_KEYS[ruta_name]
        if map_name in vuelta_maps and parada in vuelta_maps[map_name]:
            return vuelta_maps[map_name][parada]
    if parada in precios_vuelta:
        return precios_vuelta[parada]
    for name, pm in vuelta_maps.items():
        if parada in pm:
            return pm[parada]
    return (0, 0)"""

if old_pdf_fn in pdf_code:
    pdf_code = pdf_code.replace(old_pdf_fn, new_pdf_fn)
    print("PDF: Updated get_price_vuelta() to route-aware")
else:
    print("PDF: Could not find get_price_vuelta() to replace")

# 3. Update the call site: make_table(dirs['vuelta'], get_price_vuelta)
# Change to: make_table(dirs['vuelta'], lambda p: get_price_vuelta(p, ruta_name))
old_call = "elements.append(make_table(dirs['vuelta'], get_price_vuelta))"
new_call = "elements.append(make_table(dirs['vuelta'], lambda p: get_price_vuelta(p, ruta_name)))"
if old_call in pdf_code:
    pdf_code = pdf_code.replace(old_call, new_call)
    print("PDF: Updated make_table call to pass route name")
else:
    print("PDF: Could not find make_table call to update")

with open(PDF, 'w', encoding='utf-8') as f:
    f.write(pdf_code)

print("\nDone! Both generators are now route-aware for VUELTA lookup.")
