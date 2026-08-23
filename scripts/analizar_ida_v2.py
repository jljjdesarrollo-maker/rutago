#!/usr/bin/env python3
import json, re

# Load all pages
all_rows = []
for i in range(1, 6):
    try:
        with open(f'/home/z/my-project/upload/ida_page_{i}.json') as f:
            data = json.load(f)
        content = data['choices'][0]['message']['content']
        match = re.search(r'```json\s*(\[.*?\])\s*```', content, re.DOTALL)
        if match:
            rows = json.loads(match.group(1))
            all_rows.extend(rows)
    except: pass

def p(s):
    if not s: return None
    return float(str(s).replace('$','').replace(',','.').strip())

# Parse ALL rows into normalized format
def norm(orig, dest, n, m, tipo):
    return {'orig': orig.strip(), 'dest': dest.strip(), 'n': p(n), 'm': p(m), 'tipo': tipo.strip()}

parsed = []
for r in all_rows:
    tipo = r.get('Tipo','')
    orig = r.get('Origen','')
    dest = r.get('Destino','')
    n = r.get('Tarifa Normal', r.get('Normal',''))
    m = r.get('Tarifa Media', r.get('Media',''))
    parsed.append(norm(orig, dest, n, m, tipo))

# Now segment by routes using heuristics
# Route changes when we see DIRECTO from Loja after non-Loja rows
routes_data = {}
current_route = None
current_section = []

for i, row in enumerate(parsed):
    # Detect route start: DIRECTO from Loja to a stop that's NOT in Vilcabamba list
    vilc_stops = ['Dos Puentes','Cajanuma','Pueblo Nuevo','Tres Leguas','Rumizhitana','Yamba',
                  'Granadillo','Porvenir','Nangora','Chorrillos','Landangui','La Peña','Malacatos',
                  'Taxiche','Cavianga','Cararango','San Pedro','Vilcabamba']
    
    if row['tipo'] == 'DIRECTO' and row['orig'] == 'Loja' and row['dest'] == 'Dos Puentes' and i > 0:
        # New route starts with Dos Puentes
        if current_route and current_section:
            if current_route not in routes_data:
                routes_data[current_route] = []
            routes_data[current_route].extend(current_section)
        current_section = [row]
        # Determine route by looking ahead for unique destinations
        next_stops = [parsed[j]['dest'] for j in range(i, min(i+30, len(parsed))) if parsed[j]['tipo'] == 'DIRECTO']
        if 'Vilcabamba' in next_stops and 'El Tambo' not in next_stops and 'ZAHUAYCO' not in next_stops and 'YANGANA' not in next_stops and 'LA ELVIRA' not in next_stops:
            current_route = 'Loja - Vilcabamba'
        elif 'ZAHUAYCO' in next_stops:
            current_route = 'Loja - Zahuayco'
        elif 'YANGANA' in next_stops:
            current_route = 'Loja - Yangana'
        elif 'LA ELVIRA' in next_stops or 'La Elvira' in next_stops:
            current_route = 'Loja - La Elvira'
        else:
            current_route = 'Loja - El Tambo'
    elif row['tipo'] == 'DIRECTO' and row['orig'] == 'Loja' and row['dest'] in ('El Tambo', 'CEIBOPAMBA', 'Ceibopamba'):
        # El Tambo direct continues
        current_section.append(row)
        if not current_route:
            current_route = 'Loja - El Tambo'
    else:
        if current_route:
            current_section.append(row)
        elif row['tipo'] == 'DIRECTO' and row['orig'] == 'Loja' and row['dest'] == 'Dos Puentes':
            current_route = 'Loja - Vilcabamba'
            current_section = [row]

# Don't forget last section
if current_route and current_section:
    if current_route not in routes_data:
        routes_data[current_route] = []
    routes_data[current_route].extend(current_section)

print('=' * 70)
print('RESUMEN POR RUTA (del PDF ida.pdf)')
print('=' * 70)

for ruta, rows in routes_data.items():
    directos = [r for r in rows if r['tipo'] == 'DIRECTO']
    intermedios = [r for r in rows if r['tipo'] == 'INTERMEDIO']
    print(f'\n### {ruta} ###')
    print(f'  Directos: {len(directos)}')
    print(f'  Intermedios: {len(intermedios)}')
    
    # Show unique intermediate destinations to understand structure
    int_dests = set(r['dest'] for r in intermedios)
    int_origins = set(r['orig'] for r in intermedios)
    print(f'  Intermedios orígenes: {sorted(int_origins)}')
    print(f'  Intermedios destinos: {sorted(int_dests)}')

print('\n' + '=' * 70)
print('ERRORES Y OBSERVACIONES')
print('=' * 70)

# Check for name issues
print('\n### POSIBLES ERRORES DE NOMBRES (PDF vs Sistema) ###')
name_issues = []
for ruta, rows in routes_data.items():
    for r in rows:
        d = r['dest']
        o = r['orig']
        if 'BERNAVED' in d.upper() or 'BERNAVED' in o.upper():
            name_issues.append(f'{ruta}: "San Bernaved" → debería ser "San Bernardo"')
        if 'SANANTORUM' in d.upper() or 'SANTORUM' in d.upper() and 'SANTO' not in d.upper():
            name_issues.append(f'{ruta}: "Sanantorum" → debería ser "Santorum"')
        if 'GUINARA' in d.upper():
            name_issues.append(f'{ruta}: "GUINARA" → posible error OCR, ¿es "Quinara"?')
        if d.upper() == 'STO. DOMINGO' or d.upper() == 'STO DOMINGO':
            name_issues.append(f'{ruta}: "Sto. Domingo" → en sistema es "Santo Domingo"')
        if 'SAN JOSE' in d.upper() and 'SANTO' not in d.upper() and 'AGUST' not in d.upper():
            name_issues.append(f'{ruta}: "San Jose" → en sistema es "San José"')
        if 'SAN AGUSTIN' in d.upper() and 'Í' not in d.upper():
            name_issues.append(f'{ruta}: "San Agustin" → en sistema es "San Agustín"')

for issue in sorted(set(name_issues)):
    print(f'  ⚠️  {issue}')

# Check Loja-Vilcabamba specifically
print('\n### LOJA-VILCABAMBA: VERIFICACIÓN ###')
vilc = routes_data.get('Loja - Vilcabamba', [])
vilc_direct = [r for r in vilc if r['tipo'] == 'DIRECTO']
print(f'  Directos extraídos: {len(vilc_direct)}')
expected_vilc_direct = ['Dos Puentes','Cajánuma','Pueblo Nuevo','Tres Leguas','Rumizhitana','Yamba',
    'Granadillo','Porvenir','Nangora','Chorrillos','Landangui','La Peña','Malacatos',
    'Taxiche','Cavianga','Cararango','San Pedro','Vilcabamba']
extracted_dests = [r['dest'] for r in vilc_direct]
missing = [s for s in expected_vilc_direct if s not in extracted_dests]
extra = [s for s in extracted_dests if s not in expected_vilc_direct]
if missing: print(f'  ❌ Faltan: {missing}')
if extra: print(f'  ❌ Sobran: {extra}')
if not missing and not extra: print(f'  ✅ Todos los 18 directos presentes')

# Check intermediate structure for each route
print('\n### ESTRUCTURA DE INTERMEDIOS POR RUTA ###')
for ruta, rows in routes_data.items():
    intermedios = [r for r in rows if r['tipo'] == 'INTERMEDIO']
    if not intermedios: continue
    origins = set(r['orig'] for r in intermedios)
    print(f'\n  {ruta}:')
    for o in sorted(origins):
        dests = [(r['dest'], r['n'], r['m']) for r in intermedios if r['orig'] == o]
        print(f'    Desde {o} ({len(dests)} destinos):')
        for d, n, m in dests:
            print(f'      → {d}: ${n}/${m}')
