import re

with open('/home/z/my-project/src/lib/tarifas-data.ts', 'r') as f:
    lines = f.readlines()

for i, line in enumerate(lines, 1):
    if 'Peña' in line or 'Pena' in line:
        print(f'L{i}: {line.rstrip()}')