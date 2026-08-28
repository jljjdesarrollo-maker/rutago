// SHA-256 hash para PINs — evita almacenamiento en texto plano
import { createHash } from 'crypto';

export function hashPin(pin: string): string {
  return createHash('sha256').update(pin).digest('hex');
}

/** Detecta si un PIN almacenado está en texto plano (4 dígitos) vs hash (64 hex chars) */
export function isPlaintextPin(stored: string): boolean {
  return stored.length <= 6; // PIN plaintext es 4-6 dígitos, hash SHA-256 es 64 chars
}
