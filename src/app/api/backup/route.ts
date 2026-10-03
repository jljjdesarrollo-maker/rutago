import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateSalt, hashPinWithSalt } from '@/lib/pin-hash';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

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
      version: 'v3.60.88-backup-integral',
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
    const warnings: string[] = [];

    // 1. Restaurar Socios (CuentaSocio) con resolución de duplicados por Cédula o ID
    if (Array.isArray(data.socios) && data.socios.length > 0) {
      let sociosRestaurados = 0;
      for (const s of data.socios) {
        try {
          let pinHash = s.pinHash;
          let pinSalt = s.pinSalt;
          if (!pinHash || !pinSalt) {
            const defaultPin = s.rol === 'SUPERADMIN_SAAS' ? '9999' : '0101';
            pinSalt = generateSalt();
            pinHash = hashPinWithSalt(defaultPin, pinSalt);
          }

          const existingSocio = await db.cuentaSocio.findFirst({
            where: {
              OR: [
                { id: s.id },
                ...(s.cedula ? [{ cedula: s.cedula }] : []),
              ],
            },
          });

          if (existingSocio) {
            await db.cuentaSocio.update({
              where: { id: existingSocio.id },
              data: {
                cedula: s.cedula || existingSocio.cedula,
                nombre: s.nombre || existingSocio.nombre,
                email: s.email || null,
                telefono: s.telefono || null,
                pinHash: pinHash || existingSocio.pinHash,
                pinSalt: pinSalt || existingSocio.pinSalt,
                rol: s.rol || existingSocio.rol,
                activo: s.activo ?? true,
                esFundadorSaaS: s.esFundadorSaaS ?? false,
              },
            });
          } else {
            await db.cuentaSocio.create({
              data: {
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
            });
          }
          sociosRestaurados++;
        } catch (socioErr: any) {
          console.warn('Advertencia restaurando socio:', s.nombre, socioErr?.message);
          warnings.push(`Socio ${s.nombre}: ${socioErr?.message}`);
        }
      }
      summaryResults.socios = sociosRestaurados;
    }

    // 2. Restaurar Buses Físicos con resolución de duplicados por Disco o Placa
    if (Array.isArray(data.buses) && data.buses.length > 0) {
      let busesRestaurados = 0;
      for (const b of data.buses) {
        try {
          let validSocioId: string | null = null;
          if (b.socioId) {
            const socioFound = await db.cuentaSocio.findUnique({ where: { id: b.socioId } });
            if (socioFound) validSocioId = b.socioId;
          }

          const existingBus = await db.bus.findFirst({
            where: {
              OR: [
                { id: b.id },
                ...(b.numeroDisco ? [{ numeroDisco: b.numeroDisco }] : []),
                ...(b.placa ? [{ placa: b.placa }] : []),
              ],
            },
          });

          if (existingBus) {
            await db.bus.update({
              where: { id: existingBus.id },
              data: {
                numeroDisco: b.numeroDisco || existingBus.numeroDisco,
                placa: b.placa || existingBus.placa,
                marca: b.marca || 'Hino AK',
                modelo: b.modelo || null,
                anio: b.anio ? Number(b.anio) : null,
                capacidadAsientos: b.capacidadAsientos ? Number(b.capacidadAsientos) : 45,
                propietario: b.propietario || existingBus.propietario,
                tipoOperacion: b.tipoOperacion || 'TRONCAL_VT',
                activo: b.activo ?? true,
                socioId: validSocioId ?? existingBus.socioId,
                notas: b.notas || null,
              },
            });
          } else {
            await db.bus.create({
              data: {
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
                socioId: validSocioId,
                notas: b.notas || null,
              },
            });
          }
          busesRestaurados++;
        } catch (busErr: any) {
          console.warn('Advertencia restaurando bus:', b.numeroDisco, busErr?.message);
          warnings.push(`Bus ${b.numeroDisco}: ${busErr?.message}`);
        }
      }
      summaryResults.buses = busesRestaurados;
    }

    // 3. Restaurar Suscripciones (validando relaciones)
    if (Array.isArray(data.suscripciones) && data.suscripciones.length > 0) {
      let suscripcionesRestauradas = 0;
      for (const sub of data.suscripciones) {
        try {
          const [busExists, socioExists] = await Promise.all([
            db.bus.findUnique({ where: { id: sub.busId } }),
            db.cuentaSocio.findUnique({ where: { id: sub.socioId } }),
          ]);

          if (busExists && socioExists) {
            await db.suscripcionBus.upsert({
              where: { busId: sub.busId },
              create: {
                id: sub.id,
                socioId: sub.socioId,
                busId: sub.busId,
                montoMensual: Number(sub.montoMensual) || 20.0,
                diaCorteMensual: Number(sub.diaCorteMensual) || 5,
                fechaInicio: sub.fechaInicio ? new Date(sub.fechaInicio) : new Date(),
                estado: sub.estado || 'ACTIVA',
                notasAdmin: sub.notasAdmin || null,
              },
              update: {
                socioId: sub.socioId,
                montoMensual: Number(sub.montoMensual) || 20.0,
                estado: sub.estado || 'ACTIVA',
              },
            });
            suscripcionesRestauradas++;
          }
        } catch (subErr: any) {
          console.warn('Advertencia en suscripcion:', subErr?.message);
        }
      }
      summaryResults.suscripciones = suscripcionesRestauradas;
    }

    // 4. Restaurar Personal Operativo (Choferes y Ayudantes con PINs protegidos)
    if (Array.isArray(data.personas) && data.personas.length > 0) {
      let personasRestauradas = 0;
      for (const p of data.personas) {
        try {
          let validSocioId: string | null = null;
          if (p.socioId) {
            const socioFound = await db.cuentaSocio.findUnique({ where: { id: p.socioId } });
            if (socioFound) validSocioId = p.socioId;
          }

          const existingPersona = await db.persona.findFirst({
            where: {
              OR: [
                { id: p.id },
                ...(p.cedula ? [{ cedula: p.cedula }] : []),
                { nombre: p.nombre, rol: p.rol || 'AYUDANTE' },
              ],
            },
          });

          let pin = p.pin;
          let pinSalt = p.pinSalt;

          // Si el archivo de respaldo no traía el PIN (respaldo anterior sin credenciales):
          if (!pin) {
            pin = existingPersona?.pin;
            pinSalt = existingPersona?.pinSalt;
          }

          if (!pin || pin.length < 10) {
            const rawPin = p.rol === 'CONDUCTOR' ? '0423' : '2107';
            pinSalt = generateSalt();
            pin = hashPinWithSalt(rawPin, pinSalt);

            const pinConflict = await db.persona.findFirst({
              where: {
                pin,
                ...(existingPersona ? { id: { not: existingPersona.id } } : {}),
              },
            });

            if (pinConflict) {
              pinSalt = generateSalt();
              pin = hashPinWithSalt(`${rawPin}_${Math.floor(Math.random() * 9000 + 1000)}`, pinSalt);
            }
          }

          if (existingPersona) {
            await db.persona.update({
              where: { id: existingPersona.id },
              data: {
                nombre: p.nombre,
                cedula: p.cedula || existingPersona.cedula,
                telefono: p.telefono || null,
                rol: p.rol || existingPersona.rol,
                pin,
                pinSalt,
                esActual: p.esActual ?? false,
                socioId: validSocioId ?? existingPersona.socioId,
                deviceId: p.deviceId || null,
                deviceName: p.deviceName || null,
              },
            });
          } else {
            await db.persona.create({
              data: {
                id: p.id,
                nombre: p.nombre,
                cedula: p.cedula || null,
                telefono: p.telefono || null,
                rol: p.rol || 'AYUDANTE',
                pin,
                pinSalt,
                esActual: p.esActual ?? false,
                socioId: validSocioId,
                deviceId: p.deviceId || null,
                deviceName: p.deviceName || null,
              },
            });
          }
          personasRestauradas++;
        } catch (persErr: any) {
          console.warn('Advertencia restaurando persona:', p.nombre, persErr?.message);
          warnings.push(`Personal ${p.nombre}: ${persErr?.message}`);
        }
      }
      summaryResults.personas = personasRestauradas;
    }

    // 5. Restaurar BusVTs y Frecuencias
    if (Array.isArray(data.busVTs) && data.busVTs.length > 0) {
      let vtsRestaurados = 0;
      for (const vt of data.busVTs) {
        try {
          await db.busVT.upsert({
            where: { codigo: vt.codigo },
            create: {
              id: vt.id,
              codigo: vt.codigo,
              nombre: vt.nombre || vt.codigo,
              frecuencias: vt.frecuencias ?? [],
              activo: vt.activo ?? true,
            },
            update: {
              nombre: vt.nombre || vt.codigo,
              frecuencias: vt.frecuencias ?? [],
              activo: vt.activo ?? true,
            },
          });
          vtsRestaurados++;
        } catch (vtErr: any) {
          console.warn('Advertencia restaurando BusVT:', vt.codigo, vtErr?.message);
        }
      }
      summaryResults.busVTs = vtsRestaurados;
    }

    if (Array.isArray(data.frecuencias) && data.frecuencias.length > 0) {
      let frecsRestauradas = 0;
      for (const f of data.frecuencias) {
        try {
          // Garantizar existencia de BusVT para FK
          await db.busVT.upsert({
            where: { codigo: f.vtCode },
            create: {
              codigo: f.vtCode,
              nombre: `VT ${f.vtCode}`,
              frecuencias: [],
              activo: true,
            },
            update: {},
          });

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
        } catch (frecErr: any) {
          console.warn('Advertencia restaurando frecuencia:', f.hora, frecErr?.message);
        }
      }
      summaryResults.frecuencias = frecsRestauradas;
    }

    // 6. Restaurar Mantenimiento Jerárquico
    if (Array.isArray(data.catalogoMaestroItems) && data.catalogoMaestroItems.length > 0) {
      let catRestaurados = 0;
      for (const c of data.catalogoMaestroItems) {
        try {
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
        } catch (catErr: any) {
          console.warn('Advertencia restaurando catalogo:', c.codigo, catErr?.message);
        }
      }
      summaryResults.catalogoMaestroItems = catRestaurados;
    }

    if (Array.isArray(data.busRecetasCombo) && data.busRecetasCombo.length > 0) {
      for (const r of data.busRecetasCombo) {
        try {
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
        } catch (recErr: any) {
          console.warn('Advertencia en busRecetaCombo:', recErr?.message);
        }
      }
    }

    if (Array.isArray(data.busItemOverrides) && data.busItemOverrides.length > 0) {
      for (const o of data.busItemOverrides) {
        try {
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
        } catch (ovErr: any) {
          console.warn('Advertencia en busItemOverride:', ovErr?.message);
        }
      }
    }

    if (Array.isArray(data.busMantenimientoConfigs) && data.busMantenimientoConfigs.length > 0) {
      for (const mc of data.busMantenimientoConfigs) {
        try {
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
        } catch (cfgErr: any) {
          console.warn('Advertencia en busMantenimientoConfig:', cfgErr?.message);
        }
      }
    }

    // 7. Restaurar Gastos del Socio (OwnerExpenses)
    if (Array.isArray(data.ownerExpenses) && data.ownerExpenses.length > 0) {
      let gastosRestaurados = 0;
      for (const exp of data.ownerExpenses) {
        try {
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
        } catch (expErr: any) {
          console.warn('Advertencia en ownerExpense:', expErr?.message);
        }
      }
      summaryResults.ownerExpenses = gastosRestaurados;
    }

    // 8. Restaurar Registros Diarios y Arqueos del Ayudante (DailyRecord con Trips y Expenses)
    if (Array.isArray(data.records) && data.records.length > 0) {
      let recordsRestaurados = 0;
      for (const rec of data.records) {
        try {
          const createdRec = await db.dailyRecord.upsert({
            where: { id: rec.id },
            create: {
              id: rec.id,
              date: rec.date,
              km: rec.km || null,
              kmInicial: rec.kmInicial || null,
              kmFinal: rec.kmFinal || null,
              conductor: rec.conductor || null,
              ayudanteNombre: rec.ayudanteNombre || null,
              vtCode: rec.vtCode || null,
              production: Number(rec.production) || 0,
              cajaComun: Number(rec.cajaComun) || 0,
              sobrante: Number(rec.sobrante) || 0,
              tickets: Number(rec.tickets) || 0,
              entregaAyudante: Number(rec.entregaAyudante) || 0,
              entregaCompania: Number(rec.entregaCompania) || 0,
              totalGastos: Number(rec.totalGastos) || 0,
              photoUrl: rec.photoUrl?.startsWith('data:image') ? null : (rec.photoUrl || null),
            },
            update: {
              date: rec.date,
              km: rec.km || null,
              kmInicial: rec.kmInicial || null,
              kmFinal: rec.kmFinal || null,
              conductor: rec.conductor || null,
              ayudanteNombre: rec.ayudanteNombre || null,
              vtCode: rec.vtCode || null,
              production: Number(rec.production) || 0,
              cajaComun: Number(rec.cajaComun) || 0,
              sobrante: Number(rec.sobrante) || 0,
              tickets: Number(rec.tickets) || 0,
              entregaAyudante: Number(rec.entregaAyudante) || 0,
              entregaCompania: Number(rec.entregaCompania) || 0,
              totalGastos: Number(rec.totalGastos) || 0,
            },
          });

          // Restaurar Trips si existen
          if (Array.isArray(rec.trips) && rec.trips.length > 0) {
            await db.trip.deleteMany({ where: { recordId: createdRec.id } });
            await db.trip.createMany({
              data: rec.trips.map((t: any) => ({
                id: t.id,
                recordId: createdRec.id,
                order: Number(t.order) || 0,
                routeFrom: t.routeFrom || '',
                routeTo: t.routeTo || '',
                time: t.time || null,
                income: Number(t.income) || 0,
                efectivoReal: Number(t.efectivoReal) || 0,
                boletos: Number(t.boletos) || 0,
                cajaComunPasajeros: Number(t.cajaComunPasajeros) || 0,
                cajaComunMonto: Number(t.cajaComunMonto) || 0,
                tipo: t.tipo || 'frecuencia',
                motivo: t.motivo || null,
                notaEspecial: t.notaEspecial || null,
              })),
            });
          }

          // Restaurar Expenses si existen
          if (Array.isArray(rec.expenses) && rec.expenses.length > 0) {
            await db.expense.deleteMany({ where: { recordId: createdRec.id } });
            await db.expense.createMany({
              data: rec.expenses.map((e: any) => ({
                id: e.id,
                recordId: createdRec.id,
                order: Number(e.order) || 0,
                description: e.description || '',
                amount: Number(e.amount) || 0,
              })),
            });
          }

          recordsRestaurados++;
        } catch (recErr: any) {
          console.warn('Advertencia restaurando dailyRecord:', recErr?.message);
        }
      }
      summaryResults.records = recordsRestaurados;
    }

    // 9. Restaurar Boletos (VentaBoleto)
    if (Array.isArray(data.ventasBoletos) && data.ventasBoletos.length > 0) {
      let boletosRestaurados = 0;
      for (const vb of data.ventasBoletos) {
        try {
          await db.ventaBoleto.upsert({
            where: { id: vb.id },
            create: {
              id: vb.id,
              fecha: vb.fecha,
              fechaOperacion: vb.fechaOperacion || null,
              diaTurno: Number(vb.diaTurno) || 1,
              vtCode: vb.vtCode,
              frecuenciaId: vb.frecuenciaId || null,
              ruta: vb.ruta,
              parada: vb.parada,
              tipo: vb.tipo,
              pasajeroTipo: vb.pasajeroTipo || 'normal',
              tarifaOficial: Number(vb.tarifaOficial) || 0,
              cobrado: Number(vb.cobrado) || 0,
              hora: vb.hora,
              ayudanteId: vb.ayudanteId,
              ayudanteNombre: vb.ayudanteNombre,
              syncStatus: vb.syncStatus || 'synced',
            },
            update: {},
          });
          boletosRestaurados++;
        } catch (vbErr: any) {
          // Omitir si hay inconsistencia menor
        }
      }
      summaryResults.ventasBoletos = boletosRestaurados;
    }

    return NextResponse.json({
      success: true,
      message: 'Base de datos restaurada exitosamente desde el respaldo',
      summary: summaryResults,
      warnings: warnings.length > 0 ? warnings : undefined,
    });
  } catch (error: any) {
    console.error('Error general restaurando respaldo:', error);
    return NextResponse.json({
      error: error?.message || 'Error al restaurar respaldo en base de datos',
      details: error?.code ? `Código Prisma: ${error.code}` : undefined,
    }, { status: 500 });
  }
}
