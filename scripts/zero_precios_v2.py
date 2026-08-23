#!/usr/bin/env python3
"""Encerar TODOS los precios en tarifas-data.ts (preservando estructura)"""

import re

FILE_PATH = '/home/z/my-project/src/lib/tarifas-data.ts'

with open(FILE_PATH, 'r', encoding='utf-8') as f:
    content = f.read()

# Patrón: { normal: X.XX, media: Y.YY }
# Reemplazar con { normal: 0, media: 0 }
old_pattern = r'\{\s*normal:\s*[\d.]+,\s*media:\s*[\d.]+\s*\}'
new_value = '{ normal: 0, media: 0 }'

new_content = re.sub(old_pattern, new_value, content)

# Contar cuántos reemplazos se hicieron
count_old = len(re.findall(old_pattern, content))
count_new = len(re.findall(old_pattern, new_content))

if count_old == 0:
    print("ERROR: No se encontraron precios para encerar.")
else:
    with open(FILE_PATH, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print(f"OK: Se enceraron {count_old - count_new} precios. Quedan {count_new} precios sin encerar." )
    print(f"Total de entradas procesadas: {count_old}")
