#!/usr/bin/env python3
"""Cargar precios IDA Loja-El Tambo en tarifas-data.ts"""

FILE = '/home/z/my-project/src/lib/tarifas-data.ts'

with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# ═══ 1. ACTUALIZAR 12 DIRECTOS (líneas 192-203) ═══
directos = {
    192: (2.25, 1.15),   # Ceibopamba
    193: (2.25, 1.15),   # Trinidad
    194: (2.25, 1.15),   # San José
    195: (2.50, 1.25),   # Santo Domingo
    196: (2.75, 1.40),   # Naranjo Dulce
    197: (3.00, 1.50),   # Zhotahuayco
    198: (3.25, 1.65),   # La Merced
    199: (3.75, 1.90),   # San Agustín
    200: (3.75, 1.90),   # La Era
    201: (4.00, 2.00),   # La Capilla
    202: (4.00, 2.00),   # San Bernaved
    203: (4.00, 2.00),   # El Tambo
}

print('=== 12 DIRECTOS ===')
for line_num, (normal, media) in directos.items():
    idx = line_num - 1
    old = lines[idx]
    # Keep the key name, update prices
    key = old.strip().split("':")[0].replace("  ", "")
    new = f"  {key}: {{ normal: {normal}, media: {media} }},\n"
    lines[idx] = new
    print(f'  L{line_num}: {key.strip("'")} -> ${normal}/${media}')

# ═══ 2. ACTUALIZAR 12 INTERMEDIOS Mal→X (líneas 205-216) ═══
mal_intermedios = {
    205: (0.75, 0.40),   # Mal→Ceibop
    206: (0.75, 0.40),   # Mal→Trinidad
    207: (0.75, 0.40),   # Mal→S.Jose
    208: (1.00, 0.50),   # Mal→StoDom
    209: (1.25, 0.65),   # Mal→N.Dulce
    210: (1.50, 0.75),   # Mal→Zhotahu
    211: (1.75, 0.90),   # Mal→LaMerc
    212: (1.75, 0.90),   # Mal→S.Agust
    213: (2.00, 1.00),   # Mal→LaEra
    214: (2.25, 1.15),   # Mal→LaCap
    215: (2.25, 1.15),   # Mal→S.Bern
    216: (2.25, 1.15),   # Mal→ElTambo
}

print('\n=== 12 INTERMEDIOS Mal→X ===')
for line_num, (normal, media) in mal_intermedios.items():
    idx = line_num - 1
    old = lines[idx]
    key = old.strip().split(":")[0].replace("  ", "")
    new = f"  {key}: {{ normal: {normal}, media: {media} }},\n"
    lines[idx] = new
    print(f'  L{line_num}: {key.strip("'")} -> ${normal}/${media}')

# ═══ 3. INSERTAR 11 INTERMEDIOS X→ElTambo después de línea 216 ═══
x_eltambo = [
    ('Caja\u2192ElTambo', 3.50, 1.75),
    ('P.Nuevo\u2192ElTambo', 3.50, 1.75),
    ('T.Leguas\u2192ElTambo', 3.50, 1.75),
    ('Rumi\u2192ElTambo', 3.50, 1.75),
    ('Yamba\u2192ElTambo', 3.50, 1.75),
    ('Gran\u2192ElTambo', 3.25, 1.65),
    ('Porv\u2192ElTambo', 3.25, 1.65),
    ('Nango\u2192ElTambo', 3.00, 1.50),
    ('Chorri\u2192ElTambo', 2.75, 1.40),
    ('Land\u2192ElTambo', 2.75, 1.40),
    ('Pe\u00f1a\u2192ElTambo', 2.50, 1.25),
]

insert_lines = ['  // Intermedios El Tambo IDA (desde parada troncal hacia El Tambo)\n']
for clave, normal, media in x_eltambo:
    insert_lines.append(f"  '{clave}': {{ normal: {normal}, media: {media} }},\n")

print('\n=== 11 INTERMEDIOS X\u2192ElTambo (NUEVOS) ===')
for clave, normal, media in x_eltambo:
    print(f'  {clave} = ${normal}/${media}')

# Insertar después de línea 216 (0-indexed: posición 216)
lines = lines[:216] + insert_lines + lines[216:]

# ═══ ESCRIBIR ARCHIVO ═══
with open(FILE, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print(f'\n\u2705 Archivo actualizado: {FILE}')
print(f'   Total líneas: {len(lines)}')
