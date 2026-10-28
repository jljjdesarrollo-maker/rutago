'use client';

import { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Trash2, ChevronRight, ChevronDown, ChevronUp, Calendar, TrendingUp, TrendingDown, Loader2, Download, CloudOff, UploadCloud, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { type SavedRecord } from './types';
import {
  getLocalPendingSavedRecords,
  syncAllPendingArqueos,
  markArqueoAsSynced,
  removePendingArqueo,
} from '@/lib/arqueos-sync';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { getActiveBusId } from '@/lib/fleet-storage';

type FilterType = 'todos' | 'hoy' | 'semana' | 'mes';

interface HistoryScreenProps {
  isAdmin: boolean;
  userRole?: string;
  busId?: string;
  socioId?: string;
  onBack: () => void;
  onViewRecord: (record: SavedRecord) => void;
}

function getDateRange(filter: FilterType, monthValue?: string): { from: string; to: string } {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const todayStr = `${yyyy}-${mm}-${dd}`;

  switch (filter) {
    case 'hoy':
      return { from: todayStr, to: todayStr };
    case 'semana': {
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 6);
      const wy = weekAgo.getFullYear();
      const wm = String(weekAgo.getMonth() + 1).padStart(2, '0');
      const wd = String(weekAgo.getDate()).padStart(2, '0');
      return { from: `${wy}-${wm}-${wd}`, to: todayStr };
    }
    case 'mes': {
      if (monthValue) {
        // monthValue viene en formato HTML standard "YYYY-MM"
        const [yearStr, monthStr] = monthValue.split('-');
        const y = parseInt(yearStr, 10);
        const m = parseInt(monthStr, 10);
        // new Date(y, m, 0).getDate() da el ultimo dia del mes m en anio y
        const daysInMonth = new Date(y, m, 0).getDate();
        const mmFormatted = String(m).padStart(2, '0');
        return {
          from: `${y}-${mmFormatted}-01`,
          to: `${y}-${mmFormatted}-${String(daysInMonth).padStart(2, '0')}`,
        };
      }
      // Si no hay mes seleccionado, usar el mes actual completo hasta el fin de mes
      const daysInCurrentMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
      return {
        from: `${yyyy}-${mm}-01`,
        to: `${yyyy}-${mm}-${String(daysInCurrentMonth).padStart(2, '0')}`,
      };
    }
    case 'todos': {
      // Máximo 90 días (3 meses) para garantizar ultra rapidez en smartphones
      const ninetyDaysAgo = new Date(today);
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 89);
      const ny = ninetyDaysAgo.getFullYear();
      const nm = String(ninetyDaysAgo.getMonth() + 1).padStart(2, '0');
      const nd = String(ninetyDaysAgo.getDate()).padStart(2, '0');
      return { from: `${ny}-${nm}-${nd}`, to: todayStr };
    }
    default:
      return { from: '', to: '' };
  }
}

export function HistoryScreen({
  isAdmin,
  userRole,
  busId: propBusId,
  socioId: propSocioId,
  onBack,
  onViewRecord,
}: HistoryScreenProps) {
  const isChofer = userRole === 'CONDUCTOR';
  const isSocio = Boolean(isAdmin || userRole === 'SOCIO' || userRole === 'ADMIN');
  const [expandedRecords, setExpandedRecords] = useState<Record<string, boolean>>({});
  const toggleExpandRecord = (id: string) => {
    setExpandedRecords(prev => ({ ...prev, [id]: !prev[id] }));
  };
  const [resolvedBusId, setResolvedBusId] = useState<string | undefined>(propBusId);

  useEffect(() => {
    if (propBusId) {
      setResolvedBusId(propBusId);
      return;
    }
    // Blindaje Multi-Tenant Defensivo: Si no vino busId pero sí socioId, resolver unidad del socio
    if (propSocioId && propSocioId !== "TODOS" && typeof window !== "undefined" && navigator.onLine) {
      fetch(`/api/buses?socioId=${propSocioId}`)
        .then((r) => r.json())
        .then((d) => {
          const list = d?.data || d;
          if (Array.isArray(list) && list.length > 0) {
            setResolvedBusId(list[0].id || list[0].numeroDisco);
          }
        })
        .catch(() => {});
    }
  }, [propBusId, propSocioId]);

  const effectiveBusId = resolvedBusId || propBusId || (typeof window !== 'undefined' ? getActiveBusId() : undefined);
  const [allRecords, setAllRecords] = useState<SavedRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('semana');
  const currentMonthStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const [monthValue, setMonthValue] = useState<string>(currentMonthStr);
  const [exporting, setExporting] = useState(false);
  const [syncingOffline, setSyncingOffline] = useState(false);

  const dateRange = useMemo(() => {
    if (isChofer) {
      return { from: '', to: '' };
    }
    return getDateRange(filter, monthValue);
  }, [filter, monthValue, isChofer]);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const localPending = getLocalPendingSavedRecords(effectiveBusId);

      const params = new URLSearchParams();
      if (isChofer) {
        // En la interfaz del chofer: traer de inmediato los ultimos 7 turnos sin rangos ni filtros
        params.set('limit', '7');
      } else {
        if (dateRange.from) params.set('from', dateRange.from);
        if (dateRange.to) params.set('to', dateRange.to);
        params.set('limit', '90');
      }
      params.set('include', 'trips');

      // Aislamiento Multi-Tenant por Unidad y Socio
      if (effectiveBusId && effectiveBusId !== 'TODOS') {
        params.set('busId', effectiveBusId);
      }
      if (propSocioId && propSocioId !== 'TODOS') {
        params.set('socioId', propSocioId);
      }

      const query = params.toString() ? `?${params.toString()}` : '';
      let cloudRecords: SavedRecord[] = [];
      try {
        const res = await fetch(`/api/records${query}`);
        if (res.ok) {
          const data = await res.json();
          let recordsList: SavedRecord[] = Array.isArray(data) ? data : [];
          if ((userRole === 'AYUDANTE' || isChofer) && effectiveBusId && effectiveBusId !== 'TODOS') {
            const cleanDisco = effectiveBusId.replace(/^BUS-/i, '').replace(/\D/g, '').padStart(2, '0');
            recordsList = recordsList.filter(r => {
              const rDisco = (r.numeroDisco || (r.conductor?.match(/BUS-(\d+)/i)?.[1]) || '').padStart(2, '0');
              return !rDisco || rDisco === cleanDisco || r.busId === effectiveBusId;
            });
          }
          cloudRecords = recordsList;
        }
      } catch (networkErr) {
        console.warn('Sin conexión o error al consultar /api/records, usando datos locales:', networkErr);
      }

      // Fusión inteligente: Filtrar los locales pendientes que aún no existan en cloudRecords
      const unmergedPending = localPending.filter(pendingItem => {
        // Si el registro ya fue consolidado en la nube con la misma fecha y vtCode/conductor
        const yaEnNube = cloudRecords.some(cr =>
          cr.date === pendingItem.date &&
          (cr.vtCode === pendingItem.vtCode || (!pendingItem.vtCode && cr.conductor === pendingItem.conductor))
        );
        if (yaEnNube && pendingItem._offlineKey) {
          markArqueoAsSynced(pendingItem._offlineKey);
          return false;
        }

        // Aplicar filtro de fecha activo
        if (dateRange.from && dateRange.to) {
          if (pendingItem.date < dateRange.from || pendingItem.date > dateRange.to) {
            return false;
          }
        }
        return true;
      });

      // Presentar primero los locales pendientes (más recientes) y luego los de la nube
      setAllRecords([...unmergedPending, ...cloudRecords]);
    } catch {
      console.error('Error loading records');
      const localPending = getLocalPendingSavedRecords(effectiveBusId);
      setAllRecords(localPending);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [dateRange, isChofer, effectiveBusId, propSocioId]);

  // Escuchar eventos de sincronización para actualizar de forma reactiva
  useEffect(() => {
    const handleRefresh = () => fetchRecords();
    window.addEventListener('rutago_arqueos_synced', handleRefresh);
    window.addEventListener('rutago_pending_arqueos_changed', handleRefresh);
    return () => {
      window.removeEventListener('rutago_arqueos_synced', handleRefresh);
      window.removeEventListener('rutago_pending_arqueos_changed', handleRefresh);
    };
  }, [effectiveBusId, dateRange, isChofer]);

  const handleSyncOffline = async () => {
    setSyncingOffline(true);
    try {
      await syncAllPendingArqueos();
      await fetchRecords();
    } catch (err) {
      console.error('Error al sincronizar arqueos:', err);
    } finally {
      setSyncingOffline(false);
    }
  };

  const filteredRecords = useMemo(() => {
    return allRecords;
  }, [allRecords]);

  const pendingOfflineRecords = useMemo(() => {
    return allRecords.filter(r => r._isOfflinePending);
  }, [allRecords]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.startsWith('arqueo_general_') || deleteTarget.startsWith('offline_')) {
        removePendingArqueo(deleteTarget);
      } else {
        await fetch(`/api/records/${deleteTarget}`, { method: 'DELETE' });
      }
      fetchRecords();
    } catch {
      console.error('Error deleting record');
    }
    setDeleteTarget(null);
  };

  const handleExportXLS = async () => {
    setExporting(true);
    try {
      const { generateXLS } = await import('@/lib/generate-xls');
      let filename = 'liquidacion';
      if (filter === 'hoy') filename += '_hoy';
      else if (filter === 'semana') filename += '_semana';
      else if (filter === 'mes') {
        const monthNames = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
        if (monthValue) {
          const [y, m] = monthValue.split('-');
          filename += `_${monthNames[parseInt(m, 10) - 1]}_${y}`;
        } else {
          const today = new Date();
          filename += `_${monthNames[today.getMonth()]}_${today.getFullYear()}`;
        }
      } else {
        filename += '_todos';
      }
      await generateXLS(filteredRecords, filename);
    } catch (err) {
      console.error('Error exporting XLS:', err);
    } finally {
      setExporting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  };

  const filterButtons: { key: FilterType; label: string }[] = [
    { key: 'todos', label: '3 Meses' },
    { key: 'hoy', label: 'Hoy' },
    { key: 'semana', label: 'Semana' },
    { key: 'mes', label: 'Mes' },
  ];

  if (loading) {
    return (
      <div className="flex flex-col min-h-[100dvh] bg-white">
        <header className="flex items-center gap-3 p-4 border-b border-[#D6D6D6]">
          <Button variant="ghost" size="icon" onClick={onBack} className="rounded-xl text-[#3A3A3A]">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1 flex items-center justify-between min-w-0">
            <h1 className="text-lg font-semibold text-[#3A3A3A] truncate">
              {isAdmin && !effectiveBusId ? 'Historial Completo' : isChofer ? 'Últimos Registros (Chofer)' : 'Liquidaciones de Ruta'}
            </h1>
            {effectiveBusId && effectiveBusId !== 'TODOS' && (
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                Bus {effectiveBusId.replace(/^BUS-/i, '').padStart(2, '0')}
              </span>
            )}
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-[#912D26] animate-spin" />
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#FAFAFA]">
      <header className="sticky top-0 z-10 bg-white border-b border-[#D6D6D6] px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="rounded-xl text-[#3A3A3A]">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1 flex items-center justify-between min-w-0">
          <h1 className="text-lg font-semibold text-[#3A3A3A] truncate">
            {isAdmin && !effectiveBusId ? 'Historial Completo' : isChofer ? 'Últimos Registros (Chofer)' : 'Liquidaciones de Ruta'}
          </h1>
          {effectiveBusId && effectiveBusId !== 'TODOS' && (
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
              Bus {effectiveBusId.replace(/^BUS-/i, '').padStart(2, '0')}
            </span>
          )}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-6">
        {/* Filter bar: Solo para Socio / Administrador. Para Chofer se oculta todo filtro y se muestra vista directa */}
        {!isChofer ? (
          <div className="px-4 pt-4 pb-2 space-y-3">
            <div className="flex gap-2">
              {filterButtons.map(fb => (
                <button
                  key={fb.key}
                  onClick={() => { setFilter(fb.key); if (fb.key === 'mes' && !monthValue) setMonthValue(currentMonthStr); }}
                  className={`flex-1 h-9 rounded-xl text-xs font-semibold transition-all active:scale-95 ${
                    filter === fb.key
                      ? 'bg-[#912D26] text-white shadow-sm'
                      : 'bg-[#F5F5F5] text-[#3A3A3A]/60 hover:bg-[#E8E8E8]'
                  }`}
                >
                  {fb.label}
                </button>
              ))}
            </div>

            {/* Month picker (only when "Mes" selected) */}
            {filter === 'mes' && (
              <div className="flex items-center gap-2">
                <Input
                  type="month"
                  value={monthValue}
                  onChange={e => setMonthValue(e.target.value)}
                  className="flex-1 h-10 rounded-xl border-[#D6D6D6] text-sm"
                />
              </div>
            )}

            {/* Results count + Export button */}
            <div className="flex items-center justify-between">
              <p className="text-xs text-[#3A3A3A]/50">
                {filteredRecords.length} registro{filteredRecords.length !== 1 ? 's' : ''}
                {filter === 'todos' && dateRange.from ? ` (${formatDate(dateRange.from)} al ${formatDate(dateRange.to)} - máx 90 días)` : filter !== 'todos' && dateRange.from ? ` (${formatDate(dateRange.from)} al ${formatDate(dateRange.to)})` : ''}
              </p>
              {isAdmin && filteredRecords.length > 0 && (
                <Button
                  onClick={handleExportXLS}
                  disabled={exporting}
                  size="sm"
                  className="h-8 rounded-lg text-xs bg-[#3A3A3A] hover:bg-[#2A2A2A] text-white"
                >
                  {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Download className="w-3.5 h-3.5 mr-1" />}
                  {exporting ? 'Exportando...' : 'Exportar XLS'}
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="px-4 pt-3 pb-1">
            <div className="flex items-center justify-between bg-white px-3.5 py-2.5 rounded-2xl border border-gray-200 shadow-2xs">
              <div>
                <p className="text-xs font-bold text-[#3A3A3A]">
                  Últimos 7 días de trabajo
                </p>
                <p className="text-[10px] text-gray-500">
                  Vista rápida directa de liquidaciones de ruta
                </p>
              </div>
              <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                {filteredRecords.length} {filteredRecords.length === 1 ? 'registro' : 'registros'}
              </span>
            </div>
          </div>
        )}

        {/* Banner destacado de Arqueos Pendientes en este teléfono */}
        {pendingOfflineRecords.length > 0 && (
          <div className="mx-4 mb-3 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-300 shadow-2xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 rounded-xl bg-amber-100 text-amber-800 shrink-0">
                <CloudOff className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-amber-950 truncate">
                  {pendingOfflineRecords.length} arqueo(s) guardado(s) en el teléfono
                </p>
                <p className="text-[11px] text-amber-800/80">
                  Pendiente de sincronizar a la nube de RutaGo
                </p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={handleSyncOffline}
              disabled={syncingOffline}
              className="h-8 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shrink-0 flex items-center gap-1.5 shadow-2xs active:scale-95 transition-all"
            >
              {syncingOffline ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <UploadCloud className="w-3.5 h-3.5" />
              )}
              {syncingOffline ? 'Subiendo...' : 'Subir a la Nube'}
            </Button>
          </div>
        )}

        {/* Records list */}
        {filteredRecords.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6">
            <Calendar className="w-12 h-12 text-[#D6D6D6] mb-4" />
            <p className="text-[#3A3A3A]/60 font-medium">Sin registros en este periodo</p>
            <p className="text-sm text-[#3A3A3A]/40 mt-1">Prueba con otro filtro</p>
          </div>
        ) : (
          <div className="px-4 py-2 space-y-3">
            {filteredRecords.map(record => {
              const tripsDiff = (record.trips || []).reduce((acc, t) => acc + ((t.efectivoReal || 0) - (t.income || 0)), 0);
              const netDiff = parseFloat((tripsDiff + (record.sobrante || 0)).toFixed(2));
              const isExpanded = Boolean(expandedRecords[record.id]);

              return (
              <Card
                key={record.id}
                className={`rounded-2xl border bg-white cursor-pointer hover:shadow-md transition-shadow ${
                  record._isOfflinePending ? 'border-amber-300 ring-1 ring-amber-300/50 bg-amber-50/20' : 'border-[#D6D6D6]'
                }`}
                onClick={() => onViewRecord(record)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <Calendar className="w-4 h-4 text-[#912D26]" />
                        <span className="font-semibold text-[#3A3A3A]">{formatDate(record.date)}</span>
                        {record._isOfflinePending && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1 shadow-2xs">
                            <CloudOff className="w-3 h-3 text-amber-600" />
                            Guardado en Teléfono (Pendiente)
                          </span>
                        )}
                        {record.km && (
                          <span className="text-xs text-[#3A3A3A]/40">• {record.km} km</span>
                        )}
                        {isSocio && (
                          Math.abs(netDiff) < 0.01 ? (
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                              🟢 Cuadrado $0.00
                            </span>
                          ) : netDiff < 0 ? (
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
                              ⚠️ Faltante: -${Math.abs(netDiff).toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                              🔵 Sobrante: +${netDiff.toFixed(2)}
                            </span>
                          )
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-sm">
                        <div className="flex items-center gap-1">
                          <TrendingUp className="w-3.5 h-3.5 text-[#3A3A3A]" />
                          <span className="text-[#3A3A3A]/70">${record.production.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <TrendingDown className="w-3.5 h-3.5 text-red-500" />
                          <span className="text-[#3A3A3A]/70">${record.totalGastos.toFixed(2)}</span>
                        </div>
                        <span className={`font-bold ${record.entregaAyudante >= 0 ? 'text-[#912D26]' : 'text-red-600'}`}>
                          {record.entregaAyudante >= 0 ? '+' : ''}${record.entregaAyudante.toFixed(2)}
                        </span>
                      </div>
                      <p className="text-xs text-[#3A3A3A]/40 mt-1">
                        {record.trips.length} frec. {record.conductor ? `• ${record.conductor}` : ''}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <ChevronRight className="w-5 h-5 text-[#D6D6D6]" />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-[#3A3A3A]/40 hover:text-red-500"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget(record.id);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Acordeón Desplegable Directo (Exclusivo para Socio/Admin) */}
                  {isSocio && record.trips && record.trips.length > 0 && (
                    <div
                      className="mt-3 pt-2.5 border-t border-slate-100"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => toggleExpandRecord(record.id)}
                        className="w-full py-1.5 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-xs font-bold text-slate-700 flex items-center justify-between transition active:scale-[0.99]"
                      >
                        <span>🔍 Ver desglose de las {record.trips.length} vueltas</span>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-slate-500" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-500" />
                        )}
                      </button>

                      {isExpanded && (
                        <div className="mt-2 space-y-1.5 bg-slate-50/70 rounded-xl p-2 border border-slate-200/60">
                          {record.trips.map((t, idx) => {
                            const tDiff = parseFloat(((t.efectivoReal || 0) - (t.income || 0)).toFixed(2));
                            const hasTDiff = Math.abs(tDiff) >= 0.01;
                            const isNoReal = t.tipo === 'no_realizada' && !t.income && !t.efectivoReal;
                            return (
                              <div
                                key={t.id || idx}
                                className={`flex items-center justify-between text-[11px] px-2.5 py-1.5 rounded-lg border ${
                                  isNoReal
                                    ? 'bg-slate-100/70 border-slate-200 text-slate-500'
                                    : hasTDiff
                                    ? tDiff < 0
                                      ? 'bg-red-50/80 border-red-200 text-slate-800'
                                      : 'bg-blue-50/80 border-blue-200 text-slate-800'
                                    : 'bg-white border-slate-200/70 text-slate-700'
                                }`}
                              >
                                <div className="flex-1 min-w-0 pr-2 truncate font-semibold">
                                  <span className="text-slate-400 mr-1">{idx + 1}.</span>
                                  {t.time ? `${t.time} ` : ''}{t.routeFrom} → {t.routeTo}
                                </div>
                                {isNoReal ? (
                                  <span className="text-[10px] font-bold text-orange-600 shrink-0">No realizada</span>
                                ) : (
                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className="text-slate-500">
                                      Sist. <strong className="text-slate-700">${(t.income || 0).toFixed(2)}</strong>
                                    </span>
                                    <span className="text-slate-300">|</span>
                                    <span className="text-slate-500">
                                      Decl. <strong className="text-slate-800">${(t.efectivoReal || 0).toFixed(2)}</strong>
                                    </span>
                                    <span className="w-16 text-right font-extrabold">
                                      {!hasTDiff ? (
                                        <span className="text-emerald-700">🟢 $0.00</span>
                                      ) : tDiff < 0 ? (
                                        <span className="text-red-600">🔴 -${Math.abs(tDiff).toFixed(2)}</span>
                                      ) : (
                                        <span className="text-blue-600">🔵 +${tDiff.toFixed(2)}</span>
                                      )}
                                    </span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          {Math.abs(record.sobrante || 0) >= 0.01 && (
                            <div className="flex items-center justify-between text-[11px] px-2.5 py-1.5 rounded-lg bg-amber-50/80 border border-amber-200 font-bold text-amber-950">
                              <span>Ajuste / Descuadre en Planilla de Cierre:</span>
                              <span className={(record.sobrante || 0) < 0 ? 'text-red-600' : 'text-blue-700'}>
                                {(record.sobrante || 0) < 0
                                  ? `🔴 -${Math.abs(record.sobrante || 0).toFixed(2)}`
                                  : `🔵 +${(record.sobrante || 0).toFixed(2)}`}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
              );
            })}
          </div>
        )}
      </main>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar registro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta accion no se puede deshacer. El registro se eliminara permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="rounded-xl bg-[#912D26] hover:bg-[#7A2520]">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
