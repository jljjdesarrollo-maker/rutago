'use client';

import { useState, useEffect, useCallback } from 'react';
import { type FrecuenciaEstado, type VTSession } from './types-boletos';
import { getTarifa, TARIFA_MINIMA, getParadasByRutaAndTipo, getAllRutas } from '@/lib/tarifas-data';
import { saveVenta } from '@/lib/indexeddb';
import { ArrowLeft, Plus, DollarSign, MapPin, Ticket } from 'lucide-react';

interface Props {
  session: VTSession;
  estado: FrecuenciaEstado;
  onClose: () => void;
}

export function TicketScreen({ session, estado, onClose }: Props) {
  const [ruta, setRuta] = useState(estado.ruta);
  const [tipo, setTipo] = useState(estado.direccion);
  const [parada, setParada] = useState('');
  const [cobrado, setCobrado] = useState('');
  const [lastSale, setLastSale] = useState<string | null>(null);
  const [ventasHoy, setVentasHoy] = useState(0);
  const [totalHoy, setTotalHoy] = useState(0);
  const [showRutaPicker, setShowRutaPicker] = useState(false);

  const paradas = getParadasByRutaAndTipo(ruta, tipo);
  const tarifaAuto = parada ? getTarifa(ruta, parada, tipo) : 0;
  const allRutas = getAllRutas();

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
    if (!parada.trim() || !cobrado.trim()) return;
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
      ruta,
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
    setLastSale(`$${cobradoNum.toFixed(2)} - ${parada}`);
    setParada('');
    setCobrado('');
    loadStats();
  };

  return (
    <div className="flex flex-col min-h-[100dvh] bg-gray-50">
      <div className="bg-[#912D26] text-white px-6 py-4">
        <div className="flex items-center justify-between mb-2">
          <button onClick={onClose} className="flex items-center gap-1 text-red-100">
            <ArrowLeft className="w-5 h-5" /> Cerrar
          </button>
          <div className="text-right">
            <div className="text-lg font-bold">{estado.hora}</div>
            <div className="text-xs text-red-100">{estado.nombre}</div>
          </div>
        </div>
        <div className="flex gap-3 text-sm text-red-100">
          <span className="flex items-center gap-1"><Ticket className="w-3 h-3" /> {ventasHoy}</span>
          <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" /> ${totalHoy.toFixed(2)}</span>
        </div>
      </div>

      <div className="flex-1 px-4 py-4 space-y-4 overflow-y-auto">
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-[#3A3A3A] flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#912D26]" /> Ruta
            </h3>
            <button onClick={() => setShowRutaPicker(!showRutaPicker)} className="text-sm text-[#912D26] font-semibold">Cambiar</button>
          </div>
          {showRutaPicker && (
            <div className="mb-3 space-y-2">
              {allRutas.map(r => (
                <button key={r} onClick={() => { setRuta(r); setShowRutaPicker(false); setParada(''); setCobrado(''); }}
                  className={`w-full py-2 px-3 rounded-lg text-left text-sm ${ruta === r ? 'bg-[#912D26] text-white' : 'bg-gray-50 text-[#3A3A3A]'}`}>{r}</button>
              ))}
            </div>
          )}
          <div className="text-sm text-gray-600">{ruta}</div>
          <div className="flex mt-3 bg-gray-100 rounded-xl p-1">
            <button onClick={() => { setTipo('ida'); setParada(''); setCobrado(''); }}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${tipo === 'ida' ? 'bg-[#912D26] text-white shadow' : 'text-gray-500'}`}>Ida</button>
            <button onClick={() => { setTipo('vuelta'); setParada(''); setCobrado(''); }}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${tipo === 'vuelta' ? 'bg-[#912D26] text-white shadow' : 'text-gray-500'}`}>Vuelta</button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <h3 className="font-bold text-[#3A3A3A] mb-3 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[#912D26]" /> Paradas
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {paradas.map(p => (
              <button key={p.parada} onClick={() => handleQuickSelect(p.parada, p.tarifa)}
                className={`py-2.5 px-3 rounded-xl text-left text-sm transition-all ${parada === p.parada ? 'bg-[#912D26] text-white shadow' : 'bg-gray-50 text-[#3A3A3A] hover:bg-gray-100'}`}>
                <div className="font-medium">{p.parada}</div>
                <div className={`text-xs ${parada === p.parada ? 'text-red-100' : 'text-gray-400'}`}>${p.tarifa.toFixed(2)}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <h3 className="font-bold text-[#3A3A3A] mb-3 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-[#912D26]" /> Monto
          </h3>
          <div className="flex gap-2">
            <input type="text" placeholder="Parada" value={parada} onChange={e => { setParada(e.target.value); if (cobrado && !e.target.value) setCobrado(''); }}
              className="flex-1 px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-[#3A3A3A] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#912D26]/30" />
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
              <input type="number" inputMode="decimal" step="0.25" min={TARIFA_MINIMA} placeholder="0.75" value={cobrado} onChange={e => setCobrado(e.target.value)}
                className="w-28 pl-7 pr-3 py-3 rounded-xl border border-gray-200 bg-gray-50 text-[#3A3A3A] focus:outline-none focus:ring-2 focus:ring-[#912D26]/30" />
            </div>
          </div>
          {tarifaAuto > 0 && <p className="text-xs text-gray-400 mt-2">Tarifa oficial: ${tarifaAuto.toFixed(2)}</p>}
        </div>

        <button onClick={handleVenta} disabled={!parada.trim() || !cobrado.trim() || parseFloat(cobrado) < TARIFA_MINIMA}
          className={`w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all ${parada.trim() && cobrado.trim() && parseFloat(cobrado) >= TARIFA_MINIMA ? 'bg-[#912D26] text-white shadow-lg shadow-red-200 active:scale-[0.98]' : 'bg-[#D6D6D6] text-gray-400 cursor-not-allowed'}`}>
          <Plus className="w-5 h-5" /> Registrar Venta
        </button>

        {lastSale && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center">
            <div className="text-green-600 font-bold">Venta registrada</div>
            <div className="text-sm text-green-500">{lastSale}</div>
          </div>
        )}
      </div>
    </div>
  );
}