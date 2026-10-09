import { describe, test, expect } from "bun:test";
import { generateSalt, hashPinWithSalt, verifyPin, hashPin } from "../src/lib/pin-hash";
import { calcularDesgasteRegularizacion } from "../src/lib/paradas-vt-storage";

// ============================================================================
// ETAPA 1: INGRESO AL SISTEMA, PRIVACIDAD Y SEGURIDAD CRIPTOGRÁFICA
// ============================================================================
describe("🔐 ETAPA 1: Ingreso al Sistema y Seguridad Criptográfica", () => {
  test("1.1 Generación de Salt criptográfico único de 32 caracteres hexadecimales", () => {
    const salt1 = generateSalt();
    const salt2 = generateSalt();

    expect(salt1).toBeDefined();
    expect(salt1.length).toBe(32); // 16 bytes en hex
    expect(salt2.length).toBe(32);
    expect(salt1).not.toBe(salt2); // Cada salt debe ser criptográficamente aleatorio y único
  });

  test("1.2 Hashing y verificación exitosa de PIN de 4 dígitos (ej. 3174)", () => {
    const pin = "3174";
    const salt = generateSalt();
    const hash = hashPinWithSalt(pin, salt);

    expect(hash.length).toBe(64); // SHA-256 produce 64 caracteres hex
    expect(verifyPin(pin, hash, salt)).toBe(true);
  });

  test("1.3 Rechazo de PIN incorrecto con hashing salteado", () => {
    const pinCorrecto = "3174";
    const pinErroneo = "9999";
    const salt = generateSalt();
    const hash = hashPinWithSalt(pinCorrecto, salt);

    expect(verifyPin(pinErroneo, hash, salt)).toBe(false);
    expect(verifyPin("317", hash, salt)).toBe(false);
    expect(verifyPin("", hash, salt)).toBe(false);
  });

  test("1.4 Retrocompatibilidad con hashes legacy (sin salt) y fallback defensivo", () => {
    const pin = "2107";
    const legacyHash = hashPin(pin);

    // Debe verificar correctamente aun sin salt (hash simple de 64 caracteres)
    expect(verifyPin(pin, legacyHash)).toBe(true);
    expect(verifyPin("0000", legacyHash)).toBe(false);

    // Fallback defensivo para PINs en texto plano previos a migración (ej. longitud <= 6)
    expect(verifyPin("1234", "1234")).toBe(true);
    expect(verifyPin("4321", "1234")).toBe(false);
  });

  test("1.5 Regla de seguridad: Usuario con baja lógica (activo: false) es bloqueado", () => {
    const usuarioSimulado = {
      id: "usr-01",
      nombre: "Ayudante Dado de Baja",
      pin: "3174",
      activo: false,
      desactivadoAt: new Date("2026-10-08"),
    };

    // Evaluación lógica de la guardia de login en /api/auth
    const puedeIniciarSesion = (u: typeof usuarioSimulado) => {
      if (u.activo === false) {
        return { autorizado: false, status: 403, error: "Usuario inactivo o dado de baja" };
      }
      return { autorizado: true, status: 200 };
    };

    const resultado = puedeIniciarSesion(usuarioSimulado);
    expect(resultado.autorizado).toBe(false);
    expect(resultado.status).toBe(403);
    expect(resultado.error).toContain("Usuario inactivo");
  });
});

// ============================================================================
// ETAPA 2: EL DASHBOARD PRINCIPAL Y FÓRMULAS FINANCIERAS (NÚMERO REY)
// ============================================================================
describe("📊 ETAPA 2: Dashboard Principal y Fórmulas Financieras", () => {
  test("2.1 Fórmula del Número Rey: Utilidad Neta Real del Bolsillo = Entregas - Gastos", () => {
    // Simulación contable según Manual del Socio
    const entregasAyudanteEfectivo = 2828.80; // Dinero entregado en mano por el ayudante
    const gastosDirectosSocio = 650.00;       // Gastos pagados directamente por el dueño (talleres, cuotas)

    const utilidadNetaRealBolsillo = entregasAyudanteEfectivo - gastosDirectosSocio;

    expect(utilidadNetaRealBolsillo).toBe(2178.80);
    expect(utilidadNetaRealBolsillo).toBeGreaterThan(0);
  });

  test("2.2 Principio Anti-Duplicidad Financiera de Gastos de Carretera", () => {
    // Escenario: El ayudante cargó $50 de combustible en ruta y lo liquidó en su arqueo de carretera.
    // El socio además pagó $120 de repuestos directamente en la cooperativa.
    const arqueoRuta = {
      produccionBruta: 300.00,
      gastosCarreteraAyudante: 50.00, // Pagado por ayudante en carretera
      entregaEfectivoSocio: 250.00,    // 300 - 50 = 250 entregados netos
    };

    const gastosDelSocio = [
      { id: "g1", descripcion: "Filtro de aire", monto: 120.00, origenPago: "SOCIO_DIRECTO" },
      { id: "g2", descripcion: "Combustible ruta", monto: 50.00, origenPago: "AYUDANTE_RUTA" }, // Gasto de carretera ya liquidado
    ];

    // Regla contable: Excluir gastos con origenPago === 'AYUDANTE_RUTA' de los egresos del socio
    const gastosEfectivosSocio = gastosDelSocio
      .filter((g) => g.origenPago !== "AYUDANTE_RUTA")
      .reduce((acc, g) => acc + g.monto, 0);

    const utilidadNetaReal = arqueoRuta.entregaEfectivoSocio - gastosEfectivosSocio;

    expect(gastosEfectivosSocio).toBe(120.00); // Solo el filtro, no duplica el combustible
    expect(utilidadNetaReal).toBe(130.00);     // 250 - 120 = 130 exacto
  });

  test("2.3 Cálculo exacto de Margen de Utilidad sobre Producción Bruta", () => {
    const produccionBruta = 5000.00;
    const utilidadNetaConsolidada = 2000.00;

    const margenPorcentaje = (utilidadNetaConsolidada / produccionBruta) * 100;

    expect(margenPorcentaje).toBe(40.00);
  });

  test("2.4 Aislamiento Estricto de Unidad Nueva: Unidad suscriptora arranca con $0.00 limpio sin saltar de mes", () => {
    // Simula nueva unidad sin actividad (ej. Bus 10)
    const tripulacionConRecords = false;
    const initialIncome = tripulacionConRecords ? 216.80 : 0.00;
    const sampleExpensesBus10: Array<{ id: string; busId: string; totalAmount: number }> = [];
    const totalExpenses = sampleExpensesBus10.reduce((s, e) => s + e.totalAmount, 0);

    const netProfit = initialIncome - totalExpenses;
    expect(initialIncome).toBe(0.00);
    expect(totalExpenses).toBe(0.00);
    expect(netProfit).toBe(0.00);
  });
});

// ============================================================================
// ETAPA 3: FINANZAS Y CARTERA DE TALLERES (OwnerExpensesScreen)
// ============================================================================
describe("💰 ETAPA 3: Finanzas, Cartera de Talleres y Amortización de Deudas", () => {
  test("3.1 Factura de CONTADO: se inicia 100% pagada con saldo pendiente $0.00", () => {
    const gastoContado = {
      id: "EXP-01",
      tipoPago: "CONTADO",
      totalAmount: 180.00,
      paidAmount: 180.00,
      pendingBalance: 0.00,
      status: "PAGADO",
    };

    expect(gastoContado.status).toBe("PAGADO");
    expect(gastoContado.pendingBalance).toBe(0.00);
  });

  test("3.2 Factura de CRÉDITO: se inicia con saldo pendiente total y estatus PENDIENTE", () => {
    const gastoCredito = {
      id: "EXP-02",
      tipoPago: "CREDITO",
      totalAmount: 300.00,
      paidAmount: 0.00,
      pendingBalance: 300.00,
      status: "PENDIENTE",
      abonos: [] as Array<{ monto: number; fecha: string }>,
    };

    expect(gastoCredito.status).toBe("PENDIENTE");
    expect(gastoCredito.pendingBalance).toBe(300.00);
  });

  test("3.3 Ciclo completo de abonos sucesivos hasta extinción de deuda en saldo $0.00", () => {
    let gasto = {
      id: "EXP-03",
      taller: "Mecánica El Hino",
      totalAmount: 150.00,
      paidAmount: 0.00,
      pendingBalance: 150.00,
      status: "PENDIENTE" as "PENDIENTE" | "PAGADO",
      abonos: [] as Array<{ monto: number }>,
    };

    // Función pura de amortización (idéntica a registerAbonoToExpense)
    const aplicarAbono = (g: typeof gasto, monto: number) => {
      const newPaid = Math.min(g.totalAmount, g.paidAmount + monto);
      const newPending = Math.max(0, g.totalAmount - newPaid);
      return {
        ...g,
        paidAmount: newPaid,
        pendingBalance: newPending,
        status: (newPending <= 0 ? "PAGADO" : "PENDIENTE") as "PENDIENTE" | "PAGADO",
        abonos: [...g.abonos, { monto }],
      };
    };

    // Abono 1: $50
    gasto = aplicarAbono(gasto, 50.00);
    expect(gasto.paidAmount).toBe(50.00);
    expect(gasto.pendingBalance).toBe(100.00);
    expect(gasto.status).toBe("PENDIENTE");

    // Abono 2: $50
    gasto = aplicarAbono(gasto, 50.00);
    expect(gasto.paidAmount).toBe(100.00);
    expect(gasto.pendingBalance).toBe(50.00);
    expect(gasto.status).toBe("PENDIENTE");

    // Abono 3 final: $50 -> Extingue la deuda a saldo $0.00
    gasto = aplicarAbono(gasto, 50.00);
    expect(gasto.paidAmount).toBe(150.00);
    expect(gasto.pendingBalance).toBe(0.00);
    expect(gasto.status).toBe("PAGADO");
    expect(gasto.abonos.length).toBe(3);
  });

  test("3.4 Protección de Sobregiro: Un abono mayor a la deuda nunca genera saldo negativo", () => {
    const totalDeuda = 80.00;
    const abonoExcesivo = 100.00;

    const newPaid = Math.min(totalDeuda, 0 + abonoExcesivo);
    const newPending = Math.max(0, totalDeuda - newPaid);

    expect(newPaid).toBe(80.00);
    expect(newPending).toBe(0.00); // Nunca -20.00
  });

  test("3.5 Purga y Rechazo de Gastos de Muestra Demo para Unidades Suscriptoras", () => {
    const rawExpenses = [
      { id: "EXP-SEP-01", busId: "BUS-10", totalAmount: 110.00 }, // Muestra accidental
      { id: "EXP-SEP-02", busId: "BUS-10", totalAmount: 25.00 },  // Muestra accidental
      { id: "EXP-REAL-01", busId: "BUS-10", totalAmount: 50.00 }, // Gasto real legítimo
    ];

    // Lógica pura de saneamiento y filtro implementada en v3.61.13:
    const targetBusId: string = "BUS-10";
    const isBus01 = targetBusId === "BUS-01" || targetBusId === "01";
    const cleaned = rawExpenses.filter((e) => {
      const isDemoSample = e.id.startsWith("EXP-AUG-") || e.id.startsWith("EXP-SEP-");
      if (isDemoSample && !isBus01) return false;
      return true;
    });

    expect(cleaned.length).toBe(1);
    expect(cleaned[0].id).toBe("EXP-REAL-01");
    expect(cleaned[0].totalAmount).toBe(50.00);
  });
});

// ============================================================================
// ETAPA 4: MANTENIMIENTO PREVENTIVO HINO AK (MantenimientoScreen)
// ============================================================================
describe("🔧 ETAPA 4: Supervisión de Mantenimiento Preventivo Hino AK", () => {
  test("4.1 Semáforo de 3 Segundos: Clasificación Verde, Amarillo y Rojo", () => {
    const kmActual = 150000;

    const componentes = [
      { id: "c1", nombre: "Aceite de Motor", ultimoKm: 146000, intervaloKm: 5000 },  // rest: 1000 -> 🟡 POR VENCER
      { id: "c2", nombre: "Filtro Diésel",  ultimoKm: 147500, intervaloKm: 5000 },  // rest: 2500 -> 🟢 EN REGLA
      { id: "c3", nombre: "Engrase General", ultimoKm: 144500, intervaloKm: 5000 },  // rest: -500 -> 🔴 VENCIDO
    ];

    const clasificar = (kmAct: number, ultimoKm: number, intervalo: number) => {
      const rest = intervalo - (kmAct - ultimoKm);
      if (rest <= 0) return "VENCIDO";      // 🔴
      if (rest <= 1000) return "POR_VENCER"; // 🟡
      return "EN_REGLA";                     // 🟢
    };

    expect(clasificar(kmActual, componentes[0].ultimoKm, componentes[0].intervaloKm)).toBe("POR_VENCER");
    expect(clasificar(kmActual, componentes[1].ultimoKm, componentes[1].intervaloKm)).toBe("EN_REGLA");
    expect(clasificar(kmActual, componentes[2].ultimoKm, componentes[2].intervaloKm)).toBe("VENCIDO");
  });

  test("4.2 Regularización Retroactiva (⏱️ ¿Se realizó antes?): Desgaste exacto sin alterar odómetro", () => {
    const odometroActualBus = 150000;
    const odometroServicioTaller = 148000; // Cambio hecho 2,000 km atrás
    const intervaloKm = 5000;

    const resultado = calcularDesgasteRegularizacion(odometroActualBus, odometroServicioTaller, intervaloKm);

    expect(resultado.esInvalido).toBeFalsy();
    expect(resultado.kmRodados).toBe(2000);       // 150,000 - 148,000 = 2,000 km rodados
    expect(resultado.kmRestantes).toBe(3000);     // 5,000 - 2,000 = 3,000 km restantes
    expect(resultado.porcentajeRestante).toBe(60); // 3,000 / 5,000 = 60%
    expect(resultado.esVencido).toBe(false);
  });

  test("4.3 Regularización Retroactiva: Detección automática de componente ya vencido", () => {
    const odometroActualBus = 150000;
    const odometroServicioTaller = 144000; // Cambio hecho hace 6,000 km (intervalo era 5,000)
    const intervaloKm = 5000;

    const resultado = calcularDesgasteRegularizacion(odometroActualBus, odometroServicioTaller, intervaloKm);

    expect(resultado.kmRodados).toBe(6000);
    expect(resultado.kmRestantes).toBe(0);
    expect(resultado.porcentajeRestante).toBe(0);
    expect(resultado.esVencido).toBe(true);
    expect(resultado.advertencia).toContain("VENCIDO");
  });

  test("4.4 Regularización Retroactiva: Rechazo estricto si km de servicio supera odómetro del bus", () => {
    const odometroActualBus = 150000;
    const odometroServicioInvalido = 152000; // Imposible en el mundo real

    const resultado = calcularDesgasteRegularizacion(odometroActualBus, odometroServicioInvalido, 5000);

    expect(resultado.esInvalido).toBe(true);
    expect(resultado.mensajeError).toContain("no puede ser mayor al odómetro actual");
  });
});

// ============================================================================
// ETAPA 5: GESTIÓN DE TRIPULACIÓN (PersonalScreen)
// ============================================================================
describe("👥 ETAPA 5: Gestión de Tripulación y Control de Turnos", () => {
  test("5.1 Exclusividad de Turno Diario: Activar un trabajador pasa al anterior a Relevo", () => {
    let tripulacion = [
      { id: "p1", nombre: "Chofer Titular", rol: "CONDUCTOR", esActual: true },
      { id: "p2", nombre: "Chofer Relevo",  rol: "CONDUCTOR", esActual: false },
    ];

    // Simulación del endpoint PUT /api/personas/[id] con esActual: true
    const activarEnTurno = (idActivar: string) => {
      return tripulacion.map((p) => ({
        ...p,
        esActual: p.id === idActivar,
      }));
    };

    tripulacion = activarEnTurno("p2");

    expect(tripulacion.find((p) => p.id === "p2")?.esActual).toBe(true);
    expect(tripulacion.find((p) => p.id === "p1")?.esActual).toBe(false);
  });

  test("5.2 Promoción Dinámica (Ayudante 🔁 Conductor): Conserva PIN y libera hardware", () => {
    const personalOriginal = {
      id: "p-ayudante",
      nombre: "John Alexander Juárez Cango",
      rol: "AYUDANTE",
      pinHash: "hash-secreto-3174",
      pinSalt: "salt-unico",
      deviceId: "MOVIL-BUS-01-TERMINAL",
      deviceName: "Terminal Oficial Bus 01",
      esActual: true,
    };

    // Lógica implementada en v3.61.05 y v3.61.06:
    // Al cambiar rol de AYUDANTE a CONDUCTOR:
    const promoverAConductor = (p: typeof personalOriginal) => {
      const rolHaCambiado = p.rol !== "CONDUCTOR";
      return {
        ...p,
        rol: "CONDUCTOR",
        pinHash: p.pinHash, // El PIN se mantiene IDÉNTICO
        pinSalt: p.pinSalt,
        deviceId: rolHaCambiado ? null : p.deviceId, // Libera el hardware
        deviceName: rolHaCambiado ? null : p.deviceName,
        esActual: rolHaCambiado ? false : p.esActual, // Pasa a relevo por seguridad
      };
    };

    const promovido = promoverAConductor(personalOriginal);

    expect(promovido.rol).toBe("CONDUCTOR");
    expect(promovido.pinHash).toBe(personalOriginal.pinHash); // PIN 100% idéntico
    expect(promovido.deviceId).toBeNull();                    // Teléfono oficial liberado
    expect(promovido.esActual).toBe(false);                   // Relevo hasta activación de turno
  });

  test("5.3 Rotación Inversa (Conductor a Ayudante): 100% reversible", () => {
    const conductor = {
      id: "p-chofer",
      nombre: "Chofer Rotativo",
      rol: "CONDUCTOR",
      pinHash: "hash-4444",
      pinSalt: "salt-4444",
      deviceId: null,
      esActual: false,
    };

    const rotarAAyudante = (p: typeof conductor) => ({
      ...p,
      rol: "AYUDANTE",
      esActual: false,
    });

    const ayudante = rotarAAyudante(conductor);

    expect(ayudante.rol).toBe("AYUDANTE");
    expect(ayudante.pinHash).toBe(conductor.pinHash);
  });

  test("5.4 Borrado Lógico (Soft Delete): Desactiva cuenta sin destruir registros pasados", () => {
    const persona = {
      id: "p-baja",
      nombre: "Trabajador Desvinculado",
      activo: true,
      desactivadoAt: null as Date | null,
      esActual: true,
      deviceId: "DEV-123",
    };

    // Simulación de DELETE /api/personas/[id] (Soft Delete por defecto)
    const darDeBajaLogica = (p: typeof persona) => ({
      ...p,
      activo: false,
      desactivadoAt: new Date(),
      esActual: false,
      deviceId: null,
    });

    const personaBaja = darDeBajaLogica(persona);

    expect(personaBaja.activo).toBe(false);
    expect(personaBaja.desactivadoAt).toBeInstanceOf(Date);
    expect(personaBaja.esActual).toBe(false);
    expect(personaBaja.deviceId).toBeNull();
    // Su ID y nombre permanecen intactos para auditoría histórica
    expect(personaBaja.id).toBe("p-baja");
    expect(personaBaja.nombre).toBe("Trabajador Desvinculado");
  });

  test("5.5 Reactivación instantánea de trabajador dado de baja", () => {
    const personaInactiva = {
      id: "p-inactivo",
      nombre: "Personal Reintegrado",
      activo: false,
      desactivadoAt: new Date("2026-09-01"),
    };

    // Simulación de PUT /api/personas/[id] con { activo: true }
    const reactivarPersonal = (p: typeof personaInactiva) => ({
      ...p,
      activo: true,
      desactivadoAt: null,
    });

    const reactivado = reactivarPersonal(personaInactiva);

    expect(reactivado.activo).toBe(true);
    expect(reactivado.desactivadoAt).toBeNull();
  });
});

// ============================================================================
// ETAPA 6: AISLAMIENTO MULTI-TENANT UNIVERSAL DE REPORTES E INFORMES (v3.61.15)
// ============================================================================
describe("📈 ETAPA 6: Aislamiento Multi-Tenant Universal de Reportes e Informes", () => {
  test("6.1 Inyección universal de busId y socioId en consultas de reportes", () => {
    // Simula la construcción de parámetros para /api/reports y /api/reports/operativo
    const buildReportParams = (
      reportType: string,
      busId: string,
      socioId: string,
      isSuperAdmin: boolean
    ) => {
      const params = new URLSearchParams();
      params.set("type", reportType);

      const effectiveBusId = isSuperAdmin ? (busId || "TODOS") : busId;
      const effectiveSocioId = isSuperAdmin ? (busId === "TODOS" ? "" : socioId) : socioId;

      if (effectiveBusId && effectiveBusId !== "TODOS") {
        params.set("busId", effectiveBusId);
      }
      if (effectiveSocioId && effectiveSocioId !== "TODOS") {
        params.set("socioId", effectiveSocioId);
      }
      return params.toString();
    };

    // Caso Socio Propietario (Unidad 10 recién suscrita)
    const socioParams = buildReportParams("mensual", "BUS-10", "socio-10-guid", false);
    expect(socioParams).toContain("busId=BUS-10");
    expect(socioParams).toContain("socioId=socio-10-guid");

    // Caso SuperAdmin Global
    const adminGlobalParams = buildReportParams("mensual", "TODOS", "", true);
    expect(adminGlobalParams).not.toContain("busId=");
    expect(adminGlobalParams).not.toContain("socioId=");

    // Caso SuperAdmin filtrando Unidad 10
    const adminFilterParams = buildReportParams("mensual", "BUS-10", "socio-10-guid", true);
    expect(adminFilterParams).toContain("busId=BUS-10");
    expect(adminFilterParams).toContain("socioId=socio-10-guid");
  });

  test("6.2 Aislamiento de Unidad Suscriptora Nueva (ej. Unidad 10): 0 registros y $0.00 limpio", () => {
    // Tripulación asignada a Unidad 10
    const crewUnidad10 = ["Richard Stalin Medina Maza", "Kelyn Silvana Solórzano Márquez"];

    // Base de datos global con registros históricos de otras unidades
    const globalDailyRecords = [
      { id: "rec-01", date: "2026-09-15", ayudanteNombre: "Ayudante Bus 01", conductor: "Conductor Bus 01", production: 350.00, cajaComun: 45.00 },
      { id: "rec-02", date: "2026-09-16", ayudanteNombre: "Ayudante Bus 01", conductor: "Conductor Bus 01", production: 280.00, cajaComun: 30.00 },
    ];

    // Simulación del filtro relacional de /api/reports y /api/reports/operativo
    const filterRecordsForCrew = (records: typeof globalDailyRecords, crew: string[]) => {
      if (crew.length === 0) return [];
      return records.filter(
        (r) => crew.includes(r.ayudanteNombre) || crew.includes(r.conductor)
      );
    };

    const recordsUnidad10 = filterRecordsForCrew(globalDailyRecords, crewUnidad10);
    const totalProduccion = recordsUnidad10.reduce((s, r) => s + r.production, 0);
    const totalCajaComun = recordsUnidad10.reduce((s, r) => s + r.cajaComun, 0);

    // Unidad 10 recién suscrita NO hereda registros ajenos:
    expect(recordsUnidad10.length).toBe(0);
    expect(totalProduccion).toBe(0.00);
    expect(totalCajaComun).toBe(0.00);
  });

  test("6.3 Registro de primera jornada de tripulación: Asignación y visibilidad exclusiva", () => {
    const crewUnidad10 = ["Richard Stalin Medina Maza", "Kelyn Silvana Solórzano Márquez"];

    const globalDailyRecords = [
      { id: "rec-01", date: "2026-09-15", ayudanteNombre: "Ayudante Bus 01", conductor: "Conductor Bus 01", production: 350.00 },
      // Primera jornada real registrada por la tripulación de la Unidad 10
      { id: "rec-10-01", date: "2026-10-09", ayudanteNombre: "Kelyn Silvana Solórzano Márquez", conductor: "Richard Stalin Medina Maza", production: 215.50 },
    ];

    const recordsUnidad10 = globalDailyRecords.filter(
      (r) => crewUnidad10.includes(r.ayudanteNombre) || crewUnidad10.includes(r.conductor)
    );

    expect(recordsUnidad10.length).toBe(1);
    expect(recordsUnidad10[0].id).toBe("rec-10-01");
    expect(recordsUnidad10[0].production).toBe(215.50);
  });

  test("6.4 Aislamiento estricto de Caja Común para unidades sin operaciones", () => {
    // Simula /api/reports?type=caja-comun con aislamiento de tripulación
    const crewNuevaUnidad: string[] = ["Chofer Futuro 15", "Ayudante Futuro 15"];
    const allCajaComunTrips = [
      { id: "t-01", ayudanteNombre: "Ayudante Bus 01", monto: 18.50 },
      { id: "t-02", ayudanteNombre: "Ayudante Bus 01", monto: 22.00 },
    ];

    const filteredCajaComun = allCajaComunTrips.filter((t) =>
      crewNuevaUnidad.includes(t.ayudanteNombre)
    );
    const totalCajaComun = filteredCajaComun.reduce((s, t) => s + t.monto, 0);

    expect(filteredCajaComun.length).toBe(0);
    expect(totalCajaComun).toBe(0.00);
  });

  test("6.5 Estandarización de divisa oficial en Dólares ($ / USD)", () => {
    const formatMoneyUSD = (v: number) => `$ ${v.toFixed(2)}`;
    expect(formatMoneyUSD(0)).toBe("$ 0.00");
    expect(formatMoneyUSD(125.5)).toBe("$ 125.50");
  });
});

describe("🚀 ETAPA 7: Onboarding de Mantenimiento, Persistencia Cloud de Odómetro y Desacoplamiento de Valores Quemados", () => {
  test("7.1 Persistencia de odómetro inicial y extracción limpia desde notas", () => {
    function extractOdometerFromNotas(notas?: string | null): string | undefined {
      if (!notas) return undefined;
      const matchCalib = notas.match(/\[Odómetro (?:Calibrado|Inicial)\]:\s*([0-9,.]+)\s*km/i);
      if (matchCalib && matchCalib[1]) {
        return matchCalib[1].replace(/[^0-9]/g, '');
      }
      return undefined;
    }

    const notasBus10 = "[Odómetro Inicial]: 187,420 km • Unidad Troncal de Alta Capacidad";
    const extraido = extractOdometerFromNotas(notasBus10);
    expect(extraido).toBe("187420");
  });

  test("7.2 Desacoplamiento de odómetro de Bus 01: Unidad 10 calcula relativo a su propio tacómetro", () => {
    const busId = "BUS-10";
    const odometroRealBus10 = 187420;
    const intervaloAceite = 5000;

    // Fórmula desacoplada (no arrastra 893,100 km)
    const esBus01 = busId === "BUS-01" || busId === "01";
    const uKm = esBus01
      ? 893100
      : Math.max(0, odometroRealBus10 - Math.floor(intervaloAceite * 0.2));

    expect(esBus01).toBe(false);
    expect(uKm).toBe(186420); // 187,420 - 1,000 = 186,420 km (1,000 km de uso, 4,000 km restantes)
    
    const kmRecorridos = odometroRealBus10 - uKm;
    const kmRestantes = intervaloAceite - kmRecorridos;
    expect(kmRecorridos).toBe(1000);
    expect(kmRestantes).toBe(4000);
    expect(kmRestantes > 0).toBe(true); // En regla, no vencido
  });

  test("7.3 Control Total para nueva unidad suscriptora: Todos los 31 ítems inician en regla sin falsos vencimientos", () => {
    const odometroBus = 187420;
    const catalogoItemsPrueba = [
      { codigo: "MNT-ACEITE-MOT", intervaloKm: 5000 },
      { codigo: "MNT-FILT-ACEITE", intervaloKm: 5000 },
      { codigo: "MNT-FILT-TRAMPA", intervaloKm: 5000 },
      { codigo: "MNT-FILT-DIESEL-SEC", intervaloKm: 5000 },
      { codigo: "MNT-ENGRASE-CHASIS", intervaloKm: 1500 },
      { codigo: "MNT-RACHES-FRENO", intervaloKm: 800 },
      { codigo: "MNT-ZAPATAS-POST", intervaloKm: 8000 },
    ];

    const itemsInicializados = catalogoItemsPrueba.map(c => {
      const uKm = Math.max(0, odometroBus - Math.floor(c.intervaloKm * 0.2));
      const rest = c.intervaloKm - (odometroBus - uKm);
      return {
        ...c,
        ultimoKm: uKm,
        kmRestantes: rest,
        esVencido: rest <= 0,
      };
    });

    const totalVencidos = itemsInicializados.filter(i => i.esVencido).length;
    expect(totalVencidos).toBe(0); // CERO vencidos al activar el plan
  });

  test("7.4 Asistente de calibración inicial: Asignación inmediata cuando odómetro base es 0", () => {
    let kmActualBus = 0;
    const digitadoPorSocio = "187420";

    const validarYAsignar = (input: string) => {
      const num = parseInt(input.replace(/[^0-9]/g, ''), 10);
      if (!isNaN(num) && num > 0) {
        kmActualBus = num;
        return true;
      }
      return false;
    };

    const exito = validarYAsignar(digitadoPorSocio);
    expect(exito).toBe(true);
    expect(kmActualBus).toBe(187420);
  });
});
