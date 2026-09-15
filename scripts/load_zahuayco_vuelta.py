# Create preciosVueltaZahuayco + add to generators + load 24 directos
import re, subprocess

FILE = '/home/z/my-project/src/lib/tarifas-data.ts'
with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# 24 directos
names = [
    'Loja', 'Capul\u00ed', 'Dos Puentes', 'Caj\u00e1numa', 'Pueblo Nuevo',
    'Tres Leguas', 'Rumizhitana', 'Yamba', 'Granadillo', 'Porvenir',
    'Nangora', 'Chorrillos', 'Landangui', 'La Pe\u00f1a', 'Malacatos',
    'Taxiche', 'Cavianga', 'Cararango', 'San Pedro', 'Vilcabamba',
    'Masanamaca', 'Quinara', 'Chumberos', 'Palmira',
]
normals = [3.50,3.50,3.50,3.50,3.50,3.50,3.50,3.25,3.25,3.25,3.25,3.15,3.15,3.15,3.15,3.15,2.75,2.75,2.75,2.00,1.25,1.00,1.00,0.75]
medias = [1.75,1.75,1.75,1.75,1.75,1.75,1.75,1.65,1.65,1.65,1.65,1.60,1.60,1.60,1.60,1.60,1.40,1.40,1.40,1.00,0.65,0.50,0.50,0.40]

# Decode names
names_d = [n.encode().decode('unicode_escape') for n in names]

# Build map block
map_lines = [
    '// \u2500\u2500\u2500 Precios VUELTA espec\u00edficos: ZAHUAYCO \u2192 LOJA \u2500\u2500\u2500\n',
    '// Directos desde Zahuayco hacia cada parada\n',
    'const preciosVueltaZahuayco: Record<string, { normal: number; media: number }> = {\n',
]
for k, n, m in zip(names_d, normals, medias):
    map_lines.append(f"  '{k}': {{ normal: {n}, media: {m} }},\n")
map_lines.append('};\n\n')

# Find insertion point: before preciosVueltaYangana comment block
insert_idx = None
for i, line in enumerate(lines):
    if 'const preciosVueltaYangana' in line:
        j = i
        while j > 0 and lines[j-1].strip().startswith('//'):
            j -= 1
        while j > 0 and lines[j-1].strip() == '':
            j -= 1
        insert_idx = j
        break

if insert_idx is None:
    print('ERROR: no insertion point'); exit(1)

lines[insert_idx:insert_idx] = map_lines
with open(FILE, 'w', encoding='utf-8') as f:
    f.writelines(lines)
print(f'Inserted preciosVueltaZahuayco at line {insert_idx+1} ({len(names)} entries)')

# === Add Zahuayco to generators route maps ===

# PDF
PDF = '/home/z/my-project/scripts/generate_tarifas_pdf.py'
with open(PDF, 'r') as f:
    c = f.read()
old = """ROUTE_MAP_KEYS = {
    'Loja - Vilcabamba': 'preciosVueltaVilcabamba',
    'Loja - El Tambo': 'preciosVueltaElTambo',
    'Loja - Yangana': 'preciosVueltaYangana',
    'Loja - La Elvira': 'preciosVueltaLaElvira',
}"""
new = """ROUTE_MAP_KEYS = {
    'Loja - Vilcabamba': 'preciosVueltaVilcabamba',
    'Loja - El Tambo': 'preciosVueltaElTambo',
    'Loja - Zahuayco': 'preciosVueltaZahuayco',
    'Loja - Yangana': 'preciosVueltaYangana',
    'Loja - La Elvira': 'preciosVueltaLaElvira',
}"""
if old in c:
    c = c.replace(old, new)
    with open(PDF, 'w') as f: f.write(c)
    print('PDF: Added Zahuayco to route map')

# HTML Preview - use simpler string replacement
PREVIEW = '/home/z/my-project/scripts/generate_tarifas_preview.py'
with open(PREVIEW, 'r', encoding='utf-8') as f:
    c = f.read()
old_rm = "'Loja - El Tambo':'preciosVueltaElTambo','Loja - Yangana'"
new_rm = "'Loja - El Tambo':'preciosVueltaElTambo','Loja - Zahuayco':'preciosVueltaZahuayco','Loja - Yangana'"
if old_rm in c:
    c = c.replace(old_rm, new_rm)
    with open(PREVIEW, 'w', encoding='utf-8') as f: f.write(c)
    print('PREVIEW: Added Zahuayco to route map')

# === Add Loja to Zahuayco VUELTA route lists ===
for gen_path, label in [(PREVIEW, 'PREVIEW'), (PDF, 'PDF')]:
    with open(gen_path, 'r', encoding='utf-8') as f:
        c = f.read()
    sections = []
    idx = 0
    while True:
        pos = c.find("'vuelta': [", idx)
        if pos == -1: break
        sections.append(pos)
        idx = pos + 1
    if len(sections) < 2:
        print(f'{label}: Not enough vuelta sections'); continue
    zs = sections[1]  # 2nd = Zahuayco
    cp = c.find("'Capul\\u00ed'", zs)
    if cp == -1: print(f'{label}: No Capuli'); continue
    eb = c.find('],', cp)
    if "'Loja'" in c[cp:eb]:
        print(f'{label}: Loja already in Zahuayco VUELTA'); continue
    nl = c.find('\n', cp)
    c = c[:nl+1] + "    'Loja',\n" + c[nl+1:]
    with open(gen_path, 'w', encoding='utf-8') as f: f.write(c)
    print(f'{label}: Added Loja to Zahuayco VUELTA')

# === Regenerate ===
r = subprocess.run(['python3', PREVIEW], capture_output=True, text=True)
print(f'Preview: {r.stdout.strip()}')
if r.stderr: print(f'  ERR: {r.stderr.strip()[:200]}')
r = subprocess.run(['python3', PDF], capture_output=True, text=True)
print(f'PDF: {r.stdout.strip()}')
if r.stderr: print(f'  ERR: {r.stderr.strip()[:200]}')
