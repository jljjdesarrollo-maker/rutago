// RutaGo - ESC/POS Ticket Generator
// Generates thermal printer commands for 58mm printers

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
  textoPublicidad: string; // "Usa RutaGo en tu bus\n0997149000"
}

// Center text
function centerText(text: string, maxWidth: number = 32): string {
  // Pad spaces to center (approximate for monospace)
  const pad = Math.max(0, Math.floor((maxWidth - text.length) / 2));
  return ' '.repeat(pad) + text;
}

// Build ESC/POS byte array for a ticket
export function generateTicketBytes(ticket: TicketData): Uint8Array {
  const parts: Uint8Array[] = [];
  
  const push = (data: Uint8Array | string) => {
    if (typeof data === 'string') {
      parts.push(textToBytes(data));
    } else {
      parts.push(data);
    }
  };
  
  if (ticket.esViajeGratis) {
    // ── VIAJE GRATIS TICKET ──
    
    // Initialize printer
    push(new Uint8Array([ESC, 0x40])); // ESC @ - Initialize
    
    // Print green header (reverse mode for emphasis)
    // ESC E 1 = emphasized on
    push(new Uint8Array([ESC, 0x45, 0x01])); 
    // Double height
    push(new Uint8Array([GS, 0x21, 0x11])); // Double height/width
    
    push(centerText('VIAJE GRATIS'));
    push(new Uint8Array([LF]));
    
    // Normal size
    push(new Uint8Array([GS, 0x21, 0x00])); // Normal
    push(new Uint8Array([ESC, 0x45, 0x00])); // Emphasized off
    
    push(centerText('NO DEBE PAGAR'));
    push(new Uint8Array([LF, LF]));
    
    // Route info
    push(`${ticket.ruta}  ${ticket.horaFrecuencia}`);
    push(new Uint8Array([LF]));
    push(`${ticket.fecha}  ${ticket.hora}  ${ticket.ayudanteNombre}`);
    push(new Uint8Array([LF]));
    
    // Separator
    push(new Uint8Array([ESC, 0x45, 0x01])); // Emphasized on
    push('--------------------------------');
    push(new Uint8Array([ESC, 0x45, 0x00])); // Emphasized off
    push(new Uint8Array([LF]));
    
    // Destination
    push(`Dest: ${ticket.destino}  ${ticket.tipoPasajero}`);
    push(new Uint8Array([LF]));
    push(new Uint8Array([LF]));
    
    // Tarifa with discount
    if (ticket.tarifaOriginal != null) {
      push(`Tarifa normal: $${ticket.tarifaOriginal.toFixed(2)}`);
      push(new Uint8Array([LF]));
    }
    
    // Double height for $0.00
    push(new Uint8Array([GS, 0x21, 0x11])); // Double
    push('   NO PAGA  $0.00');
    push(new Uint8Array([GS, 0x21, 0x00])); // Normal
    push(new Uint8Array([LF]));
    push(new Uint8Array([LF]));
    
    // FELICIDADES
    push(new Uint8Array([GS, 0x21, 0x01])); // Double height only
    push(centerText('FELICIDADES!'));
    push(new Uint8Array([GS, 0x21, 0x00])); // Normal
    push(new Uint8Array([LF]));
    
    // Separator
    push(new Uint8Array([ESC, 0x45, 0x01]));
    push('--------------------------------');
    push(new Uint8Array([ESC, 0x45, 0x00]));
    push(new Uint8Array([LF]));
    
    // Boleto number
    push(new Uint8Array([GS, 0x21, 0x01])); // Double height
    push(centerText(`Boleto ${String(ticket.boletoNum).padStart(4, '0')}`));
    push(new Uint8Array([GS, 0x21, 0x00])); // Normal
    push(new Uint8Array([LF, LF]));
    
    // Footer
    push(centerText('Pase libremente'));
    push(new Uint8Array([LF]));
    push(centerText('Cortesia de RutaGo'));
    push(new Uint8Array([LF, LF]));
    
    // Publicity
    if (ticket.textoPublicidad) {
      const lines = ticket.textoPublicidad.split('\n');
      lines.forEach(line => {
        push(centerText(line));
        push(new Uint8Array([LF]));
      });
      push(new Uint8Array([LF]));
    }
    
    // Cut paper
    push(new Uint8Array([GS, 0x56, 0x01])); // GS V 1 - partial cut
    
  } else {
    // ── NORMAL TICKET ──
    
    // Initialize printer
    push(new Uint8Array([ESC, 0x40])); // ESC @
    
    // Logo
    push(new Uint8Array([GS, 0x21, 0x11])); // Double height/width
    push(centerText('RUTAGO'));
    push(new Uint8Array([GS, 0x21, 0x00])); // Normal
    push(new Uint8Array([LF]));
    
    // Route
    push(`${ticket.ruta}  ${ticket.horaFrecuencia}`);
    push(new Uint8Array([LF]));
    push(`${ticket.fecha}  ${ticket.hora}  ${ticket.ayudanteNombre}`);
    push(new Uint8Array([LF]));
    
    // Separator
    push(new Uint8Array([ESC, 0x45, 0x01])); // Emphasized
    push('--------------------------------');
    push(new Uint8Array([ESC, 0x45, 0x00]));
    push(new Uint8Array([LF]));
    
    // Destination + type
    push(`Dest: ${ticket.destino}  ${ticket.tipoPasajero}`);
    push(new Uint8Array([LF]));
    push(new Uint8Array([LF]));
    
    // Tarifa - BIG
    push(new Uint8Array([GS, 0x21, 0x11])); // Double
    push(`  $${ticket.tarifa.toFixed(2)}`);
    push(new Uint8Array([GS, 0x21, 0x00])); // Normal
    push(new Uint8Array([LF]));
    
    // Separator
    push('--------------------------------');
    push(new Uint8Array([LF]));
    
    // Boleto number
    push(new Uint8Array([GS, 0x21, 0x01])); // Double height
    push(centerText(`Boleto ${String(ticket.boletoNum).padStart(4, '0')}`));
    push(new Uint8Array([GS, 0x21, 0x00])); // Normal
    push(new Uint8Array([LF, LF]));
    
    // Promo box
    push('Recuerda tu boleto!');
    push(new Uint8Array([LF]));
    push('Proximo puede ser');
    push(new Uint8Array([LF]));
    push('      GRATIS');
    push(new Uint8Array([LF, LF]));
    
    // Publicity
    if (ticket.textoPublicidad) {
      const lines = ticket.textoPublicidad.split('\n');
      lines.forEach(line => {
        push(centerText(line));
        push(new Uint8Array([LF]));
      });
      push(new Uint8Array([LF]));
    }
    
    // Cut paper
    push(new Uint8Array([GS, 0x56, 0x01]));
  }
  
  // Combine all parts
  const totalLength = parts.reduce((sum, p) => sum + p.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  
  return result;
}
