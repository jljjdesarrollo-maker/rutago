#!/usr/bin/env python3
"""Remove old duplicate intermediate sections from preciosVuelta"""

FILE = '/home/z/my-project/src/lib/tarifas-data.ts'

with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Lines to remove (1-indexed): 402-452 = old duplicate troncal intermediates
# These are the OLD placeholder sections that duplicate the new ones at lines 324-356
# Line 402: // Intermedios troncal vuelta (desde hub hacia Loja)
# ... through ...
# Line 452: 'S.Pedro→Loja': { normal: 0, media: 0 },
# Keep line 453: };

remove_start = 401  # 0-indexed (line 402)
remove_end = 452    # 0-indexed (line 452, inclusive)

print(f'Removing lines {remove_start+1}-{remove_end+1} ({remove_end-remove_start+1} lines)')
removed = lines[remove_start:remove_end+1]
for l in removed[:3]:
    print(f'  {l.rstrip()}')
print(f'  ...')
for l in removed[-3:]:
    print(f'  {l.rstrip()}')

lines = lines[:remove_start] + lines[remove_end+1:]

with open(FILE, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print(f'\nDone. File now has {len(lines)} lines')
