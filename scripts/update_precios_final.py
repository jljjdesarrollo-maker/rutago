#!/usr/bin/env python3
"""
Update tarifas-data.ts with prices from XLSX - FINAL VERSION
- No duplicate keys in price objects
- Clean RUTA_PARADAS (only valid keys)
- Clean PARADA_ZONA
- Add Trinidad
"""

import subprocess, re

TS_PATH = '/home/z/my-project/src/lib/tarifas-data.ts'
subprocess.run(['git', 'checkout', 'src/lib/tarifas-data.ts'], cwd='/home/z/my-project', capture_output=True)

with open(TS_PATH, 'r', encoding='utf-8') as f:
    content = f.read()

def fmt(n, m):
    return f'{{ normal: {n:.2f}, media: {m:.2f} }}'

# ═══════════════════════════════════════════════════════════════
# ALL PRICE DATA (no duplicates - shared keys listed once)
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

# ── Helpers to build price entries ──
def entry(key, n, m):
    return f"  '{key}': {fmt(n, m)},"

def section(title):
    return f'  {title}'

# ═══════════════════════════════════════════════════════════════
# preciosIda (no duplicate keys!)
# ═══════════════════════════════════════════════════════════════

ida_lines = [
    '// ─── Precios IDA (desde Loja hacia el destino) ───',
    'const preciosIda: Record<string, { normal: number; media: number }> = {',
    section('// ═══ LOJA - VILCABAMBA ═══'),
]
for s in ['Dos Puentes','Cajánuma','Pueblo Nuevo','Tres Leguas','Rumizhitana','Yamba',
          'Granadillo','Porvenir','Nangora','Chorrillos','Landangui','La Peña',
          'Malacatos','Taxiche','Cavianga','Cararango','San Pedro','Vilcabamba']:
    ida_lines.append(entry(s, *D[s]))

ida_lines.append(section('// Tramos intermedios ida (desde parada hacia Malacatos)'))
for k,n,m in [('Peña→Mal',0.75,0.40),('Land→Mal',0.75,0.40),('Chorri→Mal',0.75,0.40),
              ('Nango→Mal',0.75,0.40),('Porv→Mal',1.10,0.55),('Gran→Mal',1.10,0.55),
              ('Yamba→Mal',1.10,0.55),('Rumi→Mal',1.10,0.55),('T.Leguas→Mal',1.10,0.55),
              ('P.Nuevo→Mal',1.10,0.55),('Caja→Mal',1.50,0.75),('D.Puen→Mal',1.50,0.75),
              ('Capulí→Mal',2.00,1.00)]:
    ida_lines.append(entry(k, n, m))

ida_lines.append(section('// ═══ LOJA - EL TAMBO (ramifica en Malacatos, NO pasa Vilcabamba) ═══'))
for s in ['Ceibopamba','Trinidad','San José','Santo Domingo','Naranjo Dulce',
          'Zhotahuayco','La Merced','San Agustín','La Era','La Capilla','San Bernardo','El Tambo']:
    ida_lines.append(entry(s, *D[s]))

ida_lines.append(section('// Intermedios El Tambo IDA (desde Malacatos hacia El Tambo)'))
for k,n,m in [('Mal→Ceibop',0.75,0.40),('Mal→Trinidad',0.75,0.40),('Mal→S.Jose',0.75,0.40),
              ('Mal→StoDom',1.00,0.50),('Mal→N.Dulce',1.25,0.65),('Mal→Zhotahu',1.50,0.75),
              ('Mal→LaMerc',1.75,0.90),('Mal→S.Agust',1.75,0.90),('Mal→LaEra',2.00,1.00),
              ('Mal→LaCap',2.25,1.15),('Mal→S.Bern',2.25,1.15),('Mal→ElTambo',2.25,1.15)]:
    ida_lines.append(entry(k, n, m))

ida_lines.append(section('// ═══ LOJA - ZAHUAYCO (pasa por Vilcabamba) ═══'))
for s in ['Masanamaca','Quinara','Chumberos','Palmira','Zahuayco']:
    ida_lines.append(entry(s, *D[s]))

ida_lines.append(section('// Intermedios Zahuayco/Yangana IDA (desde Vilcabamba)'))
for k,n,m in [('Vilc→Masan',1.10,0.55),('Vilc→Quina',2.00,1.00),('Vilc→Chumb',2.00,1.00),
              ('Vilc→Palm',2.25,1.15),('Vilc→Zahua',2.50,1.25),('Vilc→Suro',1.60,0.80),
              ('Vilc→Yangana',2.00,1.00)]:
    ida_lines.append(entry(k, n, m))

ida_lines.append(section('// Intermedios Zahuayco/Yangana IDA (desde Malacatos)'))
for k,n,m in [('Mal→Masan',2.00,1.00),('Mal→Quina',2.50,1.25),('Mal→Chumb',2.50,1.25),
              ('Mal→Palm',2.90,1.45),('Mal→Zahua',3.15,1.60),('Mal→Suro',2.00,1.00),
              ('Mal→Yangana',2.50,1.25)]:
    ida_lines.append(entry(k, n, m))

ida_lines.append(section('// ═══ LOJA - LA ELVIRA (pasa por Vilcabamba) ═══'))
for s in ['Cucanama','Linderos','Santorum','Solanda','Moyococha','Tumianuma','Comunidades','La Elvira']:
    ida_lines.append(entry(s, *D[s]))

ida_lines.append(section('// Intermedios La Elvira IDA (desde Malacatos hacia La Elvira)'))
for k,n,m in [('Mal→Cucan',1.60,0.80),('Mal→Lind',2.00,1.00),('Mal→Santo',2.00,1.00),
              ('Mal→Solan',2.00,1.00),('Mal→Moyoc',2.00,1.00),('Mal→Tumia',2.50,1.25),
              ('Mal→Quina',2.50,1.25),('Mal→Comun',2.50,1.25),('Mal→Elvira',3.00,1.50)]:
    ida_lines.append(entry(k, n, m))

ida_lines.append(section('// Intermedios La Elvira IDA (desde Vilcabamba hacia La Elvira)'))
for k,n,m in [('Vilc→Cucan',0.75,0.40),('Vilc→Lind',1.10,0.55),('Vilc→Santo',1.50,0.65),
              ('Vilc→Solan',1.50,0.65),('Vilc→Moyoc',1.50,0.65),('Vilc→Tumia',2.00,1.00),
              ('Vilc→Quina',2.00,1.00),('Vilc→Comun',2.00,1.00),('Vilc→Elvira',2.40,1.20)]:
    ida_lines.append(entry(k, n, m))

ida_lines.append(section('// ═══ LOJA - YANGANA (pasa por Vilcabamba) ═══'))
for s in ['Suro','Yangana']:
    ida_lines.append(entry(s, *D[s]))

ida_lines.append('};')
ida_block = '\n'.join(ida_lines)

# ═══════════════════════════════════════════════════════════════
# preciosVuelta (same prices, no duplicates)
# ═══════════════════════════════════════════════════════════════

vuelta_lines = [
    '// ─── Precios VUELTA (desde el destino hacia Loja) ───',
    '// Vuelta = Ida (misma distancia confirmada por usuario)',
    'const preciosVuelta: Record<string, { normal: number; media: number }> = {',
]
# All directos
all_dir = ['Dos Puentes','Cajánuma','Pueblo Nuevo','Tres Leguas','Rumizhitana','Yamba',
            'Granadillo','Porvenir','Nangora','Chorrillos','Landangui','La Peña',
            'Malacatos','Taxiche','Cavianga','Cararango','San Pedro','Vilcabamba',
            'Ceibopamba','Trinidad','San José','Santo Domingo','Naranjo Dulce',
            'Zhotahuayco','La Merced','San Agustín','La Era','La Capilla','San Bernardo','El Tambo',
            'Masanamaca','Quinara','Chumberos','Palmira','Zahuayco',
            'Cucanama','Linderos','Santorum','Solanda','Moyococha','Tumianuma',
            'Comunidades','La Elvira','Suro','Yangana']
for s in all_dir:
    vuelta_lines.append(entry(s, *D[s]))

# All intermediates (deduplicated)
vuelta_lines.append(section('// Intermedios Vilcabamba (vuelta = ida)'))
for k,n,m in [('Peña→Mal',0.75,0.40),('Land→Mal',0.75,0.40),('Chorri→Mal',0.75,0.40),
              ('Nango→Mal',0.75,0.40),('Porv→Mal',1.10,0.55),('Gran→Mal',1.10,0.55),
              ('Yamba→Mal',1.10,0.55),('Rumi→Mal',1.10,0.55),('T.Leguas→Mal',1.10,0.55),
              ('P.Nuevo→Mal',1.10,0.55),('Caja→Mal',1.50,0.75),('D.Puen→Mal',1.50,0.75),
              ('Capulí→Mal',2.00,1.00)]:
    vuelta_lines.append(entry(k, n, m))

vuelta_lines.append(section('// Intermedios El Tambo (vuelta = ida)'))
for k,n,m in [('Mal→Ceibop',0.75,0.40),('Mal→Trinidad',0.75,0.40),('Mal→S.Jose',0.75,0.40),
              ('Mal→StoDom',1.00,0.50),('Mal→N.Dulce',1.25,0.65),('Mal→Zhotahu',1.50,0.75),
              ('Mal→LaMerc',1.75,0.90),('Mal→S.Agust',1.75,0.90),('Mal→LaEra',2.00,1.00),
              ('Mal→LaCap',2.25,1.15),('Mal→S.Bern',2.25,1.15),('Mal→ElTambo',2.25,1.15)]:
    vuelta_lines.append(entry(k, n, m))

vuelta_lines.append(section('// Intermedios Zahuayco/Yangana/Vilc (vuelta = ida)'))
for k,n,m in [('Vilc→Masan',1.10,0.55),('Vilc→Quina',2.00,1.00),('Vilc→Chumb',2.00,1.00),
              ('Vilc→Palm',2.25,1.15),('Vilc→Zahua',2.50,1.25),('Vilc→Suro',1.60,0.80),
              ('Vilc→Yangana',2.00,1.00),('Mal→Masan',2.00,1.00),('Mal→Quina',2.50,1.25),
              ('Mal→Chumb',2.50,1.25),('Mal→Palm',2.90,1.45),('Mal→Zahua',3.15,1.60),
              ('Mal→Suro',2.00,1.00),('Mal→Yangana',2.50,1.25)]:
    vuelta_lines.append(entry(k, n, m))

vuelta_lines.append(section('// Intermedios La Elvira (vuelta = ida)'))
for k,n,m in [('Mal→Cucan',1.60,0.80),('Mal→Lind',2.00,1.00),('Mal→Santo',2.00,1.00),
              ('Mal→Solan',2.00,1.00),('Mal→Moyoc',2.00,1.00),('Mal→Tumia',2.50,1.25),
              ('Mal→Quina',2.50,1.25),('Mal→Comun',2.50,1.25),('Mal→Elvira',3.00,1.50),
              ('Vilc→Cucan',0.75,0.40),('Vilc→Lind',1.10,0.55),('Vilc→Santo',1.50,0.65),
              ('Vilc→Solan',1.50,0.65),('Vilc→Moyoc',1.50,0.65),('Vilc→Tumia',2.00,1.00),
              ('Vilc→Quina',2.00,1.00),('Vilc→Comun',2.00,1.00),('Vilc→Elvira',2.40,1.20)]:
    vuelta_lines.append(entry(k, n, m))

vuelta_lines.append('};')
vuelta_block = '\n'.join(vuelta_lines)

# ═══════════════════════════════════════════════════════════════
# preciosVueltaElTambo (same prices for directos)
# ═══════════════════════════════════════════════════════════════

tambo_lines = [
    '// ─── Precios VUELTA específicos: EL TAMBO → LOJA ───',
    '// Vuelta El Tambo = Ida (misma distancia)',
    'const preciosVueltaElTambo: Record<string, { normal: number; media: number }> = {',
]
for s in ['San Bernardo','La Capilla','La Era','San Agustín','La Merced','Zhotahuayco',
          'Naranjo Dulce','Santo Domingo','San José','Ceibopamba','Trinidad','Malacatos',
          'La Peña','Landangui','Chorrillos','Nangora','Porvenir','Granadillo',
          'Yamba','Rumizhitana','Tres Leguas','Pueblo Nuevo','Cajánuma','Dos Puentes']:
    tambo_lines.append(entry(s, *D[s]))

tambo_lines.append(section('// Intermedios El Tambo vuelta (vuelta = ida)'))
for k,n,m in [('Mal→Ceibop',0.75,0.40),('Mal→Trinidad',0.75,0.40),('Mal→S.Jose',0.75,0.40),
              ('Mal→StoDom',1.00,0.50),('Mal→N.Dulce',1.25,0.65),('Mal→Zhotahu',1.50,0.75),
              ('Mal→LaMerc',1.75,0.90),('Mal→S.Agust',1.75,0.90),('Mal→LaEra',2.00,1.00),
              ('Mal→LaCap',2.25,1.15),('Mal→S.Bern',2.25,1.15),('Mal→ElTambo',2.25,1.15)]:
    tambo_lines.append(entry(k, n, m))

tambo_lines.append('};')
tambo_block = '\n'.join(tambo_lines)

# Count
ida_count = sum(1 for l in ida_lines if '{ normal:' in l)
vuelta_count = sum(1 for l in vuelta_lines if '{ normal:' in l)
tambo_count = sum(1 for l in tambo_lines if '{ normal:' in l)
print(f'IDA: {ida_count}, VUELTA: {vuelta_count}, TAMBO: {tambo_count}')

# Verify no duplicate keys in each block
def check_dup(block, name):
    keys = re.findall(r"'([^']+)':", block)
    dups = [k for k in set(keys) if keys.count(k) > 1]
    if dups:
        print(f'WARNING {name} duplicates: {dups}')
    else:
        print(f'OK {name}: no duplicates ({len(keys)} unique keys)')

check_dup(ida_block, 'IDA')
check_dup(vuelta_block, 'VUELTA')
check_dup(tambo_block, 'TAMBO')

# ═══════════════════════════════════════════════════════════════
# REPLACE BLOCKS IN FILE
# ═══════════════════════════════════════════════════════════════

def replace_block(content, block_name, new_text):
    lines = content.split('\n')
    start = -1
    for i, line in enumerate(lines):
        if f'const {block_name}' in line and 'Record' in line:
            start = i
            break
    if start < 0:
        print(f'ERROR: {block_name} not found!')
        return content
    
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
    print(f'OK: {block_name} replaced (lines {start+1}-{end+1}, {end-start+1} lines)')
    return '\n'.join(new_lines)

content = replace_block(content, 'preciosIda', ida_block)
content = replace_block(content, 'preciosVuelta', vuelta_block)
content = replace_block(content, 'preciosVueltaElTambo', tambo_block)

# ═══════════════════════════════════════════════════════════════
# CLEAN PARADA_ZONA
# ═══════════════════════════════════════════════════════════════

remove_zona = [
    'Rumi→Prv','Rumi→Vilc','Nango→Vilc','Nango→Carar','Land→Vilc','Mal→Vilc',
    'Taxiche→Vilc','Cararango→Vilc','S.Pedro→Vilc',
    'Era→Merc','Era→Malac','Merc→Ceibop','Merc→Malac','Merc→Land',
    'Zhot→Malac','Zhot→Merc','Zhot→Ceibop',
    'Mal→Peña','Mal→Chorri','Mal→Nango2','Mal→Porv2',
    'Mal→T.Leguas','Mal→P.Nuevo','Mal→Rumi2','Mal→Caja','Mal→D.Puen',
    'Mal→Rumi','Mal→Nango','Mal→Porv',
]

for key in remove_zona:
    pattern = rf"\s+'{re.escape(key)}'\s*:\s*'\w+',?\n"
    content = re.sub(pattern, '', content)

# Remove orphaned lines
content = re.sub(r"\n\s*:\s*'\w+',?\s*\n", '\n', content)
# Remove leftover empty comment lines for removed sections
for comment in ['// Vuelta intermedios', '// Intermedios El Tambo VUELTA (El Tambo → Loja, desde zona El Tambo)',
               '// Intermedios El Tambo VUELTA (desde Malacatos hacia Loja)']:
    content = content.replace(f'  {comment}\n', '')

# Add new zona entries
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

# Add Trinidad
if "'Trinidad':" not in content:
    content = content.replace(
        "  'Ceibopamba': 'blue',",
        "  'Ceibopamba': 'blue',\n  'Trinidad': 'blue',"
    )

print('OK: PARADA_ZONA cleaned')

# ═══════════════════════════════════════════════════════════════
# UPDATE RUTA_PARADAS (complete rewrite of the section)
# ═══════════════════════════════════════════════════════════════

# Build the complete RUTA_PARADAS with ONLY valid keys
RUTA_PARADAS = {
    'Loja - Vilcabamba': {
        'ida': ['Dos Puentes', 'Cajánuma', 'Pueblo Nuevo', 'Tres Leguas', 'Rumizhitana', 'Yamba',
                'Granadillo', 'Porvenir', 'Nangora', 'Chorrillos', 'Landangui', 'La Peña',
                'Malacatos', 'Taxiche', 'Cavianga', 'Cararango', 'San Pedro', 'Vilcabamba',
                'Peña→Mal', 'Land→Mal', 'Chorri→Mal', 'Nango→Mal', 'Porv→Mal', 'Gran→Mal', 'Yamba→Mal',
                'Rumi→Mal', 'T.Leguas→Mal', 'P.Nuevo→Mal', 'Caja→Mal', 'D.Puen→Mal', 'Capulí→Mal'],
        'vuelta': ['San Pedro', 'Cararango', 'Cavianga', 'Taxiche', 'Malacatos', 'La Peña', 'Landangui',
                  'Chorrillos', 'Nangora', 'Porvenir', 'Granadillo', 'Yamba', 'Rumizhitana',
                  'Tres Leguas', 'Pueblo Nuevo', 'Cajánuma', 'Dos Puentes', 'Capulí'],
    },
    'Loja - Zahuayco': {
        'ida': ['Dos Puentes', 'Cajánuma', 'Pueblo Nuevo', 'Tres Leguas', 'Rumizhitana', 'Yamba',
                'Granadillo', 'Porvenir', 'Nangora', 'Chorrillos', 'Landangui', 'La Peña',
                'Malacatos', 'Taxiche', 'Cavianga', 'Cararango', 'San Pedro', 'Vilcabamba',
                'Masanamaca', 'Quinara', 'Chumberos', 'Palmira', 'Zahuayco',
                'Vilc→Masan', 'Vilc→Quina', 'Vilc→Chumb', 'Vilc→Palm', 'Vilc→Zahua',
                'Mal→Masan', 'Mal→Quina', 'Mal→Chumb', 'Mal→Palm', 'Mal→Zahua'],
        'vuelta': ['Zahuayco', 'Palmira', 'Quinara', 'Masanamaca', 'Vilcabamba', 'San Pedro',
                  'Cararango', 'Cavianga', 'Taxiche', 'Malacatos', 'La Peña', 'Landangui',
                  'Chorrillos', 'Nangora', 'Porvenir', 'Granadillo', 'Yamba', 'Rumizhitana',
                  'Tres Leguas', 'Pueblo Nuevo', 'Cajánuma', 'Dos Puentes', 'Capulí'],
    },
    'Loja - El Tambo': {
        'ida': ['Dos Puentes', 'Cajánuma', 'Pueblo Nuevo', 'Tres Leguas', 'Rumizhitana', 'Yamba',
                'Granadillo', 'Porvenir', 'Nangora', 'Chorrillos', 'Landangui', 'La Peña',
                'Malacatos', 'Ceibopamba', 'Trinidad', 'San José', 'Santo Domingo',
                'Naranjo Dulce', 'Zhotahuayco', 'La Merced', 'San Agustín', 'La Era',
                'La Capilla', 'San Bernardo', 'El Tambo',
                'Mal→Ceibop', 'Mal→Trinidad', 'Mal→S.Jose', 'Mal→StoDom', 'Mal→N.Dulce',
                'Mal→Zhotahu', 'Mal→LaMerc', 'Mal→S.Agust', 'Mal→LaEra', 'Mal→LaCap',
                'Mal→S.Bern', 'Mal→ElTambo'],
        'vuelta': ['El Tambo', 'San Bernardo', 'La Capilla', 'La Era', 'San Agustín',
                  'La Merced', 'Zhotahuayco', 'Naranjo Dulce', 'Santo Domingo', 'San José',
                  'Ceibopamba', 'Trinidad', 'Malacatos', 'La Peña', 'Landangui', 'Chorrillos',
                  'Nangora', 'Porvenir', 'Granadillo', 'Yamba', 'Rumizhitana', 'Tres Leguas',
                  'Pueblo Nuevo', 'Cajánuma', 'Dos Puentes', 'Capulí'],
    },
    'Loja - La Elvira': {
        'ida': ['Dos Puentes', 'Cajánuma', 'Pueblo Nuevo', 'Tres Leguas', 'Rumizhitana', 'Yamba',
                'Granadillo', 'Porvenir', 'Nangora', 'Chorrillos', 'Landangui', 'La Peña',
                'Malacatos', 'Taxiche', 'Cavianga', 'Cararango', 'San Pedro', 'Vilcabamba',
                'Cucanama', 'Linderos', 'Santorum', 'Solanda', 'Moyococha', 'Tumianuma',
                'Quinara', 'Comunidades', 'La Elvira',
                'Mal→Cucan', 'Mal→Lind', 'Mal→Santo', 'Mal→Solan', 'Mal→Moyoc', 'Mal→Tumia',
                'Mal→Quina', 'Mal→Comun', 'Mal→Elvira',
                'Vilc→Cucan', 'Vilc→Lind', 'Vilc→Santo', 'Vilc→Solan', 'Vilc→Moyoc', 'Vilc→Tumia',
                'Vilc→Quina', 'Vilc→Comun', 'Vilc→Elvira'],
        'vuelta': ['La Elvira', 'Comunidades', 'Quinara', 'Tumianuma', 'Moyococha', 'Solanda',
                  'Santorum', 'Linderos', 'Cucanama', 'Vilcabamba', 'San Pedro', 'Cararango',
                  'Cavianga', 'Taxiche', 'Malacatos', 'La Peña', 'Landangui', 'Chorrillos',
                  'Nangora', 'Porvenir', 'Granadillo', 'Yamba', 'Rumizhitana', 'Tres Leguas',
                  'Pueblo Nuevo', 'Cajánuma', 'Dos Puentes', 'Capulí',
                  'Mal→Cucan', 'Mal→Lind', 'Mal→Santo', 'Mal→Solan', 'Mal→Moyoc', 'Mal→Tumia',
                  'Mal→Quina', 'Mal→Comun', 'Mal→Elvira',
                  'Vilc→Cucan', 'Vilc→Lind', 'Vilc→Santo', 'Vilc→Solan', 'Vilc→Moyoc', 'Vilc→Tumia',
                  'Vilc→Quina', 'Vilc→Comun', 'Vilc→Elvira'],
    },
    'Loja - Yangana': {
        'ida': ['Dos Puentes', 'Cajánuma', 'Pueblo Nuevo', 'Tres Leguas', 'Rumizhitana', 'Yamba',
                'Granadillo', 'Porvenir', 'Nangora', 'Chorrillos', 'Landangui', 'La Peña',
                'Malacatos', 'Taxiche', 'Cavianga', 'Cararango', 'San Pedro', 'Vilcabamba',
                'Masanamaca', 'Suro', 'Yangana',
                'Vilc→Suro', 'Vilc→Yangana', 'Mal→Suro', 'Mal→Yangana'],
        'vuelta': ['Yangana', 'Suro', 'Masanamaca', 'Vilcabamba', 'San Pedro', 'Cararango',
                  'Cavianga', 'Taxiche', 'Malacatos', 'La Peña', 'Landangui', 'Chorrillos',
                  'Nangora', 'Porvenir', 'Granadillo', 'Yamba', 'Rumizhitana', 'Tres Leguas',
                  'Pueblo Nuevo', 'Cajánuma', 'Dos Puentes', 'Capulí'],
    },
    'Vilcabamba - Loja': {
        'ida': ['San Pedro', 'Cararango', 'Cavianga', 'Taxiche', 'Malacatos', 'La Peña',
                'Landangui', 'Chorrillos', 'Nangora', 'Porvenir', 'Granadillo', 'Yamba',
                'Rumizhitana', 'Tres Leguas', 'Pueblo Nuevo', 'Cajánuma', 'Dos Puentes', 'Capulí', 'Loja'],
        'vuelta': ['Loja', 'Capulí', 'Dos Puentes', 'Cajánuma', 'Pueblo Nuevo', 'Tres Leguas',
                  'Rumizhitana', 'Yamba', 'Granadillo', 'Porvenir', 'Nangora', 'Chorrillos',
                  'Landangui', 'La Peña', 'Malacatos', 'Taxiche', 'Cavianga', 'Cararango',
                  'San Pedro', 'Vilcabamba'],
    },
    'Zahuayco - Loja': {
        'ida': ['Zahuayco', 'Palmira', 'Quinara', 'Masanamaca', 'Vilcabamba', 'San Pedro',
                'Cararango', 'Cavianga', 'Taxiche', 'Malacatos', 'La Peña', 'Landangui',
                'Chorrillos', 'Nangora', 'Porvenir', 'Granadillo', 'Yamba', 'Rumizhitana',
                'Tres Leguas', 'Pueblo Nuevo', 'Cajánuma', 'Dos Puentes', 'Capulí'],
        'vuelta': ['Capulí', 'Dos Puentes', 'Cajánuma', 'Pueblo Nuevo', 'Tres Leguas',
                  'Rumizhitana', 'Yamba', 'Granadillo', 'Porvenir', 'Nangora', 'Chorrillos',
                  'Landangui', 'La Peña', 'Malacatos', 'Taxiche', 'Cavianga', 'Cararango',
                  'San Pedro', 'Vilcabamba', 'Masanamaca', 'Quinara', 'Palmira', 'Zahuayco'],
    },
    'La Elvira - Loja': {
        'ida': ['La Elvira', 'Tumianuma', 'Comunidades', 'Santorum', 'Moyococha',
                'Linderos', 'Cucanama', 'Vilcabamba', 'San Pedro', 'Cararango', 'Cavianga',
                'Taxiche', 'Malacatos', 'La Peña', 'Landangui', 'Chorrillos', 'Nangora',
                'Porvenir', 'Granadillo', 'Yamba', 'Rumizhitana', 'Tres Leguas', 'Pueblo Nuevo',
                'Cajánuma', 'Dos Puentes', 'Capulí'],
        'vuelta': ['Capulí', 'Dos Puentes', 'Cajánuma', 'Pueblo Nuevo', 'Tres Leguas',
                  'Rumizhitana', 'Yamba', 'Granadillo', 'Porvenir', 'Nangora', 'Chorrillos',
                  'Landangui', 'La Peña', 'Malacatos', 'Taxiche', 'Cavianga', 'Cararango',
                  'San Pedro', 'Vilcabamba', 'Cucanama', 'Linderos', 'Moyococha', 'Santorum',
                  'Comunidades', 'Tumianuma', 'La Elvira'],
    },
    'Yangana - Loja': {
        'ida': ['Yangana', 'Suro', 'Masanamaca', 'Vilcabamba', 'San Pedro', 'Cararango',
                'Cavianga', 'Taxiche', 'Malacatos', 'La Peña', 'Landangui', 'Chorrillos',
                'Nangora', 'Porvenir', 'Granadillo', 'Yamba', 'Rumizhitana', 'Tres Leguas',
                'Pueblo Nuevo', 'Cajánuma', 'Dos Puentes', 'Capulí'],
        'vuelta': ['Capulí', 'Dos Puentes', 'Cajánuma', 'Pueblo Nuevo', 'Tres Leguas',
                  'Rumizhitana', 'Yamba', 'Granadillo', 'Porvenir', 'Nangora', 'Chorrillos',
                  'Landangui', 'La Peña', 'Malacatos', 'Taxiche', 'Cavianga', 'Cararango',
                  'San Pedro', 'Vilcabamba', 'Masanamaca', 'Suro', 'Yangana'],
    },
}

# Generate RUTA_PARADAS TypeScript block
rp_lines = [
    'export const RUTA_PARADAS: Record<string, { ida: string[]; vuelta: string[] }> = {',
]
for ruta_name, paradas in RUTA_PARADAS.items():
    rp_lines.append(f"  '{ruta_name}': {{")
    for dir_name in ['ida', 'vuelta']:
        stops = paradas[dir_name]
        # Format: split into manageable lines
        rp_lines.append(f"    {dir_name}: [")
        line = '          '
        for j, stop in enumerate(stops):
            line += f"'{stop}', "
            if len(line) > 90 or j == len(stops) - 1:
                rp_lines.append(line.rstrip())
                line = '          '
        rp_lines.append('    ],')
    rp_lines.append('  },')
rp_lines.append('};')
rp_block = '\n'.join(rp_lines)

# Replace RUTA_PARADAS in the file
content = replace_block(content, 'RUTA_PARADAS', rp_block)

# ═══════════════════════════════════════════════════════════════
# UPDATE COMMENT
# ═══════════════════════════════════════════════════════════════

content = content.replace(
    '// Actualizado: Agosto 2025 — precios diferenciados por dirección (ida/vuelta)',
    '// Actualizado: Agosto 2026 — precios del tarifario oficial XLSX'
)

# ═══════════════════════════════════════════════════════════════
# WRITE & VERIFY
# ═══════════════════════════════════════════════════════════════

with open(TS_PATH, 'w', encoding='utf-8') as f:
    f.write(content)

zero_count = content.count('{ normal: 0.00, media: 0.00 }')
total = content.count('{ normal:')
print(f'\nFinal: {total} entries, {zero_count} zeros, {total-zero_count} with values')
print(f'File: {len(content)} chars, {content.count(chr(10))+1} lines')
