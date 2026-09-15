'use client';

import { useState, useEffect } from 'react';
import {
  Wrench,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowLeft,
  Gauge,
  Calendar,
  Save,
  Plus,
  Bus as BusIcon,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { getAllBuses, getActiveBusId } from '@/lib/fleet-storage';

interface MantenimientoItem {
  id: string;
  nombre: string;
  intervaloKm: number;
  ultimoKm: number;
  fechaUltimo?: string;
  notas?: string;
}

const DEFAULT_ITEMS: MantenimientoItem[] = [
  { id: 'm-1', nombre: 'Cambio de Aceite de Motor & Filtro', intervaloKm: 5000, ultimoKm: 185000, fechaUltimo: '2026-08-15' },
  { id: 'm-2', nombre: 'Filtro de Diésel / Trampa de Agua', intervaloKm: 10000, ultimoKm: 180000, fechaUltimo: '2026-07-20' },
  { id: 'm-3', nombre: 'Revisión y Pastillas de Freno', intervaloKm: 15000, ultimoKm: 175000, fechaUltimo: '2026-06-10' },
  { id: 'm-4', nombre: 'Aceite de Transmisión & Corona', intervaloKm: 20000, ultimoKm: 170000, fechaUltimo: '2026-05-01' },
  { id: 'm-5', nombre: 'Rotación y Alineación de Neumáticos', intervaloKm: 25000, ultimoKm: 172000, fechaUltimo: '2026-06-05' },
];

interface MantenimientoScreenProps {
  onBack: () => void;
}

export function MantenimientoScreen({ onBack }: MantenimientoScreenProps) {
  const [activeBusId] = useState<string>(() => {
    if (typeof window === 'undefined') return 'BUS-01';
    return getActiveBusId();
  });
  const [kmActual, setKmActual] = useState<number>(() => {
    if (typeof window === 'undefined') return 187420;
    const busId = getActiveBusId();
    const savedKm = localStorage.getItem(`rg_last_km_${busId}`);
    if (savedKm) {
      const num = parseInt(savedKm, 10);
      if (!isNaN(num) && num > 0) return num;
    }
    return 187420;
  });
  const [items, setItems] = useState<MantenimientoItem[]>(() => {
    if (typeof window === 'undefined') return DEFAULT_ITEMS;
    const busId = getActiveBusId();
    const savedItems = localStorage.getItem(`rg_mantenimientos_${busId}`);
    if (savedItems) {
      try {
        return JSON.parse(savedItems);
      } catch {
        return DEFAULT_ITEMS;
      }
    }
    return DEFAULT_ITEMS;
  });
  const [editingItem, setEditingItem] = useState<MantenimientoItem | null>(null);
  const [newUltimoKm, setNewUltimoKm] = useState('');
  const { toast } = useToast();

  const handleUpdateMantenimiento = () => {
    if (!editingItem) return;
    const km = parseInt(newUltimoKm, 10);
    if (isNaN(km) || km <= 0) {
      toast({ title: 'Kilometraje inválido', variant: 'destructive' });
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const updated = items.map((it) =>
      it.id === editingItem.id
        ? { ...it, ultimoKm: km, fechaUltimo: today }
        : it
    );

    setItems(updated);
    localStorage.setItem(`rg_mantenimientos_${activeBusId}`, JSON.stringify(updated));
    toast({
      title: 'Mantenimiento Actualizado',
      description: `${editingItem.nombre} registrado en ${km.toLocaleString()} km`,
    });
    setEditingItem(null);
  };

  const handleUpdateKmActual = (nuevoKmStr: string) => {
    const num = parseInt(nuevoKmStr, 10);
    if (!isNaN(num)) {
      setKmActual(num);
      localStorage.setItem(`rg_last_km_${activeBusId}`, num.toString());
    }
  };

  const buses = getAllBuses();
  const currentBus = buses.find((b) => b.id === activeBusId);

  return (
    <div className="flex flex-col min-h-[100dvh] bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-gradient-to-r from-amber-950 via-slate-900 to-amber-950 text-white shadow-md px-4 py-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 flex items-center justify-center text-white transition"
              aria-label="Volver"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-black tracking-tight">Mantenimiento Preventivo</span>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-amber-500 text-slate-950 shadow-xs">
                  {currentBus ? `Unidad ${currentBus.numeroDisco}` : 'Bus 01'}
                </span>
              </div>
              <p className="text-[11px] text-amber-200/80 font-medium">Alertas mecánicas por tacómetro</p>
            </div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center">
            <Wrench className="w-5 h-5 text-amber-400" />
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 py-4 max-w-xl mx-auto w-full flex flex-col gap-4">
        {/* Odómetro Actual del Tablero */}
        <Card className="rounded-3xl border-none bg-gradient-to-br from-slate-900 via-amber-950 to-slate-900 text-white shadow-lg overflow-hidden">
          <CardContent className="p-4.5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Gauge className="w-5 h-5 text-amber-400" />
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Tacómetro Actual del Bus
                </span>
              </div>
              <span className="text-[10px] font-black px-2 py-0.5 rounded bg-white/10 text-amber-300">
                Lectura Tablero
              </span>
            </div>

            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-3xl font-black tracking-tight text-white">
                {kmActual.toLocaleString()}
              </span>
              <span className="text-sm font-bold text-amber-400">km</span>
            </div>

            <div className="flex items-center gap-2">
              <Input
                type="number"
                placeholder="Ajustar tacómetro actual..."
                defaultValue={kmActual}
                onBlur={(e) => handleUpdateKmActual(e.target.value)}
                className="h-10 rounded-xl bg-white/10 border-white/20 text-white text-xs placeholder:text-white/40"
              />
              <span className="text-[11px] text-slate-400 shrink-0 font-medium">
                Actualizar lectura
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Alertas de Mantenimiento */}
        <div className="flex flex-col gap-2.5 pb-20">
          <p className="text-xs font-black text-gray-500 uppercase tracking-wider px-1">
            Programación Preventiva por Intervalo
          </p>

          {items.map((item) => {
            const kmRecorridos = kmActual - item.ultimoKm;
            const kmRestantes = item.intervaloKm - kmRecorridos;
            const porcentaje = Math.min(100, Math.max(0, (kmRecorridos / item.intervaloKm) * 100));
            const esVencido = kmRestantes <= 0;
            const esUrgente = kmRestantes > 0 && kmRestantes <= 1000;

            return (
              <Card
                key={item.id}
                className={`rounded-2xl border transition-all ${
                  esVencido
                    ? 'border-rose-300 bg-rose-50/50 shadow-sm'
                    : esUrgente
                    ? 'border-amber-300 bg-amber-50/40'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <CardContent className="p-3.5">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h4 className="font-bold text-sm text-gray-900">{item.nombre}</h4>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Cada {item.intervaloKm.toLocaleString()} km • Último en{' '}
                        {item.ultimoKm.toLocaleString()} km ({item.fechaUltimo || 'N/A'})
                      </p>
                    </div>

                    <span
                      className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full shrink-0 ${
                        esVencido
                          ? 'bg-rose-600 text-white'
                          : esUrgente
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {esVencido ? '¡Cambio Urgente!' : esUrgente ? 'Próximo' : 'Normal'}
                    </span>
                  </div>

                  {/* Barra de Progreso */}
                  <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden mb-2.5">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        esVencido ? 'bg-rose-600' : esUrgente ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${porcentaje}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-gray-600">
                      {esVencido ? (
                        <span className="text-rose-700 font-bold">
                          Excedido por {Math.abs(kmRestantes).toLocaleString()} km
                        </span>
                      ) : (
                        <span>
                          Faltan <strong>{kmRestantes.toLocaleString()} km</strong>
                        </span>
                      )}
                    </span>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingItem(item);
                        setNewUltimoKm(kmActual.toString());
                      }}
                      className="h-8 px-2.5 rounded-xl border-gray-200 text-xs font-bold text-gray-700 hover:bg-slate-100"
                    >
                      <RotateCcw className="w-3 h-3 mr-1" />
                      Registrar Realizado
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>

      {/* Modal Registrar Mantenimiento Realizado */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl animate-in slide-in-from-bottom duration-200">
            <h3 className="font-black text-base text-gray-900 mb-1">Registrar Servicio Mecánico</h3>
            <p className="text-xs text-gray-500 mb-4">{editingItem.nombre}</p>

            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  Kilometraje del Tablero al Momento del Servicio
                </label>
                <Input
                  type="number"
                  value={newUltimoKm}
                  onChange={(e) => setNewUltimoKm(e.target.value)}
                  className="h-11 rounded-xl text-base font-black"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Button
                  onClick={() => setEditingItem(null)}
                  variant="ghost"
                  className="flex-1 h-12 rounded-xl text-gray-600 font-semibold"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleUpdateMantenimiento}
                  className="flex-1 h-12 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black"
                >
                  <Save className="w-4 h-4 mr-1.5" />
                  Guardar Servicio
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
