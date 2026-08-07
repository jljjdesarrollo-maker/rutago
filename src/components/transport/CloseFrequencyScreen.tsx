'use client';

import { useState, useEffect, useCallback } from 'react';
import { type FrecuenciaEstado, type VTSession } from './types-boletos';
import { getVentasByFrecuencia, markVentaSynced, markVentaError, resetErroredToPending } from '@/lib/indexeddb';
import { ArrowLeft, CheckCircle2, RefreshCw, DollarSign, Ticket, Wifi, WifiOff } from 'lucide-react';

interface Props {
  session: VTSession;
  estado: FrecuenciaEstado;
  onClosed: () => void;
  onBack: () => void;
}

export function CloseFrequencyScreen({ session, estado, onClosed, onBack }: Props) {
  const [ventas, setVentas] = useState<any[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [syncResults, setSyncResults] = useState<{ ok: number; fail: number }>({ ok: 0, fail: 0 });
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showSyncConfirm, setShowSyncConfirm] = useState(false);

  useEffect(() => {
    const handle = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handle);
    window.addEventListener('offline', handle);
    return () => { window.removeEventListener('online', handle); window.removeEventListener('offline', handle); };
  }, []);

  const loadVentas = useCallback(async () => {
    const all = await getVentasByFrecuencia(estado.estadoId);
    const unsynced = all.filter(v => v.syncStatus === 'pending' || v.syncStatus === 'error');
    setVentas(unsynced);
  }, [estado.estadoId]);

  useEffect(() => { loadVentas(); }, [loadVentas]);

  const totalRecaudado = ventas.reduce((sum, v) => sum + v.cobrado, 0);

  const handleSync = async () => {
    setSyncing(true);
    setSyncResults({ ok: 0, fail: 0 });
    await resetErroredToPending();
    await loadVentas();

    for (const venta of ventas) {
      try {
        const res = await fetch('/api/ventas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fecha: venta.fecha, vtCode: venta.vtCode, frecuenciaId: venta.frecuenciaId,
            ruta: venta.ruta, parada: venta.parada, tipo: venta.tipo,
            tarifaOficial: venta.tarifaOficial, cobrado: venta.cobrado,
            hora: venta.hora, ayudanteId: venta.ayudanteId, ayudanteNombre: venta.ayudanteNombre,
            createdAt: venta.createdAt, localId: venta.id,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          await markVentaSynced(venta.id, data.venta?.id || '');
          setSyncResults(prev => ({ ...prev, ok: prev.ok + 1 }));
        } else {
          const err = await res.json().catch(() => ({}));
          await markVentaError(venta.id, err.error || 'Error del servidor');
          setSyncResults(prev => ({ ...prev, fail: prev.fail + 1 }));
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Sin conexion';
        await markVentaError(venta.id, message);
        setSyncResults(prev => ({ ...prev, fail: prev.fail + 1 }));
      }
    }
    setSyncing(false);
    setShowSyncConfirm(false);
    await loadVentas();
  };

  return (
    <div className="flex flex-col min-h-[100dvh] bg-gray-50">
      <div className="bg-[#912D26] text-white px-6 py-4">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={onBack} className="text-red-100"><ArrowLeft className="w-5 h-5" /></button>
          <div>
            <h2 className="text-xl font-bold">Cierre de Frecuencia</h2>
            <p className="text-red-100 text-sm">{estado.hora} - {estado.nombre}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isOnline ? <Wifi className="w-4 h-4 text-green-300" /> : <WifiOff className="w-4 h-4 text-red-300" />}
          <span className="text-xs text-red-100">{isOnline ? 'Conectado' : 'Sin conexion'}</span>
        </div>
      </div>

      <div className="flex-1 px-4 py-6 space-y-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h3 className="font-bold text-[#3A3A3A] mb-4">Resumen</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <Ticket className="w-6 h-6 text-[#912D26] mx-auto mb-1" />
              <div className="text-2xl font-bold text-[#3A3A3A]">{ventas.length}</div>
              <div className="text-xs text-gray-500">Ventas</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <DollarSign className="w-6 h-6 text-[#912D26] mx-auto mb-1" />
              <div className="text-2xl font-bold text-[#3A3A3A]">${totalRecaudado.toFixed(2)}</div>
              <div className="text-xs text-gray-500">Recaudado</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h3 className="font-bold text-[#3A3A3A] mb-3">Detalle de Ventas</h3>
          {ventas.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">No hay ventas registradas</p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {ventas.map((v, i) => (
                <div key={v.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-gray-400">{i + 1}</span>
                    <div>
                      <div className="text-sm font-medium text-[#3A3A3A]">{v.parada}</div>
                      <div className="text-xs text-gray-400">{v.hora} - {v.ruta}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-[#912D26]">${v.cobrado.toFixed(2)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {(syncResults.ok > 0 || syncResults.fail > 0) && (
          <div className={`rounded-2xl border p-4 ${syncResults.fail > 0 ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200'}`}>
            <div className="flex items-center gap-2 justify-center">
              {syncResults.ok > 0 && <span className="text-green-600 text-sm font-medium">✅ {syncResults.ok} sincronizadas</span>}
              {syncResults.fail > 0 && <span className="text-red-600 text-sm font-medium">❌ {syncResults.fail} errores</span>}
            </div>
          </div>
        )}

        <div className="space-y-3">
          {ventas.length > 0 && (
            showSyncConfirm ? (
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 space-y-3">
                <p className="text-sm text-blue-700 text-center font-medium">Sincronizar {ventas.length} ventas ahora?</p>
                <div className="flex gap-2">
                  <button onClick={() => setShowSyncConfirm(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-500 text-sm font-semibold">Cancelar</button>
                  <button onClick={handleSync} disabled={syncing || !isOnline}
                    className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-1">
                    {syncing ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                    {syncing ? 'Sincronizando...' : 'Confirmar'}
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => setShowSyncConfirm(true)} disabled={!isOnline}
                className="w-full py-3 rounded-xl bg-blue-600 text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
                <RefreshCw className="w-5 h-5" /> Sincronizar
              </button>
            )
          )}
          <button onClick={onClosed}
            className="w-full py-4 rounded-2xl bg-[#912D26] text-white font-bold text-lg flex items-center justify-center gap-2 shadow-lg shadow-red-200">
            <CheckCircle2 className="w-5 h-5" /> Cerrar Frecuencia
          </button>
        </div>
      </div>
    </div>
  );
}