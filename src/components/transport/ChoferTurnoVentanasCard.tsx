'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Clock,
  Wrench,
  AlertTriangle,
  ChevronDown,
  Sparkles,
  Compass,
  MapPin,
} from 'lucide-react';
import {
  getConfiguracionFlotaLocal,
  getVentanaMayorParaVT,
  getAlertaEnlaceCritico,
  subscribeToVTConfig,
  verificarActualizacionFingerprint,
} from '@/lib/vt-ventanas-storage';
import {
  formatearMinutosLegible,
  resolverParametrosRuta,
} from '@/lib/vt-ventanas-catalogo';
import { type MantenimientoBusItem } from '@/lib/mantenimiento-catalogo';
import { type EstacionServicioId } from '@/lib/mantenimiento-estaciones';
import { type VTConfiguracionItem } from '@/types/vt-ventanas';
import {
  obtenerUltimosArqueosBus,
  calcularProyeccionSecuencia,
} from '@/lib/turno-secuencia-tracker';

interface ChoferTurnoVentanasCardProps {
  busId: string;
  disco: string;
  kmActual: number;
  itemsMantenimiento?: MantenimientoBusItem[];
  onAbrirEstacion?: (estacionId: EstacionServicioId) => void;
  className?: string;
}

export function ChoferTurnoVentanasCard({
  busId,
  disco,
  kmActual,
  itemsMantenimiento = [],
  onAbrirEstacion,
  className = '',
}: ChoferTurnoVentanasCardProps) {
  const [configFlota, setConfigFlota] = useState(() => getConfiguracionFlotaLocal());
  const [selectedVTCode, setSelectedVTCode] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`rg_chofer_selected_vt_${busId}`);
      if (saved) return saved;
    }
    return 'VT01';
  });
  const [mostrarTodasFrecuencias, setMostrarTodasFrecuencias] = useState(false);
  const [cambiandoTurno, setCambiandoTurno] = useState(false);

  // Inferencia inteligente del turno según arqueos reales y días transcurridos
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

  // Handshake de Version Fingerprint en segundo plano (0ms de bloqueo de UI)
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

  // Guardar turno seleccionado
  const handleSelectVT = (codigo: string) => {
    setSelectedVTCode(codigo);
    setCambiandoTurno(false);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`rg_chofer_selected_vt_${busId}`, codigo);
      } catch {}
    }
  };

  const vtActual: VTConfiguracionItem | undefined = useMemo(() => {
    return configFlota.vts.find(
      (v) => v.codigo.toUpperCase() === selectedVTCode.toUpperCase()
    );
  }, [configFlota, selectedVTCode]);

  const ventanas = useMemo(() => {
    if (!vtActual) return [];
    return vtActual.ventanas || [];
  }, [vtActual]);

  const ventanaMayor = useMemo(() => {
    return getVentanaMayorParaVT(selectedVTCode);
  }, [selectedVTCode]);

  const alertaEnlace = useMemo(() => {
    return getAlertaEnlaceCritico(selectedVTCode);
  }, [selectedVTCode]);

  // Si no hay VT seleccionado o no existe
  if (!vtActual) {
    return null;
  }

  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden ${className}`}
    >
      {/* ─── Cabecera del Turno con Selector Rápido ─── */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-xs font-black">
              {disco}
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Turno Asignado Hoy
              </p>
              <div className="flex items-center gap-1.5">
                <h3 className="text-base font-black text-white">
                  {vtActual.codigo}
                </h3>
                <span className="text-xs text-slate-300 font-medium">
                  ({vtActual.nombre || `${vtActual.frecuencias.length} Frecuencias`})
                </span>
              </div>
            </div>
          </div>

          <div className="relative">
            <button
              onClick={() => setCambiandoTurno(!cambiandoTurno)}
              className="flex items-center gap-1 rounded-xl bg-white/10 px-3 py-1.5 text-xs font-bold text-white hover:bg-white/20 active:scale-95 transition-all cursor-pointer"
            >
              <span>Cambiar Turno</span>
              <ChevronDown className="h-3.5 w-3.5" />
            </button>

            {/* Dropdown de Selección de VT */}
            {cambiandoTurno && (
              <div className="absolute right-0 top-full mt-2 z-50 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-xl animate-in fade-in zoom-in-95">
                <p className="mb-1.5 px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Seleccionar VT Oficial
                </p>
                <div className="max-h-56 overflow-y-auto space-y-1">
                  {configFlota.vts.map((v) => (
                    <button
                      key={v.codigo}
                      onClick={() => handleSelectVT(v.codigo)}
                      className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
                        v.codigo.toUpperCase() === selectedVTCode.toUpperCase()
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span>{v.codigo}</span>
                      <span className="text-[10px] opacity-80">
                        {v.frecuencias.length} carreras
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Alerta de enlace crítico (si existe) */}
        {alertaEnlace && (
          <div className="mt-2.5 flex items-center gap-2 rounded-xl bg-amber-500/20 border border-amber-400/30 px-3 py-1.5 text-xs text-amber-200">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
            <span className="font-medium">{alertaEnlace.descripcion}</span>
          </div>
        )}
      </div>

      {/* ─── Ventana Técnica Mayor (Recomendada para taller) ─── */}
      {ventanaMayor && (
        <div className="border-b border-slate-100 bg-emerald-50/70 p-3.5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
                <Clock className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800">
                    Ventana Técnica Mayor ({ventanaMayor.ciudad})
                  </span>
                  <span className="rounded-full bg-emerald-200 px-1.5 py-0.2 text-[9px] font-bold text-emerald-900">
                    Recomendada
                  </span>
                </div>
                <p className="text-sm font-black text-slate-900">
                  {ventanaMayor.duracionTexto} libres ({ventanaMayor.horaInicio} a {ventanaMayor.horaFin})
                </p>
              </div>
            </div>

            {onAbrirEstacion && (
              <button
                onClick={() => onAbrirEstacion('LUBRICADORA')}
                className="flex items-center gap-1 rounded-xl bg-emerald-700 px-2.5 py-1.5 text-[11px] font-bold text-white shadow-xs hover:bg-emerald-800 active:scale-95 transition-all cursor-pointer shrink-0"
              >
                <Wrench className="h-3 w-3" />
                <span>Usar Ventana</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ─── Lista de Ventanas Operativas del Turno ─── */}
      <div className="p-3.5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
            <Compass className="h-3.5 w-3.5 text-slate-400" />
            Ventanas de Espera en Terminal
          </span>
          <span className="text-[10px] text-slate-400 font-mono">
            {ventanas.length} {ventanas.length === 1 ? 'intervalo' : 'intervalos'}
          </span>
        </div>

        {ventanas.length === 0 ? (
          <p className="text-xs text-slate-400 italic py-2 text-center">
            No hay ventanas operativas registradas para este turno.
          </p>
        ) : (
          <div className="space-y-1.5">
            {ventanas.map((v, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 p-2.5 text-xs transition-colors hover:bg-slate-100"
              >
                <div className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <div>
                    <span className="font-bold text-slate-800">
                      {v.ciudad}
                    </span>
                    <span className="ml-1 text-[11px] text-slate-500">
                      ({v.horaInicio} – {v.horaFin})
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`font-mono font-bold text-[11px] px-2 py-0.5 rounded-full ${
                      v.esMayor
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : v.duracionMinutos >= 90
                        ? 'bg-blue-100 text-blue-800 border border-blue-300'
                        : v.duracionMinutos >= 45
                        ? 'bg-cyan-100 text-cyan-800 border border-cyan-300'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {v.duracionTexto}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ─── Desglose de Frecuencias Oficiales ─── */}
        <div className="mt-3 pt-2.5 border-t border-slate-100">
          <button
            onClick={() => setMostrarTodasFrecuencias(!mostrarTodasFrecuencias)}
            className="flex w-full items-center justify-between text-[11px] font-bold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
          >
            <span>Ver {vtActual.frecuencias.length} carreras del itinerario</span>
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform ${
                mostrarTodasFrecuencias ? 'rotate-180' : ''
              }`}
            />
          </button>

          {mostrarTodasFrecuencias && (
            <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
              {vtActual.frecuencias.map((f, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg bg-slate-50 px-2.5 py-1.5 text-[11px] text-slate-700"
                >
                  <span className="font-mono font-bold text-slate-900">
                    {f.time}
                  </span>
                  <span>
                    {f.routeFrom} ➔ {f.routeTo}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
