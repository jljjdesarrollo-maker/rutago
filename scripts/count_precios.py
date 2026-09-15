import re

with open('/home/z/my-project/src/lib/tarifas-data.ts', 'r') as f:
    content = f.read()

# Find route sections
sections = {
    'Vilcabamba Ida': [],
    'Vilcabamba Vuelta': [],
    'El Tambo Ida': [],
    'El Tambo Vuelta': [],
    'La Elvira Ida': [],
    'La Elvira Vuelta': [],
    'Yangana Ida': [],
    'Yangana Vuelta': [],
    'Zahuayco Ida': [],
    'Zahuayco Vuelta': [],
}

# Split by route sections
lines = content.split('\n')
current_section = None
for line in lines:
    if 'Vilcabamba' in line and 'IDA' in line and 'El Tambo' not in line and 'La Elvira' not in line and 'preciosIda' in line.lower():
        current_section = 'Vilcabamba Ida'
    elif 'preciosVueltaVilcabamba' in line:
        current_section = 'Vilcabamba Vuelta'
    elif 'El Tambo' in line and 'IDA' in line and 'preciosVuelta' not in line:
        current_section = 'El Tambo Ida'
    elif 'preciosVueltaElTambo' in line:
        current_section = 'El Tambo Vuelta'
    elif 'La Elvira' in line and 'IDA' in line and 'VUELTA' not in line and 'preciosVuelta' not in line:
        current_section = 'La Elvira Ida'
    elif 'preciosVueltaLaElvira' in line:
        current_section = 'La Elvira Vuelta'
    elif 'Yangana' in line and 'IDA' in line and 'VUELTA' not in line and 'preciosVuelta' not in line:
        current_section = 'Yangana Ida'
    elif 'preciosVueltaYangana' in line:
        current_section = 'Yangana Vuelta'
    elif 'Zahuayco' in line and 'IDA' in line and 'VUELTA' not in line and 'preciosVuelta' not in line:
        current_section = 'Zahuayco Ida'
    elif 'preciosVueltaZahuayco' in line:
        current_section = 'Zahuayco Vuelta'
    elif current_section and '};' in line and line.strip() == '};':
        current_section = None
    elif current_section:
        m = re.search(r"'([^']+)':\s*\{\s*normal:\s*([\d.]+),\s*media:\s*([\d.]+)\s*\}", line)
        if m:
            sections[current_section].append({
                'parada': m.group(1),
                'normal': float(m.group(2)),
                'media': float(m.group(3))
            })

for nombre, paradas in sections.items():
    if not paradas:
        print(f'{nombre}: SIN DATOS')
        continue
    normals = sorted(set(p['normal'] for p in paradas))
    medias = sorted(set(p['media'] for p in paradas))
    todos = sorted(set(normals + medias))
    print(f'{nombre} ({len(paradas)} paradas):')
    print(f'  Normales ({len(normals)}): {normals}')
    print(f'  Medias  ({len(medias)}): {medias}')
    print(f'  Únicos total: {len(todos)}')
    print()
