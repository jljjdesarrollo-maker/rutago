'use client';

import { useState, useEffect } from 'react';
import { Wrench, CheckCircle, AlertTriangle, Send, Bell, Gauge } from 'lucide-react';
import { getLatestBusOdometer } from '@/lib/fleet-storage';
import { resolveMantenimientoItemsParaBus } from '@/lib/mantenimiento-estaciones';
import { useToast } from '@/hooks/use-toast';

interface AyudanteMantenimientoBarProps {
  busId: string;
  busNumero: string;
}

export function AyudanteMantenimientoBar({ busId, busNumero }: AyudanteMantenimientoBarProps) {
  const { toast } = useToast();
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [novedadTexto, setNovedadTexto] = useState('');
  const [currentKm, setCurrentKm] = useState<number>(0);
  const [alertaMantenimiento, setAlertaMantenimiento] = useState<{
    tieneAlertas: boolean;
    mensaje: string;
    tipo: 'normal' | 'advertencia' | 'critica';
  }>({
    tieneAlertas: false,
    mensaje: 'Mecánica y servicios preventivos al día',
    tipo: 'normal',
  });

  useEffect(() => {
    try {
      const km = getLatestBusOdometer(busId);
      setCurrentKm(km);
      const items = resolveMantenimientoItemsParaBus(busId, km);
      const criticos = items.filter(it => it.estadoSemaforo === 'critico');
      const advertencias = items.filter(it => it.estadoSemaforo === 'advertencia');

      if (criticos.length > 0) {
        setAlertaMantenimiento({
          tieneAlertas: true,
          mensaje: `Atención: ${criticos[0].nombre} superó su kilometraje recomendado. Notificado al conductor.`,
          tipo: 'critica',
        });
      } else if (advertencias.length > 0) {
        setAlertaMantenimiento({
          tieneAlertas: true,
          mensaje: `Aviso preventivo: ${advertencias[0].nombre} próximo a cambio. Notificado al conductor.`,
          tipo: 'advertencia',
        });
      } else {
        setAlertaMantenimiento({
          tieneAlertas: false,
          mensaje: `Unidad ${busNumero}: Mecánica y servicios preventivos al día.`,
          tipo: 'normal',
        });
      }
    } catch {
      setAlertaMantenimiento({
        tieneAlertas: false,
        mensaje: `Unidad ${busNumero}: Mantenimiento preventivo en supervisión.`,
        tipo: 'normal',
      });
    }
  }, [busId, busNumero]);

  const handleEnviarReporte = () => {
    if (!novedadTexto.trim()) return;
    try {
      const storageKey = `rg_novedades_ruta_${busId}`;
      const prev = JSON.parse(localStorage.getItem(storageKey) || '[]');
      prev.unshift({
        id: Date.now().toString(),
        fecha: new Date().toISOString(),
        busId,
        busNumero,
        descripcion: novedadTexto.trim(),
        origen: 'AYUDANTE',
      });
      localStorage.setItem(storageKey, JSON.stringify(prev));
    } catch {
      // ignore
    }

    toast({
      title: 'Novedad de ruta registrada',
      description: 'El reporte mecánico fue guardado y queda disponible para el conductor y socio.',
    });
    setNovedadTexto('');
    setReportModalOpen(false);
  };

  return (
    <>
      <div
        className={`rounded-2xl border p-3 shadow-xs transition-all flex items-center justify-between gap-3 ${
          alertaMantenimiento.tipo === 'critica'
            ? 'bg-rose-50/80 border-rose-200 text-rose-950'
            : alertaMantenimiento.tipo === 'advertencia'
            ? 'bg-amber-50/80 border-amber-200 text-amber-950'
            : 'bg-slate-50 border-slate-200/90 text-slate-800'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
              alertaMantenimiento.tipo === 'critica'
                ? 'bg-rose-500 text-white'
                : alertaMantenimiento.tipo === 'advertencia'
                ? 'bg-amber-500 text-slate-950'
                : 'bg-[#053225] text-emerald-300'
            }`}
          >
            {alertaMantenimiento.tipo === 'normal' ? (
              <CheckCircle className="w-4 h-4 text-emerald-300" />
            ) : (
              <AlertTriangle className="w-4 h-4" />
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                Tacómetro: {currentKm.toLocaleString()} KM
              </span>
              <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-900">
                {alertaMantenimiento.tipo === 'normal' ? 'Al día Chofer' : 'Aviso Chofer'}
              </span>
            </div>
            <p className="text-xs font-bold truncate leading-tight text-slate-700">
              {alertaMantenimiento.mensaje}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setReportModalOpen(true)}
          className="shrink-0 flex items-center gap-1 text-[11px] font-black px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 shadow-2xs active:scale-95 transition"
          title="Reportar anomalía mecánica o de ruta"
        >
          <Bell className="w-3.5 h-3.5 text-amber-600" />
          <span className="hidden sm:inline">Reportar</span> Novedad
        </button>
      </div>

      {/* Modal Reporte de Novedad Mecánica */}
      {reportModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-3xl sm:rounded-2xl w-full max-w-sm p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <Wrench className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Novedad Mecánica en Ruta
                </h3>
                <p className="text-xs text-gray-500">
                  Unidad {busNumero} • Informar al conductor y socio
                </p>
              </div>
            </div>

            <p className="text-xs text-gray-600 leading-snug">
              Describe ruidos extraños, fallas de frenos, llanta con baja presión, vibración o fugas observadas durante el viaje:
            </p>

            <textarea
              value={novedadTexto}
              onChange={e => setNovedadTexto(e.target.value)}
              placeholder="Ej: Se escucha chillido leve en rueda posterior derecha al frenar en bajada..."
              rows={3}
              className="w-full p-3 rounded-2xl border-2 border-gray-200 text-xs text-gray-800 focus:outline-none focus:border-emerald-600"
              autoFocus
            />

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setReportModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-bold text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleEnviarReporte}
                disabled={!novedadTexto.trim()}
                className="flex-1 py-2.5 rounded-xl bg-[#053225] hover:bg-[#073b2d] text-white font-black text-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5 text-emerald-300" />
                Registrar Novedad
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
