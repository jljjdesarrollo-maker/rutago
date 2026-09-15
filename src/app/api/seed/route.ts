import { NextResponse } from 'next/server';
import { seedIfEmpty } from '@/lib/seed';

// POST /api/seed — Seed initial admin user (run once)
export async function POST() {
  try {
    await seedIfEmpty();
    return NextResponse.json({ success: true, message: 'Seed ejecutado' });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json({ error: 'Error en seed' }, { status: 500 });
  }
}

// GET /api/seed — Check if any users exist
export async function GET() {
  try {
    const { db } = await import('@/lib/db');
    const count = await db.persona.count();
    return NextResponse.json({ count, needsSeed: count === 0 });
  } catch {
    return NextResponse.json({ count: -1, needsSeed: true });
  }
}
