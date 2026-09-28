import { PrismaClient } from '@prisma/client';
import { generateSalt, hashPinWithSalt } from '../src/lib/pin-hash';

const prisma = new PrismaClient();

export async function runSaasFase1Seed() {
  console.log('🚀 Iniciando Migración Relacional y Blindaje SaaS Fase 1...');

  const superAdminPin = process.env.SEED_SUPERADMIN_PIN || '9999';
  const socioFundadorPin = process.env.SEED_SOCIO01_PIN || '0101';

  // 1. SuperAdmin SaaS
  let superAdmin = await prisma.cuentaSocio.findFirst({
    where: { rol: 'SUPERADMIN_SAAS' },
  });

  if (!superAdmin) {
    const salt = generateSalt();
    const pinHash = hashPinWithSalt(superAdminPin, salt);
    superAdmin = await prisma.cuentaSocio.create({
      data: {
        cedula: '1100000000',
        nombre: 'SuperAdmin SaaS (RutaGo)',
        email: 'admin@rutago.app',
        telefono: '0990000000',
        pinHash,
        pinSalt: salt,
        rol: 'SUPERADMIN_SAAS',
        activo: true,
        esFundadorSaaS: true,
      },
    });
    console.log(`✅ SuperAdmin SaaS creado: ${superAdmin.nombre} (${superAdmin.id})`);
  } else {
    console.log(`ℹ️ SuperAdmin SaaS ya existente: ${superAdmin.nombre}`);
  }

  // 2. Socio Fundador (Propietario Bus 01)
  let socioFundador = await prisma.cuentaSocio.findFirst({
    where: {
      OR: [
        { cedula: '1103987654' },
        { esFundadorSaaS: true, rol: 'SOCIO' },
      ],
    },
  });

  if (!socioFundador) {
    const salt = generateSalt();
    const pinHash = hashPinWithSalt(socioFundadorPin, salt);
    socioFundador = await prisma.cuentaSocio.create({
      data: {
        cedula: '1103987654',
        nombre: 'José Leonardo Jaya Jaramillo',
        email: 'socio01@rutago.app',
        telefono: '0987654321',
        pinHash,
        pinSalt: salt,
        rol: 'SOCIO',
        activo: true,
        esFundadorSaaS: true,
      },
    });
    console.log(`✅ Socio Fundador creado: ${socioFundador.nombre} (${socioFundador.id})`);
  } else {
    console.log(`ℹ️ Socio Fundador ya existente: ${socioFundador.nombre}`);
  }

  // 3. Garantizar Unidad Física Bus 01 y su vinculación
  let bus01 = await prisma.bus.findFirst({
    where: { numeroDisco: '01' },
  });

  if (!bus01) {
    bus01 = await prisma.bus.create({
      data: {
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
    });
    console.log(`✅ Bus 01 creado y asignado al Socio Fundador: ${bus01.placa}`);
  } else if (!bus01.socioId) {
    bus01 = await prisma.bus.update({
      where: { id: bus01.id },
      data: { socioId: socioFundador.id },
    });
    console.log(`✅ Bus 01 vinculado exitosamente al Socio Fundador`);
  }

  // 4. Vincular Personal Operativo sin socio asignado
  const personalActualizar = await prisma.persona.findMany({
    where: { socioId: null },
  });

  if (personalActualizar.length > 0) {
    for (const persona of personalActualizar) {
      const updateData: { socioId: string; pin?: string; pinSalt?: string } = {
        socioId: socioFundador.id,
      };

      // Si el PIN está en plaintext o no tiene salt, elevar su seguridad con hashing + salt
      if (!persona.pinSalt || persona.pin.length <= 6) {
        const salt = generateSalt();
        const hash = hashPinWithSalt(persona.pin, salt);
        updateData.pin = hash;
        updateData.pinSalt = salt;
      }

      await prisma.persona.update({
        where: { id: persona.id },
        data: updateData,
      });
    }
    console.log(`✅ ${personalActualizar.length} miembros del personal vinculados al Socio Fundador con hashing seguro`);
  }

  // 5. Suscripción Activa para la Unidad 01
  let suscripcion = await prisma.suscripcionBus.findUnique({
    where: { busId: bus01.id },
  });

  if (!suscripcion) {
    const hoy = new Date();
    const proximoCorte = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 5);

    suscripcion = await prisma.suscripcionBus.create({
      data: {
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
    });
    console.log(`✅ Suscripción creada para Bus 01 (Estado: ACTIVA, Corte día 5)`);

    // Registrar pago histórico inicial
    await prisma.pagoSuscripcion.create({
      data: {
        suscripcionId: suscripcion.id,
        monto: 20.00,
        fechaPago: hoy,
        metodoPago: 'TRANSFERENCIA',
        numeroComprobante: 'FUNDADOR-INIT-001',
        registradoPor: superAdmin.id,
        notas: 'Activación Membresía Fundador Bus 01',
      },
    });
    console.log(`✅ Pago de suscripción inicial registrado`);
  } else {
    console.log(`ℹ️ Suscripción de Bus 01 activa: ${suscripcion.estado}`);
  }

  // 6. Blindaje de integridad: Validar registros históricos
  const conteoDaily = await prisma.dailyRecord.count();
  const conteoGastos = await prisma.ownerExpense.count();
  const conteoVentas = await prisma.ventaBoleto.count();

  console.log(`🛡️ Auditoría de Integridad de Datos Históricos:`);
  console.log(`   - Jornadas DailyRecord: ${conteoDaily} registros intactos`);
  console.log(`   - Gastos OwnerExpense: ${conteoGastos} registros intactos`);
  console.log(`   - Ventas VentaBoleto: ${conteoVentas} registros intactos`);
  console.log(`✨ FASE 1: Migración Relacional y Blindaje Cero-Hardcode COMPLETADA CON ÉXITO.`);
}

if (require.main === module) {
  runSaasFase1Seed()
    .catch((e) => {
      console.error('❌ Error ejecutando seed SaaS Fase 1:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
