// RutaGo - Bluetooth Thermal Printer Module
// Supports 3nStar PPT205BT (58mm, 203 DPI, Bluetooth SPP, ESC/POS)
// Also compatible with Rongta RPP02N and similar 58mm BT printers

export interface PrinterDevice {
  id: string;
  name: string;
}

const PRINTER_STORAGE_KEY = 'rg_printer_last';

// ─── In-memory device cache (survives across screens within same session) ───
let cachedDevice: BluetoothDevice | null = null;

export function getCachedDevice(): BluetoothDevice | null {
  return cachedDevice;
}

export function setCachedDevice(device: BluetoothDevice | null): void {
  cachedDevice = device;
}

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
  cachedDevice = null;
}

// Check if Web Bluetooth API is available
export function isBluetoothAvailable(): boolean {
  return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
}

// Request Bluetooth device (shows browser pairing dialog)
// For 3NStar PPT205BT and similar 58mm BT printers.
// Uses acceptAllDevices FIRST to show ALL nearby devices (proven to work).
export async function requestPrinter(): Promise<BluetoothDevice | null> {
  if (!isBluetoothAvailable()) {
    console.warn('Web Bluetooth not available');
    return null;
  }

  try {
    const device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: [
        '00001101-0000-1000-8000-00805f9b34fb',
        '0000ff00-0000-1000-8000-00805f9b34fb',
        '0000ff01-0000-1000-8000-00805f9b34fb',
        'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
        'battery_service',
        '00001800-0000-1000-8000-00805f9b34fb',
      ],
    });
    saveLastPrinterId(device.id);
    cachedDevice = device; // Cache the device object in memory
    return device;
  } catch (e) {
    // User cancelled the dialog (NotFoundError) or other error
    console.error('Bluetooth request cancelled or failed:', e);
    return null;
  }
}

// Get the printer device for printing.
// Priority: 1) in-memory cache, 2) getDevices() lookup by saved ID
export async function getPrinterDevice(): Promise<BluetoothDevice | null> {
  if (!isBluetoothAvailable()) return null;

  // 1. Check in-memory cache first (fastest, most reliable)
  if (cachedDevice) {
    return cachedDevice;
  }

  // 2. Fallback: try getDevices() with saved ID
  const lastId = getLastPrinterId();
  if (!lastId) return null;
  try {
    const devices = await navigator.bluetooth.getDevices();
    const device = devices.find(d => d.id === lastId);
    if (device) {
      cachedDevice = device; // Cache for next time
      return device;
    }
  } catch { /* ignore */ }

  return null;
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
  // Try multiple known service UUIDs for different printer brands
  const serviceUUIDs = [
    '0000ff00-0000-1000-8000-00805f9b34fb',  // Generic printer (Rongta)
    '0000ff01-0000-1000-8000-00805f9b34fb',  // 3NStar PPT205BT common
    'e7810a71-73ae-499d-8c15-faa9aef0c3f2',  // Some 3NStar models
    '00001101-0000-1000-8000-00805f9b34fb',  // SPP fallback
  ];

  for (const serviceUuid of serviceUUIDs) {
    try {
      const service = await gatt.getPrimaryService(serviceUuid);
      if (!service) continue;
      const characteristics = await service.getCharacteristics();
      // Find writable characteristic
      const writable = characteristics.find(c =>
        c.properties.write || c.properties.writeWithoutResponse
      );
      if (writable) {
        console.log(`Found writable characteristic on service ${serviceUuid}`);
        return writable;
      }
    } catch {
      continue; // Try next service
    }
  }

  // Fallback: enumerate all services and find any writable characteristic
  try {
    const services = await gatt.getPrimaryServices();
    for (const service of services) {
      try {
        const characteristics = await service.getCharacteristics();
        const writable = characteristics.find(c =>
          c.properties.write || c.properties.writeWithoutResponse
        );
        if (writable) {
          console.log(`Found writable characteristic on service ${service.uuid}`);
          return writable;
        }
      } catch {
        continue;
      }
    }
  } catch (e) {
    console.error('Error enumerating services:', e);
  }

  return null;
}

// Send raw bytes to printer
async function sendBytes(characteristic: BluetoothRemoteGATTCharacteristic, data: ArrayBuffer): Promise<boolean> {
  try {
    // Split into chunks if needed (BLE max is ~512 bytes, SPP can handle more)
    const MAX_CHUNK = 512;
    const bytes = new Uint8Array(data);

    if (bytes.length <= MAX_CHUNK) {
      if (characteristic.properties.writeWithoutResponse) {
        await characteristic.writeValueWithoutResponse(data);
      } else {
        await characteristic.writeValue(data);
      }
    } else {
      // Send in chunks
      for (let offset = 0; offset < bytes.length; offset += MAX_CHUNK) {
        const chunk = bytes.slice(offset, offset + MAX_CHUNK);
        const chunkBuffer = chunk.buffer as ArrayBuffer;
        if (characteristic.properties.writeWithoutResponse) {
          await characteristic.writeValueWithoutResponse(chunkBuffer);
        } else {
          await characteristic.writeValue(chunkBuffer);
        }
        // Small delay between chunks to prevent buffer overflow
        if (offset + MAX_CHUNK < bytes.length) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }
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
      console.error('No writable characteristic found');
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
