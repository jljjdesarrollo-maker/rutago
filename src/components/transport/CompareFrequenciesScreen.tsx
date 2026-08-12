'use client';

import { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, ArrowLeftRight, Calendar, Loader2, TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];

interface FrecOption {
  from: string;
  to: string;
  time: string;
  label: string;
}

interface CompareResult {
  date: string;
  dayOfWeek: number;
  dayName: string;
  freq1: { from: string; to: string; time: string; label: string };
  freq2: { from: string; to: string; time: string; label: string };
  stats1: {
    count: number; countByDay: number;
    avgIncome: number; avgIncomeByDay: number;
    avgBoletos: number; avgBoletosByDay: number;
    avgTotal: number; avgTotalByDay: number;
  };
  stats2: {
    count: number; countByDay: number;
    avgIncome: number; avgIncomeByDay: number;
    avgBoletos: number; avgBoletosByDay: number;
    avgTotal: number; avgTotalByDay: number;
  };
  enoughDayData: boolean;
  recommendation: string;
  winner: string;
}

interface CompareFrequenciesScreenProps {
  onBack: () => void;
}

export function CompareFrequenciesScreen({ onBack }: CompareFrequenciesScreenProps) {
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);
  const [freq1, setFreq1] = useState('');
  const [freq2, setFreq2] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CompareResult | null>(null);
  const [frecuencias, setFrecuencias] = useState<FrecOption[]>([]);

  const dayName = useMemo(() => {
    const d = new Date(date + 'T12:00:00');
    return DAY_NAMES[d.getDay()];
  }, [date]);

  // Load unique frequencies from records
  useEffect(() => {
    fetch('/api/records').then(r => r.json()).then(data => {
      if (!Array.isArray(data)) return;
      const freqMap = new Map<string, FrecOption>();
      for (const record of data) {
        if (record.trips) {
          for (const trip of record.trips) {
            if (trip.time && trip.routeFrom && trip.routeTo) {
              const key = `${trip.routeFrom}-${trip.routeTo}-${trip.time}`;
              if (!freqMap.has(key)) {
                freqMap.set(key, {
                  from: trip.routeFrom,
                  to: trip.routeTo,
                  time: trip.time,
                  label: `${trip.time} ${trip.routeFrom} → ${trip.routeTo}`,
                });
              }
            }
          }
        }
      }
      // Sort by time
      const sorted = Array.from(freqMap.values()).sort((a, b) => a.time.localeCompare(b.time));
      setFrecuencias(sorted);
    }).catch(() => {});
  }, []);

  const handleCompare = async () => {
    if (!freq1 || !freq2) return;
    setLoading(true);
    setResult(null);
    try {
      const f1 = frecuencias.find(f => f.label === freq1);
      const f2 = frecuencias.find(f => f.label === freq2);
      if (!f1 || !f2) return;

      const params = new URLSearchParams({
        date,
        freq1From: f1.from,
        freq1To: f1.to,
        freq1Time: f1.time,
        freq2From: f2.from,
        freq2To: f2.to,
        freq2Time: f2.time,
      });

      const res = await fetch(`/api/reports/compare-frequencies?${params}`);
      const data = await res.json();
      setResult(data);
    } catch {
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#FAFAFA]">
      <header className="sticky top-0 z-10 bg-white border-b border-[#D6D6D6] px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="rounded-xl text-[#3A3A3A]">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-lg font-semibold text-[#3A3A3A]">Comparar Frecuencias</h1>
          <p className="text-xs text-[#3A3A3A]/60">Evalua cual frecuencia rinde mas</p>
        </div>
        <div className="w-9 h-9 rounded-xl bg-[#912D26]/10 flex items-center justify-center">
          <ArrowLeftRight className="w-5 h-5 text-[#912D26]" />
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-8 px-4 py-4 space-y-4">
        {/* Date and day */}
        <Card className="rounded-2xl border border-[#D6D6D6] bg-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#912D26]/10 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-[#912D26]" />
              </div>
              <div className="flex-1">
                <Label className="text-xs font-medium text-[#3A3A3A]/60">Fecha de consulta</Label>
                <Input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="rounded-xl h-11 border-[#D6D6D6] mt-1"
                />
              </div>
            </div>
            <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#912D26]/10">
              <span className="text-xs font-medium text-[#912D26]">{dayName}</span>
            </div>
          </CardContent>
        </Card>

        {/* Frequency selectors */}
        <Card className="rounded-2xl border border-[#912D26]/30 bg-[#912D26]/5">
          <CardContent className="p-4 space-y-3">
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-[#3A3A3A]">Tu frecuencia</Label>
              <select
                value={freq1}
                onChange={e => setFreq1(e.target.value)}
                className="w-full h-11 rounded-xl border border-[#D6D6D6] bg-white px-3 text-sm text-[#3A3A3A]"
              >
                <option value="">Selecciona tu frecuencia...</option>
                {frecuencias.map((f, i) => (
                  <option key={i} value={f.label}>{f.label}</option>
                ))}
              </select>
            </div>

            <div className="flex justify-center">
              <div className="w-8 h-8 rounded-full bg-[#D6D6D6] flex items-center justify-center">
                <ArrowLeftRight className="w-4 h-4 text-[#3A3A3A]/60" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-[#3A3A3A]">Frecuencia a comparar</Label>
              <select
                value={freq2}
                onChange={e => setFreq2(e.target.value)}
                className="w-full h-11 rounded-xl border border-[#D6D6D6] bg-white px-3 text-sm text-[#3A3A3A]"
              >
                <option value="">Selecciona frecuencia a comparar...</option>
                {frecuencias.map((f, i) => (
                  <option key={i} value={f.label}>{f.label}</option>
                ))}
              </select>
            </div>

            <Button
              onClick={handleCompare}
              disabled={!freq1 || !freq2 || loading}
              className="w-full h-12 rounded-xl bg-[#912D26] hover:bg-[#7A2520] text-white font-semibold text-sm"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {loading ? 'Comparando...' : 'Comparar'}
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        {result && (
          <>
            {!result.enoughDayData && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <p>Pocos registros el {result.dayName} (menos de 5). Se usan los datos generales de todos los dias.</p>
              </div>
            )}

            {/* Stats cards side by side */}
            <div className="grid grid-cols-2 gap-3">
              {/* Freq 1 */}
              <Card className={`rounded-2xl border-2 ${result.winner === 'freq1' ? 'border-green-400 bg-green-50/50' : 'border-[#D6D6D6] bg-white'}`}>
                <CardContent className="p-3 space-y-2">
                  <p className="text-xs font-bold text-[#3A3A3A] truncate">{result.freq1.label}</p>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-[#3A3A3A]/60">Registros ({result.dayName})</span>
                      <span className="font-semibold">{result.stats1.countByDay}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-[#3A3A3A]/60">Registros (total)</span>
                      <span className="font-semibold">{result.stats1.count}</span>
                    </div>
                    <hr className="border-[#D6D6D6]" />
                    <p className="text-[10px] font-bold text-[#3A3A3A]/40 uppercase">{result.dayName}</p>
                    <div className="flex justify-between text-xs">
                      <span className="text-[#3A3A3A]/60">Prod. prom.</span>
                      <span className="font-semibold">${result.stats1.avgIncomeByDay}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-[#3A3A3A]/60">Caja prom.</span>
                      <span className="font-semibold">${result.stats1.avgBoletosByDay}</span>
                    </div>
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-[#3A3A3A]">Ingreso total</span>
                      <span className="text-[#912D26]">${result.stats1.avgTotalByDay}</span>
                    </div>
                    <hr className="border-[#D6D6D6]" />
                    <p className="text-[10px] font-bold text-[#3A3A3A]/40 uppercase">General</p>
                    <div className="flex justify-between text-xs">
                      <span className="text-[#3A3A3A]/60">Ingreso prom.</span>
                      <span className="font-semibold">${result.stats1.avgTotal}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Freq 2 */}
              <Card className={`rounded-2xl border-2 ${result.winner === 'freq2' ? 'border-green-400 bg-green-50/50' : 'border-[#D6D6D6] bg-white'}`}>
                <CardContent className="p-3 space-y-2">
                  <p className="text-xs font-bold text-[#3A3A3A] truncate">{result.freq2.label}</p>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-[#3A3A3A]/60">Registros ({result.dayName})</span>
                      <span className="font-semibold">{result.stats2.countByDay}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-[#3A3A3A]/60">Registros (total)</span>
                      <span className="font-semibold">{result.stats2.count}</span>
                    </div>
                    <hr className="border-[#D6D6D6]" />
                    <p className="text-[10px] font-bold text-[#3A3A3A]/40 uppercase">{result.dayName}</p>
                    <div className="flex justify-between text-xs">
                      <span className="text-[#3A3A3A]/60">Prod. prom.</span>
                      <span className="font-semibold">${result.stats2.avgIncomeByDay}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-[#3A3A3A]/60">Caja prom.</span>
                      <span className="font-semibold">${result.stats2.avgBoletosByDay}</span>
                    </div>
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-[#3A3A3A]">Ingreso total</span>
                      <span className="text-[#912D26]">${result.stats2.avgTotalByDay}</span>
                    </div>
                    <hr className="border-[#D6D6D6]" />
                    <p className="text-[10px] font-bold text-[#3A3A3A]/40 uppercase">General</p>
                    <div className="flex justify-between text-xs">
                      <span className="text-[#3A3A3A]/60">Ingreso prom.</span>
                      <span className="font-semibold">${result.stats2.avgTotal}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recommendation */}
            <Card className="rounded-2xl border-2 border-[#912D26]/30 bg-white">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {result.winner === 'freq1' ? (
                    <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <TrendingUp className="w-5 h-5 text-blue-600" />
                    </div>
                  ) : result.winner === 'freq2' ? (
                    <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
                      <TrendingDown className="w-5 h-5 text-green-600" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <Minus className="w-5 h-5 text-gray-600" />
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-sm text-[#3A3A3A]">
                      {result.winner === 'tie' ? 'Empate' : result.winner === 'freq1' ? 'Manten tu frecuencia' : 'Conviene cambiar'}
                    </p>
                    <p className="text-xs text-[#3A3A3A]/70 mt-1">{result.recommendation}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {frecuencias.length === 0 && (
          <div className="text-center py-8">
            <p className="text-sm text-[#3A3A3A]/50">No hay registros con frecuencias</p>
            <p className="text-xs text-[#3A3A3A]/40 mt-1">Necesitas al menos algunos registros para comparar</p>
          </div>
        )}
      </main>
    </div>
  );
}
