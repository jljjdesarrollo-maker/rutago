import { describe, test, expect } from "bun:test";
import { generateTicketBytes } from "../src/lib/ticket-escpos";

function decodeTicket(bytes: Uint8Array): string {
  return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
}

describe("💵 VUELTO PENDIENTE EN EMISIÓN DE BOLETOS E IMPRESIÓN TÉRMICA 58MM (v3.61.60)", () => {
  const baseTicket = {
    ruta: "Loja - Vilcabamba",
    horaFrecuencia: "06:25",
    fecha: "28/10/2026",
    hora: "06:30",
    ayudanteNombre: "Carlos M.",
    destino: "Vilcabamba",
    tipoPasajero: "Entero",
    tarifa: 1.25,
    cantidad: 1,
    boletoNum: 1,
    esViajeGratis: false,
    textoPublicidad: "Quieres RutaGo? 0997149000",
  };

  test("1. Boleto normal SIN seleccionar casilla de vuelto: no imprime bloque de PENDIENTE DEVOLUCION", () => {
    const bytes = generateTicketBytes(baseTicket);
    const text = decodeTicket(bytes);
    expect(text).toContain("RUTAGO");
    expect(text).toContain("$1.25");
    expect(text).not.toContain("PENDIENTE DEVOLUCION");
    expect(text).not.toContain("VUELTO:");
  });

  test("2. Boleto CON billete de $20 seleccionado (pasaje $1.25): imprime PENDIENTE DEVOLUCION ultracompacto con 1x Vilcabamba ($1.25) • Billete: $20 y VUELTO: $18.75", () => {
    const bytes = generateTicketBytes({
      ...baseTicket,
      billeteRecibido: 20,
      vueltoPendiente: 18.75,
    });
    const text = decodeTicket(bytes);
    expect(text).toContain("$1.25");
    expect(text).toContain("PENDIENTE DEVOLUCION");
    expect(text).toContain("1x Vilcabamba ($1.25) • Billete: $20");
    expect(text).toContain("VUELTO: $18.75");
  });

  test("3. Boleto CON billete de $10 seleccionado para 2 pasajeros (2 x $1.25 = $2.50): imprime 2x Vilcabamba ($2.50) • Billete: $10 y VUELTO: $7.50", () => {
    const bytes = generateTicketBytes({
      ...baseTicket,
      cantidad: 2,
      billeteRecibido: 10,
      vueltoPendiente: 7.50,
    });
    const text = decodeTicket(bytes);
    expect(text).toContain("$2.50");
    expect(text).toContain("PENDIENTE DEVOLUCION");
    expect(text).toContain("2x Vilcabamba ($2.50) • Billete: $10");
    expect(text).toContain("VUELTO: $7.50");
  });

  test("4. Boleto CON billete de $10 para 3 pasajeros (3 x $1.25 = $3.75): imprime 3x Vilcabamba ($3.75) • Billete: $10 y VUELTO: $6.25", () => {
    const bytes = generateTicketBytes({
      ...baseTicket,
      cantidad: 3,
      billeteRecibido: 10,
      vueltoPendiente: 6.25,
    });
    const text = decodeTicket(bytes);
    expect(text).toContain("$3.75");
    expect(text).toContain("PENDIENTE DEVOLUCION");
    expect(text).toContain("3x Vilcabamba ($3.75) • Billete: $10");
    expect(text).toContain("VUELTO: $6.25");
  });

  test("5. Boleto ganador de VIAJE GRATIS ignora vuelto pendiente y mantiene formato de cortesía", () => {
    const bytes = generateTicketBytes({
      ...baseTicket,
      esViajeGratis: true,
      tarifaOriginal: 1.25,
    });
    const text = decodeTicket(bytes);
    expect(text).toContain("VIAJE GRATIS");
    expect(text).toContain("Paga $0.00");
    expect(text).not.toContain("PENDIENTE DEVOLUCION");
  });

  test("6. Boleto normal (sin vuelto) mantiene avance compacto estándar de 3 líneas antes del corte (cero desperdicio de papel)", () => {
    const bytes = generateTicketBytes(baseTicket);
    const cutIndex = bytes.length - 3;
    expect(bytes[cutIndex]).toBe(0x1D);
    expect(bytes[cutIndex + 1]).toBe(0x56);
    expect(bytes[cutIndex + 2]).toBe(0x01);

    // Los 3 avances de margen antes del corte son 0x0A (LF)
    expect(bytes[cutIndex - 1]).toBe(0x0A);
    expect(bytes[cutIndex - 2]).toBe(0x0A);
    expect(bytes[cutIndex - 3]).toBe(0x0A);
    // cutIndex - 4 es el NEWLINE que cierra la línea de publicidad
    expect(bytes[cutIndex - 4]).toBe(0x0A);
    // cutIndex - 5 es el último caracter de la publicidad (ej. '0' de '...0997149000'), no un salto de línea
    expect(bytes[cutIndex - 5]).not.toBe(0x0A);
  });

  test("7. Boleto con vuelto pendiente deja dos líneas en blanco después de la última palabra (5 líneas de avance) para corte manual fácil", () => {
    const bytes = generateTicketBytes({
      ...baseTicket,
      billeteRecibido: 20,
      vueltoPendiente: 18.75,
    });
    const cutIndex = bytes.length - 3;
    expect(bytes[cutIndex]).toBe(0x1D);
    expect(bytes[cutIndex + 1]).toBe(0x56);
    expect(bytes[cutIndex + 2]).toBe(0x01);

    // Los 5 avances de margen antes del corte son 0x0A (LF): 3 estándar + 2 líneas en blanco para corte fácil
    expect(bytes[cutIndex - 1]).toBe(0x0A);
    expect(bytes[cutIndex - 2]).toBe(0x0A);
    expect(bytes[cutIndex - 3]).toBe(0x0A);
    expect(bytes[cutIndex - 4]).toBe(0x0A);
    expect(bytes[cutIndex - 5]).toBe(0x0A);
    // cutIndex - 6 es el NEWLINE que cierra la línea de publicidad
    expect(bytes[cutIndex - 6]).toBe(0x0A);
    // cutIndex - 7 es el último caracter de la publicidad (no un salto de línea)
    expect(bytes[cutIndex - 7]).not.toBe(0x0A);
  });
});
