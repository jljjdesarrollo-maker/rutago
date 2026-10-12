import { describe, expect, it } from 'bun:test';
import {
  calcularMadurezMuestral,
  getPreviousCycleRange,
  filterRecordsByPeriod,
  calculateBusMetrics,
  computeFleetBenchmark,
  resolveRecordBus,
} from '../src/lib/benchmark-metrics';
import { type BusItem } from '../src/types/fleet';

const MOCK_FLEET: BusItem[] = [
  {
    id: 'BUS-01',
    numeroDisco: '01',
    placa: 'TAA-5152',
    marca: 'Hino AK',
    modelo: '2020',
    capacidadAsientos: 45,
    tipoOperacion: 'TRONCAL_VT',
    propietario: 'Socio Líder Jaya',
    socioId: 'SOCIO-01',
  },
  {
    id: 'BUS-10',
    numeroDisco: '10',
    placa: 'LAA-3174',
    marca: 'Hino AK',
    modelo: '2022',
    capacidadAsientos: 45,
    tipoOperacion: 'TRONCAL_VT',
    propietario: 'Socio Propietario Dos',
    socioId: 'SOCIO-01', // Mismo socio tiene Bus 01 y Bus 10
  },
  {
    id: 'BUS-02',
    numeroDisco: '02',
    placa: 'LAA-1234',
    marca: 'Hino AK',
    modelo: '2021',
    capacidadAsientos: 45,
    tipoOperacion: 'TRONCAL_VT',
    propietario: 'Compañero Troncal 2',
    socioId: 'SOCIO-02',
  },
  {
    id: 'BUS-16',
    numeroDisco: '16',
    placa: 'LAA-9999',
    marca: 'Hino FC',
    modelo: '2019',
    capacidadAsientos: 28,
    tipoOperacion: 'ALIMENTADOR_P',
    propietario: 'Socio Ramales',
    socioId: 'SOCIO-03',
  },
];

describe('📊 BENCHMARK DE FLOTA & EFICIENCIA TEMPORAL (v3.61.36)', () => {
  describe('1. Semáforo de Madurez Estadística Muestral (Umbral 15 Jornadas VT)', () => {
    it('1.1 Jornadas de 1 a 4: Clasifica como Calibración Temprana (🌱)', () => {
      const res0 = calcularMadurezMuestral(0);
      const res1 = calcularMadurezMuestral(1);
      const res4 = calcularMadurezMuestral(4);

      expect(res0.nivel).toBe('CALIBRACION');
      expect(res1.nivel).toBe('CALIBRACION');
      expect(res4.nivel).toBe('CALIBRACION');
      expect(res1.badge).toContain('En Calibración');
      expect(res1.badgeCorto).toContain('Calibración (1/15)');
      expect(res1.label).toBe('Calibración Temprana');
      expect(res1.umbralCertificado).toBe(15);
    });

    it('1.2 Jornadas de 5 a 14: Clasifica como Tendencia en Formación (🟡)', () => {
      const res5 = calcularMadurezMuestral(5);
      const res10 = calcularMadurezMuestral(10);
      const res14 = calcularMadurezMuestral(14);

      expect(res5.nivel).toBe('EN_PROGRESO');
      expect(res10.nivel).toBe('EN_PROGRESO');
      expect(res14.nivel).toBe('EN_PROGRESO');
      expect(res5.badge).toContain('Muestra Parcial');
      expect(res10.badgeCorto).toContain('En Progreso (10/15)');
      expect(res10.label).toBe('Tendencia en Formación');
    });

    it('1.3 Jornadas de 15 o más: Clasifica como Muestra Certificada (🟢 Ciclo VT)', () => {
      const res15 = calcularMadurezMuestral(15);
      const res28 = calcularMadurezMuestral(28);

      expect(res15.nivel).toBe('CERTIFICADO');
      expect(res28.nivel).toBe('CERTIFICADO');
      expect(res15.badge).toBe('🟢 Ciclo VT Certificado');
      expect(res15.badgeCorto).toBe('🟢 Certificado (15+)');
      expect(res15.label).toBe('Muestra Certificada');
      expect(res15.descripcion).toContain('rotación completa de los 15 VT');
    });
  });

  describe('2. IER (Índice de Eficiencia Relativa - Base 100)', () => {
    it('2.1 IER = 100% cuando el IPF del bus es idéntico a la media del grupo', () => {
      const bus = MOCK_FLEET[0];
      const records = [
        {
          date: '2026-10-01',
          production: 120,
          trips: [
            { tipo: 'NORMAL' },
            { tipo: 'NORMAL' },
            { tipo: 'NORMAL' },
            { tipo: 'NORMAL' },
            { tipo: 'NORMAL' },
            { tipo: 'NORMAL' },
          ], // 6 vueltas, IPF = $20.00
        },
      ];

      const metrics = calculateBusMetrics(bus, records, 20.0);
      expect(metrics.ipf).toBe(20.0);
      expect(metrics.ier).toBe(100.0);
    });

    it('2.2 IER < 100% (Déficit) cuando el IPF está por debajo de la cooperativa', () => {
      const bus = MOCK_FLEET[0];
      const records = [
        {
          date: '2026-10-01',
          production: 108,
          trips: [{ tipo: 'NORMAL' }, { tipo: 'NORMAL' }, { tipo: 'NORMAL' }, { tipo: 'NORMAL' }, { tipo: 'NORMAL' }, { tipo: 'NORMAL' }], // 6 vueltas, IPF = $18.00
        },
      ];

      const metrics = calculateBusMetrics(bus, records, 20.0); // 18 / 20 * 100 = 90%
      expect(metrics.ipf).toBe(18.0);
      expect(metrics.ier).toBe(90.0);
    });

    it('2.3 IER > 100% (Superávit) cuando el IPF supera la media de la cooperativa', () => {
      const bus = MOCK_FLEET[0];
      const records = [
        {
          date: '2026-10-01',
          production: 135,
          trips: [{ tipo: 'NORMAL' }, { tipo: 'NORMAL' }, { tipo: 'NORMAL' }, { tipo: 'NORMAL' }, { tipo: 'NORMAL' }, { tipo: 'NORMAL' }], // 6 vueltas, IPF = $22.50
        },
      ];

      const metrics = calculateBusMetrics(bus, records, 20.0); // 22.5 / 20 * 100 = 112.5%
      expect(metrics.ipf).toBe(22.5);
      expect(metrics.ier).toBe(112.5);
    });
  });

  describe('3. Rango de Período y Ciclo 15D (Rotación VT)', () => {
    it('3.1 Filtro CICLO_15D genera un período de exactamente 15 días continuos', () => {
      const records = [
        { date: '2026-10-01', production: 100 },
        { date: '2026-10-10', production: 100 },
      ];

      const { fromDate, toDate, daysCount, periodoLabel } = filterRecordsByPeriod(records, 'CICLO_15D');
      expect(daysCount).toBe(15);
      expect(periodoLabel).toContain('Ciclo 15D');
      expect(fromDate <= toDate).toBe(true);
    });

    it('3.2 getPreviousCycleRange calcula exactamente la quincena previa (15 días)', () => {
      const currentStart = '2026-10-15';
      const prevRange = getPreviousCycleRange(currentStart);

      expect(prevRange.to).toBe('2026-10-14');
      expect(prevRange.from).toBe('2026-09-30'); // 15 días continuos del 30 de sep al 14 de oct inclusive
    });
  });

  describe('4. Podio de Ingreso Bruto ($) y Tarjeta de Brecha de Captura', () => {
    it('4.1 Genera el podio ordenado por facturación bruta (🥇, 🥈, 🥉) y calcula la brecha de dinero', () => {
      const records = [
        // Bus 01: $6,500 en 15 días (Líder)
        ...Array.from({ length: 15 }, (_, i) => ({
          busId: 'BUS-01',
          date: `2026-10-${String(i + 1).padStart(2, '0')}`,
          production: 433.33,
          trips: Array.from({ length: 6 }, () => ({ tipo: 'NORMAL' })),
        })),
        // Bus 02: $6,300 en 15 días (#2)
        ...Array.from({ length: 15 }, (_, i) => ({
          busId: 'BUS-02',
          date: `2026-10-${String(i + 1).padStart(2, '0')}`,
          production: 420.0,
          trips: Array.from({ length: 6 }, () => ({ tipo: 'NORMAL' })),
        })),
        // Bus 10: $5,000 en 15 días (#3 - Tu Unidad)
        ...Array.from({ length: 15 }, (_, i) => ({
          busId: 'BUS-10',
          date: `2026-10-${String(i + 1).padStart(2, '0')}`,
          production: 333.33,
          trips: Array.from({ length: 6 }, () => ({ tipo: 'NORMAL' })),
        })),
      ];

      const benchmark = computeFleetBenchmark(
        records,
        MOCK_FLEET,
        'ESTE_MES',
        { from: '2026-10-01', to: '2026-10-15' },
        'BUS-10'
      );
      const troncal = benchmark.troncal;

      // 1. Podio de 3 unidades
      expect(troncal.podioProduccion.length).toBe(3);
      expect(troncal.podioProduccion[0].posicion).toBe(1);
      expect(troncal.podioProduccion[0].medalla).toBe('🥇');
      expect(troncal.podioProduccion[0].busId).toBe('BUS-01');

      expect(troncal.podioProduccion[1].posicion).toBe(2);
      expect(troncal.podioProduccion[1].medalla).toBe('🥈');
      expect(troncal.podioProduccion[1].busId).toBe('BUS-02');

      expect(troncal.podioProduccion[2].posicion).toBe(3);
      expect(troncal.podioProduccion[2].medalla).toBe('🥉');
      expect(troncal.podioProduccion[2].busId).toBe('BUS-10');
      expect(troncal.podioProduccion[2].esUnidadPropia).toBe(true);

      // 2. Tarjeta de Brecha de Tu Unidad (Bus 10)
      expect(troncal.brechaTuUnidad).not.toBeNull();
      const brecha = troncal.brechaTuUnidad!;
      expect(brecha.disco).toBe('10');
      expect(brecha.produccionTuUnidad).toBeCloseTo(5000, 0);

      // Media de las 3 unidades con producción = (6500 + 6300 + 5000) / 3 = 5933.33
      expect(brecha.mediaGrupo).toBeCloseTo(5933.33, 0);

      // Brecha negativa = $5,000 - $5,933.33 = -$933.33 (dinero que faltó en la calle)
      expect(brecha.brechaEfectivo).toBeLessThan(0);
      expect(brecha.brechaEfectivo).toBeCloseTo(-933.33, 0);

      // Diferencia vs Líder (#1): $5,000 - $6,500 = -$1,500
      expect(brecha.diferenciaVsLider).toBeCloseTo(-1500, 0);
    });
  });

  describe('5. Evolución Temporal de Tripulación (Delta Inter-Ciclos de 15 Días)', () => {
    it('5.1 Detecta mejora de recaudación y aumento de IER frente a la quincena anterior', () => {
      // Simular 15 días actuales y 15 días anteriores
      const records = [
        // Quincena Anterior (ej. 2026-09-16 a 2026-09-30): Bus 10 producía $250/día (IPF ~$41.6)
        ...Array.from({ length: 15 }, (_, i) => ({
          busId: 'BUS-10',
          date: `2026-09-${String(i + 16).padStart(2, '0')}`,
          production: 250.0,
          trips: Array.from({ length: 6 }, () => ({ tipo: 'NORMAL' })),
        })),
        ...Array.from({ length: 15 }, (_, i) => ({
          busId: 'BUS-01',
          date: `2026-09-${String(i + 16).padStart(2, '0')}`,
          production: 400.0,
          trips: Array.from({ length: 6 }, () => ({ tipo: 'NORMAL' })),
        })),
        // Quincena Actual (ej. 2026-10-01 a 2026-10-15): Bus 10 mejoró y produce $350/día (+$1,500 en total)
        ...Array.from({ length: 15 }, (_, i) => ({
          busId: 'BUS-10',
          date: `2026-10-${String(i + 1).padStart(2, '0')}`,
          production: 350.0,
          trips: Array.from({ length: 6 }, () => ({ tipo: 'NORMAL' })),
        })),
        ...Array.from({ length: 15 }, (_, i) => ({
          busId: 'BUS-01',
          date: `2026-10-${String(i + 1).padStart(2, '0')}`,
          production: 400.0,
          trips: Array.from({ length: 6 }, () => ({ tipo: 'NORMAL' })),
        })),
      ];

      const benchmark = computeFleetBenchmark(
        records,
        MOCK_FLEET,
        'CICLO_15D',
        { from: '2026-10-01', to: '2026-10-15' },
        'BUS-10'
      );

      const evo = benchmark.troncal.evolucionTemporalTuUnidad;
      expect(evo).not.toBeNull();
      expect(evo!.tendencia).toBe('MEJORA');
      expect(evo!.deltaProduccion).toBeGreaterThan(0);
      expect(evo!.deltaIER).toBeGreaterThan(0);
      expect(evo!.mensajeEvolucion).toContain('recuperó');
    });
  });

  describe('6. Anonimización Simétrica y Protección de Privacidad Gremial', () => {
    it('6.1 La unidad del socio muestra sus datos completos; los demás buses aparecen anónimos', () => {
      const records = [
        { busId: 'BUS-01', date: '2026-10-01', production: 300, totalGastos: 100 },
        { busId: 'BUS-02', date: '2026-10-01', production: 280, totalGastos: 90 },
      ];

      // Caso A: Socio autenticado con Bus 01
      const benchBus01 = computeFleetBenchmark(records, MOCK_FLEET, 'ESTE_MES', undefined, 'BUS-01');
      const bus01Rank = benchBus01.troncal.ranking.find((b) => b.busId === 'BUS-01')!;
      const bus02Rank = benchBus01.troncal.ranking.find((b) => b.busId === 'BUS-02')!;

      expect(bus01Rank.esUnidadPropia).toBe(true);
      expect(bus01Rank.datosPrivadosOcultos).toBe(false);
      expect(bus01Rank.placaDisplay).toBe('TAA-5152');
      expect(bus01Rank.nombreDisplay).toContain('Tu Unidad');

      expect(bus02Rank.esUnidadPropia).toBe(false);
      expect(bus02Rank.datosPrivadosOcultos).toBe(true);
      expect(bus02Rank.placaDisplay).toBe('Privada');
      expect(bus02Rank.propietarioDisplay).toBe('Socio de Cooperativa');
      expect(bus02Rank.codigoAnonimo).toMatch(/^#T-\d{2}$/);
    });

    it('6.2 Cambio en selector multi-unidad: Si el socio conmuta a Bus 10, Bus 10 pasa a ser Tu Unidad', () => {
      const records = [
        { busId: 'BUS-01', date: '2026-10-01', production: 300 },
        { busId: 'BUS-10', date: '2026-10-01', production: 250 },
      ];

      // Conmutar a BUS-10
      const benchBus10 = computeFleetBenchmark(records, MOCK_FLEET, 'ESTE_MES', undefined, 'BUS-10');
      const bus10Rank = benchBus10.troncal.ranking.find((b) => b.busId === 'BUS-10')!;
      const bus01Rank = benchBus10.troncal.ranking.find((b) => b.busId === 'BUS-01')!;

      expect(bus10Rank.esUnidadPropia).toBe(true);
      expect(bus10Rank.datosPrivadosOcultos).toBe(false);
      expect(bus10Rank.nombreDisplay).toContain('Bus 10 (Tu Unidad)');

      // Bus 01 ahora actúa como par anónimo
      expect(bus01Rank.esUnidadPropia).toBe(false);
      expect(bus01Rank.datosPrivadosOcultos).toBe(true);
    });
  });
});
