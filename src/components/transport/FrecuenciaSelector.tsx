'use client';

import { useState, useEffect, useCallback } from 'react';
import { type VTSession, type FrecuenciaEstado, type FrecuenciaData } from './types-boletos';
import { getVentasByFrecuencia, getVentasPendientes, markVentaSynced, markVentaError, resetErroredToPending } from '@/lib/indexeddb';
import { Clock, ChevronRight, ArrowLeft, RefreshCw, Play, CheckCircle2, XCircle, RotateCcw, Wifi, WifiOff, Send } from 'lucide-react';

interface Props {
  session: VTSession;
  onOpenFrequency: (estado: FrecuenciaEstado) => void;
  onCloseFrequency: (estado: FrecuenciaEstado) => void;
  onBack: () => void;
  onGoToSync: () => void;
}

const today = () => new Date().toISOString().split('T')[0];

function getOriginFromFrecuencia(frec: FrecuenciaData): string {
  if (frec.direccion === 'ida') return 'Loja';
  const parts = frec.ruta.split(' - ');
  if (parts.length >= 2) return parts[1].trim();
  return 'Loja';
}

function getLocalityFromRoute(ruta: string): string {
  const parts = ruta.split(' - ');
  if (parts.length >= 2) {
    const nonLoja = parts.find(p => p.trim() !== 'Loja');
    return nonLoja ? nonLoja.trim() : ruta;
  }
  return ruta;
}

export function FrecuenciaSelector({ session, onOpenFrequency, onCloseFrequency, onBack, onGoToSync }: Props) {
  const [estados, setEstados] = useState<FrecuenciaEstado[]>([]);
  const [frecuencias, setFrecuencias] = useState<FrecuenciaData[]>([]);
  const [loading, setLoading] = useState(true);
  const [reassigning, setReassigning] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handle = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handle);
    window.addEventListener('offline', handle);
    return () => { window.removeEventListener('online', handle); window.removeEventListener('offline', handle); };
  }, []);

  const loadFrecuencias = useCallback(async () => {
    try {
      const res = await fetch(`/api/frecuencias?vtCode=${session.vtCode}`);
      if (res.ok) {
        const data = await res.json();
        setFrecuencias(data);
        initEstados(data);
      }
    } catch (error) {
      console.error('Error cargando frecuencias:', error);
    } finally {
      setLoading(false);
    }
  }, [session.vtCode]);

  const initEstados = (frecs: FrecuenciaData[]) => {
    const fecha = today();
    const estadosMap: Record<string, FrecuenciaEstado> = {};
    for (const f of frecs) {
      const estadoId = `${fecha}_${f.id}`;
      if (!estadosMap[estadoId]) {
        estadosMap[estadoId] = {
          id: f.id, estadoId, frecuenciaId: f.id,
          nombre: f.nombre, ruta: f.ruta, hora: f.hora, direccion: f.direccion,
          estado: 'pendiente', ventasCount: 0, totalRecaudado: 0,
        };
      }
    }
    setEstados(Object.values(estadosMap));
  };

  const loadPendingCount = useCallback(async () => {
    try {
      const { countVentasPendientes } = await import('@/lib/indexeddb');
      const count = await countVentasPendientes();
      setPendingCount(count);
    } catch { /* ignore */ }
  }, []);

  // Cargar ventas por cada frecuencia para mostrar conteos
  const loadVentasCount = useCallback(async () => {
    for (const estado of estados) {
      const ventas = await getVentasByFrecuencia(estado.estadoId);
      const unsynced = ventas.filter(v => v.syncStatus === 'pending' || v.syncStatus === 'error');
      if (unsynced.length > 0 || estado.ventasCount > 0) {
        setEstados(prev => prev.map(e =>
          e.estadoId === estado.estadoId
            ? { ...e, ventasCount: unsynced.length, totalRecaudado: unsynced.reduce((s, v) => s + v.cobrado, 0) }
            : e
        ));
      }
    }
  }, [estados]);

  useEffect(() => {
    loadFrecuencias();
    loadPendingCount();
    const interval = setInterval(() => { loadPendingCount(); loadVentasCount(); }, 5000);
    return () => clearInterval(interval);
  }, [loadFrecuencias, loadPendingCount, loadVentasCount]);

  const updateEstado = (estadoId: string, updates: Partial<FrecuenciaEstado>) => {
    setEstados(prev => prev.map(e => e.estadoId === estadoId ? { ...e, ...updates } : e));
  };

  const handleOpen = (estado: FrecuenciaEstado) => {
    updateEstado(estado.estadoId, { estado: 'abierta' });
    onOpenFrequency({ ...estado, estado: 'abierta' });
  };

  const handleNoRealizada = (estado: FrecuenciaEstado) => {
    updateEstado(estado.estadoId, { estado: 'no_realizada' });
  };

  const handleReassign = (estado: FrecuenciaEstado) => {
    setReassigning(estado.estadoId);
  };

  const getReassignmentTargets = (currentEstado: FrecuenciaEstado): FrecuenciaData[] => {
    const currentFrec = frecuencias.find(f => f.id === currentEstado.id);
    if (!currentFrec) return [];
    const origin = getOriginFromFrecuencia(currentFrec);
    if (origin === 'Loja') {
      return frecuencias.filter(f => f.id !== currentEstado.id);
    } else {
      const currentLocality = getLocalityFromRoute(currentFrec.ruta);
      return frecuencias.filter(f => {
        if (f.id === currentEstado.id) return false;
        const fLocality = getLocalityFromRoute(f.ruta);
        return fLocality === currentLocality;
      });
    }
  };

  const handleSelectReassignment = (targetFrec: FrecuenciaData) => {
    if (!reassigning) return;
    updateEstado(reassigning, {
      id: targetFrec.id, frecuenciaId: targetFrec.id,
      nombre: targetFrec.nombre, ruta: targetFrec.ruta,
      hora: targetFrec.hora, direccion: targetFrec.direccion,
      estado: 'pendiente', ventasCount: 0, totalRecaudado: 0,
    });
    setReassigning(null);
  };

  const getStateIcon = (estado: string) => {
    switch (estado) {
      case 'pendiente': return <Clock className="w-4 h-4 text-gray-400" />;
      case 'abierta': return <Play className="w-4 h-4 text-green-500" />;
      case 'cerrada': return <CheckCircle2 className="w-4 h-4 text-blue-500" />;
      case 'no_realizada': return <XCircle className="w-4 h-4 text-orange-500" />;
      default: return null;
    }
  };

  const getStateColor = (estado: string) => {
    switch (estado) {
      case 'pendiente': return 'bg-gray-100 border-gray-200';
      case 'abierta': return 'bg-green-50 border-green-200';
      case 'cerrada': return 'bg-blue-50 border-blue-200';
      case 'no_realizada': return 'bg-orange-50 border-orange-200';
      default: return 'bg-gray-100 border-gray-200';
    }
  };

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'pendiente': return <span className="px-2 py-0.5 rounded-full text-xs bg-gray-200 text-gray-600">Pendiente</span>;
      case 'abierta': return <span className="px-2 py-0.5 rounded-full text-xs bg-green-200 text-green-700">Abierta</span>;
      case 'cerrada': return <span className="px-2 py-0.5 rounded-full text-xs bg-blue-200 text-blue-700">Cerrada</span>;
      case 'no_realizada': return <span className="px-2 py-0.5 rounded-full text-xs bg-orange-200 text-orange-700">No Realizada</span>;
      default: return null;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-[100dvh] bg-gray-50 items-center justify-center">
        <RefreshCw className="w-8 h-8 text-[#912D26] animate-spin mb-3" />
        <p className="text-[#3A3A3A]">Cargando frecuencias...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[100dvh] bg-gray-50">
      {/* Header con conexión y sync */}
      <div className="bg-[#912D26] text-white px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <button onClick={onBack} className="text-red-100"><ArrowLeft className="w-5 h-5" /></button>
            <div>
              <h1 className="text-lg font-bold">Frecuencias</h1>
              <p className="text-red-100 text-xs">{session.nombre} - {session.ayudanteNombre}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isOnline ? <Wifi className="w-4 h-4 text-green-300" /> : <WifiOff className="w-4 h-4 text-red-300" />}
          </div>
        </div>
        {/* Barra de ventas pendientes + sync rápido */}
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-white/15 rounded-xl px-3 py-1.5 text-sm flex items-center gap-2">
            {pendingCount > 0 ? (
              <>
                <span className="bg-yellow-400 text-yellow-900 text-xs font-bold px-1.5 py-0.5 rounded-full">{pendingCount}</span>
                <span className="text-red-100 text-xs">pendientes</span>
              </>
            ) : (
              <span className="text-green-200 text-xs">Sin pendientes</span>
            )}
          </div>
          {pendingCount > 0 && isOnline && (
            <button onClick={onGoToSync} className="bg-green-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 active:scale-95">
              <Send className="w-3 h-3" /> SYNC
            </button>
          )}
          {pendingCount > 0 && !isOnline && (
            <div className="bg-white/10 text-red-200 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1">
              <WifiOff className="w-3 h-3" /> Sin red
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 px-4 py-3 space-y-2 overflow-y-auto pb-6">
        <div className="text-center text-xs text-gray-500 mb-1">
          {new Date().toLocaleDateString('es-EC', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>

        {reassigning && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
            <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-md p-6 max-h-[80vh] overflow-y-auto">
              <h3 className="text-lg font-bold text-[#3A3A3A] mb-1">Reasignar Horario</h3>
              <p className="text-sm text-gray-500 mb-4">Selecciona la nueva frecuencia</p>
              <div className="space-y-2">
                {getReassignmentTargets(estados.find(e => e.estadoId === reassigning)!).map(target => (
                  <button key={target.id} onClick={() => handleSelectReassignment(target)}
                    className="w-full p-4 rounded-xl border border-gray-200 hover:bg-[#912D26]/5 hover:border-[#912D26]/30 transition-all text-left">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-[#3A3A3A]">{target.nombre}</div>
                        <div className="text-sm text-gray-500">{target.ruta}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-[#912D26]">{target.hora}</div>
                        <div className="text-xs text-gray-400">{target.direccion}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              <button onClick={() => setReassigning(null)}
                className="w-full mt-4 py-3 rounded-xl border-2 border-gray-200 text-gray-500 font-semibold">Cancelar</button>
            </div>
          </div>
        )}

        {estados.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400">No hay frecuencias configuradas</p>
          </div>
        ) : (
          estados.map(estado => (
            <div key={estado.estadoId} className={`${getStateColor(estado.estado)} rounded-2xl border p-3 transition-all`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {getStateIcon(estado.estado)}
                  <div>
                    <span className="font-bold text-[#3A3A3A]">{estado.hora}</span>
                    <span className="text-sm text-gray-500 ml-2">{estado.nombre}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {estado.ventasCount > 0 && (
                    <span className="bg-[#912D26]/10 text-[#912D26] text-xs font-bold px-1.5 py-0.5 rounded-full">
                      {estado.ventasCount}t · ${estado.totalRecaudado.toFixed(2)}
                    </span>
                  )}
                  {getEstadoBadge(estado.estado)}
                </div>
              </div>
              <div className="text-xs text-gray-500 mb-2">{estado.ruta}</div>
              <div className="flex gap-2">
                {estado.estado === 'pendiente' && (
                  <>
                    <button onClick={() => handleOpen(estado)} className="flex-1 py-2 rounded-xl bg-[#912D26] text-white font-semibold text-sm flex items-center justify-center gap-1 active:scale-[0.98]">
                      <Play className="w-4 h-4" /> Vender
                    </button>
                    <button onClick={() => handleNoRealizada(estado)} className="py-2 px-3 rounded-xl bg-orange-100 text-orange-600 font-semibold text-sm flex items-center gap-1">
                      <XCircle className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleReassign(estado)} className="py-2 px-3 rounded-xl bg-gray-200 text-gray-600 font-semibold text-sm flex items-center gap-1" title="Reasignar">
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  </>
                )}
                {estado.estado === 'abierta' && (
                  <>
                    <button onClick={() => onOpenFrequency(estado)} className="flex-1 py-2 rounded-xl bg-green-600 text-white font-semibold text-sm flex items-center justify-center gap-1">
                      <ChevronRight className="w-4 h-4" /> Vender
                    </button>
                    <button onClick={() => onCloseFrequency(estado)} className="py-2 px-3 rounded-xl bg-blue-100 text-blue-600 font-semibold text-sm flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Liquidar
                    </button>
                  </>
                )}
                {(estado.estado === 'cerrada' || estado.estado === 'no_realizada') && (
                  <div className="text-sm text-gray-400">
                    {estado.estado === 'cerrada' ? `Cerrada · ${estado.ventasCount} ventas · $${estado.totalRecaudado.toFixed(2)}` : 'No realizada'}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Botón sync global fijo abajo */}
      {pendingCount > 0 && (
        <div className="p-3 border-t border-gray-200 bg-white">
          <button onClick={onGoToSync}
            className={`w-full py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] ${
              isOnline ? 'bg-green-600 text-white shadow-lg shadow-green-200' : 'bg-gray-200 text-gray-400'
            }`}
            disabled={!isOnline}>
            <Send className="w-5 h-5" />
            {isOnline ? `SINCRONIZAR ${pendingCount} VENTAS` : `SIN INTERNET — ${pendingCount} VENTAS PENDIENTES`}
          </button>
        </div>
      )}
    </div>
  );
}
