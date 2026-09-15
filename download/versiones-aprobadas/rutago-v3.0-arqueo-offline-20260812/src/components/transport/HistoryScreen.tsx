'use client';

import { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Trash2, ChevronRight, Calendar, TrendingUp, TrendingDown, Loader2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { type SavedRecord } from './types';
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

type FilterType = 'todos' | 'hoy' | 'semana' | 'mes';

interface HistoryScreenProps {
  isAdmin: boolean;
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
        const [m, y] = monthValue.split('-');
        const daysInMonth = new Date(parseInt(y), parseInt(m), 0).getDate();
        return {
          from: `${y}-${m}-01`,
          to: `${y}-${m}-${String(daysInMonth).padStart(2, '0')}`,
        };
      }
      return { from: `${yyyy}-${mm}-01`, to: todayStr };
    }
    default:
      return { from: '', to: '' };
  }
}

export function HistoryScreen({ isAdmin, onBack, onViewRecord }: HistoryScreenProps) {
  const [allRecords, setAllRecords] = useState<SavedRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('semana');
  const [monthValue, setMonthValue] = useState<string>('');
  const [exporting, setExporting] = useState(false);

  const dateRange = useMemo(() => getDateRange(filter, monthValue), [filter, monthValue]);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateRange.from) params.set('from', dateRange.from);
      if (dateRange.to) params.set('to', dateRange.to);
      const query = params.toString() ? `?${params.toString()}` : '';
      const res = await fetch(`/api/records${query}`);
      const data = await res.json();
      setAllRecords(Array.isArray(data) ? data : []);
    } catch {
      console.error('Error loading records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRecords(); }, [dateRange]);

  const filteredRecords = useMemo(() => {
    return allRecords;
  }, [allRecords]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await fetch(`/api/records/${deleteTarget}`, { method: 'DELETE' });
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
          const [m, y] = monthValue.split('-');
          filename += `_${monthNames[parseInt(m) - 1]}_${y}`;
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
    { key: 'todos', label: 'Todos' },
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
          <h1 className="text-lg font-semibold text-[#3A3A3A]">{isAdmin ? 'Historial Completo' : 'Mi Historial'}</h1>
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
        <h1 className="text-lg font-semibold text-[#3A3A3A]">{isAdmin ? 'Historial Completo' : 'Mi Historial'}</h1>
      </header>

      <main className="flex-1 overflow-y-auto pb-6">
        {/* Filter bar */}
        <div className="px-4 pt-4 pb-2 space-y-3">
          <div className="flex gap-2">
            {filterButtons.map(fb => (
              <button
                key={fb.key}
                onClick={() => { setFilter(fb.key); if (fb.key !== 'mes') setMonthValue(''); }}
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
              {filter !== 'todos' && dateRange.from ? ` (${formatDate(dateRange.from)} al ${formatDate(dateRange.to)})` : ''}
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

        {/* Records list */}
        {filteredRecords.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6">
            <Calendar className="w-12 h-12 text-[#D6D6D6] mb-4" />
            <p className="text-[#3A3A3A]/60 font-medium">Sin registros en este periodo</p>
            <p className="text-sm text-[#3A3A3A]/40 mt-1">Prueba con otro filtro</p>
          </div>
        ) : (
          <div className="px-4 py-2 space-y-3">
            {filteredRecords.map(record => (
              <Card
                key={record.id}
                className="rounded-2xl border border-[#D6D6D6] bg-white cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => onViewRecord(record)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Calendar className="w-4 h-4 text-[#912D26]" />
                        <span className="font-semibold text-[#3A3A3A]">{formatDate(record.date)}</span>
                        {record.km && (
                          <span className="text-xs text-[#3A3A3A]/40">• {record.km} km</span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-sm">
                        <div className="flex items-center gap-1">
                          <TrendingUp className="w-3.5 h-3.5 text-[#3A3A3A]" />
                          <span className="text-[#3A3A3A]/70">S/ {record.production.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <TrendingDown className="w-3.5 h-3.5 text-red-500" />
                          <span className="text-[#3A3A3A]/70">S/ {record.totalGastos.toFixed(2)}</span>
                        </div>
                        <span className={`font-bold ${record.entregaAyudante >= 0 ? 'text-[#912D26]' : 'text-red-600'}`}>
                          {record.entregaAyudante >= 0 ? '+' : ''}{record.entregaAyudante.toFixed(2)}
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
                </CardContent>
              </Card>
            ))}
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
