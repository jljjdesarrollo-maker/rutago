'use client';

import { useState, useEffect, useCallback } from 'react';
import { type VTSession } from './types-boletos';
import { getVentasPendientes, markVentaSynced, markVentaError, resetErroredToPending } from '@/lib/indexeddb';
import { ArrowLeft, RefreshCw, CheckCircle2, Wifi, WifiOff, AlertTriangle, Clock } from 'lucide-react';

interface Props {
  session: VTSession;
  onBack: () => void;
}

export function SyncScreen({ session, onBack }: Props) {
  const [ventas, setVentas] = useState<any[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [syncResults, setSyncResults] = useState<{ ok: number; fail: number; total: number }>({ ok: 0, fail: 0, total: 0 });
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handle = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handle);
    window.addEventListener('offline', handle);
    return () => { window.removeEventListener('online', handle); window.removeEventListener('offline', handle); };
  }, []);

  const loadVentas = useCallback(async () => {
    const all = await getVentasPendientes();
    setVentas(all);
  }, []);

  useEffect(() => { loadVentas(); }, [loadVentas]);

  const pendingCount = ventas.filter(v => v.syncStatus === 'pending').length;
  const errorCount = ventas.filter(v => v.syncStatus === 'error').length;
  const totalPending = ventas.length;

  const handleRetryErrors = async () => {
    await resetErroredToPending();
    await loadVentas();
  };

  const handleSyncAll = async () => {
    if (!isOnline || syncing || totalPending === 0) return;
    setSyncing(true);
    setSyncResults({ ok: 0, fail: 0, total: totalPending });

    await resetErroredToPending();
    await loadVentas();
    const freshVentas = await getVentasPendientes();

    for (const venta of freshVentas) {
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
            ...(venta.lat != null ? { lat: venta.lat } : {}),
            ...(venta.lng != null ? { lng: venta.lng } : {}),
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
    await loadVentas();
  };

  return (
    <div className="flex flex-col min-h-[100dvh] bg-gray-50">
      <div className="bg-[#912D26] text-white px-6 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Sincronizacion</h2>
            <p className="text-red-100 text-sm">{session.nombre}</p>
          </div>
          <div className="flex items-center gap-2">
            {isOnline ? <Wifi className="w-5 h-5 text-green-300" /> : <WifiOff className="w-5 h-5 text-red-300" />}
            <span className="text-xs">{isOnline ? 'Online' : 'Offline'}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 py-6 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
            <Clock className="w-6 h-6 text-yellow-500 mx-auto mb-1" />
            <div className="text-2xl font-bold text-[#3A3A3A]">{pendingCount}</div>
            <div className="text-xs text-gray-500">Pendientes</div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
            <AlertTriangle className="w-6 h-6 text-red-500 mx-auto mb-1" />
            <div className="text-2xl font-bold text-[#3A3A3A]">{errorCount}</div>
            <div className="text-xs text-gray-500">Errores</div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
            <CheckCircle2 className="w-6 h-6 text-green-500 mx-auto mb-1" />
            <div className="text-2xl font-bold text-[#3A3A3A]">{syncResults.ok}</div>
            <div className="text-xs text-gray-500">Sincronizadas</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h3 className="font-bold text-[#3A3A3A] mb-3">Ventas pendientes ({totalPending})</h3>
          {totalPending === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-2" />
              <p className="text-gray-500">Todo sincronizado</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {ventas.map((v) => (
                <div key={v.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="text-sm font-medium text-[#3A3A3A]">{v.parada} - ${v.cobrado.toFixed(2)}</div>
                    <div className="text-xs text-gray-400">{v.fecha} {v.hora} - {v.frecuenciaNombre}</div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${v.syncStatus === 'error' ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-600'}`}>
                    {v.syncStatus === 'error' ? 'Error' : 'Pend.'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {(syncResults.ok > 0 || syncResults.fail > 0) && (
          <div className={`rounded-2xl border p-4 ${syncResults.fail > 0 ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200'}`}>
            <div className="flex items-center gap-3 justify-center">
              {syncResults.ok > 0 && <span className="text-green-600 text-sm">✅ {syncResults.ok} OK</span>}
              {syncResults.fail > 0 && <span className="text-red-600 text-sm">❌ {syncResults.fail} errores</span>}
            </div>
          </div>
        )}

        <div className="space-y-3">
          {errorCount > 0 && !syncing && (
            <button onClick={handleRetryErrors} className="w-full py-3 rounded-xl bg-yellow-100 text-yellow-700 font-semibold flex items-center justify-center gap-2">
              <RefreshCw className="w-5 h-5" /> Reintentar errores ({errorCount})
            </button>
          )}
          <button onClick={handleSyncAll} disabled={!isOnline || syncing || totalPending === 0}
            className="w-full py-4 rounded-2xl bg-[#912D26] text-white font-bold text-lg flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-red-200">
            {syncing ? <RefreshCw className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
            {syncing ? 'Sincronizando...' : `Sincronizar todo (${totalPending})`}
          </button>
        </div>
      </div>

      <div className="p-4 border-t border-gray-100">
        <button onClick={onBack} className="w-full py-3 rounded-xl bg-gray-100 text-[#3A3A3A] font-semibold flex items-center justify-center gap-2">
          <ArrowLeft className="w-5 h-5" /> Volver
        </button>
      </div>
    </div>
  );
}
