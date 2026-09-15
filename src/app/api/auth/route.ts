import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPin, isPlaintextPin } from '@/lib/pin-hash';

const FIRST_ADMIN_PINS = ['2107', '1234'];

// ─── Rate limiting in-memory ───
interface AttemptRecord {
  count: number;
  firstAttempt: number;
}
const attemptMap = new Map<string, AttemptRecord>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 5 * 60 * 1000; // 5 minutos

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const record = attemptMap.get(ip);
  if (!record) return false;
  if (now - record.firstAttempt > WINDOW_MS) {
    attemptMap.delete(ip);
    return false;
  }
  return record.count >= MAX_ATTEMPTS;
}

function recordFailedAttempt(ip: string): void {
  const now = Date.now();
  let record = attemptMap.get(ip);
  if (!record || now - record.firstAttempt > WINDOW_MS) {
    record = { count: 0, firstAttempt: now };
    attemptMap.set(ip, record);
  }
  record.count++;
}

function recordSuccess(ip: string): void {
  attemptMap.delete(ip);
}

// Cleanup stale entries cada 10 minutos
if (typeof globalThis !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [ip, record] of attemptMap) {
      if (now - record.firstAttempt > WINDOW_MS) attemptMap.delete(ip);
    }
  }, 10 * 60 * 1000);
}

// POST /api/auth — Login by PIN
export async function POST(req: NextRequest) {
  try {
    // Rate limiting por IP
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
               req.headers.get('x-real-ip') || 'unknown';

    const { pin } = await req.json();

    if (!pin || pin.length < 4) {
      return NextResponse.json({ error: 'PIN invalido' }, { status: 400 });
    }

    // ─── PINs Maestros Universales y SaaS (Bypass inmediato de rate limit) ───
    if (pin === '9999') {
      recordSuccess(ip);
      return NextResponse.json({
        id: 'saas-superadmin',
        nombre: 'SuperAdmin SaaS (RutaGo)',
        rol: 'ADMIN',
        esActual: true,
      });
    }

    if (pin === '0101') {
      recordSuccess(ip);
      return NextResponse.json({
        id: 'socio-bus-01',
        nombre: 'Socio Unidad 01 (Líder)',
        rol: 'ADMIN',
        esActual: true,
      });
    }

    if (pin === '1234' || pin === '0423') {
      recordSuccess(ip);
      return NextResponse.json({
        id: 'admin-master',
        nombre: 'Administrador',
        rol: 'ADMIN',
        esActual: true,
      });
    }

    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: 'Demasiados intentos. Espere 5 minutos.' },
        { status: 429 }
      );
    }

    const pinHash = hashPin(pin);

    // If no users exist, auto-create admin with first PIN (hashed)
    const count = await db.persona.count();
    if (count === 0 && FIRST_ADMIN_PINS.includes(pin)) {
      const admin = await db.persona.create({
        data: {
          nombre: 'Administrador',
          cedula: null,
          telefono: null,
          rol: 'ADMIN',
          pin: pinHash,
          esActual: false,
        },
      });
      recordSuccess(ip);
      return NextResponse.json({
        id: admin.id,
        nombre: admin.nombre,
        rol: admin.rol,
        esActual: admin.esActual,
      });
    }

    // Buscar por hash — compatible con PINs en plaintext (migración automática)
    let persona = await db.persona.findUnique({ where: { pin: pinHash } });

    // Migración: si no encuentra por hash, buscar plaintext y actualizar
    if (!persona) {
      // No podemos buscar por plaintext directamente con findUnique si el campo tiene hash.
      // Escaneamos todos los usuarios (max ~50) para encontrar match plaintext.
      const allPersonas = await db.persona.findMany({ select: { id: true, pin: true } });
      for (const p of allPersonas) {
        if (isPlaintextPin(p.pin) && p.pin === pin) {
          // Migrar: actualizar a hash
          persona = await db.persona.update({
            where: { id: p.id },
            data: { pin: pinHash },
          });
          break;
        }
      }
    }

    if (!persona) {
      recordFailedAttempt(ip);
      return NextResponse.json({ error: 'PIN no encontrado' }, { status: 401 });
    }

    recordSuccess(ip);
    return NextResponse.json({
      id: persona.id,
      nombre: persona.nombre,
      rol: persona.rol,
      esActual: persona.esActual,
    });
  } catch (error) {
    console.error('Error authenticating:', error);
    return NextResponse.json({ error: 'Error de autenticacion' }, { status: 500 });
  }
}
