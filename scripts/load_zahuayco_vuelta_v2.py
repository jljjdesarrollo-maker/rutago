# Load Zahuayco IDA + VUELTA (clean, from backup v2 base)
import re, subprocess

FILE = '/home/z/my-project/src/lib/tarifas-data.ts'

# === 1. Load 15 Zahuayco IDA prices in preciosIda only ===
with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

ida_prices = [
    ('Masanamaca', 3.00, 1.50), ('Quinara', 3.25, 1.65), ('Chumberos', 3.75, 1.90),
    ('Palmira', 3.75, 1.90), ('Zahuayco', 4.00, 2.00),
    ('Vilc→Masan', 1.10, 0.55), ('Vilc→Quina', 2.00, 1.00), ('Vilc→Chumb', 2.00, 1.00),
    ('Vilc→Palm', 2.25, 1.15), ('Vilc→Zahua', 2.50, 1.25),
    ('Mal→Masan', 2.00, 1.00), ('Mal→Quina', 2.00, 1.00), ('Mal→Chumb', 2.50, 1.25),
    ('Mal→Palm', 2.90, 1.45), ('Mal→Zahua', 3.15, 1.60),
]

in_ida = False
ida_updated = 0
for i, line in enumerate(lines):
    if 'const preciosIda' in line:
        in_ida = True; continue
    if in_ida and line.strip() == '};': break
    if not in_ida: continue
    for key, n, m in ida_prices:
        if ("'" + key + "'") in line and 'normal:' in line:
            new_line = f"  '{key}': {{ normal: {n}, media: {m} }},\n"
            if lines[i].strip() != new_line.strip():
                lines[i] = new_line; ida_updated += 1
            break

with open(FILE, 'w', encoding='utf-8') as f:
    f.writelines(lines)
print(f'IDA: {ida_updated}/15 updated')

# === 2. Create preciosVueltaZahuayco with literal chars ===
with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

vuelta_block = """// ─── Precios VUELTA específicos: ZAHUAYCO → LOJA ───
// Directos desde Zahuayco hacia cada parada
const preciosVueltaZahuayco: Record<string, { normal: number; media: number }> = {
  'Loja': { normal: 3.50, media: 1.75 },
  'Capulí': { normal: 3.50, media: 1.75 },
  'Dos Puentes': { normal: 3.50, media: 1.75 },
  'Cajánuma': { normal: 3.50, media: 1.75 },
  'Pueblo Nuevo': { normal: 3.50, media: 1.75 },
  'Tres Leguas': { normal: 3.50, media: 1.75 },
  'Rumizhitana': { normal: 3.50, media: 1.75 },
  'Yamba': { normal: 3.25, media: 1.65 },
  'Granadillo': { normal: 3.25, media: 1.65 },
  'Porvenir': { normal: 3.25, media: 1.65 },
  'Nangora': { normal: 3.25, media: 1.65 },
  'Chorrillos': { normal: 3.15, media: 1.60 },
  'Landangui': { normal: 3.15, media: 1.60 },
  'La Peña': { normal: 3.15, media: 1.60 },
  'Malacatos': { normal: 3.15, media: 1.60 },
  'Taxiche': { normal: 3.15, media: 1.60 },
  'Cavianga': { normal: 2.75, media: 1.40 },
  'Cararango': { normal: 2.75, media: 1.40 },
  'San Pedro': { normal: 2.75, media: 1.40 },
  'Vilcabamba': { normal: 2.00, media: 1.00 },
  'Masanamaca': { normal: 1.25, media: 0.65 },
  'Quinara': { normal: 1.00, media: 0.50 },
  'Chumberos': { normal: 1.00, media: 0.50 },
  'Palmira': { normal: 0.75, media: 0.40 },
};
"""

# Find insertion point before preciosVueltaYangana
insert_idx = None
for i, line in enumerate(lines):
    if 'const preciosVueltaYangana' in line:
        j = i
        while j > 0 and (lines[j-1].strip().startswith('//') or lines[j-1].strip() == ''):
            j -= 1
        insert_idx = j
        break

if insert_idx is None:
    print('ERROR: no insertion point'); exit(1)

lines[insert_idx:insert_idx] = [vuelta_block + '\n']
with open(FILE, 'w', encoding='utf-8') as f:
    f.writelines(lines)
print(f'VUELTA: Inserted preciosVueltaZahuayco at line {insert_idx+1}')

# === 3. Update generators ===
# PDF
PDF = '/home/z/my-project/scripts/generate_tarifas_pdf.py'
with open(PDF, 'r') as f:
    c = f.read()
c = c.replace(
    "'Loja - El Tambo': 'preciosVueltaElTambo',\n    'Loja - Yangana'",
    "'Loja - El Tambo': 'preciosVueltaElTambo',\n    'Loja - Zahuayco': 'preciosVueltaZahuayco',\n    'Loja - Yangana'")
with open(PDF, 'w') as f: f.write(c)
print('PDF: Added Zahuayco to route map')

# HTML Preview
PREVIEW = '/home/z/my-project/scripts/generate_tarifas_preview.py'
with open(PREVIEW, 'r', encoding='utf-8') as f:
    c = f.read()
c = c.replace(
    "'Loja - El Tambo':'preciosVueltaElTambo','Loja - Yangana'",
    "'Loja - El Tambo':'preciosVueltaElTambo','Loja - Zahuayco':'preciosVueltaZahuayco','Loja - Yangana'")
with open(PREVIEW, 'w', encoding='utf-8') as f: f.write(c)
print('PREVIEW: Added Zahuayco to route map')

# Add Loja to Zahuayco VUELTA lists
for gp, gl in [(PREVIEW, 'PREVIEW'), (PDF, 'PDF')]:
    with open(gp, 'r', encoding='utf-8') as f:
        c = f.read()
    sections = []
    idx = 0
    while True:
        pos = c.find("'vuelta': [", idx)
        if pos == -1: break
        sections.append(pos); idx = pos + 1
    if len(sections) < 2:
        continue
    zs = sections[1]
    cp = c.find("'Capul\\u00ed'", zs)
    if cp == -1: continue
    eb = c.find('],', cp)
    if "'Loja'" in c[cp:eb]:
        print(f'{gl}: Loja already in Zahuayco VUELTA'); continue
    nl = c.find('\n', cp)
    c = c[:nl+1] + "    'Loja',\n" + c[nl+1:]
    with open(gp, 'w', encoding='utf-8') as f: f.write(c)
    print(f'{gl}: Added Loja to Zahuayco VUELTA')

# === 4. Regenerate ===
r = subprocess.run(['python3', PREVIEW], capture_output=True, text=True)
print(f'Preview: {r.stdout.strip()}')
if r.stderr: print(f'  ERR: {r.stderr.strip()[:300]}')
r = subprocess.run(['python3', PDF], capture_output=True, text=True)
print(f'PDF: {r.stdout.strip()}')
if r.stderr: print(f'  ERR: {r.stderr.strip()[:300]}')
