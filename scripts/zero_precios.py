#!/usr/bin/env python3
"""Pone todos los precios a 0.00 en tarifas-data.ts manteniendo claves y estructura."""

import re

filepath = '/home/z/my-project/src/lib/tarifas-data.ts'

with open(filepath, 'r') as f:
    content = f.read()

# Patrón: { normal: X.XX, media: Y.YY } → { normal: 0.00, media: 0.00 }
# Solo dentro de los objetos de precios (no en interfaces ni tipos)
pattern = r'\{ normal:\s*[\d.]+,\s*media:\s*[\d.]+ \}'
replacement = '{ normal: 0.00, media: 0.00 }'

new_content, count = re.subn(pattern, replacement, content)

with open(filepath, 'w') as f:
    f.write(new_content)

print(f'Precios reseteados: {count} entradas puestas a $0.00')
