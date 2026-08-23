#!/usr/bin/env python3
"""Rotate PDF page images for better OCR"""
from PIL import Image

for i in [1, 2]:
    img = Image.open(f'/home/z/my-project/upload/listado_page_{i}.png')
    # Rotate 90 degrees clockwise to correct the left-rotation
    rotated = img.rotate(-90, expand=True)
    out = f'/home/z/my-project/upload/listado_page_{i}_rotated.png'
    rotated.save(out)
    print(f'{out}: {rotated.size}')