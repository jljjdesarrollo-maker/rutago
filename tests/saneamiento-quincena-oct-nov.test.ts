import { describe, it, expect } from 'bun:test';
import {
  CALIBRACION_OCT_NOV_2026,
  KM_BASE_INICIAL_OCT14,
  KM_BASE_FINAL_NOV02,
  DELTA_TOTAL_QUINCENA,
  healRecordOdometroQuincena,
} from '../src/lib/odometro-calibracion-quincena';

import { INITIAL_PILOT_BUS } from '../src/lib/fleet-storage';

describe('🏛️ SANEAMIENTO Y CALIBRACIÓN OFICIAL DE ODÓMETROS UNIDAD 01 (14-OCT A 02-NOV 2026)', () => {
  it('1. Debe contener exactamente 19 jornadas consecutivas', () => {
    expect(CALIBRACION_OCT_NOV_2026.length).toBe(19);
    expect(CALIBRACION_OCT_NOV_2026[0].fecha).toBe('2026-10-15');
    expect(CALIBRACION_OCT_NOV_2026[18].fecha).toBe('2026-11-02');
  });

  it('2. El anclaje inicial al 14/10 debe ser exactamente 900,853 km', () => {
    expect(KM_BASE_INICIAL_OCT14).toBe(900853);
    expect(CALIBRACION_OCT_NOV_2026[0].kmSalida).toBe(900853);
  });

  it('3. El anclaje final al 02/11 debe ser exactamente 907,085 km', () => {
    expect(KM_BASE_FINAL_NOV02).toBe(907085);
    expect(CALIBRACION_OCT_NOV_2026[18].kmLlegada).toBe(907085);
  });

  it('4. La suma exacta de kilómetros debe ser 6,232 km (Delta Total)', () => {
    const sumaKm = CALIBRACION_OCT_NOV_2026.reduce((acc, j) => acc + j.kmDia, 0);
    expect(sumaKm).toBe(DELTA_TOTAL_QUINCENA);
    expect(KM_BASE_FINAL_NOV02 - KM_BASE_INICIAL_OCT14).toBe(DELTA_TOTAL_QUINCENA);
  });

  it('5. Debe existir continuidad ininterrumpida día a día (sin saltos ni vacíos)', () => {
    for (let i = 1; i < CALIBRACION_OCT_NOV_2026.length; i++) {
      const prev = CALIBRACION_OCT_NOV_2026[i - 1];
      const curr = CALIBRACION_OCT_NOV_2026[i];
      expect(curr.kmSalida).toBe(prev.kmLlegada);
      expect(curr.kmLlegada).toBe(curr.kmSalida + curr.kmDia);
    }
  });

  it('6. El mantenimiento de 902,416 km debe quedar enmarcado en el 19 de Octubre (VT14)', () => {
    const oct19 = CALIBRACION_OCT_NOV_2026.find(j => j.fecha === '2026-10-19');
    expect(oct19).toBeDefined();
    if (oct19) {
      expect(oct19.kmSalida).toBeLessThanOrEqual(902416);
      expect(oct19.kmLlegada).toBeGreaterThanOrEqual(902416);
    }
  });

  it('7. Cada jornada debe mantener proporcionalidad por Grupo VT y consumo coherente', () => {
    for (const j of CALIBRACION_OCT_NOV_2026) {
      expect(j.kmDia).toBeGreaterThanOrEqual(280);
      expect(j.kmDia).toBeLessThanOrEqual(450);
      if (['VT1', 'VT7', 'VT14'].includes(j.vt)) {
        expect(j.vueltas).toBe(8);
        expect(j.kmDia).toBeGreaterThanOrEqual(380);
      } else {
        expect(j.vueltas).toBe(6);
        expect(j.kmDia).toBeLessThanOrEqual(380);
      }
    }
  });

  it('8. INITIAL_PILOT_BUS debe reflejar la calibración oficial a 907,085 km', () => {
    expect(INITIAL_PILOT_BUS.odometroInicial).toBe('907085');
    expect(INITIAL_PILOT_BUS.notas).toContain('907,085 km');
  });

  it('9. healRecordOdometroQuincena debe regularizar un registro del 02/11/2026 de 901,490 a 907,085 km', () => {
    const uncalibratedRecord = {
      id: 'rec-test-02nov',
      date: '2026-11-02',
      conductor: 'BUS-01 - Jorge Conductor',
      numeroDisco: '01',
      kmInicial: '901202',
      kmFinal: '901490',
      km: '288',
      odometroKmTeorico: null,
      odometroEstado: null,
      odometroDesfaseKm: null,
    };

    const result = healRecordOdometroQuincena(uncalibratedRecord);
    expect(result.healed).toBe(true);
    expect(result.record.kmInicial).toBe('906797');
    expect(result.record.kmFinal).toBe('907085');
    expect(result.record.km).toBe('288');
    expect(result.record.odometroKmTeorico).toBe(288);
    expect(result.record.odometroEstado).toBe('VERDE');
    expect(result.record.odometroDesfaseKm).toBe(0);
  });

  it('10. healRecordOdometroQuincena no debe alterar registros ya calibrados', () => {
    const alreadyCalibrated = {
      id: 'rec-test-02nov-ok',
      date: '2026-11-02',
      conductor: 'BUS-01 - Jorge Conductor',
      numeroDisco: '01',
      kmInicial: '906797',
      kmFinal: '907085',
      km: '288',
      odometroKmTeorico: 288,
      odometroEstado: 'VERDE',
      odometroDesfaseKm: 0,
    };

    const result = healRecordOdometroQuincena(alreadyCalibrated);
    expect(result.healed).toBe(false);
    expect(result.record.kmFinal).toBe('907085');
  });

  it('11. healRecordOdometroQuincena no debe alterar registros de otras unidades (ej. Bus 02)', () => {
    const bus02Record = {
      id: 'rec-test-bus02',
      date: '2026-11-02',
      conductor: 'BUS-02 - Conductor Dos',
      numeroDisco: '02',
      kmInicial: '500000',
      kmFinal: '500300',
      km: '300',
    };

    const result = healRecordOdometroQuincena(bus02Record);
    expect(result.healed).toBe(false);
    expect(result.record.kmFinal).toBe('500300');
  });
});

