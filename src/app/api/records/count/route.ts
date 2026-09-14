import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const count = await db.dailyRecord.count();
    return NextResponse.json({ count });
  } catch (error) {
    console.error('Error counting records:', error);
    return NextResponse.json({ count: 0 }, { status: 500 });
  }
}
