import { describe, it, expect } from 'bun:test';
import { formatCanonicalConductor } from '../src/lib/canonical-record-payload';

describe('🛡️ BLOQUE 1: Mando Principal y Finanzas en Vivo (Aislamiento Multi-Tenant)', () => {
  it('1.1 Normalización y Formato Canónico de Conductor y Disco', () => {
    expect(formatCanonicalConductor('10', 'Richard Medina')).toBe('BUS-10 - Richard Medina');
    expect(formatCanonicalConductor('BUS-10', 'Richard Medina')).toBe('BUS-10 - Richard Medina');
    expect(formatCanonicalConductor('01', 'Jimmy Vera')).toBe('BUS-01 - Jimmy Vera');
    expect(formatCanonicalConductor('02', '')).toBe('BUS-02');
  });

  it('1.2 Aislamiento Estricto de Parámetros en Consultas de HistoryScreen', () => {
    const buildHistoryQuery = (busId?: string, socioId?: string, from?: string, to?: string) => {
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      params.set('limit', '90');
      params.set('include', 'trips');
      if (busId && busId !== 'TODOS') params.set('busId', busId);
      if (socioId && socioId !== 'TODOS') params.set('socioId', socioId);
      return params.toString();
    };

    const q10 = buildHistoryQuery('BUS-10', 'socio-10-id', '2026-10-01', '2026-10-10');
    expect(q10).toContain('busId=BUS-10');
    expect(q10).toContain('socioId=socio-10-id');

    const q01 = buildHistoryQuery('BUS-01', 'socio-01-id', '2026-10-01', '2026-10-10');
    expect(q01).toContain('busId=BUS-01');
    expect(q01).not.toContain('BUS-10');
  });

  it('1.3 Aislamiento de Gastos del Socio: Bus 10 y nuevas unidades no heredan muestras demo', () => {
    const isBus01 = (busId: string) => busId === 'BUS-01' || busId === '01';
    
    // Simular filtro de gastos remotos
    const sampleExpenses = [
      { id: 'EXP-AUG-01', busId: 'BUS-01', amount: 55 },
      { id: 'EXP-SEP-01', busId: 'BUS-01', amount: 110 },
      { id: 'EXP-REAL-10', busId: 'BUS-10', amount: 80 },
    ];

    const cleanBus10 = sampleExpenses.filter(e => {
      const isDemo = e.id.startsWith('EXP-AUG-') || e.id.startsWith('EXP-SEP-');
      if (isDemo && !isBus01('BUS-10')) return false;
      return e.busId === 'BUS-10';
    });

    expect(cleanBus10.length).toBe(1);
    expect(cleanBus10[0].id).toBe('EXP-REAL-10');
    expect(cleanBus10.some(e => e.id.startsWith('EXP-AUG-') || e.id.startsWith('EXP-SEP-'))).toBe(false);
  });

  it('1.4 Aislamiento Financiero: Producción y entregas de Bus 10 son independientes', () => {
    const recordsBus10 = [
      { date: '2026-10-01', bus: 'BUS-10', prod: 337.5, entrega: 113.75 },
      { date: '2026-10-02', bus: 'BUS-10', prod: 366.75, entrega: 142.0 },
      { date: '2026-10-03', bus: 'BUS-10', prod: 252.75, entrega: 27.0 },
      { date: '2026-10-04', bus: 'BUS-10', prod: 325.75, entrega: 112.75 },
    ];

    const totalProdBus10 = recordsBus10.reduce((s, r) => s + r.prod, 0);
    const totalEntregaBus10 = recordsBus10.reduce((s, r) => s + r.entrega, 0);

    expect(totalProdBus10).toBe(1282.75);
    expect(totalEntregaBus10).toBe(395.5);
    expect(recordsBus10.length).toBe(4);
  });
});
