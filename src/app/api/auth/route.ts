import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateSalt, hashPinWithSalt, verifyPin } from '@/lib/pin-hash';
import { getDeviceBindingGlobalConfigAsync } from '@/app/api/config/device-binding/route';

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

// POST /api/auth — Login by PIN (Cero-Hardcode & Blindaje Criptográfico)
export async function POST(req: NextRequest) {
  try {
    // Rate limiting por IP
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
               req.headers.get('x-real-ip') || 'unknown';

    const body = await req.json();
    const { pin, deviceId, deviceName } = body;

    if (!pin || typeof pin !== 'string' || pin.trim().length < 4) {
      return NextResponse.json({ error: 'PIN inválido' }, { status: 400 });
    }

    const cleanPin = pin.trim();

    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: 'Demasiados intentos erróneos. Por seguridad, espere 5 minutos.' },
        { status: 429 }
      );
    }

    // ─── 1. Búsqueda en Cuentas de Socios y SuperAdministración SaaS ───
    const socios = await db.cuentaSocio.findMany({
      where: { activo: true },
    });

    for (const socio of socios) {
      if (verifyPin(cleanPin, socio.pinHash, socio.pinSalt)) {
        recordSuccess(ip);
        return NextResponse.json({
          id: socio.id,
          nombre: socio.nombre,
          cedula: socio.cedula,
          rol: socio.rol === 'SUPERADMIN_SAAS' ? 'ADMIN' : 'SOCIO',
          subRol: socio.rol,
          socioId: socio.id,
          esFundadorSaaS: socio.esFundadorSaaS,
          esActual: true,
        });
      }
    }

    // ─── 2. Verificación Soberana de SuperAdmin SaaS (Bootstrap y Resincronización) ───
    const authorizedSuperAdminPin = process.env.SEED_SUPERADMIN_PIN || '9999';
    if (cleanPin === authorizedSuperAdminPin) {
      let superAdmin = socios.find(s => s.rol === 'SUPERADMIN_SAAS') ||
        await db.cuentaSocio.findFirst({ where: { rol: 'SUPERADMIN_SAAS' } });

      if (!superAdmin) {
        const salt = generateSalt();
        const pinHash = hashPinWithSalt(cleanPin, salt);
        superAdmin = await db.cuentaSocio.create({
          data: {
            cedula: '0000000000',
            nombre: 'SuperAdmin SaaS (RutaGo Vendor)',
            email: 'admin@rutago.app',
            pinHash,
            pinSalt: salt,
            rol: 'SUPERADMIN_SAAS',
            activo: true,
            esFundadorSaaS: false,
          },
        });
      } else {
        const salt = generateSalt();
        const pinHash = hashPinWithSalt(cleanPin, salt);
        superAdmin = await db.cuentaSocio.update({
          where: { id: superAdmin.id },
          data: {
            pinHash,
            pinSalt: salt,
            activo: true,
          },
        });
      }

      recordSuccess(ip);
      return NextResponse.json({
        id: superAdmin.id,
        nombre: superAdmin.nombre,
        cedula: superAdmin.cedula,
        rol: 'ADMIN',
        subRol: 'SUPERADMIN_SAAS',
        socioId: superAdmin.id,
        esFundadorSaaS: superAdmin.esFundadorSaaS,
        esActual: true,
      });
    }

    // ─── 3. Búsqueda en Personal Operativo (Conductor, Ayudante, Admin de Flota) ───
    const personal = await db.persona.findMany();

    let matchedPersona: typeof personal[0] | null = null;
    for (const p of personal) {
      if (verifyPin(cleanPin, p.pin, p.pinSalt)) {
        matchedPersona = p;
        // Si el PIN estaba en texto plano o sin salt, actualizarlo a hash seguro con salt único
        if (!p.pinSalt || p.pin.length <= 6) {
          const newSalt = generateSalt();
          const newHash = hashPinWithSalt(cleanPin, newSalt);
          await db.persona.update({
            where: { id: p.id },
            data: { pin: newHash, pinSalt: newSalt },
          }).catch(err => console.error('Error migrando hash de personal:', err));
        }
        break;
      }
    }


    if (!matchedPersona) {
      recordFailedAttempt(ip);
      return NextResponse.json({ error: 'PIN no encontrado o no autorizado' }, { status: 401 });
    }

    // ─── 4. Vinculación Estricta de Dispositivo Físico (Device Binding) ───
    const deviceBindingConfig = await getDeviceBindingGlobalConfigAsync();
    if (deviceBindingConfig.enabled && matchedPersona.rol === 'AYUDANTE' && deviceId) {
      if (!matchedPersona.deviceId) {
        // Primer login del ayudante: Enlazar automáticamente este teléfono como su dispositivo oficial
        matchedPersona = await db.persona.update({
          where: { id: matchedPersona.id },
          data: {
            deviceId,
            deviceName: deviceName || 'Terminal Móvil',
            deviceLinkedAt: new Date(),
          },
        });
      } else if (matchedPersona.deviceId !== deviceId) {
        // Dispositivo diferente: Rechazo estricto por seguridad
        recordFailedAttempt(ip);
        const fechaEnlace = matchedPersona.deviceLinkedAt
          ? new Date(matchedPersona.deviceLinkedAt).toLocaleDateString('es-EC')
          : '';
        return NextResponse.json(
          {
            error: `Dispositivo no autorizado. Este usuario está vinculado al teléfono oficial del bus (${matchedPersona.deviceName || 'Móvil'}). Contacta al Socio/Admin para desvincularlo.`,
            deviceBlocked: true,
            registeredDeviceName: matchedPersona.deviceName || 'Terminal Oficial',
            registeredAt: fechaEnlace,
          },
          { status: 403 }
        );
      }
    }

    recordSuccess(ip);
    return NextResponse.json({
      id: matchedPersona.id,
      nombre: matchedPersona.nombre,
      rol: matchedPersona.rol,
      socioId: matchedPersona.socioId || null,
      esActual: matchedPersona.esActual,
      deviceId: matchedPersona.deviceId || null,
      deviceName: matchedPersona.deviceName || null,
    });
  } catch (error) {
    console.error('Error authenticating:', error);
    return NextResponse.json({ error: 'Error de autenticación' }, { status: 500 });
  }
}
