'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { type VTSession } from './types-boletos';
import type { UserSession } from './types';
import { countVentasPendientes, syncVentasSilencioso, deleteVentasByVT, countVentasPendientesByVT } from '@/lib/indexeddb';
import { Bus, User, UserCheck, UserPlus, ArrowRight, ArrowLeft, Loader2, CheckCircle, AlertTriangle, Printer, RefreshCw, Wifi, WifiOff, CalendarDays, Clock, Moon } from 'lucide-react';
import { BusSelector } from './BusSelector';
import { getActiveBus } from '@/lib/fleet-storage';

// Version build — se actualiza con cada deploy
const APP_VERSION = 'v3.60.30';

interface Props {
  currentUser?: UserSession;
  onSessionStart: (session: VTSession) => void;
  onBack?: () => void;
}

interface VTOption {
  id: string;
  codigo: string;
  nombre: string;
  frecuencias?: { routeFrom: string; routeTo: string; time: string }[];
}

type VTRouteType = 'vilcabamba' | 'el_tambo' | 'la_elvira' | 'yangana' | 'zahuayco';

const ROUTE_STYLES: Record<VTRouteType, {
  bg: string; border: string; text: string; subtext: string;
  selectedBg: string; selectedRing: string;
  label: string; badgeBg: string; badgeText: string;
}> = {
  vilcabamba: {
    bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-800', subtext: 'text-slate-500',
    selectedBg: 'bg-[#053225]', selectedRing: 'ring-emerald-400',
    label: '', badgeBg: '', badgeText: '',
  },
  el_tambo: {
    bg: 'bg-amber-50/70', border: 'border-amber-300', text: 'text-amber-950', subtext: 'text-amber-600',
    selectedBg: 'bg-[#053225]', selectedRing: 'ring-amber-400',
    label: 'El Tambo', badgeBg: 'bg-amber-100 text-amber-900 border border-amber-300', badgeText: 'text-amber-900',
  },
  la_elvira: {
    bg: 'bg-violet-50/70', border: 'border-violet-300', text: 'text-violet-950', subtext: 'text-violet-600',
    selectedBg: 'bg-[#053225]', selectedRing: 'ring-violet-400',
    label: 'La Elvira', badgeBg: 'bg-violet-100 text-violet-900 border border-violet-300', badgeText: 'text-violet-900',
  },
  yangana: {
    bg: 'bg-emerald-50/70', border: 'border-emerald-300', text: 'text-emerald-950', subtext: 'text-emerald-600',
    selectedBg: 'bg-[#053225]', selectedRing: 'ring-emerald-400',
    label: 'Yangana', badgeBg: 'bg-emerald-100 text-emerald-900 border border-emerald-300', badgeText: 'text-emerald-900',
  },
  zahuayco: {
    bg: 'bg-sky-50/70', border: 'border-sky-300', text: 'text-sky-950', subtext: 'text-sky-600',
    selectedBg: 'bg-[#053225]', selectedRing: 'ring-sky-400',
    label: 'Zahuayco', badgeBg: 'bg-sky-100 text-sky-900 border border-sky-300', badgeText: 'text-sky-900',
  },
};

function isOvernightVT(frecuencias?: { time?: string }[]): boolean {
  if (!frecuencias || frecuencias.length <= 1) return false;
  for (let i = 1; i < frecuencias.length; i++) {
    const prevTime = frecuencias[i - 1].time || '';
    const currTime = frecuencias[i].time || '';
    if (prevTime && currTime && currTime < prevTime) {
      return true;
    }
  }
  return false;
}

function getVTRouteType(frecuencias?: { routeFrom: string; routeTo: string }[]): VTRouteType {
  if (!frecuencias || frecuencias.length === 0) return 'vilcabamba';
  const allDests = [...frecuencias.map(f => f.routeTo), ...frecuencias.map(f => f.routeFrom)];
  if (allDests.some(d => d === 'El Tambo')) return 'el_tambo';
  if (allDests.some(d => d === 'La Elvira')) return 'la_elvira';
  if (allDests.some(d => d === 'Yangana')) return 'yangana';
  if (allDests.some(d => d === 'Zahuayco')) return 'zahuayco';
  return 'vilcabamba';
}

interface AyudanteActivo {
  id: string;
  nombre: string;
  pin: string;
}

export function HomeScreenVT({ currentUser, onSessionStart, onBack }: Props) {
  const [vts, setVts] = useState<VTOption[]>([]);
  const [ayudante, setAyudante] = useState<AyudanteActivo | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedVT, setSelectedVT] = useState<string>('');
  const [selectedFilter, setSelectedFilter] = useState<'todos' | 'vilcabamba' | 'el_tambo' | 'yangana' | 'la_elvira' | 'zahuayco'>('todos');
  const [existingSession, setExistingSession] = useState<VTSession & { timestamp: number } | null>(null);
  const [existingUnfinished, setExistingUnfinished] = useState(false);
  const [confirmNewSession, setConfirmNewSession] = useState(false);



  // Printer state
  const [printerStatus, setPrinterStatus] = useState<'unknown' | 'connecting' | 'connected' | 'error' | 'unavailable'>('unknown');
  const [printerName, setPrinterName] = useState<string>('');
  const [printing, setPrinting] = useState(false);
  const [printerLog, setPrinterLog] = useState<string[]>([]);
  const [showLog, setShowLog] = useState(false);
  const printerDeviceRef = useRef<BluetoothDevice | null>(null);

  const pLog = (msg: string) => {
    const t = new Date().toLocaleTimeString();
    setPrinterLog(prev => [...prev, `${t} ${msg}`]);
    console.log('[Printer]', msg);
  };

  // ─── Fechas de la Jornada Laboral ───
  const todayStr = new Date().toISOString().split('T')[0];
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayStr = yesterdayDate.toISOString().split('T')[0];

  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [dateWarning, setDateWarning] = useState('');
  const [checkingDate, setCheckingDate] = useState(false);
  const [showCustomDate, setShowCustomDate] = useState(false);

  // ─── Responsable de Cobro (Titular vs Reemplazo) ───
  const [esReemplazo, setEsReemplazo] = useState(false);
  const [nombreReemplazo, setNombreReemplazo] = useState("");
  const [historialReemplazos, setHistorialReemplazos] = useState<string[]>([]);
  const [reemplazoError, setReemplazoError] = useState("");

  // ─── Bloqueo por ventas pendientes de VTs anteriores ───
  const [pendingVentasCount, setPendingVentasCount] = useState(0);
  const [syncingPending, setSyncingPending] = useState(false);
  const [pendingCheckDone, setPendingCheckDone] = useState(false);

  // ─── Control de Autorización y Concurrencia de Ayudante ───
  const isAuthorized = currentUser
    ? (currentUser.rol === 'AYUDANTE' && !!ayudante && currentUser.id === ayudante.id)
    : !!ayudante;

  useEffect(() => {
    Promise.all([
      fetch('/api/bus-vts').then(res => res.json()),
      fetch('/api/personas').then(res => res.json()),
    ])
      .then(([vtsData, personasData]) => {
        if (Array.isArray(vtsData)) {
          const mapped = vtsData.map((vt: any) => ({
            id: vt.id,
            codigo: vt.codigo,
            nombre: vt.nombre,
            frecuencias: vt.frecuencias || [],
          }));
          setVts(mapped);
          if (mapped.length > 0) {
            setSelectedVT(mapped[0].codigo);
          }
        }

        const activeAyud = Array.isArray(personasData)
          ? personasData.find((p: any) => p.rol === 'AYUDANTE' && p.esActual)
          : null;
        if (activeAyud) {
          setAyudante({ id: activeAyud.id, nombre: activeAyud.nombre, pin: activeAyud.pin });
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
            if (estados.length > 0) {
              setExistingSession(saved);
              setExistingUnfinished(true);
              if (saved.esReemplazo && saved.nombreReemplazo) {
                setEsReemplazo(true);
                setNombreReemplazo(saved.nombreReemplazo);
              }
            }
          }
        }
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('rg_historial_reemplazos');
      if (stored) {
        const list = JSON.parse(stored);
        if (Array.isArray(list)) setHistorialReemplazos(list.slice(0, 5));
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const count = await countVentasPendientes();
        setPendingVentasCount(count);
      } catch { /* ignore */ }
      setPendingCheckDone(true);
    })();
  }, []);

  const handleForceSync = async () => {
    if (!navigator.onLine) return;
    setSyncingPending(true);
    try {
      await syncVentasSilencioso();
      const remaining = await countVentasPendientes();
      setPendingVentasCount(remaining);
    } catch { /* ignore */ }
    setSyncingPending(false);
  };

  const handleSelectDate = (dateVal: string) => {
    setSelectedDate(dateVal);
    setDateWarning('');

    if (dateVal && selectedVT) {
      setCheckingDate(true);
      const estadosKey = `rg_estados_${selectedVT}_${dateVal}`;
      const raw = localStorage.getItem(estadosKey);
      if (raw) {
        try {
          const estados: { estado: string; ventasCount?: number }[] = JSON.parse(raw);
          const hasData = estados.some(e => e.estado !== 'pendiente' || (e.ventasCount || 0) > 0);
          if (hasData) {
            setDateWarning(`Ya existen datos para ${selectedVT} en esta fecha. Se reiniciarán al iniciar turno.`);
          }
        } catch { /* ignore */ }
      }
      countVentasPendientesByVT(selectedVT, dateVal).then(count => {
        if (count > 0) {
          setDateWarning(prev => prev
            ? `${prev} (${count} ventas pendientes)`
            : `Hay ${count} ventas sin sincronizar para esta fecha.`
          );
        }
        setCheckingDate(false);
      }).catch(() => setCheckingDate(false));
    }
  };

  const startSession = (vtCode: string, forceNew = false) => {
    if (!ayudante || !isAuthorized) return;
    const sessionDate = selectedDate;

    // ─── REGLA: Solo 1 VT activa por fecha ───
    const stored = localStorage.getItem('rg_vt_session');
    if (stored && !forceNew) {
      try {
        const saved = JSON.parse(stored);
        if (saved.fecha === sessionDate && saved.vtCode !== vtCode) {
          setExistingSession(saved);
          setExistingUnfinished(true);
          setConfirmNewSession(true);
          return;
        }
      } catch { /* ignore */ }
    }

    if (existingUnfinished && !forceNew && existingSession) {
      setConfirmNewSession(true);
      return;
    }

    if (esReemplazo && !nombreReemplazo.trim()) {
      setReemplazoError("Ingresa el nombre de la persona que cobró");
      return;
    }
    setReemplazoError("");

    const vt = vts.find(v => v.codigo === vtCode)!;
    const effectiveAyudanteId = esReemplazo ? `reemplazo-${Date.now()}` : (currentUser?.id || ayudante?.id || "ayudante-01");
    let effectiveAyudanteNombre = currentUser?.nombre || ayudante?.nombre || "Ayudante Titular";
    
    const cleanReemplazo = nombreReemplazo.trim();
    if (esReemplazo && cleanReemplazo) {
      effectiveAyudanteNombre = `${cleanReemplazo} (Reemplazo)`;
      try {
        const updatedList = Array.from(new Set([cleanReemplazo, ...historialReemplazos])).slice(0, 5);
        setHistorialReemplazos(updatedList);
        localStorage.setItem("rg_historial_reemplazos", JSON.stringify(updatedList));
      } catch {
        // ignore
      }
    }

    const currentActiveBus = getActiveBus();

    const newSession: VTSession = {
      vtCode: vt.codigo,
      nombre: vt.nombre,
      ayudanteId: effectiveAyudanteId,
      ayudanteNombre: effectiveAyudanteNombre,
      fecha: sessionDate,
      busId: currentActiveBus.id,
      numeroDisco: currentActiveBus.numeroDisco,
      placaBus: currentActiveBus.placa,
      esReemplazo: esReemplazo && Boolean(cleanReemplazo),
      nombreReemplazo: esReemplazo && cleanReemplazo ? cleanReemplazo : undefined,
    };

    // ─── Limpieza completa al forzar nuevo VT ───
    if (forceNew && existingSession) {
      const oldFecha = existingSession.fecha;
      const oldVtCode = existingSession.vtCode;
      localStorage.removeItem(`rg_estados_${oldVtCode}_${oldFecha}`);
      localStorage.removeItem(`arqueo_general_${oldVtCode}_${oldFecha}`);
      localStorage.removeItem('rg_vt_session');
      localStorage.removeItem('rg_active_view');
      localStorage.removeItem('rg_active_estado_id');
      localStorage.removeItem('rg_active_es_ultima');
      deleteVentasByVT(oldVtCode, oldFecha).catch(() => {});
    }

    localStorage.removeItem(`rg_estados_${vtCode}_${sessionDate}`);
    localStorage.removeItem(`arqueo_general_${vtCode}_${sessionDate}`);
    localStorage.setItem('rg_vt_session', JSON.stringify({
      ...newSession,
      timestamp: Date.now(),
    }));
    localStorage.setItem('rg_active_view', 'boletos_frecuencias');
    localStorage.removeItem('rg_active_estado_id');
    localStorage.removeItem('rg_active_es_ultima');

    setConfirmNewSession(false);
    setExistingUnfinished(false);
    setExistingSession(null);
    onSessionStart(newSession);
  };

  const handleResumeOld = () => {
    if (!existingSession) return;
    const { timestamp, ...sessionData } = existingSession;
    localStorage.setItem('rg_active_view', 'boletos_frecuencias');
    localStorage.removeItem('rg_active_estado_id');
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

  // ─── Printer connection ───
  const checkPrinterStatus = useCallback(async () => {
    try {
      const { isBluetoothAvailable, autoConnectPrinter } = await import('@/lib/printer');
      if (!isBluetoothAvailable()) {
        setPrinterStatus('unavailable');
        return;
      }
      const device = await autoConnectPrinter();
      if (device) {
        setPrinterName(device.name || 'Impresora');
        setPrinterStatus('connected');
      } else {
        setPrinterStatus('unknown');
      }
    } catch {
      setPrinterStatus('error');
    }
  }, []);

  useEffect(() => { checkPrinterStatus(); }, [checkPrinterStatus]);

  const [printerError, setPrinterError] = useState('');
  const handleConnectPrinter = async () => {
    setPrinterStatus('connecting');
    setPrinterError('');
    try {
      const { isBluetoothAvailable, requestPrinter, setCachedDevice } = await import('@/lib/printer');
      if (!isBluetoothAvailable()) {
        setPrinterStatus('unavailable');
        setPrinterError('Bluetooth no disponible en este navegador');
        return;
      }
      const device = await requestPrinter();
      if (device) {
        setCachedDevice(device);
        printerDeviceRef.current = device;
        setPrinterName(device.name || 'Impresora');
        setPrinterStatus('connected');
        pLog(`Guardada referencia directa: ${device.name}`);
      } else {
        setPrinterStatus('error');
        setPrinterError('No se seleccionó ninguna impresora');
      }
    } catch (e) {
      setPrinterStatus('error');
      setPrinterError((e as Error).message || 'Error al conectar');
    }
  };

  const handleTestPrint = async () => {
    setPrinting(true);
    setPrinterLog([]);
    pLog('Iniciando prueba de impresión...');
    try {
      const { isBluetoothAvailable, getPrinterDevice } = await import('@/lib/printer');
      const { generateTicketBytes } = await import('@/lib/ticket-escpos');
      if (!isBluetoothAvailable()) {
        pLog('ERROR: Web Bluetooth no disponible');
        setPrinterStatus('unavailable'); setPrinting(false); return;
      }
      const device = printerDeviceRef.current || await getPrinterDevice();
      if (!device) {
        pLog('ERROR: No hay impresora guardada.');
        setPrinterStatus('error'); setPrinting(false); return;
      }
      pLog(`Device: ${device.name || 'sin nombre'}`);
      if (!device.gatt) {
        setPrinterStatus('error'); setPrinting(false); return;
      }
      const gatt = device.gatt.connected ? device.gatt : await device.gatt.connect();
      const uuids = ['0000ff00-0000-1000-8000-00805f9b34fb','0000ff01-0000-1000-8000-00805f9b34fb','e7810a71-73ae-499d-8c15-faa9aef0c3f2','00001101-0000-1000-8000-00805f9b34fb'];
      let writableChar: BluetoothRemoteGATTCharacteristic | null = null;
      for (const uuid of uuids) {
        try {
          const svc = await gatt.getPrimaryService(uuid);
          const chars = await svc.getCharacteristics();
          for (const c of chars) {
            if (c.properties.write || c.properties.writeWithoutResponse) {
              writableChar = c;
              break;
            }
          }
          if (writableChar) break;
        } catch { /* next */ }
      }
      if (!writableChar) {
        setPrinterStatus('error'); setPrinting(false); return;
      }
      const bytes = generateTicketBytes({
        ruta: 'Test Loja-Vilcabamba', horaFrecuencia: '12:00', fecha: '14/08/26',
        hora: new Date().toTimeString().slice(0, 5), ayudanteNombre: 'Test',
        destino: 'Prueba OK', tipoPasajero: 'Entero', tarifa: 0.00, boletoNum: 1,
        esViajeGratis: false, textoPublicidad: 'RutaGo Oficial',
      });
      if (writableChar.properties.writeWithoutResponse) {
        await writableChar.writeValueWithoutResponse(bytes.buffer);
      } else {
        await writableChar.writeValue(bytes.buffer);
      }
      await gatt.disconnect();
      pLog('Prueba completada!');
      setPrinterStatus('connected');
    } catch (e) {
      pLog(`ERROR: ${(e as Error).message}`);
      setPrinterStatus('error');
    }
    setPrinting(false);
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-[100dvh] bg-slate-50 items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#053225] animate-spin" />
        <p className="mt-3 text-slate-700 text-sm font-semibold">Cargando grupos de turno...</p>
      </div>
    );
  }

  // Filtrado de VTs por pestaña de destino
  const filteredVts = vts.filter(vt => {
    if (selectedFilter === 'todos') return true;
    const rType = getVTRouteType(vt.frecuencias);
    return rType === selectedFilter;
  });

  return (
    <div className="flex flex-col min-h-[100dvh] bg-slate-100">
      {/* ─── Cabecera Institucional Verde Bosque (#053225) ─── */}
      <div className="bg-[#053225] text-white px-5 py-5 rounded-b-3xl shadow-xl border-b border-emerald-900/60 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-44 h-44 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center justify-between mb-2 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-emerald-300">
              <Bus className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black tracking-tight leading-tight">RutaGo</h1>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {APP_VERSION}
                </span>
              </div>
              <p className="text-emerald-200/70 text-xs font-medium">Configuración de Jornada Laboral</p>
            </div>
          </div>

          <div className="flex items-center gap-2 relative z-10">
            <BusSelector compact />
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1 active:scale-95 transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Inicio</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 sm:px-5 py-4 space-y-4 max-w-lg mx-auto w-full pb-32">
        {/* ─── 1. Estado de Tripulación y Autorización ─── */}
        {ayudante ? (
          <div className={`flex items-center justify-between rounded-2xl px-4 py-3 border shadow-xs ${
            isAuthorized ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950' : 'bg-rose-50 border-rose-200 text-rose-950'
          }`}>
            <div className="flex items-center gap-3 truncate">
              {isAuthorized ? (
                <CheckCircle className="w-5 h-5 text-emerald-700 shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
              )}
              <div className="truncate">
                <p className="font-bold text-xs sm:text-sm truncate">
                  {ayudante.nombre}
                </p>
                <p className="text-[10px] text-slate-500">
                  {isAuthorized ? 'Ayudante oficial en caja autorizado para hoy' : 'Turno activo no corresponde a tu usuario'}
                </p>
              </div>
            </div>
            <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider shrink-0 ${
              isAuthorized ? 'bg-emerald-200 text-emerald-900' : 'bg-rose-200 text-rose-900'
            }`}>
              {isAuthorized ? 'Autorizado' : 'Bloqueado'}
            </span>
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 text-amber-950">
            <p className="text-sm font-bold">Sin ayudante asignado para hoy</p>
            <p className="text-xs text-amber-800 mt-0.5">El Administrador debe asignar un ayudante activo en Personal.</p>
          </div>
        )}

        {/* ─── 2. Selector del Día de la Jornada Laboral (Ergonomía de 3 Chips) ─── */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-sm border border-slate-200/90">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-2 uppercase tracking-wide">
                <CalendarDays className="w-4 h-4 text-emerald-800" />
                <span>Día de la Jornada Laboral</span>
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Define la fecha contable del cuaderno de turno
              </p>
            </div>
            {selectedDate !== todayStr && (
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                Regularización
              </span>
            )}
          </div>

          {/* Botonera de Selección Rápida en 1 Toque */}
          <div className="grid grid-cols-3 gap-2">
            {/* HOY */}
            <button
              type="button"
              onClick={() => {
                setShowCustomDate(false);
                handleSelectDate(todayStr);
              }}
              className={`py-2.5 px-2 rounded-2xl text-center font-black text-xs transition border flex flex-col items-center justify-center gap-0.5 ${
                selectedDate === todayStr && !showCustomDate
                  ? 'bg-[#053225] text-white border-emerald-900 shadow-md ring-2 ring-emerald-400'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <span>HOY</span>
              <span className={`text-[9px] font-medium ${selectedDate === todayStr && !showCustomDate ? 'text-emerald-200' : 'text-slate-400'}`}>
                {todayStr}
              </span>
            </button>

            {/* AYER */}
            <button
              type="button"
              onClick={() => {
                setShowCustomDate(false);
                handleSelectDate(yesterdayStr);
              }}
              className={`py-2.5 px-2 rounded-2xl text-center font-black text-xs transition border flex flex-col items-center justify-center gap-0.5 ${
                selectedDate === yesterdayStr && !showCustomDate
                  ? 'bg-[#053225] text-white border-emerald-900 shadow-md ring-2 ring-emerald-400'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <span>AYER</span>
              <span className={`text-[9px] font-medium ${selectedDate === yesterdayStr && !showCustomDate ? 'text-emerald-200' : 'text-slate-400'}`}>
                {yesterdayStr}
              </span>
            </button>

            {/* OTRA FECHA */}
            <button
              type="button"
              onClick={() => setShowCustomDate(prev => !prev)}
              className={`py-2.5 px-2 rounded-2xl text-center font-black text-xs transition border flex flex-col items-center justify-center gap-0.5 ${
                showCustomDate || (selectedDate !== todayStr && selectedDate !== yesterdayStr)
                  ? 'bg-[#053225] text-white border-emerald-900 shadow-md ring-2 ring-emerald-400'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <span>OTRA FECHA</span>
              <span className={`text-[9px] font-medium ${showCustomDate || (selectedDate !== todayStr && selectedDate !== yesterdayStr) ? 'text-emerald-200' : 'text-slate-400'}`}>
                Calendario
              </span>
            </button>
          </div>

          {/* Input de Fecha Nativo si eligió Otra Fecha */}
          {(showCustomDate || (selectedDate !== todayStr && selectedDate !== yesterdayStr)) && (
            <div className="mt-3 pt-3 border-t border-slate-100">
              <label className="text-[11px] font-bold text-slate-600 block mb-1">
                Selecciona fecha personalizada:
              </label>
              <input
                type="date"
                value={selectedDate}
                max={todayStr}
                onChange={(e) => handleSelectDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-200 text-slate-800 font-bold text-sm focus:border-emerald-600 focus:outline-none"
              />
            </div>
          )}

          {/* Advertencias Dinámicas de Integridad */}
          {dateWarning && (
            <div className="mt-3 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-amber-800 text-xs font-semibold">{dateWarning}</p>
            </div>
          )}

          {checkingDate && (
            <div className="mt-2 flex items-center gap-1.5 text-slate-400 text-xs font-medium">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-700" /> Verificando datos contables...
            </div>
          )}

          {/* ─── Responsable de Cobro en Ruta (Titular vs Reemplazo) ─── */}
          <div className="mt-3.5 pt-3.5 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-emerald-800" />
                <span>Responsable de Cobro (Caja)</span>
              </label>
              {esReemplazo ? (
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                  Cobro por Reemplazo
                </span>
              ) : (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Titular en Ruta
                </span>
              )}
            </div>

            {/* Selector Titular vs Reemplazo */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setEsReemplazo(false);
                  setReemplazoError("");
                }}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border active:scale-95 ${
                  !esReemplazo
                    ? "bg-[#053225] text-white border-emerald-900 shadow-xs ring-1 ring-emerald-500"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span className="truncate">{currentUser?.nombre || ayudante?.nombre || "Titular"}</span>
              </button>

              <button
                type="button"
                onClick={() => setEsReemplazo(true)}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border active:scale-95 ${
                  esReemplazo
                    ? "bg-amber-600 text-white border-amber-700 shadow-xs ring-1 ring-amber-400"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Reemplazo</span>
              </button>
            </div>

            {/* Despliegue cuando cobró un reemplazo */}
            {esReemplazo && (
              <div className="mt-2.5 p-3 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-2">
                <label className="text-[11px] font-black text-amber-900 block">
                  Nombre de quien cobró ese día:
                </label>
                <input
                  type="text"
                  value={nombreReemplazo}
                  onChange={(e) => {
                    setNombreReemplazo(e.target.value);
                    if (e.target.value.trim()) setReemplazoError("");
                  }}
                  placeholder="Ej: Carlitos, Luis Mendoza, Don Pedro..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-amber-300 text-slate-900 font-bold text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 placeholder:text-slate-400"
                />

                {reemplazoError && (
                  <p className="text-[11px] text-red-600 font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-red-500 shrink-0" />
                    {reemplazoError}
                  </p>
                )}

                {/* Sugerencias de Memoria Rápida */}
                {historialReemplazos.length > 0 && (
                  <div>
                    <span className="text-[10px] text-amber-800 font-semibold block mb-1">
                      Frecuentes (toca para autocompletar):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {historialReemplazos.map((nombre, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setNombreReemplazo(nombre);
                            setReemplazoError("");
                          }}
                          className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition active:scale-95 ${
                            nombreReemplazo.trim() === nombre
                              ? "bg-amber-700 text-white shadow-xs"
                              : "bg-white text-amber-900 border border-amber-200 hover:bg-amber-100"
                          }`}
                        >
                          {nombre}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <p className="text-[10px] text-amber-800/80 leading-tight">
                  💡 Este nombre figurará en los arqueos, comprobantes y reportes de producción del bus.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ─── 2. Selector de Grupo de Turno (VT) ─── */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-sm border border-slate-200/90">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-2 uppercase tracking-wide">
                <Clock className="w-4 h-4 text-emerald-800" />
                <span>Grupo de Vuelta de Turno (VT)</span>
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Selecciona el rol asignado a la unidad para hoy
              </p>
            </div>
            {selectedVT && (
              <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-[#053225] text-white">
                {selectedVT} ACTIVO
              </span>
            )}
          </div>

          {/* Filtro Rápido por Pestañas de Destino */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-3 scrollbar-none">
            {[
              { id: 'todos', label: 'Todos' },
              { id: 'vilcabamba', label: 'Vilcabamba' },
              { id: 'el_tambo', label: 'El Tambo' },
              { id: 'yangana', label: 'Yangana' },
              { id: 'la_elvira', label: 'La Elvira' },
              { id: 'zahuayco', label: 'Zahuayco' },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition ${
                  selectedFilter === tab.id
                    ? 'bg-[#053225] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Grid de Tarjetas Tácticas de 3 Niveles */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {filteredVts.map(vt => {
              const routeType = getVTRouteType(vt.frecuencias);
              const style = ROUTE_STYLES[routeType];
              const isSelected = selectedVT === vt.codigo;
              const overnight = isOvernightVT(vt.frecuencias);
              const firstTime = vt.frecuencias && vt.frecuencias.length > 0 ? vt.frecuencias[0].time : '--:--';

              return (
                <button
                  key={vt.codigo}
                  type="button"
                  onClick={() => setSelectedVT(vt.codigo)}
                  className={`p-3 rounded-2xl text-left transition-all active:scale-[0.98] border flex flex-col justify-between min-h-[110px] ${
                    isSelected
                      ? 'bg-[#053225] text-white shadow-lg ring-2 ring-emerald-400 border-emerald-900'
                      : `${style.bg} ${style.border} hover:bg-slate-100/90`
                  }`}
                >
                  {/* Nivel 1: Código + Badge de Destino */}
                  <div className="flex items-start justify-between gap-1">
                    <span className={`text-base font-black tracking-tight ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                      {vt.codigo}
                    </span>
                    {style.label ? (
                      <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md ${
                        isSelected ? 'bg-white/20 text-emerald-200' : `${style.badgeBg} ${style.badgeText}`
                      }`}>
                        {style.label}
                      </span>
                    ) : null}
                  </div>

                  {/* Nivel 2 (PROTAGONISTA): Hora de la Primera Salida */}
                  <div className="my-1">
                    <div className="flex items-center gap-1">
                      <Clock className={`w-3.5 h-3.5 ${isSelected ? 'text-emerald-300' : 'text-slate-500'}`} />
                      <span className={`text-base font-black tracking-tight ${isSelected ? 'text-emerald-300' : 'text-slate-900'}`}>
                        {firstTime}
                      </span>
                    </div>
                    <span className={`text-[9px] font-medium block leading-tight ${isSelected ? 'text-white/70' : 'text-slate-500'}`}>
                      Primera salida
                    </span>
                  </div>

                  {/* Nivel 3: Total Vueltas + Excepción Pernocta */}
                  <div className="flex items-center justify-between pt-1 border-t border-black/5 text-[10px]">
                    <span className={isSelected ? 'text-white/80' : 'text-slate-500 font-semibold'}>
                      {vt.frecuencias?.length || 0} vueltas
                    </span>
                    {overnight && (
                      <span className={`text-[8px] font-black px-1.5 py-0.2 rounded-full flex items-center gap-0.5 ${
                        isSelected ? 'bg-amber-400 text-amber-950' : 'bg-amber-100 text-amber-900'
                      }`}>
                        <Moon className="w-2.5 h-2.5" />
                        Pernocta
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ─── 5. Estado de Impresora Bluetooth ─── */}
        <div className="bg-white rounded-3xl p-4 shadow-sm border border-slate-200/90">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 truncate">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                printerStatus === 'connected' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
              }`}>
                <Printer className="w-4 h-4" />
              </div>
              <div className="truncate">
                <p className="text-xs font-bold text-slate-800 truncate">
                  {printerStatus === 'connected' ? (printerName || 'Impresora Bluetooth') : 'Impresora Térmica'}
                </p>
                <p className="text-[10px] text-slate-500">
                  {printerStatus === 'connected' ? 'Lista para emitir tickets' : 'Requerida para comprobantes físicos'}
                </p>
              </div>
            </div>

            {printerStatus === 'connected' ? (
              <button
                type="button"
                onClick={handleTestPrint}
                disabled={printing}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-bold text-xs active:scale-95 transition disabled:opacity-50"
              >
                {printing ? 'Imprimiendo...' : 'Probar'}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleConnectPrinter}
                className="px-3 py-1.5 rounded-xl bg-[#053225] text-white font-bold text-xs active:scale-95 transition"
              >
                Conectar
              </button>
            )}
          </div>
        </div>

        {/* ─── 6. Botón Primario de Arranque ─── */}
        <button
          type="button"
          onClick={handleStart}
          disabled={!selectedVT || !ayudante || !isAuthorized || pendingVentasCount > 0}
          className={`w-full py-4 sm:py-5 rounded-2xl font-black text-base sm:text-lg flex items-center justify-center gap-2 transition-all shadow-xl ${
            selectedVT && ayudante && isAuthorized && pendingVentasCount === 0
              ? 'bg-[#053225] hover:bg-[#073b2d] active:scale-[0.98] text-white border border-emerald-800/60 cursor-pointer'
              : 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
          }`}
        >
          {pendingVentasCount > 0 ? (
            `SINCRONIZAR ${pendingVentasCount} VENTAS PENDIENTES`
          ) : !isAuthorized ? (
            'TURNO NO AUTORIZADO'
          ) : (
            <>
              <span>INICIAR JORNADA • {selectedVT} ({selectedDate === todayStr ? 'HOY' : selectedDate})</span>
              <ArrowRight className="w-5 h-5 text-emerald-300" />
            </>
          )}
        </button>
      </div>

      {/* Alerta de Ventas Pendientes que Bloquean el Arranque */}
      {pendingVentasCount > 0 && pendingCheckDone && (
        <div className="fixed bottom-0 left-0 right-0 bg-[#053225] text-white p-4 shadow-2xl z-40 border-t border-emerald-800/60">
          <div className="max-w-lg mx-auto">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-5 h-5 text-amber-300" />
              <p className="font-bold text-sm">Ventas sin sincronizar de la jornada anterior</p>
            </div>
            <p className="text-white/80 text-xs mb-3">
              Tienes <strong>{pendingVentasCount} boletos</strong> guardados localmente. Sube las ventas a la nube para proteger la recaudación.
            </p>
            {navigator.onLine ? (
              <button
                type="button"
                onClick={handleForceSync}
                disabled={syncingPending}
                className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-60"
              >
                {syncingPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Wifi className="w-4 h-4" />}
                {syncingPending ? 'SINCRONIZANDO...' : `SUBIR ${pendingVentasCount} VENTAS A LA NUBE`}
              </button>
            ) : (
              <div className="w-full py-2 rounded-xl bg-white/10 text-white/70 text-xs flex items-center justify-center gap-2">
                <WifiOff className="w-4 h-4" /> SIN INTERNET — CONECTA A WIFI/DATOS
              </div>
            )}
          </div>
        </div>
      )}

      {/* Banner de Turno sin Terminar */}
      {existingUnfinished && existingSession && (
        <div className="fixed bottom-0 left-0 right-0 bg-[#053225] text-white p-4 shadow-2xl z-40 border-t border-emerald-800/60">
          <div className="max-w-lg mx-auto">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-5 h-5 text-amber-300" />
              <p className="font-bold text-sm">Turno en curso: {existingSession.vtCode} ({existingSession.fecha})</p>
            </div>
            <p className="text-white/80 text-xs mb-3">
              Tienes frecuencias pendientes de liquidar en este turno.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleResumeOld}
                className="flex-1 py-2.5 rounded-xl bg-white text-[#053225] font-black text-xs active:scale-[0.98]"
              >
                Continuar VT {existingSession.vtCode}
              </button>
              <button
                type="button"
                onClick={() => setConfirmNewSession(true)}
                className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs active:scale-[0.98]"
              >
                Iniciar Nuevo VT
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación para Abandonar Turno */}
      {confirmNewSession && existingSession && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 text-center shadow-2xl">
            <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-3 text-amber-700">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h3 className="text-base font-black text-slate-900 mb-1">¿Iniciar Nuevo Turno?</h3>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              Existe una sesión para <strong>{existingSession.vtCode}</strong> en la fecha <strong>{existingSession.fecha}</strong>. Solo puede haber un turno oficial activo por fecha.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmNewSession(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleForceNew}
                className="flex-1 py-2.5 rounded-xl bg-[#053225] text-white font-black text-xs shadow-md"
              >
                Confirmar Nuevo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
