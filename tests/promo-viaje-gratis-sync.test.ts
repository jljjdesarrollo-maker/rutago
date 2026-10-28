import { describe, test, expect, beforeEach } from "bun:test";

// Mock de window y localStorage para el entorno de pruebas Bun
const store: Record<string, string> = {};
const mockLocalStorage = {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => {
    store[k] = String(v);
  },
  removeItem: (k: string) => {
    delete store[k];
  },
  clear: () => {
    Object.keys(store).forEach((k) => delete store[k]);
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
  PROMO_CONFIG_KEY,
  getBusPromoStorageKey,
  loadPromoConfig,
  savePromoConfig,
  type PromoViajeGratisConfig,
} from "../src/components/transport/types-boletos";
import {
  extractPromoConfigFromNotas,
  injectPromoConfigToNotas,
} from "../src/app/api/buses/route";
import { saveBus, type BusItem } from "../src/lib/fleet-storage";

describe("🎁 PROMOCIÓN VIAJE GRATIS Y SINCRONIZACIÓN MULTI-DISPOSITIVO (v3.61.67)", () => {
  beforeEach(() => {
    mockLocalStorage.clear();
  });

  test("1. DEFAULT_PROMO_CONFIG tiene activa: false por seguridad financiera", () => {
    expect(DEFAULT_PROMO_CONFIG.activa).toBe(false);
    expect(DEFAULT_PROMO_CONFIG.rangoMin).toBe(3);
    expect(DEFAULT_PROMO_CONFIG.rangoMax).toBe(30);
    expect(DEFAULT_PROMO_CONFIG.textoPublicidad).toContain("Quieres RutaGo?");
  });

  test("2. loadPromoConfig sin configuración previa en dispositivo limpio retorna activa: false", () => {
    const configBus01 = loadPromoConfig("BUS-01");
    expect(configBus01.activa).toBe(false);

    const configBus08 = loadPromoConfig("BUS-08");
    expect(configBus08.activa).toBe(false);

    const configGlobal = loadPromoConfig();
    expect(configGlobal.activa).toBe(false);
  });

  test("3. Aislamiento estricto: legacy global activa: true NO infecta unidades no configuradas", () => {
    mockLocalStorage.setItem(
      PROMO_CONFIG_KEY,
      JSON.stringify({ activa: true, textoPublicidad: "Promo Central SaaS" })
    );

    // Unidad no configurada debe permanecer inactiva pero heredar el texto central oficial
    const bus01Config = loadPromoConfig("BUS-01");
    expect(bus01Config.activa).toBe(false);
    expect(bus01Config.textoPublicidad).toBe("Promo Central SaaS");
  });

  test("4. Aislamiento entre unidades: activar Bus 01 no activa Bus 08 ni otras unidades", () => {
    const promoBus01: PromoViajeGratisConfig = {
      activa: true,
      rangoMin: 5,
      rangoMax: 20,
      textoPublicidad: "Quieres RutaGo? 0997149000",
      sonidoGanador: true,
    };

    savePromoConfig(promoBus01, "BUS-01");

    const loadedBus01 = loadPromoConfig("BUS-01");
    expect(loadedBus01.activa).toBe(true);
    expect(loadedBus01.rangoMin).toBe(5);
    expect(loadedBus01.rangoMax).toBe(20);

    const loadedBus08 = loadPromoConfig("BUS-08");
    expect(loadedBus08.activa).toBe(false);

    const loadedBus02 = loadPromoConfig("02");
    expect(loadedBus02.activa).toBe(false);
  });

  test("5. Serialización en PostgreSQL: extractPromoConfigFromNotas e injectPromoConfigToNotas", () => {
    const originalNotas =
      "[Odómetro Calibrado]: 890,000 km el 2026-10-25 por Socio • Observación técnica";
    const promo: PromoViajeGratisConfig = {
      activa: true,
      rangoMin: 4,
      rangoMax: 25,
      textoPublicidad: "RutaGo Publicidad",
      sonidoGanador: true,
    };

    const notasConPromo = injectPromoConfigToNotas(originalNotas, promo);
    expect(notasConPromo).toContain("[PromoConfig]:");
    expect(notasConPromo).toContain("[Odómetro Calibrado]: 890,000 km");
    expect(notasConPromo).toContain("Observación técnica");

    const extraido = extractPromoConfigFromNotas(notasConPromo);
    expect(extraido).toBeDefined();
    expect(extraido?.activa).toBe(true);
    expect(extraido?.rangoMin).toBe(4);
    expect(extraido?.rangoMax).toBe(25);

    // Actualizar promo a pausada (activa: false)
    const promoPausada = { ...promo, activa: false };
    const notasActualizadas = injectPromoConfigToNotas(notasConPromo, promoPausada);
    const extraidoPausado = extractPromoConfigFromNotas(notasActualizadas);
    expect(extraidoPausado?.activa).toBe(false);
    // Verificar que no se duplica la etiqueta
    const matches = notasActualizadas?.match(/\[PromoConfig\]/g);
    expect(matches?.length).toBe(1);
  });

  test("6. Preservación de [PromoConfig] frente a notas nulas o malformadas", () => {
    expect(extractPromoConfigFromNotas(null)).toBeUndefined();
    expect(extractPromoConfigFromNotas(undefined)).toBeUndefined();
    expect(extractPromoConfigFromNotas("Notas sin tag")).toBeUndefined();
    expect(
      extractPromoConfigFromNotas("[PromoConfig]:{malformed_json}")
    ).toBeUndefined();

    const notasLimpias = injectPromoConfigToNotas(
      '[PromoConfig]:{"activa":true} • Nota',
      null
    );
    expect(notasLimpias).toBe("Nota");
  });

  test("7. Sincronización automática en saveBus (offline-first)", () => {
    const busItem: BusItem = {
      id: "BUS-01",
      numeroDisco: "01",
      placa: "TAA-5152",
      marca: "Hino AK",
      propietario: "José Leonardo Jaya",
      tipoOperacion: "TRONCAL_VT",
      activo: true,
      promoConfig: {
        activa: true,
        rangoMin: 7,
        rangoMax: 28,
        textoPublicidad: "RutaGo Test",
        sonidoGanador: true,
      },
    };

    saveBus(busItem);

    const savedKey = getBusPromoStorageKey("01");
    const rawSaved = mockLocalStorage.getItem(savedKey);
    expect(rawSaved).not.toBeNull();
    const parsed = JSON.parse(rawSaved!);
    expect(parsed.activa).toBe(true);
    expect(parsed.rangoMin).toBe(7);

    // Modificar a inactivo mediante saveBus
    saveBus({
      ...busItem,
      promoConfig: { ...busItem.promoConfig!, activa: false },
    });
    const parsedInactivo = JSON.parse(mockLocalStorage.getItem(savedKey)!);
    expect(parsedInactivo.activa).toBe(false);
  });
});
