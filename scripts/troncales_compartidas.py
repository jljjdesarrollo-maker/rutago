import re

with open('/home/z/my-project/src/lib/tarifas-data.ts', 'r') as f:
    content = f.read()

troncales_mal = ['Peña→Mal', 'Land→Mal', 'Chorri→Mal', 'Nango→Mal', 'Porv→Mal', 'Gran→Mal', 'Yamba→Mal', 'Rumi→Mal', 'T.Leguas→Mal', 'P.Nuevo→Mal', 'Caja→Mal', 'D.Puen→Mal', 'Capulí→Mal']
troncales_vilc = ['S.Pedro→Vilc', 'Carar→Vilc', 'Cavian→Vilc', 'Taxich→Vilc', 'Mal→Vilc', 'Land→Vilc', 'Peña→Vilc', 'Chorri→Vilc', 'Nango→Vilc', 'Porv→Vilc', 'Gran→Vilc', 'Yamba→Vilc', 'Rumi→Vilc', 'T.Leguas→Vilc', 'P.Nuevo→Vilc', 'Caja→Vilc', 'D.Puen→Vilc', 'Capulí→Vilc']

rutas = ['Loja - Vilcabamba', 'Loja - Zahuayco', 'Loja - La Elvira', 'Loja - Yangana']

for ruta in rutas:
    ruta_start = content.find(f"'{ruta}'")
    if ruta_start == -1:
        print(f'{ruta}: NO ENCONTRADA')
        continue
    ida_start = content.find('ida: [', ruta_start)
    ida_end = content.find('],', ida_start) + 1
    ida_section = content[ida_start:ida_end]

    has_mal = [t for t in troncales_mal if t in ida_section]
    has_vilc = [t for t in troncales_vilc if t in ida_section]
    missing_mal = [t for t in troncales_mal if t not in ida_section]
    missing_vilc = [t for t in troncales_vilc if t not in ida_section]
    
    print(f'{ruta}:')
    print(f'  Hasta Malacatos: {len(has_mal)}/13 {"✅" if len(has_mal)==13 else "❌ faltan: " + ", ".join(missing_mal)}')
    print(f'  Hasta Vilcabamba: {len(has_vilc)}/18 {"✅" if len(has_vilc)==18 else "❌ faltan: " + ", ".join(missing_vilc)}')
    print()
