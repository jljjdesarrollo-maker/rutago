#!/usr/bin/env python3
"""
Update tarifas-data.ts with prices from XLSX - V2 (robust block replacement)
"""

TS_PATH = '/home/z/my-project/src/lib/tarifas-data.ts'

with open(TS_PATH, 'r', encoding='utf-8') as f:
    lines = f.readlines()

def find_block_start(lines, block_name):
    """Find the line index where the const block starts."""
    for i, line in enumerate(lines):
        if f'const {block_name}' in line:
            return i
    return -1

def find_block_end(lines, start_idx):
    """Find the line index of the closing '};' of the object.
    We start counting braces from the line that has '= {'
    """
    # Find the line with '= {' (the actual object opening)
    obj_start = start_idx
    for i in range(start_idx, min(start_idx + 3, len(lines))):
        if '= {' in lines[i]:
            obj_start = i
            break
    
    depth = 0
    for i in range(obj_start, len(lines)):
        # Count { and } but skip those inside strings/comments
        line = lines[i]
        for ch in line:
            if ch == '{':
                depth += 1
            elif ch == '}':
                depth -= 1
        if depth == 0 and '};' in lines[i]:
            return i
    return -1

def fmt(normal, media):
    return f'{{ normal: {normal:.2f}, media: {media:.2f} }}'

# ═══════════════════════════════════════════════════════════════
# PRICE DATA FROM XLSX (authoritative)
# ═══════════════════════════════════════════════════════════════

precios_directos = {
    # Loja - Vilcabamba
    'Dos Puentes':  (0.75, 0.40),
    'Cajánuma': (1.25, 0.55),
    'Pueblo Nuevo': (1.25, 0.55),
    'Tres Leguas':  (1.25, 0.55),
    'Rumizhitana':  (1.25, 0.55),
    'Yamba':        (1.25, 0.55),
    'Granadillo':   (1.40, 0.65),
    'Porvenir':     (1.40, 0.65),
    'Nangora':      (1.50, 0.75),
    'Chorrillos':   (1.50, 0.75),
    'Landangui':    (1.75, 0.90),
    'La Peña': (1.75, 0.90),
    'Malacatos':    (2.00, 1.00),
    'Taxiche':      (2.00, 1.00),
    'Cavianga':     (2.25, 1.15),
    'Cararango':    (2.25, 1.15),
    'San Pedro':    (2.25, 1.15),
    'Vilcabamba':   (2.50, 1.25),
    # Loja - El Tambo
    'Ceibopamba':    (2.25, 1.15),
    'Trinidad':      (2.25, 1.15),
    'San José':      (2.25, 1.15),
    'Santo Domingo': (2.50, 1.25),
    'Naranjo Dulce': (2.75, 1.40),
    'Zhotahuayco':   (3.00, 1.50),
    'La Merced':     (3.25, 1.65),
    'San Agustín':   (3.75, 1.90),
    'La Era':        (3.75, 1.90),
    'La Capilla':    (4.00, 2.00),
    'San Bernardo':  (4.00, 2.00),
    'El Tambo':      (4.00, 2.00),
    # Loja - Zahuayco
    'Masanamaca': (3.00, 1.50),
    'Quinara':    (3.25, 1.65),
    'Chumberos':  (3.75, 1.90),
    'Palmira':    (3.75, 1.90),
    'Zahuayco':   (4.00, 2.00),
    # Loja - La Elvira
    'Cucanama':    (2.50, 1.25),
    'Linderos':    (2.75, 1.40),
    'Santorum':    (3.00, 1.50),
    'Solanda':     (3.00, 1.50),
    'Moyococha':   (3.00, 1.50),
    'Tumianuma':   (3.25, 1.65),
    'Comunidades': (3.50, 1.65),
    'La Elvira':   (3.75, 1.90),
    # Loja - Yangana
    'Suro':    (3.25, 1.65),
    'Yangana': (3.75, 1.90),
}

# ═══════════════════════════════════════════════════════════════
# GENERATE preciosIda
# ═══════════════════════════════════════════════════════════════

ida_entries = []

# Vilcabamba directos
ida_entries.append(('// ═══ LOJA - VILCABAMBA ═══', None))
vilc_dir = ['Dos Puentes','Cajánuma','Pueblo Nuevo','Tres Leguas','Rumizhitana','Yamba',
            'Granadillo','Porvenir','Nangora','Chorrillos','Landangui','La Peña',
            'Malacatos','Taxiche','Cavianga','Cararango','San Pedro','Vilcabamba']
for s in vilc_dir:
    ida_entries.append((s, precios_directos[s]))

# Vilcabamba intermediates (parada -> Malacatos) - from XLSX
ida_entries.append(('// Tramos intermedios ida (desde parada hacia Malacatos)', None))
vilc_inter = [
    ('Peña→Mal', 0.75, 0.40),   # La Peña -> Malacatos
    ('Land→Mal',  0.75, 0.40),   # Landangui -> Malacatos
    ('Chorri→Mal',0.75, 0.40),   # Chorrillos -> Malacatos
    ('Nango→Mal', 0.75, 0.40),   # Nangora -> Malacatos
    ('Porv→Mal',  1.10, 0.55),   # Porvenir -> Malacatos
    ('Gran→Mal',  1.10, 0.55),   # Granadillo -> Malacatos
    ('Yamba→Mal', 1.10, 0.55),   # Yamba -> Malacatos
    ('Rumi→Mal',  1.10, 0.55),   # Rumizhitana -> Malacatos
    ('T.Leguas→Mal',1.10, 0.55), # Tres Leguas -> Malacatos
    ('P.Nuevo→Mal',1.10, 0.55),  # Pueblo Nuevo -> Malacatos
    ('Caja→Mal',  1.50, 0.75),   # Cajanuma -> Malacatos
    ('D.Puen→Mal',1.50, 0.75),   # Dos Puentes -> Malacatos
    ('Capulí→Mal',2.00, 1.00),   # Capulí -> Malacatos
]
for key, n, m in vilc_inter:
    ida_entries.append((key, (n, m)))

# El Tambo directos
ida_entries.append(('// ═══ LOJA - EL TAMBO (ramifica en Malacatos) ═══', None))
tambo_dir = ['Ceibopamba','Trinidad','San José','Santo Domingo','Naranjo Dulce',
             'Zhotahuayco','La Merced','San Agustín','La Era','La Capilla','San Bernardo','El Tambo']
for s in tambo_dir:
    ida_entries.append((s, precios_directos[s]))

# El Tambo intermediates (Malacatos -> parada)
ida_entries.append(('// Intermedios El Tambo IDA (desde Malacatos hacia El Tambo)', None))
tambo_inter = [
    ('Mal→Ceibop',  0.75, 0.40),
    ('Mal→Trinidad',0.75, 0.40),
    ('Mal→S.Jose',  0.75, 0.40),
    ('Mal→StoDom',  1.00, 0.50),
    ('Mal→N.Dulce', 1.25, 0.65),
    ('Mal→Zhotahu', 1.50, 0.75),
    ('Mal→LaMerc',  1.75, 0.90),
    ('Mal→S.Agust', 1.75, 0.90),
    ('Mal→LaEra',   2.00, 1.00),
    ('Mal→LaCap',   2.25, 1.15),
    ('Mal→S.Bern',  2.25, 1.15),
    ('Mal→ElTambo', 2.25, 1.15),
]
for key, n, m in tambo_inter:
    ida_entries.append((key, (n, m)))

# Zahuayco directos
ida_entries.append(('// ═══ LOJA - ZAHUAYCO (pasa por Vilcabamba) ═══', None))
zahua_dir = ['Masanamaca','Quinara','Chumberos','Palmira','Zahuayco']
for s in zahua_dir:
    ida_entries.append((s, precios_directos[s]))

# Zahuayco intermediates
ida_entries.append(('// Intermedios Zahuayco IDA (desde Vilcabamba)', None))
zahua_vilc = [
    ('Vilc→Masan',1.10, 0.55),
    ('Vilc→Quina',2.00, 1.00),
    ('Vilc→Chumb', 2.00, 1.00),
    ('Vilc→Palm', 2.25, 1.15),
    ('Vilc→Zahua', 2.50, 1.25),
]
for key, n, m in zahua_vilc:
    ida_entries.append((key, (n, m)))

ida_entries.append(('// Intermedios Zahuayco IDA (desde Malacatos)', None))
zahua_mal = [
    ('Mal→Masan', 2.00, 1.00),
    ('Mal→Quina', 2.50, 1.25),
    ('Mal→Chumb', 2.50, 1.25),
    ('Mal→Palm',  2.90, 1.45),
    ('Mal→Zahua', 3.15, 1.60),
]
for key, n, m in zahua_mal:
    ida_entries.append((key, (n, m)))

# La Elvira directos
ida_entries.append(('// ═══ LOJA - LA ELVIRA (pasa por Vilcabamba) ═══', None))
elvira_dir = ['Cucanama','Linderos','Santorum','Solanda','Moyococha','Tumianuma','Comunidades','La Elvira']
for s in elvira_dir:
    ida_entries.append((s, precios_directos[s]))

# La Elvira intermediates (from Malacatos)
ida_entries.append(('// Intermedios La Elvira IDA (desde Malacatos hacia La Elvira)', None))
elvira_mal = [
    ('Mal→Cucan', 1.60, 0.80),
    ('Mal→Lind',  2.00, 1.00),
    ('Mal→Santo', 2.00, 1.00),
    ('Mal→Solan', 2.00, 1.00),
    ('Mal→Moyoc', 2.00, 1.00),
    ('Mal→Tumia', 2.50, 1.25),
    ('Mal→Quina', 2.50, 1.25),
    ('Mal→Comun', 2.50, 1.25),
    ('Mal→Elvira',3.00, 1.50),
]
for key, n, m in elvira_mal:
    ida_entries.append((key, (n, m)))

# La Elvira intermediates (from Vilcabamba)
ida_entries.append(('// Intermedios La Elvira IDA (desde Vilcabamba hacia La Elvira)', None))
elvira_vilc = [
    ('Vilc→Cucan', 0.75, 0.40),
    ('Vilc→Lind',  1.10, 0.55),
    ('Vilc→Santo', 1.50, 0.65),
    ('Vilc→Solan', 1.50, 0.65),
    ('Vilc→Moyoc', 1.50, 0.65),
    ('Vilc→Tumia', 2.00, 1.00),
    ('Vilc→Quina', 2.00, 1.00),
    ('Vilc→Comun', 2.00, 1.00),
    ('Vilc→Elvira',2.40, 1.20),
]
for key, n, m in elvira_vilc:
    ida_entries.append((key, (n, m)))

# Yangana directos
ida_entries.append(('// ═══ LOJA - YANGANA (pasa por Vilcabamba) ═══', None))
yang_dir = ['Suro','Yangana']
for s in yang_dir:
    ida_entries.append((s, precios_directos[s]))

# Yangana intermediates
ida_entries.append(('// Intermedios Yangana IDA (desde Vilcabamba)', None))
yang_vilc = [
    ('Vilc→Masan',1.10, 0.55),  # shared with Zahuayco
    ('Vilc→Suro', 1.60, 0.80),
    ('Vilc→Yangana',2.00, 1.00),
]
for key, n, m in yang_vilc:
    ida_entries.append((key, (n, m)))

ida_entries.append(('// Intermedios Yangana IDA (desde Malacatos)', None))
yang_mal = [
    ('Mal→Masan', 2.00, 1.00),   # shared with Zahuayco
    ('Mal→Suro',  2.00, 1.00),
    ('Mal→Yangana',2.50, 1.25),
]
for key, n, m in yang_mal:
    ida_entries.append((key, (n, m)))

# ═══════════════════════════════════════════════════════════════
# FORMAT preciosIda block
# ═══════════════════════════════════════════════════════════════

def format_block(block_name, entries, comment=None):
    result = []
    if comment:
        result.append(f'// ─── {comment} ───')
    result.append(f'const {block_name}: Record<string, {{ normal: number; media: number }}> = {{')
    for entry in entries:
        if entry[1] is None:
            result.append(f'  {entry[0]}')
        else:
            key, (n, m) = entry
            result.append(f"  '{key}': {fmt(n, m)},")
    result.append('};')
    return '\n'.join(result)

ida_block = format_block('preciosIda', ida_entries, 'Precios IDA (desde Loja hacia el destino)')

# ═══════════════════════════════════════════════════════════════
# GENERATE preciosVuelta (same as ida - user confirmed same distance)
# ═══════════════════════════════════════════════════════════════

vuelta_entries = []
vuelta_entries.append(('// Vuelta = Ida (misma distancia confirmada por usuario)', None))

# All directo stops
for s in vilc_dir + tambo_dir + zahua_dir + elvira_dir + yang_dir:
    vuelta_entries.append((s, precios_directos[s]))

# La Elvira intermediates (same prices)
vuelta_entries.append(('// Intermedios La Elvira (vuelta = ida)', None))
for key, n, m in elvira_mal + elvira_vilc:
    vuelta_entries.append((key, (n, m)))

# Vilcabamba intermediates (parada -> Malacatos)
vuelta_entries.append(('// Intermedios Vilcabamba (vuelta: desde parada hacia Malacatos)', None))
for key, n, m in vilc_inter:
    vuelta_entries.append((key, (n, m)))

# Zahuayco intermediates
vuelta_entries.append(('// Intermedios Zahuayco (vuelta = ida)', None))
for key, n, m in zahua_vilc + zahua_mal:
    vuelta_entries.append((key, (n, m)))

# Yangana intermediates
vuelta_entries.append(('// Intermedios Yangana (vuelta = ida)', None))
for key, n, m in yang_vilc + yang_mal:
    vuelta_entries.append((key, (n, m)))

# El Tambo intermediates
vuelta_entries.append(('// Intermedios El Tambo (vuelta = ida)', None))
for key, n, m in tambo_inter:
    vuelta_entries.append((key, (n, m)))

vuelta_block = format_block('preciosVuelta', vuelta_entries, 'Precios VUELTA (desde el destino hacia Loja)')

# ═══════════════════════════════════════════════════════════════
# GENERATE preciosVueltaElTambo (simplified - same prices)
# ═══════════════════════════════════════════════════════════════

tambo_vuelta_entries = []
tambo_vuelta_entries.append(('// Vuelta El Tambo = Ida (misma distancia)', None))
for s in tambo_dir + vilc_dir:
    tambo_vuelta_entries.append((s, precios_directos[s]))

# El Tambo intermediates for vuelta
tambo_vuelta_entries.append(('// Intermedios El Tambo vuelta (desde Malacatos)', None))
for key, n, m in tambo_inter:
    tambo_vuelta_entries.append((key, (n, m)))

tambo_block = format_block('preciosVueltaElTambo', tambo_vuelta_entries, 'Precios VUELTA específicos: EL TAMBO → LOJA')

# Count entries
ida_count = sum(1 for e in ida_entries if e[1] is not None)
vuelta_count = sum(1 for e in vuelta_entries if e[1] is not None)
tambo_count = sum(1 for e in tambo_vuelta_entries if e[1] is not None)
print(f'preciosIda: {ida_count} entries')
print(f'preciosVuelta: {vuelta_count} entries')
print(f'preciosVueltaElTambo: {tambo_count} entries')

# ═══════════════════════════════════════════════════════════════
# REPLACE BLOCKS IN FILE
# ═══════════════════════════════════════════════════════════════

# First, restore the file from git to undo the partial V1 changes
import subprocess
subprocess.run(['git', 'checkout', 'src/lib/tarifas-data.ts'], cwd='/home/z/my-project', capture_output=True)
with open(TS_PATH, 'r', encoding='utf-8') as f:
    lines = f.readlines()
print(f'Restored file: {len(lines)} lines')

def replace_block(lines, block_name, new_block_text):
    """Replace a const block in the file lines."""
    start = find_block_start(lines, block_name)
    if start < 0:
        print(f'ERROR: {block_name} not found!')
        return lines
    end = find_block_end(lines, start)
    if end < 0:
        print(f'ERROR: {block_name} end not found!')
        return lines
    
    # Preserve leading whitespace
    indent = lines[start][:len(lines[start]) - len(lines[start].lstrip())]
    
    new_lines = lines[:start] + [new_block_text + '\n'] + lines[end+1:]
    print(f'OK: Replaced {block_name} (lines {start+1}-{end+1}, {end-start+1} lines)')
    return new_lines

lines = replace_block(lines, 'preciosIda', ida_block)
lines = replace_block(lines, 'preciosVuelta', vuelta_block)
lines = replace_block(lines, 'preciosVueltaElTambo', tambo_block)

content = ''.join(lines)

# ═══════════════════════════════════════════════════════════════
# ADD TRINIDAD TO PARADA_ZONA
# ═══════════════════════════════════════════════════════════════

if "'Trinidad':" not in content:
    content = content.replace(
        "  'Ceibopamba': 'blue',",
        "  'Ceibopamba': 'blue',\n  'Trinidad': 'blue',"
    )
    print('OK: Trinidad added to PARADA_ZONA')

# ═══════════════════════════════════════════════════════════════
# ADD NEW PARADA_ZONA ENTRIES
# ═══════════════════════════════════════════════════════════════

new_zonas = {
    'Peña→Mal': 'yellow', 'Chorri→Mal': 'yellow', 'Porv→Mal': 'yellow',
    'Gran→Mal': 'yellow', 'Yamba→Mal': 'yellow',
    'P.Nuevo→Mal': 'yellow', 'Caja→Mal': 'green', 'D.Puen→Mal': 'green',
    'Capulí→Mal': 'green',
    'Mal→Trinidad': 'blue',
    'Vilc→Masan': 'blue', 'Vilc→Quina': 'blue', 'Vilc→Chumb': 'blue',
    'Vilc→Palm': 'blue', 'Vilc→Zahua': 'blue',
    'Mal→Masan': 'blue', 'Mal→Quina': 'blue', 'Mal→Chumb': 'blue',
    'Mal→Palm': 'blue', 'Mal→Zahua': 'blue',
    'Vilc→Suro': 'blue', 'Vilc→Yangana': 'blue',
    'Mal→Suro': 'blue', 'Mal→Yangana': 'blue',
}

for key, zona in new_zonas.items():
    if f"'{key}':" not in content:
        content = content.replace(
            '};\n\nexport const ZONA_COLORS',
            f"  '{key}': '{zona}',\n}};\n\nexport const ZONA_COLORS"
        )

print(f'OK: Added/verified {len(new_zonas)} PARADA_ZONA entries')

# ═══════════════════════════════════════════════════════════════
# UPDATE RUTA_PARADAS
# ═══════════════════════════════════════════════════════════════

# Add Trinidad to El Tambo route
content = content.replace(
    "'Malacatos', 'Ceibopamba', 'San José'",
    "'Malacatos', 'Ceibopamba', 'Trinidad', 'San José'"
)
# Add to vuelta
content = content.replace(
    "'Ceibopamba', 'Malacatos',\n",
    "'Ceibopamba', 'Trinidad', 'Malacatos',\n"
)

# Remove old Vilcabamba intermediates from RUTA_PARADAS
old_vilc_int = ['Rumi→Vilc', 'Rumi→Mal', 'Rumi→Prv', 'Nango→Vilc', 'Nango→Mal', 'Nango→Carar',
                 'Land→Vilc', 'Land→Mal', 'Mal→Vilc', 'T.Leguas→Mal',
                 'Taxiche→Vilc', 'Cararango→Vilc', 'S.Pedro→Vilc']

# Add new Vilcabamba intermediates
new_vilc_int = ['Peña→Mal', 'Land→Mal', 'Chorri→Mal', 'Nango→Mal',
                 'Porv→Mal', 'Gran→Mal', 'Yamba→Mal', 'Rumi→Mal',
                 'T.Leguas→Mal', 'P.Nuevo→Mal', 'Caja→Mal', 'D.Puen→Mal', 'Capulí→Mal']

# In Loja-Vilcabamba ida: replace old intermediates with new ones
old_str = "'Vilcabamba',\n          'Rumi→Vilc', 'Rumi→Mal', 'Rumi→Prv', 'Nango→Vilc', 'Nango→Mal', 'Nango→Carar', 'Land→Vilc', 'Land→Mal', 'Mal→Vilc',\n          'T.Leguas→Mal', 'Taxiche→Vilc', 'Cararango→Vilc', 'S.Pedro→Vilc'"
new_str = "'Vilcabamba',\n          " + ', '.join(f"'{k}'" for k in new_vilc_int)

if old_str in content:
    content = content.replace(old_str, new_str)
    print('OK: Replaced Vilcabamba ida intermediates in RUTA_PARADAS')
else:
    # Try to find a close match
    print('WARNING: Could not find exact Vilcabamba intermediates string')
    # Manual approach: find and replace individually
    for old_key in old_vilc_int:
        content = content.replace(f"'{old_key}', ", '')
        print(f'  Removed: {old_key}')

# Remove old El Tambo vuelta intermediates from RUTA_PARADAS
old_tambo_vuelta_int = ['Era→Merc', 'Era→Malac', 'Merc→Ceibop', 'Merc→Malac', 'Merc→Land',
                        'Zhot→Malac', 'Zhot→Merc', 'Zhot→Ceibop',
                        'Mal→Peña', 'Mal→Chorri', 'Mal→Nango2', 'Mal→Porv2',
                        'Mal→T.Leguas', 'Mal→P.Nuevo', 'Mal→Rumi2', 'Mal→Caja', 'Mal→D.Puen']
for key in old_tambo_vuelta_int:
    content = content.replace(f"'{key}',", '')
    content = content.replace(f"'{key}'", '')

# Remove old vuelta intermediates (Mal→Rumi, Mal→Nango, Mal→Porv)
old_vuelta_int = ['Mal→Rumi', 'Mal→Nango', 'Mal→Porv']
for key in old_vuelta_int:
    content = content.replace(f"'{key}',", '')
    content = content.replace(f"'{key}'", '')

print(f'OK: Removed {len(old_tambo_vuelta_int) + len(old_vuelta_int)} eliminated keys')

# ═══════════════════════════════════════════════════════════════
# UPDATE COMMENT
# ═══════════════════════════════════════════════════════════════

content = content.replace(
    '// Actualizado: Agosto 2025 — precios diferenciados por dirección (ida/vuelta)',
    '// Actualizado: Agosto 2026 — precios del tarifario oficial XLSX'
)

# ═══════════════════════════════════════════════════════════════
# WRITE
# ═══════════════════════════════════════════════════════════════

with open(TS_PATH, 'w', encoding='utf-8') as f:
    f.write(content)

# VERIFY
zero_count = content.count('{ normal: 0.00, media: 0.00 }')
total_count = content.count('{ normal:')
print(f'\nVerification:')
print(f'  Total price entries: {total_count}')
print(f'  Remaining zero prices: {zero_count}')
print(f'  Prices with values: {total_count - zero_count}')

if zero_count > 0:
    # Show where zeros remain
    import re
    zeros = re.findall(r"'([^']+)':\s*\{ normal: 0\.00, media: 0\.00 \}", content)
    print(f'  Zero-price keys: {zeros[:20]}...')
