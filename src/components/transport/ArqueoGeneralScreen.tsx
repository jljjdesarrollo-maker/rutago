'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { type VTSession, type FrecuenciaEstado } from './types-boletos';
import { getVentasByFrecuencia } from '@/lib/indexeddb';
import { type ConnectionInfo } from '@/hooks/use-connection';
import {
  ChevronLeft, DollarSign, Camera, X, Save, Loader2,
  CheckCircle2, Send, AlertTriangle, Plus, Trash2, ImagePlus
} from 'lucide-react';

interface Props {
  session: VTSession;
  connection: ConnectionInfo;
  onClose: () => void;
  onGoToSync: () => void;
  onSaved: () => void;
}

interface FrecuenciaResumen {
  estadoId: string;
  nombre: string;
  ruta: string;
  hora: string;
  direccion: string;
  ventasCount: number;
  totalRecaudado: number;        // What the system says
  efectivoContado: number;        // What the helper actually counted
  diferencia: number;             // efectivoContado - totalRecaudado
  boletosCaja: number;
  cajaComunMonto?: number;
}

interface GastoItem {
  description: string;
  amount: string;
}

const today = () => new Date().toISOString().split('T')[0];

// Work date: use session.fecha (date when shift started, not necessarily today)
function workDate(session: VTSession): string {
  return session.fecha || today();
}

const GASTOS_DEFAULT: GastoItem[] = [
  { description: 'Chofer', amount: '30' },
  { description: 'Ayudante', amount: '20' },
  { description: 'Diesel', amount: '0' },
  { description: 'Plan Renova', amount: '68' },
];

export function ArqueoGeneralScreen({ session, connection, onClose, onGoToSync, onSaved }: Props) {
  const [frecuencias, setFrecuencias] = useState<FrecuenciaResumen[]>([]);
  const [loading, setLoading] = useState(true);
  const [km, setKm] = useState('');
  const [gastos, setGastos] = useState<GastoItem[]>(GASTOS_DEFAULT);
  const [tickets, setTickets] = useState('');
  const [sobrante, setSobrante] = useState('');
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmSave, setConfirmSave] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [guardadoOffline, setGuardadoOffline] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const loadData = useCallback(async () => {
    try {
      const fecha = workDate(session);
      // Load estados from localStorage (synchronous, reliable)
      const lsKey = `rg_estados_${session.vtCode}_${fecha}`;
      const raw = localStorage.getItem(lsKey);
      if (!raw) { setLoading(false); return; }
      const estadosLS = JSON.parse(raw) as FrecuenciaEstado[];
      const cerradas = estadosLS.filter(e => e.estado === 'cerrada');

      const resumenes: FrecuenciaResumen[] = await Promise.all(
        cerradas.map(async (e) => {
          const ventas = await getVentasByFrecuencia(e.estadoId);
          const sistemaTotal = ventas.reduce((s, v) => s + v.cobrado, 0);
          // Use arqueo data if available (what helper actually counted), else system total
          const efectivo = (e as any).arqueoEfectivo ?? sistemaTotal;
          const diff = efectivo - sistemaTotal;
          const ccCount = (e as any).cajaComunCount || 0;
          const ccMonto = (e as any).cajaComunMonto || 0;
          return {
            estadoId: e.estadoId,
            nombre: e.nombre,
            ruta: e.ruta,
            hora: e.hora,
            direccion: e.direccion,
            ventasCount: ventas.length,
            totalRecaudado: sistemaTotal,
            efectivoContado: efectivo,
            diferencia: diff,
            boletosCaja: ccCount,
            cajaComunMonto: ccMonto,
          };
        })
      );
      setFrecuencias(resumenes);
    } catch (err) {
      console.error('Error cargando resumen:', err);
    } finally {
      setLoading(false);
    }
  }, [session.vtCode]);

  useEffect(() => { loadData(); }, [loadData]);

  const totalIngresosAuto = useMemo(() =>
    frecuencias.reduce((s, f) => s + f.totalRecaudado, 0),
    [frecuencias]
  );
  const totalEfectivoReal = useMemo(() =>
    frecuencias.reduce((s, f) => s + f.efectivoContado, 0),
    [frecuencias]
  );
  const totalDiferencia = useMemo(() =>
    frecuencias.reduce((s, f) => s + f.diferencia, 0),
    [frecuencias]
  );
  const totalVentas = useMemo(() =>
    frecuencias.reduce((s, f) => s + f.ventasCount, 0),
    [frecuencias]
  );
  const totalCajaComunPasajeros = useMemo(() =>
    frecuencias.reduce((s, f) => s + f.boletosCaja, 0),
    [frecuencias]
  );
  const totalCajaComunMonto = useMemo(() =>
    frecuencias.reduce((s, f) => s + (f.cajaComunMonto || 0), 0),
    [frecuencias]
  );
  const totalGastos = useMemo(() =>
    gastos.reduce((s, g) => s + (parseFloat(g.amount) || 0), 0),
    [gastos]
  );
  const ticketsNum = parseFloat(tickets) || 0;
  const sobranteNum = parseFloat(sobrante) || 0;
  // PRODUCCION = efectivo real contado por el ayudante + caja comun + sobrante ajuste manual
  const production = totalEfectivoReal + totalCajaComunMonto + sobranteNum;
  const entregaAyudante = production - totalGastos;
  // Lógica dual: si hay caja común se descuentan tickets, si no (pre-Jun 2026) entrega compañía = 0
  const entregaCompania = totalCajaComunMonto > 0 ? totalCajaComunMonto - ticketsNum : 0;

  const addGasto = () => setGastos(prev => [...prev, { description: '', amount: '0' }]);
  const removeGasto = (i: number) => setGastos(prev => prev.filter((_, idx) => idx !== i));
  const updateGasto = (i: number, field: keyof GastoItem, value: string) => {
    setGastos(prev => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: value };
      return next;
    });
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    e.target.value = '';
    // Comprimir imagen antes de almacenar (max ~200KB base64)
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const MAX_DIM = 1200;
      const QUALITY = 0.6;
      let w = img.width, h = img.height;
      if (w > MAX_DIM || h > MAX_DIM) {
        if (w > h) { h = Math.round(h * MAX_DIM / w); w = MAX_DIM; }
        else { w = Math.round(w * MAX_DIM / h); h = MAX_DIM; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d')?.drawImage(img, 0, 0, w, h);
      setFotoPreview(canvas.toDataURL('image/jpeg', QUALITY));
    };
    img.onerror = () => URL.revokeObjectURL(url);
    img.src = url;
  };

  const handleSaveOffline = () => {
    const errs: string[] = [];
    if (!km.trim()) errs.push('Kilometraje es obligatorio');
    if (!fotoPreview) errs.push('Foto del cuaderno es obligatoria');
    if (frecuencias.length === 0) errs.push('No hay frecuencias cerradas');
    // Gastos pueden ser $0 si no hubo (ej. unidad parada)
    if (errs.length > 0) {
      setErrors(errs);
      return;
    }
    setErrors([]);
    setConfirmSave(true);
  };

  const handleConfirmSave = async () => {
    setConfirmSave(false);
    setSaving(true);

    try {
      // Build trips from frecuencias
      const trips = frecuencias.map(f => ({
        routeFrom: f.direccion === 'ida' ? 'Loja' : f.ruta.split(' - ')[1]?.trim() || 'Loja',
        routeTo: f.direccion === 'ida' ? f.ruta.split(' - ')[1]?.trim() || 'Vilcabamba' : 'Loja',
        time: f.hora,
        income: f.totalRecaudado.toString(),
        efectivoReal: f.efectivoContado.toString(),
        boletos: '0',
        cajaComunPasajeros: f.boletosCaja.toString(),
        cajaComunMonto: (f.cajaComunMonto || 0).toString(),
      }));

      const body = {
        date: workDate(session),
        km: km,
        conductor: '',
        ayudanteNombre: session.ayudanteNombre,
        vtCode: session.vtCode,
        trips,
        expenses: gastos,
        tickets: tickets || '0',
        cajaComun: totalCajaComunMonto,
        sobrante: sobrante || '0',
        photoUrl: fotoPreview,
      };

      const fechaTrabajo = workDate(session);
      const isOnline = navigator.onLine;

      if (isOnline) {
        const res = await fetch('/api/records', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (res.ok) {
          setSaved(true);
        } else {
          const result = await res.json().catch(() => ({ error: 'Error desconocido' }));
          console.error('Error guardando arqueo en servidor:', result.error);
          // Save offline if server fails
          localStorage.setItem(`arqueo_general_${session.vtCode}_${fechaTrabajo}`, JSON.stringify(body));
          setGuardadoOffline(true);
          setSaved(true);
        }
      } else {
        // Save to localStorage for later sync
        localStorage.setItem(`arqueo_general_${session.vtCode}_${fechaTrabajo}`, JSON.stringify(body));
        setGuardadoOffline(true);
        setSaved(true);
      }
    } catch (err) {
      console.error('Error guardando arqueo:', err);
      localStorage.setItem(`arqueo_general_${session.vtCode}_${fechaTrabajo}`, JSON.stringify({
        date: fechaTrabajo, km, vtCode: session.vtCode, ayudanteNombre: session.ayudanteNombre,
        trips: frecuencias.map(f => ({ routeFrom: 'Loja', routeTo: 'Vilcabamba', time: f.hora, income: f.totalRecaudado.toString(), boletos: '0' })),
        expenses: gastos, tickets: tickets || '0', sobrante: sobrante || '0', photoUrl: fotoPreview,
      }));
      setGuardadoOffline(true);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-[100dvh] bg-gray-50 items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#912D26] animate-spin mb-3" />
        <p className="text-[#3A3A3A]">Cargando arqueo general...</p>
      </div>
    );
  }

  // Saved confirmation screen
  if (saved) {
    return (
      <div className="flex flex-col min-h-[100dvh] bg-[#912D26] text-white">
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <CheckCircle2 className="w-20 h-20 mb-4" />
          <h1 className="text-2xl font-black mb-2">ARQUEO GENERAL GUARDADO</h1>
          <p className="text-white/80 text-sm mb-1">{session.nombre} — {workDate(session)}</p>
          <p className="text-white/80 text-sm mb-6">{totalVentas} ventas · ${totalIngresosAuto.toFixed(2)} ingresos</p>

          {guardadoOffline && (
            <div className="bg-yellow-500/20 border border-yellow-400/30 rounded-2xl px-5 py-3 mb-6 text-center">
              <p className="text-yellow-200 text-sm font-bold">Guardado local (sin internet)</p>
              <p className="text-yellow-200/70 text-xs mt-1">Se sincronizará cuando haya conexión</p>
            </div>
          )}

          <div className="w-full max-w-xs space-y-3">
            {connection.pendingCount > 0 && connection.status !== 'offline' && (
              <button onClick={onGoToSync}
                className="w-full py-4 rounded-2xl bg-white text-[#912D26] font-black text-lg flex items-center justify-center gap-2 active:scale-95">
                <Send className="w-5 h-5" /> SINCRONIZAR {connection.pendingCount} VENTAS
              </button>
            )}
            <button onClick={onSaved}
              className="w-full py-4 rounded-2xl bg-white/20 text-white font-bold text-lg flex items-center justify-center gap-2 active:scale-95">
              FINALIZAR
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Confirm save dialog
  if (confirmSave) {
    return (
      <div className="flex flex-col min-h-[100dvh] bg-gray-50">
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 max-w-md w-full shadow-lg">
            <h2 className="text-lg font-bold text-[#3A3A3A] mb-4">Confirmar Arqueo General</h2>
            <div className="bg-gray-50 rounded-xl p-4 space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Producción</span>
                <span className="font-bold text-[#3A3A3A]">${production.toFixed(2)}</span>
              </div>
              {totalCajaComunPasajeros > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-purple-700">Caja Comun (Ofi.Loja): {totalCajaComunPasajeros} boletos</span>
                  <span className="font-bold text-purple-700">${totalCajaComunMonto.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Total Gastos</span>
                <span className="font-bold text-red-600">${totalGastos.toFixed(2)}</span>
              </div>
              <hr className="border-gray-200" />
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Entrega Ayudante</span>
                <span className={`font-bold ${entregaAyudante >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${entregaAyudante.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Entrega Compañía</span>
                <span className={`font-bold ${entregaCompania >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${entregaCompania.toFixed(2)}
                </span>
              </div>
            </div>
            <p className="text-sm text-[#912D26] mb-4">
              Entrega Ayudante: <strong>${entregaAyudante.toFixed(2)}</strong> —
              Entrega Compañía: <strong>${entregaCompania.toFixed(2)}</strong>
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmSave(false)}
                className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-500 font-bold active:scale-95">
                Cancelar
              </button>
              <button onClick={handleConfirmSave} disabled={saving}
                className={`flex-1 py-3 rounded-xl font-black active:scale-95 ${saving ? 'bg-[#D6D6D6] text-gray-400 cursor-not-allowed' : 'bg-[#912D26] text-white'}`}>
                {saving ? 'Guardando...' : 'CONFIRMAR'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[100dvh] bg-gray-50">
      {/* Barra conexion */}
      <div className={`${connection.bgColor} px-4 py-1.5 flex items-center justify-center gap-2 text-xs font-medium ${connection.color}`}>
        <span>{connection.icon}</span>
        <span>{connection.label}</span>
      </div>

      {/* Header */}
      <div className="bg-[#912D26] text-white px-4 py-3">
        <div className="flex items-center justify-between">
          <button onClick={onClose} className="text-red-100"><ChevronLeft className="w-6 h-6" /></button>
          <div className="text-center">
            <h2 className="text-lg font-bold">Arqueo General</h2>
            <p className="text-red-100 text-xs">{session.nombre} — Turno completo</p>
          </div>
          <div className="w-6" />
        </div>
      </div>

      <div className="flex-1 px-4 py-4 space-y-4 overflow-y-auto pb-8">
        {/* Errores */}
        {errors.length > 0 && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm space-y-1">
            <p className="font-semibold flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" /> Campos obligatorios:</p>
            {errors.map((e, i) => <p key={i}>- {e}</p>)}
          </div>
        )}

        {/* 1. INGRESOS POR FRECUENCIA — Sistema vs Efectivo Real */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <h3 className="font-bold text-[#3A3A3A] mb-3 text-sm uppercase flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-green-600" /> Ingresos por Frecuencia
          </h3>
          {frecuencias.length === 0 ? (
            <p className="text-gray-400 text-xs text-center py-4">No hay frecuencias cerradas</p>
          ) : (
            <div className="space-y-2">
              {/* Header row */}
              <div className="flex items-center justify-between px-3 py-1 text-[10px] font-bold text-gray-400 uppercase">
                <div className="flex-1">Frecuencia</div>
                <div className="w-20 text-right">Sistema</div>
                <div className="w-20 text-right">Real</div>
                <div className="w-16 text-right">Dif.</div>
              </div>
              {frecuencias.map((f, i) => {
                const hasDiff = Math.abs(f.diferencia) >= 0.01;
                return (
                  <div key={f.estadoId} className={`flex items-center justify-between py-2 px-3 rounded-xl ${i % 2 === 0 ? 'bg-[#912D26]/5' : 'bg-gray-50'}`}>
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${i % 2 === 0 ? 'bg-[#912D26] text-white' : 'bg-[#3A3A3A] text-white'}`}>
                        {i + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-[#3A3A3A] truncate">{f.hora} — {f.nombre}</div>
                        <div className="text-[10px] text-gray-400">{f.ventasCount} ventas{f.boletosCaja > 0 ? ` + ${f.boletosCaja} c.comun` : ''}</div>
                      </div>
                    </div>
                    <div className="w-20 text-right">
                      <div className="font-bold text-[#3A3A3A]">${f.totalRecaudado.toFixed(2)}</div>
                    </div>
                    <div className="w-20 text-right">
                      <div className="font-black text-green-700">${f.efectivoContado.toFixed(2)}</div>
                    </div>
                    <div className="w-16 text-right">
                      {hasDiff ? (
                        <span className={`text-xs font-bold ${f.diferencia > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                          {f.diferencia > 0 ? '+' : ''}{f.diferencia.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </div>
                  </div>
                );
              })}
              {/* Totals row */}
              <div className="border-t-2 border-green-200 pt-2 mt-2 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-[#3A3A3A] text-xs">Total Sistema</span>
                  <span className="font-bold text-sm text-[#3A3A3A]">${totalIngresosAuto.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-bold text-green-700 text-xs">Total Efectivo Real</span>
                  <span className="font-black text-lg text-green-700">${totalEfectivoReal.toFixed(2)}</span>
                </div>
                {Math.abs(totalDiferencia) >= 0.01 && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">Diferencia global</span>
                    <span className={`text-xs font-bold ${totalDiferencia > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                      {totalDiferencia > 0 ? '+' : ''}{totalDiferencia.toFixed(2)}
                    </span>
                  </div>
                )}
                {totalCajaComunPasajeros > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-purple-700">Caja Comun (Ofi.Loja): {totalCajaComunPasajeros} boletos</span>
                    <span className="font-bold text-sm text-purple-700">${totalCajaComunMonto.toFixed(2)}</span>
                  </div>
                )}
                <div className="text-right text-[10px] text-gray-400">{totalVentas} boletos vendidos</div>
              </div>
            </div>
          )}
        </div>

        {/* 2. KILOMETRAJE + FOTO */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm space-y-3">
          <h3 className="font-bold text-[#3A3A3A] mb-1 text-sm uppercase">Datos del Turno</h3>
          <div>
            <label className="text-xs font-medium text-gray-500 flex items-center gap-1">
              Kilometraje <span className="text-[#912D26]">*</span>
            </label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="877604"
              value={km}
              onChange={e => setKm(e.target.value)}
              className="w-full mt-1 h-11 rounded-xl border border-[#D6D6D6] px-3 text-sm font-semibold text-[#3A3A3A]"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 flex items-center gap-1">
              Foto del Cuaderno <span className="text-[#912D26]">*</span>
            </label>
            <div className="mt-1">
              {fotoPreview ? (
                <div className="relative w-20 h-20 rounded-xl overflow-hidden border-2 border-[#912D26]">
                  <img src={fotoPreview} alt="Foto" className="w-full h-full object-cover" />
                  <button
                    onClick={() => setFotoPreview(null)}
                    className="absolute top-0 right-0 w-5 h-5 bg-[#912D26] text-white rounded-bl-lg flex items-center justify-center"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="h-10 px-4 rounded-xl text-xs border border-[#D6D6D6] text-[#3A3A3A] flex items-center gap-1 active:scale-95"
                >
                  <Camera className="w-4 h-4" /> Tomar/Adjuntar Foto
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 3. GASTOS */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-red-600 text-sm uppercase">Gastos</h3>
            <button onClick={addGasto} className="text-xs text-[#912D26] font-bold flex items-center gap-1">
              <Plus className="w-3 h-3" /> Agregar
            </button>
          </div>
          <div className="space-y-2">
            {gastos.map((g, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  placeholder="Descripcion"
                  value={g.description}
                  onChange={e => updateGasto(i, 'description', e.target.value)}
                  className="h-10 text-sm rounded-xl flex-1 border border-[#D6D6D6] px-3 text-[#3A3A3A]"
                />
                <div className="relative w-24">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={g.amount}
                    onChange={e => updateGasto(i, 'amount', e.target.value)}
                    className="h-10 text-sm rounded-xl w-full border border-[#D6D6D6] pl-6 pr-2 text-[#3A3A3A] font-semibold"
                  />
                </div>
                {i >= 4 && (
                  <button onClick={() => removeGasto(i)} className="text-gray-400 hover:text-red-500">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="border-t border-gray-100 pt-2 mt-3 flex justify-between text-sm font-bold text-red-600">
            <span>Total Gastos</span>
            <span>${totalGastos.toFixed(2)}</span>
          </div>
        </div>

        {/* 4. TICKETS + SOBRANTE */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm space-y-3">
          <h3 className="font-bold text-[#3A3A3A] text-sm uppercase">Ajustes</h3>
          <div>
            <label className="text-xs font-medium text-gray-500">Tickets</label>
            <div className="grid grid-cols-3 gap-2 mt-1">
              <button onClick={() => setTickets('4.50')}
                className={`h-11 rounded-xl text-sm font-bold border-2 transition-all active:scale-95 ${tickets === '4.50' ? 'bg-[#912D26] border-[#912D26] text-white' : 'bg-white border-[#D6D6D6] text-[#3A3A3A]'}`}>
                $4.50
              </button>
              <button onClick={() => setTickets('6.00')}
                className={`h-11 rounded-xl text-sm font-bold border-2 transition-all active:scale-95 ${tickets === '6.00' ? 'bg-[#912D26] border-[#912D26] text-white' : 'bg-white border-[#D6D6D6] text-[#3A3A3A]'}`}>
                $6.00
              </button>
              <button onClick={() => setTickets('')}
                className={`h-11 rounded-xl text-sm font-bold border-2 transition-all active:scale-95 ${tickets === '' ? 'bg-[#3A3A3A] border-[#3A3A3A] text-white' : 'bg-white border-[#D6D6D6] text-gray-400'}`}>
                Ninguno
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500">Sobrante / Ajuste</label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
              <input
                type="number"
                inputMode="decimal"
                placeholder="0.00"
                value={sobrante}
                onChange={e => setSobrante(e.target.value)}
                className="w-full h-11 rounded-xl border border-[#D6D6D6] pl-7 pr-3 text-sm font-semibold text-[#3A3A3A]"
              />
            </div>
            <p className="text-[10px] text-gray-400 mt-0.5">Dinero sobrante al contar (positivo o negativo)</p>
          </div>
        </div>

        {/* 5. RESUMEN */}
        <div className="bg-[#3A3A3A] text-white rounded-2xl p-4 space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-white/50">Liquidación del Día</p>
          <div className="flex justify-between text-sm">
            <span className="text-white/60">Efectivo Real (Contado)</span>
            <span className="font-semibold text-green-400">${totalEfectivoReal.toFixed(2)}</span>
          </div>
          {Math.abs(totalDiferencia) >= 0.01 && (
            <div className="flex justify-between text-sm">
              <span className="text-white/60">Diferencia vs Sistema</span>
              <span className={`font-semibold ${totalDiferencia > 0 ? 'text-blue-400' : 'text-red-400'}`}>
                {totalDiferencia > 0 ? '+' : ''}{totalDiferencia.toFixed(2)}
              </span>
            </div>
          )}
          {sobranteNum !== 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-white/60">Ajuste Manual</span>
              <span className={`font-semibold ${sobranteNum >= 0 ? 'text-green-400' : 'text-red-400'}`}>${sobranteNum.toFixed(2)}</span>
            </div>
          )}
          <hr className="border-white/10" />
          <div className="flex justify-between text-sm">
            <span className="text-white/80">Producción</span>
            <span className="font-black text-lg">${production.toFixed(2)}</span>
          </div>
          <p className="text-[10px] text-white/30">Efectivo Real + Caja Común + Ajuste Manual</p>
          {totalCajaComunPasajeros > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-purple-300">Caja Comun (Ofi.Loja): {totalCajaComunPasajeros} boletos</span>
              <span className="font-semibold text-purple-300">${totalCajaComunMonto.toFixed(2)}</span>
            </div>
          )}
          <hr className="border-white/10" />
          <div className="flex justify-between text-sm">
            <span className="text-white/60">Total Gastos</span>
            <span className="font-semibold text-red-400">-${totalGastos.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-white/60">Tickets</span>
            <span className="font-semibold">-${ticketsNum.toFixed(2)}</span>
          </div>
          <hr className="border-white/10" />
          <div className="flex justify-between">
            <span className="text-sm text-white/80">Entrega Ayudante</span>
            <span className={`font-bold ${entregaAyudante >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              ${entregaAyudante.toFixed(2)}
            </span>
          </div>
          <p className="text-[10px] text-white/30">Producción - Total Gastos</p>
          <div className="flex justify-between">
            <span className="text-sm text-white/80">Entrega Compañía</span>
            <span className={`font-bold ${entregaCompania >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              ${entregaCompania.toFixed(2)}
            </span>
          </div>
          <p className="text-[10px] text-white/30">{totalCajaComunMonto > 0 ? 'Caja Común - Tickets' : 'Sin Caja Común (antes de Jun 2026)'}</p>
        </div>

        {/* BOTON GUARDAR */}
        <button
          onClick={handleSaveOffline}
          disabled={saving}
          className={`w-full py-5 rounded-2xl font-black text-xl flex items-center justify-center gap-2 shadow-lg ${
            saving ? 'bg-[#D6D6D6] text-gray-400 cursor-not-allowed' : 'bg-[#912D26] text-white shadow-red-200 active:scale-95 transition-all'
          }`}>
          {saving ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
          {saving ? 'Guardando...' : 'GUARDAR ARQUEO GENERAL'}
        </button>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handlePhotoChange}
      />
    </div>
  );
}
