'use client';

import { useState, useEffect, useCallback } from 'react';
import { type FrecuenciaEstado, type VTSession } from './types-boletos';
import { getTarifa, TARIFA_MINIMA, getParadasByRutaAndTipo, matchRuta } from '@/lib/tarifas-data';
import { saveVenta } from '@/lib/indexeddb';
import { type ConnectionInfo } from '@/hooks/use-connection';
import { Check, X, ChevronLeft } from 'lucide-react';

interface Props {
  session: VTSession;
  estado: FrecuenciaEstado;
  connection: ConnectionInfo;
  onClose: () => void;
}

export function TicketScreen({ session, estado, connection, onClose }: Props) {
  const [tipo, setTipo] = useState<'ida' | 'vuelta' | null>(null);
  const [parada, setParada] = useState('');
  const [cobrado, setCobrado] = useState('');
  const [lastSale, setLastSale] = useState<{ parada: string; monto: number } | null>(null);
  const [ventasHoy, setVentasHoy] = useState(0);
  const [totalHoy, setTotalHoy] = useState(0);

  const ruta = estado.ruta;
  const rutaMatched = matchRuta(ruta);
  const paradas = tipo ? getParadasByRutaAndTipo(rutaMatched, tipo) : [];
  const tarifaAuto = parada ? getTarifa(rutaMatched, parada, tipo || 'ida') : 0;

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

  const handleQuickSelect = (paradaName: string, tarifa: number) => {
    setParada(paradaName);
    setCobrado(tarifa.toString());
  };

  const handleVenta = async () => {
    if (!parada.trim() || !cobrado.trim() || !tipo) return;
    const cobradoNum = parseFloat(cobrado) || 0;
    if (cobradoNum < TARIFA_MINIMA) return;

    const now = new Date();
    const fecha = now.toISOString().split('T')[0];
    const hora = now.toTimeString().slice(0, 5);

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
      tarifaOficial: tarifaAuto || cobradoNum,
      cobrado: cobradoNum,
      hora,
      createdAt: now.toISOString(),
      ayudanteId: session.ayudanteId,
      ayudanteNombre: session.ayudanteNombre,
      syncStatus: 'pending' as const,
    };

    await saveVenta(venta);
    setLastSale({ parada: parada.trim(), monto: cobradoNum });
    setParada('');
    setCobrado('');
    loadStats();
    // Auto-hide after 1.5s
    setTimeout(() => setLastSale(null), 1500);
  };

  // ── Si no seleccionó dirección (ida/vuelta) → Mostrar selector primero ──
  if (!tipo) {
    return (
      <div className="flex flex-col min-h-[100dvh] bg-gray-50">
        {/* Header compacto */}
        <div className="bg-[#912D26] text-white px-4 py-3">
          <div className="flex items-center justify-between">
            <button onClick={onClose} className="p-1 -ml-1">
              <ChevronLeft className="w-6 h-6" />
            </button>
            <div className="text-center">
              <div className="text-base font-bold">{estado.hora} — {rutaMatched}</div>
            </div>
            <div className="text-sm font-mono">{ventasHoy} · ${totalHoy.toFixed(2)}</div>
          </div>
        </div>

        {/* Selector de dirección - botones GRANDES para una mano */}
        <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6">
          <div className="text-center mb-2">
            <p className="text-lg font-bold text-[#3A3A3A]">{estado.nombre}</p>
            <p className="text-sm text-gray-500">Selecciona la dirección</p>
          </div>

          <button onClick={() => setTipo('ida')}
            className="w-full max-w-xs py-8 rounded-3xl bg-[#912D26] text-white shadow-lg shadow-red-200 active:scale-95 transition-all">
            <div className="text-2xl font-bold">IDA</div>
            <div className="text-red-100 text-sm mt-1">Loja → Destino</div>
          </button>

          <button onClick={() => setTipo('vuelta')}
            className="w-full max-w-xs py-8 rounded-3xl bg-[#3A3A3A] text-white shadow-lg shadow-gray-300 active:scale-95 transition-all">
            <div className="text-2xl font-bold">VUELTA</div>
            <div className="text-gray-300 text-sm mt-1">Destino → Loja</div>
          </button>
        </div>
      </div>
    );
  }

  // ── Pantalla de venta principal ──
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

      {/* Header ultra compacto */}
      <div className="bg-[#912D26] text-white px-4 py-2.5">
        <div className="flex items-center justify-between">
          <button onClick={onClose} className="p-1 -ml-1">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="flex-1 text-center">
            <div className="text-sm font-bold leading-tight">{estado.hora} · {rutaMatched}</div>
            <div className="text-[10px] text-red-200 uppercase font-semibold">{tipo}</div>
          </div>
          <div className="text-right">
            <div className="text-xs font-mono">{ventasHoy}t</div>
            <div className="text-xs font-mono">${totalHoy.toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* Paradas - botones grandes para una mano */}
      <div className="flex-1 px-3 py-3 space-y-3 overflow-y-auto">
        {/* Confirmación de venta (flash) */}
        {lastSale && (
          <div className="bg-green-500 text-white rounded-2xl px-4 py-3 flex items-center gap-3 animate-pulse">
            <Check className="w-6 h-6 flex-shrink-0" />
            <div>
              <div className="font-bold">Venta registrada</div>
              <div className="text-green-100 text-sm">{lastSale.parada} — ${lastSale.monto.toFixed(2)}</div>
            </div>
          </div>
        )}

        {/* Grid de paradas */}
        <div className="grid grid-cols-2 gap-2">
          {paradas.map(p => {
            const isSelected = parada === p.parada;
            return (
              <button
                key={p.parada}
                onClick={() => handleQuickSelect(p.parada, p.tarifa)}
                className={`rounded-2xl p-3 text-left transition-all active:scale-95 ${
                  isSelected
                    ? 'bg-[#912D26] text-white shadow-lg shadow-red-200 ring-2 ring-red-400'
                    : 'bg-white text-[#3A3A3A] border border-gray-100 shadow-sm hover:shadow-md'
                }`}
              >
                <div className="text-sm font-bold leading-tight">{p.parada}</div>
                <div className={`text-lg font-black mt-1 ${isSelected ? 'text-red-100' : 'text-[#912D26]'}`}>
                  ${p.tarifa.toFixed(2)}
                </div>
              </button>
            );
          })}
        </div>

        {/* Entrada manual para parada no listada */}
        <div className="bg-white rounded-2xl border border-gray-100 p-3 shadow-sm">
          <input
            type="text"
            placeholder="Otra parada..."
            value={parada}
            onChange={e => { setParada(e.target.value); setCobrado(''); }}
            className="w-full px-3 py-2.5 rounded-xl bg-gray-50 text-sm text-[#3A3A3A] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#912D26]/30"
          />
        </div>

        {/* Campo de monto y botón registrar */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
              <input
                type="number"
                inputMode="decimal"
                step="0.25"
                min={TARIFA_MINIMA}
                placeholder="0.75"
                value={cobrado}
                onChange={e => setCobrado(e.target.value)}
                className="w-full pl-8 pr-3 py-4 rounded-2xl border-2 border-gray-200 bg-white text-2xl font-black text-[#3A3A3A] text-center focus:outline-none focus:ring-2 focus:ring-[#912D26]/30 focus:border-[#912D26]"
              />
            </div>
          </div>
          {parada && tarifaAuto > 0 && cobrado && parseFloat(cobrado) !== tarifaAuto && (
            <div className="text-center text-xs text-amber-600 bg-amber-50 rounded-xl px-3 py-1.5">
              Tarifa oficial: ${tarifaAuto.toFixed(2)} — Diferencia: ${Math.abs(parseFloat(cobrado || '0') - tarifaAuto).toFixed(2)}
            </div>
          )}
        </div>

        {/* Botón REGISTRAR - grande, al alcance del pulgar */}
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
