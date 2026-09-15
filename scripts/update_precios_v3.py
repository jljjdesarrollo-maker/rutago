#!/usr/bin/env python3
"""
Update tarifas-data.ts with prices from XLSX - V3 (clean approach)
1. Restore from git
2. Replace price blocks ONLY
3. Carefully clean PARADA_ZONA (remove orphaned entries)
4. Update RUTA_PARADAS (add Trinidad, update intermediates)
"""

import subprocess, re

TS_PATH = '/home/z/my-project/src/lib/tarifas-data.ts'

# Restore clean state
subprocess.run(['git', 'checkout', 'src/lib/tarifas-data.ts'], cwd='/home/z/my-project', capture_output=True)

with open(TS_PATH, 'r', encoding='utf-8') as f:
    content = f.read()

print(f'File restored: {len(content)} chars, {content.count(chr(10))} lines')

def fmt(n, m):
    return f'{{ normal: {n:.2f}, media: {m:.2f} }}'

# ═══════════════════════════════════════════════════════════════
# PRICE DATA FROM XLSX
# ═══════════════════════════════════════════════════════════════

D = {
    'Dos Puentes':(0.75,0.40),'Cajánuma':(1.25,0.55),'Pueblo Nuevo':(1.25,0.55),
    'Tres Leguas':(1.25,0.55),'Rumizhitana':(1.25,0.55),'Yamba':(1.25,0.55),
    'Granadillo':(1.40,0.65),'Porvenir':(1.40,0.65),'Nangora':(1.50,0.75),
    'Chorrillos':(1.50,0.75),'Landangui':(1.75,0.90),'La Peña':(1.75,0.90),
    'Malacatos':(2.00,1.00),'Taxiche':(2.00,1.00),'Cavianga':(2.25,1.15),
    'Cararango':(2.25,1.15),'San Pedro':(2.25,1.15),'Vilcabamba':(2.50,1.25),
    'Ceibopamba':(2.25,1.15),'Trinidad':(2.25,1.15),'San José':(2.25,1.15),
    'Santo Domingo':(2.50,1.25),'Naranjo Dulce':(2.75,1.40),
    'Zhotahuayco':(3.00,1.50),'La Merced':(3.25,1.65),
    'San Agustín':(3.75,1.90),'La Era':(3.75,1.90),
    'La Capilla':(4.00,2.00),'San Bernardo':(4.00,2.00),'El Tambo':(4.00,2.00),
    'Masanamaca':(3.00,1.50),'Quinara':(3.25,1.65),'Chumberos':(3.75,1.90),
    'Palmira':(3.75,1.90),'Zahuayco':(4.00,2.00),
    'Cucanama':(2.50,1.25),'Linderos':(2.75,1.40),'Santorum':(3.00,1.50),
    'Solanda':(3.00,1.50),'Moyococha':(3.00,1.50),'Tumianuma':(3.25,1.65),
    'Comunidades':(3.50,1.65),'La Elvira':(3.75,1.90),
    'Suro':(3.25,1.65),'Yangana':(3.75,1.90),
}

# ═══════════════════════════════════════════════════════════════
# BUILD BLOCKS
# ═══════════════════════════════════════════════════════════════

def block(name, entries, comment):
    lines = [f'// ─── {comment} ───', f'const {name}: Record<string, {{ normal: number; media: number }}> = {{']
    for e in entries:
        if e[1] is None:
            lines.append(f'  {e[0]}')
        else:
            lines.append(f"  '{e[0]}': {fmt(*e[1])},")
    lines.append('};')
    return '\n'.join(lines)

# --- preciosIda ---
ida = []
ida.append(('// ═══ LOJA - VILCABAMBA ═══', None))
for s in ['Dos Puentes','Cajánuma','Pueblo Nuevo','Tres Leguas','Rumizhitana','Yamba','Granadillo','Porvenir','Nangora','Chorrillos','Landangui','La Peña','Malacatos','Taxiche','Cavianga','Cararango','San Pedro','Vilcabamba']:
    ida.append((s, D[s]))

ida.append(('// Tramos intermedios ida (desde parada hacia Malacatos)', None))
for k,n,m in [('Peña→Mal',0.75,0.40),('Land→Mal',0.75,0.40),('Chorri→Mal',0.75,0.40),('Nango→Mal',0.75,0.40),('Porv→Mal',1.10,0.55),('Gran→Mal',1.10,0.55),('Yamba→Mal',1.10,0.55),('Rumi→Mal',1.10,0.55),('T.Leguas→Mal',1.10,0.55),('P.Nuevo→Mal',1.10,0.55),('Caja→Mal',1.50,0.75),('D.Puen→Mal',1.50,0.75),('Capulí→Mal',2.00,1.00)]:
    ida.append((k,(n,m)))

ida.append(('// ═══ LOJA - EL TAMBO (ramifica en Malacatos, NO pasa Vilcabamba) ═══', None))
for s in ['Ceibopamba','Trinidad','San José','Santo Domingo','Naranjo Dulce','Zhotahuayco','La Merced','San Agustín','La Era','La Capilla','San Bernardo','El Tambo']:
    ida.append((s, D[s]))

ida.append(('// Intermedios El Tambo IDA (desde Malacatos hacia El Tambo)', None))
for k,n,m in [('Mal→Ceibop',0.75,0.40),('Mal→Trinidad',0.75,0.40),('Mal→S.Jose',0.75,0.40),('Mal→StoDom',1.00,0.50),('Mal→N.Dulce',1.25,0.65),('Mal→Zhotahu',1.50,0.75),('Mal→LaMerc',1.75,0.90),('Mal→S.Agust',1.75,0.90),('Mal→LaEra',2.00,1.00),('Mal→LaCap',2.25,1.15),('Mal→S.Bern',2.25,1.15),('Mal→ElTambo',2.25,1.15)]:
    ida.append((k,(n,m)))

ida.append(('// ═══ LOJA - ZAHUAYCO (pasa por Vilcabamba) ═══', None))
for s in ['Masanamaca','Quinara','Chumberos','Palmira','Zahuayco']:
    ida.append((s, D[s]))
ida.append(('// Intermedios Zahuayco IDA (desde Vilcabamba)', None))
for k,n,m in [('Vilc→Masan',1.10,0.55),('Vilc→Quina',2.00,1.00),('Vilc→Chumb',2.00,1.00),('Vilc→Palm',2.25,1.15),('Vilc→Zahua',2.50,1.25)]:
    ida.append((k,(n,m)))
ida.append(('// Intermedios Zahuayco IDA (desde Malacatos)', None))
for k,n,m in [('Mal→Masan',2.00,1.00),('Mal→Quina',2.50,1.25),('Mal→Chumb',2.50,1.25),('Mal→Palm',2.90,1.45),('Mal→Zahua',3.15,1.60)]:
    ida.append((k,(n,m)))

ida.append(('// ═══ LOJA - LA ELVIRA (pasa por Vilcabamba) ═══', None))
for s in ['Cucanama','Linderos','Santorum','Solanda','Moyococha','Tumianuma','Comunidades','La Elvira']:
    ida.append((s, D[s]))
ida.append(('// Intermedios La Elvira IDA (desde Malacatos hacia La Elvira)', None))
for k,n,m in [('Mal→Cucan',1.60,0.80),('Mal→Lind',2.00,1.00),('Mal→Santo',2.00,1.00),('Mal→Solan',2.00,1.00),('Mal→Moyoc',2.00,1.00),('Mal→Tumia',2.50,1.25),('Mal→Quina',2.50,1.25),('Mal→Comun',2.50,1.25),('Mal→Elvira',3.00,1.50)]:
    ida.append((k,(n,m)))
ida.append(('// Intermedios La Elvira IDA (desde Vilcabamba hacia La Elvira)', None))
for k,n,m in [('Vilc→Cucan',0.75,0.40),('Vilc→Lind',1.10,0.55),('Vilc→Santo',1.50,0.65),('Vilc→Solan',1.50,0.65),('Vilc→Moyoc',1.50,0.65),('Vilc→Tumia',2.00,1.00),('Vilc→Quina',2.00,1.00),('Vilc→Comun',2.00,1.00),('Vilc→Elvira',2.40,1.20)]:
    ida.append((k,(n,m)))

ida.append(('// ═══ LOJA - YANGANA (pasa por Vilcabamba) ═══', None))
for s in ['Suro','Yangana']:
    ida.append((s, D[s]))
ida.append(('// Intermedios Yangana IDA (desde Vilcabamba)', None))
for k,n,m in [('Vilc→Masan',1.10,0.55),('Vilc→Suro',1.60,0.80),('Vilc→Yangana',2.00,1.00)]:
    ida.append((k,(n,m)))
ida.append(('// Intermedios Yangana IDA (desde Malacatos)', None))
for k,n,m in [('Mal→Masan',2.00,1.00),('Mal→Suro',2.00,1.00),('Mal→Yangana',2.50,1.25)]:
    ida.append((k,(n,m)))

# --- preciosVuelta (same as ida) ---
vuelta = []
vuelta.append(('// Vuelta = Ida (misma distancia)', None))
all_dir = ['Dos Puentes','Cajánuma','Pueblo Nuevo','Tres Leguas','Rumizhitana','Yamba','Granadillo','Porvenir','Nangora','Chorrillos','Landangui','La Peña','Malacatos','Taxiche','Cavianga','Cararango','San Pedro','Vilcabamba','Ceibopamba','Trinidad','San José','Santo Domingo','Naranjo Dulce','Zhotahuayco','La Merced','San Agustín','La Era','La Capilla','San Bernardo','El Tambo','Masanamaca','Quinara','Chumberos','Palmira','Zahuayco','Cucanama','Linderos','Santorum','Solanda','Moyococha','Tumianuma','Comunidades','La Elvira','Suro','Yangana']
for s in all_dir:
    vuelta.append((s, D[s]))

# All intermediates (same prices as ida)
vuelta.append(('// Intermedios Vilcabamba (vuelta = ida)', None))
for k,n,m in [('Peña→Mal',0.75,0.40),('Land→Mal',0.75,0.40),('Chorri→Mal',0.75,0.40),('Nango→Mal',0.75,0.40),('Porv→Mal',1.10,0.55),('Gran→Mal',1.10,0.55),('Yamba→Mal',1.10,0.55),('Rumi→Mal',1.10,0.55),('T.Leguas→Mal',1.10,0.55),('P.Nuevo→Mal',1.10,0.55),('Caja→Mal',1.50,0.75),('D.Puen→Mal',1.50,0.75),('Capulí→Mal',2.00,1.00)]:
    vuelta.append((k,(n,m)))

vuelta.append(('// Intermedios El Tambo (vuelta = ida)', None))
for k,n,m in [('Mal→Ceibop',0.75,0.40),('Mal→Trinidad',0.75,0.40),('Mal→S.Jose',0.75,0.40),('Mal→StoDom',1.00,0.50),('Mal→N.Dulce',1.25,0.65),('Mal→Zhotahu',1.50,0.75),('Mal→LaMerc',1.75,0.90),('Mal→S.Agust',1.75,0.90),('Mal→LaEra',2.00,1.00),('Mal→LaCap',2.25,1.15),('Mal→S.Bern',2.25,1.15),('Mal→ElTambo',2.25,1.15)]:
    vuelta.append((k,(n,m)))

vuelta.append(('// Intermedios Zahuayco (vuelta = ida)', None))
for k,n,m in [('Vilc→Masan',1.10,0.55),('Vilc→Quina',2.00,1.00),('Vilc→Chumb',2.00,1.00),('Vilc→Palm',2.25,1.15),('Vilc→Zahua',2.50,1.25),('Mal→Masan',2.00,1.00),('Mal→Quina',2.50,1.25),('Mal→Chumb',2.50,1.25),('Mal→Palm',2.90,1.45),('Mal→Zahua',3.15,1.60)]:
    vuelta.append((k,(n,m)))

vuelta.append(('// Intermedios La Elvira (vuelta = ida)', None))
for k,n,m in [('Mal→Cucan',1.60,0.80),('Mal→Lind',2.00,1.00),('Mal→Santo',2.00,1.00),('Mal→Solan',2.00,1.00),('Mal→Moyoc',2.00,1.00),('Mal→Tumia',2.50,1.25),('Mal→Quina',2.50,1.25),('Mal→Comun',2.50,1.25),('Mal→Elvira',3.00,1.50),('Vilc→Cucan',0.75,0.40),('Vilc→Lind',1.10,0.55),('Vilc→Santo',1.50,0.65),('Vilc→Solan',1.50,0.65),('Vilc→Moyoc',1.50,0.65),('Vilc→Tumia',2.00,1.00),('Vilc→Quina',2.00,1.00),('Vilc→Comun',2.00,1.00),('Vilc→Elvira',2.40,1.20)]:
    vuelta.append((k,(n,m)))

vuelta.append(('// Intermedios Yangana (vuelta = ida)', None))
for k,n,m in [('Vilc→Masan',1.10,0.55),('Vilc→Suro',1.60,0.80),('Vilc→Yangana',2.00,1.00),('Mal→Masan',2.00,1.00),('Mal→Suro',2.00,1.00),('Mal→Yangana',2.50,1.25)]:
    vuelta.append((k,(n,m)))

# --- preciosVueltaElTambo ---
tambo_v = []
tambo_v.append(('// Vuelta El Tambo = Ida (misma distancia)', None))
for s in ['San Bernardo','La Capilla','La Era','San Agustín','La Merced','Zhotahuayco','Naranjo Dulce','Santo Domingo','San José','Ceibopamba','Trinidad','Malacatos','La Peña','Landangui','Chorrillos','Nangora','Porvenir','Granadillo','Yamba','Rumizhitana','Tres Leguas','Pueblo Nuevo','Cajánuma','Dos Puentes']:
    tambo_v.append((s, D[s]))
tambo_v.append(('// Intermedios El Tambo vuelta (vuelta = ida)', None))
for k,n,m in [('Mal→Ceibop',0.75,0.40),('Mal→Trinidad',0.75,0.40),('Mal→S.Jose',0.75,0.40),('Mal→StoDom',1.00,0.50),('Mal→N.Dulce',1.25,0.65),('Mal→Zhotahu',1.50,0.75),('Mal→LaMerc',1.75,0.90),('Mal→S.Agust',1.75,0.90),('Mal→LaEra',2.00,1.00),('Mal→LaCap',2.25,1.15),('Mal→S.Bern',2.25,1.15),('Mal→ElTambo',2.25,1.15)]:
    tambo_v.append((k,(n,m)))

ida_block = block('preciosIda', ida, 'Precios IDA (desde Loja hacia el destino)')
vuelta_block = block('preciosVuelta', vuelta, 'Precios VUELTA (desde el destino hacia Loja)')
tambo_block = block('preciosVueltaElTambo', tambo_v, 'Precios VUELTA específicos: EL TAMBO → LOJA')

print(f'IDA: {sum(1 for e in ida if e[1])}, VUELTA: {sum(1 for e in vuelta if e[1])}, TAMBO: {sum(1 for e in tambo_v if e[1])}')

# ═══════════════════════════════════════════════════════════════
# REPLACE BLOCKS (using line-based approach)
# ═══════════════════════════════════════════════════════════════

def replace_block_in_content(content, block_name, new_text):
    lines = content.split('\n')
    start = -1
    for i, line in enumerate(lines):
        if f'const {block_name}' in line and 'Record' in line:
            start = i
            break
    if start < 0:
        print(f'ERROR: {block_name} not found!')
        return content
    
    # Find end: count braces from the line with '= {'
    obj_start = start
    for i in range(start, min(start+3, len(lines))):
        if '= {' in lines[i]:
            obj_start = i
            break
    
    depth = 0
    end = -1
    for i in range(obj_start, len(lines)):
        for ch in lines[i]:
            if ch == '{': depth += 1
            elif ch == '}': depth -= 1
        if depth == 0 and '};' in lines[i]:
            end = i
            break
    if end < 0:
        print(f'ERROR: {block_name} end not found!')
        return content
    
    new_lines = lines[:start] + new_text.split('\n') + lines[end+1:]
    print(f'OK: {block_name} replaced (lines {start+1}-{end+1})')
    return '\n'.join(new_lines)

content = replace_block_in_content(content, 'preciosIda', ida_block)
content = replace_block_in_content(content, 'preciosVuelta', vuelta_block)
content = replace_block_in_content(content, 'preciosVueltaElTambo', tambo_block)

# ═══════════════════════════════════════════════════════════════
# CLEAN PARADA_ZONA - remove old entries, add new ones
# ═══════════════════════════════════════════════════════════════

# Keys to REMOVE from PARADA_ZONA
remove_zona = [
    'Rumi→Prv','Rumi→Vilc','Nango→Vilc','Nango→Carar','Land→Vilc','Mal→Vilc',
    'Taxiche→Vilc','Cararango→Vilc','S.Pedro→Vilc',
    'Era→Merc','Era→Malac','Merc→Ceibop','Merc→Malac','Merc→Land',
    'Zhot→Malac','Zhot→Merc','Zhot→Ceibop',
    'Mal→Peña','Mal→Chorri','Mal→Nango2','Mal→Porv2',
    'Mal→T.Leguas','Mal→P.Nuevo','Mal→Rumi2','Mal→Caja','Mal→D.Puen',
    'Mal→Rumi','Mal→Nango','Mal→Porv',
]

# Remove old zona entries (whole lines)
for key in remove_zona:
    # Match pattern: spaces + 'key': 'color',
    pattern = rf"\s+'{re.escape(key)}'\s*:\s*'\w+',?\n"
    content = re.sub(pattern, '', content)

# Remove orphaned lines (lines with just : 'color',)
content = re.sub(r"\n\s*:\s*'\w+',\s*\n", '\n', content)

# Also remove empty comment blocks for removed sections
content = content.replace("  // Vuelta intermedios\n", '')
content = content.replace("  // Intermedios El Tambo VUELTA (El Tambo → Loja, desde zona El Tambo)\n", '')
content = content.replace("  // Intermedios El Tambo VUELTA (desde Malacatos hacia Loja)\n", '')

# Add new zona entries before ZONA_COLORS
new_zonas = {
    'Peña→Mal':'yellow','Chorri→Mal':'yellow','Porv→Mal':'yellow',
    'Gran→Mal':'yellow','Yamba→Mal':'yellow',
    'P.Nuevo→Mal':'yellow','Caja→Mal':'green','D.Puen→Mal':'green','Capulí→Mal':'green',
    'Mal→Trinidad':'blue',
    'Vilc→Masan':'blue','Vilc→Quina':'blue','Vilc→Chumb':'blue','Vilc→Palm':'blue','Vilc→Zahua':'blue',
    'Mal→Masan':'blue','Mal→Quina':'blue','Mal→Chumb':'blue','Mal→Palm':'blue','Mal→Zahua':'blue',
    'Vilc→Suro':'blue','Vilc→Yangana':'blue','Mal→Suro':'blue','Mal→Yangana':'blue',
}

for key, zona in new_zonas.items():
    if f"'{key}':" not in content:
        content = content.replace(
            '};\n\nexport const ZONA_COLORS',
            f"  '{key}': '{zona}',\n}};\n\nexport const ZONA_COLORS"
        )

# Add Trinidad to PARADA_ZONA
if "'Trinidad':" not in content:
    content = content.replace(
        "  'Ceibopamba': 'blue',",
        "  'Ceibopamba': 'blue',\n  'Trinidad': 'blue',"
    )

print(f'PARADA_ZONA cleaned and updated')

# ═══════════════════════════════════════════════════════════════
# UPDATE RUTA_PARADAS
# ═══════════════════════════════════════════════════════════════

# Add Trinidad to El Tambo routes
content = content.replace(
    "'Malacatos', 'Ceibopamba', 'San José'",
    "'Malacatos', 'Ceibopamba', 'Trinidad', 'San José'"
)
# Add to El Tambo vuelta
content = content.replace(
    "'Ceibopamba', 'Malacatos',",
    "'Ceibopamba', 'Trinidad', 'Malacatos',"
)

# Replace Vilcabamba ida intermediates
old_vilc_list = "'Rumi→Vilc', 'Rumi→Mal', 'Rumi→Prv', 'Nango→Vilc', 'Nango→Mal', 'Nango→Carar', 'Land→Vilc', 'Land→Mal', 'Mal→Vilc',\n          'T.Leguas→Mal', 'Taxiche→Vilc', 'Cararango→Vilc', 'S.Pedro→Vilc'"
new_vilc_list = "'Peña→Mal', 'Land→Mal', 'Chorri→Mal', 'Nango→Mal', 'Porv→Mal', 'Gran→Mal', 'Yamba→Mal', 'Rumi→Mal', 'T.Leguas→Mal', 'P.Nuevo→Mal', 'Caja→Mal', 'D.Puen→Mal', 'Capulí→Mal'"

if old_vilc_list in content:
    content = content.replace(old_vilc_list, new_vilc_list)
    print('OK: Vilcabamba ida intermediates replaced in RUTA_PARADAS')
else:
    print('WARNING: Vilcabamba intermediates not found, doing manual removal')
    for k in ['Rumi→Vilc','Rumi→Prv','Nango→Vilc','Nango→Carar','Land→Vilc','Mal→Vilc','Taxiche→Vilc','Cararango→Vilc','S.Pedro→Vilc']:
        content = content.replace(f"'{k}', ", '')
        content = content.replace(f"'{k}'", '')

# Remove eliminated keys from ALL RUTA_PARADAS arrays
eliminate_keys = [
    'Mal→Rumi','Mal→Nango','Mal→Porv',
    'Era→Merc','Era→Malac','Merc→Ceibop','Merc→Malac','Merc→Land',
    'Zhot→Malac','Zhot→Merc','Zhot→Ceibop',
    'Mal→Peña','Mal→Chorri','Mal→Nango2','Mal→Porv2',
    'Mal→T.Leguas','Mal→P.Nuevo','Mal→Rumi2','Mal→Caja','Mal→D.Puen',
]
for k in eliminate_keys:
    content = content.replace(f"'{k}',", '')
    content = content.replace(f"'{k}'", '')

# Add new Vilcabamba intermediates to Vilcabamba-related routes
# They go after Vilcabamba in the ida arrays
for ruta_section in [
    # Loja-Zahuayco ida
    "'Vilcabamba',\n          'Masanamaca'",
    # Loja-La Elvira ida  
    "'Vilcabamba',\n          'Cucanama'",
    # Loja-Yangana ida
    "'Vilcabamba',\n          'Masanamaca'",
]:
    pass  # Vilcabamba intermediates are specific to Vilcabamba route, not shared

# Add Zahuayco/Yangana intermediates to their routes
# Zahuayco ida: add after Zahuayco
if "'Zahuayco',\n" in content:
    content = content.replace(
        "'Zahuayco',\n          'Rumi→Vilc', 'Rumi→Mal'",
        "'Zahuayco',\n          'Vilc→Masan', 'Vilc→Quina', 'Vilc→Chumb', 'Vilc→Palm', 'Vilc→Zahua',\n          'Mal→Masan', 'Mal→Quina', 'Mal→Chumb', 'Mal→Palm', 'Mal→Zahua'"
    )

# Yangana ida: add intermediates
if "'Yangana',\n" in content:
    content = content.replace(
        "'Yangana',\n          'Rumi→Vilc', 'Rumi→Mal'",
        "'Yangana',\n          'Vilc→Suro', 'Vilc→Yangana', 'Mal→Suro', 'Mal→Yangana'"
    )

print('OK: RUTA_PARADAS updated')

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

zero_count = content.count('{ normal: 0.00, media: 0.00 }')
total = content.count('{ normal:')
print(f'\nVerification: {total} total, {zero_count} zeros, {total-zero_count} with values')
