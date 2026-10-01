'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Clock,
  Compass,
  ChevronDown,
  Wrench,
  AlertTriangle,
  MapPin,
  CheckCircle2,
  Calendar,
  RefreshCw,
  Gauge,
  RotateCcw,
} from 'lucide-react';
import {
  getConfiguracionFlotaLocal,
  getVentanaMayorParaVT,
  getAlertaEnlaceCritico,
  subscribeToVTConfig,
  verificarActualizacionFingerprint,
} from '@/lib/vt-ventanas-storage';
import { type MantenimientoBusItem } from '@/lib/mantenimiento-catalogo';
import { type EstacionServicioId } from '@/lib/mantenimiento-estaciones';
import { type VTConfiguracionItem } from '@/types/vt-ventanas';
import {
  obtenerUltimosArqueosBus,
  calcularProyeccionSecuencia,
  obtenerCalibracionLocalBus,
  sincronizarArqueosYCalibracion,
  normalizarDisco,
  obtenerFechaHoyLocal,
  type ResultadoProyeccionTurno,
} from '@/lib/turno-secuencia-tracker';
import {
  getLatestBusOdometer,
  saveBusOdometer,
  subscribeToBusOdometer,
} from '@/lib/fleet-storage';
import {
  evaluarVentanaParaMantenimiento,
  formatearTiempoCompacto,
} from './ChoferTurnoVentanasCard';

interface ChoferDisponibilidadCardProps {
  busId: string;
  disco: string;
  kmActual: number;
  itemsMantenimiento?: MantenimientoBusItem[];
  onAbrirEstacion?: (estacionId: EstacionServicioId, itemCodigo?: string) => void;
  className?: string;
}

export function ChoferDisponibilidadCard({
  busId,
  disco,
  kmActual,
  itemsMantenimiento = [],
  onAbrirEstacion,
  className = '',
}: ChoferDisponibilidadCardProps) {
  const [configFlota, setConfigFlota] = useState(() => getConfiguracionFlotaLocal());

  // 1. Odómetro local reactivo y sincronizado
  const [kmActualLocal, setKmActualLocal] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const dLimpio = normalizarDisco(disco);
      const odo = getLatestBusOdometer(dLimpio);
      if (odo && odo.kmFinal) {
        const num = parseInt(odo.kmFinal, 10);
        if (!isNaN(num) && num > 0) return num;
      }
    }
    return kmActual || 893485;
  });

  useEffect(() => {
    if (kmActual && kmActual > 0) {
      setKmActualLocal(kmActual);
    }
  }, [kmActual]);

  // Suscripción reactiva en tiempo real al odómetro
  useEffect(() => {
    const unsubOdo = subscribeToBusOdometer((data) => {
      const dLimpio = normalizarDisco(disco);
      if (data.numeroDisco === dLimpio || data.busId === busId) {
        const num = parseInt(data.kmFinal, 10);
        if (!isNaN(num) && num > 0) {
          setKmActualLocal(num);
        }
      }
    });
    return () => unsubOdo();
  }, [disco, busId]);

  // 2. Inicialización inteligente de turno con caducidad diaria de overrides
  const [selectedVTCode, setSelectedVTCode] = useState<string>(() => {
    const hoyStr = obtenerFechaHoyLocal();
    if (typeof window !== 'undefined') {
      const savedRaw = localStorage.getItem(`rg_chofer_selected_vt_${busId}`);
      if (savedRaw) {
        try {
          const parsed = JSON.parse(savedRaw);
          // Si el override manual pertenece al día de hoy, respetarlo
          if (parsed && parsed.codigo && parsed.fecha === hoyStr) {
            return parsed.codigo;
          }
        } catch {
          // Si era formato antiguo string simple sin fecha, se descartará al sincronizar
        }
      }
      const cal = obtenerCalibracionLocalBus(disco, busId);
      if (cal && cal.historial3Arqueos && cal.historial3Arqueos.length > 0) {
        const proy = calcularProyeccionSecuencia(cal.historial3Arqueos, null, hoyStr);
        if (proy?.turnoProyectado) return proy.turnoProyectado;
      }
    }

    // Default auditado para la Unidad 01 si es nueva apertura: VT11
    const dLimpio = (disco || busId || '').replace(/\D/g, '').padStart(2, '0');
    if (dLimpio === '01') {
      return 'VT11';
    }
    return 'VT01';
  });

  const [proyeccion, setProyeccion] = useState<ResultadoProyeccionTurno | null>(null);
  const [sincronizando, setSincronizando] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);
  const [cambiandoTurno, setCambiandoTurno] = useState(false);
  const [mostrarTodasVentanas, setMostrarTodasVentanas] = useState(true);
  const [mostrarCarreras, setMostrarCarreras] = useState(false);

  // Inferencia y sincronización de secuencia basada en la arquitectura Offline-First
  const ejecutarSincronizacion = useCallback(
    async (forzar = false) => {
      if (forzar) setSincronizando(true);
      const hoyStr = obtenerFechaHoyLocal();

      try {
        // Al forzar sincronización manual, limpiar override para adoptar la realidad calculada
        if (forzar && typeof window !== 'undefined') {
          localStorage.removeItem(`rg_chofer_selected_vt_${busId}`);
        }

        const res = await sincronizarArqueosYCalibracion(disco, busId);
        setProyeccion(res.proyeccion);

        // Actualizar turno proyectado
        if (res.proyeccion?.turnoProyectado) {
          if (forzar) {
            setSelectedVTCode(res.proyeccion.turnoProyectado);
          } else if (typeof window !== 'undefined') {
            const manualRaw = localStorage.getItem(`rg_chofer_selected_vt_${busId}`);
            let manualValidoDeHoy = false;
            if (manualRaw) {
              try {
                const parsed = JSON.parse(manualRaw);
                if (parsed.codigo && parsed.fecha === hoyStr) {
                  manualValidoDeHoy = true;
                }
              } catch {}
            }
            if (!manualValidoDeHoy) {
              setSelectedVTCode(res.proyeccion.turnoProyectado);
            }
          }
        }

        // Actualizar odómetro si el servidor devolvió una lectura verificada
        if (res.ultimoKmRegistrado && res.ultimoKmRegistrado > 0) {
          setKmActualLocal(res.ultimoKmRegistrado);
          saveBusOdometer(
            disco,
            res.ultimoKmRegistrado.toString(),
            res.fechaUltimoKm || hoyStr
          );
        }

        if (forzar) {
          const kmTexto = res.ultimoKmRegistrado ? ` • Odómetro: ${res.ultimoKmRegistrado.toLocaleString()} KM` : '';
          if (res.errorRed) {
            setSyncStatusMsg(`Modo local: proy. ${res.proyeccion.turnoProyectado}${kmTexto}`);
          } else {
            setSyncStatusMsg(`Sincronizado: ${res.proyeccion.turnoProyectado}${kmTexto}`);
          }
          setTimeout(() => setSyncStatusMsg(null), 4000);
        }
      } catch (err) {
        console.warn('[ChoferDisponibilidadCard] Error al sincronizar:', err);
        if (forzar) {
          setSyncStatusMsg('Modo offline: se mantiene la proyección calculada.');
          setTimeout(() => setSyncStatusMsg(null), 3500);
        }
      } finally {
        if (forzar) setSincronizando(false);
      }
    },
    [busId, disco]
  );

  useEffect(() => {
    ejecutarSincronizacion(false);
  }, [ejecutarSincronizacion]);

  // Actualización en background del catálogo de ventanas
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
        localStorage.setItem(
          `rg_chofer_selected_vt_${busId}`,
          JSON.stringify({ codigo, fecha: obtenerFechaHoyLocal() })
        );
      } catch {}
    }
  };

  const handleResetToProyectado = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(`rg_chofer_selected_vt_${busId}`);
    }
    if (proyeccion?.turnoProyectado) {
      setSelectedVTCode(proyeccion.turnoProyectado);
    }
  };

  const normalizarCodigo = (c: string) => (c || '').toUpperCase().replace(/^VT0+/, 'VT');

  const vtActual: VTConfiguracionItem = useMemo(() => {
    const target = normalizarCodigo(selectedVTCode);
    return (
      configFlota.vts.find(
        (v) => normalizarCodigo(v.codigo) === target
      ) || configFlota.vts[0] || {
        codigo: 'VT01',
        nombre: 'Turno Estándar',
        frecuencias: [],
        ventanas: [],
      }
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

  const ventanas = useMemo(() => {
    return vtActual.ventanas || [];
  }, [vtActual]);

  const ventanaMayor = useMemo(() => {
    const mayor = getVentanaMayorParaVT(selectedVTCode);
    if (mayor) return mayor;
    if (ventanas.length > 0) {
      const ordenadas = [...ventanas].sort((a, b) => b.duracionMinutos - a.duracionMinutos);
      return ordenadas[0];
    }
    return null;
  }, [selectedVTCode, ventanas]);

  const alertaEnlace = useMemo(() => {
    return getAlertaEnlaceCritico(selectedVTCode);
  }, [selectedVTCode]);

  // Cálculo del tiempo total disponible hoy
  const tiempoTotalLibreMinutos = useMemo(() => {
    return ventanas.reduce((acc, v) => acc + (v.duracionMinutos || 0), 0);
  }, [ventanas]);

  const esTurnoManual = Boolean(
    proyeccion?.turnoProyectado &&
    normalizarCodigo(selectedVTCode) !== normalizarCodigo(proyeccion.turnoProyectado)
  );

  return (
    <div
      className={`bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden transition-all ${className}`}
    >
      {/* ─── Cabecera Principal: Título Explícito de Disponibilidad y Turno ─── */}
      <div className="bg-slate-900 p-4 text-white">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-2xl bg-blue-600 flex items-center justify-center font-black text-xs text-white shrink-0 shadow-sm">
              {disco}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                  Disponibilidad de Tiempos
                </span>
                <span className="text-[10px] text-slate-400 font-bold">
                  • {ventanas.length} {ventanas.length === 1 ? 'ventana' : 'ventanas'}
                </span>
                {/* Badge de inferencia de secuencia */}
                {proyeccion?.estado === 'CONFIRMADO' && (
                  <span className="rounded-full bg-emerald-500/20 border border-emerald-400/30 px-2 py-0.2 text-[9px] font-bold text-emerald-300">
                    🟢 +{proyeccion.diasTranscurridosDesdeUltimoArqueo}d rotación
                  </span>
                )}
                {proyeccion?.estado === 'CALIBRANDO' && (
                  <span className="rounded-full bg-amber-500/20 border border-amber-400/30 px-2 py-0.2 text-[9px] font-bold text-amber-300">
                    🟡 Calibrando ({proyeccion.conteoArqueos}/3)
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <h3 className="text-base font-black text-white leading-tight">
                  {vtActual.codigo}
                </h3>
                <span className="text-xs text-slate-300 font-medium truncate">
                  ({formatearTiempoCompacto(tiempoTotalLibreMinutos)} libres hoy)
                </span>
              </div>
              {/* Odómetro del Conductor en Cabecera */}
              <div className="flex items-center gap-1.5 mt-1">
                <Gauge className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="text-[11px] font-bold text-amber-300 font-mono">
                  {(kmActualLocal || 893485).toLocaleString()} KM
                </span>
                <span className="text-[10px] text-slate-400 font-medium">
                  • Odómetro de ruta
                </span>
              </div>
            </div>
          </div>

          {/* Acciones de Cabecera: Sincronizar y Cambiar Turno */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Botón táctico de sincronización resiliente */}
            <button
              type="button"
              onClick={() => ejecutarSincronizacion(true)}
              disabled={sincronizando}
              className="flex items-center gap-1 bg-white/10 hover:bg-white/20 active:scale-95 border border-white/20 rounded-full px-2.5 py-1.5 text-xs font-bold text-white transition cursor-pointer disabled:opacity-50"
              title="Sincronizar arqueos y odómetro desde el servidor"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${sincronizando ? 'animate-spin text-emerald-400' : 'text-slate-200'}`} />
              <span className="hidden sm:inline text-[11px] font-bold">
                {sincronizando ? 'Sincronizando...' : 'Sincronizar'}
              </span>
            </button>

            {/* Selector de Turno Sutil */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setCambiandoTurno(!cambiandoTurno)}
                className="flex items-center gap-1 bg-white/10 hover:bg-white/20 active:scale-95 border border-white/20 rounded-full px-3 py-1.5 text-xs font-bold text-white transition cursor-pointer"
                title="Cambiar turno VT asignado"
              >
                <span>Cambiar VT</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              {cambiandoTurno && (
                <div className="absolute right-0 top-full mt-2 z-50 w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl animate-in fade-in zoom-in-95 text-slate-900">
                  <p className="mb-1.5 px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Seleccionar Cuaderno VT
                  </p>
                  <div className="max-h-56 overflow-y-auto space-y-1">
                    {configFlota.vts.map((v) => (
                      <button
                        key={v.codigo}
                        type="button"
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
        </div>

        {/* Banner de Turno Manual Override (con opción a restablecer al proyectado) */}
        {esTurnoManual && proyeccion?.turnoProyectado && (
          <div className="mt-2.5 flex items-center justify-between gap-2 rounded-xl bg-amber-500/20 border border-amber-400/30 px-3 py-1.5 text-xs text-amber-200">
            <div className="flex items-center gap-1.5 min-w-0">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
              <span className="truncate">
                Viendo <strong>{selectedVTCode}</strong> (manual). Sugerido hoy: <strong>{proyeccion.turnoProyectado}</strong>
              </span>
            </div>
            <button
              type="button"
              onClick={handleResetToProyectado}
              className="shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-400 text-slate-950 font-black text-[10px] hover:bg-amber-300 transition cursor-pointer active:scale-95"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Usar {proyeccion.turnoProyectado}</span>
            </button>
          </div>
        )}

        {/* Mensaje de estado de sincronización */}
        {syncStatusMsg && (
          <div className="mt-2.5 flex items-center justify-between gap-2 rounded-xl bg-slate-800/90 border border-slate-700 px-3 py-1.5 text-[11px] text-slate-200">
            <span>{syncStatusMsg}</span>
            <button
              type="button"
              onClick={() => setSyncStatusMsg(null)}
              className="text-slate-400 hover:text-white font-bold ml-1 text-xs"
            >
              ✕
            </button>
          </div>
        )}

        {/* Alerta de enlace crítico (si existe) */}
        {alertaEnlace && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-amber-500/20 border border-amber-400/30 px-3 py-1.5 text-xs text-amber-200">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
            <span className="font-medium">{alertaEnlace.descripcion}</span>
          </div>
        )}
      </div>

      {/* ─── Ventana Táctica Mayor con Tarea Asignable (Match Inteligente) ─── */}
      {ventanaMayor && (() => {
        const evalMayor = evaluarVentanaParaMantenimiento(ventanaMayor, itemsEfectivos, kmActualLocal);
        if (!evalMayor.tieneTareaAsignable) return null;

        return (
          <div className="border-b border-emerald-200/80 bg-emerald-50/90 p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2.5 min-w-0">
                <div
                  className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
                    evalMayor.tipoMatch === 'CHOFER'
                      ? 'bg-amber-600 text-white'
                      : 'bg-emerald-600 text-white'
                  }`}
                >
                  <Wrench className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800">
                      Oportunidad en {evalMayor.ciudadNombre}
                    </span>
                    <span className="rounded-full bg-emerald-200/80 px-2 py-0.5 text-[10px] font-black text-emerald-950">
                      {formatearTiempoCompacto(ventanaMayor.duracionMinutos)} libres
                    </span>
                  </div>
                  <p className="text-xs font-bold text-slate-800 mt-0.5 truncate">
                    {evalMayor.detalleTarea}
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono">
                    Horario: {ventanaMayor.horaInicio} a {ventanaMayor.horaFin} en {evalMayor.ciudadNombre}
                  </p>
                </div>
              </div>

              {onAbrirEstacion && evalMayor.estacionDestino && (
                <button
                  type="button"
                  onClick={() => onAbrirEstacion(evalMayor.estacionDestino!, evalMayor.itemCodigo)}
                  className="flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-black shadow-xs active:scale-95 transition-all cursor-pointer shrink-0 bg-[#053225] hover:bg-[#073b2d] text-emerald-300 hover:text-white"
                >
                  <Wrench className="h-3.5 w-3.5 text-emerald-400" />
                  <span>{evalMayor.textoBoton || 'Realizar Tarea →'}</span>
                </button>
              )}
            </div>
          </div>
        );
      })()}

      {/* ─── Cronología de Tiempos Disponibles en Terminales ─── */}
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-emerald-700" />
            <span>Ventanas de Espera en Terminal</span>
          </span>
          <button
            type="button"
            onClick={() => setMostrarTodasVentanas(!mostrarTodasVentanas)}
            className="text-[11px] font-black text-emerald-800 hover:text-emerald-950 cursor-pointer"
          >
            {mostrarTodasVentanas ? '▲ Colapsar' : `▼ Ver ${ventanas.length} Ventanas`}
          </button>
        </div>

        {mostrarTodasVentanas && (
          <div className="space-y-2">
            {ventanas.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-2 text-center">
                No hay ventanas operativas registradas para este turno.
              </p>
            ) : (
              ventanas.map((v, idx) => {
                const evalV = evaluarVentanaParaMantenimiento(v, itemsEfectivos, kmActualLocal);
                return (
                  <div
                    key={idx}
                    className={`rounded-2xl border p-2.5 sm:p-3 transition-all ${
                      evalV.tieneTareaAsignable
                        ? evalV.tipoMatch === 'CHOFER'
                          ? 'border-amber-300 bg-amber-50/80'
                          : 'border-emerald-300 bg-emerald-50/80'
                        : evalV.esPernocta
                        ? 'border-indigo-200 bg-indigo-50/50'
                        : 'border-slate-200/90 bg-slate-50/70 hover:bg-slate-100/80'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`h-7 w-7 rounded-xl flex items-center justify-center shrink-0 ${
                            evalV.tieneTareaAsignable
                              ? evalV.tipoMatch === 'CHOFER'
                                ? 'bg-amber-600 text-white'
                                : 'bg-emerald-600 text-white'
                              : evalV.esPernocta
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {evalV.tieneTareaAsignable ? (
                            <Wrench className="h-3.5 w-3.5" />
                          ) : evalV.esPernocta ? (
                            <span className="text-xs">🌙</span>
                          ) : (
                            <MapPin className="h-3.5 w-3.5" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-black text-xs text-slate-900">
                              {evalV.ciudadNombre}
                            </span>
                            <span className="rounded-full bg-emerald-100 px-2 py-0.2 text-[9px] font-black text-emerald-900">
                              {formatearTiempoCompacto(v.duracionMinutos)} libres
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              ({v.horaInicio} - {v.horaFin})
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 mt-0.5 truncate">
                            {evalV.tieneTareaAsignable
                              ? `💡 ${evalV.detalleTarea}`
                              : evalV.motivoNoTaller || 'Tiempo libre / espera de salida'}
                          </p>
                        </div>
                      </div>

                      {evalV.tieneTareaAsignable && onAbrirEstacion && evalV.estacionDestino && (
                        <button
                          type="button"
                          onClick={() => onAbrirEstacion(evalV.estacionDestino!, evalV.itemCodigo)}
                          className="shrink-0 px-2.5 py-1 rounded-xl bg-[#053225] hover:bg-[#073b2d] text-white text-[10px] font-black cursor-pointer active:scale-95 transition"
                        >
                          {evalV.textoBoton || 'Ir →'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ─── Botón Desplegable de Frecuencias / Carreras del Turno ─── */}
        {vtActual.frecuencias && vtActual.frecuencias.length > 0 && (
          <div className="pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setMostrarCarreras(!mostrarCarreras)}
              className="w-full py-2 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 flex items-center justify-between transition cursor-pointer active:scale-[0.99]"
            >
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                <span>Salidas Programadas ({vtActual.frecuencias.length} carreras)</span>
              </div>
              <span className="text-slate-500 font-bold text-[10px]">
                {mostrarCarreras ? '▲ Ocultar' : '▼ Ver Itinerario'}
              </span>
            </button>

            {mostrarCarreras && (
              <div className="mt-2 space-y-1.5 max-h-52 overflow-y-auto pr-1">
                {vtActual.frecuencias.map((f, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded-xl bg-white border border-slate-200 text-xs flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-md bg-blue-50 text-blue-700 flex items-center justify-center text-[10px] font-black">
                        {idx + 1}
                      </span>
                      <div>
                        <p className="font-extrabold text-slate-800">
                          {f.origen} → {f.destino}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          Salida: {f.horaSalida} • Retorno: {f.horaLlegada || 'En ruta'}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                      {f.horaSalida}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
