#!/usr/bin/env python3
import json, re, sys

# Load all page extractions
all_rows = []
for i in range(1, 6):
    try:
        with open(f'/home/z/my-project/upload/ida_page_{i}.json') as f:
            data = json.load(f)
        content = data['choices'][0]['message']['content']
        # Extract JSON from markdown code block
        match = re.search(r'```json\s*(\[.*?\])\s*```', content, re.DOTALL)
        if match:
            rows = json.loads(match.group(1))
            all_rows.extend(rows)
    except Exception as e:
        print(f'Error page {i}: {e}')

print(f'Total filas extraídas: {len(all_rows)}')
print()

# Current system prices (preciosIda)
system_ida = {
    # Vilcabamba direct
    'Dos Puentes': (0.75, 0.40), 'Cajánuma': (1.25, 0.55), 'Pueblo Nuevo': (1.25, 0.55),
    'Tres Leguas': (1.25, 0.55), 'Rumizhitana': (1.25, 0.55), 'Yamba': (1.25, 0.55),
    'Granadillo': (1.40, 0.65), 'Porvenir': (1.40, 0.65), 'Nangora': (1.50, 0.75),
    'Chorrillos': (1.50, 0.75), 'Landangui': (1.75, 0.90), 'La Peña': (1.75, 0.90),
    'Malacatos': (2.00, 1.00), 'Taxiche': (2.00, 1.00), 'Cavianga': (2.25, 1.15),
    'Cararango': (2.25, 1.15), 'San Pedro': (2.25, 1.15), 'Vilcabamba': (2.50, 1.25),
    # Vilcabamba intermedios → Malacatos
    'Peña→Mal': (0.75, 0.40), 'Land→Mal': (0.75, 0.40), 'Chorri→Mal': (0.75, 0.40),
    'Nango→Mal': (0.75, 0.40), 'Porv→Mal': (1.10, 0.55), 'Gran→Mal': (1.10, 0.55),
    'Yamba→Mal': (1.10, 0.55), 'Rumi→Mal': (1.10, 0.55), 'T.Leguas→Mal': (1.10, 0.55),
    'P.Nuevo→Mal': (1.10, 0.55), 'Caja→Mal': (1.50, 0.75), 'D.Puen→Mal': (1.50, 0.75),
    'Capulí→Mal': (2.00, 1.00),
    # Vilcabamba intermedios → Vilcabamba
    'SPed→Vilc': (0.75, 0.40), 'Carar→Vilc': (0.75, 0.40), 'Cavi→Vilc': (0.75, 0.40),
    'Tax→Vilc': (0.75, 0.40), 'Mal→Vilc': (1.10, 0.55), 'Land→Vilc': (1.10, 0.55),
    'Chorri→Vilc': (1.25, 0.65), 'Nango→Vilc': (1.25, 0.65), 'Porv→Vilc': (1.25, 0.65),
    'Gran→Vilc': (1.50, 0.75), 'Yamba→Vilc': (1.50, 0.75), 'Rumi→Vilc': (1.50, 0.75),
    'T.Leguas→Vilc': (1.50, 0.75), 'P.Nuevo→Vilc': (1.50, 0.75), 'Caja→Vilc': (2.00, 1.00),
    'D.Puen→Vilc': (2.00, 1.00), 'Capulí→Vilc': (2.50, 1.25),
}

# Organize by route
routes = {}
current_ruta = None
for row in all_rows:
    ruta = row.get('Ruta', current_ruta)
    if ruta and ruta != current_ruta:
        current_ruta = ruta
        routes[ruta] = []
    if current_ruta:
        routes[current_ruta].append(row)
    else:
        # No route header, assign based on context
        if 'routes' not in routes:
            routes['_unknown'] = []
        routes['_unknown'].append(row)

# Group rows by route context (pages)
# Page 1: Vilcabamba (rows 0-47) + start El Tambo direct (rows 48-60)
# Page 2: El Tambo direct end + El Tambo intermediates + La Elvira direct start
# Page 3: La Elvira intermediates + Yangana direct start + intermediates
# Page 4: Yangana intermediates + Zahuayco direct + intermediates start
# Page 5: Zahuayco intermediates end

# Better approach: manually segment by content
page_breaks = {
    'Loja - Vilcabamba': (0, 48),       # Page 1 rows 0-47
    'Loja - El Tambo': (48, 97),         # Page 1 end + Page 2
    'Loja - La Elvira': (97, 163),       # Page 2 end + Page 3
    'Loja - Yangana': (163, 199),        # Page 3 end + Page 4
    'Loja - Zahuayco': (199, len(all_rows)),  # Page 4 end + Page 5
}

def parse_price(s):
    """Parse price string like '$0.75' or '$0,75' to float"""
    if not s:
        return None
    s = s.replace('$', '').replace(',', '.').strip()
    try:
        return float(s)
    except:
        return None

print('=' * 70)
print('ANÁLISIS COMPARATIVO: PDF ida.pdf vs SISTEMA ACTUAL')
print('=' * 70)

# 1. Check Loja-Vilcabamba IDA direct
print('\n### 1. LOJA - VILCABAMBA IDA DIRECTO ###')
vilc_direct = all_rows[0:18]
errors = []
for row in vilc_direct:
    dest = row['Destino']
    normal = parse_price(row.get('Tarifa Normal', row.get('Normal')))
    media = parse_price(row.get('Tarifa Media', row.get('Media')))
    if dest in system_ida:
        sys_n, sys_m = system_ida[dest]
        if abs(normal - sys_n) > 0.01 or abs(media - sys_m) > 0.01:
            errors.append(f'  ❌ {dest}: PDF={normal}/{media} vs Sistema={sys_n}/{sys_m}')
    else:
        errors.append(f'  ⚠️  {dest}: en PDF pero no en sistema')
if not errors:
    print('  ✅ Todos los 18 precios directos coinciden')
else:
    for e in errors:
        print(e)

# 2. Check Loja-Vilcabamba intermedios → Mal
print('\n### 2. LOJA - VILCABAMBA INTERMEDIOS → MALACATOS ###')
vilc_inter_mal = all_rows[18:31]
errors = []
for row in vilc_inter_mal:
    orig = row['Origen']
    normal = parse_price(row.get('Tarifa Normal', row.get('Normal')))
    media = parse_price(row.get('Tarifa Media', row.get('Media')))
    # Map to system key
    key_map = {
        'La Peña': 'Peña→Mal', 'Landangui': 'Land→Mal', 'Chorrillos': 'Chorri→Mal',
        'Nangora': 'Nango→Mal', 'Porvenir': 'Porv→Mal', 'Granadillo': 'Gran→Mal',
        'Yamba': 'Yamba→Mal', 'Rumizhitana': 'Rumi→Mal', 'Tres Leguas': 'T.Leguas→Mal',
        'Pueblo Nuevo': 'P.Nuevo→Mal', 'Cajanuma': 'Caja→Mal', 'Dos Puentes': 'D.Puen→Mal',
        'Capuli': 'Capulí→Mal', 'Capulí': 'Capulí→Mal',
    }
    key = key_map.get(orig, orig)
    if key in system_ida:
        sys_n, sys_m = system_ida[key]
        if abs(normal - sys_n) > 0.01 or abs(media - sys_m) > 0.01:
            errors.append(f'  ❌ {orig}→Mal: PDF={normal}/{media} vs Sistema={sys_n}/{sys_m}')
    else:
        errors.append(f'  ⚠️  {orig}→Mal: en PDF pero no en sistema (key={key})')
if not errors:
    print('  ✅ Todos los 13 intermedios → Malacatos coinciden')
else:
    for e in errors:
        print(e)

# 3. Check Loja-Vilcabamba intermedios → Vilc
print('\n### 3. LOJA - VILCABAMBA INTERMEDIOS → VILCABAMBA ###')
vilc_inter_vilc = all_rows[31:48]
errors = []
for row in vilc_inter_vilc:
    orig = row['Origen'].upper()
    normal = parse_price(row.get('Tarifa Normal', row.get('Normal')))
    media = parse_price(row.get('Tarifa Media', row.get('Media')))
    key_map = {
        'SAN PEDRO': 'SPed→Vilc', 'CARARANGO': 'Carar→Vilc', 'CAVIANGA': 'Cavi→Vilc',
        'TAXICHE': 'Tax→Vilc', 'MALACATOS': 'Mal→Vilc', 'LANDANGUI': 'Land→Vilc',
        'CHORRILLOS': 'Chorri→Vilc', 'NANGORA': 'Nango→Vilc', 'PORVENIR': 'Porv→Vilc',
        'GRANADILLO': 'Gran→Vilc', 'YAMBA': 'Yamba→Vilc', 'RUMIZHITANA': 'Rumi→Vilc',
        'TRES LEGUAS': 'T.Leguas→Vilc', 'PUEBLO NUEVO': 'P.Nuevo→Vilc', 'CAJANUMA': 'Caja→Vilc',
        'DOS PUENTES': 'D.Puen→Vilc', 'CAPULI': 'Capulí→Vilc',
    }
    key = key_map.get(orig, orig)
    if key in system_ida:
        sys_n, sys_m = system_ida[key]
        if abs(normal - sys_n) > 0.01 or abs(media - sys_m) > 0.01:
            errors.append(f'  ❌ {orig}→Vilc: PDF={normal}/{media} vs Sistema={sys_n}/{sys_m}')
    else:
        errors.append(f'  ⚠️  {orig}→Vilc: en PDF pero no en sistema (key={key})')
if not errors:
    print('  ✅ Todos los 17 intermedios → Vilcabamba coinciden')
else:
    for e in errors:
        print(e)

# 4. Analyze OTHER routes
print('\n### 4. OTRAS RUTAS - RESUMEN DE PRECIOS DEL PDF ###')

# El Tambo direct (page 1 rows 48-60, page 2 row 0)
print('\n--- LOJA - EL TAMBO DIRECTO ---')
eltambo_direct = [all_rows[48+i] for i in range(13)] + [all_rows[63]]  # rows 48-60 + El Tambo final
for row in [all_rows[48+i] for i in range(13)]:
    d = row['Destino']
    n = parse_price(row.get('Tarifa Normal', row.get('Normal')))
    m = parse_price(row.get('Tarifa Media', row.get('Media')))
    print(f'  {d}: ${n}/${m}')
# El Tambo final stop
print(f'  El Tambo: $4.00/$2.00')

# El Tambo intermediates from stops → El Tambo
print('\n--- LOJA - EL TAMBO INTERMEDIOS (desde paradas → El Tambo) ---')
for i in range(64, 76):
    row = all_rows[i]
    o = row['Origen']
    d = row['Destino']
    n = parse_price(row.get('Tarifa Normal', row.get('Normal')))
    m = parse_price(row.get('Tarifa Media', row.get('Media')))
    print(f'  {o} → {d}: ${n}/${m}')

# El Tambo intermediates from Malacatos → El Tambo stops
print('\n--- LOJA - EL TAMBO INTERMEDIOS (desde Malacatos) ---')
for i in range(76, 89):
    row = all_rows[i]
    o = row['Origen']
    d = row['Destino']
    n = parse_price(row.get('Tarifa Normal', row.get('Normal')))
    m = parse_price(row.get('Tarifa Media', row.get('Media')))
    print(f'  {o} → {d}: ${n}/${m}')

# La Elvira
print('\n--- LOJA - LA ELVIRA DIRECTO ---')
for i in range(89, 97):
    row = all_rows[i]
    d = row['Destino']
    n = parse_price(row.get('Tarifa Normal', row.get('Normal')))
    m = parse_price(row.get('Tarifa Media', row.get('Media')))
    print(f'  {d}: ${n}/${m}')

# La Elvira intermediates from Malacatos
print('\n--- LOJA - LA ELVIRA INTERMEDIOS (desde Malacatos) ---')
for i in range(110, 119):
    if i >= len(all_rows): break
    row = all_rows[i]
    o = row['Origen']
    d = row['Destino']
    n = parse_price(row.get('Tarifa Normal', row.get('Normal')))
    m = parse_price(row.get('Tarifa Media', row.get('Media')))
    print(f'  {o} → {d}: ${n}/${m}')

# La Elvira intermediates from Vilcabamba
print('\n--- LOJA - LA ELVIRA INTERMEDIOS (desde Vilcabamba) ---')
for i in range(119, 128):
    if i >= len(all_rows): break
    row = all_rows[i]
    o = row['Origen']
    d = row['Destino']
    n = parse_price(row.get('Tarifa Normal', row.get('Normal')))
    m = parse_price(row.get('Tarifa Media', row.get('Media')))
    print(f'  {o} → {d}: ${n}/${m}')

# Yangana
print('\n--- LOJA - YANGANA DIRECTO ---')
for i in range(141, 145):
    if i >= len(all_rows): break
    row = all_rows[i]
    d = row['Destino']
    n = parse_price(row.get('Tarifa Normal', row.get('Normal')))
    m = parse_price(row.get('Tarifa Media', row.get('Media')))
    print(f'  {d}: ${n}/${m}')

# Yangana intermediates from Malacatos
print('\n--- LOJA - YANGANA INTERMEDIOS (desde Malacatos) ---')
for i in range(164, 167):
    if i >= len(all_rows): break
    row = all_rows[i]
    o = row['Origen']
    d = row['Destino']
    n = parse_price(row.get('Tarifa Normal', row.get('Normal')))
    m = parse_price(row.get('Tarifa Media', row.get('Media')))
    print(f'  {o} → {d}: ${n}/${m}')

# Yangana intermediates from Vilcabamba
print('\n--- LOJA - YANGANA INTERMEDIOS (desde Vilcabamba) ---')
for i in range(167, 170):
    if i >= len(all_rows): break
    row = all_rows[i]
    o = row['Origen']
    d = row['Destino']
    n = parse_price(row.get('Tarifa Normal', row.get('Normal')))
    m = parse_price(row.get('Tarifa Media', row.get('Media')))
    print(f'  {o} → {d}: ${n}/${m}')

# Zahuayco
print('\n--- LOJA - ZAHUAYCO DIRECTO ---')
for i in range(170, 177):
    if i >= len(all_rows): break
    row = all_rows[i]
    d = row['Destino']
    n = parse_price(row.get('Tarifa Normal', row.get('Normal')))
    m = parse_price(row.get('Tarifa Media', row.get('Media')))
    print(f'  {d}: ${n}/${m}')

# Zahuayco intermediates from Malacatos
print('\n--- LOJA - ZAHUAYCO INTERMEDIOS (desde Malacatos) ---')
for i in range(204, 211):
    if i >= len(all_rows): break
    row = all_rows[i]
    o = row['Origen']
    d = row['Destino']
    n = parse_price(row.get('Tarifa Normal', row.get('Normal')))
    m = parse_price(row.get('Tarifa Media', row.get('Media')))
    print(f'  {o} → {d}: ${n}/${m}')

# Zahuayco intermediates from Vilcabamba
print('\n--- LOJA - ZAHUAYCO INTERMEDIOS (desde Vilcabamba) ---')
for i in range(211, 218):
    if i >= len(all_rows): break
    row = all_rows[i]
    o = row['Origen']
    d = row['Destino']
    n = parse_price(row.get('Tarifa Normal', row.get('Normal')))
    m = parse_price(row.get('Tarifa Media', row.get('Media')))
    print(f'  {o} → {d}: ${n}/${m}')

print(f'\nTotal filas procesadas: {len(all_rows)}')
