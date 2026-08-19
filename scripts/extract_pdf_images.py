#!/usr/bin/env python3
"""Extract images from PDF and save as PNG for analysis"""
import fitz
doc = fitz.open('/home/z/my-project/upload/listado.pdf')
for i, page in enumerate(doc):
    pix = page.get_pixmap(dpi=300)
    out_path = f'/home/z/my-project/upload/listado_page_{i+1}.png'
    pix.save(out_path)
    print(f'Saved: {out_path} ({pix.width}x{pix.height})')
print(f'Total pages: {len(doc)}')
