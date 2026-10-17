import { describe, it, expect } from 'bun:test';
import {
  validarLecturaOdometro,
  calcularLimiteAbsurdoKm,
  calcularKmTeoricoJornada,
  type FrecuenciaParaKm,
} from '@/lib/odometer-validator';
import { DEFAULT_CONFIG_KILOMETRAJE_RUTAS } from '@/types/rutas-km';

describe('🏛️ PASO 2: TOLERANCIA ELÁSTICA DINÁMICA DE ODÓMETRO EN ARQUEO DEL AYUDANTE (v3.61.53)', () => {
  // Configuración de frecuencias representativa de un turno VT oficial (ej. VT11 Vilcabamba / El Tambo ~294 km)
  const frecuenciasVT11: FrecuenciaParaKm[] = [
    { ruta: 'Loja - Vilcabamba', estado: 'cerrada' }, // 42 km
    { ruta: 'Vilcabamba - Loja', estado: 'cerrada' }, // 42 km
    { ruta: 'Loja - El Tambo', estado: 'cerrada' },   // 52.5 km
    { ruta: 'El Tambo - Loja', estado: 'cerrada' },   // 52.5 km
    { ruta: 'Loja - El Tambo', estado: 'cerrada' },   // 52.5 km
    { ruta: 'El Tambo - Loja', estado: 'cerrada' },   // 52.5 km
  ];

  it('1.1 Calcula correctamente el teórico del turno acumulado', () => {
    const kmTeorico = calcularKmTeoricoJornada(frecuenciasVT11, DEFAULT_CONFIG_KILOMETRAJE_RUTAS);
    expect(kmTeorico).toBe(294);
  });

  it('1.2 🟢 Rango Óptimo (Verde): Recorrido exacto o dentro de tolerancia (-10% a +25%)', () => {
    // 294 km teórico -> Lectura de 294 km
    const resExacto = validarLecturaOdometro('896523', '896817', frecuenciasVT11);
    expect(resExacto.estado).toBe('VERDE');
    expect(resExacto.kmRecorridoReal).toBe(294);
    expect(resExacto.desfaseKm).toBe(0);
    expect(resExacto.permiteGuardar).toBe(true);
    expect(resExacto.esBloqueante).toBe(false);

    // Lectura de 340 km (+15.6% sobre 294, dentro de +25%)
    const resLeve = validarLecturaOdometro('896523', '896863', frecuenciasVT11);
    expect(resLeve.estado).toBe('VERDE');
    expect(resLeve.permiteGuardar).toBe(true);
    expect(resLeve.esBloqueante).toBe(false);
  });

  it('2.1 🟡 Erradicación del Candado de 600 km: Recorridos de 600, 620 o 700 km ya NO bloquean con pantalla roja', () => {
    // ANTES de v3.61.53: Un recorrido > 600 km disparaba ROJO bloqueante inmediatamente
    // AHORA: Con tolerancia elástica dinámica entra en ÁMBAR (permite guardar con aviso preventivo)
    
    // Caso 600 km exactos (el antiguo tope donde se trababa)
    const res600 = validarLecturaOdometro('896523', '897123', frecuenciasVT11);
    expect(res600.estado).toBe('AMBAR');
    expect(res600.kmRecorridoReal).toBe(600);
    expect(res600.permiteGuardar).toBe(true);
    expect(res600.esBloqueante).toBe(false);
    expect(res600.mensaje).toContain('Variación de recorrido');
    expect(res600.motivosSugeridos.length).toBeGreaterThan(0);

    // Caso 650 km (ej. turno con vueltas extras o flete especial)
    const res650 = validarLecturaOdometro('896523', '897173', frecuenciasVT11);
    expect(res650.estado).toBe('AMBAR');
    expect(res650.kmRecorridoReal).toBe(650);
    expect(res650.permiteGuardar).toBe(true);
    expect(res650.esBloqueante).toBe(false);

    // Caso 800 km (día operativo largo)
    const res800 = validarLecturaOdometro('896523', '897323', frecuenciasVT11);
    expect(res800.estado).toBe('AMBAR');
    expect(res800.kmRecorridoReal).toBe(800);
    expect(res800.permiteGuardar).toBe(true);
    expect(res800.esBloqueante).toBe(false);
  });

  it('2.2 🟡 Variación inferior al programado (ej. bus varado o jornada parcial) permite guardar en ámbar', () => {
    // Bus que solo recorrió 100 km de los 294 programados (-66%)
    const resParcial = validarLecturaOdometro('896523', '896623', frecuenciasVT11);
    expect(resParcial.estado).toBe('AMBAR');
    expect(resParcial.kmRecorridoReal).toBe(100);
    expect(resParcial.permiteGuardar).toBe(true);
    expect(resParcial.esBloqueante).toBe(false);
    expect(resParcial.mensaje).toContain('Recorrido inferior al programado');
  });

  it('3.1 🔴 Candado ROJO Bloqueante 1: Odómetro invertido (kmFinal < kmInicial)', () => {
    // Lectura de llegada menor a la de salida
    const resInvertido = validarLecturaOdometro('896523', '895000', frecuenciasVT11);
    expect(resInvertido.estado).toBe('ROJO');
    expect(resInvertido.esBloqueante).toBe(true);
    expect(resInvertido.permiteGuardar).toBe(false);
    expect(resInvertido.mensaje).toContain('Tacómetro invertido');
  });

  it('3.2 🔴 Candado ROJO Bloqueante 2: Salto físicamente absurdo / Cero o dígito de más (> limiteAbsurdoKm)', () => {
    // Salto de 5,667 km (como el error histórico de octubre al cruzar 900k)
    const resAbsurdo = validarLecturaOdometro('894456', '900123', frecuenciasVT11);
    expect(resAbsurdo.kmRecorridoReal).toBe(5667);
    expect(resAbsurdo.estado).toBe('ROJO');
    expect(resAbsurdo.esBloqueante).toBe(true);
    expect(resAbsurdo.permiteGuardar).toBe(false);
    expect(resAbsurdo.mensaje).toContain('Salto extremo');
    expect(resAbsurdo.mensaje).toContain('cero o dígito de más');
  });

  it('4.1 Cota dinámica según el turno VT activo (calcularLimiteAbsurdoKm)', () => {
    // Para VT de 252 km: base de sanidad 1000 km
    expect(calcularLimiteAbsurdoKm(252)).toBe(1000);

    // Para VT1 (416 km): 416 * 2.5 = 1,040 km
    expect(calcularLimiteAbsurdoKm(416)).toBe(1040);

    // Sin turno (0 km): base 1000 km
    expect(calcularLimiteAbsurdoKm(0)).toBe(1000);
  });

  it('4.2 Turno largo (VT1 416 km) acepta holgadamente recorridos de 700 km en ÁMBAR y bloquea solo en > 1040 km', () => {
    const frecsVT1: FrecuenciaParaKm[] = [
      { ruta: 'Loja - Zahuayco', estado: 'cerrada' }, // 91
      { ruta: 'Zahuayco - Loja', estado: 'cerrada' }, // 91
      { ruta: 'Loja - La Elvira', estado: 'cerrada' }, // 78
      { ruta: 'La Elvira - Loja', estado: 'cerrada' }, // 78
      { ruta: 'Loja - El Tambo', estado: 'cerrada' },  // 52.5
      { ruta: 'El Tambo - Loja', estado: 'cerrada' },  // 52.5
    ]; // Total ~443 km
    const teorico = calcularKmTeoricoJornada(frecsVT1);
    expect(teorico).toBeGreaterThan(400);

    // 700 km recorridos en un turno largo
    const res700 = validarLecturaOdometro('898017', '898717', frecsVT1);
    expect(res700.estado).toBe('AMBAR');
    expect(res700.permiteGuardar).toBe(true);
    expect(res700.esBloqueante).toBe(false);
  });
});
