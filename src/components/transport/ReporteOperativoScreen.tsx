'use client';

import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Calendar, Loader2, CheckCircle, XCircle, Sparkles, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface OperativoTrip {
  date: string;
  vtCode: string;
  ayudante: string;
  hora: string;
  nombre: string;
  ruta: string;
  tipo: string;
  motivo: string | null;
  notaEspecial: string | null;
  income: number;
}

interface OperativoDay {
  date: string;
  trips: OperativoTrip[];
}

interface OperativoMotivo {
  motivo: string;
  count: number;
  pct: number;
}

interface OperativoData {
  startDate: string;
  endDate: string;
  totalProgramadas: number;
  realizadas: number;
  noRealizadas: number;
  ingresosEspeciales: number;
  cumplimiento: number;
  motivos: OperativoMotivo[];
  days: OperativoDay[];
}

interface Props {
  onBack: () => void;
}

function formatDate(d: string): string {
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

function formatMoney(v: number): string {
  return `S/ ${v.toFixed(2)}`;
}

const MOTIVO_LABELS: Record<string, string> = {
  mantenimiento: 'Mantenimiento',
  daño_unidad: 'Daño en la unidad',
  sin_pasajeros: 'Sin pasajeros',
  clima: 'Clima / Lluvia',
  problema_ruta: 'Problema en la ruta',
  orden_superior: 'Orden superior',
  otro: 'Otro motivo',
  cierre: 'Cierre',
};

function labelMotivo(m: string): string {
  return MOTIVO_LABELS[m] || m;
}

export function ReporteOperativoScreen({ onBack }: Props) {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const [from, setFrom] = useState(`${y}-${m}-01`);
  const [to, setTo] = useState(`${y}-${m}-${String(new Date(y, parseInt(m), 0).getDate()).padStart(2, '0')}`);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<OperativoData | null>(null);

  const load = useCallback(async () => {
    if (!from || !to) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/reports/operativo?from=${from}&to=${to}`);
      if (res.ok) {
        const json = await res.json();
        if (!json.error) setData(json);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [from, to]);

  useEffect(() => { load(); }, [load]);

  // Quick range presets
  const setRange = (months: number) => {
    const end = new Date();
    const start = new Date();
    start.setMonth(start.getMonth() - months + 1);
    start.setDate(1);
    end.setDate(0); // last day of previous month
    const fmt = (d: Date) => d.toISOString().split('T')[0];
    setFrom(fmt(start));
    setTo(fmt(end));
  };

  const [activeRange, setActiveRange] = useState(0); // 0 = current month (default)

  const handleRangeClick = (months: number) => {
    setActiveRange(months);
    if (months === 0) {
      // Current month
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      setFrom(`${y}-${m}-01`);
      setTo(`${y}-${m}-${String(new Date(y, parseInt(m), 0).getDate()).padStart(2, '0')}`);
    } else {
      setRange(months);
    }
  };

  const RANGE_OPTIONS = [
    { label: '1 mes', months: 1 },
    { label: '3 meses', months: 3 },
    { label: '6 meses', months: 6 },
    { label: '12 meses', months: 12 },
  ];

  const pct = (n: number, total: number) => total > 0 ? `${(n / total * 100).toFixed(1)}%` : '0%';

  const cumplimientoColor = (c: number) =>
    c >= 0.8 ? 'text-green-600' : c >= 0.6 ? 'text-amber-600' : 'text-red-600';

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#FAFAFA]">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-[#D6D6D6] px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="rounded-xl text-[#3A3A3A]">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-lg font-semibold text-[#3A3A3A]">Reporte Operativo</h1>
          <p className="text-xs text-[#3A3A3A]/50">Frecuencias: realizadas, perdidas y especiales</p>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-6 px-4 pt-4 space-y-4">
        {/* Rango rapido */}
        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => handleRangeClick(0)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeRange === 0 ? 'bg-[#912D26] text-white' : 'bg-[#F5F5F5] text-[#3A3A3A]/60'
            }`}
          >
            Este mes
          </button>
          {RANGE_OPTIONS.map(r => (
            <button
              key={r.months}
              onClick={() => handleRangeClick(r.months)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeRange === r.months ? 'bg-[#912D26] text-white' : 'bg-[#F5F5F5] text-[#3A3A3A]/60'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* Filtros */}
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-[10px] font-medium text-[#3A3A3A]/50 uppercase">Desde</label>
            <Input type="date" value={from} onChange={e => { setActiveRange(-1); setFrom(e.target.value); }} className="h-10 rounded-xl border-[#D6D6D6] text-sm" />
          </div>
          <div className="flex-1">
            <label className="text-[10px] font-medium text-[#3A3A3A]/50 uppercase">Hasta</label>
            <Input type="date" value={to} onChange={e => { setActiveRange(-1); setTo(e.target.value); }} className="h-10 rounded-xl border-[#D6D6D6] text-sm" />
          </div>
        </div>

        {loading && (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-[#912D26]" />
          </div>
        )}

        {data && !loading && (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white rounded-2xl p-3 border border-[#D6D6D6]">
                <p className="text-[10px] text-[#3A3A3A]/50 uppercase font-medium">Programadas</p>
                <p className="text-2xl font-bold text-[#3A3A3A] mt-1">{data.totalProgramadas}</p>
              </div>
              <div className="bg-white rounded-2xl p-3 border border-[#D6D6D6]">
                <p className="text-[10px] text-[#3A3A3A]/50 uppercase font-medium">Cumplimiento</p>
                <p className={`text-2xl font-bold mt-1 ${cumplimientoColor(data.cumplimiento)}`}>
                  {(data.cumplimiento * 100).toFixed(1)}%
                </p>
              </div>
              <div className="bg-white rounded-2xl p-3 border border-[#D6D6D6]">
                <p className="text-[10px] text-[#3A3A3A]/50 uppercase font-medium">Realizadas</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{data.realizadas}</p>
                <p className="text-[10px] text-[#3A3A3A]/40">{pct(data.realizadas, data.totalProgramadas)}</p>
              </div>
              <div className="bg-white rounded-2xl p-3 border border-[#D6D6D6]">
                <p className="text-[10px] text-[#3A3A3A]/50 uppercase font-medium">Perdidas</p>
                <p className="text-2xl font-bold text-red-600 mt-1">{data.noRealizadas}</p>
                <p className="text-[10px] text-[#3A3A3A]/40">{pct(data.noRealizadas, data.totalProgramadas)}</p>
              </div>
              {data.ingresosEspeciales > 0 && (
                <div className="bg-white rounded-2xl p-3 border border-amber-200 col-span-2">
                  <p className="text-[10px] text-[#3A3A3A]/50 uppercase font-medium">Ingresos Especiales</p>
                  <p className="text-2xl font-bold text-amber-600 mt-1">{data.ingresosEspeciales}</p>
                  <p className="text-[10px] text-[#3A3A3A]/40">{pct(data.ingresosEspeciales, data.totalProgramadas)}</p>
                </div>
              )}
            </div>

            {/* Motivos principales */}
            {data.motivos.length > 0 && (
              <div className="bg-white rounded-2xl p-4 border border-[#D6D6D6]">
                <p className="text-xs font-bold text-red-600 uppercase tracking-wider mb-2">Motivos de perdida</p>
                <div className="space-y-1.5">
                  {data.motivos.map(m => (
                    <div key={m.motivo} className="flex items-center justify-between">
                      <span className="text-sm text-[#3A3A3A]">{labelMotivo(m.motivo)}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[#3A3A3A]/50">{m.count}</span>
                        <span className="text-xs font-semibold text-red-600">{(m.pct * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Lista por dia */}
            {data.days.length === 0 && (
              <div className="flex flex-col items-center py-12">
                <Calendar className="w-10 h-10 text-[#D6D6D6] mb-3" />
                <p className="text-sm text-[#3A3A3A]/60 font-medium">Sin datos para este rango</p>
              </div>
            )}

            {data.days.map(day => (
              <div key={day.date} className="space-y-1">
                {/* Date header */}
                <div className="flex items-center gap-2 pt-2">
                  <div className="h-px bg-[#D6D6D6] flex-1" />
                  <span className="text-xs font-semibold text-[#3A3A3A]/60">{formatDate(day.date)}</span>
                  <div className="h-px bg-[#D6D6D6] flex-1" />
                </div>

                {/* Trip rows */}
                {day.trips.map((trip, i) => {
                  const isRealizada = trip.tipo === 'frecuencia';
                  const isEspecial = trip.tipo === 'ingreso_especial';
                  const isNoReal = trip.tipo === 'no_realizada';

                  return (
                    <div
                      key={`${day.date}-${i}`}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ${
                        isRealizada ? 'bg-green-50 border border-green-100' :
                        isEspecial ? 'bg-amber-50 border border-amber-100' :
                        'bg-red-50 border border-red-100'
                      }`}
                    >
                      {/* Icon */}
                      {isRealizada && <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />}
                      {isNoReal && <XCircle className="w-4 h-4 text-red-500 shrink-0" />}
                      {isEspecial && <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />}

                      {/* Time */}
                      <span className="text-xs font-mono text-[#3A3A3A]/50 w-10 shrink-0">{trip.hora}</span>

                      {/* Main info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#3A3A3A] truncate">{trip.nombre}</p>
                        {isNoReal && trip.motivo && (
                          <p className="text-[11px] text-red-500">{labelMotivo(trip.motivo)}</p>
                        )}
                        {isEspecial && trip.notaEspecial && (
                          <p className="text-[11px] text-amber-600">{trip.notaEspecial}</p>
                        )}
                      </div>

                      {/* Income */}
                      {(isRealizada || isEspecial) && trip.income > 0 && (
                        <span className={`text-sm font-semibold shrink-0 ${isEspecial ? 'text-amber-700' : 'text-green-700'}`}>
                          {formatMoney(trip.income)}
                        </span>
                      )}
                      {isNoReal && (
                        <span className="text-xs text-red-400 shrink-0">—</span>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </>
        )}
      </main>
    </div>
  );
}
