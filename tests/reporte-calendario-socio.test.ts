import { describe, expect, it } from 'bun:test';
import {
  convertirIndiceALetra,
  calcularGastoDiesel,
  extraerKmRecorridos,
  generarRangoFechasCalendario,
  procesarReporteCalendarioSocio,
  generarDictamenEjecutivo,
} from '../src/lib/reporte-calendario-socio';

describe('🏛️ FASE 1: Motor de Reportes Calendario del Socio (v3.61.47)', () => {

  describe('1. Anonimización Alfabética Secuencial', () => {
    it('1.1 Convierte índices 0..25 a letras A..Z', () => {
      expect(convertirIndiceALetra(0)).toBe('A');
      expect(convertirIndiceALetra(1)).toBe('B');
      expect(convertirIndiceALetra(2)).toBe('C');
      expect(convertirIndiceALetra(25)).toBe('Z');
    });

    it('1.2 Convierte índices >= 26 a combinaciones AA, AB...', () => {
      expect(convertirIndiceALetra(26)).toBe('AA');
      expect(convertirIndiceALetra(27)).toBe('AB');
    });
  });

  describe('2. Extracción de Gasto de Combustible (Diésel)', () => {
    it('2.1 Identifica y suma gastos con "diesel", "diésel" o "combustible"', () => {
      const gastos = [
        { description: 'Carga de DIESEL estacion Vilcabamba', amount: 35.50 },
        { description: 'Peaje San Pedro', amount: 1.00 },
        { description: 'Diésel adicional ruta', amount: 20.00 },
        { description: 'Viático ayudante', amount: 5.00 },
        { description: 'Combustible tanqueo noche', amount: 15.00 },
      ];
      expect(calcularGastoDiesel(gastos)).toBe(70.50);
    });

    it('2.2 Retorna 0 si no hay gastos o son de otros rubros', () => {
      const gastos = [
        { description: 'Lavado de salón', amount: 5.00 },
        { description: 'Parche de llanta', amount: 4.00 },
      ];
      expect(calcularGastoDiesel(gastos)).toBe(0);
      expect(calcularGastoDiesel([])).toBe(0);
    });
  });

  describe('3. Odómetro y Kilometraje Válido', () => {
    it('3.1 Extrae recorrido diario por odómetro delta (kmFinal - kmInicial)', () => {
      const rec = { kmInicial: '892000', kmFinal: '892285', km: '0' };
      expect(extraerKmRecorridos(rec)).toBe(285);
    });

    it('3.2 Usa km directo si no hay kmInicial/kmFinal', () => {
      const rec = { km: '310.5' };
      expect(extraerKmRecorridos(rec)).toBe(310.5);
    });

    it('3.3 Rechaza deltas negativos o absurdos (> 1200 km/día)', () => {
      const recNegativo = { kmInicial: '892500', kmFinal: '892000' };
      expect(extraerKmRecorridos(recNegativo)).toBe(0);

      const recDesmedido = { kmInicial: '100000', kmFinal: '102000' };
      expect(extraerKmRecorridos(recDesmedido)).toBe(0);
    });
  });

  describe('4. Ventana Fija de Calendario y Detección de Baches', () => {
    it('4.1 Genera ventana fija de 7 días exactos con fecha base explícita', () => {
      const ventana = generarRangoFechasCalendario(7, '2026-10-15');
      expect(ventana.todasLasFechas.length).toBe(7);
      expect(ventana.fechaInicio).toBe('2026-10-09');
      expect(ventana.fechaFin).toBe('2026-10-15');
      expect(ventana.todasLasFechas[0]).toBe('2026-10-09');
      expect(ventana.todasLasFechas[6]).toBe('2026-10-15');
    });

    it('4.1b Por defecto genera ventana anclada en Ayer (T - 1) para evaluar jornadas cerradas', () => {
      const ventana = generarRangoFechasCalendario(7);
      const hoy = new Date();
      const ayer = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - 1, 12, 0, 0);
      const fechaFinEsperada = ayer.toISOString().split('T')[0];

      expect(ventana.todasLasFechas.length).toBe(7);
      expect(ventana.fechaFin).toBe(fechaFinEsperada);
      expect(ventana.todasLasFechas[6]).toBe(fechaFinEsperada);
    });

    it('4.2 Detecta baches de días sin registro para auditar al ayudante', () => {
      const registros = [
        { date: '2026-10-01', conductor: 'BUS-08', production: 280, km: '300', expenses: [{ description: 'Diesel', amount: 50 }] },
        { date: '2026-10-02', conductor: 'BUS-08', production: 290, km: '310', expenses: [{ description: 'Diesel', amount: 55 }] },
        { date: '2026-10-04', conductor: 'BUS-08', production: 310, km: '305', expenses: [{ description: 'Diesel', amount: 52 }] },
        { date: '2026-10-06', conductor: 'BUS-08', production: 275, km: '295', expenses: [{ description: 'Diesel', amount: 48 }] },
      ];

      const res = procesarReporteCalendarioSocio({
        diasVentana: 7,
        fechaInicio: '2026-10-01',
        fechaFin: '2026-10-07',
        busDisco: '08',
        registros,
      });

      expect(res.unidadSocio.diasCalendario).toBe(7);
      expect(res.unidadSocio.diasConRegistro).toBe(4);
      expect(res.unidadSocio.diasFaltantes).toBe(3);
      expect(res.unidadSocio.coberturaPorcentaje).toBe(57);
      expect(res.fechasSinRegistro).toEqual(['2026-10-03', '2026-10-05', '2026-10-07']);
      expect(res.dictamen.nivel).toBe('COBERTURA_CRITICA');
      expect(res.dictamen.titulo).toContain('Sincronización Incompleta');
    });
  });

  describe('5. Costo por Kilómetro y Lucro Cesante', () => {
    it('5.1 Calcula $/km de combustible estrictamente sobre km válidos', () => {
      const registros = [
        { date: '2026-10-01', conductor: 'BUS-08', production: 300, km: '300', expenses: [{ description: 'Diesel', amount: 60 }] },
        { date: '2026-10-02', conductor: 'BUS-08', production: 250, km: '200', expenses: [{ description: 'Diesel', amount: 40 }] },
        { date: '2026-10-03', conductor: 'BUS-08', production: 200, km: '0', expenses: [{ description: 'Diesel', amount: 20 }] },
      ];

      const res = procesarReporteCalendarioSocio({
        diasVentana: 3,
        fechaInicio: '2026-10-01',
        fechaFin: '2026-10-03',
        busDisco: '08',
        registros,
      });

      expect(res.unidadSocio.dieselTotal).toBe(120);
      expect(res.unidadSocio.kmValidosTotales).toBe(500);
      expect(res.unidadSocio.costoPorKm).toBe(0.24);
      expect(res.unidadSocio.margenNetoPorKm).toBe(1.26);
    });

    it('5.2 Calcula lucro cesante por frecuencias no realizadas', () => {
      const registros = [
        {
          date: '2026-10-01',
          conductor: 'BUS-08',
          production: 320,
          km: '300',
          expenses: [{ description: 'Diesel', amount: 60 }],
          trips: [
            { tipo: 'frecuencia', income: 40 },
            { tipo: 'frecuencia', income: 40 },
            { tipo: 'frecuencia', income: 40 },
            { tipo: 'frecuencia', income: 40 },
            { tipo: 'frecuencia', income: 40 },
            { tipo: 'frecuencia', income: 40 },
            { tipo: 'frecuencia', income: 40 },
            { tipo: 'frecuencia', income: 40 },
            { tipo: 'no_realizada', motivo: 'mantenimiento' },
            { tipo: 'no_realizada', motivo: 'daño_unidad' },
            { tipo: 'no_realizada', motivo: 'clima' },
          ],
        },
      ];

      const res = procesarReporteCalendarioSocio({
        diasVentana: 1,
        fechaInicio: '2026-10-01',
        fechaFin: '2026-10-01',
        busDisco: '08',
        registros,
      });

      expect(res.unidadSocio.frecuenciasProgramadas).toBe(11);
      expect(res.unidadSocio.frecuenciasRealizadas).toBe(8);
      expect(res.unidadSocio.frecuenciasNoRealizadas).toBe(3);
      expect(res.unidadSocio.lucroCesanteVueltas).toBe(120);
      expect(res.dictamen.nivel).toBe('ALERTA_OPERATIVA');
      expect(res.dictamen.titulo).toContain('Pérdida de Vueltas');
    });
  });

  describe('6. Anonimización Alfabética y Exclusión de Baja Cobertura', () => {
    it('6.1 Asigna códigos anónimos #T-A, #T-B a pares y preserva Tu Bus', () => {
      const registros = [
        { date: '2026-10-01', conductor: 'BUS-01', production: 350, km: '300', expenses: [{ description: 'Diesel', amount: 60 }] },
        { date: '2026-10-01', conductor: 'BUS-08', production: 320, km: '300', expenses: [{ description: 'Diesel', amount: 55 }] },
        { date: '2026-10-01', conductor: 'BUS-10', production: 280, km: '300', expenses: [{ description: 'Diesel', amount: 58 }] },
        { date: '2026-10-01', conductor: 'BUS-16', production: 250, km: '300', expenses: [{ description: 'Diesel', amount: 50 }] },
      ];

      const res = procesarReporteCalendarioSocio({
        diasVentana: 1,
        fechaInicio: '2026-10-01',
        fechaFin: '2026-10-01',
        busDisco: '08',
        tipoCircuito: 'TRONCAL_VT',
        registros,
      });

      expect(res.rankingAnonimo.length).toBe(4);
      expect(res.rankingAnonimo[0].codigoAnonimo).toBe('Unidad #T-A');
      expect(res.rankingAnonimo[0].medalla).toBe('🥇');
      expect(res.rankingAnonimo[1].codigoAnonimo).toBe('Bus 08 (Tú)');
      expect(res.rankingAnonimo[1].esTuUnidad).toBe(true);
      expect(res.rankingAnonimo[1].medalla).toBe('🥈');
      expect(res.rankingAnonimo[2].codigoAnonimo).toBe('Unidad #T-C');
      expect(res.rankingAnonimo[2].medalla).toBe('🥉');
      expect(res.rankingAnonimo[3].codigoAnonimo).toBe('Unidad #T-D');
    });

    it('6.2 Excluye unidades con cobertura < 30% del cálculo de la media cooperativa', () => {
      const registros = [
        ...Array.from({ length: 10 }, (_, i) => ({
          date: `2026-10-${String(i + 1).padStart(2, '0')}`,
          conductor: 'BUS-08',
          production: 300,
          km: '300',
          expenses: [{ description: 'Diesel', amount: 60 }],
        })),
        ...Array.from({ length: 9 }, (_, i) => ({
          date: `2026-10-${String(i + 1).padStart(2, '0')}`,
          conductor: 'BUS-01',
          production: 320,
          km: '300',
          expenses: [{ description: 'Diesel', amount: 60 }],
        })),
        {
          date: '2026-10-01',
          conductor: 'BUS-15',
          production: 50,
          km: '50',
          expenses: [{ description: 'Diesel', amount: 40 }],
        },
      ];

      const res = procesarReporteCalendarioSocio({
        diasVentana: 10,
        fechaInicio: '2026-10-01',
        fechaFin: '2026-10-10',
        busDisco: '08',
        registros,
      });

      expect(res.mediaCooperativa.unidadesConCoberturaSuficiente).toBe(2);
      expect(res.mediaCooperativa.costoPorKmPromedio).toBe(0.2);
    });
  });

  describe('7. Reglas de Dictamen Heurístico Determinista', () => {
    it('7.1 Dispara Alerta Mecánica de Diésel cuando costo/km supera 15% de la cooperativa', () => {
      const dictamen = generarDictamenEjecutivo({
        coberturaPorcentaje: 100,
        diasFaltantes: 0,
        cumplimientoPorcentaje: 98,
        frecNoRealizadas: 0,
        costoPorKm: 0.25,
        costoPorKmPromedioCoop: 0.20,
        kmValidosTotales: 1500,
        lucroCesanteVueltas: 0,
      });

      expect(dictamen.nivel).toBe('ALERTA_MECANICA');
      expect(dictamen.titulo).toContain('Consumo Anormal de Diésel');
      expect(dictamen.badgeColor).toBe('amber');
      expect(dictamen.recomendaciones.some(r => r.includes('filtro'))).toBe(true);
    });

    it('7.2 Dispara Dictamen Excelente cuando la unidad ahorra diésel y cumple vueltas', () => {
      const dictamen = generarDictamenEjecutivo({
        coberturaPorcentaje: 100,
        diasFaltantes: 0,
        cumplimientoPorcentaje: 98,
        frecNoRealizadas: 0,
        costoPorKm: 0.18,
        costoPorKmPromedioCoop: 0.21,
        kmValidosTotales: 2000,
        lucroCesanteVueltas: 0,
      });

      expect(dictamen.nivel).toBe('EXCELENTE');
      expect(dictamen.titulo).toContain('Alta Eficiencia');
      expect(dictamen.badgeColor).toBe('emerald');
    });
  });
});
