'use client';

import { useState, useEffect, useCallback } from 'react';
import { type FrecuenciaEstado, type VTSession } from './types-boletos';
import { getVentasByFrecuencia } from '@/lib/indexeddb';
import { type ConnectionInfo } from '@/hooks/use-connection';
import { DollarSign, Check, ChevronLeft, AlertTriangle, TrendingDown, TrendingUp, Equal, Send, ArrowRight } from 'lucide-react';

interface Props {
  session: VTSession;
  estado: FrecuenciaEstado;
  connection: ConnectionInfo;
  esUltima: boolean;
  onArqueoConfirmado: () => void;
  onBack: () => void;
  onGoToSync: () => void;
}

export function ArqueoScreen({ session, estado, connection, esUltima, onArqueoConfirmado, onBack, onGoToSync }: Props) {
  const [ventas, setVentas] = useState<any[]>([]);
  const [efectivo, setEfectivo] = useState('');
  const [confirmado, setConfirmado] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadVentas = useCallback(async () => {
    const all = await getVentasByFrecuencia(estado.estadoId);
    const unsynced = all.filter(v => v.syncStatus === 'pending' || v.syncStatus === 'error');
    setVentas(unsynced);
  }, [estado.estadoId]);

  useEffect(() => { loadVentas(); }, [loadVentas]);

  const totalSistema = ventas.reduce((sum, v) => sum + v.cobrado, 0);
  const enteros = ventas.filter(v => v.pasajeroTipo !== 'media').length;
  const medias = ventas.filter(v => v.pasajeroTipo === 'media').length;
  const efectivoNum = parseFloat(efectivo) || 0;
  const diferencia = efectivoNum - totalSistema;
  const faltante = diferencia < 0;
  const sobrante = diferencia > 0;
  const cuadra = Math.abs(diferencia) < 0.01 && efectivoNum > 0;

  const handleConfirm = () => {
    setSaving(true);
    try {
      // Mark as cerrada in localStorage (synchronous, reliable)
      const fecha = new Date().toISOString().split('T')[0];
      const lsKey = `rg_estados_${session.vtCode}_${fecha}`;
      try {
        const raw = localStorage.getItem(lsKey);
        if (raw) {
          const all = JSON.parse(raw);
          const idx = all.findIndex((e: any) => e.estadoId === estado.estadoId);
          if (idx >= 0) {
            all[idx].estado = 'cerrada';
            localStorage.setItem(lsKey, JSON.stringify(all));
          }
        }
      } catch (e) { console.error('LS error:', e); }
      setConfirmado(true);
    } catch (err) {
      console.error('Error guardando arqueo:', err);
    } finally {
      setSaving(false);
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
          <p className="text-white/80 text-sm mb-6">{ventas.length} ventas · ${totalSistema.toFixed(2)} sistema · ${efectivoNum.toFixed(2)} efectivo</p>

          {cuadra && <p className="text-green-200 font-bold text-lg">CAJA CUADRADA</p>}
          {sobrante && <p className="text-green-200 font-bold text-lg">SOBRANTE: ${diferencia.toFixed(2)}</p>}
          {faltante && <p className="text-yellow-200 font-bold text-lg">FALTANTE: ${Math.abs(diferencia).toFixed(2)}</p>}

          {!esUltima && (
            <div className="mt-6 bg-white/20 rounded-2xl px-6 py-4 text-center">
              <p className="text-sm font-medium">Siguiente frecuencia habilitada</p>
            </div>
          )}

          {esUltima && (
            <div className="mt-6 bg-white/20 rounded-2xl px-6 py-4 text-center">
              <p className="text-sm font-medium">Todas las frecuencias completadas</p>
            </div>
          )}

          <div className="mt-8 w-full max-w-xs">
            {connection.pendingCount > 0 && connection.status !== 'offline' && (
              <button onClick={onGoToSync}
                className="w-full py-4 rounded-2xl bg-white text-[#912D26] font-black text-lg mb-3 flex items-center justify-center gap-2 active:scale-95">
                <Send className="w-5 h-5" /> SINCRONIZAR {connection.pendingCount} VENTAS
              </button>
            )}
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
      <div className="bg-[#3A3A3A] text-white px-4 py-3">
        <div className="flex items-center justify-between">
          <button onClick={onBack} className="text-gray-300"><ChevronLeft className="w-6 h-6" /></button>
          <div className="text-center">
            <h2 className="text-lg font-bold">Arqueo de Caja</h2>
            <p className="text-gray-300 text-xs">{estado.hora} — {estado.nombre}</p>
          </div>
          <div className="w-6" />
        </div>
      </div>

      {/* SYNC OBLIGATORIO banner - if online with pending ventas */}
      {connection.status !== 'offline' && connection.pendingCount > 0 && (
        <div className="mx-4 mt-3 bg-gradient-to-r from-orange-500 to-yellow-500 rounded-2xl p-3 flex items-center gap-3 shadow-md">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <Send className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-white font-black text-sm">SYNC OBLIGATORIO</p>
            <p className="text-white/80 text-xs">Tienes {connection.pendingCount} venta{connection.pendingCount !== 1 ? 's' : ''} sin sincronizar. Debes sincronizar antes del arqueo.</p>
          </div>
          <button onClick={onGoToSync} className="bg-white text-orange-600 font-black text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 active:scale-95 shadow-sm flex-shrink-0">
            <Send className="w-4 h-4" /> SYNC
          </button>
        </div>
      )}

      <div className="flex-1 px-4 py-4 space-y-4 overflow-y-auto">
        {/* Resumen sistema */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <h3 className="font-bold text-[#3A3A3A] mb-3 text-sm uppercase">Lo que dice el sistema</h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center py-2 border-b border-gray-50">
              <span className="text-sm text-gray-600">Ventas totales</span>
              <span className="font-bold text-[#3A3A3A]">{ventas.length}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-50">
              <span className="text-sm text-gray-600">Enteros</span>
              <span className="font-bold text-[#3A3A3A]">{enteros}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-50">
              <span className="text-sm text-gray-600">Medias</span>
              <span className="font-bold text-[#3A3A3A]">{medias}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-gray-600 font-semibold">TOTAL RECAUDADO</span>
              <span className="font-black text-lg text-[#912D26]">${totalSistema.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Efectivo en mano */}
        <div className="bg-white rounded-2xl border-2 border-[#912D26]/20 p-4 shadow-sm">
          <h3 className="font-bold text-[#3A3A3A] mb-3 text-sm uppercase flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-[#912D26]" /> Efectivo en mano
          </h3>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-black text-2xl">$</span>
            <input
              type="number"
              inputMode="decimal"
              step="0.05"
              placeholder="0.00"
              value={efectivo}
              onChange={e => setEfectivo(e.target.value)}
              className="w-full pl-10 pr-4 py-5 rounded-2xl border-2 border-gray-200 bg-gray-50 text-3xl font-black text-[#3A3A3A] text-center focus:outline-none focus:ring-2 focus:ring-[#912D26]/30 focus:border-[#912D26]"
              autoFocus
            />
          </div>
        </div>

        {/* Resultado del arqueo */}
        {efectivoNum > 0 && (
          <div className={`rounded-2xl border-2 p-4 ${
            cuadra ? 'bg-green-50 border-green-300' :
            faltante ? 'bg-red-50 border-red-300' :
            'bg-blue-50 border-blue-300'
          }`}>
            <div className="flex items-center justify-center gap-3">
              {cuadra && <Equal className="w-6 h-6 text-green-600" />}
              {faltante && <TrendingDown className="w-6 h-6 text-red-600" />}
              {sobrante && <TrendingUp className="w-6 h-6 text-blue-600" />}
              <div className="text-center">
                <div className="text-sm font-semibold">
                  {cuadra ? 'CAJA CUADRADA' : faltante ? 'FALTANTE' : 'SOBRANTE'}
                </div>
                <div className={`text-2xl font-black ${
                  cuadra ? 'text-green-700' :
                  faltante ? 'text-red-700' :
                  'text-blue-700'
                }`}>
                  {diferencia > 0 ? '+' : ''}{diferencia.toFixed(2)}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Efectivo: ${efectivoNum.toFixed(2)} — Sistema: ${totalSistema.toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Advertencia faltante */}
        {faltante && efectivoNum > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-3 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-yellow-700">
              <p className="font-bold">Faltante detectado</p>
              <p className="mt-0.5">Verifica el conteo del efectivo. Si es correcto, confirma el arqueo igualmente.</p>
            </div>
          </div>
        )}

        {/* Detalle de ventas */}
        {ventas.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <h3 className="font-bold text-[#3A3A3A] mb-2 text-sm">Detalle de ventas</h3>
            <div className="space-y-1 max-h-36 overflow-y-auto">
              {ventas.map((v, i) => (
                <div key={v.id} className="flex items-center justify-between py-1 px-2 bg-gray-50 rounded-lg text-xs">
                  <span className="text-gray-400 font-bold w-5">{i + 1}</span>
                  <span className="text-[#3A3A3A] flex-1">{v.parada} <span className="text-gray-400">{v.pasajeroTipo === 'media' ? '(M)' : '(E)'}</span></span>
                  <span className="font-bold text-[#912D26]">${v.cobrado.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Boton confirmar */}
        <button
          onClick={handleConfirm}
          disabled={!efectivo || efectivoNum <= 0 || saving}
          className={`w-full py-5 rounded-2xl font-black text-xl flex items-center justify-center gap-2 transition-all active:scale-95 ${
            efectivo && efectivoNum > 0 && !saving
              ? (esUltima ? 'bg-[#912D26] text-white shadow-lg shadow-red-200' : 'bg-green-600 text-white shadow-lg shadow-green-200')
              : 'bg-[#D6D6D6] text-gray-400 cursor-not-allowed'
          }`}
        >
          {saving ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <Check className="w-6 h-6" />
              CONFIRMAR ARQUEO
            </>
          )}
        </button>
        <p className="text-center text-xs text-gray-400">
          {esUltima ? 'Al confirmar se completa el turno' : 'Al confirmar se habilita la siguiente frecuencia'}
        </p>
      </div>
    </div>
  );
}
