'use client';

import { useState, useEffect } from 'react';
import { type VTSession } from './types-boletos';
import { Bus, User, ArrowRight, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';

interface Props {
  onSessionStart: (session: VTSession) => void;
}

interface VTOption {
  id: string;
  codigo: string;
  nombre: string;
}

interface AyudanteActivo {
  id: string;
  nombre: string;
  pin: string;
}

export function HomeScreenVT({ onSessionStart }: Props) {
  const [vts, setVts] = useState<VTOption[]>([]);
  const [ayudante, setAyudante] = useState<AyudanteActivo | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedVT, setSelectedVT] = useState<string>('');
  const [existingSession, setExistingSession] = useState<VTSession & { timestamp: number } | null>(null);
  const [existingUnfinished, setExistingUnfinished] = useState(false);
  const [confirmNewSession, setConfirmNewSession] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/bus-vts').then(res => res.json()),
      fetch('/api/personas?rol=AYUDANTE&esActual=true').then(res => res.json()),
    ])
      .then(([vtsData, ayudanteData]) => {
        if (Array.isArray(vtsData)) {
          const mapped = vtsData.map((vt: any) => ({
            id: vt.id,
            codigo: vt.codigo,
            nombre: vt.nombre,
          }));
          setVts(mapped);
          if (mapped.length === 1) {
            setSelectedVT(mapped[0].codigo);
          }
        }
        const activos = Array.isArray(ayudanteData)
          ? ayudanteData.filter((p: any) => p.esActual)
          : [];
        if (activos.length > 0) {
          setAyudante({ id: activos[0].id, nombre: activos[0].nombre, pin: activos[0].pin });
        }
      })
      .catch(err => console.error('Error cargando datos:', err))
      .finally(() => setLoading(false));

    // Check for existing unfinished VT session
    try {
      const stored = localStorage.getItem('rg_vt_session');
      if (stored) {
        const saved: VTSession & { timestamp: number } = JSON.parse(stored);
        if (saved.vtCode && saved.fecha) {
          const estadosKey = `rg_estados_${saved.vtCode}_${saved.fecha}`;
          const estadosRaw = localStorage.getItem(estadosKey);
          if (estadosRaw) {
            const estados: { estado: string }[] = JSON.parse(estadosRaw);
            const hasUnfinished = estados.some(e => e.estado === 'pendiente' || e.estado === 'abierta');
            if (hasUnfinished) {
              setExistingSession(saved);
              setExistingUnfinished(true);
            }
          }
        }
      }
    } catch { /* ignore */ }
  }, []);

  const startSession = (vtCode: string, forceNew = false) => {
    if (!ayudante) return;
    // If there's an existing unfinished session and starting a different/new VT, warn first
    if (existingUnfinished && !forceNew && existingSession) {
      setConfirmNewSession(true);
      return;
    }
    const vt = vts.find(v => v.codigo === vtCode)!;
    const newSession: VTSession = {
      vtCode: vt.codigo,
      nombre: vt.nombre,
      ayudanteId: ayudante.id,
      ayudanteNombre: ayudante.nombre,
      fecha: new Date().toISOString().split('T')[0],
    };
    localStorage.setItem('rg_vt_session', JSON.stringify({
      ...newSession,
      timestamp: Date.now(),
    }));
    setConfirmNewSession(false);
    setExistingUnfinished(false);
    setExistingSession(null);
    onSessionStart(newSession);
  };

  const handleResumeOld = () => {
    if (!existingSession) return;
    const { timestamp, ...sessionData } = existingSession;
    onSessionStart(sessionData);
  };

  const handleForceNew = () => {
    if (!selectedVT) return;
    setConfirmNewSession(false);
    startSession(selectedVT, true);
  };

  const handleStart = () => {
    if (!selectedVT) return;
    startSession(selectedVT);
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-[100dvh] bg-gray-50 items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#912D26] animate-spin" />
        <p className="mt-3 text-[#3A3A3A] text-sm">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[100dvh] bg-gray-50">
      {/* Header compacto */}
      <div className="bg-[#912D26] text-white px-5 py-5 rounded-b-2xl shadow-lg">
        <div className="flex items-center gap-3 mb-1">
          <Bus className="w-7 h-7" />
          <h1 className="text-xl font-bold">RutaGo</h1>
        </div>
        <p className="text-red-100 text-xs">TRANSPORTES VILCABAMBA</p>
      </div>

      <div className="flex-1 px-5 py-5 space-y-4">
        {/* Ayudante activo — compacto */}
        {ayudante ? (
          <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
            <div>
              <p className="font-semibold text-green-800 text-sm">{ayudante.nombre}</p>
              <p className="text-green-600 text-[10px]">Turno activo</p>
            </div>
          </div>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3">
            <p className="text-yellow-700 text-sm">No hay ayudante activo asignado</p>
            <p className="text-yellow-600 text-xs mt-1">Configure un ayudante desde el panel de administracion</p>
          </div>
        )}

        {/* Selector de VT — grid grande */}
        {vts.length === 0 ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-5 text-center">
            <p className="text-yellow-700 font-medium">No hay unidades activas</p>
            <p className="text-yellow-600 text-sm mt-1">Ejecuta el seed: POST /api/seed-vts</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <h2 className="text-base font-bold text-[#3A3A3A] mb-3 flex items-center gap-2">
              <Bus className="w-4 h-4 text-[#912D26]" /> Unidad
            </h2>
            <div className={`grid gap-3 ${vts.length <= 2 ? 'grid-cols-2' : vts.length <= 4 ? 'grid-cols-2' : 'grid-cols-3'}`}>
              {vts.map(vt => (
                <button key={vt.codigo}
                  onClick={() => vts.length === 1 ? startSession(vt.codigo) : setSelectedVT(vt.codigo)}
                  className={`py-5 px-3 rounded-xl text-center transition-all active:scale-95 ${
                    selectedVT === vt.codigo
                      ? 'bg-[#912D26] text-white shadow-md ring-2 ring-red-400'
                      : 'bg-gray-100 text-[#3A3A3A] hover:bg-gray-200 active:bg-gray-300'
                  }`}
                >
                  <div className="text-base font-bold">{vt.codigo}</div>
                  <div className="text-[10px] mt-0.5 opacity-70">{vt.nombre}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Boton Iniciar — grande y prominente */}
        <button onClick={handleStart} disabled={!selectedVT || !ayudante}
          className={`w-full py-5 rounded-2xl font-black text-xl flex items-center justify-center gap-3 transition-all ${
            selectedVT && ayudante
              ? 'bg-[#912D26] text-white shadow-xl shadow-red-300 active:scale-[0.97]'
              : 'bg-[#D6D6D6] text-gray-400 cursor-not-allowed'
          }`}
        >
          Iniciar Turno <ArrowRight className="w-6 h-6" />
        </button>
      </div>

      {/* Existing unfinished session banner */}
      {existingUnfinished && existingSession && (
        <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-orange-500 to-red-500 p-4 shadow-2xl z-40">
          <div className="max-w-lg mx-auto">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-white" />
              <p className="text-white font-bold text-sm">Turno sin terminar</p>
            </div>
            <p className="text-white/90 text-xs mb-3">
              Tienes un turno pendiente en <strong>{existingSession.nombre}</strong> ({existingSession.vtCode}) con frecuencias abiertas.
            </p>
            <div className="flex gap-2">
              <button onClick={handleResumeOld}
                className="flex-1 py-2.5 rounded-xl bg-white text-orange-600 font-bold text-sm active:scale-[0.98]">
                Continuar VT {existingSession.vtCode}
              </button>
              <button onClick={() => setConfirmNewSession(true)}
                className="flex-1 py-2.5 rounded-xl bg-white/20 text-white font-semibold text-sm active:scale-[0.98]">
                Iniciar nuevo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm new session modal */}
      {confirmNewSession && existingSession && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-[#912D26]" />
            </div>
            <h3 className="text-lg font-bold text-[#3A3A3A] mb-2">Abandonar turno anterior?</h3>
            <div className="bg-red-50 rounded-xl p-3 mb-4">
              <p className="text-sm text-[#912D26] font-semibold">
                El turno de {existingSession.nombre} ({existingSession.vtCode}) tiene frecuencias pendientes/abiertas que no se han completado.
              </p>
            </div>
            <p className="text-sm text-gray-500 mb-5">
              Los datos del turno anterior se conservaran en el dispositivo. Podras retomarlo mas tarde desde la pantalla de inicio.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmNewSession(false)}
                className="flex-1 py-3 rounded-xl bg-[#912D26] text-white font-bold text-sm active:scale-[0.98] shadow-lg shadow-red-200">
                Cancelar
              </button>
              <button onClick={handleForceNew}
                className="flex-1 py-3 rounded-xl border-2 border-red-200 text-[#912D26] font-bold text-sm active:scale-[0.98]">
                Nuevo Turno
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
