import { describe, it, expect } from 'bun:test';
import { procesarReporteCalendarioSocio } from '../src/lib/reporte-calendario-socio';

describe('🏛️ FASE 1: Ranking Normalizado ($/vuelta) y Diagnóstico Financiero Privado (v3.61.51)', () => {
  it('1.1 Calcula correctamente $/vuelta y vueltasRealizadas en rankingAnonimo', () => {
    const registros = [
      // Bus 08 (Tú): 2 días, 12 vueltas, $600 recaudado -> $50/vuelta
      {
        date: '2026-10-01',
        conductor: 'BUS-08',
        production: 300,
        frecuenciasTotales: 6,
        km: '300',
        expenses: [{ description: 'Diesel', amount: 60 }],
      },
      {
        date: '2026-10-02',
        conductor: 'BUS-08',
        production: 300,
        frecuenciasTotales: 6,
        km: '300',
        expenses: [{ description: 'Diesel', amount: 60 }],
      },
      // Bus 01: 2 días, 12 vueltas, $720 recaudado -> $60/vuelta
      {
        date: '2026-10-01',
        conductor: 'BUS-01',
        production: 360,
        frecuenciasTotales: 6,
        km: '300',
        expenses: [{ description: 'Diesel', amount: 60 }],
      },
      {
        date: '2026-10-02',
        conductor: 'BUS-01',
        production: 360,
        frecuenciasTotales: 6,
        km: '300',
        expenses: [{ description: 'Diesel', amount: 60 }],
      },
    ];

    const res = procesarReporteCalendarioSocio({
      diasVentana: 2,
      fechaInicio: '2026-10-01',
      fechaFin: '2026-10-02',
      busDisco: '08',
      tipoCircuito: 'TRONCAL_VT',
      registros,
    });

    const tuBus = res.rankingAnonimo.find(b => b.esTuUnidad);
    expect(tuBus).toBeDefined();
    expect(tuBus?.vueltasRealizadas).toBe(12);
    expect(tuBus?.promedioPorVuelta).toBe(50);
    expect(tuBus?.produccionTotal).toBe(600);

    const busPar = res.rankingAnonimo.find(b => !b.esTuUnidad);
    expect(busPar).toBeDefined();
    expect(busPar?.vueltasRealizadas).toBe(12);
    expect(busPar?.promedioPorVuelta).toBe(60);
    expect(busPar?.produccionTotal).toBe(720);
  });

  it('1.2 Marca coberturaParcial = true para unidades con <60% de cobertura (pero >=30%) y las excluye del podio', () => {
    // Ventana de 10 días: umbral integridad >=30% (3 días), umbral podio confiable >=60% (6 días).
    const registros = [
      // Bus 08 (Tú): 10 días completos -> 100% cobertura, no parcial
      ...Array.from({ length: 10 }, (_, i) => ({
        date: `2026-10-${String(i + 1).padStart(2, '0')}`,
        conductor: 'BUS-08',
        production: 280,
        frecuenciasTotales: 6,
        km: '300',
        expenses: [{ description: 'Diesel', amount: 60 }],
      })),
      // Bus 01: 9 días -> 90% cobertura, no parcial
      ...Array.from({ length: 9 }, (_, i) => ({
        date: `2026-10-${String(i + 1).padStart(2, '0')}`,
        conductor: 'BUS-01',
        production: 320,
        frecuenciasTotales: 6,
        km: '300',
        expenses: [{ description: 'Diesel', amount: 60 }],
      })),
      // Bus 15: 4 días (40% >= 30% integridad, pero < 60% podio), días pico de $500/día -> Muestra Parcial
      ...Array.from({ length: 4 }, (_, i) => ({
        date: `2026-10-${String(i + 1).padStart(2, '0')}`,
        conductor: 'BUS-15',
        production: 500,
        frecuenciasTotales: 6,
        km: '300',
        expenses: [{ description: 'Diesel', amount: 60 }],
      })),
    ];

    const res = procesarReporteCalendarioSocio({
      diasVentana: 10,
      fechaInicio: '2026-10-01',
      fechaFin: '2026-10-10',
      busDisco: '08',
      tipoCircuito: 'TRONCAL_VT',
      registros,
    });

    const busParcial = res.rankingAnonimo.find(b => b.diasConRegistro === 4);
    expect(busParcial).toBeDefined();
    expect(busParcial?.coberturaParcial).toBe(true);
    // Aunque tenga promedio alto ($500/día), NO debe recibir medalla de podio
    expect(busParcial?.medalla).toBeUndefined();

    // Las unidades con cobertura completa sí tienen medallas
    const bus01 = res.rankingAnonimo.find(b => b.diasConRegistro === 9);
    expect(bus01?.coberturaParcial).toBe(false);
    expect(bus01?.medalla).toBe('🥇');

    const bus08 = res.rankingAnonimo.find(b => b.esTuUnidad);
    expect(bus08?.coberturaParcial).toBe(false);
    expect(bus08?.medalla).toBe('🥈');
  });

  it('1.3 Genera los 5 diagnósticos financieros privados en dólares para el socio', () => {
    // Ventana de 7 días: Bus 08 y Bus 01 con 5 días (71% >= 60%)
    const registros = [
      ...Array.from({ length: 5 }, (_, i) => ({
        date: `2026-10-${String(i + 1).padStart(2, '0')}`,
        conductor: 'BUS-08',
        production: 270,
        frecuenciasTotales: 6,
        trips: i === 0 ? [
          { tipo: "frecuencia", income: 54 },
          { tipo: "frecuencia", income: 54 },
          { tipo: "frecuencia", income: 54 },
          { tipo: "frecuencia", income: 54 },
          { tipo: "frecuencia", income: 54 },
          { tipo: "no_realizada", motivo: "falla_mecanica" },
        ] : undefined,
        sobrante: i === 0 ? -10 : 0, // -$10 faltante del ayudante
        km: '300',
        expenses: [{ description: 'Diesel', amount: 75 }], // $0.25/km
      })),
      // Bus líder del circuito (Bus 01) con mayor recaudación
      ...Array.from({ length: 5 }, (_, i) => ({
        date: `2026-10-${String(i + 1).padStart(2, '0')}`,
        conductor: 'BUS-01',
        production: 330,
        frecuenciasTotales: 6,
        km: '300',
        expenses: [{ description: 'Diesel', amount: 60 }], // $0.20/km
      })),
    ];

    const res = procesarReporteCalendarioSocio({
      diasVentana: 7,
      fechaInicio: '2026-10-01',
      fechaFin: '2026-10-07',
      busDisco: '08',
      tipoCircuito: 'TRONCAL_VT',
      registros,
    });

    expect(res.diagnosticoPrivadoSocio).toBeDefined();
    expect(res.diagnosticoPrivadoSocio.length).toBe(5);

    const diagLider = res.diagnosticoPrivadoSocio.find(d => d.id === 'pasajes_lider');
    expect(diagLider).toBeDefined();
    expect(diagLider?.tipo).toBe('oportunidad');
    expect(diagLider?.impactoDolares).toBeLessThan(0);
    expect(diagLider?.mensajeCorto).toContain('/vuelta');

    const diagDiesel = res.diagnosticoPrivadoSocio.find(d => d.id === 'diesel_media');
    expect(diagDiesel).toBeDefined();
    expect(diagDiesel?.mensajeCorto).toContain('/km');

    const diagFaltantes = res.diagnosticoPrivadoSocio.find(d => d.id === 'faltantes_caja');
    expect(diagFaltantes).toBeDefined();
    expect(diagFaltantes?.tipo).toBe('alerta');
    expect(diagFaltantes?.impactoDolares).toBe(-10);

    const diagVueltas = res.diagnosticoPrivadoSocio.find(d => d.id === 'vueltas_caidas');
    expect(diagVueltas).toBeDefined();
    expect(diagVueltas?.tipo).toBe('alerta');

    const diagBaches = res.diagnosticoPrivadoSocio.find(d => d.id === 'cuadernos_baches');
    expect(diagBaches).toBeDefined();
    expect(diagBaches?.tipo).toBe('alerta');
    expect(diagBaches?.mensajeCorto).toContain('2 día(s) sin arqueo');
  });
});
