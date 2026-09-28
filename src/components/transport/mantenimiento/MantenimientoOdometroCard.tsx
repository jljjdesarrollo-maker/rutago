'use client';

import React, { useState } from 'react';
import {
  Gauge,
  ShieldCheck,
  AlertTriangle,
  Clock,
  X,
  TrendingUp,
  CheckCircle2,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

export interface MantenimientoOdometroCardProps {
  activeBusDisco: string;
  activeBusPlaca: string;
  activeBusId: string;
  kmActual: number;
  totalVencidos: number;
  totalProximos: number;
  onUpdateKm: (nuevoKm: number, motivo: string) => void;
}

const MOTIVOS_CALIBRACION = [
  'Regularización de kilometraje',
  'Cambio físico de tablero / tacómetro',
  'Reparación de sensor de velocímetro',
  'Corrección de error de digitación',
  'Calibración inicial de unidad',
  'Otro motivo justificado',
] as const;

export function MantenimientoOdometroCard({
  activeBusDisco,
  activeBusPlaca,
  activeBusId,
  kmActual,
  totalVencidos,
  totalProximos,
  onUpdateKm,
}: MantenimientoOdometroCardProps) {
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [nuevoKmInput, setNuevoKmInput] = useState<string>('');
  const [motivoSeleccionado, setMotivoSeleccionado] = useState<string>(MOTIVOS_CALIBRACION[0]);
  const [observacion, setObservacion] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenModal = () => {
    setNuevoKmInput(kmActual ? kmActual.toString() : '');
    setMotivoSeleccionado(MOTIVOS_CALIBRACION[0]);
    setObservacion('');
    setIsModalOpen(true);
  };

  const handleConfirmarAjuste = async () => {
    const num = parseInt(nuevoKmInput, 10);
    if (isNaN(num) || num <= 0) {
      toast({
        title: 'Kilometraje Inválido',
        description: 'Ingresa un valor de kilometraje positivo para el tacómetro.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const motivoFinal = observacion.trim()
        ? `${motivoSeleccionado} • ${observacion.trim()}`
        : motivoSeleccionado;

      onUpdateKm(num, motivoFinal);

      toast({
        title: 'Tacómetro Calibrado Exitosamente',
        description: `Unidad ${activeBusDisco}: Tacómetro ajustado a ${num.toLocaleString()} km.`,
      });

      setIsModalOpen(false);
    } catch (err) {
      console.error('Error calibrando odómetro:', err);
      toast({
        title: 'Error de Guardado',
        description: 'No se pudo guardar la calibración del tacómetro.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const nuevoNum = parseInt(nuevoKmInput, 10);
  const diffKm = !isNaN(nuevoNum) && nuevoNum > 0 ? nuevoNum - kmActual : 0;

  return (
    <>
      {/* TARJETA PRINCIPAL DEL ODÓMETRO */}
      <Card className="rounded-3xl border-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 text-white shadow-xl overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <CardContent className="p-4 sm:p-5 relative z-10 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Gauge className="w-5 h-5 text-amber-400" />
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Odómetro / Tacómetro Actual
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Auditado Flota
              </span>
            </div>
          </div>

          <div className="flex items-baseline justify-between mb-1">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black tracking-tight text-white">
                {(kmActual ?? 187420).toLocaleString()}
              </span>
              <span className="text-sm font-bold text-amber-400">km</span>
            </div>

            {/* Indicadores de alertas de semáforo */}
            <div className="flex items-center gap-2">
              {totalVencidos > 0 && (
                <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-rose-600/90 text-white flex items-center gap-1 animate-pulse">
                  <AlertTriangle className="w-3.5 h-3.5" /> {totalVencidos} vencidos
                </span>
              )}
              {totalProximos > 0 && (
                <span className="text-xs font-bold px-2 py-1 rounded-lg bg-amber-500 text-slate-950 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> {totalProximos} próximos
                </span>
              )}
            </div>
          </div>

          {/* Pie de tarjeta con autonomía del Socio (Opción B) */}
          <div className="pt-2.5 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-300">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Tacómetro alimentado del arqueo de caja registrado por el ayudante al cerrar el VT</span>
            </div>
            <button
              type="button"
              onClick={handleOpenModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 hover:text-amber-200 border border-amber-500/40 text-xs font-bold transition-all cursor-pointer self-start sm:self-auto shrink-0 active:scale-95"
            >
              <Gauge className="w-3.5 h-3.5 text-amber-400" />
              <span>Calibrar Odómetro</span>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* MODAL DE CALIBRACIÓN EXTRAORDINARIA (OPCIÓN B - INDEPENDENCIA Y AUDITORÍA) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 my-auto border border-slate-200">
            {/* Cabecera del Modal */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-600 flex items-center justify-center shrink-0">
                  <Gauge className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 leading-tight">
                    Calibrar Odómetro / Tacómetro
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Unidad <strong>{activeBusDisco}</strong> ({activeBusPlaca}) • Autonomía del Socio
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Comparador de Odómetro */}
            <div className="bg-slate-900 text-white rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Lectura auditada actual:</span>
                <span className="font-mono font-black text-amber-400 text-sm">
                  {kmActual.toLocaleString()} km
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Nuevo Tacómetro en Tablero (km) *
                </label>
                <div className="relative">
                  <Input
                    type="number"
                    min="1"
                    placeholder="Ej: 894500"
                    value={nuevoKmInput}
                    onChange={e => setNuevoKmInput(e.target.value)}
                    className="h-12 text-lg font-black bg-white/10 border-white/20 text-white placeholder:text-white/30 rounded-xl pr-12 focus-visible:ring-amber-400"
                    autoFocus
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-amber-400">
                    km
                  </span>
                </div>
              </div>

              {/* Indicador reactivo de variación */}
              {nuevoKmInput && !isNaN(nuevoNum) && nuevoNum > 0 && (
                <div>
                  {diffKm === 0 ? (
                    <p className="text-[11px] text-slate-400">
                      Misma lectura que el odómetro actual.
                    </p>
                  ) : diffKm > 0 ? (
                    <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 shrink-0 text-emerald-400" />
                      <span>
                        <strong>+{diffKm.toLocaleString()} km de avance</strong> respecto al último registro.
                      </span>
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs space-y-1">
                      <div className="flex items-center gap-2 font-bold text-rose-200">
                        <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                        <span>Ajuste menor al actual ({diffKm.toLocaleString()} km)</span>
                      </div>
                      <p className="text-[11px] text-rose-200/90 leading-tight">
                        Válido ante cambio físico de tablero, sensor nuevo o tacómetro reemplazado en fosa.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Motivo del Ajuste */}
            <div className="space-y-1.5">
              <label className="block text-xs font-black text-slate-800 uppercase tracking-wide">
                Motivo del Ajuste *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {MOTIVOS_CALIBRACION.map(motivo => (
                  <button
                    key={motivo}
                    type="button"
                    onClick={() => setMotivoSeleccionado(motivo)}
                    className={`p-2 rounded-xl text-left text-[11px] font-bold border transition-all cursor-pointer ${
                      motivoSeleccionado === motivo
                        ? 'bg-amber-500/10 border-amber-500 text-amber-950 ring-1 ring-amber-500/40'
                        : 'bg-slate-50 border-slate-200/80 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {motivo}
                  </button>
                ))}
              </div>
            </div>

            {/* Detalle u Observación */}
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                Detalle u Observación (Opcional)
              </label>
              <Input
                type="text"
                placeholder="Ej. Tablero reparado en taller de Loja..."
                value={observacion}
                onChange={e => setObservacion(e.target.value)}
                className="h-9 text-xs rounded-xl bg-slate-50 border-slate-200"
              />
            </div>

            {/* Disclaimer de Auditoría */}
            <div className="rounded-xl p-2.5 bg-blue-50/70 border border-blue-200/80 text-[11px] text-blue-900 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <p className="leading-tight">
                <strong>Auditoría Permanente:</strong> El nuevo tacómetro actualizará los semáforos mecánicos de la <strong>Unidad {activeBusDisco}</strong> y se sincronizará automáticamente con el celular del chofer y los arqueos del ayudante.
              </p>
            </div>

            {/* Botonera de Acción */}
            <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                className="w-full sm:w-auto h-11 text-xs font-bold text-slate-700 rounded-xl"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                disabled={isSubmitting || !nuevoKmInput || parseInt(nuevoKmInput, 10) <= 0}
                onClick={handleConfirmarAjuste}
                className="w-full sm:w-auto h-11 px-5 text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isSubmitting ? 'Guardando Ajuste...' : 'Guardar Ajuste de Tacómetro'}</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
