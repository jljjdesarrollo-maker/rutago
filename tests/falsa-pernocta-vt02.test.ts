import { describe, test, expect } from 'bun:test';
import { isPernoctaRetornoFrec } from '../src/components/transport/FrecuenciaSelector';
import { VT_DATA } from '../src/lib/seed-vts';
import { calcularEstadoTiempoVenta, type FrecuenciaData } from '../src/components/transport/types-boletos';

describe('🌙 RESOLUCIÓN DE FALSA PERNOCTA EN VT 02 Y TURNOS DIURNOS (v3.61.55)', () => {

  test('1. VT 02 (6 vueltas diurnas): Ninguna frecuencia, incluida la última (19:25), debe ser marcada como pernocta', () => {
    const vt2 = VT_DATA.find(v => v.codigo === 'VT2');
    expect(vt2).toBeDefined();

    const frecs: FrecuenciaData[] = vt2!.frecuencias.map((f, i) => ({
      id: `VT2_frec_${i}`,
      vtCode: 'VT2',
      nombre: `${f.routeFrom}-${f.routeTo}`,
      ruta: `${f.routeFrom} - ${f.routeTo}`,
      hora: f.time,
      direccion: f.routeFrom === 'Loja' ? 'ida' : 'retorno',
      activo: true,
      createdAt: new Date().toISOString(),
    }));

    // Todas las frecuencias deben ser del Día 1 (esPernoctaRetorno = false)
    frecs.forEach((_, idx) => {
      const esPernocta = isPernoctaRetornoFrec(idx, frecs);
      expect(esPernocta).toBe(false);
    });

    // La vuelta 6 a las 19:25 es 100% diurna
    expect(isPernoctaRetornoFrec(5, frecs)).toBe(false);
  });

  test('2. Validación masiva de turnos 100% diurnos (sin pernocta): VT2, VT6, VT7, VT9, VT13, VT15, P3', () => {
    const turnosDiurnos = ['VT2', 'VT6', 'VT7', 'VT9', 'VT13', 'VT15', 'P3'];

    for (const codigo of turnosDiurnos) {
      const vt = VT_DATA.find(v => v.codigo === codigo);
      expect(vt).toBeDefined();

      const frecs: FrecuenciaData[] = vt!.frecuencias.map((f, i) => ({
        id: `${codigo}_frec_${i}`,
        vtCode: codigo,
        nombre: `${f.routeFrom}-${f.routeTo}`,
        ruta: `${f.routeFrom} - ${f.routeTo}`,
        hora: f.time,
        direccion: f.routeFrom === 'Loja' ? 'ida' : 'retorno',
        activo: true,
        createdAt: new Date().toISOString(),
      }));

      // Ninguna de sus frecuencias debe ser pernocta
      frecs.forEach((_, idx) => {
        const esPernocta = isPernoctaRetornoFrec(idx, frecs);
        expect(esPernocta).toBe(false);
      });
    }
  });

  test('3. Validación de turnos legítimos con pernocta: VT1, VT3, VT4, VT5, VT8, VT10, VT11, VT12, VT14, P1, P2', () => {
    const turnosConPernocta = ['VT1', 'VT3', 'VT4', 'VT5', 'VT8', 'VT10', 'VT11', 'VT12', 'VT14', 'P1', 'P2'];

    for (const codigo of turnosConPernocta) {
      const vt = VT_DATA.find(v => v.codigo === codigo);
      expect(vt).toBeDefined();

      const frecs: FrecuenciaData[] = vt!.frecuencias.map((f, i) => ({
        id: `${codigo}_frec_${i}`,
        vtCode: codigo,
        nombre: `${f.routeFrom}-${f.routeTo}`,
        ruta: `${f.routeFrom} - ${f.routeTo}`,
        hora: f.time,
        direccion: f.routeFrom === 'Loja' ? 'ida' : 'retorno',
        activo: true,
        createdAt: new Date().toISOString(),
      }));

      // Frecuencias intermedias NO deben ser pernocta
      for (let i = 0; i < frecs.length - 1; i++) {
        expect(isPernoctaRetornoFrec(i, frecs)).toBe(false);
      }

      // La última frecuencia SÍ debe ser retorno de pernocta (curr.hora < prev.hora)
      const lastIdx = frecs.length - 1;
      expect(isPernoctaRetornoFrec(lastIdx, frecs)).toBe(true);
    }
  });

  test('4. Venta en ruta para VT 02 vuelta 6 (19:25 Vilcabamba-Loja) a las 19:10 del mismo día: VENTA HABILITADA sin bloqueo', () => {
    const horaFrecuencia = '19:25';
    const ruta = 'Vilcabamba - Loja';
    const fechaHoy = '2026-10-17';
    const nowMismoDia = new Date(2026, 9, 17, 19, 10, 0); // 17 de Octubre 19:10 (15 min antes)

    const estadoTiempo = calcularEstadoTiempoVenta(
      horaFrecuencia,
      ruta,
      fechaHoy,
      undefined,
      false, // esPernoctaRetorno = false (corregido)
      nowMismoDia
    );

    expect(estadoTiempo.esPernocta).toBe(false);
    expect(estadoTiempo.bloqueadoPorAnticipacion).toBe(false);
    expect(estadoTiempo.bloqueado).toBe(false);
    expect(estadoTiempo.minutosTranscurridos).toBe(-15);
  });

  test('5. Contraste: Si se forzara pernocta errónea en VT 02 a las 19:10, se bloquearía falsamente por +1400 min de desfase', () => {
    const horaFrecuencia = '19:25';
    const ruta = 'Vilcabamba - Loja';
    const fechaHoy = '2026-10-17';
    const nowMismoDia = new Date(2026, 9, 17, 19, 10, 0);

    // Con el bug anterior (esPernoctaRetorno: true para VT2):
    const estadoConBug = calcularEstadoTiempoVenta(
      horaFrecuencia,
      ruta,
      fechaHoy,
      undefined,
      true, // Simulando el bug anterior
      nowMismoDia
    );

    // Se proyectaba al día siguiente a las 19:25, dando -1455 min y activando el bloqueo de anticipación
    expect(estadoConBug.esPernocta).toBe(true);
    expect(estadoConBug.bloqueadoPorAnticipacion).toBe(true);
    expect(estadoConBug.bloqueado).toBe(true);
  });

  test('6. Preservación intacta del comportamiento de retorno en VT 11 (06:55 AM Día 2)', () => {
    const vt11 = VT_DATA.find(v => v.codigo === 'VT11');
    expect(vt11).toBeDefined();

    const frecsVT11: FrecuenciaData[] = vt11!.frecuencias.map((f, i) => ({
      id: `VT11_frec_${i}`,
      vtCode: 'VT11',
      nombre: `${f.routeFrom}-${f.routeTo}`,
      ruta: `${f.routeFrom} - ${f.routeTo}`,
      hora: f.time,
      direccion: f.routeFrom === 'Loja' ? 'ida' : 'retorno',
      activo: true,
      createdAt: new Date().toISOString(),
    }));

    // Vuelta 5 (17:25) -> no pernocta
    expect(isPernoctaRetornoFrec(4, frecsVT11)).toBe(false);
    // Vuelta 6 (06:55) -> retorno tras pernocta (06:55 < 17:25)
    expect(isPernoctaRetornoFrec(5, frecsVT11)).toBe(true);
  });
});
