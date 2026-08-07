'use client';

import { useState, useEffect, useCallback } from 'react';
import { type VTSession, type FrecuenciaEstado, type FrecuenciaData } from './types-boletos';
import { Clock, ChevronRight, ArrowLeft, RefreshCw, Play, CheckCircle2, XCircle, RotateCcw } from 'lucide-react';

interface Props {
  session: VTSession;
  onOpenFrequency: (estado: FrecuenciaEstado) => void;
  onCloseFrequency: (estado: FrecuenciaEstado) => void;
  onBack: () => void;
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

export function FrecuenciaSelector({ session, onOpenFrequency, onCloseFrequency, onBack }: Props) {
  const [estados, setEstados] = useState<FrecuenciaEstado[]>([]);
  const [frecuencias, setFrecuencias] = useState<FrecuenciaData[]>([]);
  const [loading, setLoading] = useState(true);
  const [reassigning, setReassigning] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);

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

  useEffect(() => {
    loadFrecuencias();
    loadPendingCount();
    const interval = setInterval(loadPendingCount, 3000);
    return () => clearInterval(interval);
  }, [loadFrecuencias, loadPendingCount]);

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
      estado: 'pendiente',
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
      <div className="bg-[#912D26] text-white px-6 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Frecuencias</h1>
            <p className="text-red-100 text-sm">{session.nombre} - {session.ayudanteNombre}</p>
          </div>
          {pendingCount > 0 && (
            <span className="bg-yellow-400 text-yellow-900 text-xs font-bold px-2.5 py-1 rounded-full">{pendingCount} pendientes</span>
          )}
        </div>
      </div>

      <div className="flex-1 px-4 py-4 space-y-3 overflow-y-auto pb-6">
        <div className="text-center text-sm text-gray-500 mb-2">
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
            <div key={estado.estadoId} className={`${getStateColor(estado.estado)} rounded-2xl border p-4 transition-all`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {getStateIcon(estado.estado)}
                  <div>
                    <span className="font-bold text-[#3A3A3A]">{estado.hora}</span>
                    <span className="text-sm text-gray-500 ml-2">{estado.nombre}</span>
                  </div>
                </div>
                {getEstadoBadge(estado.estado)}
              </div>
              <div className="text-sm text-gray-500 mb-3">{estado.ruta} &middot; {estado.direccion}</div>
              <div className="flex gap-2">
                {estado.estado === 'pendiente' && (
                  <>
                    <button onClick={() => handleOpen(estado)} className="flex-1 py-2.5 rounded-xl bg-[#912D26] text-white font-semibold text-sm flex items-center justify-center gap-1 active:scale-[0.98]">
                      <Play className="w-4 h-4" /> Abrir
                    </button>
                    <button onClick={() => handleNoRealizada(estado)} className="py-2.5 px-4 rounded-xl bg-orange-100 text-orange-600 font-semibold text-sm flex items-center gap-1">
                      <XCircle className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleReassign(estado)} className="py-2.5 px-4 rounded-xl bg-gray-200 text-gray-600 font-semibold text-sm flex items-center gap-1" title="Reasignar horario">
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  </>
                )}
                {estado.estado === 'abierta' && (
                  <>
                    <button onClick={() => onOpenFrequency(estado)} className="flex-1 py-2.5 rounded-xl bg-green-600 text-white font-semibold text-sm flex items-center justify-center gap-1">
                      <ChevronRight className="w-4 h-4" /> Vender
                    </button>
                    <button onClick={() => onCloseFrequency(estado)} className="py-2.5 px-4 rounded-xl bg-blue-100 text-blue-600 font-semibold text-sm flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Cerrar
                    </button>
                  </>
                )}
                {(estado.estado === 'cerrada' || estado.estado === 'no_realizada') && (
                  <div className="text-sm text-gray-400">
                    {estado.estado === 'cerrada' ? '✓ Cerrada' : '✗ No realizada'}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-4 border-t border-gray-100">
        <button onClick={onBack} className="w-full py-3 rounded-xl bg-gray-100 text-[#3A3A3A] font-semibold flex items-center justify-center gap-2">
          <ArrowLeft className="w-5 h-5" /> Volver
        </button>
      </div>
    </div>
  );
}