import re

with open('/home/z/my-project/src/lib/tarifas-data.ts', 'r') as f:
    content = f.read()

lines = content.split('\n')
in_yangana_ida = False
in_yangana_vuelta = False
ida_paradas = []
vuelta_paradas = []

for i, line in enumerate(lines):
    if 'Yangana' in line and 'IDA' in line and 'VUELTA' not in line and 'preciosVuelta' not in line:
        in_yangana_ida = True
        in_yangana_vuelta = False
    elif 'preciosVueltaYangana' in line:
        in_yangana_vuelta = True
        in_yangana_ida = False
    elif in_yangana_ida or in_yangana_vuelta:
        if line.strip() == '};':
            in_yangana_ida = False
            in_yangana_vuelta = False
        else:
            m = re.search(r"'([^']+)':\s*{\s*normal:\s*([\d.]+),\s*media:\s*([\d.]+)\s*}", line)
            if m:
                entry = {'nombre': m.group(1), 'normal': float(m.group(2)), 'media': float(m.group(3))}
                if in_yangana_ida:
                    ida_paradas.append(entry)
                else:
                    vuelta_paradas.append(entry)

print('=== YANGANA IDA ===')
for p in ida_paradas:
    es_tramo = '→' in p['nombre']
    print(f"  {'[TRAMO] ' if es_tramo else '[PARADA]'} {p['nombre']:25s}  Normal: ${p['normal']:.2f}  Media: ${p['media']:.2f}")
print(f'Total: {len(ida_paradas)} ({len([p for p in ida_paradas if "→" not in p["nombre"]])} paradas, {len([p for p in ida_paradas if "→" in p["nombre"]])} tramos)')

print()
print('=== YANGANA VUELTA ===')
for p in vuelta_paradas:
    es_tramo = '→' in p['nombre']
    print(f"  {'[TRAMO] ' if es_tramo else '[PARADA]'} {p['nombre']:25s}  Normal: ${p['normal']:.2f}  Media: ${p['media']:.2f}")
print(f'Total: {len(vuelta_paradas)} ({len([p for p in vuelta_paradas if "→" not in p["nombre"]])} paradas, {len([p for p in vuelta_paradas if "→" in p["nombre"]])} tramos)')
