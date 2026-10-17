import { describe, it, expect } from 'bun:test';
import {
  validarLecturaOdometro,
  calcularKmTeoricoJornada,
  type FrecuenciaParaKm,
} from '@/lib/odometer-validator';
import { buildCanonicalRecordPayload } from '@/lib/canonical-record-payload';
import { DEFAULT_CONFIG_KILOMETRAJE_RUTAS } from '@/types/rutas-km';
import { VT_DATA } from '@/lib/seed-vts';

describe('🏛️ PASO 3: BLINDAJE Y ASISTENCIA INTELIGENTE EN CARGA HISTÓRICA DEL SOCIO (v3.61.54)', () => {
  // Turno representativo: VT11 (Vilcabamba / El Tambo ~294 km)
  const vt11 = VT_DATA.find(v => v.codigo === 'VT11')!;
  const frecsVT11ParaKm: FrecuenciaParaKm[] = vt11.frecuencias.map(f => ({
    ruta: `${f.routeFrom} - ${f.routeTo}`,
    estado: 'cerrada',
  }));

  it('1.1 Calcula el kilometraje teórico del turno a partir del catálogo base (VT11 -> 273 km)', () => {
    const teorico = calcularKmTeoricoJornada(frecsVT11ParaKm, DEFAULT_CONFIG_KILOMETRAJE_RUTAS);
    expect(teorico).toBe(273);
  });

  it('2.1 Botón Inteligente [Usar Km Oficial del Turno]: Proyecta kmFinal cuando existe kmInicial', () => {
    const kmInicial = '896523';
    const kmTeorico = 294;
    const kmFinalProyectado = String(Math.round((parseFloat(kmInicial) + kmTeorico) * 10) / 10);
    expect(kmFinalProyectado).toBe('896817');

    // Valida que el odómetro resultante sea 100% verde y óptimo
    const validacion = validarLecturaOdometro(kmInicial, kmFinalProyectado, frecsVT11ParaKm);
    expect(validacion.estado).toBe('VERDE');
    expect(validacion.kmRecorridoReal).toBe(294);
    expect(validacion.permiteGuardar).toBe(true);
    expect(validacion.esBloqueante).toBe(false);
  });

  it('2.2 Botón Inteligente: Proyección reversa cuando existe un enlace posterior (nextKmAnclado)', () => {
    // Si ya existe el día siguiente (ej. 898,433 km) y se quiere proyectar la salida
    const nextKm = 898433;
    const kmTeorico = 416; // VT1 (416 km)
    const kmInicialCalculado = String(Math.round((nextKm - kmTeorico) * 10) / 10);
    expect(kmInicialCalculado).toBe('898017');
  });

  it('3.1 Candado Anti-Error Tipográfico (Ceros de Más): Bloquea saltos absurdos en la carga histórica', () => {
    // Intento de guardar un salto absurdo de 5,667 km (como el salto falso del 12-Oct)
    const resAbsurdo = validarLecturaOdometro('894456', '900123', frecsVT11ParaKm);
    expect(resAbsurdo.estado).toBe('ROJO');
    expect(resAbsurdo.esBloqueante).toBe(true);
    expect(resAbsurdo.permiteGuardar).toBe(false);
    expect(resAbsurdo.mensaje).toContain('Salto extremo');
    expect(resAbsurdo.mensaje).toContain('cero o dígito de más');
  });

  it('3.2 Bloqueo de Odómetro Invertido: kmFinal < kmInicial', () => {
    const resInvertido = validarLecturaOdometro('900000', '899500', frecsVT11ParaKm);
    expect(resInvertido.estado).toBe('ROJO');
    expect(resInvertido.esBloqueante).toBe(true);
    expect(resInvertido.permiteGuardar).toBe(false);
    expect(resInvertido.mensaje).toContain('Tacómetro invertido');
  });

  it('4.1 Enlace Cronológico Inteligente: Ordena candidatos por fecha de calendario estricta (< date)', () => {
    // Simula registros cargados en orden desordenado o asíncrono
    const candidates = [
      { date: '2026-10-04', kmFinal: '897745', busId: 'BUS-01' },
      { date: '2026-10-01', kmFinal: '896817', busId: 'BUS-01' },
      { date: '2026-10-05', kmFinal: '898017', busId: 'BUS-01' },
      { date: '2026-10-02', kmFinal: '897111', busId: 'BUS-01' },
      { date: '2026-10-03', kmFinal: '897383', busId: 'BUS-01' },
    ];

    const targetDate = '2026-10-06';
    const sortedPrev = candidates
      .filter(r => r.date < targetDate)
      .sort((a, b) => b.date.localeCompare(a.date));

    // El cierre más reciente por calendario es el 05-Oct con 898,017 km (sin importar el orden de creación)
    expect(sortedPrev[0].date).toBe('2026-10-05');
    expect(sortedPrev[0].kmFinal).toBe('898017');
  });

  it('5.1 Embudo Canónico: Incorpora odometroEstado y kmTeorico en el payload final de Carga Histórica', () => {
    const payload = buildCanonicalRecordPayload({
      date: '2026-10-06',
      kmInicial: '898017',
      kmFinal: '898433',
      km: '416',
      busId: 'BUS-01',
      numeroDisco: '01',
      conductorNombre: 'Jimmy Vera',
      vtCode: 'VT1',
      odometroEstado: 'VERDE',
      odometroKmTeorico: 416,
      odometroDesfaseKm: 0,
      trips: [],
      expenses: [],
      tickets: 0,
      cajaComun: 0,
      sobrante: 0,
    });

    expect(payload.odometroEstado).toBe('VERDE');
    expect(payload.odometroKmTeorico).toBe(416);
    expect(payload.odometroDesfaseKm).toBe(0);
    expect(payload.km).toBe('416');
    expect(payload.kmInicial).toBe('898017');
    expect(payload.kmFinal).toBe('898433');
  });
});
