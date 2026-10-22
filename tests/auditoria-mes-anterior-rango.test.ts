import { describe, expect, it } from 'bun:test';
import {
  calcularRangoAuditoriaSocio,
  saveReporteCalendarioSnapshot,
  getReporteCalendarioSnapshot,
  type ReporteSocioPayload,
} from '../src/lib/reporte-calendario-socio';

describe('🏛️ AUDITORÍA DEL SOCIO: BOTONERA INTELIGENTE Y RANGOS DE FECHA (v3.61.57)', () => {

  describe('1. Resolución del Modo 15 Días (Rueda de Turnos VT)', () => {
    it('1.1 Genera exactamente 15 días consecutivos anclados en Ayer (corte a ayer)', () => {
      const res = calcularRangoAuditoriaSocio('15_DIAS', { fechaBaseReferencia: '2026-10-22' });
      expect(res.diasVentana).toBe(15);
      expect(res.fechaFin).toBe('2026-10-21');
      expect(res.fechaInicio).toBe('2026-10-07');
      expect(res.todasLasFechas.length).toBe(15);
      expect(res.todasLasFechas[0]).toBe('2026-10-07');
      expect(res.todasLasFechas[14]).toBe('2026-10-21');
      expect(res.esPeriodoCerrado).toBe(true);
      expect(res.label).toBe('15 Días (Rueda VT)');
    });

    it('1.2 Soporta compatibilidad con número 15 y 7', () => {
      const res15 = calcularRangoAuditoriaSocio(15, { fechaBaseReferencia: '2026-10-22' });
      expect(res15.diasVentana).toBe(15);
      expect(res15.modo).toBe('15_DIAS');

      const res7 = calcularRangoAuditoriaSocio(7, { fechaBaseReferencia: '2026-10-22' });
      expect(res7.diasVentana).toBe(15);
      expect(res7.modo).toBe('15_DIAS');
    });
  });

  describe('2. Resolución del Modo Mes Anterior (Cierre 100% Conciliado)', () => {
    it('2.1 Calcula exactamente del 1 al 30 de Septiembre para una fecha en Octubre 2026', () => {
      const res = calcularRangoAuditoriaSocio('MES_ANTERIOR', { fechaBaseReferencia: '2026-10-22' });
      expect(res.fechaInicio).toBe('2026-09-01');
      expect(res.fechaFin).toBe('2026-09-30');
      expect(res.diasVentana).toBe(30);
      expect(res.todasLasFechas.length).toBe(30);
      expect(res.esPeriodoCerrado).toBe(true);
      expect(res.label).toBe('Mes Anterior');
      expect(res.descripcionPeriodo).toContain('Septiembre 2026');
      expect(res.descripcionPeriodo).toContain('cerrado 100% conciliado');
    });

    it('2.2 Maneja cambio de año: Enero 2027 retrocede a Diciembre 2026 completo (31 días)', () => {
      const res = calcularRangoAuditoriaSocio('MES_ANTERIOR', { fechaBaseReferencia: '2027-01-05' });
      expect(res.fechaInicio).toBe('2026-12-01');
      expect(res.fechaFin).toBe('2026-12-31');
      expect(res.diasVentana).toBe(31);
      expect(res.descripcionPeriodo).toContain('Diciembre 2026');
    });

    it('2.3 Maneja Febrero en año no bisiesto (28 días exactos)', () => {
      const res = calcularRangoAuditoriaSocio('MES_ANTERIOR', { fechaBaseReferencia: '2026-03-15' });
      expect(res.fechaInicio).toBe('2026-02-01');
      expect(res.fechaFin).toBe('2026-02-28');
      expect(res.diasVentana).toBe(28);
      expect(res.descripcionPeriodo).toContain('Febrero 2026');
    });

    it('2.4 Soporta compatibilidad con número 30 mapeado a Mes Anterior', () => {
      const res30 = calcularRangoAuditoriaSocio(30, { fechaBaseReferencia: '2026-10-22' });
      expect(res30.fechaInicio).toBe('2026-09-01');
      expect(res30.fechaFin).toBe('2026-09-30');
    });
  });

  describe('3. Resolución del Modo Mes en Curso (Cierre Parcial)', () => {
    it('3.1 Calcula del día 1 del mes hasta ayer (corte a ayer)', () => {
      const res = calcularRangoAuditoriaSocio('MES_ACTUAL', { fechaBaseReferencia: '2026-10-22' });
      expect(res.fechaInicio).toBe('2026-10-01');
      expect(res.fechaFin).toBe('2026-10-21');
      expect(res.diasVentana).toBe(21);
      expect(res.esPeriodoCerrado).toBe(false);
      expect(res.label).toBe('Mes en Curso');
      expect(res.descripcionPeriodo).toContain('Cierre parcial en marcha');
    });

    it('3.2 Protege contra día 1 del mes evitando fechaFin anterior a fechaInicio', () => {
      const resDia1 = calcularRangoAuditoriaSocio('MES_ACTUAL', { fechaBaseReferencia: '2026-10-01' });
      expect(resDia1.fechaInicio).toBe('2026-10-01');
      expect(resDia1.fechaFin).toBe('2026-10-01');
      expect(resDia1.diasVentana).toBe(1);
    });
  });

  describe('4. Resolución del Modo Rango Personalizado con Blindajes de Seguridad', () => {
    it('4.1 Acepta un rango válido de 16 días dentro del margen permitido', () => {
      const res = calcularRangoAuditoriaSocio('PERSONALIZADO', {
        fechaInicio: '2026-09-10',
        fechaFin: '2026-09-25',
        fechaBaseReferencia: '2026-10-22',
      });
      expect(res.fechaInicio).toBe('2026-09-10');
      expect(res.fechaFin).toBe('2026-09-25');
      expect(res.diasVentana).toBe(16);
      expect(res.label).toBe('Personalizado');
    });

    it('4.2 Clampa estrictamente al día de ayer si se envían fechas de hoy o futuras', () => {
      const resFuturo = calcularRangoAuditoriaSocio('PERSONALIZADO', {
        fechaInicio: '2026-10-15',
        fechaFin: '2026-10-30', // Futuro respecto a fechaBase 2026-10-22
        fechaBaseReferencia: '2026-10-22',
      });
      expect(resFuturo.fechaFin).toBe('2026-10-21'); // Ayer exacto
    });

    it('4.3 Aplica blindaje estricto de máximo 60 días para proteger la memoria del dispositivo', () => {
      const resExcesivo = calcularRangoAuditoriaSocio('PERSONALIZADO', {
        fechaInicio: '2026-06-01',
        fechaFin: '2026-10-21', // 143 días de diferencia
        fechaBaseReferencia: '2026-10-22',
      });
      expect(resExcesivo.diasVentana).toBe(60);
      expect(resExcesivo.fechaFin).toBe('2026-10-21');
      // 2026-10-21 menos 59 días = 2026-08-23
      expect(resExcesivo.fechaInicio).toBe('2026-08-23');
    });
  });

  describe('5. Persistencia SWR de Snapshots con Claves String', () => {
    it('5.1 Almacena y recupera snapshot con clave de Mes Anterior', () => {
      const mockPayload = {
        ventana: { dias: 30, fechaInicio: '2026-09-01', fechaFin: '2026-09-30' },
        busActual: { id: 'BUS-08', numeroDisco: '08', tipoOperacion: 'TRONCAL_VT' },
        unidadSocio: { disco: '08' } as any,
        mediaCooperativa: {} as any,
        bulletChart: {} as any,
        rankingAnonimo: [],
        diagnosticoPrivadoSocio: [],
        fechasSinRegistro: [],
        dictamen: { nivel: 'EXCELENTE' } as any,
        timestamp: new Date().toISOString(),
      } as ReporteSocioPayload;

      saveReporteCalendarioSnapshot('BUS-08', 'MES_ANTERIOR', mockPayload);
      const recuperado = getReporteCalendarioSnapshot('BUS-08', 'MES_ANTERIOR');
      expect(recuperado).not.toBeNull();
      expect(recuperado?.payload.ventana.dias).toBe(30);
      expect(recuperado?.busId).toBe('BUS-08');
    });
  });
});
