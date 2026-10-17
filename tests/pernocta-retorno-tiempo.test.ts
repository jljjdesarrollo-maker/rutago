import { describe, test, expect } from 'bun:test';
import { calcularEstadoTiempoVenta } from '../src/components/transport/types-boletos';

describe('🌙 BLINDAJE DE RETORNO AL DÍA SIGUIENTE (PERNOCTA/DÍA 2) Y COMPUERTA DE ANTICIPACIÓN (v3.61.52)', () => {
  const fechaViernes = '2026-10-16';
  const rutaExtendida = 'El Tambo - Loja';
  const horaRetorno = '06:55';

  test('1. Bloqueo estricto por anticipación el viernes en la noche (21:00) impidiendo venta prematura', () => {
    // Viernes a las 21:00 (hora en que el ayudante intentó abrir la frecuencia fuera de turno)
    const nowViernesNoche = new Date(2026, 9, 16, 21, 0, 0); // 16 de Octubre 21:00
    const estadoTiempo = calcularEstadoTiempoVenta(
      horaRetorno,
      rutaExtendida,
      fechaViernes,
      undefined,
      true, // esPernoctaRetorno
      nowViernesNoche
    );

    // Faltan 595 minutos (casi 10 horas) para las 06:55 del sábado
    expect(estadoTiempo.esPernocta).toBe(true);
    expect(estadoTiempo.bloqueadoPorAnticipacion).toBe(true);
    expect(estadoTiempo.bloqueado).toBe(true);
    expect(estadoTiempo.minutosTranscurridos).toBeLessThan(-45);
  });

  test('2. Desbloqueo y venta 100% activa el sábado en la mañana (06:40 AM) previo a la salida', () => {
    // Sábado a las 06:40 AM (15 minutos antes de la salida programada de las 06:55 AM)
    const nowSabadoManana = new Date(2026, 9, 17, 6, 40, 0);
    const estadoTiempo = calcularEstadoTiempoVenta(
      horaRetorno,
      rutaExtendida,
      fechaViernes,
      undefined,
      true, // esPernoctaRetorno
      nowSabadoManana
    );

    // Minutos transcurridos debe ser -15 min (NO 1,425 min como antes del fix)
    expect(estadoTiempo.esPernocta).toBe(true);
    expect(estadoTiempo.minutosTranscurridos).toBe(-15);
    expect(estadoTiempo.bloqueadoPorAnticipacion).toBe(false);
    expect(estadoTiempo.bloqueado).toBe(false);
  });

  test('3. Venta activa y tiempo en 0 a la hora exacta de salida (sábado 06:55 AM)', () => {
    const nowSalida = new Date(2026, 9, 17, 6, 55, 0);
    const estadoTiempo = calcularEstadoTiempoVenta(
      horaRetorno,
      rutaExtendida,
      fechaViernes,
      undefined,
      true,
      nowSalida
    );

    expect(estadoTiempo.minutosTranscurridos).toBe(0);
    expect(estadoTiempo.bloqueado).toBe(false);
    expect(estadoTiempo.bloqueadoPorAnticipacion).toBe(false);
  });

  test('4. Venta activa durante el trayecto en ruta (sábado 07:30 AM)', () => {
    const nowEnRuta = new Date(2026, 9, 17, 7, 30, 0);
    const estadoTiempo = calcularEstadoTiempoVenta(
      horaRetorno,
      rutaExtendida,
      fechaViernes,
      undefined,
      true,
      nowEnRuta
    );

    expect(estadoTiempo.minutosTranscurridos).toBe(35);
    expect(estadoTiempo.bloqueado).toBe(false);
    expect(estadoTiempo.tiempoRestante).toBe(140 - 35);
  });

  test('5. Bloqueo normal por límite de viaje alcanzado una vez transcurridos 140 min (sábado 09:20 AM)', () => {
    const nowConcluido = new Date(2026, 9, 17, 9, 20, 0); // 145 min después de 06:55
    const estadoTiempo = calcularEstadoTiempoVenta(
      horaRetorno,
      rutaExtendida,
      fechaViernes,
      undefined,
      true,
      nowConcluido
    );

    expect(estadoTiempo.minutosTranscurridos).toBe(145);
    expect(estadoTiempo.bloqueado).toBe(true);
    expect(estadoTiempo.bloqueadoPorAnticipacion).toBe(false);
    expect(estadoTiempo.tiempoRestante).toBe(0);
  });

  test('6. Auto-detección defensiva de Día 2 si esPernoctaRetorno no se pasa explícitamente', () => {
    // Si la sesión fue abierta el viernes pero now es sábado en la mañana (hh < 12)
    const nowSabado = new Date(2026, 9, 17, 6, 50, 0);
    const estadoTiempo = calcularEstadoTiempoVenta(
      horaRetorno,
      rutaExtendida,
      fechaViernes,
      undefined,
      undefined, // Sin flag explícito
      nowSabado
    );

    expect(estadoTiempo.esPernocta).toBe(true);
    expect(estadoTiempo.minutosTranscurridos).toBe(-5);
    expect(estadoTiempo.bloqueado).toBe(false);
  });
});
