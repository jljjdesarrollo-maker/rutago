# Load 15 Loja-Zahuayco IDA prices (5 directos + 5 Mal->X + 5 Vilc->X)
import re

FILE = '/home/z/my-project/src/lib/tarifas-data.ts'

with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# (key_in_file, normal, media)
prices = [
    # Directos
    ('Masanamaca', 3.00, 1.50),
    ('Quinara', 3.25, 1.65),
    ('Chumberos', 3.75, 1.90),
    ('Palmira', 3.75, 1.90),
    ('Zahuayco', 4.00, 2.00),
    # Intermedios Mal->X
    ('Mal\u2192Masan', 2.00, 1.00),
    ('Mal\u2192Quina', 2.00, 1.00),
    ('Mal\u2192Chumb', 2.50, 1.25),
    ('Mal\u2192Palm', 2.90, 1.45),
    ('Mal\u2192Zahua', 3.15, 1.60),
    # Intermedios Vilc->X
    ('Vilc\u2192Masan', 1.10, 0.55),
    ('Vilc\u2192Quina', 2.00, 1.00),
    ('Vilc\u2192Chumb', 2.00, 1.00),
    ('Vilc\u2192Palm', 2.25, 1.15),
    ('Vilc\u2192Zahua', 2.50, 1.25),
]

# Decode \u2192 to actual → character
prices_decoded = []
for key, n, m in prices:
    decoded = key.encode().decode('unicode_escape') if '\\u' in repr(key) or '\\u' in key else key
    prices_decoded.append((decoded, n, m))

updated = 0
for i, line in enumerate(lines):
    for key, n, m in prices_decoded:
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
