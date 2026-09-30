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
    return 'VT08'; // Default de prueba con ventana diurna ejemplar
  });

  const [mostrarTodasFrecuencias, setMostrarTodasFrecuencias] = useState(false);
  const [cambiandoTurno, setCambiandoTurno] = useState(false);

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

  // Cruzar ventana con ítems que necesitan mantenimiento pronto (< 600 km)
  const itemsOportunidad = useMemo(() => {
    if (!ventanaMayor || ventanaMayor.duracionMinutos < 60) return [];
    return itemsMantenimiento.filter((it) => {
      const proxKm = it.ultimoKm + it.intervaloKm;
      const restante = proxKm - kmActual;
      return restante <= 600; // Por vencer o vencidos
    });
  }, [ventanaMayor, itemsMantenimiento, kmActual]);

  return (
    <div className={`space-y-3.5 ${className}`}>
      {/* ─── TARJETA PRINCIPAL DEL TURNO OPERATIVO ─── */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 text-white shadow-xl relative overflow-hidden">
        {/* Glow decorativo de fondo */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Encabezado: Turno actual + Selector */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Compass className="w-4 h-4" />
            </span>
            <div>
              <span className="text-[10px] uppercase font-black tracking-widest text-slate-400 block">
                Hoja de Ruta del Turno
              </span>
              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>{vtActual ? vtActual.nombre : selectedVTCode}</span>
                <span className="text-xs font-bold text-amber-400 bg-amber-950/60 border border-amber-600/40 px-2 py-0.5 rounded-full">
                  Bus {disco}
                </span>
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setCambiandoTurno(!cambiandoTurno)}
            className="h-8 px-2.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1 transition cursor-pointer"
          >
            <span>{cambiandoTurno ? 'Cerrar' : 'Cambiar Turno'}</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${cambiandoTurno ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Selector Desplegable de Turno VT */}
        {cambiandoTurno && (
          <div className="mt-3 p-3 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-2 animate-in fade-in duration-150">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-bold">Selecciona el VT asignado hoy por secretaría:</span>
              <span className="text-[10px] text-emerald-400 font-mono font-bold">15 Turnos Oficiales</span>
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {configFlota.vts.map((v) => {
                const isSelected = v.codigo.toUpperCase() === selectedVTCode.toUpperCase();
                return (
                  <button
                    key={v.codigo}
                    type="button"
                    onClick={() => handleSelectVT(v.codigo)}
                    className={`py-2 px-1 rounded-xl text-xs font-black transition cursor-pointer border ${
                      isSelected
                        ? 'bg-emerald-600 text-white border-emerald-400 shadow-md ring-1 ring-emerald-300'
                        : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    {v.codigo}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── ALERTA PREVENTIVA DE ENLACE CRÍTICO ─── */}
        {alertaEnlace && (
          <div className="mt-3 p-3 rounded-2xl bg-amber-950/70 border border-amber-500/50 text-amber-200 space-y-1.5 animate-in fade-in duration-200">
            <div className="flex items-center gap-2 font-black text-xs text-amber-300">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{alertaEnlace.titulo}</span>
            </div>
            <p className="text-xs text-amber-200/90 leading-relaxed pl-6">
              {alertaEnlace.descripcion}
            </p>
            <div className="pl-6 pt-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wide bg-amber-900/60 border border-amber-600/40 text-amber-300 px-2 py-0.5 rounded-md">
                💡 {alertaEnlace.sugerencia}
              </span>
            </div>
          </div>
        )}

        {/* ─── VENTANAS LIBRES OPERATIVAS EN LOJA ─── */}
        <div className="mt-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider font-extrabold text-slate-300 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span>Ventanas Libres para Taller en Loja</span>
            </span>
            <span className="bg-emerald-950/80 text-emerald-300 border border-emerald-600/30 text-[10px] font-mono px-2 py-0.5 rounded-full font-bold">
              {ventanas.length} Ventana{ventanas.length !== 1 ? 's' : ''}
            </span>
          </div>

          {ventanas.length === 0 ? (
            <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 text-center text-xs text-slate-400">
              Este turno tiene enlaces continuos sin ventanas prolongadas en Loja.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {ventanas.map((v, idx) => {
                const esMayor = v.duracionMinutos >= 120;
                const duracionTexto = formatearMinutosLegible(v.duracionMinutos);

                return (
                  <div
                    key={`${v.horaInicio}-${idx}`}
                    className={`p-3 rounded-2xl border transition ${
                      esMayor
                        ? 'bg-gradient-to-br from-emerald-950/60 via-slate-900 to-slate-900 border-emerald-500/40 shadow-sm'
                        : 'bg-slate-950/60 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between pb-1.5">
                      <span className="text-xs font-black text-white font-mono flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        {v.horaInicio} a {v.horaFin}
                      </span>
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                          esMayor
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                            : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}
                      >
                        {duracionTexto} libres
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-300 mt-1 leading-snug">
                      <strong className="text-emerald-300">Apto para:</strong>{' '}
                      {v.mantenimientosSugeridos.slice(0, 3).join(', ')}
                    </p>

                    {v.aptoParaTallerMayor && (
                      <div className="mt-2 flex items-center justify-between pt-1.5 border-t border-emerald-900/40">
                        <span className="text-[10px] text-amber-300 font-bold flex items-center gap-1">
                          <Wrench className="w-3 h-3 text-amber-400" />
                          Apto para Fosa y Muelles
                        </span>
                        {onAbrirEstacion && (
                          <button
                            type="button"
                            onClick={() => onAbrirEstacion('FRENOS_PULMONES')}
                            className="text-[10px] font-extrabold text-emerald-400 hover:text-emerald-300 underline cursor-pointer"
                          >
                            Ir a Taller →
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ─── CRUCE INTELIGENTE: OPORTUNIDAD TÉCNICA EN VIVO ─── */}
        {itemsOportunidad.length > 0 && ventanaMayor && (
          <div className="mt-3 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-100 space-y-2 animate-in fade-in duration-200">
            <div className="flex items-center gap-2 text-xs font-black text-amber-300">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Oportunidad de Mantenimiento para Hoy</span>
            </div>
            <p className="text-xs text-amber-200/90 leading-relaxed">
              En tu ventana de <strong>{formatearMinutosLegible(ventanaMayor.duracionMinutos)}</strong> ({ventanaMayor.horaInicio} a {ventanaMayor.horaFin}), puedes aprovechar para revisar:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {itemsOportunidad.map((it) => {
                const rest = it.ultimoKm + it.intervaloKm - kmActual;
                return (
                  <span
                    key={it.id}
                    className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-lg bg-amber-950/80 border border-amber-500/40 text-amber-200"
                  >
                    <span>{it.nombre}</span>
                    <span className="text-amber-400 font-mono">
                      ({rest <= 0 ? '¡Vencido!' : `restan ${rest} km`})
                    </span>
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── HOJA DE RUTA DETALLADA CON CABECERAS PARROQUIALES ─── */}
        <div className="mt-3.5 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={() => setMostrarTodasFrecuencias(!mostrarTodasFrecuencias)}
            className="w-full flex items-center justify-between text-xs text-slate-300 hover:text-white font-bold transition py-1 cursor-pointer"
          >
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              <span>Desglose de Frecuencias y Horas de Cabecera</span>
            </span>
            <span className="flex items-center gap-1 text-slate-400 text-[11px]">
              {mostrarTodasFrecuencias ? 'Ocultar' : 'Ver Frecuencias'}
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${mostrarTodasFrecuencias ? 'rotate-180' : ''}`} />
            </span>
          </button>

          {mostrarTodasFrecuencias && vtActual && (
            <div className="mt-2.5 space-y-2 animate-in fade-in duration-150">
              <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] text-slate-400">
                ℹ️ Las horas de salida desde cabeceras (El Tambo, Yangana, La Elvira) están calculadas con el tiempo oficial para llegar al control a tiempo.
              </div>

              <div className="divide-y divide-slate-800/80 rounded-2xl bg-slate-950/60 border border-slate-800 overflow-hidden">
                {vtActual.frecuencias.map((f, i) => {
                  const paramRuta = resolverParametrosRuta(f.routeFrom, f.routeTo, f.time);

                  return (
                    <div key={`${f.time}-${i}`} className="p-2.5 text-xs flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-black text-amber-400 text-sm">
                          {f.time}
                        </span>
                        <span className="text-[11px] font-bold text-slate-300">
                          {f.routeFrom} ➔ {f.routeTo}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Llegada ~{paramRuta.horaLlegada}
                        </span>
                      </div>

                      {paramRuta.cabeceraSalidaReal && (
                        <div className="text-[10px] font-extrabold text-emerald-300 bg-emerald-950/40 border border-emerald-500/20 px-2 py-0.5 rounded-md inline-block self-start mt-0.5">
                          {paramRuta.cabeceraSalidaReal}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
