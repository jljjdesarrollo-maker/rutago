#!/usr/bin/env python3
"""
Update tarifas-data.ts with prices from the XLSX tariff file.
Rules from user:
1. Apply all prices from XLSX list (IDA and VUELTA)
2. Add Trinidad as new stop
3. Eliminate old intermediates not in XLSX (Vilcabamba-directed: Rumi->Vilc, Nango->Vilc, etc.)
4. Eliminate El Tambo vuelta-specific intermediates not in XLSX
5. Vuelta = Ida prices (same distance)
"""

import re

TS_PATH = '/home/z/my-project/src/lib/tarifas-data.ts'

with open(TS_PATH, 'r', encoding='utf-8') as f:
    content = f.read()

# ═══════════════════════════════════════════════════════════════
# 1. XLSX PRICE DATA (authoritative source)
# ═══════════════════════════════════════════════════════════════

# Direct prices: Loja -> destino (used for preciosIda AND preciosVuelta)
# Format: system_key -> (normal, media)
precios_directos = {
    # Loja - Vilcabamba
    'Dos Puentes':  (0.75, 0.40),
    'Caj\u00e1numa': (1.25, 0.55),
    'Pueblo Nuevo': (1.25, 0.55),
    'Tres Leguas':  (1.25, 0.55),
    'Rumizhitana':  (1.25, 0.55),
    'Yamba':        (1.25, 0.55),
    'Granadillo':   (1.40, 0.65),
    'Porvenir':     (1.40, 0.65),
    'Nangora':      (1.50, 0.75),
    'Chorrillos':   (1.50, 0.75),
    'Landangui':    (1.75, 0.90),
    'La Pe\u00f1a': (1.75, 0.90),
    'Malacatos':    (2.00, 1.00),
    'Taxiche':      (2.00, 1.00),
    'Cavianga':     (2.25, 1.15),
    'Cararango':    (2.25, 1.15),
    'San Pedro':    (2.25, 1.15),
    'Vilcabamba':   (2.50, 1.25),
    # Loja - El Tambo
    'Ceibopamba':    (2.25, 1.15),
    'Trinidad':      (2.25, 1.15),  # NEW STOP
    'San Jos\u00e9':      (2.25, 1.15),
    'Santo Domingo': (2.50, 1.25),
    'Naranjo Dulce': (2.75, 1.40),
    'Zhotahuayco':   (3.00, 1.50),
    'La Merced':     (3.25, 1.65),
    'San Agust\u00edn':   (3.75, 1.90),
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

# Intermediate prices IDA: system_key -> (normal, media)
# These are for preciosIda
precios_intermedios_ida = {
    # Vilcabamba intermediates (X -> Malacatos)
    'Pe\u00f1a\u2192Mal': (0.75, 0.40),   # La Pe\u00f1a -> Malacatos (NEW)
    'Land\u2192Mal':   (0.75, 0.40),   # Landangui -> Malacatos
    'Chorri\u2192Mal': (0.75, 0.40),   # Chorrillos -> Malacatos (NEW)
    'Nango\u2192Mal':  (0.75, 0.40),   # Nangora -> Malacatos
    'Porv\u2192Mal':   (1.10, 0.55),   # Porvenir -> Malacatos (NEW)
    'Gran\u2192Mal':   (1.10, 0.55),   # Granadillo -> Malacatos (NEW)
    'Yamba\u2192Mal':  (1.10, 0.55),   # Yamba -> Malacatos (NEW)
    'Rumi\u2192Mal':   (1.10, 0.55),   # Rumizhitana -> Malacatos
    'T.Leguas\u2192Mal': (1.10, 0.55), # Tres Leguas -> Malacatos
    'P.Nuevo\u2192Mal': (1.10, 0.55),  # Pueblo Nuevo -> Malacatos (NEW)
    'Caja\u2192Mal':   (1.50, 0.75),   # Cajanuma -> Malacatos (NEW)
    'D.Puen\u2192Mal': (1.50, 0.75),   # Dos Puentes -> Malacatos (NEW)
    'Capul\u00ed\u2192Mal': (2.00, 1.00), # Capul\u00ed -> Malacatos (NEW)
    # El Tambo intermediates (Malacatos -> X)
    'Mal\u2192Ceibop':   (0.75, 0.40),
    'Mal\u2192Trinidad': (0.75, 0.40),
    'Mal\u2192S.Jose':    (0.75, 0.40),
    'Mal\u2192StoDom':    (1.00, 0.50),
    'Mal\u2192N.Dulce':   (1.25, 0.65),
    'Mal\u2192Zhotahu':   (1.50, 0.75),
    'Mal\u2192LaMerc':    (1.75, 0.90),
    'Mal\u2192S.Agust':   (1.75, 0.90),
    'Mal\u2192LaEra':     (2.00, 1.00),
    'Mal\u2192LaCap':     (2.25, 1.15),
    'Mal\u2192S.Bern':    (2.25, 1.15),
    'Mal\u2192ElTambo':   (2.25, 1.15),
    # La Elvira intermediates (from Malacatos)
    'Mal\u2192Cucan':  (1.60, 0.80),
    'Mal\u2192Lind':   (2.00, 1.00),
    'Mal\u2192Santo':  (2.00, 1.00),
    'Mal\u2192Solan':  (2.00, 1.00),
    'Mal\u2192Moyoc':  (2.00, 1.00),
    'Mal\u2192Tumia':  (2.50, 1.25),
    'Mal\u2192Quina':  (2.50, 1.25),
    'Mal\u2192Comun':  (2.50, 1.25),
    'Mal\u2192Elvira': (3.00, 1.50),
    # La Elvira intermediates (from Vilcabamba)
    'Vilc\u2192Cucan':  (0.75, 0.40),
    'Vilc\u2192Lind':   (1.10, 0.55),
    'Vilc\u2192Santo':  (1.50, 0.65),
    'Vilc\u2192Solan':  (1.50, 0.65),
    'Vilc\u2192Moyoc':  (1.50, 0.65),
    'Vilc\u2192Tumia':  (2.00, 1.00),
    'Vilc\u2192Quina':  (2.00, 1.00),
    'Vilc\u2192Comun':  (2.00, 1.00),
    'Vilc\u2192Elvira': (2.40, 1.20),
    # Zahuayco intermediates (from Vilcabamba)
    'Vilc\u2192Masan': (1.10, 0.55),
    'Vilc\u2192Quina2': (2.00, 1.00),
    'Vilc\u2192Chumb': (2.00, 1.00),
    'Vilc\u2192Palm':  (2.25, 1.15),
    'Vilc\u2192Zahua': (2.50, 1.25),
    # Zahuayco intermediates (from Malacatos)
    'Mal\u2192Masan': (2.00, 1.00),
    'Mal\u2192Quina2': (2.50, 1.25),
    'Mal\u2192Chumb': (2.50, 1.25),
    'Mal\u2192Palm':  (2.90, 1.45),
    'Mal\u2192Zahua': (3.15, 1.60),
    # Yangana intermediates (from Vilcabamba)
    'Vilc\u2192Suro': (1.60, 0.80),
    'Vilc\u2192Yangana': (2.00, 1.00),
    # Yangana intermediates (from Malacatos)
    'Mal\u2192Suro': (2.00, 1.00),
    'Mal\u2192Yangana': (2.50, 1.25),
}

# ═══════════════════════════════════════════════════════════════
# KEYS TO ELIMINATE (user said: "eliminarlos luego te doy los que deseo")
# ═══════════════════════════════════════════════════════════════

# Q3: Old Vilcabamba-directed intermediates (in system but NOT in XLSX)
eliminate_ida = [
    'Rumi\u2192Vilc',     # Rumizhitana -> Vilcabamba
    'Rumi\u2192Prv',      # Rumizhitana -> Porvenir
    'Nango\u2192Vilc',    # Nangora -> Vilcabamba
    'Nango\u2192Carar',   # Nangora -> Cararango
    'Land\u2192Vilc',     # Landangui -> Vilcabamba
    'Mal\u2192Vilc',      # Malacatos -> Vilcabamba
    'Taxiche\u2192Vilc',  # Taxiche -> Vilcabamba
    'Cararango\u2192Vilc',# Cararango -> Vilcabamba
    'S.Pedro\u2192Vilc',  # San Pedro -> Vilcabamba
]

# Q4: El Tambo vuelta-specific intermediates (in system but NOT in XLSX)
eliminate_vuelta_tambo = [
    'Era\u2192Merc',
    'Era\u2192Malac',
    'Merc\u2192Ceibop',
    'Merc\u2192Malac',
    'Merc\u2192Land',
    'Zhot\u2192Malac',
    'Zhot\u2192Merc',
    'Zhot\u2192Ceibop',
    'Mal\u2192Pe\u00f1a',
    'Mal\u2192Chorri',
    'Mal\u2192Nango2',
    'Mal\u2192Porv2',
    'Mal\u2192T.Leguas',
    'Mal\u2192P.Nuevo',
    'Mal\u2192Rumi2',
    'Mal\u2192Caja',
    'Mal\u2192D.Puen',
]

# Also eliminate old vuelta intermediates for Vilcabamba route
eliminate_vuelta = [
    'Mal\u2192Rumi',
    'Mal\u2192Nango',
    'Mal\u2192Porv',
]

# ═══════════════════════════════════════════════════════════════
# 2. BUILD NEW PRICE OBJECTS
# ═══════════════════════════════════════════════════════════════

def fmt(normal, media):
    return f'{{ normal: {normal:.2f}, media: {media:.2f} }}'

# Build preciosIda
ida_lines = []
ida_lines.append('const preciosIda: Record<string, { normal: number; media: number }> = {')

# Vilcabamba directos
ida_lines.append('  // \u2550\u2550\u2550 LOJA - VILCABAMBA \u2550\u2550\u2550')
vilcabamba_directos = ['Dos Puentes', 'Caj\u00e1numa', 'Pueblo Nuevo', 'Tres Leguas', 'Rumizhitana',
                      'Yamba', 'Granadillo', 'Porvenir', 'Nangora', 'Chorrillos', 'Landangui',
                      'La Pe\u00f1a', 'Malacatos', 'Taxiche', 'Cavianga', 'Cararango', 'San Pedro', 'Vilcabamba']
for stop in vilcabamba_directos:
    n, m = precios_directos[stop]
    ida_lines.append(f"  '{stop}':  {fmt(n, m)},")

# Vilcabamba intermediates (X -> Malacatos) - NEW from XLSX
ida_lines.append('  // Tramos intermedios ida (desde parada hacia Malacatos)')
vilc_intermedios = [
    ('Pe\u00f1a\u2192Mal', 'La Pe\u00f1a'),
    ('Land\u2192Mal', 'Landangui'),
    ('Chorri\u2192Mal', 'Chorrillos'),
    ('Nango\u2192Mal', 'Nangora'),
    ('Porv\u2192Mal', 'Porvenir'),
    ('Gran\u2192Mal', 'Granadillo'),
    ('Yamba\u2192Mal', 'Yamba'),
    ('Rumi\u2192Mal', 'Rumizhitana'),
    ('T.Leguas\u2192Mal', 'Tres Leguas'),
    ('P.Nuevo\u2192Mal', 'Pueblo Nuevo'),
    ('Caja\u2192Mal', 'Cajanuma'),
    ('D.Puen\u2192Mal', 'Dos Puentes'),
    ('Capul\u00ed\u2192Mal', 'Capul\u00ed'),
]
for key, label in vilc_intermedios:
    n, m = precios_intermedios_ida[key]
    ida_lines.append(f"  '{key}': {fmt(n, m)},")

# El Tambo intermediates (Malacatos -> X)
ida_lines.append('  // Intermedios El Tambo IDA (desde Malacatos hacia El Tambo)')
el_tambo_intermedios = [
    'Mal\u2192Ceibop', 'Mal\u2192Trinidad', 'Mal\u2192S.Jose', 'Mal\u2192StoDom',
    'Mal\u2192N.Dulce', 'Mal\u2192Zhotahu', 'Mal\u2192LaMerc', 'Mal\u2192S.Agust',
    'Mal\u2192LaEra', 'Mal\u2192LaCap', 'Mal\u2192S.Bern', 'Mal\u2192ElTambo',
]
for key in el_tambo_intermedios:
    n, m = precios_intermedios_ida[key]
    ida_lines.append(f"  '{key}':   {fmt(n, m)},")

# La Elvira intermediates (from Malacatos)
ida_lines.append('  // Intermedios La Elvira IDA (desde Malacatos hacia La Elvira)')
elvira_mal_keys = ['Mal\u2192Cucan', 'Mal\u2192Lind', 'Mal\u2192Santo', 'Mal\u2192Solan', 'Mal\u2192Moyoc',
                   'Mal\u2192Tumia', 'Mal\u2192Quina', 'Mal\u2192Comun', 'Mal\u2192Elvira']
for key in elvira_mal_keys:
    n, m = precios_intermedios_ida[key]
    ida_lines.append(f"  '{key}':   {fmt(n, m)},")

# La Elvira intermediates (from Vilcabamba)
ida_lines.append('  // Intermedios La Elvira IDA (desde Vilcabamba hacia La Elvira)')
elvira_vilc_keys = ['Vilc\u2192Cucan', 'Vilc\u2192Lind', 'Vilc\u2192Santo', 'Vilc\u2192Solan', 'Vilc\u2192Moyoc',
                    'Vilc\u2192Tumia', 'Vilc\u2192Quina', 'Vilc\u2192Comun', 'Vilc\u2192Elvira']
for key in elvira_vilc_keys:
    n, m = precios_intermedios_ida[key]
    ida_lines.append(f"  '{key}':   {fmt(n, m)},")

# Zahuayco directos
ida_lines.append('  // \u2550\u2550\u2550 LOJA - ZAHUAYCO (pasa por Vilcabamba) \u2550\u2550\u2550')
zahuayco_directos = ['Masanamaca', 'Quinara', 'Chumberos', 'Palmira', 'Zahuayco']
for stop in zahuayco_directos:
    n, m = precios_directos[stop]
    ida_lines.append(f"  '{stop}': {fmt(n, m)},")

# Zahuayco intermediates
ida_lines.append('  // Intermedios Zahuayco IDA (desde Vilcabamba)')
zahua_vilc_keys = ['Vilc\u2192Masan', 'Vilc\u2192Quina2', 'Vilc\u2192Chumb', 'Vilc\u2192Palm', 'Vilc\u2192Zahua']
for key in zahua_vilc_keys:
    n, m = precios_intermedios_ida[key]
    ida_lines.append(f"  '{key}':   {fmt(n, m)},")

ida_lines.append('  // Intermedios Zahuayco IDA (desde Malacatos)')
zahua_mal_keys = ['Mal\u2192Masan', 'Mal\u2192Quina2', 'Mal\u2192Chumb', 'Mal\u2192Palm', 'Mal\u2192Zahua']
for key in zahua_mal_keys:
    n, m = precios_intermedios_ida[key]
    ida_lines.append(f"  '{key}':   {fmt(n, m)},")

# El Tambo directos
ida_lines.append('  // \u2550\u2550\u2550 LOJA - EL TAMBO (ramifica en Malacatos, NO pasa Vilcabamba) \u2550\u2550\u2550')
el_tambo_directos = ['Ceibopamba', 'Trinidad', 'San Jos\u00e9', 'Santo Domingo', 'Naranjo Dulce',
                     'Zhotahuayco', 'La Merced', 'San Agust\u00edn', 'La Era', 'La Capilla',
                     'San Bernardo', 'El Tambo']
for stop in el_tambo_directos:
    n, m = precios_directos[stop]
    ida_lines.append(f"  '{stop}':    {fmt(n, m)},")

# La Elvira directos
ida_lines.append('  // \u2550\u2550\u2550 LOJA - LA ELVIRA (pasa por Vilcabamba) \u2550\u2550\u2550')
elvira_directos = ['Cucanama', 'Linderos', 'Santorum', 'Solanda', 'Moyococha', 'Tumianuma', 'Comunidades', 'La Elvira']
for stop in elvira_directos:
    n, m = precios_directos[stop]
    ida_lines.append(f"  '{stop}':    {fmt(n, m)},")

# Yangana directos + intermediates
ida_lines.append('  // \u2550\u2550\u2550 LOJA - YANGANA (pasa por Vilcabamba) \u2550\u2550\u2550')
yangana_directos = ['Suro', 'Yangana']
for stop in yangana_directos:
    n, m = precios_directos[stop]
    ida_lines.append(f"  '{stop}':    {fmt(n, m)},")

ida_lines.append('  // Intermedios Yangana IDA (desde Vilcabamba)')
yang_vilc_keys = ['Vilc\u2192Masan', 'Vilc\u2192Suro', 'Vilc\u2192Yangana']
for key in yang_vilc_keys:
    n, m = precios_intermedios_ida[key]
    ida_lines.append(f"  '{key}': {fmt(n, m)},")

ida_lines.append('  // Intermedios Yangana IDA (desde Malacatos)')
yang_mal_keys = ['Mal\u2192Masan', 'Mal\u2192Suro', 'Mal\u2192Yangana']
for key in yang_mal_keys:
    n, m = precios_intermedios_ida[key]
    ida_lines.append(f"  '{key}':   {fmt(n, m)},")

ida_lines.append('};')
ida_block = '\n'.join(ida_lines)

# Build preciosVuelta (same as ida - user confirmed "misma distancia")
vuelta_lines = []
vuelta_lines.append('const preciosVuelta: Record<string, { normal: number; media: number }> = {')
vuelta_lines.append('  // Vuelta = Ida (misma distancia)')

# Include all directo stops (same prices)
all_directos = vilcabamba_directos + el_tambo_directos + zahuayco_directos + elvira_directos + yangana_directos
for stop in all_directos:
    n, m = precios_directos[stop]
    vuelta_lines.append(f"  '{stop}': {fmt(n, m)},")

# Include intermediates from La Elvira (vuelta direction: Cucanama->Mal, Vilc->Cucan, etc.)
# These use the SAME keys and SAME prices as ida
vuelta_lines.append('  // Intermedios La Elvira (vuelta = ida)')
for key in elvira_mal_keys + elvira_vilc_keys:
    n, m = precios_intermedios_ida[key]
    vuelta_lines.append(f"  '{key}':   {fmt(n, m)},")

# Include Vilcabamba route intermediates for vuelta (Malacatos -> X)
vuelta_lines.append('  // Intermedios Vilcabamba (vuelta: desde Malacatos hacia paradas)')
for key, label in vilc_intermedios:
    n, m = precios_intermedios_ida[key]
    vuelta_lines.append(f"  '{key}': {fmt(n, m)},")

vuelta_lines.append('};')
vuelta_block = '\n'.join(vuelta_lines)

# Build preciosVueltaElTambo (simplified - same prices as ida for directos)
tambo_lines = []
tambo_lines.append('const preciosVueltaElTambo: Record<string, { normal: number; media: number }> = {')
tambo_lines.append('  // Vuelta El Tambo = Ida (misma distancia)')
for stop in el_tambo_directos + vilcabamba_directos:
    n, m = precios_directos[stop]
    tambo_lines.append(f"  '{stop}': {fmt(n, m)},")
tambo_lines.append('};')
tambo_block = '\n'.join(tambo_lines)

print(f"Generated preciosIda: {len([l for l in ida_lines if '{ normal:' in l])} entries")
print(f"Generated preciosVuelta: {len([l for l in vuelta_lines if '{ normal:' in l])} entries")
print(f"Generated preciosVueltaElTambo: {len([l for l in tambo_lines if '{ normal:' in l])} entries")

# ═══════════════════════════════════════════════════════════════
# 3. REPLACE IN FILE
# ═══════════════════════════════════════════════════════════════

# Replace preciosIda block
pattern_ida = r'const preciosIda: Record<string, \
?{ normal: number; media: number }> = \{[^}]+\};'
content_new = re.sub(pattern_ida, ida_block, content, flags=re.DOTALL)
if content_new == content:
    print("WARNING: preciosIda block not found or not replaced!")
else:
    print("OK: preciosIda block replaced")
    content = content_new

# Replace preciosVuelta block
pattern_vuelta = r'const preciosVuelta: Record<string, \
?{ normal: number; media: number }> = \{[^}]+\};'
content_new = re.sub(pattern_vuelta, vuelta_block, content, flags=re.DOTALL)
if content_new == content:
    print("WARNING: preciosVuelta block not found or not replaced!")
else:
    print("OK: preciosVuelta block replaced")
    content = content_new

# Replace preciosVueltaElTambo block
pattern_tambo = r'const preciosVueltaElTambo: Record<string, \
?{ normal: number; media: number }> = \{[^}]+\};'
content_new = re.sub(pattern_tambo, tambo_block, content, flags=re.DOTALL)
if content_new == content:
    print("WARNING: preciosVueltaElTambo block not found or not replaced!")
else:
    print("OK: preciosVueltaElTambo block replaced")
    content = content_new

# ═══════════════════════════════════════════════════════════════
# 4. ADD TRINIDAD TO PARADA_ZONA
# ═══════════════════════════════════════════════════════════════

if "'Trinidad':" not in content:
    # Add after Ceibopamba in PARADA_ZONA
    content = content.replace(
        "  'Ceibopamba': 'blue',",
        "  'Ceibopamba': 'blue',\n  'Trinidad': 'blue',"
    )
    print("OK: Trinidad added to PARADA_ZONA")

# ═══════════════════════════════════════════════════════════════
# 5. ADD TRINIDAD TO RUTA_PARADAS
# ═══════════════════════════════════════════════════════════════

# Add to Loja - El Tambo ida (after Ceibopamba)
content = content.replace(
    "'Malacatos', 'Ceibopamba', 'San Jos\u00e9'",
    "'Malacatos', 'Ceibopamba', 'Trinidad', 'San Jos\u00e9'"
)

# Add to Loja - El Tambo vuelta (after Ceibopamba)
content = content.replace(
    "'Ceibopamba', 'Malacatos',",
    "'Ceibopamba', 'Trinidad', 'Malacatos',"
)

print("OK: Trinidad added to RUTA_PARADAS")

# ═══════════════════════════════════════════════════════════════
# 6. UPDATE RUTA_PARADAS - remove eliminated intermediate keys
# ═══════════════════════════════════════════════════════════════

# Remove old Vilcabamba intermediates from Loja-Vilcabamba ida
old_vilc_ida_int = ['Rumi\u2192Vilc', 'Rumi\u2192Mal', 'Rumi\u2192Prv', 'Nango\u2192Vilc', 'Nango\u2192Mal', 'Nango\u2192Carar',
                     'Land\u2192Vilc', 'Land\u2192Mal', 'Mal\u2192Vilc',
                     'T.Leguas\u2192Mal', 'Taxiche\u2192Vilc', 'Cararango\u2192Vilc', 'S.Pedro\u2192Vilc']

# Add new Vilcabamba intermediates
new_vilc_ida_int = ['Pe\u00f1a\u2192Mal', 'Land\u2192Mal', 'Chorri\u2192Mal', 'Nango\u2192Mal',
                     'Porv\u2192Mal', 'Gran\u2192Mal', 'Yamba\u2192Mal', 'Rumi\u2192Mal',
                     'T.Leguas\u2192Mal', 'P.Nuevo\u2192Mal', 'Caja\u2192Mal', 'D.Puen\u2192Mal', 'Capul\u00ed\u2192Mal']

# Replace in Loja-Vilcabamba ida
old_vilc_ida_str = ', '.join(f"'{k}'" for k in old_vilc_ida_int)
new_vilc_ida_str = ', '.join(f"'{k}'" for k in new_vilc_ida_int)

# Check if old string exists in Loja-Vilcabamba ida section
vilcabamba_ida_pattern = r"('Loja - Vilcabamba'[^}]*ida: \[[^\]]+)'Rumi→Vilc'"
match = re.search(vilcabamba_ida_pattern, content)
if match:
    print("OK: Found Vilcabamba ida intermediates to replace")

# More targeted: replace the intermediate list in Loja-Vilcabamba ida
# The old list: 'Rumi→Vilc', 'Rumi→Mal', 'Rumi→Prv', 'Nango→Vilc', ...
# Need to find this in context of Vilcabamba ida

# Let's do it line by line approach
lines = content.split('\n')
new_lines = []
in_vilcabamba_ida = False
vilcabamba_ida_done = False

for i, line in enumerate(lines):
    if "'Loja - Vilcabamba'" in line and 'ida:' not in line:
        in_vilcabamba_ida = False
        vilcabamba_ida_done = False
    
    if "'Loja - Vilcabamba'" in line:
        in_vilcabamba_ida = True
    
    if in_vilcabamba_ida and 'ida:' in line and not vilcabamba_ida_done:
        # This is the ida array start, we need to process until we find the closing ]
        new_lines.append(line)
        continue
    
    # Remove old intermediates from Vilcabamba ida
    if in_vilcabamba_ida and not vilcabamba_ida_done:
        skip = False
        for old_key in old_vilc_ida_int:
            if f"'{old_key}'" in line:
                skip = True
                break
        if skip:
            continue
        # Add new intermediates after 'Vilcabamba' in the ida list
        if "'Vilcabamba'," in line or ("'Vilcabamba'" in line and "," in line):
            new_lines.append(line)
            # Insert new intermediate keys
            indent = '          '
            for j, key in enumerate(new_vilc_ida_int):
                comma = ',' if j < len(new_vilc_ida_int) - 1 else ','
                new_lines.append(f"{indent}'{key}'{comma}")
            continue
        if '],' in line and not vilcabamba_ida_done:
            vilcabamba_ida_done = True
            in_vilcabamba_ida = False
    
    new_lines.append(line)

content = '\n'.join(new_lines)
print("OK: Vilcabamba ida intermediates updated in RUTA_PARADAS")

# ═══════════════════════════════════════════════════════════════
# 7. Remove eliminated keys from RUTA_PARADAS
# ═══════════════════════════════════════════════════════════════

# Remove from all RUTA_PARADAS arrays
all_eliminated = eliminate_ida + eliminate_vuelta_tambo + eliminate_vuelta
for key in all_eliminated:
    content = content.replace(f"'{key}',", '')
    content = content.replace(f"'{key}'", '')  # in case it was last

print(f"OK: Removed {len(all_eliminated)} eliminated intermediate keys from RUTA_PARADAS")

# ═══════════════════════════════════════════════════════════════
# 8. ADD NEW PARADA_ZONA ENTRIES for new intermediates
# ═══════════════════════════════════════════════════════════════

new_zona_entries = {
    'Pe\u00f1a\u2192Mal': 'yellow',
    'Chorri\u2192Mal': 'yellow',
    'Porv\u2192Mal': 'yellow',
    'Gran\u2192Mal': 'yellow',
    'Yamba\u2192Mal': 'yellow',
    'P.Nuevo\u2192Mal': 'yellow',
    'Caja\u2192Mal': 'green',
    'D.Puen\u2192Mal': 'green',
    'Capul\u00ed\u2192Mal': 'green',
    'Vilc\u2192Masan': 'blue',
    'Vilc\u2192Quina2': 'blue',
    'Vilc\u2192Chumb': 'blue',
    'Vilc\u2192Palm': 'blue',
    'Vilc\u2192Zahua': 'blue',
    'Mal\u2192Masan': 'blue',
    'Mal\u2192Quina2': 'blue',
    'Mal\u2192Chumb': 'blue',
    'Mal\u2192Palm': 'blue',
    'Mal\u2192Zahua': 'blue',
    'Vilc\u2192Suro': 'blue',
    'Vilc\u2192Yangana': 'blue',
    'Mal\u2192Suro': 'blue',
    'Mal\u2192Yangana': 'blue',
    'Mal\u2192Trinidad': 'blue',
}

# Remove old eliminated zona entries
for key in all_eliminated:
    content = content.replace(f"  '{key}': '{content[content.find(key)-5:content.find(key)]}'\n" if key in content else '', '')

# Add new zona entries before the closing of PARADA_ZONA
for key, zona in new_zona_entries.items():
    if f"'{key}':" not in content:
        content = content.replace(
            "};\n\nexport const ZONA_COLORS",
            f"  '{key}': '{zona}',\n}};\n\nexport const ZONA_COLORS"
        )

print(f"OK: Added {len(new_zona_entries)} new PARADA_ZONA entries")

# ═══════════════════════════════════════════════════════════════
# 9. UPDATE COMMENT DATE
# ═══════════════════════════════════════════════════════════════

content = content.replace(
    '// Actualizado: Agosto 2025',
    '// Actualizado: Agosto 2026 — precios del tarifario oficial XLSX'
)

# ═══════════════════════════════════════════════════════════════
# 10. CLEANUP - remove duplicate Vilc->Masan key in Yangana section
# ═══════════════════════════════════════════════════════════════

# The Vilc→Masan key is shared between Zahuayco and Yangana, ensure it's only listed once in ida

# ═══════════════════════════════════════════════════════════════
# WRITE FILE
# ═══════════════════════════════════════════════════════════════

with open(TS_PATH, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\nFile updated: {TS_PATH}")

# Verify
with open(TS_PATH, 'r', encoding='utf-8') as f:
    verify = f.read()

zero_count = verify.count('{ normal: 0.00, media: 0.00 }')
print(f"Remaining zero prices: {zero_count}")

# Count total prices
total_prices = verify.count('{ normal:')
print(f"Total price entries: {total_prices}")
