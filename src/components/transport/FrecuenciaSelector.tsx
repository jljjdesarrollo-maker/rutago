'use client';

import { useState, useEffect, useCallback } from 'react';
import { type VTSession, type FrecuenciaEstado, type FrecuenciaData, loadPromoConfig } from './types-boletos';
import { getVentasByFrecuencia, countVentasPendientes, syncVentasSilencioso, deleteVentasByEstadoId } from '@/lib/indexeddb';
import { matchRuta } from '@/lib/tarifas-data';
import { Clock, ChevronRight, ArrowLeft, RefreshCw, Play, CheckCircle2, XCircle, RotateCcw, Wifi, WifiOff, Send, DollarSign, Ticket, ClipboardCheck, AlertTriangle, Wrench, Droplets, UserX, Ban, FileText, Truck, CheckCircle, Sparkles } from 'lucide-react';

interface Props {
  session: VTSession;
  onOpenFrequency: (estado: FrecuenciaEstado) => void;
  onGoToArqueo: (estado: FrecuenciaEstado, esUltima: boolean) => void;
  onGoToArqueoGeneral: () => void;
  onBack: () => void;
  onGoToSync: () => void;
}

const today = () => new Date().toISOString().split('T')[0];

// ─── Colores por ruta para botones de frecuencia ───
type RutaColorKey = 'el_tambo' | 'la_elvira' | 'yangana' | 'zahuayco' | 'vilcabamba';

const RUTA_BUTTON_COLORS: Record<RutaColorKey, { bg: string; shadow: string; border: string; badge: string; text: string; light: string }> = {
  el_tambo: {
    bg: 'bg-blue-600',
    shadow: 'shadow-blue-200',
    border: 'border-l-blue-600',
    badge: 'bg-blue-100 text-blue-700',
    text: 'text-blue-600',
    light: 'bg-blue-50',
  },
  la_elvira: {
    bg: 'bg-purple-600',
    shadow: 'shadow-purple-200',
    border: 'border-l-purple-600',
    badge: 'bg-purple-100 text-purple-700',
    text: 'text-purple-600',
    light: 'bg-purple-50',
  },
  yangana: {
    bg: 'bg-emerald-600',
    shadow: 'shadow-emerald-200',
    border: 'border-l-emerald-600',
    badge: 'bg-emerald-100 text-emerald-700',
    text: 'text-emerald-600',
    light: 'bg-emerald-50',
  },
  zahuayco: {
    bg: 'bg-amber-600',
    shadow: 'shadow-amber-200',
    border: 'border-l-amber-600',
    badge: 'bg-amber-100 text-amber-700',
    text: 'text-amber-600',
    light: 'bg-amber-50',
  },
  vilcabamba: {
    bg: 'bg-[#912D26]',
    shadow: 'shadow-red-200',
    border: 'border-l-[#912D26]',
    badge: 'bg-red-100 text-[#912D26]',
    text: 'text-[#912D26]',
    light: 'bg-red-50',
  },
};

function getRutaColorKey(rutaNombre: string): RutaColorKey {
  const ruta = matchRuta(rutaNombre).toLowerCase();
  if (ruta.includes('el tambo')) return 'el_tambo';
  if (ruta.includes('la elvira')) return 'la_elvira';
  if (ruta.includes('yangana')) return 'yangana';
  if (ruta.includes('zahuayco')) return 'zahuayco';
  return 'vilcabamba';
}

// ─── LocalStorage helpers for estados (synchronous, reliable) ───

function estadosKey(vtCode: string, fecha: string) {
  return `rg_estados_${vtCode}_${fecha}`;
}

function saveEstadosToLS(vtCode: string, fecha: string, estados: FrecuenciaEstado[]) {
  try {
    localStorage.setItem(estadosKey(vtCode, fecha), JSON.stringify(estados));
  } catch (e) { console.error('Error saving estados to LS:', e); }
}

function loadEstadosFromLS(vtCode: string, fecha: string): FrecuenciaEstado[] | null {
  try {
    const raw = localStorage.getItem(estadosKey(vtCode, fecha));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function updateEstadoInLS(vtCode: string, fecha: string, estadoId: string, updates: Partial<FrecuenciaEstado>) {
  const all = loadEstadosFromLS(vtCode, fecha);
  if (!all) return;
  const idx = all.findIndex(e => e.estadoId === estadoId);
  if (idx >= 0) {
    all[idx] = { ...all[idx], ...updates };
    saveEstadosToLS(vtCode, fecha, all);
  }
}

export function FrecuenciaSelector({ session, onOpenFrequency, onGoToArqueo, onGoToArqueoGeneral, onBack, onGoToSync }: Props) {
  const [estados, setEstados] = useState<FrecuenciaEstado[]>([]);
  const [frecuencias, setFrecuencias] = useState<FrecuenciaData[]>([]);
  const [loading, setLoading] = useState(true);
  const [reassigning, setReassigning] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncingForArqueo, setSyncingForArqueo] = useState(false);
  const [syncDone, setSyncDone] = useState(false);
  const [noRealizadaModal, setNoRealizadaModal] = useState<FrecuenciaEstado | null>(null);
  const [motivoSeleccionado, setMotivoSeleccionado] = useState('');
  const [motivoPersonalizado, setMotivoPersonalizado] = useState('');
  const [ingresoEspecialNota, setIngresoEspecialNota] = useState('');
  const [ingresoEspecialMonto, setIngresoEspecialMonto] = useState('');
  const [confirmNoRealizada, setConfirmNoRealizada] = useState(false);
  const [allFrecuencias, setAllFrecuencias] = useState<FrecuenciaData[]>([]);
  const [exitModal, setExitModal] = useState(false);
  const [cajaComunModal, setCajaComunModal] = useState<FrecuenciaEstado | null>(null);
  const [cajaComunCount, setCajaComunCount] = useState(0);
  const [cajaComunMonto, setCajaComunMonto] = useState('');
  const [cajaComunEsUltima, setCajaComunEsUltima] = useState(false);
  const fecha = session.fecha || today();

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

        // Try loading saved estados from localStorage first
        const saved = loadEstadosFromLS(session.vtCode, fecha);
        if (saved && saved.length === data.length) {
          setEstados(saved);
        } else {
          // Create fresh pendiente estados
          const newEstados: FrecuenciaEstado[] = data.map((f: FrecuenciaData) => ({
            id: f.id,
            estadoId: `${fecha}_${f.id}`,
            frecuenciaId: f.id,
            nombre: f.nombre,
            ruta: f.ruta,
            hora: f.hora,
            direccion: f.direccion,
            estado: 'pendiente' as const,
            ventasCount: 0,
            totalRecaudado: 0,
          }));
          setEstados(newEstados);
          saveEstadosToLS(session.vtCode, fecha, newEstados);
        }
      }
    } catch (error) {
      console.error('Error cargando frecuencias:', error);
      // Fallback: try to restore from localStorage only
      const saved = loadEstadosFromLS(session.vtCode, fecha);
      if (saved) setEstados(saved);
    } finally {
      setLoading(false);
    }
  }, [session.vtCode, fecha]);

  const loadPendingCount = useCallback(async () => {
    try {
      const count = await countVentasPendientes();
      setPendingCount(count);
    } catch { /* ignore */ }
  }, []);

  // Reload ventas counts from IndexedDB periodically
  const refreshVentasCounts = useCallback(async () => {
    for (const estado of estados) {
      try {
        const ventas = await getVentasByFrecuencia(estado.estadoId);
        // Count ALL ventas (including synced) for display in arqueo
        const newCount = ventas.length;
        const newTotal = ventas.reduce((s, v) => s + v.cobrado, 0);
        if (newCount !== estado.ventasCount || Math.abs(newTotal - estado.totalRecaudado) > 0.01) {
          updateEstadoInLS(session.vtCode, fecha, estado.estadoId, { ventasCount: newCount, totalRecaudado: newTotal });
          setEstados(prev => prev.map(e =>
            e.estadoId === estado.estadoId ? { ...e, ventasCount: newCount, totalRecaudado: newTotal } : e
          ));
        }
      } catch { /* ignore */ }
    }
  }, [estados, session.vtCode, fecha]);

  useEffect(() => {
    loadFrecuencias();
    loadPendingCount();
    const interval = setInterval(() => { loadPendingCount(); }, 5000);
    return () => clearInterval(interval);
  }, [loadFrecuencias, loadPendingCount]);

  // Refresh counts after initial load and periodically
  useEffect(() => {
    if (!loading && estados.length > 0) {
      refreshVentasCounts();
      const interval = setInterval(refreshVentasCounts, 5000);
      return () => clearInterval(interval);
    }
  }, [loading, estados.length, refreshVentasCounts]);

  const updateEstado = (estadoId: string, updates: Partial<FrecuenciaEstado>) => {
    // Update in-memory state
    setEstados(prev => prev.map(e => e.estadoId === estadoId ? { ...e, ...updates } : e));
    // Persist to localStorage (synchronous, always reliable)
    updateEstadoInLS(session.vtCode, fecha, estadoId, updates);
  };

  // Sequential: frequency available if previous are all cerrada/no_realizada
  const isFrecuenciaDisponible = (index: number): boolean => {
    const estado = estados[index];
    if (!estado) return false;
    if (estado.estado === 'cerrada' || estado.estado === 'no_realizada') return false;
    for (let i = 0; i < index; i++) {
      const prev = estados[i];
      if (prev && prev.estado !== 'cerrada' && prev.estado !== 'no_realizada') {
        return false;
      }
    }
    return true;
  };

  const handleOpen = async (estado: FrecuenciaEstado) => {
    // GPS invisible: capture coordinates when frequency opens
    const { getGPSPosition } = await import('@/lib/gps');
    const gps = await getGPSPosition();

    // Generate random winner position for Viaje Gratis
    const promoConfig = loadPromoConfig();
    let ganadorPosicion: number | null = null;
    if (promoConfig.activa) {
      const min = promoConfig.rangoMin || 3;
      const max = promoConfig.rangoMax || 30;
      ganadorPosicion = Math.floor(Math.random() * (max - min + 1)) + min;
    }

    const updatedEstado = { ...estado, estado: 'abierta' as const, ganadorPosicion };
    updateEstado(estado.estadoId, {
      estado: 'abierta',
      ganadorPosicion,
      ...(gps ? { gpsLatStart: gps.lat, gpsLngStart: gps.lng } : {}),
    });
    onOpenFrequency(updatedEstado);
  };

  const handleNoRealizada = (estado: FrecuenciaEstado) => {
    setNoRealizadaModal(estado);
    setMotivoSeleccionado('');
    setMotivoPersonalizado('');
    setIngresoEspecialNota('');
    setIngresoEspecialMonto('');
    setConfirmNoRealizada(false);
  };

  const confirmNoRealizadaAction = () => {
    if (!noRealizadaModal) return;
    const motivo = motivoSeleccionado === 'otro' ? motivoPersonalizado.trim() : motivoSeleccionado;
    const montoEspecial = parseFloat(ingresoEspecialMonto) || 0;
    const notaEspecial = ingresoEspecialNota.trim();
    // Eliminar ventas de esta frecuencia de IndexedDB (no se realizaron)
    deleteVentasByEstadoId(noRealizadaModal.estadoId).catch(() => {});
    updateEstado(noRealizadaModal.estadoId, {
      estado: 'no_realizada',
      ventasCount: 0,
      totalRecaudado: montoEspecial,  // si hay ingreso especial, suma al total
      motivoNoRealizada: motivo || 'Sin especificar',
      ingresoEspecialNota: notaEspecial || undefined,
      ingresoEspecialMonto: montoEspecial > 0 ? montoEspecial : undefined,
    });
    setNoRealizadaModal(null);
  };

  // ─── Caja Común (Oficina Loja) ───
  const handleGoToArqueo = (estado: FrecuenciaEstado, esUltima: boolean) => {
    // Open caja común modal first, then proceed to arqueo
    setCajaComunModal(estado);
    setCajaComunEsUltima(esUltima);
    // Restore previous values if reopening
    setCajaComunCount(estado.cajaComunCount || 0);
    setCajaComunMonto(estado.cajaComunMonto ? estado.cajaComunMonto.toString() : '');
  };

  const confirmCajaComun = () => {
    if (!cajaComunModal) return;
    const montoNum = parseFloat(cajaComunMonto) || 0;
    // Save caja común data to the estado
    updateEstado(cajaComunModal.estadoId, {
      cajaComunCount: cajaComunCount,
      cajaComunMonto: montoNum,
    });
    setCajaComunModal(null);
    // Proceed to arqueo with the updated estado
    const updatedEstado = { ...cajaComunModal, cajaComunCount: cajaComunCount, cajaComunMonto: montoNum };
    onGoToArqueo(updatedEstado, cajaComunEsUltima);
  };

  // Filtrar frecuencias por origen para reasignación (usa TODAS las frecuencias del sistema)
  const getFrecuenciasParaReasignar = (estadoId: string): FrecuenciaData[] => {
    const estadoActual = estados.find(e => e.estadoId === estadoId);
    if (!estadoActual) return allFrecuencias;
    // Extraer origen de la ruta: "Vilcabamba - Loja" → "Vilcabamba"
    const partes = estadoActual.ruta.split(' - ');
    const origen = partes[0]?.trim().toLowerCase();
    if (!origen) return allFrecuencias;
    // Filtrar frecuencias que tengan el mismo origen y ordenar por hora
    return allFrecuencias
      .filter(f => {
        const fPartes = f.ruta.split(' - ');
        const fOrigen = fPartes[0]?.trim().toLowerCase();
        return fOrigen === origen;
      })
      .sort((a, b) => a.hora.localeCompare(b.hora));
  };

  const handleReassign = async (estado: FrecuenciaEstado) => {
    // Cargar todas las frecuencias del sistema si no están cargadas
    if (allFrecuencias.length === 0) {
      try {
        const res = await fetch('/api/frecuencias?all=true');
        if (res.ok) {
          const data = await res.json();
          setAllFrecuencias(data);
        }
      } catch { /* usar las que tengamos */ }
    }
    setReassigning(estado.estadoId);
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

  const MOTIVOS_NO_REALIZADA = [
    { id: 'daño_unidad', label: 'Daño en la unidad', icon: <Truck className="w-4 h-4" />, color: 'text-red-500' },
    { id: 'mantenimiento', label: 'Mantenimiento', icon: <Wrench className="w-4 h-4" />, color: 'text-blue-500' },
    { id: 'clima', label: 'Clima / Lluvia', icon: <Droplets className="w-4 h-4" />, color: 'text-cyan-500' },
    { id: 'sin_pasajeros', label: 'Sin pasajeros', icon: <UserX className="w-4 h-4" />, color: 'text-purple-500' },
    { id: 'problema_ruta', label: 'Problema en la ruta', icon: <AlertTriangle className="w-4 h-4" />, color: 'text-yellow-500' },
    { id: 'orden_superior', label: 'Orden superior', icon: <Ban className="w-4 h-4" />, color: 'text-gray-600' },
    { id: 'ingreso_especial', label: 'Ingreso especial', icon: <Sparkles className="w-4 h-4" />, color: 'text-amber-500' },
    { id: 'otro', label: 'Otro motivo', icon: <FileText className="w-4 h-4" />, color: 'text-gray-500' },
  ];

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

  // Check if there are unfinished frequencies (for exit guard)
  const hasUnfinishedFrecuencias = estados.some(e => e.estado === 'pendiente' || e.estado === 'abierta');

  const handleBack = () => {
    if (hasUnfinishedFrecuencias) {
      setExitModal(true);
    } else {
      onBack();
    }
  };

  // Check if ALL frequencies are done (cerrada or no_realizada)
  const allFrecuenciasDone = estados.length > 0 && estados.every(e => e.estado === 'cerrada' || e.estado === 'no_realizada');

  // Totals across all frequencies
  const totalVentasAll = estados.reduce((s, e) => s + e.ventasCount, 0);
  const totalRecaudadoAll = estados.reduce((s, e) => s + e.totalRecaudado, 0);
  const cerradasCount = estados.filter(e => e.estado === 'cerrada').length;

  // SYNC control: ALWAYS block arqueo general if there are pending ventas
  const mustSyncBeforeArqueo = pendingCount > 0;

  const handleSyncForArqueo = async () => {
    if (!isOnline || syncingForArqueo) return;
    setSyncingForArqueo(true);
    try {
      const result = await syncVentasSilencioso();
      const remaining = await countVentasPendientes();
      setPendingCount(remaining);
      if (remaining === 0) {
        setSyncDone(true);
        setTimeout(() => setSyncDone(false), 2000);
      }
    } catch { /* ignore */ }
    setSyncingForArqueo(false);
  };

  return (
    <div className="flex flex-col min-h-[100dvh] bg-gray-50">
      {/* Header */}
      <div className="bg-[#912D26] text-white px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <button onClick={handleBack} className="text-red-100"><ArrowLeft className="w-5 h-5" /></button>
            <div>
              <h1 className="text-lg font-bold">Frecuencias</h1>
              <p className="text-red-100 text-xs">{session.nombre} - {session.ayudanteNombre}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isOnline ? <Wifi className="w-4 h-4 text-green-300" /> : <WifiOff className="w-4 h-4 text-red-300" />}
          </div>
        </div>
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

        {/* Modal Exit Warning */}
        {exitModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm p-6 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-[#912D26]" />
              </div>
              <h3 className="text-lg font-bold text-[#3A3A3A] mb-2">Salir del turno?</h3>
              <div className="bg-red-50 rounded-xl p-3 mb-4">
                <p className="text-sm text-[#912D26] font-semibold">
                  Tienes {estados.filter(e => e.estado === 'abierta').length} frecuencia{estados.filter(e => e.estado === 'abierta').length !== 1 ? 's' : ''} abierta{estados.filter(e => e.estado === 'abierta').length !== 1 ? 's' : ''} y {estados.filter(e => e.estado === 'pendiente').length} pendiente{estados.filter(e => e.estado === 'pendiente').length !== 1 ? 's' : ''}
                </p>
              </div>
              <p className="text-sm text-gray-500 mb-5">
                Si sales, el progreso se conservará y podrás continuar cuando vuelvas a ingresar.
              </p>
              <div className="flex gap-2">
                <button onClick={() => setExitModal(false)}
                  className="flex-1 py-3 rounded-xl bg-[#912D26] text-white font-bold text-sm active:scale-[0.98] shadow-lg shadow-red-200">
                  Cancelar
                </button>
                <button onClick={() => { setExitModal(false); onBack(); }}
                  className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-500 font-semibold text-sm active:scale-[0.98]">
                  Salir
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Reassign modal */}
        {reassigning && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
            <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-md p-6 max-h-[80vh] overflow-y-auto">
              <h3 className="text-lg font-bold text-[#3A3A3A] mb-1">Reasignar Horario</h3>
              <p className="text-sm text-gray-500 mb-4">
                Rutas desde <strong className="text-[#912D26]">{estados.find(e => e.estadoId === reassigning)?.ruta.split(' - ')[0]?.trim()}</strong>
              </p>
              <div className="space-y-2">
                {getFrecuenciasParaReasignar(reassigning).map(target => (
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

        {/* Modal No Realizada - Selección de motivo */}
        {noRealizadaModal && !confirmNoRealizada && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
            <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-md p-6 max-h-[85vh] overflow-y-auto">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                  <XCircle className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#3A3A3A]">No Realizada</h3>
                  <p className="text-xs text-gray-500">{noRealizadaModal.hora} — {noRealizadaModal.nombre}</p>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-4">Selecciona el motivo por el cual no se realizó esta frecuencia:</p>
              <div className="space-y-2">
                {MOTIVOS_NO_REALIZADA.map(m => (
                  <button key={m.id} onClick={() => { setMotivoSeleccionado(m.id); if (m.id !== 'otro') setMotivoPersonalizado(''); }}
                    className={`w-full p-3 rounded-xl border-2 text-left flex items-center gap-3 transition-all active:scale-[0.98] ${
                      motivoSeleccionado === m.id ? 'border-orange-400 bg-orange-50' : 'border-gray-200 hover:border-gray-300'
                    }`}>
                    <span className={m.color}>{m.icon}</span>
                    <span className="text-sm font-semibold text-[#3A3A3A]">{m.label}</span>
                    {motivoSeleccionado === m.id && <span className="ml-auto text-orange-500 font-bold">✓</span>}
                  </button>
                ))}
              </div>
              {/* Campo personalizado (Otro) */}
              {motivoSeleccionado === 'otro' && (
                <div className="mt-3">
                  <input type="text" placeholder="Escribe el motivo..." value={motivoPersonalizado}
                    onChange={e => setMotivoPersonalizado(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 text-sm text-[#3A3A3A] focus:outline-none focus:border-orange-400"
                    autoFocus />
                </div>
              )}
              {/* Campos Ingreso Especial */}
              {motivoSeleccionado === 'ingreso_especial' && (
                <div className="mt-3 space-y-3 p-3 bg-amber-50 rounded-xl border border-amber-200">
                  <p className="text-xs text-amber-700 font-semibold">Registra el ingreso de este viaje especial</p>
                  <input type="text" placeholder="Nota (ej: Viaje al Cisne, Contratación...)" value={ingresoEspecialNota}
                    onChange={e => setIngresoEspecialNota(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border-2 border-amber-200 text-sm text-[#3A3A3A] focus:outline-none focus:border-amber-400 bg-white"
                    autoFocus />
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-black text-lg">$</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.05"
                      placeholder="0.00"
                      value={ingresoEspecialMonto}
                      onChange={e => setIngresoEspecialMonto(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-amber-200 text-lg font-black text-[#3A3A3A] text-center focus:outline-none focus:border-amber-400 bg-white"
                    />
                  </div>
                </div>
              )}
              <div className="flex gap-2 mt-5">
                <button onClick={() => setNoRealizadaModal(null)}
                  className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-500 font-semibold active:scale-[0.98]">Cancelar</button>
                <button
                  onClick={() => {
                    const isValid = motivoSeleccionado &&
                      (motivoSeleccionado !== 'otro' || motivoPersonalizado.trim()) &&
                      (motivoSeleccionado !== 'ingreso_especial' || ingresoEspecialNota.trim());
                    if (isValid) {
                      confirmNoRealizadaAction();
                    }
                  }}
                  disabled={
                    !motivoSeleccionado ||
                    (motivoSeleccionado === 'otro' && !motivoPersonalizado.trim()) ||
                    (motivoSeleccionado === 'ingreso_especial' && !ingresoEspecialNota.trim())
                  }
                  className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] ${
                    motivoSeleccionado &&
                    (motivoSeleccionado !== 'otro' || motivoPersonalizado.trim()) &&
                    (motivoSeleccionado !== 'ingreso_especial' || ingresoEspecialNota.trim())
                      ? (motivoSeleccionado === 'ingreso_especial' ? 'bg-amber-500 text-white shadow-lg shadow-amber-200' : 'bg-orange-500 text-white shadow-lg shadow-orange-200')
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}>
                  <XCircle className="w-4 h-4" /> Confirmar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── Modal Caja Común (Oficina Loja) ─── */}
        {cajaComunModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
            <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-md p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#3A3A3A]">Arqueo: {cajaComunModal.hora}</h3>
                  <p className="text-xs text-gray-500">{cajaComunModal.nombre}</p>
                </div>
              </div>

              <p className="text-sm font-bold text-[#3A3A3A] mb-3">Caja Comun (Ofi. Loja)</p>
              <p className="text-xs text-gray-500 mb-3">Boletos fisicos recogidos de oficina Loja</p>

              {/* Contador de pasajeros */}
              <div className="flex items-center gap-3 mb-4">
                <span className="text-sm text-gray-600 font-medium w-24">Pasajeros:</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => setCajaComunCount(Math.max(0, cajaComunCount - 1))}
                    className="w-12 h-12 rounded-xl bg-gray-100 text-gray-600 font-black text-xl flex items-center justify-center active:scale-95 border-2 border-gray-200">-</button>
                  <span className="w-12 text-center font-black text-2xl text-[#3A3A3A]">{cajaComunCount}</span>
                  <button onClick={() => setCajaComunCount(cajaComunCount + 1)}
                    className="w-12 h-12 rounded-xl bg-purple-100 text-purple-700 font-black text-xl flex items-center justify-center active:scale-95 border-2 border-purple-200">+</button>
                </div>
              </div>

              {/* Monto manual */}
              <div className="mb-5">
                <span className="text-sm text-gray-600 font-medium">Total (suma de boletos fisicos):</span>
                <div className="relative mt-1">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-black text-xl">$</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.05"
                    placeholder="0.00"
                    value={cajaComunMonto}
                    onChange={e => setCajaComunMonto(e.target.value)}
                    className="w-full pl-10 pr-4 py-4 rounded-xl border-2 border-gray-200 bg-gray-50 text-xl font-black text-[#3A3A3A] text-center focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-purple-400"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button onClick={() => { setCajaComunModal(null); /* Skip caja comun, go directly to arqueo */ onGoToArqueo(cajaComunModal, cajaComunEsUltima); }}
                  className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-500 font-semibold active:scale-[0.98]">Sin boletos</button>
                <button onClick={confirmCajaComun}
                  className="flex-1 py-3 rounded-xl bg-[#912D26] text-white font-black active:scale-[0.98] shadow-lg shadow-red-200">
                  Continuar
                </button>
              </div>
            </div>
          </div>
        )}

        {estados.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400">No hay frecuencias configuradas</p>
          </div>
        ) : (
          estados.map((estado, index) => {
            const disponible = isFrecuenciaDisponible(index);
            const esUltimaFrec = index === estados.length - 1;
            const bloqueada = !disponible && estado.estado === 'pendiente';
            const rutaColor = RUTA_BUTTON_COLORS[getRutaColorKey(estado.ruta)];

            return (
              <div key={estado.estadoId} className={`rounded-2xl border border-l-4 p-3 transition-all ${
                bloqueada
                  ? 'bg-gray-50 border-gray-100 border-l-gray-300 opacity-50'
                  : estado.estado === 'abierta'
                    ? `${rutaColor.light} ${rutaColor.border}`
                    : `${getStateColor(estado.estado)} ${rutaColor.border}`
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getStateIcon(estado.estado)}
                    <div>
                      <span className="font-bold text-[#3A3A3A]">{estado.hora}</span>
                      <span className="text-sm text-gray-500 ml-2">{estado.nombre}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getEstadoBadge(estado.estado)}
                    {bloqueada && <span className="text-xs text-gray-400">🔒</span>}
                  </div>
                </div>
                <div className="text-xs text-gray-500 mb-1">{estado.ruta} · {estado.direccion}</div>
                {/* Stats bar: boletos + recaudado - visible when has sales or is cerrada */}
                {(estado.ventasCount > 0 || estado.estado === 'cerrada') && (
                  <div className="flex gap-3 mb-2">
                    <div className="flex items-center gap-1 bg-green-50 text-green-700 px-2 py-1 rounded-lg text-xs font-bold">
                      <Ticket className="w-3 h-3" />
                      <span>{estado.ventasCount} boleto{estado.ventasCount !== 1 ? 's' : ''}</span>
                    </div>
                    <div className={`flex items-center gap-1 ${rutaColor.badge} px-2 py-1 rounded-lg text-xs font-bold`}>
                      <DollarSign className="w-3 h-3" />
                      <span>${estado.totalRecaudado.toFixed(2)}</span>
                    </div>
                  </div>
                )}
                <div className="flex gap-2">
                  {/* PENDIENTE + disponible */}
                  {estado.estado === 'pendiente' && disponible && (
                    <>
                      <button onClick={() => handleOpen(estado)} className={`flex-1 py-3.5 rounded-xl ${rutaColor.bg} text-white font-bold text-sm flex items-center justify-center gap-1.5 active:scale-[0.97] shadow-md ${rutaColor.shadow}`}>
                        <Play className="w-4 h-4" /> Vender
                      </button>
                      <button onClick={() => handleNoRealizada(estado)} className="py-3.5 px-4 rounded-xl bg-orange-100 text-orange-600 font-bold text-sm flex items-center gap-1.5 active:scale-[0.97]" title="No Realizada">
                        <XCircle className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleReassign(estado)} className="py-3.5 px-4 rounded-xl bg-gray-200 text-gray-600 font-bold text-sm flex items-center gap-1.5 active:scale-[0.97]" title="Reasignar">
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  {/* ABIERTA: Seguir Vendiendo + Arqueo directo */}
                  {estado.estado === 'abierta' && (
                    <>
                      <button onClick={() => onOpenFrequency(estado)} className={`flex-1 py-2 rounded-xl ${rutaColor.bg} text-white font-semibold text-sm flex items-center justify-center gap-1 active:scale-[0.98]`}>
                        <ChevronRight className="w-4 h-4" /> Seguir Vendiendo
                      </button>
                      <button onClick={() => handleGoToArqueo(estado, esUltimaFrec)} className="flex-1 py-2 rounded-xl bg-blue-600 text-white font-semibold text-sm flex items-center justify-center gap-1 active:scale-[0.98]">
                        <CheckCircle2 className="w-4 h-4" /> Arqueo
                      </button>
                    </>
                  )}
                  {/* CERRADA */}
                  {estado.estado === 'cerrada' && (
                    <div className="flex-1 flex items-center justify-center">
                      <span className="text-xs text-green-600 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> Cerrada
                      </span>
                    </div>
                  )}
                  {/* NO REALIZADA */}
                  {estado.estado === 'no_realizada' && (
                    <div className="flex-1 flex items-center gap-1.5">
                      {estado.ingresoEspecialMonto && estado.ingresoEspecialMonto > 0 ? (
                        <>
                          <Sparkles className="w-4 h-4 text-amber-500" />
                          <span className="text-xs font-bold text-amber-700 truncate">{estado.ingresoEspecialNota || 'Ingreso especial'}</span>
                          <span className="text-xs font-black text-amber-600 ml-auto">${estado.ingresoEspecialMonto.toFixed(2)}</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-4 h-4" />
                          <span className="text-sm text-orange-600 font-semibold">{estado.motivoNoRealizada || 'No realizada'}</span>
                        </>
                      )}
                    </div>
                  )}
                  {/* BLOQUEADA */}
                  {bloqueada && (
                    <div className="text-sm text-gray-400">Espera arqueo anterior</div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ─── Arqueo General del VT ─── */}
      {allFrecuenciasDone && cerradasCount > 0 && (
        <div className="px-4 pb-3">
          <div className="bg-gradient-to-r from-[#912D26] to-[#b33d34] rounded-2xl p-4 shadow-lg shadow-red-200/50">
            <div className="flex items-center gap-2 mb-3">
              <ClipboardCheck className="w-5 h-5 text-white" />
              <h3 className="text-white font-bold text-sm">Todas las frecuencias completadas</h3>
            </div>
            <div className="flex gap-4 mb-3 text-white">
              <div>
                <p className="text-white/60 text-[10px]">Total Boletos</p>
                <p className="font-black text-lg leading-tight">{totalVentasAll}</p>
              </div>
              <div>
                <p className="text-white/60 text-[10px]">Total Recaudado</p>
                <p className="font-black text-lg leading-tight">${totalRecaudadoAll.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-white/60 text-[10px]">Cerradas</p>
                <p className="font-black text-lg leading-tight">{cerradasCount}/{estados.length}</p>
              </div>
            </div>
            {mustSyncBeforeArqueo ? (
              isOnline ? (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-200" />
                    <p className="text-white/90 text-xs font-semibold">Tienes {pendingCount} venta{pendingCount !== 1 ? 's' : ''} sin sincronizar. Debes sincronizar antes del arqueo.</p>
                  </div>
                  {syncDone ? (
                    <div className="w-full py-4 rounded-xl bg-green-500 text-white font-black text-base flex items-center justify-center gap-2 shadow-md">
                      <CheckCircle className="w-5 h-5" />
                      ¡TODO SINCRONIZADO!
                    </div>
                  ) : (
                    <button
                      onClick={handleSyncForArqueo}
                      disabled={syncingForArqueo}
                      className="w-full py-4 rounded-xl bg-white text-[#912D26] font-black text-base flex items-center justify-center gap-2 active:scale-[0.98] shadow-md disabled:opacity-70">
                      {syncingForArqueo ? (
                        <><RefreshCw className="w-5 h-5 animate-spin" /> SINCRONIZANDO {pendingCount} VENTAS...</>
                      ) : (
                        <><Send className="w-5 h-5" /> SINCRONIZAR {pendingCount} VENTAS</>
                      )}
                    </button>
                  )}
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <WifiOff className="w-4 h-4 text-red-200" />
                    <p className="text-white/90 text-xs font-semibold">Tienes {pendingCount} venta{pendingCount !== 1 ? 's' : ''} sin sincronizar.</p>
                  </div>
                  <div className="w-full py-4 rounded-xl bg-white/20 text-white font-black text-base flex items-center justify-center gap-2">
                    <WifiOff className="w-5 h-5" />
                    SIN INTERNET — CONECTA PARA SINCRONIZAR
                  </div>
                </>
              )
            ) : (
              <button
                onClick={onGoToArqueoGeneral}
                className="w-full py-4 rounded-xl bg-white text-[#912D26] font-black text-base flex items-center justify-center gap-2 active:scale-[0.98] shadow-md">
                <ClipboardCheck className="w-5 h-5" />
                ARQUEO GENERAL DEL {session.nombre}
              </button>
            )}
            {mustSyncBeforeArqueo && !isOnline && (
              <p className="text-white/60 text-[10px] text-center mt-2">Conecta a internet y sincroniza todas las ventas antes del arqueo general</p>
            )}
          </div>
        </div>
      )}

      {/* Sync button */}
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
