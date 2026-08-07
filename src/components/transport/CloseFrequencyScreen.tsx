'use client';

import { useState, useEffect, useCallback } from 'react';
import { type FrecuenciaEstado, type VTSession } from './types-boletos';
import { getVentasByFrecuencia } from '@/lib/indexeddb';
import { CheckCircle2, ChevronLeft, Ticket, DollarSign, Send, Wifi, WifiOff, Clock } from 'lucide-react';
import { type ConnectionInfo } from '@/hooks/use-connection';

interface Props {
  session: VTSession;
  estado: FrecuenciaEstado;
  connection: ConnectionInfo;
  onClosed: () => void;
  onBack: () => void;
  onGoToSync: () => void;
}

export function CloseFrequencyScreen({ session, estado, connection, onClosed, onBack, onGoToSync }: Props) {
  const [ventas, setVentas] = useState<any[]>([]);
  const [confirmClose, setConfirmClose] = useState(false);

  const loadVentas = useCallback(async () => {
    const all = await getVentasByFrecuencia(estado.estadoId);
    const unsynced = all.filter(v => v.syncStatus === 'pending' || v.syncStatus === 'error');
    setVentas(unsynced);
  }, [estado.estadoId]);

  useEffect(() => { loadVentas(); }, [loadVentas]);

  const totalRecaudado = ventas.reduce((sum, v) => sum + v.cobrado, 0);
  const enteros = ventas.filter(v => v.pasajeroTipo !== 'media').length;
  const medias = ventas.filter(v => v.pasajeroTipo === 'media').length;
  const tarifaOficialTotal = ventas.reduce((sum, v) => sum + v.tarifaOficial, 0);
  const diferencia = totalRecaudado - tarifaOficialTotal;

  const handleClose = () => {
    onClosed();
  };

  return (
    <div className="flex flex-col min-h-[100dvh] bg-gray-50">
      {/* Barra de conexión */}
      <div className={`${connection.bgColor} px-4 py-1.5 flex items-center justify-center gap-2 text-xs font-medium ${connection.color}`}>
        <span>{connection.icon}</span>
        <span>{connection.label}</span>
        {connection.pendingCount > 0 && (
          <span className="bg-white/60 px-1.5 py-0.5 rounded-full text-[10px] font-bold">{connection.pendingCount} ventas pendientes</span>
        )}
      </div>

      {/* Header */}
      <div className="bg-[#3A3A3A] text-white px-4 py-3">
        <div className="flex items-center justify-between">
          <button onClick={onBack} className="text-gray-300"><ChevronLeft className="w-6 h-6" /></button>
          <div className="text-center">
            <h2 className="text-lg font-bold">Liquidacion</h2>
            <p className="text-gray-300 text-xs">{estado.hora} — {estado.nombre}</p>
          </div>
          <div className="w-6" />
        </div>
      </div>

      <div className="flex-1 px-4 py-4 space-y-4 overflow-y-auto">
        {/* Resumen principal */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#912D26]/5 rounded-xl p-3 text-center">
              <Ticket className="w-5 h-5 text-[#912D26] mx-auto mb-1" />
              <div className="text-2xl font-black text-[#3A3A3A]">{ventas.length}</div>
              <div className="text-[10px] text-gray-500 uppercase font-semibold">Total Ventas</div>
            </div>
            <div className="bg-green-50 rounded-xl p-3 text-center">
              <DollarSign className="w-5 h-5 text-green-600 mx-auto mb-1" />
              <div className="text-2xl font-black text-green-700">${totalRecaudado.toFixed(2)}</div>
              <div className="text-[10px] text-gray-500 uppercase font-semibold">Recaudado</div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-3">
            <div className="bg-gray-50 rounded-lg p-2 text-center">
              <div className="text-sm font-bold text-[#3A3A3A]">{enteros}</div>
              <div className="text-[10px] text-gray-500">Enteros</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-2 text-center">
              <div className="text-sm font-bold text-[#3A3A3A]">{medias}</div>
              <div className="text-[10px] text-gray-500">Medias</div>
            </div>
            <div className={`rounded-lg p-2 text-center ${diferencia > 0 ? 'bg-amber-50' : 'bg-gray-50'}`}>
              <div className={`text-sm font-bold ${diferencia > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
                {diferencia > 0 ? '-$' : ''}{Math.abs(diferencia).toFixed(2)}
              </div>
              <div className="text-[10px] text-gray-500">Diferencia</div>
            </div>
          </div>
        </div>

        {/* Detalle de ventas */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <h3 className="font-bold text-[#3A3A3A] mb-2 text-sm">Detalle</h3>
          {ventas.length === 0 ? (
            <p className="text-gray-400 text-xs text-center py-4">Sin ventas registradas</p>
          ) : (
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {ventas.map((v, i) => (
                <div key={v.id} className="flex items-center justify-between py-1.5 px-2 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-400 w-5">{i + 1}</span>
                    <div>
                      <div className="text-xs font-medium text-[#3A3A3A]">{v.parada}</div>
                      <div className="text-[10px] text-gray-400">{v.hora} {v.pasajeroTipo === 'media' ? '(M)' : '(E)'}</div>
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-2">
                    <span className="text-[10px] text-gray-400 line-through">${v.tarifaOficial.toFixed(2)}</span>
                    <span className="font-bold text-[#912D26]">${v.cobrado.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info de conexión */}
        <div className={`rounded-2xl border p-3 flex items-center gap-3 ${connection.status === 'online' || connection.status === 'has_pending' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          {connection.status === 'online' || connection.status === 'has_pending' ? (
            <Wifi className="w-5 h-5 text-green-600 flex-shrink-0" />
          ) : (
            <WifiOff className="w-5 h-5 text-red-600 flex-shrink-0" />
          )}
          <div className="text-xs">
            {connection.status === 'online' ? (
              <span className="text-green-700 font-medium">Conectado — puedes sincronizar al cerrar</span>
            ) : connection.status === 'has_pending' ? (
              <span className="text-blue-700 font-medium">Hay ventas pendientes por sincronizar</span>
            ) : (
              <span className="text-red-700 font-medium">Sin conexion — las ventas se guardan localmente y se sincronizaran al tener internet</span>
            )}
          </div>
        </div>

        {/* Botones de acción */}
        {!confirmClose ? (
          <div className="space-y-3">
            {ventas.length > 0 && connection.pendingCount > 0 && (
              <button onClick={onGoToSync}
                disabled={connection.status === 'offline'}
                className={`w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 active:scale-[0.98] ${
                  connection.status === 'offline'
                    ? 'bg-gray-200 text-gray-400'
                    : 'bg-green-600 text-white shadow-lg shadow-green-200'
                }`}>
                <Send className="w-5 h-5" />
                {connection.status === 'offline'
                  ? 'SIN INTERNET'
                  : `SINCRONIZAR ${connection.pendingCount} VENTAS`}
              </button>
            )}
            <button onClick={() => setConfirmClose(true)}
              className="w-full py-5 rounded-2xl bg-[#912D26] text-white font-black text-lg flex items-center justify-center gap-2 shadow-lg shadow-red-200 active:scale-95">
              <CheckCircle2 className="w-6 h-6" /> CERRAR FRECUENCIA
            </button>
          </div>
        ) : (
          <div className="bg-[#912D26] rounded-2xl p-5 space-y-4">
            <div className="text-white text-center">
              <p className="text-lg font-bold">Confirmar cierre</p>
              <p className="text-red-100 text-sm mt-1">
                {ventas.length} ventas · ${totalRecaudado.toFixed(2)} recaudado
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirmClose(false)}
                className="flex-1 py-3 rounded-xl bg-white/20 text-white font-bold active:scale-95">
                Cancelar
              </button>
              <button onClick={handleClose}
                className="flex-1 py-3 rounded-xl bg-white text-[#912D26] font-black active:scale-95">
                CONFIRMAR
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
