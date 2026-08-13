// RutaGo - ESC/POS Ticket Generator
// Generates thermal printer commands for 58mm (3NStar PPT205BT / Rongta RPP02N)
// ULTRA-COMPACT: minimum lines, maximum speed. No decorative chars.
// Differentiation by font size + bold only.

import { ESC, GS, LF, textToBytes } from './printer';

export interface TicketData {
  ruta: string;           // "Loja - Vilcabamba"
  horaFrecuencia: string; // "08:15"
  fecha: string;         // "14/08/26"
  hora: string;          // "08:32"
  ayudanteNombre: string; // "Carlos M."
  destino: string;       // "Vilcabamba"
  tipoPasajero: string;   // "Entero" or "Media"
  tarifa: number;        // 2.50
  boletoNum: number;     // 47
  esViajeGratis: boolean;
  tarifaOriginal?: number; // what they would have paid
  textoPublicidad: string; // "Quieres RutaGo? 0997149000"
}

// Center text (32 chars max for 58mm)
function center(text: string, max: number = 32): string {
  const pad = Math.max(0, Math.floor((max - text.length) / 2));
  return ' '.repeat(pad) + text;
}

// Build ESC/POS byte array for a ticket
export function generateTicketBytes(t: TicketData): Uint8Array {
  const p: Uint8Array[] = [];
  const push = (data: Uint8Array | string) => {
    p.push(typeof data === 'string' ? textToBytes(data) : data);
  };

  // ESC/POS shortcuts
  const INIT = new Uint8Array([ESC, 0x40]);           // Initialize printer
  const BOLD_ON = new Uint8Array([ESC, 0x45, 0x01]);   // Emphasized ON
  const BOLD_OFF = new Uint8Array([ESC, 0x45, 0x00]);  // Emphasized OFF
  const DBL = new Uint8Array([GS, 0x21, 0x11]);       // Double height + width
  const DBL_H = new Uint8Array([GS, 0x21, 0x01]);      // Double height only
  const NORM = new Uint8Array([GS, 0x21, 0x00]);        // Normal size
  const NEWLINE = new Uint8Array([LF]);
  const NEWLINE2 = new Uint8Array([LF, LF]);
  const CUT = new Uint8Array([GS, 0x56, 0x01]);        // Partial cut

  if (t.esViajeGratis) {
    // ══════════════════════════════════════
    // VIAJE GRATIS — 10 lines, ~3 sec print
    // ══════════════════════════════════════

    push(INIT);

    // Line 1: VIAJE GRATIS — double size + bold
    push(BOLD_ON);
    push(DBL);
    push(center('VIAJE GRATIS'));
    push(NEWLINE);
    push(NORM);
    push(BOLD_OFF);

    // Line 2: NO DEBE PAGAR — bold
    push(BOLD_ON);
    push(center('NO DEBE PAGAR'));
    push(BOLD_OFF);
    push(NEWLINE);

    // Line 3: Route + frequency time
    push(`${t.ruta} ${t.horaFrecuencia}`);
    push(NEWLINE);

    // Line 4: Date + time + ayudante
    push(`${t.fecha} ${t.hora} ${t.ayudanteNombre}`);
    push(NEWLINE);

    // Line 5: Destination + type
    push(`Dest: ${t.destino}  ${t.tipoPasajero}`);
    push(NEWLINE);

    // Line 6: Tarifa + descuento en una linea
    if (t.tarifaOriginal != null) {
      push(`Normal: $${t.tarifaOriginal.toFixed(2)} Desc: -$${t.tarifaOriginal.toFixed(2)}`);
    } else {
      push(`Normal: $${t.tarifa.toFixed(2)} Desc: -$${t.tarifa.toFixed(2)}`);
    }
    push(NEWLINE);

    // Line 7: Paga: $0.00 — double size + bold
    push(BOLD_ON);
    push(DBL);
    push(center('Paga: $0.00'));
    push(NORM);
    push(BOLD_OFF);
    push(NEWLINE);

    // Line 8: FELICIDADES! — double height + bold
    push(BOLD_ON);
    push(DBL_H);
    push(center('FELICIDADES!'));
    push(NORM);
    push(BOLD_OFF);
    push(NEWLINE);

    // Line 9: Boleto number — double height
    push(DBL_H);
    push(center(`Boleto ${String(t.boletoNum).padStart(4, '0')}`));
    push(NORM);
    push(NEWLINE);

    // Line 10: Pase libre
    push(center('Pase libre - Cortesia RutaGo'));
    push(NEWLINE);

    // Publicity
    if (t.textoPublicidad) {
      push(center(t.textoPublicidad));
      push(NEWLINE);
    }

    push(CUT);

  } else {
    // ══════════════════════════════════════
    // NORMAL — 8 lines, ~2 sec print
    // ══════════════════════════════════════

    push(INIT);

    // Line 1: RUTAGO — double size + bold
    push(BOLD_ON);
    push(DBL);
    push(center('RUTAGO'));
    push(NORM);
    push(BOLD_OFF);
    push(NEWLINE);

    // Line 2: Route + frequency time
    push(`${t.ruta} ${t.horaFrecuencia}`);
    push(NEWLINE);

    // Line 3: Date + time + ayudante
    push(`${t.fecha} ${t.hora} ${t.ayudanteNombre}`);
    push(NEWLINE);

    // Line 4: Destination + type
    push(`Dest: ${t.destino}  ${t.tipoPasajero}`);
    push(NEWLINE);

    // Line 5: Tarifa — double size
    push(DBL);
    push(center(`$${t.tarifa.toFixed(2)}`));
    push(NORM);
    push(NEWLINE);

    // Line 6: Boleto number — double height
    push(DBL_H);
    push(center(`Boleto ${String(t.boletoNum).padStart(4, '0')}`));
    push(NORM);
    push(NEWLINE);

    // Line 7: Promo reminder — bold
    push(BOLD_ON);
    push(center('Proximo puede ser GRATIS'));
    push(BOLD_OFF);
    push(NEWLINE);

    // Line 8: Publicity
    if (t.textoPublicidad) {
      push(center(t.textoPublicidad));
      push(NEWLINE);
    }

    push(CUT);
  }

  // Combine all byte arrays
  const totalLen = p.reduce((s, b) => s + b.length, 0);
  const result = new Uint8Array(totalLen);
  let off = 0;
  for (const part of p) {
    result.set(part, off);
    off += part.length;
  }
  return result;
}
