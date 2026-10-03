import { db } from '@/lib/db';
import { generateSalt, hashPinWithSalt } from '@/lib/pin-hash';

// Seeding seguro para inicialización de base de datos sin PINs quemados en texto plano
export async function seedIfEmpty() {
  try {
    const adminCount = await db.cuentaSocio.count();
    if (adminCount === 0) {
      const superAdminPin = process.env.SEED_SUPERADMIN_PIN || '9999';
      const saltSuper = generateSalt();
      const hashSuper = hashPinWithSalt(superAdminPin, saltSuper);

      await db.cuentaSocio.create({
        data: {
          cedula: '0000000000',
          nombre: 'SuperAdmin SaaS (RutaGo Vendor)',
          email: 'admin@rutago.app',
          telefono: '0990000000',
          pinHash: hashSuper,
          pinSalt: saltSuper,
          rol: 'SUPERADMIN_SAAS',
          activo: true,
          esFundadorSaaS: false,
        },
      });

      const socioPin = process.env.SEED_SOCIO01_PIN || '0101';
      const saltSocio = generateSalt();
      const hashSocio = hashPinWithSalt(socioPin, saltSocio);

      const socioFundador = await db.cuentaSocio.create({
        data: {
          cedula: '1103987654',
          nombre: 'José Leonardo Jaya Jaramillo',
          email: 'socio01@rutago.app',
          telefono: '0987654321',
          pinHash: hashSocio,
          pinSalt: saltSocio,
          rol: 'SOCIO',
          activo: true,
          esFundadorSaaS: true,
        },
      });

      // Crear o vincular Bus 01
      const bus01 = await db.bus.upsert({
        where: { numeroDisco: '01' },
        create: {
          id: 'BUS-01',
          numeroDisco: '01',
          placa: 'TAA-5152',
          marca: 'Hino AK',
          modelo: 'AK',
          anio: 2018,
          capacidadAsientos: 45,
          propietario: 'José Leonardo Jaya Jaramillo',
          tipoOperacion: 'TRONCAL_VT',
          activo: true,
          socioId: socioFundador.id,
          notas: 'Unidad Insignia - Socio Fundador RutaGo',
        },
        update: {
          socioId: socioFundador.id,
        },
      });

      // Suscripción Activa de Fundador para Bus 01
      const hoy = new Date();
      const proximoCorte = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 5);
      await db.suscripcionBus.upsert({
        where: { busId: bus01.id },
        create: {
          busId: bus01.id,
          socioId: socioFundador.id,
          montoMensual: 20.00,
          diaCorteMensual: 5,
          fechaInicio: new Date('2026-01-01'),
          fechaUltimoPago: hoy,
          fechaProximoCorte: proximoCorte,
          estado: 'ACTIVA',
          notasAdmin: 'Membresía Fundadora Vitalicia protegida - Bus 01',
        },
        update: {},
      });

      console.log('Seed: SuperAdmin y Socio Fundador Bus 01 creados con hashing criptográfico.');
    }

    // ─── 2. Personal Operativo de Ruta y Capacitación (Conductor y Ayudantes) ───
    const personalCount = await db.persona.count().catch(() => 0);
    if (personalCount === 0) {
      const socio = await db.cuentaSocio.findFirst({ where: { rol: 'SOCIO' } });
      const socioId = socio?.id || null;

      // Ayudante de Ruta Oficial (PIN estándar 2107)
      const salt2107 = generateSalt();
      const hash2107 = hashPinWithSalt('2107', salt2107);
      await db.persona.create({
        data: {
          nombre: 'Ayudante Ruta Bus 01',
          rol: 'AYUDANTE',
          pin: hash2107,
          pinSalt: salt2107,
          socioId,
          esActual: true,
        },
      });

      // Ayudante de Capacitación / Pruebas (PIN 1234)
      const salt1234 = generateSalt();
      const hash1234 = hashPinWithSalt('1234', salt1234);
      await db.persona.create({
        data: {
          nombre: 'Ayudante Capacitación (Simulador)',
          rol: 'AYUDANTE',
          pin: hash1234,
          pinSalt: salt1234,
          socioId,
          esActual: false,
        },
      });

      // Conductor Bus 01 (PIN 0423)
      const salt0423 = generateSalt();
      const hash0423 = hashPinWithSalt('0423', salt0423);
      await db.persona.create({
        data: {
          nombre: 'Conductor Bus 01',
          rol: 'CONDUCTOR',
          pin: hash0423,
          pinSalt: salt0423,
          socioId,
          esActual: true,
        },
      });

      console.log('Seed: Personal operativo (2107, 1234, 0423) creado exitosamente.');
    }

    // ─── 3. VTs y Frecuencias Oficiales para emisión de boletos ───
    const vtCount = await db.busVT.count().catch(() => 0);
    if (vtCount === 0) {
      const { VT_DATA } = await import('@/lib/seed-vts');
      for (const vt of VT_DATA) {
        await db.busVT.upsert({
          where: { codigo: vt.codigo },
          create: {
            codigo: vt.codigo,
            nombre: vt.nombre,
            frecuencias: vt.frecuencias as any,
            activo: true,
          },
          update: {},
        });
      }
      console.log(`Seed: ${VT_DATA.length} VTs inicializados correctamente.`);
    }
  } catch (error) {
    console.error('Seed error:', error);
  }
}

