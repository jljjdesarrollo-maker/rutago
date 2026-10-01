'use client';

import { useState, useEffect, useMemo } from 'react';
import { Clock, Wrench, ChevronDown, CheckCircle2, AlertTriangle, ArrowRight, ShieldCheck } from 'lucide-react';
import {
  getConfiguracionFlotaLocal,
  getVentanaMayorParaVT,
  subscribeToVTConfig,
  verificarActualizacionFingerprint,
} from '@/lib/vt-ventanas-storage';
import { type MantenimientoBusItem } from '@/lib/mantenimiento-catalogo';
import { type EstacionServicioId } from '@/lib/mantenimiento-estaciones';
import { type VTConfiguracionItem } from '@/types/vt-ventanas';
import {
  obtenerUltimosArqueosBus,
  calcularProyeccionSecuencia,
} from '@/lib/turno-secuencia-tracker';
import {
  evaluarVentanaParaMantenimiento,
  formatearTiempoCompacto,
} from './ChoferTurnoVentanasCard';

interface ChoferProximaParadaCardProps {
  busId: string;
  disco: string;
  kmActual: number;
  itemsMantenimiento?: MantenimientoBusItem[];
  onAbrirEstacion?: (estacionId: EstacionServicioId, itemCodigo?: string) => void;
  className?: string;
}

export function ChoferProximaParadaCard({
  busId,
  disco,
  kmActual,
  itemsMantenimiento = [],
  onAbrirEstacion,
  className = '',
}: ChoferProximaParadaCardProps) {
  const [configFlota, setConfigFlota] = useState(() => getConfiguracionFlotaLocal());
  const [selectedVTCode, setSelectedVTCode] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`rg_chofer_selected_vt_${busId}`);
      if (saved) return saved;
    }
    return 'VT01';
  });
  const [cambiandoTurno, setCambiandoTurno] = useState(false);

  // Inferencia inteligente del turno según arqueos reales
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`rg_chofer_selected_vt_${busId}`);
      if (!saved) {
        obtenerUltimosArqueosBus(disco, busId).then((arqueos) => {
          const proy = calcularProyeccionSecuencia(arqueos);
          if (proy && proy.turnoProyectado) {
            setSelectedVTCode(proy.turnoProyectado);
          }
        });
      }
    }
  }, [busId, disco]);

  // Actualización de configuración en background
  useEffect(() => {
    verificarActualizacionFingerprint().then((actualizado) => {
      if (actualizado) {
        setConfigFlota(getConfiguracionFlotaLocal());
      }
    });

    const unsubscribe = subscribeToVTConfig((nuevaConfig) => {
      setConfigFlota(nuevaConfig);
    });

    return () => unsubscribe();
  }, []);

  const handleSelectVT = (codigo: string) => {
    setSelectedVTCode(codigo);
    setCambiandoTurno(false);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`rg_chofer_selected_vt_${busId}`, codigo);
      } catch {}
    }
  };

  const normalizarCodigo = (c: string) => (c || '').toUpperCase().replace(/^VT0+/, 'VT');

  const vtActual: VTConfiguracionItem | undefined = useMemo(() => {
    const target = normalizarCodigo(selectedVTCode);
    return (
      configFlota.vts.find(
        (v) => normalizarCodigo(v.codigo) === target
      ) || configFlota.vts[0]
    );
  }, [configFlota, selectedVTCode]);

  const itemsEfectivos = useMemo(() => {
    if (itemsMantenimiento && itemsMantenimiento.length > 0) {
      return itemsMantenimiento;
    }
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(`rg_mantenimientos_v2_${busId}`);
        if (raw) return JSON.parse(raw);
      } catch {}
    }
    return [];
  }, [itemsMantenimiento, busId]);

  const ventanaMayor = useMemo(() => {
    return getVentanaMayorParaVT(selectedVTCode);
  }, [selectedVTCode]);

  if (!vtActual || !ventanaMayor) return null;

  const evaluacion = evaluarVentanaParaMantenimiento(ventanaMayor, itemsEfectivos, kmActual);

  return (
    <div
      className={`bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-sm relative overflow-hidden transition-all ${className}`}
    >
      {/* Fila Superior: Cabecera con Selector Sutil de Turno VT */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center font-black text-xs">
            {disco}
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
              Próxima Ventana de Parada
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-xs sm:text-sm font-black text-slate-800">
                {evaluacion.ciudadNombre}
              </span>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-2 py-0.2 rounded-full">
                {formatearTiempoCompacto(ventanaMayor.duracionMinutos)} libres
              </span>
            </div>
          </div>
        </div>

        {/* Selector de Turno Sutil (Thumb Zone) */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setCambiandoTurno(!cambiandoTurno)}
            className="flex items-center gap-1 bg-slate-50 hover:bg-slate-100 border border-slate-200/90 rounded-full px-2.5 py-1 text-xs font-bold text-slate-700 cursor-pointer transition active:scale-95"
            title="Cambiar turno VT asignado"
          >
            <span>{vtActual.codigo}</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {cambiandoTurno && (
            <div className="absolute right-0 top-full mt-2 z-50 w-52 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl animate-in fade-in zoom-in-95">
              <p className="mb-1.5 px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Seleccionar Cuaderno VT
              </p>
              <div className="max-h-52 overflow-y-auto space-y-1">
                {configFlota.vts.map((v) => (
                  <button
                    key={v.codigo}
                    onClick={() => handleSelectVT(v.codigo)}
                    className={`flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                      v.codigo.toUpperCase() === selectedVTCode.toUpperCase()
                        ? 'bg-[#053225] text-white'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span>{v.codigo}</span>
                    <span className="text-[10px] opacity-80">
                      {v.frecuencias?.length || 0} carreras
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Cuerpo Táctico: Tarea Asignable vs Unidad al Día */}
      <div className="pt-3">
        {evaluacion.tieneTareaAsignable ? (
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    evaluacion.esUrgente
                      ? 'bg-rose-100 text-rose-800 border border-rose-300'
                      : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  }`}
                >
                  {evaluacion.tituloBadge || 'Tarea Recomendada'}
                </span>
                <p className="text-xs sm:text-sm font-black text-slate-900 mt-1">
                  {evaluacion.detalleTarea}
                </p>
              </div>
            </div>

            {/* Botón Primario de Acción Contextual */}
            <button
              type="button"
              onClick={() => {
                if (onAbrirEstacion && evaluacion.estacionDestino) {
                  onAbrirEstacion(evaluacion.estacionDestino, evaluacion.itemCodigo);
                }
              }}
              className="w-full h-12 rounded-2xl bg-[#053225] hover:bg-[#073b2d] active:scale-[0.98] text-white font-black text-xs sm:text-sm uppercase tracking-wide flex items-center justify-center gap-2 shadow-md shadow-emerald-950/20 border border-emerald-900/60 transition cursor-pointer"
            >
              <span>{evaluacion.textoBoton || 'Asentar Tarea →'}</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 py-1 text-slate-600">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800">
                {evaluacion.motivoNoTaller || 'Unidad al día en carretera'}
              </p>
              <p className="text-[11px] text-slate-500">
                No se requieren mantenimientos mecánicos en esta parada.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
