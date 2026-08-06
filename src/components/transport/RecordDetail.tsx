'use client';

import { useState } from 'react';
import { ArrowLeft, FileText, CalendarDays, Check, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { type SavedRecord } from './types';

interface RecordDetailProps {
  record: SavedRecord;
  onBack: () => void;
  isAdmin?: boolean;
  onRecordUpdated?: (updated: SavedRecord) => void;
}

export function RecordDetail({ record, onBack, isAdmin, onRecordUpdated }: RecordDetailProps) {
  const [editingDate, setEditingDate] = useState(false);
  const [newDate, setNewDate] = useState(record.date);
  const [savingDate, setSavingDate] = useState(false);
  const [liveRecord, setLiveRecord] = useState<SavedRecord>(record);

  const rec = liveRecord;

  const formatDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  };

  const handleSaveDate = async () => {
    if (newDate === rec.date) {
      setEditingDate(false);
      return;
    }
    setSavingDate(true);
    try {
      const res = await fetch('/api/records', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: rec.id, date: newDate }),
      });
      if (!res.ok) throw new Error('Error al actualizar');
      const updated = await res.json();
      setLiveRecord(updated);
      onRecordUpdated?.(updated);
      setEditingDate(false);
    } catch {
      setNewDate(rec.date);
      setEditingDate(false);
    } finally {
      setSavingDate(false);
    }
  };

  const handleCancelDate = () => {
    setNewDate(rec.date);
    setEditingDate(false);
  };

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#FAFAFA]">
      <header className="sticky top-0 z-10 bg-white border-b border-[#D6D6D6] px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="rounded-xl text-[#3A3A3A]">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-lg font-semibold text-[#3A3A3A]">Liquidacion del Dia</h1>
          <p className="text-xs text-[#3A3A3A]/50">Op: {formatDate(rec.date)}{rec.km ? ` • ${rec.km} km` : ''}</p>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-8">
        <div className="px-4 py-4 space-y-4">
          {/* Fechas */}
          <Card className="rounded-2xl border border-[#D6D6D6] bg-white">
            <CardContent className="p-4 grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-[#3A3A3A]/50">Registro:</span> <span className="font-medium text-[#3A3A3A]">{formatDate(rec.createdAt.split('T')[0])}</span></div>
              {editingDate ? (
                <div className="col-span-2 flex items-center gap-2">
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="flex-1 rounded-lg border border-[#D6D6D6] px-3 py-1.5 text-sm text-[#3A3A3A] focus:outline-none focus:ring-2 focus:ring-[#912D26]/30 focus:border-[#912D26]"
                  />
                  {savingDate ? (
                    <Loader2 className="w-5 h-5 text-[#912D26] animate-spin" />
                  ) : (
                    <>
                      <button onClick={handleSaveDate} className="p-1.5 rounded-lg bg-[#912D26] text-white hover:bg-[#912D26]/90 transition-colors">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={handleCancelDate} className="p-1.5 rounded-lg bg-[#3A3A3A]/10 text-[#3A3A3A] hover:bg-[#3A3A3A]/20 transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className="text-[#3A3A3A]/50">Operacion:</span>
                  <span className="font-medium text-[#3A3A3A]">{formatDate(rec.date)}</span>
                  {isAdmin && (
                    <button
                      onClick={() => { setNewDate(rec.date); setEditingDate(true); }}
                      className="ml-1 p-1 rounded-md hover:bg-[#912D26]/10 text-[#912D26] transition-colors"
                      title="Cambiar fecha de operacion"
                    >
                      <CalendarDays className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Conductor / Ayudante */}
          {(rec.conductor || rec.ayudanteNombre) && (
            <Card className="rounded-2xl border border-[#D6D6D6] bg-white">
              <CardContent className="p-4 grid grid-cols-2 gap-3 text-sm">
                {rec.conductor && (
                  <div><span className="text-[#3A3A3A]/50">Conductor:</span> <span className="font-medium text-[#3A3A3A]">{rec.conductor}</span></div>
                )}
                {rec.ayudanteNombre && (
                  <div><span className="text-[#3A3A3A]/50">Ayudante:</span> <span className="font-medium text-[#3A3A3A]">{rec.ayudanteNombre}</span></div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Trips */}
          <Card className="rounded-2xl border border-[#D6D6D6] bg-white">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-base font-semibold text-[#3A3A3A]">Frecuencias ({rec.trips.length})</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-2">
              {rec.trips.map((trip, i) => {
                const odd = (i + 1) % 2 !== 0;
                return (
                  <div key={trip.id} className={`flex items-center gap-3 p-2.5 rounded-xl ${odd ? 'bg-[#912D26]/5 border-l-4 border-[#912D26]' : 'bg-[#3A3A3A]/5 border-l-4 border-[#3A3A3A]'}`}>
                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${odd ? 'bg-[#912D26] text-white' : 'bg-[#3A3A3A] text-white'}`}>
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#3A3A3A] truncate">
                        {trip.routeFrom} → {trip.routeTo}
                      </p>
                      <p className="text-xs text-[#3A3A3A]/40">{trip.time || 'Sin hora'}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-[#3A3A3A]">S/ {trip.income.toFixed(2)}</p>
                      {trip.boletos > 0 && (
                        <p className="text-[10px] text-[#912D26]">BL: {trip.boletos.toFixed(2)}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Expenses */}
          <Card className="rounded-2xl border border-[#D6D6D6] bg-white">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-base font-semibold text-red-600">Gastos</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-1">
              {rec.expenses.map((exp) => (
                <div key={exp.id} className="flex justify-between text-sm py-1">
                  <span className="text-[#3A3A3A]/60">{exp.description}</span>
                  <span className="font-medium text-[#3A3A3A]">S/ {exp.amount.toFixed(2)}</span>
                </div>
              ))}
              <Separator className="my-1 bg-[#D6D6D6]" />
              <div className="flex justify-between text-sm font-bold text-red-600">
                <span>Total Gastos</span>
                <span>S/ {rec.totalGastos.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Summary */}
          <Card className="rounded-2xl bg-[#3A3A3A] text-white">
            <CardContent className="p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-white/60">Produccion</span>
                <span className="font-semibold">S/ {rec.production.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/60">Caja Comun</span>
                <span className="font-semibold">S/ {rec.cajaComun.toFixed(2)}</span>
              </div>
              <Separator className="bg-white/10" />
              <div className="flex justify-between text-sm">
                <span className="text-white/60">Total Gastos</span>
                <span className="font-semibold text-red-400">S/ {rec.totalGastos.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/60">Tickets</span>
                <span className="font-semibold">S/ {rec.tickets.toFixed(2)}</span>
              </div>
              <Separator className="bg-white/10" />
              <div className="flex justify-between">
                <span className="text-sm text-white/80">Entrega Ayudante</span>
                <span className={`font-bold ${rec.entregaAyudante >= 0 ? 'text-[#4ADE80]' : 'text-red-400'}`}>
                  S/ {rec.entregaAyudante.toFixed(2)}
                </span>
              </div>
              <p className="text-[10px] text-white/30">Produccion - Total Gastos</p>
              <div className="flex justify-between">
                <span className="text-sm text-white/80">Entrega Compania</span>
                <span className={`font-bold ${rec.entregaCompania >= 0 ? 'text-[#4ADE80]' : 'text-red-400'}`}>
                  S/ {rec.entregaCompania.toFixed(2)}
                </span>
              </div>
              <p className="text-[10px] text-white/30">Caja Comun - Tickets</p>
            </CardContent>
          </Card>

          {/* Photo */}
          {rec.photoUrl && (
            <Card className="rounded-2xl border border-[#D6D6D6] bg-white">
              <CardContent className="p-4">
                <p className="text-sm font-medium text-[#3A3A3A] mb-2 flex items-center gap-1">
                  <FileText className="w-4 h-4" /> Foto del cuaderno
                </p>
                <img src={rec.photoUrl} alt="Foto" className="w-full rounded-xl" />
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
