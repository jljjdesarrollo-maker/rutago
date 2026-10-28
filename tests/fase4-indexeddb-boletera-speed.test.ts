import { describe, it, expect } from 'bun:test';
import fs from 'fs';
import path from 'path';

describe('Fase 4: Optimización de Velocidad en Ruta para el Ayudante (IndexedDB, TicketScreen y FrecuenciaSelector)', () => {
  const idbSource = fs.readFileSync(path.join(__dirname, '../src/lib/indexeddb.ts'), 'utf8');
  const ticketSource = fs.readFileSync(path.join(__dirname, '../src/components/transport/TicketScreen.tsx'), 'utf8');
  const selectorSource = fs.readFileSync(path.join(__dirname, '../src/components/transport/FrecuenciaSelector.tsx'), 'utf8');

  it('reutiliza la conexión IDBDatabase en memoria (cachedDbPromise) con auto-limpieza en onclose/onversionchange', () => {
    expect(idbSource).toContain('let cachedDbPromise: Promise<IDBDatabase> | null = null;');
    expect(idbSource).toContain('if (cachedDbPromise) return cachedDbPromise;');
    expect(idbSource).toContain('db.onclose = () => { cachedDbPromise = null; };');
    expect(idbSource).toContain('db.onversionchange = () => {');
  });

  it('implementa saveVentasBatch para insertar múltiples pasajeros en 1 sola transacción readwrite', () => {
    expect(idbSource).toContain('export async function saveVentasBatch(ventas: VentaLocal[]): Promise<void>');
    expect(idbSource).toContain('for (const venta of ventas) {');
    expect(idbSource).toContain('store.put(venta);');
  });

  it('optimiza getVentasPendientes y countVentasPendientes usando el índice nativo syncStatus sin escanear boletos synced', () => {
    expect(idbSource).toContain("const reqPending = index.getAll('pending');");
    expect(idbSource).toContain("const reqError = index.getAll('error');");
    expect(idbSource).toContain("const reqPending = index.count('pending');");
    expect(idbSource).toContain("const reqError = index.count('error');");
  });

  it('blinda el fallback de getVentasByFrecuencia filtrando estrictamente por estadoId o frecuenciaId', () => {
    expect(idbSource).toContain('resolve(all.filter(v => v.estadoId === estadoId || v.frecuenciaId === estadoId));');
  });

  it('elimina la doble lectura de IndexedDB al abrir TicketScreen, usa saveVentasBatch y actualiza contadores en 0 ms', () => {
    expect(ticketSource).toContain("import { saveVenta, saveVentasBatch, getVentasByFrecuencia, type VentaLocal } from '@/lib/indexeddb';");
    expect(ticketSource).toContain("import { isBluetoothAvailable, getPrinterDevice, printTicket } from '@/lib/printer';");
    expect(ticketSource).toContain("import { generateTicketBytes } from '@/lib/ticket-escpos';");
    expect(ticketSource).toContain('await saveVentasBatch(nuevasVentas);');
    expect(ticketSource).toContain('setVentasHoy(prev => prev + cantidadEfectiva);');
    expect(ticketSource).toContain('setTotalHoy(prev => prev + montoCobradoEfectivo);');
    expect(ticketSource).not.toContain("await import('@/lib/indexeddb')");
    expect(ticketSource).not.toContain("await import('@/lib/printer')");
  });

  it('ejecuta en paralelo con Promise.all la lectura de frecuencias en FrecuenciaSelector.tsx', () => {
    expect(selectorSource).toContain('const results = await Promise.all(');
    expect(selectorSource).toContain('estados.map(async (estado) => {');
  });
});
