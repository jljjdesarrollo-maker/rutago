# Load 15 Loja-Zahuayco IDA prices ONLY within preciosIda section
import re

FILE = '/home/z/my-project/src/lib/tarifas-data.ts'

with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# (key_in_file, normal, media)
prices = [
    ('Masanamaca', 3.00, 1.50),
    ('Quinara', 3.25, 1.65),
    ('Chumberos', 3.75, 1.90),
    ('Palmira', 3.75, 1.90),
    ('Zahuayco', 4.00, 2.00),
    ('Vilc\u2192Masan', 1.10, 0.55),
    ('Vilc\u2192Quina', 2.00, 1.00),
    ('Vilc\u2192Chumb', 2.00, 1.00),
    ('Vilc\u2192Palm', 2.25, 1.15),
    ('Vilc\u2192Zahua', 2.50, 1.25),
    ('Mal\u2192Masan', 2.00, 1.00),
    ('Mal\u2192Quina', 2.00, 1.00),
    ('Mal\u2192Chumb', 2.50, 1.25),
    ('Mal\u2192Palm', 2.90, 1.45),
    ('Mal\u2192Zahua', 3.15, 1.60),
]

# Decode \u escapes
prices_d = []
for key, n, m in prices:
    try:
        dk = key.encode('utf-8').decode('unicode_escape')
    except:
        dk = key
    prices_d.append((dk, n, m))

# Only update within preciosIda section
in_ida = False
updated = 0

for i, line in enumerate(lines):
    if 'const preciosIda' in line:
        in_ida = True
        continue
    if in_ida and line.strip() == '};':
        break
    if not in_ida:
        continue
    for key, n, m in prices_d:
        if ("'" + key + "'") in line and 'normal:' in line:
            new_line = f"  '{key}': {{ normal: {n}, media: {m} }},\n"
            if lines[i].strip() != new_line.strip():
                lines[i] = new_line
                updated += 1
                print(f'Line {i+1}: {key} -> {n}/{m}')
            break

with open(FILE, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print(f'\nTotal actualizados: {updated}/15')
