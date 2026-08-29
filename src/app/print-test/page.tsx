'use client';

import { useState, useCallback } from 'react';
import { generateTicketBytes, TicketData } from '@/lib/ticket-escpos';

type Step = 'idle' | 'scanning' | 'found' | 'connecting' | 'printing' | 'done' | 'error';

function buildTestTicket(): Uint8Array {
  const now = new Date();
  const fecha = `${String(now.getDate()).padStart(2,'0')}/${String(now.getMonth()+1).padStart(2,'0')}/${String(now.getFullYear()).slice(2)}`;
  const hora = now.toTimeString().slice(0, 5);

  const data: TicketData = {
    ruta: 'Loja - Vilcabamba',
    horaFrecuencia: '08:15',
    fecha,
    hora,
    ayudanteNombre: 'Carlos M.',
    destino: 'Vilcabamba',
    tipoPasajero: 'Entero',
    tarifa: 2.50,
    boletoNum: 47,
    esViajeGratis: false,
    textoPublicidad: 'Quieres RutaGo? 0997149000',
  };
  return generateTicketBytes(data);
}

export default function PrintTestPage() {
  const [step, setStep] = useState<Step>('idle');
  const [deviceName, setDeviceName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  const [btEnabled, setBtEnabled] = useState<boolean | null>(null);

  const log = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${time}] ${msg}`]);
    console.log('[PrintTest]', msg);
  };

  const isBTAvailable = typeof navigator !== 'undefined' && 'bluetooth' in navigator;

  // Check if BT adapter is on
  const checkBT = useCallback(async () => {
    if (!isBTAvailable) { setBtEnabled(false); return; }
    try {
      // getDevices() will fail if BT is off
      await navigator.bluetooth.getDevices();
      setBtEnabled(true);
    } catch {
      setBtEnabled(false);
    }
  }, [isBTAvailable]);

  const handleConnect = useCallback(async () => {
    if (!isBTAvailable) {
      setStep('error');
      setErrorMsg('Web Bluetooth no disponible. Usa Chrome en Android.');
      return;
    }

    setStep('scanning');
    setErrorMsg('');
    log('Abriendo dialogo Bluetooth...');
    log('IMPORTANTE: La impresora DEBE estar encendida');

    try {
      // ─── acceptAllDevices FIRST: shows ALL nearby BT devices ───
      log('Modo: acceptAllDevices (sin filtros)');
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

      setDeviceName(device.name || 'Desconocido');
      setStep('found');
      log(`Dispositivo seleccionado: ${device.name || '(sin nombre)'}`);
      log(`ID: ${device.id.slice(0, 12)}...`);

      // Connect GATT
      setStep('connecting');
      log('Conectando GATT...');

      const gatt = await device.gatt!.connect();
      log('GATT conectado!');

      // Find writable characteristic — try known UUIDs first
      const serviceUUIDs = [
        '0000ff00-0000-1000-8000-00805f9b34fb',
        '0000ff01-0000-1000-8000-00805f9b34fb',
        'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
        '00001101-0000-1000-8000-00805f9b34fb',
      ];

      let writableChar: BluetoothRemoteGATTCharacteristic | null = null;

      for (const uuid of serviceUUIDs) {
        try {
          const service = await gatt.getPrimaryService(uuid);
          log(`Servicio OK: ${uuid}`);
          const chars = await service.getCharacteristics();
          for (const c of chars) {
            log(`  Char ${c.uuid.slice(4,8)}: write=${c.properties.write} writeNR=${c.properties.writeWithoutResponse}`);
          }
          const writable = chars.find(c => c.properties.write || c.properties.writeWithoutResponse);
          if (writable) {
            writableChar = writable;
            log(`USANDO servicio: ${uuid}`);
            break;
          }
        } catch {
          log(`Servicio NO: ${uuid}`);
          continue;
        }
      }

      // Fallback: enumerate ALL services
      if (!writableChar) {
        log('Fallo UUIDs conocidos. Enumerando TODO...');
        const services = await gatt.getPrimaryServices();
        log(`${services.length} servicio(s) disponible(s):`);
        for (const service of services) {
          log(`  UUID: ${service.uuid}`);
          try {
            const chars = await service.getCharacteristics();
            for (const c of chars) {
              const w = c.properties.write || c.properties.writeWithoutResponse;
              log(`  -> Char ${c.uuid.slice(4,8)} write=${w}`);
              if (w && !writableChar) {
                writableChar = c;
                log(`  -> USANDO este char`);
              }
            }
          } catch (e2) {
            log(`  -> Error: ${e2}`);
          }
        }
      }

      if (!writableChar) {
        throw new Error('No se encontro servicio escribible. La impresora no es compatible con Web Bluetooth.');
      }

      // Send test ticket
      setStep('printing');
      log('Enviando ticket de prueba...');
      const ticket = buildTestTicket();
      log(`Tamano: ${ticket.length} bytes (precio 3 lineas)`);

      if (writableChar.properties.writeWithoutResponse) {
        await writableChar.writeValueWithoutResponse(ticket.buffer);
        log('Enviado via writeWithoutResponse');
      } else {
        await writableChar.writeValue(ticket.buffer);
        log('Enviado via write');
      }

      // Small delay for printer buffer
      await new Promise(r => setTimeout(r, 500));
      log('Datos enviados OK!');


      await gatt.disconnect();
      setStep('done');
      log('Impresion completada!');

    } catch (e) {
      const err = e as DOMException;
      if (err.name === 'NotFoundError') {
        setStep('idle');
        log('Usuario cancelo el dialogo (no selecciono nada)');
      } else {
        setStep('error');
        setErrorMsg(err.message || String(e));
        log(`ERROR [${err.name}]: ${err.message}`);
      }
    }
  }, [isBTAvailable]);

  return (
    <div className="min-h-[100dvh] bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-[#912D26] text-white px-4 py-4">
        <h1 className="text-lg font-bold">Prueba de Impresora</h1>
        <p className="text-red-100 text-xs mt-0.5">3NStar PPT205BT - Bluetooth Test</p>

      </div>

      {/* Checklist antes de probar */}
      <div className="mx-4 mt-3 bg-white rounded-2xl border border-gray-100 p-3 shadow-sm">
        <p className="text-[11px] font-bold text-[#3A3A3A] mb-2">Antes de tocar el boton:</p>
        <div className="space-y-1.5">
          <div className="flex items-start gap-2 text-[10px] text-gray-600">
            <span className="text-green-500 font-bold mt-px">1.</span>
            <span>Impresora <b>ENCENDIDA</b> (luz LED azul/verde prendida)</span>
          </div>
          <div className="flex items-start gap-2 text-[10px] text-gray-600">
            <span className="text-green-500 font-bold mt-px">2.</span>
            <span>Bluetooth del celular <b>ACTIVADO</b></span>
          </div>
          <div className="flex items-start gap-2 text-[10px] text-gray-600">
            <span className="text-green-500 font-bold mt-px">3.</span>
            <span>Estas en <b>Chrome</b> (no Safari, no Samsung Internet)</span>
          </div>
        </div>
      </div>

      {/* Status card */}
      <div className="mx-4 mt-3">
        {step === 'idle' && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-center">
            <div className="text-4xl mb-2">🖨️</div>
            <p className="text-blue-700 font-semibold text-sm">Listo para probar</p>
            <p className="text-blue-500 text-xs mt-1">Se abrira un dialogo con TODOS los dispositivos Bluetooth cercanos</p>
          </div>
        )}
        {step === 'scanning' && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-center animate-pulse">
            <div className="text-4xl mb-2">📡</div>
            <p className="text-blue-700 font-semibold text-sm">Selecciona tu impresora</p>
            <p className="text-blue-500 text-xs mt-1">Busca &quot;Printer001-EA52&quot; en la lista que aparecio</p>
          </div>
        )}
        {step === 'found' && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center">
            <div className="text-4xl mb-2">✅</div>
            <p className="text-green-700 font-semibold text-sm">{deviceName}</p>
            <p className="text-green-500 text-xs mt-1">Conectando...</p>
          </div>
        )}
        {step === 'connecting' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 text-center animate-pulse">
            <div className="text-4xl mb-2">🔗</div>
            <p className="text-yellow-700 font-semibold text-sm">Conectando GATT...</p>
            <p className="text-yellow-500 text-xs mt-1">{deviceName}</p>
          </div>
        )}
        {step === 'printing' && (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 text-center animate-pulse">
            <div className="text-4xl mb-2">🖨️</div>
            <p className="text-orange-700 font-semibold text-sm">Imprimiendo...</p>
            <p className="text-orange-500 text-xs mt-1">Enviando datos</p>
          </div>
        )}
        {step === 'done' && (
          <div className="bg-green-50 border border-green-300 rounded-2xl p-4 text-center">
            <div className="text-4xl mb-2">🎉</div>
            <p className="text-green-700 font-bold text-base">IMPRESION EXITOSA!</p>
            <p className="text-green-500 text-xs mt-1">{deviceName}</p>
          </div>
        )}
        {step === 'error' && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-center">
            <div className="text-4xl mb-2">❌</div>
            <p className="text-red-700 font-bold text-sm">Error</p>
            <p className="text-red-500 text-[11px] mt-1 break-all">{errorMsg}</p>
          </div>
        )}
      </div>

      {/* Action button */}
      <div className="mx-4 mt-3">
        {(step === 'idle' || step === 'done' || step === 'error') && (
          <button
            onClick={handleConnect}
            disabled={!isBTAvailable}
            className={`w-full py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-2 transition-all active:scale-95 ${
              isBTAvailable
                ? 'bg-[#912D26] text-white shadow-xl shadow-red-300'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            🖨️ BUSCAR IMPRESORA
          </button>
        )}
      </div>

      {!isBTAvailable && (
        <div className="mx-4 mt-2 bg-yellow-50 border border-yellow-200 rounded-xl p-3">
          <p className="text-yellow-700 text-xs font-semibold">Web Bluetooth NO disponible</p>
          <p className="text-yellow-500 text-[10px] mt-1">Usa Google Chrome en Android. Safari/iPhone NO es compatible con Web Bluetooth.</p>
        </div>
      )}

      {/* Console */}
      <div className="flex-1 mx-4 mt-3 mb-4">
        <div className="bg-gray-900 rounded-2xl p-3 h-full min-h-[180px] max-h-[260px] overflow-y-auto">
          <p className="text-gray-500 text-[10px] font-mono mb-1.5">LOG:</p>
          {logs.length === 0 && (
            <p className="text-gray-600 text-[10px] font-mono">Toca el boton para empezar...</p>
          )}
          {logs.map((l, i) => (
            <p key={i} className={`text-[10px] font-mono leading-relaxed ${
              l.includes('ERROR') ? 'text-red-400' :
              l.includes('EXITOSA') || l.includes('OK!') || l.includes('correctamente') ? 'text-green-400' :
              l.includes('USANDO') || l.includes('Conectando') || l.includes('Enviando') ? 'text-yellow-300' :
              l.includes('cancelo') ? 'text-gray-500' :
              'text-gray-400'
            }`}>{l}</p>
          ))}
        </div>
      </div>
    </div>
  );
}
