#!/usr/bin/env python3
"""Cargar precios VUELTA Loja-Vilcabamba en tarifas-data.ts"""

import re

FILE = '/home/z/my-project/src/lib/tarifas-data.ts'

with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# ═══ 1. ACTUALIZAR 19 DIRECTOS en preciosVuelta (líneas 275-292) ═══
# Son las paradas principales con precio $0.00 que ahora tienen precio real
directos = {
    # (línea_1indexada, clave_en_archivo, normal, media)
    # Los comentarios ✅ ya están puestos
    275: ('Dos Puentes', 2.00, 1.00),
    276: ('Caj\u00e1numa', 2.00, 1.00),
    277: ('Pueblo Nuevo', 1.50, 0.75),
    278: ('Tres Leguas', 1.50, 0.75),
    279: ('Rumizhitana', 1.50, 0.75),
    280: ('Yamba', 1.50, 0.75),
    281: ('Granadillo', 1.50, 0.75),
    282: ('Porvenir', 1.25, 0.65),
    283: ('Nangora', 1.25, 0.65),
    284: ('Chorrillos', 1.25, 0.65),
    285: ('Landangui', 1.10, 0.55),
    286: ('La Pe\u00f1a', 1.10, 0.55),
    287: ('Malacatos', 1.10, 0.55),
    288: ('Taxiche', 0.75, 0.40),
    289: ('Cavianga', 0.75, 0.40),
    290: ('Cararango', 0.75, 0.40),
    291: ('San Pedro', 0.75, 0.40),
    292: ('Vilcabamba', 2.50, 1.25),
}

print("=== ACTUALIZANDO 19 DIRECTOS ===")
for line_num, (nombre, normal, media) in directos.items():
    idx = line_num - 1  # 0-indexed
    old = lines[idx]
    # Formato: "  'Nombre': { normal: X, media: Y },       // ✅"
    new = f"  '{nombre}': {{ normal: {normal}, media: {media} }},       // \u2705\n"
    if old.strip() != new.strip():
        lines[idx] = new
        print(f"  L{line_num}: {nombre} -> ${normal}/${media}")
    else:
        print(f"  L{line_num}: {nombre} ya OK")

# ═══ 2. RENOMBRAR 13 INTERMEDIOS →Mal a Mal→X y actualizar precios ═══
# Líneas 324-337: vuelta 'Peña→Mal' → 'Mal→Peña' con precio de Malacatos→X
mal_intermedios_vuelta = {
    # (línea_1indexada, nueva_clave, normal, media)
    325: ('Mal\u2192Pe\u00f1a', 0.75, 0.40),   # Malacatos→La Peña
    326: ('Mal\u2192Land', 0.75, 0.40),          # Malacatos→Landangui
    327: ('Mal\u2192Chorri', 0.75, 0.40),       # Malacatos→Chorrillos
    328: ('Mal\u2192Nango', 0.75, 0.40),         # Malacatos→Nangora
    329: ('Mal\u2192Porv', 1.10, 0.55),          # Malacatos→Porvenir
    330: ('Mal\u2192Gran', 1.10, 0.55),          # Malacatos→Granadillo
    331: ('Mal\u2192Yamba', 1.10, 0.55),         # Malacatos→Yamba
    332: ('Mal\u2192Rumi', 1.10, 0.55),          # Malacatos→Rumizhitana
    333: ('Mal\u2192T.Leguas', 1.10, 0.55),      # Malacatos→Tres Leguas
    334: ('Mal\u2192P.Nuevo', 1.10, 0.55),       # Malacatos→Pueblo Nuevo
    335: ('Mal\u2192Caja', 1.50, 0.75),          # Malacatos→Cajanuma
    336: ('Mal\u2192D.Puen', 1.50, 0.75),        # Malacatos→Dos Puentes
    337: ('Mal\u2192Capul\u00ed', 2.00, 1.00),  # Malacatos→Capulí
}

print("\n=== RENOMBRANDO 13 INTERMEDIOS Mal→X ===")
for line_num, (nueva_clave, normal, media) in mal_intermedios_vuelta.items():
    idx = line_num - 1
    new = f"  '{nueva_clave}': {{ normal: {normal}, media: {media} }},\n"
    lines[idx] = new
    print(f"  L{line_num}: -> {nueva_clave} = ${normal}/${media}")

# Actualizar comentario de sección (línea 324)
idx324 = 323
lines[idx324] = "  // Intermedios vuelta: desde Malacatos hacia Loja (Mal\u2192X)\n"

# ═══ 3. INSERTAR 18 INTERMEDIOS X→Loja después de línea 337 ═══
x_loja_intermedios = [
    ('S.Pedro\u2192Loja', 2.25, 1.15),
    ('Carar\u2192Loja', 2.25, 1.15),
    ('Cavian\u2192Loja', 2.25, 1.15),
    ('Taxich\u2192Loja', 2.00, 1.00),
    ('Mal\u2192Loja', 2.00, 1.00),
    ('Pe\u00f1a\u2192Loja', 1.75, 0.90),
    ('Land\u2192Loja', 1.75, 0.90),
    ('Chorri\u2192Loja', 1.50, 0.75),
    ('Nango\u2192Loja', 1.50, 0.75),
    ('Porv\u2192Loja', 1.40, 0.70),
    ('Gran\u2192Loja', 1.40, 0.70),
    ('Yamba\u2192Loja', 1.25, 0.65),
    ('Rumi\u2192Loja', 1.25, 0.65),
    ('T.Leguas\u2192Loja', 1.25, 0.65),
    ('P.Nuevo\u2192Loja', 1.25, 0.65),
    ('Caja\u2192Loja', 1.25, 0.65),
    ('D.Puen\u2192Loja', 0.75, 0.40),
    ('Capul\u00ed\u2192Loja', 0.75, 0.40),
]

insert_lines = ["  // Intermedios vuelta: desde parada hacia Loja (X\u2192Loja)\n"]
for clave, normal, media in x_loja_intermedios:
    insert_lines.append(f"  '{clave}': {{ normal: {normal}, media: {media} }},\n")

print("\n=== INSERTANDO 18 INTERMEDIOS X\u2192Loja ===")
for clave, normal, media in x_loja_intermedios:
    print(f"  {clave} = ${normal}/${media}")

# Insertar después de la línea 337 (índice 336, que ahora es Mal→Capulí)
insert_pos = 337  # después de la línea 337 (0-indexed: insertar en posición 337)
lines = lines[:insert_pos] + insert_lines + lines[insert_pos:]

# ═══ ESCRIBIR ARCHIVO ═══
with open(FILE, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print(f"\n\u2705 Archivo actualizado: {FILE}")
print(f"   Total líneas: {len(lines)}")
