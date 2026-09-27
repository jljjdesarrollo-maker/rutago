'use client';

import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  ArrowUpCircle, 
  ArrowDownCircle,
  Database,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  getSyncDiagnosticInfo, 
  getMantenimientoOutbox, 
  syncMantenimientoBidireccional, 
  flushMantenimientoOutbox,
  type SyncDiagnosticInfo,
  type OutboxItem 
} from '@/lib/mantenimiento-sync';
import { getActiveBusId } from '@/lib/fleet-storage';
import { useToast } from '@/hooks/use-toast';

interface Props {
  className?: string;
  compactBadgeOnly?: boolean;
}

export function MantenimientoSyncDiagnosticModal({
  isOpen,
  onClose,
  busId,
}: {
  isOpen: boolean;
  onClose: () => void;
  busId: string;
}) {
  const { toast } = useToast();
  const [isOnline, setIsOnline] = useState<boolean>(() => typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [diagInfo, setDiagInfo] = useState<SyncDiagnosticInfo>(() => getSyncDiagnosticInfo());
  const [outbox, setOutbox] = useState<OutboxItem[]>(() => getMantenimientoOutbox());
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    const handleDiag = (e: any) => setDiagInfo(e.detail || getSyncDiagnosticInfo());
    const handleOutbox = () => setOutbox(getMantenimientoOutbox());

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('rg_mantenimiento_diagnostic_updated', handleDiag);
    window.addEventListener('rg_mantenimiento_outbox_updated', handleOutbox);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('rg_mantenimiento_diagnostic_updated', handleDiag);
      window.removeEventListener('rg_mantenimiento_outbox_updated', handleOutbox);
    };
  }, []);

  const handleForzarSincronizacion = async () => {
    setIsSyncing(true);
    try {
      const res = await syncMantenimientoBidireccional(busId);
      setDiagInfo(getSyncDiagnosticInfo());
      setOutbox(getMantenimientoOutbox());
      toast({
        title: '✅ Sincronización Completada',
        description: `${res.uploaded} servicio(s) subidos, ${res.downloaded} comprobantes en nube.`,
      });
    } catch (err: any) {
      toast({
        title: 'Fallo al sincronizar',
        description: err?.message || 'Error de conexión con el servidor central.',
        variant: 'destructive',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 text-slate-100 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl space-y-0">
        {/* Cabecera */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white">Consola de Diagnóstico Sync</h3>
              <p className="text-[10px] text-slate-400">Estado de red y persistencia offline/online</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Contenido Principal */}
        <div className="p-4 space-y-3.5 max-h-[75vh] overflow-y-auto text-xs">
          {/* Tarjeta de Estado de Conexión */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center gap-2.5">
              {isOnline ? (
                <Wifi className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <WifiOff className="w-5 h-5 text-rose-400 shrink-0" />
              )}
              <div>
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Conectividad</span>
                <span className={`text-xs font-black ${isOnline ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {isOnline ? 'En Línea (Online)' : 'Sin Internet (Offline)'}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center gap-2.5">
              <Database className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Cola de Salida</span>
                <span className="text-xs font-black text-amber-300">
                  {outbox.length} {outbox.length === 1 ? 'pendiente' : 'pendientes'}
                </span>
              </div>
            </div>
          </div>

          {/* Última Sincronización */}
          <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400 font-bold flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-500" /> Última Sincronización Nube:
              </span>
              <span className="font-bold text-slate-200">
                {diagInfo.lastSyncTimestamp 
                  ? new Date(diagInfo.lastSyncTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                  : 'Sin registros'}
              </span>
            </div>

            <div className="text-[11px] text-slate-300 flex items-center gap-1.5 pt-0.5">
              {diagInfo.lastSyncSuccess ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              )}
              <span className="truncate">{diagInfo.lastSyncMessage || 'Sistema operativo'}</span>
            </div>
          </div>

          {/* Resumen de Flujo de Datos */}
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-500/20 text-emerald-300 flex items-center gap-2">
              <ArrowUpCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <span className="text-[9px] text-emerald-500 block uppercase font-bold">Subidos</span>
                <span className="font-black text-sm">{diagInfo.lastUploadedCount || 0}</span>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-blue-950/30 border border-blue-500/20 text-blue-300 flex items-center gap-2">
              <ArrowDownCircle className="w-4 h-4 text-blue-400 shrink-0" />
              <div>
                <span className="text-[9px] text-blue-500 block uppercase font-bold">Comprobantes Nube</span>
                <span className="font-black text-sm">{diagInfo.lastDownloadedCount || 0}</span>
              </div>
            </div>
          </div>

          {/* Listado de Ítems en Cola si existen */}
          {outbox.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[10px] uppercase font-black tracking-wider text-amber-400 block">
                Detalle de Cola Retenida Localmente ({outbox.length}):
              </span>
              <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                {outbox.map((it, idx) => (
                  <div key={it.id || idx} className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-[10px] space-y-0.5">
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-amber-300 truncate max-w-[200px]">
                        {it.payload?.description || it.payload?.estacionNombre || it.tipo}
                      </span>
                      <Badge className="text-[8px] bg-slate-800 text-slate-300 border-slate-700">
                        {it.intentos || 0} reintentos
                      </Badge>
                    </div>
                    <div className="text-slate-500 text-[9px] flex items-center justify-between">
                      <span>Monto: ${it.payload?.totalAmount || it.payload?.costoTotal || 0}</span>
                      <span>{it.payload?.expenseDate || it.payload?.fecha || 'Fecha N/A'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Pie y Acciones */}
        <div className="p-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xs h-9"
          >
            Cerrar
          </Button>

          <Button
            type="button"
            disabled={isSyncing || !isOnline}
            onClick={handleForzarSincronizacion}
            className="h-9 text-xs font-black bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-1.5 cursor-pointer shadow-md"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Sincronizando...' : 'Forzar Sincronización'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function MantenimientoSyncChip({
  busId,
  className = '',
}: {
  busId: string;
  className?: string;
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean>(() => typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [outboxCount, setOutboxCount] = useState<number>(() => getMantenimientoOutbox().length);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    const handleOutbox = (e: any) => setOutboxCount(e.detail?.count ?? getMantenimientoOutbox().length);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('rg_mantenimiento_outbox_updated', handleOutbox);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('rg_mantenimiento_outbox_updated', handleOutbox);
    };
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[9px] font-black cursor-pointer transition-all border ${
          !isOnline
            ? 'bg-rose-950/70 border-rose-500/40 text-rose-300 hover:bg-rose-900/80'
            : outboxCount > 0
            ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 hover:bg-amber-500/30 animate-pulse'
            : 'bg-emerald-950/60 border-emerald-500/30 text-emerald-400 hover:bg-emerald-900/50'
        } ${className}`}
        title="Toca para abrir la Consola de Diagnóstico de Sincronización"
      >
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            !isOnline
              ? 'bg-rose-400'
              : outboxCount > 0
              ? 'bg-amber-400 animate-ping'
              : 'bg-emerald-400 animate-pulse'
          }`}
        />
        <span>
          {!isOnline ? 'Offline' : outboxCount > 0 ? `${outboxCount} en cola` : 'Sync OK'}
        </span>
      </button>

      <MantenimientoSyncDiagnosticModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        busId={busId}
      />
    </>
  );
}
