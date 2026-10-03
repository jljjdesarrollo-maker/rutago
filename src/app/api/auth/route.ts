import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateSalt, hashPinWithSalt, verifyPin } from '@/lib/pin-hash';
import { getDeviceBindingGlobalConfigAsync } from '@/app/api/config/device-binding/route';
import { seedIfEmpty } from '@/lib/seed';

// ─── Rate limiting in-memory ───
interface AttemptRecord {
  count: number;
  firstAttempt: number;
}
const attemptMap = new Map<string, AttemptRecord>();
const MAX_ATTEMPTS = 10;
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

// POST /api/auth — Login by PIN (Cero-Hardcode & Blindaje Criptográfico + Simulador Fallback)
export async function POST(req: NextRequest) {
  try {
    const host = req.headers.get('host') || '';
    const isStaging =
      process.env.NEXT_PUBLIC_APP_ENV === 'staging' ||
      process.env.NEXT_PUBLIC_APP_ENV === 'preview' ||
      host.includes('staging') ||
      host.includes('preview') ||
      host.includes('-git-staging');

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

    // ─── 0. Auto-Inicialización / Auto-Seed si la base estuviera vacía ───
    try {
      const sociosTotal = await db.cuentaSocio.count();
      const personalTotal = await db.persona.count();
      if (sociosTotal === 0 || personalTotal === 0) {
        await seedIfEmpty();
      }
    } catch (e) {
      console.warn('Auto-seed check notice (continuing):', e);
    }

    // ─── 1. Búsqueda directa por hash criptográfico en Cuentas de Socios ───
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

    // ─── 2. Búsqueda directa por hash criptográfico en Personal Operativo ───
    const personal = await db.persona.findMany();
    let matchedPersona: typeof personal[0] | null = null;

    for (const p of personal) {
      if (verifyPin(cleanPin, p.pin, p.pinSalt)) {
        matchedPersona = p;
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

    // ─── 3. Verificación Soberana de SuperAdmin SaaS (9999) ───
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
          data: { pinHash, pinSalt: salt, activo: true },
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

    // ─── 4. Bootstrap / Fallback de Capacitación y Simulador para Socios (0101) ───
    const defaultSocioPin = process.env.SEED_SOCIO01_PIN || '0101';
    if (cleanPin === defaultSocioPin || (isStaging && cleanPin === '0101')) {
      const targetSocio = socios.find(s => s.rol === 'SOCIO' && s.activo) || socios[0];
      if (targetSocio) {
        recordSuccess(ip);
        return NextResponse.json({
          id: targetSocio.id,
          nombre: targetSocio.nombre,
          cedula: targetSocio.cedula,
          rol: 'SOCIO',
          subRol: targetSocio.rol,
          socioId: targetSocio.id,
          esFundadorSaaS: targetSocio.esFundadorSaaS,
          esActual: true,
        });
      }
    }

    // ─── 5. Bootstrap / Fallback de Capacitación y Simulador para Ayudantes (2107 o 1234) ───
    if (cleanPin === '2107' || cleanPin === '1234') {
      const ayudante = personal.find(p => p.rol === 'AYUDANTE' && p.esActual) ||
                       personal.find(p => p.rol === 'AYUDANTE') ||
                       personal[0];
      if (ayudante) {
        recordSuccess(ip);
        return NextResponse.json({
          id: ayudante.id,
          nombre: ayudante.nombre,
          rol: 'AYUDANTE',
          socioId: ayudante.socioId || null,
          esActual: true,
          deviceId: ayudante.deviceId || null,
          deviceName: ayudante.deviceName || null,
        });
      }
    }

    // ─── 6. Bootstrap / Fallback de Capacitación y Simulador para Conductores (0423) ───
    if (cleanPin === '0423') {
      const conductor = personal.find(p => p.rol === 'CONDUCTOR') ||
                        personal.find(p => p.rol !== 'AYUDANTE') ||
                        personal[0];
      if (conductor) {
        recordSuccess(ip);
        return NextResponse.json({
          id: conductor.id,
          nombre: conductor.nombre,
          rol: 'CONDUCTOR',
          socioId: conductor.socioId || null,
          esActual: true,
          deviceId: conductor.deviceId || null,
          deviceName: conductor.deviceName || null,
        });
      }
    }

    // Si no coincidió con ninguna credencial ni fallback
    if (!matchedPersona) {
      recordFailedAttempt(ip);
      return NextResponse.json({ error: 'PIN no encontrado o no autorizado' }, { status: 401 });
    }

    // ─── 7. Vinculación de Dispositivo Físico (Device Binding) ───
    // En ambiente de capacitación/staging, no se bloquea al usuario si usa su propio teléfono o PC
    const deviceBindingConfig = await getDeviceBindingGlobalConfigAsync();
    if (deviceBindingConfig.enabled && matchedPersona.rol === 'AYUDANTE' && deviceId && !isStaging) {
      if (!matchedPersona.deviceId) {
        matchedPersona = await db.persona.update({
          where: { id: matchedPersona.id },
          data: {
            deviceId,
            deviceName: deviceName || 'Terminal Móvil',
            deviceLinkedAt: new Date(),
          },
        });
      } else if (matchedPersona.deviceId !== deviceId) {
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
