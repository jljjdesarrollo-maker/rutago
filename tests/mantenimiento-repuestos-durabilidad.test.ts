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

import {
  saveParadaPago,
  getParadasPagoByBus,
  calcularDurabilidadRepuesto,
  type ParadaPagoRegistro,
  type PiezaRepuestoItem,
} from '@/lib/paradas-vt-storage';
import { saveBusOdometer, getBusOdometerForDate } from '@/lib/fleet-storage';

describe('⚙️ MÓDULO TÉCNICO DE MANTENIMIENTO, REPUESTOS Y DURABILIDAD (v3.61.79)', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
  });

  it('1. calcularDurabilidadRepuesto calcula correctamente Delta Km y Días entre servicios', () => {
    const busId = 'BUS-TEST-01';

    // Servicio previo: 10 de octubre a 900,000 km (Kit selector)
    saveParadaPago({
      id: 'PARADA-PREVIA-01',
      busId,
      disco: '01',
      fecha: '2026-10-10',
      estacionNombre: 'Arreglo / Novedad Extraordinaria',
      detalleTrabajo: 'Reparación de selector de cambios y bocines',
      odometroServicio: 900000,
      costoTotal: 65,
      pagador: 'AYUDANTE',
      createdAt: '2026-10-10T10:00:00.000Z',
    });

    // Nuevo servicio: 05 de noviembre a 908,065 km (Selector nuevo)
    const durabilidad = calcularDurabilidadRepuesto(
      busId,
      'kit selector de marcha',
      908065,
      '2026-11-05'
    );

    expect(durabilidad.duracionKm).toBe(8065);
    expect(durabilidad.dias).toBe(26);
    expect(durabilidad.alertaGarantia).toBe(true); // < 30 días dispara alerta de garantía
    expect(durabilidad.mensajeEvaluacion).toContain('8,065 km');
    expect(durabilidad.mensajeEvaluacion).toContain('26 días');
    expect(durabilidad.mensajeEvaluacion).toContain('Alerta de Garantía');
  });

  it('2. Almacena piezasRepuesto con clasificación Original vs Alternativo y Marca libre sin fricción de precios individuales', () => {
    const busId = 'BUS-TEST-02';

    const piezas: PiezaRepuestoItem[] = [
      {
        id: 'pz-01',
        descripcion: 'Kit del selector de marcha',
        esOriginal: true,
        marca: 'Hino Genuino',
      },
      {
        id: 'pz-02',
        descripcion: 'Empaque de turbo de escape',
        esOriginal: false,
        marca: 'Koyo Alterno',
      },
    ];

    saveParadaPago({
      id: 'PARADA-REPUESTOS-01',
      busId,
      disco: '02',
      fecha: '2026-11-05',
      estacionNombre: 'Mantenimiento Mecánico',
      detalleTrabajo: 'Cambio de kit selector y empaque',
      odometroServicio: 908065,
      costoTotal: 91.0, // Costo total único sin precios por pieza
      costoManoObra: 20.0, // Mano de obra opcional
      impresionesGenerales: 'El empaque anterior silbaba; el selector tenía juego en bocín',
      piezasRepuesto: piezas,
      pagador: 'AYUDANTE',
      createdAt: '2026-11-05T12:00:00.000Z',
    });

    const guardadas = getParadasPagoByBus(busId);
    expect(guardadas.length).toBe(1);

    const registro = guardadas[0];
    expect(registro.costoTotal).toBe(91.0);
    expect(registro.costoManoObra).toBe(20.0);
    expect(registro.impresionesGenerales).toContain('silbaba');
    expect(registro.piezasRepuesto).toHaveLength(2);
    expect(registro.piezasRepuesto![0].esOriginal).toBe(true);
    expect(registro.piezasRepuesto![0].marca).toBe('Hino Genuino');
    expect(registro.piezasRepuesto![1].esOriginal).toBe(false);
    expect(registro.piezasRepuesto![1].marca).toBe('Koyo Alterno');
  });

  it('3. saveParadaPago calcula y asocia automáticamente la durabilidad y alerta de garantía en background', () => {
    const busId = 'BUS-TEST-03';

    // Primer servicio de turbo
    saveParadaPago({
      id: 'PARADA-TURBO-01',
      busId,
      disco: '03',
      fecha: '2026-09-01',
      estacionNombre: 'Mecánica Diesel',
      detalleTrabajo: 'Cambio de empaque y pernos de turbo',
      odometroServicio: 880000,
      costoTotal: 76.01,
      pagador: 'SOCIO',
      createdAt: '2026-09-01T10:00:00.000Z',
    });

    // Segundo servicio de turbo mucho después (a 908,000 km y 65 días después)
    saveParadaPago({
      id: 'PARADA-TURBO-02',
      busId,
      disco: '03',
      fecha: '2026-11-05',
      estacionNombre: 'Mecánica Diesel',
      detalleTrabajo: 'Ajuste de turbo y pernos',
      odometroServicio: 908000,
      costoTotal: 40.0,
      pagador: 'AYUDANTE',
      createdAt: '2026-11-05T15:00:00.000Z',
    });

    const list = getParadasPagoByBus(busId);
    const ultimo = list.find((p) => p.id === 'PARADA-TURBO-02');
    expect(ultimo).toBeDefined();
    expect(ultimo?.duracionKmAnterior).toBe(28000); // 908,000 - 880,000 = 28,000 km
    expect(ultimo?.diasDesdeAnterior).toBe(65);
    expect(ultimo?.alertaGarantia).toBeFalsy(); // 65 días y 28,000 km es un ciclo normal, no garantía
  });

  it('4. El odómetro de fecha concuerda con el registro oficial del ayudante', async () => {
    const disco = '01';
    const fechaOficial = '2026-11-05';
    const kmOficial = '908065';

    // El ayudante registra el arqueo oficial con odómetro
    saveBusOdometer(disco, kmOficial, fechaOficial);

    // Al consultar la fecha, retorna exactamente el odómetro del ayudante
    const res = await getBusOdometerForDate(disco, fechaOficial);
    expect(res).not.toBeNull();
    expect(String(res?.kmFinal)).toBe(kmOficial);
    expect(res?.date).toBe(fechaOficial);
  });
});
