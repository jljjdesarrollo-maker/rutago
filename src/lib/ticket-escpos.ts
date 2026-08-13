// RutaGo - ESC/POS Ticket Generator
// Generates thermal printer commands for 58mm (Rongta RPP02N, monochrome)
// Design: NO separator lines. Differentiate by font size, bold, and characters only.

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

  if (t.esViajeGratis) {
    // ══════════════════════════════════════════
    // ── VIAJE GRATIS (monocromatic, emphasis by size/bold) ──
    // ══════════════════════════════════════════

    // Initialize printer
    push(new Uint8Array([ESC, 0x40])); // ESC @

    // *** VIAJE GRATIS *** — double size + emphasized
    push(new Uint8Array([ESC, 0x45, 0x01])); // Emphasized ON
    push(new Uint8Array([GS, 0x21, 0x11])); // Double height + double width
    push(center('*** VIAJE GRATIS ***'));
    push(new Uint8Array([LF]));
    push(new Uint8Array([GS, 0x21, 0x00])); // Normal size
    push(new Uint8Array([ESC, 0x45, 0x00])); // Emphasized OFF

    // NO DEBE PAGAR — emphasized, normal size
    push(new Uint8Array([ESC, 0x45, 0x01])); // Emphasized ON
    push(center('NO DEBE PAGAR'));
    push(new Uint8Array([ESC, 0x45, 0x00])); // Emphasized OFF
    push(new Uint8Array([LF, LF]));

    // Route + time
    push(`${t.ruta} ${t.horaFrecuencia}`);
    push(new Uint8Array([LF]));
    push(`${t.fecha} ${t.hora} ${t.ayudanteNombre}`);
    push(new Uint8Array([LF]));

    // Destination + type
    push(`Dest: ${t.destino}  ${t.tipoPasajero}`);
    push(new Uint8Array([LF, LF]));

    // Tarifa breakdown
    if (t.tarifaOriginal != null) {
      push(`Tarifa normal: $${t.tarifaOriginal.toFixed(2)}`);
      push(new Uint8Array([LF]));
      push(`DESCUENTO:    -$${t.tarifaOriginal.toFixed(2)}`);
      push(new Uint8Array([LF]));
    }

    // Usted paga: $0.00 — emphasized + double height
    push(new Uint8Array([ESC, 0x45, 0x01])); // Emphasized ON
    push(new Uint8Array([GS, 0x21, 0x11])); // Double size
    push(center('Usted paga: $0.00'));
    push(new Uint8Array([GS, 0x21, 0x00])); // Normal
    push(new Uint8Array([ESC, 0x45, 0x00])); // Emphasized OFF
    push(new Uint8Array([LF, LF]));

    // >>> FELICIDADES! <<< — double height + emphasized
    push(new Uint8Array([ESC, 0x45, 0x01])); // Emphasized ON
    push(new Uint8Array([GS, 0x21, 0x01])); // Double height only
    push(center('>>> FELICIDADES! <<<'));
    push(new Uint8Array([GS, 0x21, 0x00])); // Normal
    push(new Uint8Array([ESC, 0x45, 0x00])); // Emphasized OFF
    push(new Uint8Array([LF]));

    // Boleto number — double height
    push(new Uint8Array([GS, 0x21, 0x01])); // Double height
    push(center(`Boleto ${String(t.boletoNum).padStart(4, '0')}`));
    push(new Uint8Array([GS, 0x21, 0x00])); // Normal
    push(new Uint8Array([LF, LF]));

    // Footer
    push(center('-- Pase libremente --'));
    push(new Uint8Array([LF]));
    push(center('Cortesia RutaGo'));
    push(new Uint8Array([LF, LF]));

    // Publicity line
    if (t.textoPublicidad) {
      push(center(t.textoPublicidad));
      push(new Uint8Array([LF, LF]));
    }

    // Cut paper
    push(new Uint8Array([GS, 0x56, 0x01])); // Partial cut

  } else {
    // ══════════════════════════════════════════
    // ── NORMAL TICKET (monocromatic, compact) ──
    // ══════════════════════════════════════════

    // Initialize printer
    push(new Uint8Array([ESC, 0x40])); // ESC @

    // RUTAGO — double height + double width + emphasized
    push(new Uint8Array([ESC, 0x45, 0x01])); // Emphasized ON
    push(new Uint8Array([GS, 0x21, 0x11])); // Double height + width
    push(center('RUTAGO'));
    push(new Uint8Array([GS, 0x21, 0x00])); // Normal
    push(new Uint8Array([ESC, 0x45, 0x00])); // Emphasized OFF
    push(new Uint8Array([LF]));

    // Route + frequency time — normal
    push(`${t.ruta} ${t.horaFrecuencia}`);
    push(new Uint8Array([LF]));

    // Date + time + ayudante — normal
    push(`${t.fecha} ${t.hora} ${t.ayudanteNombre}`);
    push(new Uint8Array([LF]));

    // Destination + type — normal
    push(`Dest: ${t.destino}  ${t.tipoPasajero}`);
    push(new Uint8Array([LF]));

    // Tarifa — double height + double width
    push(new Uint8Array([GS, 0x21, 0x11])); // Double size
    push(center(`$${t.tarifa.toFixed(2)}`));
    push(new Uint8Array([GS, 0x21, 0x00])); // Normal
    push(new Uint8Array([LF]));

    // Boleto number — double height
    push(new Uint8Array([GS, 0x21, 0x01])); // Double height
    push(center(`Boleto ${String(t.boletoNum).padStart(4, '0')}`));
    push(new Uint8Array([GS, 0x21, 0x00])); // Normal
    push(new Uint8Array([LF, LF]));

    // Promo reminder box — differentiated by emphasized text
    push(new Uint8Array([ESC, 0x45, 0x01])); // Emphasized ON
    push(center('Recuerda tu boleto'));
    push(new Uint8Array([ESC, 0x45, 0x00])); // Emphasized OFF
    push(new Uint8Array([LF]));
    push(center('Proximo puede ser'));
    push(new Uint8Array([LF]));
    push(new Uint8Array([ESC, 0x45, 0x01])); // Emphasized ON
    push(center('     GRATIS'));
    push(new Uint8Array([ESC, 0x45, 0x00])); // Emphasized OFF
    push(new Uint8Array([LF, LF]));

    // Publicity line
    if (t.textoPublicidad) {
      push(center(t.textoPublicidad));
      push(new Uint8Array([LF, LF]));
    }

    // Cut paper
    push(new Uint8Array([GS, 0x56, 0x01])); // Partial cut
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
