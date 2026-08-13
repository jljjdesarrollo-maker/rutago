'use client';

import { useState, useEffect, useCallback } from 'react';

export type PrinterStatus = 'connected' | 'disconnected' | 'unavailable';

interface UsePrinterStatusReturn {
  status: PrinterStatus;
  name: string;
  connect: () => Promise<void>;
}

// Lightweight hook — no GATT connection, just checks if device was previously permitted.
// autoConnectPrinter() is a simple device lookup (~10ms), zero impact on ticket speed.
export function usePrinterStatus(): UsePrinterStatusReturn {
  const [status, setStatus] = useState<PrinterStatus>('disconnected');
  const [name, setName] = useState('');

  const check = useCallback(async () => {
    try {
      const { isBluetoothAvailable, autoConnectPrinter } = await import('@/lib/printer');
      if (!isBluetoothAvailable()) { setStatus('unavailable'); return; }
      const device = await autoConnectPrinter();
      if (device) {
        setName(device.name || 'Impresora');
        setStatus('connected');
      } else {
        setStatus('disconnected');
      }
    } catch {
      setStatus('disconnected');
    }
  }, []);

  useEffect(() => { check(); }, [check]);

  const connect = useCallback(async () => {
    try {
      const { isBluetoothAvailable, requestPrinter } = await import('@/lib/printer');
      if (!isBluetoothAvailable()) { setStatus('unavailable'); return; }
      const device = await requestPrinter();
      if (device) {
        setName(device.name || 'Impresora');
        setStatus('connected');
      } else {
        setStatus('disconnected');
      }
    } catch {
      setStatus('disconnected');
    }
  }, []);

  return { status, name, connect };
}
