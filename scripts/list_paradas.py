import re

with open('/home/z/my-project/src/lib/tarifas-data.ts', 'r') as f:
    content = f.read()

names = set()
for m in re.finditer(r"'([^']+)':\s*{\s*normal:", content):
    names.add(m.group(1))

for n in sorted(names):
    print(n)
print(f'\nTotal: {len(names)} paradas')
