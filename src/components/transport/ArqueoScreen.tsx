'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { type FrecuenciaEstado, type VTSession } from './types-boletos';
import { getVentasByFrecuencia, countVentasPendientes, syncVentasSilencioso } from '@/lib/indexeddb';
import { type ConnectionInfo } from '@/hooks/use-connection';
import { DollarSign, Check, ChevronLeft, AlertTriangle, TrendingDown, TrendingUp, Equal, ArrowRight, RefreshCw, WifiOff, CheckCircle, ShieldCheck, EyeOff } from 'lucide-react';

interface Props {
  session: VTSession;
  estado: FrecuenciaEstado;
  connection: ConnectionInfo;
  esUltima: boolean;
  onArqueoConfirmado: () => void;
  onBack: () => void;
}

export function ArqueoScreen({ session, estado, connection, esUltima, onArqueoConfirmado, onBack }: Props) {
  const [ventas, setVentas] = useState<any[]>([]);
  const [efectivo, setEfectivo] = useState('');
  const [confirmado, setConfirmado] = useState(false);
  const [saving, setSaving] = useState(false);
  const [ventasOpen, setVentasOpen] = useState(false);
  // Sync visible state
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ synced: number; failed: number; total: number } | null>(null);
  const [noInternet, setNoInternet] = useState(false);
  const submitLock = useRef(false); // Anti double-tap

  const loadVentas = useCallback(async () => {
    const all = await getVentasByFrecuencia(estado.estadoId);
    // Show ALL ventas for arqueo (including synced ones)
    setVentas(all);
  }, [estado.estadoId]);

  useEffect(() => { loadVentas(); }, [loadVentas]);

  const totalSistema = ventas.reduce((sum, v) => sum + v.cobrado, 0);
  const enteros = ventas.filter(v => v.pasajeroTipo !== 'media').length;
  const medias = ventas.filter(v => v.pasajeroTipo === 'media').length;
  // Permitir NaN temporalmente mientras escribe (evita parpadeo)
  const efectivoRaw = parseFloat(efectivo);
  const efectivoNum = isNaN(efectivoRaw) ? -1 : efectivoRaw;
  const diferencia = efectivoNum - totalSistema;
  // Caja Común (Oficina Loja)
  const cajaComunCount = (estado as any).cajaComunCount || 0;
  const cajaComunMonto = (estado as any).cajaComunMonto || 0;
  const produccionTotal = totalSistema + cajaComunMonto;
  const faltante = diferencia < 0;
  const sobrante = diferencia > 0;
  const cuadra = Math.abs(diferencia) < 0.01 && efectivoNum > 0;

  const handleConfirm = async () => {
    if (submitLock.current) return;
    submitLock.current = true;
    setSaving(true);
    try {
      // GPS invisible: capture coordinates when frequency closes
      const { getGPSPosition } = await import('@/lib/gps');
      const gps = await getGPSPosition();

      // Mark as cerrada in localStorage + save arqueo data
      const fecha = session.fecha || new Date().toISOString().split('T')[0];
      const lsKey = `rg_estados_${session.vtCode}_${fecha}`;
      try {
        const raw = localStorage.getItem(lsKey);
        if (raw) {
          const all = JSON.parse(raw);
          const idx = all.findIndex((e: any) => e.estadoId === estado.estadoId);
          if (idx >= 0) {
            all[idx].estado = 'cerrada';
            all[idx].arqueoEfectivo = efectivoNum;
            all[idx].arqueoSistema = totalSistema;
            all[idx].arqueoDiferencia = diferencia;
            all[idx].arqueoFecha = new Date().toISOString();
            // Preserve caja común data
            all[idx].cajaComunCount = cajaComunCount;
            all[idx].cajaComunMonto = cajaComunMonto;
            if (gps) {
              all[idx].gpsLatEnd = gps.lat;
              all[idx].gpsLngEnd = gps.lng;
            }
            localStorage.setItem(lsKey, JSON.stringify(all));
          }
        }
      } catch (e) { console.error('LS error:', e); }
      setConfirmado(true);
      // Start visible sync after arqueo confirmation
      if (navigator.onLine) {
        setSyncing(true);
        try {
          const result = await syncVentasSilencioso();
          setSyncResult(result);
        } catch {
          setSyncResult({ synced: 0, failed: 0, total: 0 });
        }
        setSyncing(false);
      } else {
        setNoInternet(true);
        const count = await countVentasPendientes();
        setSyncResult({ synced: 0, failed: 0, total: count });
      }
    } catch (err) {
      console.error('Error guardando arqueo:', err);
    } finally {
      setSaving(false);
      setTimeout(() => { submitLock.current = false; }, 500);
    }
  };

  const handleFinish = () => {
    onArqueoConfirmado();
  };

  if (confirmado) {
    return (
      <div className="flex flex-col min-h-[100dvh] bg-gray-50">
        <div className={`${esUltima ? 'bg-[#912D26]' : 'bg-green-600'} text-white px-4 py-6 flex-1 flex flex-col items-center justify-center`}>
          <Check className="w-16 h-16 mb-4" />
          <h1 className="text-2xl font-black mb-2">{esUltima ? 'TURNO COMPLETADO' : 'ARQUEO CONFIRMADO'}</h1>
          <p className="text-white/80 text-sm mb-1">{estado.hora} — {estado.nombre}</p>
          <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-4 w-full max-w-sm mb-4 text-center space-y-1.5 border border-white/20">
            <p className="text-white/80 text-[11px] font-black uppercase tracking-wider">Resultado de la Auditoría Ciega</p>
            <p className="text-white text-sm font-bold">{ventas.length} boletos en ruta · ${totalSistema.toFixed(2)}</p>
            {cajaComunCount > 0 && cajaComunMonto > 0 && (
              <p className="text-white/90 text-xs">{cajaComunCount} boletos caja común · ${cajaComunMonto.toFixed(2)}</p>
            )}
            <div className="border-t border-white/20 pt-2 mt-2 flex justify-between items-center text-xs">
              <span className="text-white/80 font-medium">Efectivo Declarado:</span>
              <span className="font-black text-base text-white">${efectivoNum.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-white/80 font-medium">Producción Total:</span>
              <span className="font-black text-base text-white">${produccionTotal.toFixed(2)}</span>
            </div>
          </div>

          {cuadra && (
            <div className="bg-emerald-500/40 border border-emerald-300 rounded-2xl px-5 py-3 mb-2 text-center w-full max-w-sm">
              <p className="text-emerald-100 font-black text-xl tracking-tight">✓ CAJA CUADRADA ($0.00)</p>
              <p className="text-xs text-emerald-200 mt-0.5">El dinero físico coincide exactamente con el sistema</p>
            </div>
          )}
          {sobrante && (
            <div className="bg-blue-500/40 border border-blue-300 rounded-2xl px-5 py-3 mb-2 text-center w-full max-w-sm">
              <p className="text-blue-100 font-black text-xl tracking-tight">SOBRANTE: +${diferencia.toFixed(2)}</p>
              <p className="text-xs text-blue-200 mt-0.5">Excedente acreditado íntegro a favor del bus</p>
            </div>
          )}
          {faltante && (
            <div className="bg-amber-500/40 border border-amber-300 rounded-2xl px-5 py-3 mb-2 text-center w-full max-w-sm">
              <p className="text-amber-100 font-black text-xl tracking-tight">FALTANTE: -${Math.abs(diferencia).toFixed(2)}</p>
              <p className="text-xs text-amber-200 mt-0.5">Registrado en arqueo a cargo de la tripulación</p>
            </div>
          )}

          {/* Sync visible */}
          <div className="mt-6 w-full max-w-xs">
            {syncing ? (
              <div className="bg-white/20 rounded-2xl px-6 py-5 text-center">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2" />
                <p className="font-bold text-sm">Sincronizando ventas...</p>
              </div>
            ) : noInternet && syncResult ? (
              <div className="bg-red-500/40 rounded-2xl px-6 py-4 text-center">
                <WifiOff className="w-6 h-6 mx-auto mb-1" />
                <p className="font-bold text-sm">Sin internet</p>
                <p className="text-white/80 text-xs mt-1">{syncResult.total} venta{syncResult.total !== 1 ? 's' : ''} pendiente{syncResult.total !== 1 ? 's' : ''} se sincronizara{syncResult.total === 1 ? '' : 'n'} despues</p>
              </div>
            ) : syncResult && syncResult.synced > 0 ? (
              <div className="bg-green-500/40 rounded-2xl px-6 py-4 text-center">
                <CheckCircle className="w-6 h-6 mx-auto mb-1" />
                <p className="font-bold text-sm">{syncResult.synced} venta{syncResult.synced !== 1 ? 's' : ''} sincronizada{syncResult.synced === 1 ? '' : 's'}</p>
                {syncResult.failed > 0 && (
                  <p className="text-yellow-200 text-xs mt-1">{syncResult.failed} con error</p>
                )}
              </div>
            ) : syncResult && syncResult.synced === 0 && syncResult.total === 0 ? (
              <div className="bg-white/20 rounded-2xl px-6 py-4 text-center">
                <CheckCircle className="w-6 h-6 mx-auto mb-1" />
                <p className="font-bold text-sm">Todo al dia</p>
              </div>
            ) : null}
          </div>

          {!esUltima && (
            <div className="mt-4 bg-white/20 rounded-2xl px-6 py-3 text-center">
              <p className="text-sm font-medium">Siguiente frecuencia habilitada</p>
            </div>
          )}

          {esUltima && (
            <div className="mt-4 bg-white/20 rounded-2xl px-6 py-3 text-center">
              <p className="text-sm font-medium">Todas las frecuencias completadas</p>
            </div>
          )}

          <div className="mt-6 w-full max-w-xs">
            <button onClick={handleFinish}
              className="w-full py-4 rounded-2xl bg-white/20 text-white font-bold text-lg flex items-center justify-center gap-2 active:scale-95">
              {esUltima ? 'FINALIZAR' : 'CONTINUAR'} <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[100dvh] bg-gray-50">
      {/* Barra de conexion */}
      <div className={`${connection.bgColor} px-4 py-1.5 flex items-center justify-center gap-2 text-xs font-medium ${connection.color}`}>
        <span>{connection.icon}</span>
        <span>{connection.label}</span>
      </div>

      {/* Header */}
      <div className="bg-[#912D26] text-white px-4 py-3">
        <div className="flex items-center justify-between">
          <button onClick={onBack} className="text-gray-300"><ChevronLeft className="w-6 h-6" /></button>
          <div className="text-center">
            <h2 className="text-lg font-bold">Arqueo de Caja</h2>
            <p className="text-gray-300 text-xs">{estado.hora} — {estado.nombre}</p>
          </div>
          <div className="w-6" />
        </div>
      </div>

      <div className="flex-1 px-4 py-4 space-y-4 overflow-y-auto">
        {/* Cabecera de Arqueo Ciego */}
        <div className="bg-slate-900 text-white rounded-3xl p-5 shadow-md border border-slate-800 space-y-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-black">
              <EyeOff className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black tracking-wider uppercase text-amber-400">Arqueo Ciego Obligatorio</span>
                <span className="bg-white/10 text-white/90 text-[10px] px-2 py-0.5 rounded-full font-bold">Auditoría en Ruta</span>
              </div>
              <h3 className="font-extrabold text-base text-white">Conteo Físico de Efectivo</h3>
            </div>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed pt-1">
            Por seguridad y transparencia, cuenta todo el dinero físico en mano (billetes y monedas) de esta vuelta e ingrésalo a continuación. El sistema confrontará el resultado al confirmar.
          </p>
        </div>

        {/* Efectivo en mano */}
        <div className="bg-white rounded-3xl border-2 border-slate-200/90 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-slate-900 text-sm uppercase tracking-tight flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-700" />
              Efectivo Contado en Mano *
            </h3>
            <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
              Billetes y Monedas
            </span>
          </div>

          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black text-2xl">$</span>
            <input
              type="number"
              inputMode="decimal"
              step="0.05"
              placeholder="0.00"
              value={efectivo}
              onChange={e => setEfectivo(e.target.value)}
              className="w-full pl-10 pr-4 py-5 rounded-2xl border-2 border-slate-300 bg-slate-50/70 text-3xl font-black text-slate-900 text-center focus:outline-none focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-700 transition"
              autoFocus
            />
          </div>

          <p className="text-[11px] text-slate-500 text-center font-medium">
            Ingresa el total exacto que tienes en mano antes de pulsar confirmar.
          </p>
        </div>

        {/* Caja Común (Oficina Loja) — Información de Guía */}
        {cajaComunCount > 0 && cajaComunMonto > 0 && (
          <div className="bg-purple-50 rounded-2xl border border-purple-200 p-4 shadow-sm">
            <h3 className="font-bold text-purple-900 mb-1 text-xs uppercase tracking-wide">Caja Común (Boletería Terminal Loja)</h3>
            <p className="text-[11px] text-purple-700 mb-2">Boletos físicos vendidos en ventanilla antes de la salida:</p>
            <div className="flex justify-between items-center bg-white/70 p-2.5 rounded-xl border border-purple-200">
              <span className="text-xs text-purple-950 font-bold">{cajaComunCount} boletos emitidos en ventanilla</span>
              <span className="font-black text-base text-purple-900">${cajaComunMonto.toFixed(2)}</span>
            </div>
          </div>
        )}

        {/* Boton confirmar */}
        <div className="pt-2 space-y-2">
          <button
            onClick={handleConfirm}
            disabled={!efectivo || isNaN(efectivoNum) || efectivoNum < 0 || saving}
            className={`w-full py-5 rounded-2xl font-black text-xl flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer ${
              efectivo && !isNaN(efectivoNum) && efectivoNum >= 0 && !saving
                ? (esUltima ? 'bg-[#912D26] text-white shadow-lg shadow-red-900/20 hover:bg-[#7a241e]' : 'bg-emerald-700 text-white shadow-lg shadow-emerald-900/20 hover:bg-emerald-800')
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            {saving ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <ShieldCheck className="w-6 h-6" />
                <span>CONFIRMAR Y ASENTAR</span>
              </>
            )}
          </button>
          <p className="text-center text-xs text-slate-500 font-medium">
            {esUltima ? 'Al asentar se completará el turno y se confrontará la caja' : 'Al asentar se revelará el cuadre y se habilitará la siguiente frecuencia'}
          </p>
        </div>
      </div>
    </div>
  );
}
