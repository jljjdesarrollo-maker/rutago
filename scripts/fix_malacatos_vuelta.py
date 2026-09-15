# Fix Malacatos price in preciosVueltaElTambo
FILE = '/home/z/my-project/src/lib/tarifas-data.ts'

with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

in_section = False
for i, line in enumerate(lines):
    if 'const preciosVueltaElTambo' in line:
        in_section = True
        continue
    if in_section and line.strip() == '};':
        break
    if in_section and "'Malacatos'" in line and 'normal:' in line:
        lines[i] = "  'Malacatos': { normal: 2.25, media: 1.15 },\n"
        print(f'Line {i+1}: Malacatos updated to 2.25/1.15')
        break

with open(FILE, 'w', encoding='utf-8') as f:
    f.writelines(lines)
print('Done')
