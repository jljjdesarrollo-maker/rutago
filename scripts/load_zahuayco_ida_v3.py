# Load 10 Zahuayco IDA intermediates (fix: use literal → character)

FILE = '/home/z/my-project/src/lib/tarifas-data.ts'

with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

prices = [
    ('Vilc→Masan', 1.10, 0.55),
    ('Vilc→Quina', 2.00, 1.00),
    ('Vilc→Chumb', 2.00, 1.00),
    ('Vilc→Palm', 2.25, 1.15),
    ('Vilc→Zahua', 2.50, 1.25),
    ('Mal→Masan', 2.00, 1.00),
    ('Mal→Quina', 2.00, 1.00),
    ('Mal→Chumb', 2.50, 1.25),
    ('Mal→Palm', 2.90, 1.45),
    ('Mal→Zahua', 3.15, 1.60),
]

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
    for key, n, m in prices:
        if ("'" + key + "'") in line and 'normal:' in line:
            new_line = f"  '{key}': {{ normal: {n}, media: {m} }},\n"
            if lines[i].strip() != new_line.strip():
                lines[i] = new_line
                updated += 1
                print(f'Line {i+1}: {key} -> {n}/{m}')
            break

with open(FILE, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print(f'\nTotal: {updated}/10')
