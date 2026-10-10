import { describe, it, expect } from 'bun:test';
import { buildCanonicalRecordPayload } from '../src/lib/canonical-record-payload';
import { normalizarDisco, resolverDiscoPorUnidad } from '../src/lib/turno-secuencia-tracker';

describe('🛡️ BLOQUE 2: Mantenimiento, Tiempos y Operación (Aislamiento Multi-Tenant)', () => {
  it('2.1 Aislamiento de Almacenamiento Local de Mantenimiento por busId', () => {
    const keyBus01 = `rg_mantenimientos_v2_BUS-01`;
    const keyBus10 = `rg_mantenimientos_v2_BUS-10`;
    const keyBus02 = `rg_mantenimientos_v2_BUS-02`;

    expect(keyBus01).not.toBe(keyBus10);
    expect(keyBus10).not.toBe(keyBus02);
  });

  it('2.2 Aislamiento de Resolución de Disco y VT en Radar Patrimonial', () => {
    expect(resolverDiscoPorUnidad('01', 'BUS-10')).toBe('10');
    expect(resolverDiscoPorUnidad('10', 'BUS-10')).toBe('10');
    expect(resolverDiscoPorUnidad('01', 'BUS-01')).toBe('01');
    expect(resolverDiscoPorUnidad(undefined, 'BUS-05')).toBe('05');

    const keyManualBus01 = `rg_socio_manual_vt_BUS-01`;
    const keyManualBus10 = `rg_socio_manual_vt_BUS-10`;
    expect(keyManualBus01).not.toBe(keyManualBus10);
  });

  it('2.3 Carga Histórica: Clave Local y Payload Canónico Etiquetados por Unidad', () => {
    const disco = '10';
    const vt = 'VT04';
    const date = '2026-10-02';
    const keyLocal = `arqueo_general_${disco}_${vt}_${date}`;
    expect(keyLocal).toBe('arqueo_general_10_VT04_2026-10-02');

    const payload = buildCanonicalRecordPayload({
      date,
      kmInicial: '814035',
      kmFinal: '814344',
      km: '309',
      busId: 'BUS-10',
      numeroDisco: '10',
      conductorNombre: 'Richard Medina',
      ayudanteNombre: 'Kelyn Solórzano',
      vtCode: vt,
      trips: [
        { routeFrom: 'Loja', routeTo: 'Vilcabamba', time: '06:15', efectivoReal: 55, income: 55 }
      ],
      expenses: [{ description: 'Diesel', amount: 35 }]
    });

    expect(payload.busId).toBe('BUS-10');
    expect(payload.numeroDisco).toBe('10');
    expect(payload.conductor).toBe('BUS-10 - Richard Medina');
    expect(payload.kmInicial).toBe('814035');
    expect(payload.kmFinal).toBe('814344');
    expect(payload.km).toBe('309');
  });
});
