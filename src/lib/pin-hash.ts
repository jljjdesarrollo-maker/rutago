// SHA-256 hash criptográfico para PINs con Salt — Seguridad Cero-Hardcode
import { createHash, randomBytes } from 'crypto';

/** Genera un salt criptográfico seguro de 16 bytes (32 caracteres hexadecimales) */
export function generateSalt(): string {
  return randomBytes(16).toString('hex');
}

/** Hashea un PIN combinándolo con su salt único */
export function hashPinWithSalt(pin: string, salt: string): string {
  return createHash('sha256').update(`${salt}:${pin}`).digest('hex');
}

/** Hashea un PIN simple (retrocompatibilidad) */
export function hashPin(pin: string): string {
  return createHash('sha256').update(pin).digest('hex');
}

/** Detecta si un PIN almacenado está en texto plano (4-6 dígitos) vs hash (64 caracteres hex) */
export function isPlaintextPin(stored: string): boolean {
  return stored.length <= 6;
}

/** Verifica un PIN contra el hash almacenado, soportando salt, hash simple o migración de plaintext */
export function verifyPin(pin: string, storedHash: string, salt?: string | null): boolean {
  if (!storedHash) return false;

  // 1. Si tiene salt registrado, verificar con salt
  if (salt) {
    return hashPinWithSalt(pin, salt) === storedHash;
  }

  // 2. Si es hash simple de 64 caracteres
  if (storedHash.length === 64) {
    return hashPin(pin) === storedHash;
  }

  // 3. Fallback defensivo para PINs en texto plano previos a migración
  if (isPlaintextPin(storedHash)) {
    return pin === storedHash;
  }

  return false;
}

