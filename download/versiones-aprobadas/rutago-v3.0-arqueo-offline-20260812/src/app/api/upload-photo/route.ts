import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';

// POST /api/upload-photo — Upload photo via FormData (mobile-friendly)
// Compresses server-side with Sharp and returns base64 data URL
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('photo') as File | null;

    if (!file || !file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'No se recibio imagen' }, { status: 400 });
    }

    // Max 15MB raw
    if (file.size > 15 * 1024 * 1024) {
      return NextResponse.json({ error: 'Imagen muy grande (max 15MB)' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);

    // Compress: resize to max 600px, JPEG quality 50
    const compressedBuffer = await sharp(inputBuffer)
      .resize(600, 600, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 50 })
      .toBuffer();

    const base64 = compressedBuffer.toString('base64');
    const photoUrl = `data:image/jpeg;base64,${base64}`;

    return NextResponse.json({ photoUrl });
  } catch (error) {
    console.error('Error uploading photo:', error);
    return NextResponse.json({ error: 'Error al subir foto' }, { status: 500 });
  }
}
