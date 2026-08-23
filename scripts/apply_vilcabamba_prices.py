#!/usr/bin/env python3
"""Aplicar precios del PDF Loja-Vilcabamba al sistema"""

FILE = '/home/z/my-project/src/lib/tarifas-data.ts'

with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

# ═══════════════════════════════════════════
# 1. IDA DIRECTO (desde Loja) → preciosIda
# ═══════════════════════════════════════════
ida_directo = {
    'Dos Puentes': (0.75, 0.40),
    'Cajánuma': (1.25, 0.55),
    'Pueblo Nuevo': (1.25, 0.55),
    'Tres Leguas': (1.25, 0.55),
    'Rumizhitana': (1.25, 0.55),
    'Yamba': (1.25, 0.55),
    'Granadillo': (1.40, 0.65),
    'Porvenir': (1.40, 0.65),
    'Nangora': (1.50, 0.75),
    'Chorrillos': (1.50, 0.75),
    'Landangui': (1.75, 0.90),
    'La Peña': (1.75, 0.90),
    'Malacatos': (2.00, 1.00),
    'Taxiche': (2.00, 1.00),
    'Cavianga': (2.25, 1.15),
    'Cararango': (2.25, 1.15),
    'San Pedro': (2.25, 1.15),
    'Vilcabamba': (2.50, 1.25),
}

# ═══════════════════════════════════════════
# 2. IDA INTERMEDIOS → Malacatos → preciosIda
# ═══════════════════════════════════════════
ida_int_med = {
    "'Peña→Mal'": (0.75, 0.40),
    "'Land→Mal'": (0.75, 0.40),
    "'Chorri→Mal'": (0.75, 0.40),
    "'Nango→Mal'": (0.75, 0.40),
    "'Porv→Mal'": (1.10, 0.55),
    "'Gran→Mal'": (1.10, 0.55),
    "'Yamba→Mal'": (1.10, 0.55),
    "'Rumi→Mal'": (1.10, 0.55),
    "'T.Leguas→Mal'": (1.10, 0.55),
    "'P.Nuevo→Mal'": (1.10, 0.55),
    "'Caja→Mal'": (1.50, 0.75),
    "'D.Puen→Mal'": (1.50, 0.75),
    "'Capulí→Mal'": (2.00, 1.00),
}

# ═══════════════════════════════════════════
# 3. IDA INTERMEDIOS → Vilcabamba (NUEVOS)
# ═══════════════════════════════════════════
ida_int_vilc = {
    "'SPed→Vilc'": (0.75, 0.40),
    "'Carar→Vilc'": (0.75, 0.40),
    "'Cavi→Vilc'": (0.75, 0.40),
    "'Tax→Vilc'": (0.75, 0.40),
    "'Mal→Vilc'": (1.10, 0.55),
    "'Land→Vilc'": (1.10, 0.55),
    "'Chorri→Vilc'": (1.25, 0.65),
    "'Nango→Vilc'": (1.25, 0.65),
    "'Porv→Vilc'": (1.25, 0.65),
    "'Gran→Vilc'": (1.50, 0.75),
    "'Yamba→Vilc'": (1.50, 0.75),
    "'Rumi→Vilc'": (1.50, 0.75),
    "'T.Leguas→Vilc'": (1.50, 0.75),
    "'P.Nuevo→Vilc'": (1.50, 0.75),
    "'Caja→Vilc'": (2.00, 1.00),
    "'D.Puen→Vilc'": (2.00, 1.00),
    "'Capulí→Vilc'": (2.50, 1.25),
}

# ═══════════════════════════════════════════
# 4. RETORNO DIRECTO (desde Vilcabamba) → preciosVuelta
# ═══════════════════════════════════════════
retorno_directo = {
    'San Pedro': (0.75, 0.40),
    'Cararango': (0.75, 0.40),
    'Cavianga': (0.75, 0.40),
    'Taxiche': (0.75, 0.40),
    'Malacatos': (1.10, 0.55),
    'Landangui': (1.10, 0.55),
    'Chorrillos': (1.25, 0.65),
    'Nangora': (1.25, 0.65),
    'Porvenir': (1.25, 0.65),
    'Granadillo': (1.50, 0.75),
    'Yamba': (1.50, 0.75),
    'Rumizhitana': (1.50, 0.75),
    'Tres Leguas': (1.50, 0.75),
    'Pueblo Nuevo': (1.50, 0.75),
    'Cajánuma': (2.00, 1.00),
    'Dos Puentes': (2.00, 1.00),
    'Capulí': (2.50, 1.25),
}

# ═══════════════════════════════════════════
# 5. RETORNO INTERMEDIOS (Malacatos → paradas) → preciosVuelta
# ═══════════════════════════════════════════
retorno_int = {
    "'Peña→Mal'": (0.75, 0.40),
    "'Land→Mal'": (0.75, 0.40),
    "'Chorri→Mal'": (0.75, 0.40),
    "'Nango→Mal'": (0.75, 0.40),
    "'Porv→Mal'": (1.10, 0.55),
    "'Gran→Mal'": (1.10, 0.55),
    "'Yamba→Mal'": (1.10, 0.55),
    "'Rumi→Mal'": (1.10, 0.55),
    "'T.Leguas→Mal'": (1.10, 0.55),
    "'P.Nuevo→Mal'": (1.10, 0.55),
    "'Caja→Mal'": (1.50, 0.75),
    "'D.Puen→Mal'": (1.50, 0.75),
    "'Capulí→Mal'": (2.00, 1.00),
}

import re

def replace_price(content, key, normal, media):
    """Replace price for a given key in the content"""
    # Pattern: 'KeyName': { normal: X, media: Y },
    pattern = f"({re.escape(key)}: \{{\s*)normal: [\d.]+,\s*media: [\d.]+(\s*\}})"
    replacement = f"\\1normal: {normal}, media: {media}\\2"
    new_content = re.sub(pattern, replacement, content)
    return new_content

changed = 0
errors = []

# Apply IDA DIRECTO in preciosIda section (before first // Intermedios comment)
# We need to only replace in the preciosIda block
ida_end = content.find('const preciosVuelta')
ida_section = content[:ida_end]
vuelta_section = content[ida_end:]

for key, (normal, media) in ida_directo.items():
    # Use quoted key like 'Dos Puentes'
    qkey = f"'{key}'"
    new_ida = replace_price(ida_section, qkey, normal, media)
    if new_ida != ida_section:
        changed += 1
        ida_section = new_ida
    else:
        errors.append(f"IDA DIRECTO: no found '{key}'")

for key, (normal, media) in ida_int_med.items():
    new_ida = replace_price(ida_section, key, normal, media)
    if new_ida != ida_section:
        changed += 1
        ida_section = new_ida
    else:
        errors.append(f"IDA INT MED: no found {key}")

# Apply RETORNO DIRECTO in preciosVuelta section
vuelta_end = content.find('const preciosVueltaElTambo')
vuelta_only = content[ida_end:vuelta_end]

for key, (normal, media) in retorno_directo.items():
    qkey = f"'{key}'"
    new_vuelta = replace_price(vuelta_only, qkey, normal, media)
    if new_vuelta != vuelta_only:
        changed += 1
        vuelta_only = new_vuelta
    else:
        errors.append(f"RETORNO DIRECTO: no found '{key}'")

for key, (normal, media) in retorno_int.items():
    new_vuelta = replace_price(vuelta_only, key, normal, media)
    if new_vuelta != vuelta_only:
        changed += 1
        vuelta_only = new_vuelta
    else:
        errors.append(f"RETORNO INT: no found {key}")

# Reassemble
content = ida_section + vuelta_only + content[vuelta_end:]

# ═══════════════════════════════════════════
# 6. ADD new IDA INTERMEDIOS → Vilcabamba
# ═══════════════════════════════════════════
# Insert after the last existing intermediate (Capulí→Mal) in preciosIda
# and before the Vilcabamba entry or the end of preciosIda block

# Find the line with Capulí→Mal in preciosIda
insert_marker = "'Capulí→Mal': { normal: 2.00, media: 1.00 },"
if insert_marker in content:
    new_lines = "\n  // Intermedios Vilcabamba IDA (desde parada hacia Vilcabamba)\n"
    for key, (normal, media) in ida_int_vilc.items():
        # key is like 'SPed→Vilc' (with quotes)
        new_lines += f"  {key}: {{ normal: {normal}, media: {media} }},\n"
    
    content = content.replace(
        insert_marker,
        insert_marker + new_lines
    )
    print(f"Agregados {len(ida_int_vilc)} nuevos intermedios → Vilcabamba")
else:
    errors.append("No se encontró marcador Capulí→Mal para insertar nuevos intermedios")

# ═══════════════════════════════════════════
# 7. Add new intermedios → Vilcabamba to RUTA_PARADAS
# ═══════════════════════════════════════════
vilc_int_keys = [
    'SPed→Vilc', 'Carar→Vilc', 'Cavi→Vilc', 'Tax→Vilc', 'Mal→Vilc',
    'Land→Vilc', 'Chorri→Vilc', 'Nango→Vilc', 'Porv→Vilc',
    'Gran→Vilc', 'Yamba→Vilc', 'Rumi→Vilc', 'T.Leguas→Vilc',
    'P.Nuevo→Vilc', 'Caja→Vilc', 'D.Puen→Vilc', 'Capulí→Vilc',
]

# Find the IDA list for 'Loja - Vilcabamba' and append the new keys
ida_list_marker = "'D.Puen→Mal', 'Capulí→Mal',"
if ida_list_marker in content:
    new_keys_str = ', '.join(f"'{k}'" for k in vilc_int_keys)
    content = content.replace(
        ida_list_marker,
        ida_list_marker + f"\n          {new_keys_str},"
    )
    print(f"Agregados {len(vilc_int_keys)} keys a RUTA_PARADAS ida")
else:
    errors.append("No se encontró marcador RUTA_PARADAS para insertar")

# ═══════════════════════════════════════════
# 8. Add PARADA_ZONA entries for new intermediate keys
# ═══════════════════════════════════════════
zona_insert = "  // Intermedios Vilcabamba IDA (desde parada hacia Vilcabamba)\n"
# This was already added in step 6 to preciosIda, now add to PARADA_ZONA
parada_zona_insert_marker = "  'Vilc→Elvira': 'blue',\n  };"
if parada_zona_insert_marker in content:
    new_zona_lines = "\n"
    for k in vilc_int_keys:
        new_zona_lines += f"  '{k}': 'blue',\n"
    content = content.replace(
        parada_zona_insert_marker,
        f"{new_zona_lines}{parada_zona_insert_marker}"
    )
    print(f"Agregadas {len(vilc_int_keys)} entradas a PARADA_ZONA")
else:
    errors.append("No se encontró marcador PARADA_ZONA")

# Write
with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\nTotal reemplazos: {changed}")
if errors:
    print(f"\nErrores ({len(errors)}):")
    for e in errors:
        print(f"  ⚠ {e}")
else:
    print("Sin errores.")