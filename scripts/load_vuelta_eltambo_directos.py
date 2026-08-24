# Load El Tambo VUELTA directo prices into preciosVueltaElTambo
import re

FILE = '/home/z/my-project/src/lib/tarifas-data.ts'

with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# User's 26 directos: (stop_name, normal, media)
directos = [
    ('Loja', 4.00, 2.00),
    ('Capul\u00ed', 4.00, 2.00),
    ('Dos Puentes', 3.50, 1.75),
    ('Caj\u00e1numa', 3.50, 1.75),
    ('Pueblo Nuevo', 3.50, 1.75),
    ('Tres Leguas', 3.50, 1.75),
    ('Rumizhitana', 3.50, 1.75),
    ('Yamba', 3.50, 1.75),
    ('Granadillo', 3.25, 1.60),
    ('Porvenir', 3.25, 1.60),
    ('Nangora', 3.00, 1.50),
    ('Chorrillos', 2.75, 1.40),
    ('Landangui', 2.75, 1.40),
    ('La Pe\u00f1a', 2.25, 1.15),
    ('Malacatos', 2.00, 1.00),
    ('Ceibopamba', 2.25, 1.15),
    ('Trinidad', 2.25, 1.15),
    ('San Jos\u00e9', 2.25, 1.15),
    ('Santo Domingo', 2.00, 1.00),
    ('Naranjo Dulce', 1.75, 0.90),
    ('Zhotahuayco', 1.00, 0.90),
    ('La Merced', 1.00, 0.75),
    ('San Agust\u00edn', 1.00, 0.65),
    ('La Era', 1.00, 0.50),
    ('La Capilla', 0.75, 0.40),
    ('San Bernaved', 0.75, 0.40),
]

# Build lookup
price_lookup = {}
for name, n, m in directos:
    price_lookup[name] = (n, m)

# Find the preciosVueltaElTambo section (lines 419-462)
# We need to update existing keys and add 'Loja' if missing

# Strategy: find each key line in the section and replace its price
# Also add 'Loja' after 'Capulí' line if not present

in_section = False
section_end = None
loja_added = False
updated = 0

for i, line in enumerate(lines):
    # Detect start of section
    if 'const preciosVueltaElTambo' in line:
        in_section = True
        continue
    
    # Detect end of section
    if in_section and line.strip() == '};':
        section_end = i
        # If Loja not yet added, add it before the closing brace
        if not loja_added:
            # Find the Capulí line and add Loja after it
            for j in range(i-1, 0, -1):
                if "'Capul\u00ed'" in lines[j] or "'Capulí'" in lines[j]:
                    lines.insert(j+1, "  'Loja': { normal: 4.00, media: 2.00 },\n")
                    updated += 1
                    loja_added = True
                    section_end = i + 1  # shifted by 1
                    print(f"Added 'Loja': 4.00, 2.00 (new line)")
                    break
        in_section = False
        continue
    
    if not in_section:
        continue
    
    # Try to match and update existing key lines
    for name, n, m in directos:
        if name == 'Loja':
            continue  # handled separately
        # Match 'KeyName': { normal: X, media: Y },
        # Need to handle unicode in key names
        escaped = name.encode('unicode_escape').decode('ascii')
        # Try matching with the actual key in the file
        if f"'{name}'" in line and '{' in line and 'normal:' in line:
            new_line = f"  '{name}': {{ normal: {n}, media: {m} }},\n"
            if lines[i].strip() != new_line.strip():
                print(f"Line {i+1}: '{name}' {lines[i].strip()} -> normal: {n}, media: {m}")
                lines[i] = new_line
                updated += 1
            break

with open(FILE, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print(f"\nTotal lines updated/added: {updated}")
