import { describe, it, expect, beforeEach } from 'bun:test';

// Mock de localStorage y window para entorno de testing en Bun
const storageMap: Record<string, string> = {};
const mockLocalStorage = {
  getItem: (k: string) => storageMap[k] ?? null,
  setItem: (k: string, v: string) => { storageMap[k] = String(v); },
  removeItem: (k: string) => { delete storageMap[k]; },
  clear: () => { Object.keys(storageMap).forEach(k => delete storageMap[k]); },
  length: 0,
  key: () => null,
};
(globalThis as any).window = {
  dispatchEvent: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
};
(globalThis as any).localStorage = mockLocalStorage;

import { saveBusOdometer, getLatestBusOdometer } from '@/lib/fleet-storage';
import { saveParadaPago, getParadasPagoByBus } from '@/lib/paradas-vt-storage';

describe('🛡️ BLINDAJE DE ODOMETRÍA: JERARQUÍA AYUDANTE / SOCIO Y BLINDAJE ANTE MANTENIMIENTOS DEL CHOFER (v3.61.68)', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
  });

  it('1. El odómetro oficial del Ayudante (893,750 km) permanece INMUTABLE ante mantenimientos antiguos del chofer', () => {
    const disco = '01';
    const kmOficialAyudante = '893750';
    const fechaArqueo = '2026-10-28';

    // El ayudante cierra su jornada oficial
    saveBusOdometer(disco, kmOficialAyudante, fechaArqueo);

    const antes = getLatestBusOdometer(disco);
    expect(antes).not.toBeNull();
    expect(antes?.kmFinal).toBe(kmOficialAyudante);

    // El chofer ingresa a registrar un mantenimiento antiguo (ej. cambio de aceite a 893,500 km realizado el 15/10)
    const kmServicioAntiguo = 893500;
    const fechaServicioAntiguo = '2026-10-15';
    const kmActualBus = parseInt(antes!.kmFinal, 10);

    // Al registrar el mantenimiento, el chofer guarda la parada técnica sin mutar el odómetro del bus
    saveParadaPago({
      id: 'PARADA-CHOFER-TEST-01',
      busId: 'BUS-01',
      disco: '01',
      fecha: fechaServicioAntiguo,
      estacionId: 'SERVICIO_INDIVIDUAL',
      estacionNombre: 'Cambio de Aceite Motor',
      taller: 'Lubricadora Loja',
      odometroKm: kmServicioAntiguo,
      odometroServicio: kmServicioAntiguo,
      odometroActualBus: kmActualBus,
      esRetroactivo: true,
      kmRodadosDesdeServicio: Math.max(0, kmActualBus - kmServicioAntiguo),
      costoTotal: 85.0,
      pagador: 'AYUDANTE',
      montoCubiertoAyudante: 85.0,
      descontadoEnVT: true,
      detalleTrabajo: 'Cambio de Aceite 15W40',
      itemsRealizados: ['Aceite Motor'],
      codigosMantenimiento: ['MNT-ACEITE-MOT'],
      ownerExpenseId: 'EXP-TEST-01',
      createdAt: new Date().toISOString(),
    });

    // VERIFICACIÓN CRÍTICA:
    // El odómetro del autobús NO fue reemplazado por los 893,500 km del chofer
    const despues = getLatestBusOdometer(disco);
    expect(despues?.kmFinal).toBe(kmOficialAyudante);
    expect(despues?.kmFinal).not.toBe(kmServicioAntiguo.toString());
  });

  it('2. El mantenimiento antiguo guarda el odómetro del servicio para calcular el desgaste real del repuesto', () => {
    const disco = '01';
    const kmActualBus = 893750;
    const kmServicioAntiguo = 893500;

    saveParadaPago({
      id: 'PARADA-CHOFER-TEST-02',
      busId: 'BUS-01',
      disco: '01',
      fecha: '2026-10-15',
      estacionId: 'LUBRICADORA',
      estacionNombre: 'Combo Lubricadora',
      taller: 'Lubricadora Vilcabamba',
      odometroKm: kmServicioAntiguo,
      odometroServicio: kmServicioAntiguo,
      odometroActualBus: kmActualBus,
      esRetroactivo: true,
      kmRodadosDesdeServicio: kmActualBus - kmServicioAntiguo,
      costoTotal: 120.0,
      pagador: 'AYUDANTE',
      montoCubiertoAyudante: 120.0,
      descontadoEnVT: true,
      detalleTrabajo: 'Aceite + Filtros',
      itemsRealizados: ['Aceite', 'Filtro Aceite'],
      codigosMantenimiento: ['MNT-ACEITE-MOT', 'MNT-FILTRO-ACEITE'],
      ownerExpenseId: 'EXP-TEST-02',
      createdAt: new Date().toISOString(),
    });

    const historial = getParadasPagoByBus('BUS-01');
    const parada = historial.find((p) => p.id === 'PARADA-CHOFER-TEST-02');
    expect(parada).toBeDefined();
    // Odómetro en el momento del cambio técnico
    expect(parada?.odometroServicio).toBe(kmServicioAntiguo);
    // Odómetro del tablero en el momento del registro
    expect(parada?.odometroActualBus).toBe(kmActualBus);
    // Kilómetros ya rodados desde que se cambió el componente (250 km de uso acumulado)
    expect(parada?.kmRodadosDesdeServicio).toBe(250);
  });

  it('3. Detección de Desviación Elástica (> 250 km) entre la fecha del ayudante y el taller', () => {
    const kmAyudanteEnEsaFecha = 892100;

    // Caso A: El chofer ingresa 892,150 (+50 km por traslado a lubricadora) -> Variación aceptable (<= 250 km)
    const kmChoferCercano = 892150;
    const diffCercana = Math.abs(kmChoferCercano - kmAyudanteEnEsaFecha);
    const requiereAlertaCercana = diffCercana > 250;
    expect(requiereAlertaCercana).toBe(false);

    // Caso B: El chofer ingresa 893,050 (+950 km de desfase o error de tipeo) -> Dispara alerta amarilla informativa
    const kmChoferDesfasado = 893050;
    const diffDesfasada = Math.abs(kmChoferDesfasado - kmAyudanteEnEsaFecha);
    const requiereAlertaDesfasada = diffDesfasada > 250;
    expect(requiereAlertaDesfasada).toBe(true);
    expect(diffDesfasada).toBe(950);
  });

  it('4. Calibración oficial del Socio Propietario tiene jerarquía superior cuando es justificada', () => {
    const disco = '01';
    // Tacómetro dejado por el ayudante
    saveBusOdometer(disco, '893600', '2026-10-25');

    // El socio calibra manualmente por cambio de tablero o corrección de auditoría
    const kmCalibradoSocio = '894000';
    const fechaCalibracion = '2026-10-28';
    saveBusOdometer(disco, kmCalibradoSocio, fechaCalibracion, true);

    const actual = getLatestBusOdometer(disco);
    expect(actual?.kmFinal).toBe(kmCalibradoSocio);
  });
});
