import { describe, test, expect, beforeEach } from "bun:test";

// Mock de entornos de almacenamiento aislados para Socio y Ayudante
const socioStorage: Record<string, string> = {};
const ayudanteStorage: Record<string, string> = {};

let currentActiveContext: "socio" | "ayudante" = "socio";

const mockLocalStorage = {
  getItem: (k: string) => {
    const store = currentActiveContext === "socio" ? socioStorage : ayudanteStorage;
    return store[k] ?? null;
  },
  setItem: (k: string, v: string) => {
    const store = currentActiveContext === "socio" ? socioStorage : ayudanteStorage;
    store[k] = String(v);
  },
  removeItem: (k: string) => {
    const store = currentActiveContext === "socio" ? socioStorage : ayudanteStorage;
    delete store[k];
  },
  clear: () => {
    Object.keys(socioStorage).forEach((k) => delete socioStorage[k]);
    Object.keys(ayudanteStorage).forEach((k) => delete ayudanteStorage[k]);
  },
  length: 0,
  key: () => null,
};

(globalThis as any).window = {
  dispatchEvent: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
};
(globalThis as any).localStorage = mockLocalStorage;

import {
  DEFAULT_PROMO_CONFIG,
  loadPromoConfig,
  savePromoConfig,
  type PromoViajeGratisConfig,
  getBusPromoStorageKey,
} from "../src/components/transport/types-boletos";
import {
  extractPromoConfigFromNotas,
  injectPromoConfigToNotas,
} from "../src/app/api/buses/route";
import { saveBus, type BusItem } from "../src/lib/fleet-storage";
import { generateTicketBytes, type TicketData } from "../src/lib/ticket-escpos";

function decodeTicket(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

describe("🔄 TEST E2E: ACTIVACIÓN POR EL SOCIO Y SINCRONIZACIÓN HACIA EL AYUDANTE", () => {
  beforeEach(() => {
    mockLocalStorage.clear();
    currentActiveContext = "socio";
  });

  test("PASO 1: Dispositivo limpio del ayudante arranca con Viaje Gratis APAGADO", () => {
    // Simulamos la terminal del Ayudante (Jorge Patiño en Unidad 01)
    currentActiveContext = "ayudante";

    // Al iniciar turno sin datos previos
    const promoInicialAyudante = loadPromoConfig("BUS-01");
    expect(promoInicialAyudante.activa).toBe(false);
    expect(DEFAULT_PROMO_CONFIG.activa).toBe(false);
  });

  test("PASO 2: El Socio activa la promoción en su panel de Flota y se persiste a PostgreSQL", () => {
    // Simulamos el dispositivo del Socio (José Jaya en Unidad 01)
    currentActiveContext = "socio";

    // Socio define política promocional exclusiva para su autobús
    const promoSocio: PromoViajeGratisConfig = {
      activa: true,
      rangoMin: 3,
      rangoMax: 15,
      textoPublicidad: "Viaja Gratis con Unidad 01 de Don José Jaya",
      sonidoGanador: true,
    };

    // 1. Guarda en almacenamiento del socio
    savePromoConfig(promoSocio, "BUS-01");
    const loadedSocio = loadPromoConfig("BUS-01");
    expect(loadedSocio.activa).toBe(true);
    expect(loadedSocio.textoPublicidad).toBe("Viaja Gratis con Unidad 01 de Don José Jaya");

    // 2. Persistencia en base de datos PostgreSQL mediante injectPromoConfigToNotas
    const notasBDOriginal = "[Odómetro Calibrado]: 893,485 km el 2026-10-28 • Unidad Troncal";
    const notasBDPersistidas = injectPromoConfigToNotas(notasBDOriginal, promoSocio);

    expect(notasBDPersistidas).toContain("[PromoConfig]:");
    expect(notasBDPersistidas).toContain('"activa":true');
    expect(notasBDPersistidas).toContain('"rangoMax":15');
    expect(notasBDPersistidas).toContain("[Odómetro Calibrado]: 893,485 km");

    // 3. Simulación de respuesta de la API REST /api/buses
    const promoExtraidaAPI = extractPromoConfigFromNotas(notasBDPersistidas);
    expect(promoExtraidaAPI).toBeDefined();
    expect(promoExtraidaAPI?.activa).toBe(true);
    expect(promoExtraidaAPI?.rangoMin).toBe(3);
    expect(promoExtraidaAPI?.rangoMax).toBe(15);
    expect(promoExtraidaAPI?.textoPublicidad).toBe("Viaja Gratis con Unidad 01 de Don José Jaya");
  });

  test("PASO 3: Preservación frente a calibraciones de odómetro simultáneas", () => {
    const promoActiva: PromoViajeGratisConfig = {
      activa: true,
      rangoMin: 5,
      rangoMax: 20,
      textoPublicidad: "RutaGo Promo",
      sonidoGanador: true,
    };
    const notasPrevias = `[PromoConfig]:${JSON.stringify(promoActiva)} • [Odómetro Calibrado]: 890,000 km`;

    // Calibración de odómetro en /api/buses/odometro
    const promoMatch = notasPrevias.match(/\[PromoConfig\]:\s*\{.*?\}/);
    expect(promoMatch).not.toBeNull();

    const nuevoKm = 894500;
    const notaAuditoria = `${promoMatch![0]} • [Odómetro Calibrado]: ${nuevoKm.toLocaleString()} km el 2026-10-28 por Socio Propietario`;

    // Se verifica que la calibración preservó la política del socio
    const promoRestaurada = extractPromoConfigFromNotas(notaAuditoria);
    expect(promoRestaurada?.activa).toBe(true);
    expect(promoRestaurada?.rangoMax).toBe(20);
    expect(notaAuditoria).toContain("894,500 km");
  });

  test("PASO 4: El Ayudante descarga la configuración oficial y su boletera se activa", () => {
    // 1. Estado en el servidor central (PostgreSQL)
    const serverBusItem: BusItem = {
      id: "BUS-01",
      numeroDisco: "01",
      placa: "TAA-5152",
      marca: "Hino AK",
      propietario: "José Leonardo Jaya",
      tipoOperacion: "TRONCAL_VT",
      activo: true,
      promoConfig: {
        activa: true,
        rangoMin: 3,
        rangoMax: 15,
        textoPublicidad: "Viaja Gratis con Unidad 01 de Don José Jaya",
        sonidoGanador: true,
      },
    };

    // 2. Cambiamos al teléfono del Ayudante (Jorge Patiño)
    currentActiveContext = "ayudante";

    // Antes de sincronizar, la terminal del ayudante está vacía (activa: false)
    expect(loadPromoConfig("BUS-01").activa).toBe(false);

    // Al abrir HomeScreenVT / FrecuenciaSelector se hidrata la flota desde la API:
    // fleet-storage saveBus() sincroniza automáticamente promoConfig
    saveBus(serverBusItem);

    // 3. Verificación en la terminal del Ayudante: ¡AHORA ESTÁ ACTIVA!
    const promoAyudante = loadPromoConfig("BUS-01");
    expect(promoAyudante.activa).toBe(true);
    expect(promoAyudante.rangoMin).toBe(3);
    expect(promoAyudante.rangoMax).toBe(15);
    expect(promoAyudante.textoPublicidad).toBe("Viaja Gratis con Unidad 01 de Don José Jaya");
  });

  test("PASO 5: Emisión de boleto premiado $0.00 en la terminal del Ayudante", () => {
    currentActiveContext = "ayudante";

    // Boleto ordinario cobrado normal ($0.75)
    const boletoNormal: TicketData = {
      cooperativa: "VilcabambaTuris",
      disco: "01",
      placa: "TAA-5152",
      fecha: "2026-10-28",
      hora: "10:45",
      horaFrecuencia: "10:30",
      ruta: "Loja - Vilcabamba",
      destino: "Vilcabamba",
      tipoPasajero: "Normal",
      tarifa: 0.75,
      boletoNum: 6,
      ayudanteNombre: "Jorge Patiño",
    };
    const ticketNormalStr = decodeTicket(generateTicketBytes(boletoNormal));
    expect(ticketNormalStr).toContain("$0.75");
    expect(ticketNormalStr).not.toContain("VIAJE GRATIS");

    // Boleto ganador de VIAJE GRATIS ($0.00)
    const boletoGratis: TicketData = {
      ...boletoNormal,
      boletoNum: 7,
      esViajeGratis: true,
      tarifaOriginal: 0.75,
      tarifa: 0.0,
      textoPublicidad: "Viaja Gratis con Unidad 01 de Don José Jaya",
    };
    const ticketGratisStr = decodeTicket(generateTicketBytes(boletoGratis));
    expect(ticketGratisStr).toContain("VIAJE GRATIS");
    expect(ticketGratisStr).toContain("NO DEBE PAGAR");
    expect(ticketGratisStr).toContain("Paga $0.00");
    expect(ticketGratisStr).toContain("FELICIDADES!");
    expect(ticketGratisStr).toContain("Normal: $0.75 Desc: -$0.75");
    expect(ticketGratisStr).toContain("0007");
  });

  test("PASO 6: Aislamiento estricto: el ayudante de la Unidad 08 no regala pasajes", () => {
    // Simulamos la terminal del Ayudante de la Unidad 08
    currentActiveContext = "ayudante";

    const promoBus08 = loadPromoConfig("BUS-08");
    expect(promoBus08.activa).toBe(false);

    const promoBus02 = loadPromoConfig("BUS-02");
    expect(promoBus02.activa).toBe(false);
  });

  test("PASO 7: El Socio PAUSA la promoción y el Ayudante se desactiva de inmediato", () => {
    // 1. El Socio pulsa el interruptor para apagar la promoción
    currentActiveContext = "socio";
    const promoPausada: PromoViajeGratisConfig = {
      activa: false,
      rangoMin: 3,
      rangoMax: 15,
      textoPublicidad: "Viaja Gratis con Unidad 01 de Don José Jaya",
      sonidoGanador: true,
    };
    savePromoConfig(promoPausada, "BUS-01");
    expect(loadPromoConfig("BUS-01").activa).toBe(false);

    // 2. Se actualiza en PostgreSQL
    const notasActualizadas = injectPromoConfigToNotas(
      "[Odómetro Calibrado]: 893,485 km",
      promoPausada
    );
    expect(notasActualizadas).toContain('"activa":false');

    // 3. Sincronización en la terminal del Ayudante al abrir la siguiente frecuencia
    currentActiveContext = "ayudante";
    const serverBusPausado: BusItem = {
      id: "BUS-01",
      numeroDisco: "01",
      placa: "TAA-5152",
      marca: "Hino AK",
      propietario: "José Leonardo Jaya",
      tipoOperacion: "TRONCAL_VT",
      activo: true,
      promoConfig: extractPromoConfigFromNotas(notasActualizadas),
    };

    saveBus(serverBusPausado);

    // 4. Verificación en la terminal del Ayudante: AHORA ESTÁ PAUSADA
    const promoAyudantePausada = loadPromoConfig("BUS-01");
    expect(promoAyudantePausada.activa).toBe(false);
  });
});
