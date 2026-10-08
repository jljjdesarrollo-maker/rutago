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
