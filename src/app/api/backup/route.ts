import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateSalt, hashPinWithSalt } from '@/lib/pin-hash';

// GET /api/backup — Export full database backup
export async function GET() {
  try {
    const [
      records,
      personas,
      socios,
      buses,
      suscripciones,
      pagos,
      ownerExpenses,
      ventasBoletos,
      busVTs,
      frecuencias,
      catalogoMaestroItems,
      busRecetasCombo,
      busItemOverrides,
      busMantenimientoConfigs,
    ] = await Promise.all([
      db.dailyRecord.findMany({
        orderBy: { date: 'desc' },
        include: {
          trips: { orderBy: { order: 'asc' } },
          expenses: { orderBy: { order: 'asc' } },
        },
      }),
      db.persona.findMany({
        orderBy: { nombre: 'asc' },
        select: {
          id: true,
          nombre: true,
          cedula: true,
          telefono: true,
          rol: true,
          pin: true,
          pinSalt: true,
          esActual: true,
          socioId: true,
          deviceId: true,
          deviceName: true,
          deviceLinkedAt: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      db.cuentaSocio.findMany({
        orderBy: { nombre: 'asc' },
        select: {
          id: true,
          cedula: true,
          nombre: true,
          email: true,
          telefono: true,
          pinHash: true,
          pinSalt: true,
          rol: true,
          activo: true,
          esFundadorSaaS: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      db.bus.findMany({
        orderBy: { numeroDisco: 'asc' },
      }),
      db.suscripcionBus.findMany({
        orderBy: { createdAt: 'desc' },
      }),
      db.pagoSuscripcion.findMany({
        orderBy: { fechaPago: 'desc' },
      }),
      db.ownerExpense.findMany({
        orderBy: { expenseDate: 'desc' },
      }),
      db.ventaBoleto.findMany({
        orderBy: { createdAt: 'desc' },
      }),
      db.busVT.findMany({
        orderBy: { codigo: 'asc' },
      }),
      db.frecuencia.findMany({
        orderBy: { hora: 'asc' },
      }),
      db.catalogoMaestroItem.findMany({
        orderBy: { codigo: 'asc' },
      }),
      db.busRecetaCombo.findMany({
        orderBy: { busId: 'asc' },
      }),
      db.busItemOverride.findMany({
        orderBy: { busId: 'asc' },
      }),
      db.busMantenimientoConfig.findMany({
        orderBy: { busId: 'asc' },
      }),
    ]);

    const backup = {
      exportDate: new Date().toISOString(),
      version: 'v3.60.85-backup-integral',
      app: 'rutago',
      platform: 'Vercel Postgres',
      records,
      personas,
      socios,
      buses,
      suscripciones,
      pagos,
      ownerExpenses,
      ventasBoletos,
      busVTs,
      frecuencias,
      catalogoMaestroItems,
      busRecetasCombo,
      busItemOverrides,
      busMantenimientoConfigs,
      summary: {
        totalRecords: records.length,
        totalPersonas: personas.length,
        totalSocios: socios.length,
        totalBuses: buses.length,
        totalSuscripciones: suscripciones.length,
        totalPagos: pagos.length,
        totalOwnerExpenses: ownerExpenses.length,
        totalVentasBoletos: ventasBoletos.length,
        totalBusVTs: busVTs.length,
        totalFrecuencias: frecuencias.length,
        totalCatalogoMaestroItems: catalogoMaestroItems.length,
        totalBusRecetasCombo: busRecetasCombo.length,
        totalBusItemOverrides: busItemOverrides.length,
        totalBusMantenimientoConfigs: busMantenimientoConfigs.length,
        dateRange:
          records.length > 0
            ? { from: records[records.length - 1].date, to: records[0].date }
            : null,
      },
    };

    return NextResponse.json(backup);
  } catch (error) {
    console.error('Backup error:', error);
    return NextResponse.json({ error: 'Error al generar respaldo completo' }, { status: 500 });
  }
}

// POST /api/backup — Restore database from JSON backup payload
export async function POST(req: NextRequest) {
  try {
    const data = await req.json();

    if (!data || typeof data !== 'object') {
      return NextResponse.json({ error: 'Archivo de respaldo inválido' }, { status: 400 });
    }

    const summaryResults: Record<string, number> = {};

    // 1. Restaurar Socios (CuentaSocio)
    if (Array.isArray(data.socios) && data.socios.length > 0) {
      let sociosRestaurados = 0;
      for (const s of data.socios) {
        let pinHash = s.pinHash;
        let pinSalt = s.pinSalt;
        if (!pinHash || !pinSalt) {
          const defaultPin = s.rol === 'SUPERADMIN_SAAS' ? '9999' : '0101';
          pinSalt = generateSalt();
          pinHash = hashPinWithSalt(defaultPin, pinSalt);
        }

        await db.cuentaSocio.upsert({
          where: { id: s.id },
          create: {
            id: s.id,
            cedula: s.cedula,
            nombre: s.nombre,
            email: s.email || null,
            telefono: s.telefono || null,
            pinHash,
            pinSalt,
            rol: s.rol || 'SOCIO',
            activo: s.activo ?? true,
            esFundadorSaaS: s.esFundadorSaaS ?? false,
          },
          update: {
            cedula: s.cedula,
            nombre: s.nombre,
            email: s.email || null,
            telefono: s.telefono || null,
            pinHash,
            pinSalt,
            rol: s.rol || 'SOCIO',
            activo: s.activo ?? true,
            esFundadorSaaS: s.esFundadorSaaS ?? false,
          },
        });
        sociosRestaurados++;
      }
      summaryResults.socios = sociosRestaurados;
    }

    // 2. Restaurar Buses Físicos
    if (Array.isArray(data.buses) && data.buses.length > 0) {
      let busesRestaurados = 0;
      for (const b of data.buses) {
        await db.bus.upsert({
          where: { id: b.id },
          create: {
            id: b.id,
            numeroDisco: b.numeroDisco,
            placa: b.placa,
            marca: b.marca || 'Hino AK',
            modelo: b.modelo || null,
            anio: b.anio ? Number(b.anio) : null,
            capacidadAsientos: b.capacidadAsientos ? Number(b.capacidadAsientos) : 45,
            propietario: b.propietario || 'Socio Propietario',
            tipoOperacion: b.tipoOperacion || 'TRONCAL_VT',
            activo: b.activo ?? true,
            socioId: b.socioId || null,
            notas: b.notas || null,
          },
          update: {
            numeroDisco: b.numeroDisco,
            placa: b.placa,
            marca: b.marca || 'Hino AK',
            modelo: b.modelo || null,
            anio: b.anio ? Number(b.anio) : null,
            capacidadAsientos: b.capacidadAsientos ? Number(b.capacidadAsientos) : 45,
            propietario: b.propietario || 'Socio Propietario',
            tipoOperacion: b.tipoOperacion || 'TRONCAL_VT',
            activo: b.activo ?? true,
            socioId: b.socioId || null,
            notas: b.notas || null,
          },
        });
        busesRestaurados++;
      }
      summaryResults.buses = busesRestaurados;
    }

    // 3. Restaurar Personal Operativo (Choferes y Ayudantes)
    if (Array.isArray(data.personas) && data.personas.length > 0) {
      let personasRestauradas = 0;
      for (const p of data.personas) {
        let pin = p.pin;
        let pinSalt = p.pinSalt;
        if (!pin || pin.length < 10) {
          const defaultPin = p.pin || (p.rol === 'CONDUCTOR' ? '0423' : '2107');
          pinSalt = generateSalt();
          pin = hashPinWithSalt(defaultPin, pinSalt);
        }

        await db.persona.upsert({
          where: { id: p.id },
          create: {
            id: p.id,
            nombre: p.nombre,
            cedula: p.cedula || null,
            telefono: p.telefono || null,
            rol: p.rol || 'AYUDANTE',
            pin,
            pinSalt,
            esActual: p.esActual ?? false,
            socioId: p.socioId || null,
            deviceId: p.deviceId || null,
            deviceName: p.deviceName || null,
          },
          update: {
            nombre: p.nombre,
            cedula: p.cedula || null,
            telefono: p.telefono || null,
            rol: p.rol || 'AYUDANTE',
            pin,
            pinSalt,
            esActual: p.esActual ?? false,
            socioId: p.socioId || null,
          },
        });
        personasRestauradas++;
      }
      summaryResults.personas = personasRestauradas;
    }

    // 4. Restaurar BusVTs y Frecuencias
    if (Array.isArray(data.busVTs) && data.busVTs.length > 0) {
      let vtsRestaurados = 0;
      for (const vt of data.busVTs) {
        await db.busVT.upsert({
          where: { codigo: vt.codigo },
          create: {
            id: vt.id,
            codigo: vt.codigo,
            nombre: vt.nombre,
            frecuencias: vt.frecuencias ?? [],
            activo: vt.activo ?? true,
          },
          update: {
            nombre: vt.nombre,
            frecuencias: vt.frecuencias ?? [],
            activo: vt.activo ?? true,
          },
        });
        vtsRestaurados++;
      }
      summaryResults.busVTs = vtsRestaurados;
    }

    if (Array.isArray(data.frecuencias) && data.frecuencias.length > 0) {
      let frecsRestauradas = 0;
      for (const f of data.frecuencias) {
        await db.frecuencia.upsert({
          where: { id: f.id },
          create: {
            id: f.id,
            vtCode: f.vtCode,
            nombre: f.nombre,
            ruta: f.ruta,
            hora: f.hora,
            direccion: f.direccion || 'ida',
            activo: f.activo ?? true,
          },
          update: {
            vtCode: f.vtCode,
            nombre: f.nombre,
            ruta: f.ruta,
            hora: f.hora,
            direccion: f.direccion || 'ida',
            activo: f.activo ?? true,
          },
        });
        frecsRestauradas++;
      }
      summaryResults.frecuencias = frecsRestauradas;
    }

    // 5. Restaurar Mantenimiento Jerárquico
    if (Array.isArray(data.catalogoMaestroItems) && data.catalogoMaestroItems.length > 0) {
      let catRestaurados = 0;
      for (const c of data.catalogoMaestroItems) {
        await db.catalogoMaestroItem.upsert({
          where: { codigo: c.codigo },
          create: {
            id: c.id,
            codigo: c.codigo,
            nombre: c.nombre,
            categoria: c.categoria,
            intervaloKmOficial: Number(c.intervaloKmOficial) || 5000,
            prioridad: c.prioridad || 'PREVENTIVA',
            toleranciaKm: Number(c.toleranciaKm) || 500,
            especificacionLubricanteRepuesto: c.especificacionLubricanteRepuesto || null,
            instruccionesTecnicas: c.instruccionesTecnicas || null,
            activo: c.activo ?? true,
            asignadoChoferPorDefecto: c.asignadoChoferPorDefecto ?? true,
            actualizadoPor: c.actualizadoPor || 'SUPERADMIN',
          },
          update: {
            nombre: c.nombre,
            categoria: c.categoria,
            intervaloKmOficial: Number(c.intervaloKmOficial) || 5000,
            prioridad: c.prioridad || 'PREVENTIVA',
            toleranciaKm: Number(c.toleranciaKm) || 500,
            activo: c.activo ?? true,
          },
        });
        catRestaurados++;
      }
      summaryResults.catalogoMaestroItems = catRestaurados;
    }

    if (Array.isArray(data.busRecetasCombo) && data.busRecetasCombo.length > 0) {
      for (const r of data.busRecetasCombo) {
        await db.busRecetaCombo.upsert({
          where: { busId_estacionId: { busId: r.busId, estacionId: r.estacionId } },
          create: {
            id: r.id,
            busId: r.busId,
            estacionId: r.estacionId,
            itemsSeleccionados: r.itemsSeleccionados ?? {},
            codigosExtras: r.codigosExtras ?? [],
            codigosExcluidos: r.codigosExcluidos ?? [],
            actualizadoPor: r.actualizadoPor || 'SOCIO',
          },
          update: {
            itemsSeleccionados: r.itemsSeleccionados ?? {},
            codigosExtras: r.codigosExtras ?? [],
            codigosExcluidos: r.codigosExcluidos ?? [],
          },
        });
      }
    }

    if (Array.isArray(data.busItemOverrides) && data.busItemOverrides.length > 0) {
      for (const o of data.busItemOverrides) {
        await db.busItemOverride.upsert({
          where: { busId_codigo: { busId: o.busId, codigo: o.codigo } },
          create: {
            id: o.id,
            busId: o.busId,
            codigo: o.codigo,
            intervaloKm: Number(o.intervaloKm),
            repuestoEspecifico: o.repuestoEspecifico || null,
            activoEnBus: o.activoEnBus ?? true,
            asignadoChofer: o.asignadoChofer ?? true,
            actualizadoPor: o.actualizadoPor || 'SOCIO',
          },
          update: {
            intervaloKm: Number(o.intervaloKm),
            repuestoEspecifico: o.repuestoEspecifico || null,
            activoEnBus: o.activoEnBus ?? true,
          },
        });
      }
    }

    if (Array.isArray(data.busMantenimientoConfigs) && data.busMantenimientoConfigs.length > 0) {
      for (const mc of data.busMantenimientoConfigs) {
        await db.busMantenimientoConfig.upsert({
          where: { busId: mc.busId },
          create: {
            id: mc.id,
            busId: mc.busId,
            moduloActivo: mc.moduloActivo ?? true,
            nivelControl: mc.nivelControl || 'ESTRICTO',
            itemsActivos: mc.itemsActivos ?? [],
            decisionTomada: mc.decisionTomada ?? true,
            actualizadoPor: mc.actualizadoPor || 'SOCIO',
          },
          update: {
            moduloActivo: mc.moduloActivo ?? true,
            nivelControl: mc.nivelControl || 'ESTRICTO',
            itemsActivos: mc.itemsActivos ?? [],
            decisionTomada: mc.decisionTomada ?? true,
          },
        });
      }
    }

    // 6. Restaurar Gastos del Socio (OwnerExpenses)
    if (Array.isArray(data.ownerExpenses) && data.ownerExpenses.length > 0) {
      let gastosRestaurados = 0;
      for (const exp of data.ownerExpenses) {
        await db.ownerExpense.upsert({
          where: { id: exp.id },
          create: {
            id: exp.id,
            busId: exp.busId || 'BUS-01',
            expenseDate: exp.expenseDate,
            category: exp.category,
            description: exp.description,
            provider: exp.provider || null,
            totalAmount: Number(exp.totalAmount) || 0,
            paidAmount: Number(exp.paidAmount) || 0,
            pendingBalance: Number(exp.pendingBalance) || 0,
            paymentMethod: exp.paymentMethod || 'EFECTIVO',
            comprobanteRef: exp.comprobanteRef || null,
            bankName: exp.bankName || null,
            receiptPhotoUrl: exp.receiptPhotoUrl || null,
            abonos: exp.abonos ?? [],
            status: exp.status || 'PAGADO',
          },
          update: {
            totalAmount: Number(exp.totalAmount) || 0,
            paidAmount: Number(exp.paidAmount) || 0,
            pendingBalance: Number(exp.pendingBalance) || 0,
            status: exp.status || 'PAGADO',
          },
        });
        gastosRestaurados++;
      }
      summaryResults.ownerExpenses = gastosRestaurados;
    }

    return NextResponse.json({
      success: true,
      message: 'Base de datos restaurada exitosamente desde el respaldo',
      summary: summaryResults,
    });
  } catch (error) {
    console.error('Error restaurando respaldo:', error);
    return NextResponse.json({ error: 'Error al restaurar respaldo en base de datos' }, { status: 500 });
  }
}
