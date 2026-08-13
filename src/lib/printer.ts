// RutaGo - Bluetooth Thermal Printer Module
// Supports Rongta RPP02N (58mm, 203 DPI, Bluetooth 4.0, ESC/POS)

export interface PrinterDevice {
  id: string;
  name: string;
}

const PRINTER_STORAGE_KEY = 'rg_printer_last';

// Get last connected printer ID from localStorage
export function getLastPrinterId(): string | null {
  try {
    return localStorage.getItem(PRINTER_STORAGE_KEY);
  } catch { return null; }
}

// Save last connected printer ID
export function saveLastPrinterId(id: string): void {
  try {
    localStorage.setItem(PRINTER_STORAGE_KEY, id);
  } catch { /* ignore */ }
}

// Clear last printer (e.g., when user forgets the printer)
export function clearLastPrinter(): void {
  try {
    localStorage.removeItem(PRINTER_STORAGE_KEY);
  } catch { /* ignore */ }
}

// Check if Web Bluetooth API is available
export function isBluetoothAvailable(): boolean {
  return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
}

// Request Bluetooth device (shows browser pairing dialog)
export async function requestPrinter(): Promise<BluetoothDevice | null> {
  if (!isBluetoothAvailable()) {
    console.warn('Web Bluetooth not available');
    return null;
  }
  try {
    const device = await navigator.bluetooth.requestDevice({
      filters: [{ services: ['0000ff00-0000-1000-8000-00805f9b34fb'] }], // Generic printer service
      optionalServices: ['0000ff00-0000-1000-8000-00805f9b34fb'],
    });
    saveLastPrinterId(device.id);
    return device;
  } catch (e) {
    console.error('Error requesting Bluetooth device:', e);
    return null;
  }
}

// Auto-connect to last known printer (no dialog)
export async function autoConnectPrinter(): Promise<BluetoothDevice | null> {
  if (!isBluetoothAvailable()) return null;
  const lastId = getLastPrinterId();
  if (!lastId) return null;
  try {
    const devices = await navigator.bluetooth.getDevices();
    const device = devices.find(d => d.id === lastId);
    if (!device) return null;
    // Try to connect to GATT server to verify it's still available
    await device.gatt!.connect();
    // Disconnect immediately - we'll connect properly when printing
    await device.gatt!.disconnect();
    return device;
  } catch {
    return null;
  }
}

// Connect to a Bluetooth device's GATT server
async function connectGATT(device: BluetoothDevice): Promise<BluetoothRemoteGATTServer | null> {
  try {
    if (device.gatt?.connected) return device.gatt;
    return await device.gatt!.connect();
  } catch (e) {
    console.error('GATT connection failed:', e);
    return null;
  }
}

// Find the print characteristic (write to this to send data)
async function findPrintCharacteristic(gatt: BluetoothRemoteGATTServer): Promise<BluetoothRemoteGATTCharacteristic | null> {
  try {
    const service = await gatt.getPrimaryService('0000ff00-0000-1000-8000-00805f9b34fb');
    if (!service) return null;
    const characteristics = await service.getCharacteristics();
    // Find writable characteristic
    return characteristics.find(c => 
      c.properties.write || c.properties.writeWithoutResponse
    ) || null;
  } catch (e) {
    console.error('Error finding print characteristic:', e);
    return null;
  }
}

// Send raw bytes to printer
async function sendBytes(characteristic: BluetoothRemoteGATTCharacteristic, data: ArrayBuffer): Promise<boolean> {
  try {
    if (characteristic.properties.writeWithoutResponse) {
      await characteristic.writeValueWithoutResponse(data);
    } else {
      await characteristic.writeValue(data);
    }
    return true;
  } catch (e) {
    console.error('Error sending bytes to printer:', e);
    return false;
  }
}

// ESC/POS commands
export const ESC = 0x1B;
export const GS = 0x1D;
export const LF = 0x0A;

// Print text (with encoding)
export function textToBytes(text: string): Uint8Array {
  // ESC/POS uses CP437 or similar. For simplicity, we encode as ASCII/latin1
  // and replace non-latin1 chars
  const encoder = new TextEncoder();
  return encoder.encode(text);
}

// Main print function - sends ESC/POS commands to printer
export async function printTicket(device: BluetoothDevice, commands: Uint8Array): Promise<boolean> {
  if (!isBluetoothAvailable()) return false;
  try {
    const gatt = await connectGATT(device);
    if (!gatt) return false;
    
    const char = await findPrintCharacteristic(gatt);
    if (!char) {
      await gatt.disconnect();
      return false;
    }
    
    const success = await sendBytes(char, commands.buffer);
    await gatt.disconnect();
    return success;
  } catch (e) {
    console.error('Print failed:', e);
    return false;
  }
}
