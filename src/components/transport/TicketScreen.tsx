'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { type FrecuenciaEstado, type VTSession, loadPromoConfig } from './types-boletos';
import { getTarifa, TARIFA_MINIMA, getParadasByRutaAndTipo, matchRuta, type TipoPasajero } from '@/lib/tarifas-data';
import { saveVenta } from '@/lib/indexeddb';
import { getGPSPosition } from '@/lib/gps';
import { type ConnectionInfo } from '@/hooks/use-connection';
import { Check, User, UserRound, ChevronDown, ChevronUp, Printer } from 'lucide-react';

interface Props {
  session: VTSession;
  estado: FrecuenciaEstado;
  connection: ConnectionInfo;
  onClose: () => void;
  ganadorPosicion?: number | null;  // random position for free trip winner
}

// ─── Helpers for paradas frecuentes (localStorage) ───
function getParadasFrecCount(vtCode: string): Record<string, number> {
  try {
    const raw = localStorage.getItem(`rg_paradas_freq_${vtCode}`);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function incrementParadaFrec(vtCode: string, parada: string) {
  try {
    const counts = getParadasFrecCount(vtCode);
    counts[parada] = (counts[parada] || 0) + 1;
    localStorage.setItem(`rg_paradas_freq_${vtCode}`, JSON.stringify(counts));
  } catch { /* ignore */ }
}

export function TicketScreen({ session, estado, connection, onClose, ganadorPosicion }: Props) {
  const [parada, setParada] = useState('');
  const [cobrado, setCobrado] = useState('');
  const [pasajeroTipo, setPasajeroTipo] = useState<TipoPasajero>('normal');
  const paradaInputRef = useRef<HTMLInputElement>(null);
  const montoInputRef = useRef<HTMLInputElement>(null);
  const [lastSale, setLastSale] = useState<{ parada: string; monto: number; tipo: string } | null>(null);
  const [ventasHoy, setVentasHoy] = useState(0);
  const [totalHoy, setTotalHoy] = useState(0);
  const [showAllParadas, setShowAllParadas] = useState(false);
  const [esViajeGratis, setEsViajeGratis] = useState(false);
  const [contadorVentasFrecuencia, setContadorVentasFrecuencia] = useState(0);

  const tipo = estado.direccion as 'ida' | 'vuelta';
  const ruta = estado.ruta;
  const rutaMatched = matchRuta(ruta);
  const allParadas = getParadasByRutaAndTipo(rutaMatched, tipo);
  const tarifaAuto = parada ? getTarifa(rutaMatched, parada, tipo, pasajeroTipo) : 0;

  // ─── Paradas frecuentes: top 4 por uso ───
  const frecCounts = getParadasFrecCount(session.vtCode);
  const sortedParadas = [...allParadas].sort((a, b) => (frecCounts[b.parada] || 0) - (frecCounts[a.parada] || 0));
  const frecuentes = sortedParadas.slice(0, 4);
  const resto = sortedParadas.slice(4);
  const hasFrecuentes = frecCounts && Object.values(frecCounts).some(c => c > 0);

  // Load existing ventas count to determine position for Viaje Gratis
  useEffect(() => {
    (async () => {
      try {
        const { getVentasByFrecuencia } = await import('@/lib/indexeddb');
        const ventas = await getVentasByFrecuencia(estado.estadoId);
        setContadorVentasFrecuencia(ventas.length);
      } catch { /* ignore */ }
    })();
  }, [estado.estadoId]);

  const loadStats = useCallback(async () => {
    try {
      const { getVentasByFrecuencia } = await import('@/lib/indexeddb');
      const ventas = await getVentasByFrecuencia(estado.estadoId);
      const unsynced = ventas.filter(v => v.syncStatus === 'pending' || v.syncStatus === 'error');
      setVentasHoy(unsynced.length);
      setTotalHoy(unsynced.reduce((sum, v) => sum + v.cobrado, 0));
      setContadorVentasFrecuencia(ventas.length);
    } catch { /* ignore */ }
  }, [estado.estadoId]);

  useEffect(() => { loadStats(); }, [loadStats]);

  const handleQuickSelect = (paradaName: string, normal: number, media: number) => {
    setParada(paradaName);
    const tarifa = pasajeroTipo === 'media' ? media : normal;
    setCobrado(tarifa.toString());
  };

  const handleParadaManualChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setParada(val);
    const isKnownParada = allParadas.find(p => p.parada.toLowerCase() === val.toLowerCase());
    if (!isKnownParada) {
      setCobrado('');
      if (val.trim().length > 2) {
        setTimeout(() => montoInputRef.current?.focus(), 100);
      }
    }
  };

  const handleTipoChange = (nuevoTipo: TipoPasajero) => {
    setPasajeroTipo(nuevoTipo);
    if (parada) {
      const pData = allParadas.find(p => p.parada === parada);
      if (pData) {
        const tarifa = nuevoTipo === 'media' ? pData.media : pData.normal;
        setCobrado(tarifa.toString());
      }
    }
  };

  const handleVenta = async () => {
    if (!parada.trim() || !cobrado.trim()) return;
    const cobradoNum = parseFloat(cobrado) || 0;
    if (cobradoNum < TARIFA_MINIMA) return;

    // ─── Viaje Gratis: check if this passenger is the winner ───
    const promoConfig = loadPromoConfig();
    const nuevaPosicion = contadorVentasFrecuencia + 1;
    const esGanador = promoConfig.activa && ganadorPosicion != null && nuevaPosicion === ganadorPosicion;

    if (esGanador) {
      setEsViajeGratis(true);
    }

    const now = new Date();
    const fecha = now.toISOString().split('T')[0];
    const hora = now.toTimeString().slice(0, 5);

    const gps = await getGPSPosition();

    const venta = {
      id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      fecha,
      vtCode: session.vtCode,
      frecuenciaId: estado.id,
      frecuenciaNombre: estado.nombre,
      estadoId: estado.estadoId,
      ruta: rutaMatched,
      parada: parada.trim(),
      tipo,
      pasajeroTipo,
      tarifaOficial: tarifaAuto || cobradoNum,
      esViajeGratis: esGanador,
      tarifaOriginal: esGanador ? tarifaAuto || cobradoNum : cobradoNum,
      cobrado: esGanador ? 0 : cobradoNum,
      hora,
      createdAt: now.toISOString(),
      ayudanteId: session.ayudanteId,
      ayudanteNombre: session.ayudanteNombre,
      ...(gps ? { lat: gps.lat, lng: gps.lng } : {}),
      syncStatus: 'pending' as const,
    };

    await saveVenta(venta);
    // Track parada frequency
    incrementParadaFrec(session.vtCode, parada.trim());

    // ─── Imprimir boleto (no bloquea la venta) ───
    const imprimirBoleto = async () => {
      try {
        const { isBluetoothAvailable, autoConnectPrinter, printTicket } = await import('@/lib/printer');
        const { generateTicketBytes } = await import('@/lib/ticket-escpos');
        if (!isBluetoothAvailable()) return;
        const device = await autoConnectPrinter();
        if (!device) return;
        const dateParts = fecha.split('-');
        const fechaImp = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}` : fecha;
        const bytes = generateTicketBytes({
          ruta: rutaMatched,
          horaFrecuencia: estado.hora,
          fecha: fechaImp,
          hora: hora,
          ayudanteNombre: session.ayudanteNombre,
          destino: parada.trim(),
          tipoPasajero: pasajeroTipo === 'normal' ? 'Entero' : 'Media',
          tarifa: tarifaAuto || cobradoNum,
          boletoNum: contadorVentasFrecuencia + 1,
          esViajeGratis: esGanador,
          tarifaOriginal: esGanador ? tarifaAuto || cobradoNum : undefined,
          textoPublicidad: promoConfig.textoPublicidad,
        });
        await printTicket(device, bytes);
      } catch (e) {
        console.error('Error imprimiendo boleto:', e);
      }
    };
    imprimirBoleto(); // fire and forget

    if (esGanador) {
      // Play winner sound if enabled
      if (promoConfig.sonidoGanador) {
        try {
          const audioCtx = new AudioContext();
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.frequency.value = 880;
          gain.gain.value = 0.3;
          osc.start();
          setTimeout(() => { osc.frequency.value = 1100; }, 150);
          setTimeout(() => { osc.frequency.value = 1320; }, 300);
          setTimeout(() => { osc.stop(); audioCtx.close(); }, 500);
        } catch { /* ignore audio errors */ }
      }
      setLastSale({ parada: parada.trim(), monto: 0, tipo: 'VIAJE GRATIS!' });
      setTimeout(() => setEsViajeGratis(false), 3000);
    } else {
      setLastSale({ parada: parada.trim(), monto: cobradoNum, tipo: pasajeroTipo === 'normal' ? 'ENTERO' : 'MEDIA' });
    }
    setParada('');
    setCobrado('');
    loadStats();
    setTimeout(() => setLastSale(null), esGanador ? 2500 : 1200);
  };

  const direccionLabel = tipo === 'ida' ? 'IDA' : 'VUELTA';
  const direccionColor = tipo === 'ida' ? 'bg-[#912D26]' : 'bg-[#3A3A3A]';

  // Render parada button
  const ParadaBtn = ({ p, size = 'normal' }: { p: { parada: string; normal: number; media: number }; size?: 'normal' | 'big' }) => {
    const isSelected = parada === p.parada;
    const precio = pasajeroTipo === 'media' ? p.media : p.normal;
    const isBig = size === 'big';
    return (
      <button
        onClick={() => handleQuickSelect(p.parada, p.normal, p.media)}
        className={`rounded-2xl text-left transition-all active:scale-95 ${
          isBig ? 'p-4' : 'p-3'
        } ${
          isSelected
            ? 'bg-[#912D26] text-white shadow-lg shadow-red-200 ring-2 ring-red-400'
            : 'bg-white text-[#3A3A3A] border border-gray-100 shadow-sm hover:shadow-md'
        }`}
      >
        <div className={`${isBig ? 'text-base' : 'text-sm'} font-bold leading-tight`}>{p.parada}</div>
        <div className={`font-black mt-1 ${isBig ? 'text-2xl' : 'text-lg'} ${isSelected ? 'text-red-100' : 'text-[#912D26]'}`}>
          ${precio.toFixed(2)}
        </div>
        {!isBig && (
          <div className={`text-[10px] mt-0.5 ${isSelected ? 'text-red-200' : 'text-gray-400'}`}>
            N:{p.normal.toFixed(2)} M:{p.media.toFixed(2)}
          </div>
        )}
      </button>
    );
  };

  const canRegister = parada.trim() && cobrado.trim() && parseFloat(cobrado) >= TARIFA_MINIMA;

  return (
    <div className="flex flex-col h-[100dvh] bg-gray-50">
      {/* Barra de conexión */}
      <div className={`${connection.bgColor} px-4 py-1 flex items-center justify-center gap-2 text-xs font-medium ${connection.color}`}>
        <span>{connection.icon}</span>
        <span>{connection.label}</span>
        {connection.pendingCount > 0 && (
          <span className="bg-white/60 px-1.5 py-0.5 rounded-full text-[10px] font-bold">{connection.pendingCount} ventas</span>
        )}
      </div>

      {/* Header compacto */}
      <div className={`${direccionColor} text-white px-3 py-2`}>
        <div className="flex items-center justify-between">
          <button onClick={onClose} className="p-1 -ml-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div className="flex-1 text-center">
            <div className="text-sm font-bold leading-tight">{estado.hora} · {rutaMatched}</div>
            <div className="inline-block px-2 py-0.5 rounded-full bg-white/20 text-[9px] font-bold uppercase">{direccionLabel}</div>
          </div>
          <div className="text-right">
            <div className="text-[11px] font-mono">{ventasHoy}t</div>
            <div className="text-[11px] font-mono">${totalHoy.toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* ENTERO / MEDIA toggle compacto */}
      <div className="flex gap-2 px-3 py-2 bg-white border-b border-gray-100">
        <button
          onClick={() => handleTipoChange('normal')}
          className={`flex-1 py-2.5 rounded-xl flex items-center justify-center gap-1.5 font-bold text-sm transition-all active:scale-95 ${
            pasajeroTipo === 'normal'
              ? 'bg-[#912D26] text-white shadow-lg shadow-red-200'
              : 'bg-gray-100 text-[#3A3A3A]'
          }`}
        >
          <User className="w-4 h-4" /> ENTERO
        </button>
        <button
          onClick={() => handleTipoChange('media')}
          className={`flex-1 py-2.5 rounded-xl flex items-center justify-center gap-1.5 font-bold text-sm transition-all active:scale-95 ${
            pasajeroTipo === 'media'
              ? 'bg-[#912D26] text-white shadow-lg shadow-red-200'
              : 'bg-gray-100 text-[#3A3A3A]'
          }`}
        >
          <UserRound className="w-4 h-4" /> MEDIA
        </button>
      </div>

      {/* Zona scrolleable — paradas */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
        {/* Flash de confirmación normal */}
        {lastSale && lastSale.tipo !== 'VIAJE GRATIS!' && (
          <div className="bg-green-500 text-white rounded-2xl px-4 py-2.5 flex items-center gap-3 animate-pulse">
            <Check className="w-5 h-5 flex-shrink-0" />
            <div className="text-sm">
              <span className="font-bold">✓</span> {lastSale.parada} — ${lastSale.monto.toFixed(2)} ({lastSale.tipo})
            </div>
          </div>
        )}

        {/* Flash de VIAJE GRATIS */}
        {lastSale && lastSale.tipo === 'VIAJE GRATIS!' && esViajeGratis && (
          <div className="bg-gradient-to-r from-green-500 via-emerald-400 to-green-500 text-white rounded-2xl px-4 py-4 flex flex-col items-center gap-2 animate-bounce shadow-lg shadow-green-300">
            <div className="text-2xl font-black tracking-wide">🎉 VIAJE GRATIS 🎉</div>
            <div className="text-base font-bold">FELICIDADES! — {lastSale.parada}</div>
            <div className="text-xs font-medium bg-white/20 px-3 py-1 rounded-full">NO DEBE PAGAR</div>
          </div>
        )}

        {/* Paradas frecuentes — grandes, siempre visibles */}
        {hasFrecuentes && (
          <div>
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1 mb-1">Frecuentes</div>
            <div className="grid grid-cols-2 gap-2">
              {frecuentes.map(p => (
                <ParadaBtn key={`f-${p.parada}`} p={p} size="big" />
              ))}
            </div>
          </div>
        )}

        {/* Todas las paradas (colapsable) */}
        <div>
          <button
            onClick={() => setShowAllParadas(!showAllParadas)}
            className="w-full flex items-center justify-between px-1 py-1"
          >
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Todas las paradas ({allParadas.length})
            </span>
            {showAllParadas
              ? <ChevronUp className="w-3 h-3 text-gray-400" />
              : <ChevronDown className="w-3 h-3 text-gray-400" />
            }
          </button>
          {showAllParadas && (
            <div className="grid grid-cols-2 gap-2">
              {allParadas.map(p => (
                <ParadaBtn key={p.parada} p={p} />
              ))}
            </div>
          )}
        </div>

        {/* Parada manual */}
        <div className="bg-white rounded-xl border border-gray-100 p-2 shadow-sm">
          <div className="flex gap-2">
            <input
              ref={paradaInputRef}
              type="text"
              placeholder="Otra parada..."
              value={parada}
              onChange={handleParadaManualChange}
              className="flex-1 px-3 py-2 rounded-lg bg-gray-50 text-sm text-[#3A3A3A] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#912D26]/30"
            />
            {parada && !allParadas.find(p => p.parada === parada) && cobrado && parseFloat(cobrado) >= TARIFA_MINIMA && (
              <button
                onClick={handleVenta}
                className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-bold active:scale-95 transition-all"
              >
                OK
              </button>
            )}
          </div>
        </div>

        {/* Advertencia tarifa */}
        {parada && allParadas.some(p => p.parada === parada) && tarifaAuto > 0 && cobrado && parseFloat(cobrado) !== tarifaAuto && (
          <div className="text-center text-[11px] text-amber-600 bg-amber-50 rounded-lg px-3 py-1.5">
            Oficial: ${tarifaAuto.toFixed(2)} — Diff: ${Math.abs(parseFloat(cobrado || '0') - tarifaAuto).toFixed(2)}
          </div>
        )}
      </div>

      {/* ─── BARRA FIJA INFERIOR: Monto + REGISTRAR ─── */}
      <div className="bg-white border-t-2 border-gray-100 px-3 py-2 shadow-[0_-4px_12px_rgba(0,0,0,0.08)]">
        {/* Monto */}
        <div className="relative mb-2">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-lg">$</span>
          <input
            ref={montoInputRef}
            type="number"
            inputMode="decimal"
            step="0.05"
            min={TARIFA_MINIMA}
            placeholder="0.00"
            value={cobrado}
            onChange={e => setCobrado(e.target.value)}
            className="w-full pl-8 pr-3 py-3 rounded-xl border-2 border-gray-200 bg-gray-50 text-2xl font-black text-[#3A3A3A] text-center focus:outline-none focus:ring-2 focus:ring-[#912D26]/30 focus:border-[#912D26]"
          />
        </div>

        {/* Botón REGISTRAR — SIEMPRE VISIBLE */}
        <button
          onClick={handleVenta}
          disabled={!canRegister}
          className={`w-full py-4 rounded-xl font-black text-lg flex items-center justify-center gap-2 transition-all active:scale-95 ${
            canRegister
              ? 'bg-green-600 text-white shadow-lg shadow-green-200'
              : 'bg-[#D6D6D6] text-gray-400 cursor-not-allowed'
          }`}
        >
          <Check className="w-5 h-5" />
          REGISTRAR ${cobrado ? parseFloat(cobrado).toFixed(2) : '0.00'}
        </button>
      </div>
    </div>
  );
}
