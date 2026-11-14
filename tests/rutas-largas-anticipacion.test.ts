import { describe, test, expect } from 'bun:test';
import {
  calcularEstadoTiempoVenta,
  getOffsetCabeceraMinutos,
  DEFAULT_TIEMPO_VENTA_CONFIG,
} from '../src/components/transport/types-boletos';

describe('🚌 COMPENSACIÓN DE CABECERA PARROQUIAL EN RUTAS LARGAS (v3.61.80)', () => {
  const fechaHoy = '2026-11-14';
  const fechaAyer = '2026-11-13';

  test('1. getOffsetCabeceraMinutos asigna +60m a El Tambo/La Elvira/Zahuayco -> Loja, +30m a Yangana -> Loja y 0m al resto', () => {
    expect(getOffsetCabeceraMinutos('El Tambo - Loja')).toBe(60);
    expect(getOffsetCabeceraMinutos('La Elvira - Loja')).toBe(60);
    expect(getOffsetCabeceraMinutos('Zahuayco - Loja')).toBe(60);
    expect(getOffsetCabeceraMinutos('Yangana - Loja')).toBe(30);
    expect(getOffsetCabeceraMinutos('Vilcabamba - Loja')).toBe(0);
    expect(getOffsetCabeceraMinutos('Loja - El Tambo')).toBe(0);
    expect(getOffsetCabeceraMinutos('Loja - La Elvira')).toBe(0);
    expect(getOffsetCabeceraMinutos('Loja - Zahuayco')).toBe(0);
    expect(getOffsetCabeceraMinutos('Loja - Yangana')).toBe(0);
    expect(getOffsetCabeceraMinutos('Loja - Vilcabamba')).toBe(0);
  });

  test('2. El Tambo -> Loja (Rol 17:15, salida real 16:15): habilitado desde 15:30 (45m antes de parroquia) y en ruta a las 16:15', () => {
    const nowSalidaElTambo = new Date(2026, 10, 14, 16, 15, 0);
    const resSalida = calcularEstadoTiempoVenta('17:15', 'El Tambo - Loja', fechaHoy, undefined, false, nowSalidaElTambo);
    expect(resSalida.offsetCabeceraMinutos).toBe(60);
    expect(resSalida.tiempoAnticipacionMinutos).toBe(105);
    expect(resSalida.bloqueadoPorAnticipacion).toBe(false);
    expect(resSalida.bloqueado).toBe(false);

    const nowPreEmbarque = new Date(2026, 10, 14, 15, 35, 0);
    const resPre = calcularEstadoTiempoVenta('17:15', 'El Tambo - Loja', fechaHoy, undefined, false, nowPreEmbarque);
    expect(resPre.bloqueadoPorAnticipacion).toBe(false);

    const nowMuyTemprano = new Date(2026, 10, 14, 15, 20, 0);
    const resTemprano = calcularEstadoTiempoVenta('17:15', 'El Tambo - Loja', fechaHoy, undefined, false, nowMuyTemprano);
    expect(resTemprano.bloqueadoPorAnticipacion).toBe(true);
    expect(resTemprano.bloqueado).toBe(true);
  });

  test('3. La Elvira -> Loja (Rol 17:40) y Zahuayco -> Loja (Rol 16:10): habilitados desde 105 min antes del rol', () => {
    const nowElvira = new Date(2026, 10, 14, 16, 0, 0);
    const resElvira = calcularEstadoTiempoVenta('17:40', 'La Elvira - Loja', fechaHoy, undefined, false, nowElvira);
    expect(resElvira.tiempoAnticipacionMinutos).toBe(105);
    expect(resElvira.bloqueadoPorAnticipacion).toBe(false);

    const resZahuOk = calcularEstadoTiempoVenta('16:10', 'Zahuayco - Loja', fechaHoy, undefined, false, new Date(2026, 10, 14, 14, 30, 0));
    expect(resZahuOk.bloqueadoPorAnticipacion).toBe(false);

    const resZahuBloq = calcularEstadoTiempoVenta('16:10', 'Zahuayco - Loja', fechaHoy, undefined, false, new Date(2026, 10, 14, 14, 20, 0));
    expect(resZahuBloq.bloqueadoPorAnticipacion).toBe(true);
  });

  test('4. Yangana -> Loja (Rol 07:00 Día 2 pernocta, salida real 06:30): habilita 75 min antes del rol (05:45 AM)', () => {
    const resOk = calcularEstadoTiempoVenta('07:00', 'Yangana - Loja', fechaAyer, undefined, true, new Date(2026, 10, 14, 5, 50, 0));
    expect(resOk.esPernocta).toBe(true);
    expect(resOk.offsetCabeceraMinutos).toBe(30);
    expect(resOk.tiempoAnticipacionMinutos).toBe(75);
    expect(resOk.bloqueadoPorAnticipacion).toBe(false);

    const resBloq = calcularEstadoTiempoVenta('07:00', 'Yangana - Loja', fechaAyer, undefined, true, new Date(2026, 10, 14, 5, 30, 0));
    expect(resBloq.bloqueadoPorAnticipacion).toBe(true);
  });

  test('5. Rutas de IDA desde Loja hacia parroquia mantienen 45 min exactos sin offset adicional', () => {
    const resBloq = calcularEstadoTiempoVenta('12:10', 'Loja - El Tambo', fechaHoy, undefined, false, new Date(2026, 10, 14, 11, 20, 0));
    expect(resBloq.offsetCabeceraMinutos).toBe(0);
    expect(resBloq.tiempoAnticipacionMinutos).toBe(45);
    expect(resBloq.bloqueadoPorAnticipacion).toBe(true);

    const resOk = calcularEstadoTiempoVenta('12:10', 'Loja - El Tambo', fechaHoy, undefined, false, new Date(2026, 10, 14, 11, 30, 0));
    expect(resOk.bloqueadoPorAnticipacion).toBe(false);
  });

  test('6. Configuración personalizada tiempoAnticipacion = 30 min se suma correctamente al offset parroquial', () => {
    const customCfg = { ...DEFAULT_TIEMPO_VENTA_CONFIG, tiempoAnticipacion: 30 };
    const resOk = calcularEstadoTiempoVenta('17:15', 'El Tambo - Loja', fechaHoy, customCfg, false, new Date(2026, 10, 14, 15, 45, 0));
    expect(resOk.tiempoAnticipacionMinutos).toBe(90);
    expect(resOk.bloqueadoPorAnticipacion).toBe(false);

    const resBloq = calcularEstadoTiempoVenta('17:15', 'El Tambo - Loja', fechaHoy, customCfg, false, new Date(2026, 10, 14, 15, 40, 0));
    expect(resBloq.bloqueadoPorAnticipacion).toBe(true);
  });
});
