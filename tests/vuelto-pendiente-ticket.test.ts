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

  test("2. Boleto CON billete de $20 seleccionado (pasaje $1.25): imprime PENDIENTE DEVOLUCION, Billete: $20.00 y VUELTO: $18.75", () => {
    const bytes = generateTicketBytes({
      ...baseTicket,
      billeteRecibido: 20,
      vueltoPendiente: 18.75,
    });
    const text = decodeTicket(bytes);
    expect(text).toContain("$1.25");
    expect(text).toContain("PENDIENTE DEVOLUCION");
    expect(text).toContain("Billete: $20.00");
    expect(text).toContain("VUELTO: $18.75");
  });

  test("3. Boleto CON billete de $10 seleccionado para 2 pasajeros (2 x $1.25 = $2.50): imprime VUELTO: $7.50", () => {
    const bytes = generateTicketBytes({
      ...baseTicket,
      cantidad: 2,
      billeteRecibido: 10,
      vueltoPendiente: 7.50,
    });
    const text = decodeTicket(bytes);
    expect(text).toContain("$2.50");
    expect(text).toContain("PENDIENTE DEVOLUCION");
    expect(text).toContain("Billete: $10.00");
    expect(text).toContain("VUELTO: $7.50");
  });

  test("4. Boleto ganador de VIAJE GRATIS ignora vuelto pendiente y mantiene formato de cortesía", () => {
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
});
