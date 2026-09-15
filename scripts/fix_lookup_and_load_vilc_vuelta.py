# Fix lookup bug + load Vilcabamba VUELTA directos + regenerate

import re, subprocess

# === STEP 1: Fix PDF generator lookup ===
PDF = '/home/z/my-project/scripts/generate_tarifas_pdf.py'
with open(PDF, 'r') as f:
    pdf_code = f.read()

old_pdf = """def get_price_vuelta(parada, ruta_name=None):
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

new_pdf = """def get_price_vuelta(parada, ruta_name=None):
    # Route-specific override first, but skip $0.00 placeholders
    if ruta_name and ruta_name in ROUTE_MAP_KEYS:
        map_name = ROUTE_MAP_KEYS[ruta_name]
        if map_name in vuelta_maps and parada in vuelta_maps[map_name]:
            val = vuelta_maps[map_name][parada]
            if val != (0, 0):
                return val
    # Shared fallback
    if parada in precios_vuelta:
        return precios_vuelta[parada]
    # Other override maps as last resort (skip $0.00)
    for name, pm in vuelta_maps.items():
        if parada in pm and pm[parada] != (0, 0):
            return pm[parada]
    return (0, 0)"""

if old_pdf in pdf_code:
    pdf_code = pdf_code.replace(old_pdf, new_pdf)
    with open(PDF, 'w') as f:
        f.write(pdf_code)
    print('PDF: Fixed lookup to skip $0.00 overrides')
else:
    print('PDF: Could not find function')

# === STEP 2: Fix HTML preview lookup ===
PREVIEW = '/home/z/my-project/scripts/generate_tarifas_preview.py'
with open(PREVIEW, 'r', encoding='utf-8') as f:
    html_code = f.read()

old_js = """function gp(p,d,r){
  if(d==='ida')return PRECIOS_IDA[p]||[0,0];
  var rm={'Loja - Vilcabamba':'preciosVueltaVilcabamba','Loja - El Tambo':'preciosVueltaElTambo','Loja - Yangana':'preciosVueltaYangana','Loja - La Elvira':'preciosVueltaLaElvira'};
  if(r&&rm[r]&&VUELTA_MAPS[rm[r]]&&VUELTA_MAPS[rm[r]][p])return VUELTA_MAPS[rm[r]][p];
  if(PRECIOS_VUELTA[p])return PRECIOS_VUELTA[p];
  for(const k of Object.keys(VUELTA_MAPS)){if(VUELTA_MAPS[k][p])return VUELTA_MAPS[k][p];}
  return [0,0];
}"""

new_js = """function gp(p,d,r){
  if(d==='ida')return PRECIOS_IDA[p]||[0,0];
  var rm={'Loja - Vilcabamba':'preciosVueltaVilcabamba','Loja - El Tambo':'preciosVueltaElTambo','Loja - Yangana':'preciosVueltaYangana','Loja - La Elvira':'preciosVueltaLaElvira'};
  if(r&&rm[r]&&VUELTA_MAPS[rm[r]]&&VUELTA_MAPS[rm[r]][p]){var v=VUELTA_MAPS[rm[r]][p];if(v[0]>0||v[1]>0)return v;}
  if(PRECIOS_VUELTA[p])return PRECIOS_VUELTA[p];
  for(const k of Object.keys(VUELTA_MAPS)){var v2=VUELTA_MAPS[k][p];if(v2&&(v2[0]>0||v2[1]>0))return v2;}
  return [0,0];
}"""

if old_js in html_code:
    html_code = html_code.replace(old_js, new_js)
    with open(PREVIEW, 'w', encoding='utf-8') as f:
        f.write(html_code)
    print('PREVIEW: Fixed lookup to skip $0.00 overrides')
else:
    print('PREVIEW: Could not find gp function')

# === STEP 3: Load 19 Vilcabamba VUELTA directos ===
FILE = '/home/z/my-project/src/lib/tarifas-data.ts'

with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

directos = [
    ('San Pedro', 0.75, 0.40),
    ('Cararango', 0.75, 0.40),
    ('Cavianga', 0.75, 0.40),
    ('Taxiche', 0.75, 0.40),
    ('Malacatos', 1.10, 0.55),
    ('La Pe\u00f1a', 1.10, 0.55),
    ('Landangui', 1.10, 0.55),
    ('Chorrillos', 1.25, 0.65),
    ('Nangora', 1.25, 0.65),
    ('Porvenir', 1.25, 0.65),
    ('Granadillo', 1.50, 0.75),
    ('Yamba', 1.50, 0.75),
    ('Rumizhitana', 1.50, 0.75),
    ('Tres Leguas', 1.50, 0.75),
    ('Pueblo Nuevo', 1.50, 0.75),
    ('Caj\u00e1numa', 2.00, 1.00),
    ('Dos Puentes', 2.00, 1.00),
    ('Capul\u00ed', 2.50, 1.25),
    ('Loja', 2.50, 1.25),
]

# Decode unicode escapes for matching
lookup = {}
for name_raw, n, m in directos:
    name = name_raw.encode().decode('unicode_escape')
    lookup[name] = (n, m)

in_section = False
updated = 0

for i, line in enumerate(lines):
    if 'const preciosVueltaVilcabamba' in line:
        in_section = True
        continue
    if in_section and line.strip() == '};':
        break
    if not in_section:
        continue
    for name, (n, m) in lookup.items():
        if ("'" + name + "'") in line and 'normal:' in line:
            new_line = f"  '{name}': {{ normal: {n}, media: {m} }},\n"
            if lines[i].strip() != new_line.strip():
                print(f'Line {i+1}: {name} -> {n}/{m}')
                lines[i] = new_line
                updated += 1
            break

with open(FILE, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print(f'\nVilcabamba VUELTA: {updated} directos actualizados')

# === STEP 4: Regenerate ===
result = subprocess.run(['python3', PREVIEW], capture_output=True, text=True)
print(f'Preview: {result.stdout.strip()}')
if result.stderr:
    print(f'Preview ERR: {result.stderr.strip()}')

result = subprocess.run(['python3', PDF], capture_output=True, text=True)
print(f'PDF: {result.stdout.strip()}')
if result.stderr:
    print(f'PDF ERR: {result.stderr.strip()}')
