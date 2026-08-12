'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { type FrecuenciaEstado, type VTSession } from './types-boletos';
import { getTarifa, TARIFA_MINIMA, getParadasByRutaAndTipo, matchRuta, type TipoPasajero } from '@/lib/tarifas-data';
import { saveVenta } from '@/lib/indexeddb';
import { getGPSPosition } from '@/lib/gps';
import { type ConnectionInfo } from '@/hooks/use-connection';
import { Check, ChevronLeft, User, UserRound } from 'lucide-react';

interface Props {
  session: VTSession;
  estado: FrecuenciaEstado;
  connection: ConnectionInfo;
  onClose: () => void;
}

export function TicketScreen({ session, estado, connection, onClose }: Props) {
  const [parada, setParada] = useState('');
  const [cobrado, setCobrado] = useState('');
  const [pasajeroTipo, setPasajeroTipo] = useState<TipoPasajero>('normal');
  const paradaInputRef = useRef<HTMLInputElement>(null);
  const montoInputRef = useRef<HTMLInputElement>(null);
  const [lastSale, setLastSale] = useState<{ parada: string; monto: number; tipo: string } | null>(null);
  const [ventasHoy, setVentasHoy] = useState(0);
  const [totalHoy, setTotalHoy] = useState(0);

  const tipo = estado.direccion as 'ida' | 'vuelta';
  const ruta = estado.ruta;
  const rutaMatched = matchRuta(ruta);
  const paradas = getParadasByRutaAndTipo(rutaMatched, tipo);
  const tarifaAuto = parada ? getTarifa(rutaMatched, parada, tipo, pasajeroTipo) : 0;

  const loadStats = useCallback(async () => {
    try {
      const { getVentasByFrecuencia } = await import('@/lib/indexeddb');
      const ventas = await getVentasByFrecuencia(estado.estadoId);
      const unsynced = ventas.filter(v => v.syncStatus === 'pending' || v.syncStatus === 'error');
      setVentasHoy(unsynced.length);
      setTotalHoy(unsynced.reduce((sum, v) => sum + v.cobrado, 0));
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
    // Solo limpiar cobrado si la parada escrita NO está en la lista (es manual)
    const isKnownParada = paradas.find(p => p.parada.toLowerCase() === val.toLowerCase());
    if (!isKnownParada) {
      setCobrado('');
      // Auto-enfocar campo de monto después de escribir para agilizar
      if (val.trim().length > 2) {
        setTimeout(() => montoInputRef.current?.focus(), 100);
      }
    }
  };

  const handleTipoChange = (nuevoTipo: TipoPasajero) => {
    setPasajeroTipo(nuevoTipo);
    if (parada) {
      const pData = paradas.find(p => p.parada === parada);
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

    const now = new Date();
    const fecha = now.toISOString().split('T')[0];
    const hora = now.toTimeString().slice(0, 5);

    // GPS invisible: capture coordinates (non-blocking, won't delay the sale)
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
      cobrado: cobradoNum,
      hora,
      createdAt: now.toISOString(),
      ayudanteId: session.ayudanteId,
      ayudanteNombre: session.ayudanteNombre,
      ...(gps ? { lat: gps.lat, lng: gps.lng } : {}),
      syncStatus: 'pending' as const,
    };

    await saveVenta(venta);
    setLastSale({ parada: parada.trim(), monto: cobradoNum, tipo: pasajeroTipo === 'normal' ? 'ENTERO' : 'MEDIA' });
    setParada('');
    setCobrado('');
    loadStats();
    setTimeout(() => setLastSale(null), 1500);
  };

  const direccionLabel = tipo === 'ida' ? 'IDA' : 'VUELTA';
  const direccionColor = tipo === 'ida' ? 'bg-[#912D26]' : 'bg-[#3A3A3A]';

  return (
    <div className="flex flex-col min-h-[100dvh] bg-gray-50">
      {/* Barra de conexión */}
      <div className={`${connection.bgColor} px-4 py-1.5 flex items-center justify-center gap-2 text-xs font-medium ${connection.color}`}>
        <span>{connection.icon}</span>
        <span>{connection.label}</span>
        {connection.pendingCount > 0 && (
          <span className="bg-white/60 px-1.5 py-0.5 rounded-full text-[10px] font-bold">{connection.pendingCount} ventas</span>
        )}
      </div>

      {/* Header */}
      <div className={`${direccionColor} text-white px-4 py-3`}>
        <div className="flex items-center justify-between">
          <button onClick={onClose} className="p-1 -ml-1">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="flex-1 text-center">
            <div className="text-base font-bold leading-tight">{estado.hora} · {rutaMatched}</div>
            <div className="inline-block mt-0.5 px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-bold uppercase">{direccionLabel}</div>
          </div>
          <div className="text-right">
            <div className="text-xs font-mono">{ventasHoy}t</div>
            <div className="text-xs font-mono">${totalHoy.toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div className="flex-1 px-3 py-3 space-y-3 overflow-y-auto">
        {/* Confirmación flash */}
        {lastSale && (
          <div className="bg-green-500 text-white rounded-2xl px-4 py-3 flex items-center gap-3 animate-pulse">
            <Check className="w-6 h-6 flex-shrink-0" />
            <div>
              <div className="font-bold">Venta registrada</div>
              <div className="text-green-100 text-sm">{lastSale.parada} — ${lastSale.monto.toFixed(2)} ({lastSale.tipo})</div>
            </div>
          </div>
        )}

        {/* Selector NORMAL / MEDIA - botones grandes */}
        <div className="flex gap-2">
          <button
            onClick={() => handleTipoChange('normal')}
            className={`flex-1 py-3 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm transition-all active:scale-95 ${
              pasajeroTipo === 'normal'
                ? 'bg-[#912D26] text-white shadow-lg shadow-red-200'
                : 'bg-white text-[#3A3A3A] border border-gray-200'
            }`}
          >
            <User className="w-5 h-5" />
            ENTERO
          </button>
          <button
            onClick={() => handleTipoChange('media')}
            className={`flex-1 py-3 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm transition-all active:scale-95 ${
              pasajeroTipo === 'media'
                ? 'bg-[#912D26] text-white shadow-lg shadow-red-200'
                : 'bg-white text-[#3A3A3A] border border-gray-200'
            }`}
          >
            <UserRound className="w-5 h-5" />
            MEDIA
          </button>
        </div>

        {/* Grid de paradas */}
        <div className="grid grid-cols-2 gap-2">
          {paradas.map(p => {
            const isSelected = parada === p.parada;
            const precio = pasajeroTipo === 'media' ? p.media : p.normal;
            return (
              <button
                key={p.parada}
                onClick={() => handleQuickSelect(p.parada, p.normal, p.media)}
                className={`rounded-2xl p-3 text-left transition-all active:scale-95 ${
                  isSelected
                    ? 'bg-[#912D26] text-white shadow-lg shadow-red-200 ring-2 ring-red-400'
                    : 'bg-white text-[#3A3A3A] border border-gray-100 shadow-sm hover:shadow-md'
                }`}
              >
                <div className="text-sm font-bold leading-tight">{p.parada}</div>
                <div className={`text-lg font-black mt-1 ${isSelected ? 'text-red-100' : 'text-[#912D26]'}`}>
                  ${precio.toFixed(2)}
                </div>
                <div className={`text-[10px] mt-0.5 ${isSelected ? 'text-red-200' : 'text-gray-400'}`}>
                  N:${p.normal.toFixed(2)} M:${p.media.toFixed(2)}
                </div>
              </button>
            );
          })}
        </div>

        {/* Parada manual */}
        <div className="bg-white rounded-2xl border border-gray-100 p-3 shadow-sm">
          <div className="flex gap-2">
            <input
              ref={paradaInputRef}
              type="text"
              placeholder="Otra parada..."
              value={parada}
              onChange={handleParadaManualChange}
              className="flex-1 px-3 py-2.5 rounded-xl bg-gray-50 text-sm text-[#3A3A3A] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#912D26]/30"
            />
            {parada && !paradas.find(p => p.parada === parada) && cobrado && parseFloat(cobrado) >= TARIFA_MINIMA && (
              <button
                onClick={handleVenta}
                className="px-4 py-2 rounded-xl bg-green-600 text-white text-sm font-bold active:scale-95 transition-all"
              >
                OK
              </button>
            )}
          </div>
        </div>

        {/* Monto */}
        <div className="space-y-2">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
            <input
              ref={montoInputRef}
              type="number"
              inputMode="decimal"
              step="0.05"
              min={TARIFA_MINIMA}
              placeholder="0.00"
              value={cobrado}
              onChange={e => setCobrado(e.target.value)}
              className="w-full pl-8 pr-3 py-4 rounded-2xl border-2 border-gray-200 bg-white text-2xl font-black text-[#3A3A3A] text-center focus:outline-none focus:ring-2 focus:ring-[#912D26]/30 focus:border-[#912D26]"
            />
          </div>
          {parada && tarifaAuto > 0 && cobrado && parseFloat(cobrado) !== tarifaAuto && (
            <div className="text-center text-xs text-amber-600 bg-amber-50 rounded-xl px-3 py-1.5">
              Tarifa oficial: ${tarifaAuto.toFixed(2)} ({pasajeroTipo === 'normal' ? 'ENTERO' : 'MEDIA'}) — Diferencia: ${Math.abs(parseFloat(cobrado || '0') - tarifaAuto).toFixed(2)}
            </div>
          )}
        </div>

        {/* Botón REGISTRAR */}
        <button
          onClick={handleVenta}
          disabled={!parada.trim() || !cobrado.trim() || parseFloat(cobrado) < TARIFA_MINIMA}
          className={`w-full py-5 rounded-2xl font-black text-xl flex items-center justify-center gap-2 transition-all active:scale-95 ${
            parada.trim() && cobrado.trim() && parseFloat(cobrado) >= TARIFA_MINIMA
              ? 'bg-green-600 text-white shadow-lg shadow-green-200'
              : 'bg-[#D6D6D6] text-gray-400 cursor-not-allowed'
          }`}
        >
          <Check className="w-6 h-6" />
          REGISTRAR ${cobrado ? parseFloat(cobrado).toFixed(2) : '0.00'}
        </button>
      </div>
    </div>
  );
}
