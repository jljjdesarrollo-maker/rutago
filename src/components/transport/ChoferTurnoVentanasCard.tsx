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

interface EvaluacionMantenimientoVentana {
  esLoja: boolean;
  esPernocta: boolean;
  ciudadNombre: string;
  subtituloCiudad: string;
  tipoBadgeCiudad: 'loja' | 'ruta' | 'pernocta';
  tieneTareaAsignable: boolean;
  tipoMatch?: 'CHOFER' | 'FOSA' | 'TALLER';
  estacionDestino?: EstacionServicioId;
  itemCodigo?: string;
  textoBoton?: string;
  tituloBadge?: string;
  detalleTarea?: string;
  esUrgente: boolean;
  motivoNoTaller?: string;
}

function esTareaDeChofer(codigo: string = '', nombre: string = ''): boolean {
  const c = codigo.toUpperCase();
  const n = nombre.toLowerCase();
  return (
    c.includes('BATERIA') || n.includes('bater') ||
    c.includes('SOPLADO') || n.includes('soplado') || n.includes('filtro aire') ||
    c.includes('RACHES') || n.includes('rach') || n.includes('matraca') ||
    n.includes('malla') ||
    n.includes('presion') || n.includes('calibrar neum') ||
    n.includes('inspeccion') || n.includes('niveles') ||
    (n.includes('engrase') && (n.includes('manual') || n.includes('rutina')))
  );
}

function estimarTareaMantenimiento(it: MantenimientoBusItem) {
  const c = (it.codigo || '').toUpperCase();
  const n = (it.nombre || '').toLowerCase();
  const esChofer = Boolean(it.esRutinaChoferCeroCosto) || esTareaDeChofer(c, n);

  let tiempoRequeridoMinutos = 20;
  let estacionId: EstacionServicioId = 'CHOFER_RUTINA';
  let labelBoton = 'Asentar Tarea →';
  let tipo: 'CHOFER' | 'FOSA' | 'TALLER' = 'CHOFER';

  if (esChofer) {
    tipo = 'CHOFER';
    estacionId = 'CHOFER_RUTINA';
    if (n.includes('bater')) {
      tiempoRequeridoMinutos = 20;
      labelBoton = 'Rotar Baterías →';
    } else if (n.includes('sopl') || n.includes('aire')) {
      tiempoRequeridoMinutos = 15;
      labelBoton = 'Soplar Filtro →';
    } else if (n.includes('rach') || n.includes('matraca')) {
      tiempoRequeridoMinutos = 15;
      labelBoton = 'Calibrar Raches →';
    } else if (n.includes('llanta') || n.includes('presion')) {
      tiempoRequeridoMinutos = 15;
      estacionId = 'ALINEACION';
      labelBoton = 'Calibrar Llantas →';
    } else {
      tiempoRequeridoMinutos = 15;
      labelBoton = 'Asentar Rutina →';
    }
  } else {
    // Tareas exclusivas de Fosa y Taller Oficial (Solo Loja)
    if (c.includes('ACEITE') || n.includes('aceite') || c.includes('FILT') || n.includes('filtro')) {
      tipo = 'FOSA';
      tiempoRequeridoMinutos = 45;
      estacionId = 'LUBRICADORA';
      labelBoton = 'Ir a Fosa →';
    } else if (n.includes('freno') || n.includes('zapata') || n.includes('pulmon') || c.includes('FREN')) {
      tipo = 'TALLER';
      tiempoRequeridoMinutos = 75;
      estacionId = 'FRENOS_RUEDAS';
      labelBoton = 'Ir a Frenos →';
    } else if (n.includes('llanta') || n.includes('alinea') || c.includes('LLAN')) {
      tipo = 'TALLER';
      tiempoRequeridoMinutos = 45;
      estacionId = 'ALINEACION';
      labelBoton = 'Ir a Llantera →';
    } else if (n.includes('engrase')) {
      tipo = 'FOSA';
      tiempoRequeridoMinutos = 25;
      estacionId = 'LUBRICADORA';
      labelBoton = 'Ir a Engrase (Fosa) →';
    } else {
      tipo = 'TALLER';
      tiempoRequeridoMinutos = 90;
      estacionId = 'MNT_MAYOR';
      labelBoton = 'Ir a Taller Mayor →';
    }
  }

  return { esChofer, tiempoRequeridoMinutos, estacionId, labelBoton, tipo };
}

function evaluarVentanaParaMantenimiento(
  v: any,
  items: MantenimientoBusItem[],
  kmActual: number
): EvaluacionMantenimientoVentana {
  const ubicacionRaw = ((v?.ubicacion || v?.ciudad || '') as string).trim();
  const ubLower = ubicacionRaw.toLowerCase();
  const esLoja = ubLower.includes('loja');

  // Detección de pernocta nocturna
  const esPernocta =
    v?.tipo === 'PERNOCTA_EXTERNA' ||
    (v?.duracionMinutos >= 360 && (v?.horaInicio >= '20:00' || v?.horaInicio <= '04:00'));

  let ciudadNombre = 'BASE LOJA';
  let subtituloCiudad = 'Sede Talleres y Fosas';
  let tipoBadgeCiudad: 'loja' | 'ruta' | 'pernocta' = 'loja';

  if (esLoja) {
    ciudadNombre = 'BASE LOJA';
    subtituloCiudad = 'Sede Talleres y Fosas';
    tipoBadgeCiudad = 'loja';
  } else if (ubLower.includes('tambo')) {
    ciudadNombre = 'EL TAMBO';
    subtituloCiudad = 'Terminal de Cabecera';
    tipoBadgeCiudad = 'ruta';
  } else if (ubLower.includes('vilcabamba')) {
    ciudadNombre = 'VILCABAMBA';
    subtituloCiudad = esPernocta ? 'Pernocta Externa' : 'Terminal de Cabecera';
    tipoBadgeCiudad = esPernocta ? 'pernocta' : 'ruta';
  } else if (ubLower.includes('yangana')) {
    ciudadNombre = 'YANGANA';
    subtituloCiudad = 'Terminal de Cabecera';
    tipoBadgeCiudad = 'ruta';
  } else if (ubLower.includes('malacatos')) {
    ciudadNombre = 'MALACATOS';
    subtituloCiudad = 'Terminal de Paso';
    tipoBadgeCiudad = 'ruta';
  } else if (esPernocta) {
    ciudadNombre = ubicacionRaw ? ubicacionRaw.toUpperCase() : 'PERNOCTA';
    subtituloCiudad = 'Pernocta Externa';
    tipoBadgeCiudad = 'pernocta';
  } else {
    ciudadNombre = ubicacionRaw ? ubicacionRaw.toUpperCase() : 'TERMINAL EN RUTA';
    subtituloCiudad = 'Terminal de Ruta';
    tipoBadgeCiudad = 'ruta';
  }

  if (esPernocta) {
    return {
      esLoja,
      esPernocta: true,
      ciudadNombre,
      subtituloCiudad,
      tipoBadgeCiudad: 'pernocta',
      tieneTareaAsignable: false,
      esUrgente: false,
      motivoNoTaller: 'Fin de jornada • Pernocta y descanso nocturno obligatorio',
    };
  }

  // Evaluar estado mecánico de todos los ítems
  const itemsEvaluados = (items || []).map((it) => {
    const kmTranscurridos = Math.max(0, kmActual - (it.ultimoKm || 0));
    const intervalo = it.intervaloKm || 5000;
    const kmRestantes = intervalo - kmTranscurridos;
    const esVencido = kmRestantes <= 0;
    const esProximo = !esVencido && kmRestantes <= 500;
    const est = estimarTareaMantenimiento(it);

    return {
      item: it,
      kmRestantes,
      esVencido,
      esProximo,
      ...est,
      prioridad: esVencido ? 2 : esProximo ? 1 : 0,
    };
  });

  const pendientes = itemsEvaluados
    .filter((t) => t.prioridad > 0)
    .sort((a, b) => b.prioridad - a.prioridad || a.kmRestantes - b.kmRestantes);

  // Si no hay tareas vencidas ni próximas: Unidad al día
  if (pendientes.length === 0) {
    return {
      esLoja,
      esPernocta: false,
      ciudadNombre,
      subtituloCiudad,
      tipoBadgeCiudad,
      tieneTareaAsignable: false,
      esUrgente: false,
      motivoNoTaller: esLoja
        ? 'Base Loja • Unidad al día (sin mantenimientos pendientes)'
        : `Terminal ${ciudadNombre} • Espera de salida y descanso`,
    };
  }

  // Filtrado según ubicación geográfica:
  // Si NO es Loja: Solo son elegibles las tareas del Chofer (Rutina $0)
  // Si ES Loja: Son elegibles TODAS las tareas (tanto Fosa/Taller como Chofer)
  const tareasElegiblesEnEstaCiudad = pendientes.filter((t) => esLoja || t.esChofer);

  // Buscar la tarea prioritaria que quepa en el tiempo libre de la ventana
  const tareaQueCabe = tareasElegiblesEnEstaCiudad.find(
    (t) => v.duracionMinutos >= t.tiempoRequeridoMinutos
  );

  if (tareaQueCabe) {
    const it = tareaQueCabe.item;
    const descUrgencia = tareaQueCabe.esVencido
      ? `Vencido hace ${Math.abs(tareaQueCabe.kmRestantes).toLocaleString()} km`
      : `Por vencer en ${tareaQueCabe.kmRestantes.toLocaleString()} km`;

    let tituloBadge = '';
    if (tareaQueCabe.tipo === 'CHOFER') {
      tituloBadge = tareaQueCabe.esVencido ? '🚨 Rutina Chofer ($0)' : '💡 Rutina Chofer ($0)';
    } else if (tareaQueCabe.tipo === 'FOSA') {
      tituloBadge = tareaQueCabe.esVencido ? '🚨 Fosa Oficial' : '💡 Fosa Disponible';
    } else {
      tituloBadge = tareaQueCabe.esVencido ? '🚨 Taller Mecánico' : '💡 Taller Mecánico';
    }

    return {
      esLoja,
      esPernocta: false,
      ciudadNombre,
      subtituloCiudad,
      tipoBadgeCiudad,
      tieneTareaAsignable: true,
      tipoMatch: tareaQueCabe.tipo,
      estacionDestino: tareaQueCabe.estacionId,
      itemCodigo: it.codigo,
      textoBoton: tareaQueCabe.labelBoton,
      tituloBadge,
      detalleTarea: `${it.nombre} (${descUrgencia} • ~${tareaQueCabe.tiempoRequeridoMinutos}m)`,
      esUrgente: tareaQueCabe.esVencido,
    };
  }

  // Si hay pendientes pero no caben en esta ventana
  const proximaPendiente = tareasElegiblesEnEstaCiudad[0];
  if (proximaPendiente) {
    return {
      esLoja,
      esPernocta: false,
      ciudadNombre,
      subtituloCiudad,
      tipoBadgeCiudad,
      tieneTareaAsignable: false,
      esUrgente: false,
      motivoNoTaller: `Tiempo corto (${v.duracionMinutos}m) para ${proximaPendiente.item.nombre} (requiere ~${proximaPendiente.tiempoRequeridoMinutos}m)`,
    };
  }

  // Si había pendientes pero eran de taller y estamos fuera de Loja
  return {
    esLoja,
    esPernocta: false,
    ciudadNombre,
    subtituloCiudad,
    tipoBadgeCiudad,
    tieneTareaAsignable: false,
    esUrgente: false,
    motivoNoTaller: `Terminal ${ciudadNombre} • Espera de salida y descanso (talleres oficiales en Loja)`,
  };
}

function formatearTiempoCompacto(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h00`;
  return `${h}h${String(m).padStart(2, '0')}`;
}

interface ChoferTurnoVentanasCardProps {
  busId: string;
  disco: string;
  kmActual: number;
  itemsMantenimiento?: MantenimientoBusItem[];
  onAbrirEstacion?: (estacionId: EstacionServicioId, itemCodigo?: string) => void;
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

  const normalizarCodigo = (c: string) => (c || '').toUpperCase().replace(/^VT0+/, 'VT');

  const vtActual: VTConfiguracionItem | undefined = useMemo(() => {
    const target = normalizarCodigo(selectedVTCode);
    return (
      configFlota.vts.find(
        (v) => normalizarCodigo(v.codigo) === target
      ) || configFlota.vts[0]
    );
  }, [configFlota, selectedVTCode]);

  // Respaldo de items de mantenimiento en caso de retardo de props
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
                  ({vtActual.nombre || `${vtActual.frecuencias?.length || 0} Frecuencias`})
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
                        {v.frecuencias?.length || 0} carreras
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

      {/* ─── Ventana Técnica Mayor (Recomendada con Match Inteligente) ─── */}
      {(() => {
        if (!ventanaMayor) return null;
        const evalMayor = evaluarVentanaParaMantenimiento(ventanaMayor, itemsEfectivos, kmActual);
        if (!evalMayor.tieneTareaAsignable) return null;

        return (
          <div className="border-b border-emerald-200/80 bg-emerald-50/90 p-3.5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-xs shrink-0 ${
                  evalMayor.tipoMatch === 'CHOFER' ? 'bg-amber-600' : 'bg-emerald-700'
                }`}>
                  {evalMayor.tipoMatch === 'CHOFER' ? (
                    <span className="text-base">🚌</span>
                  ) : (
                    <Wrench className="h-4.5 w-4.5" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-900">
                      {evalMayor.ciudadNombre}: {evalMayor.tituloBadge}
                    </span>
                    <span className="rounded-full bg-emerald-200 px-2 py-0.2 text-[9px] font-black text-emerald-950">
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
                  className={`flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-black shadow-xs active:scale-95 transition-all cursor-pointer shrink-0 ${
                    evalMayor.tipoMatch === 'CHOFER'
                      ? 'bg-amber-600 hover:bg-amber-700 text-white'
                      : 'bg-[#053225] hover:bg-[#073b2d] text-emerald-300 hover:text-white'
                  }`}
                >
                  {evalMayor.tipoMatch === 'CHOFER' ? (
                    <span className="text-sm">🚌</span>
                  ) : (
                    <Wrench className="h-3.5 w-3.5 text-emerald-400" />
                  )}
                  <span>{evalMayor.textoBoton || 'Realizar Tarea →'}</span>
                </button>
              )}
            </div>
          </div>
        );
      })()}

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
          <div className="space-y-2">
            {ventanas.map((v, idx) => {
              const tiempoFormateado = formatearTiempoCompacto(v.duracionMinutos);
              const evaluacion = evaluarVentanaParaMantenimiento(v, itemsEfectivos, kmActual);

              return (
                <div
                  key={idx}
                  className={`rounded-2xl border p-2.5 sm:p-3 transition-all ${
                    evaluacion.tieneTareaAsignable
                      ? evaluacion.tipoMatch === 'CHOFER'
                        ? 'border-amber-300 bg-amber-50/80 shadow-xs'
                        : evaluacion.esUrgente
                        ? 'border-rose-300 bg-rose-50/80 shadow-xs'
                        : 'border-emerald-300 bg-emerald-50/80 shadow-xs'
                      : evaluacion.esPernocta
                      ? 'border-indigo-200 bg-indigo-50/50'
                      : 'border-slate-100 bg-slate-50/70 hover:bg-slate-100/80'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`h-7 w-7 rounded-xl flex items-center justify-center shrink-0 ${
                          evaluacion.tieneTareaAsignable
                            ? evaluacion.tipoMatch === 'CHOFER'
                              ? 'bg-amber-600 text-white shadow-2xs'
                              : evaluacion.esUrgente
                              ? 'bg-rose-600 text-white shadow-2xs'
                              : 'bg-emerald-600 text-white shadow-2xs'
                            : evaluacion.esPernocta
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-200 text-slate-500'
                        }`}
                      >
                        {evaluacion.tieneTareaAsignable ? (
                          evaluacion.tipoMatch === 'CHOFER' ? (
                            <span className="text-xs">🚌</span>
                          ) : (
                            <Wrench className="h-3.5 w-3.5" />
                          )
                        ) : evaluacion.esPernocta ? (
                          <span className="text-xs">🌙</span>
                        ) : (
                          <MapPin className="h-3.5 w-3.5" />
                        )}
                      </div>

                      <div className="min-w-0">
                        {/* Cabecera de Ciudad con Distintivo de Color */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {evaluacion.tipoBadgeCiudad === 'loja' ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-600/15 border border-emerald-500/30 px-1.5 py-0.2 text-[10px] font-black uppercase tracking-wider text-emerald-900">
                              🏢 {evaluacion.ciudadNombre}
                              <span className="text-[9px] font-semibold text-emerald-700">
                                • {evaluacion.subtituloCiudad}
                              </span>
                            </span>
                          ) : evaluacion.tipoBadgeCiudad === 'pernocta' ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-indigo-600/15 border border-indigo-500/30 px-1.5 py-0.2 text-[10px] font-black uppercase tracking-wider text-indigo-900">
                              🌙 {evaluacion.ciudadNombre}
                              <span className="text-[9px] font-semibold text-indigo-700">
                                • {evaluacion.subtituloCiudad}
                              </span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-md bg-sky-600/15 border border-sky-500/30 px-1.5 py-0.2 text-[10px] font-black uppercase tracking-wider text-sky-900">
                              📍 {evaluacion.ciudadNombre}
                              <span className="text-[9px] font-semibold text-sky-700">
                                • {evaluacion.subtituloCiudad}
                              </span>
                            </span>
                          )}

                          {evaluacion.tieneTareaAsignable && (
                            <span
                              className={`rounded-full font-black text-[9px] px-1.5 py-0.2 tracking-wide uppercase ${
                                evaluacion.tipoMatch === 'CHOFER'
                                  ? 'bg-amber-200 text-amber-950 font-bold'
                                  : evaluacion.esUrgente
                                  ? 'bg-rose-200 text-rose-950'
                                  : 'bg-emerald-200 text-emerald-950'
                              }`}
                            >
                              {evaluacion.tituloBadge}
                            </span>
                          )}
                        </div>

                        {/* Descripción técnica inteligente */}
                        {evaluacion.tieneTareaAsignable ? (
                          <p className="text-[11px] font-bold text-slate-800 mt-0.5 truncate">
                            {evaluacion.detalleTarea}
                          </p>
                        ) : (
                          <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                            {evaluacion.motivoNoTaller}
                          </p>
                        )}

                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                          {v.horaInicio} – {v.horaFin}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                      {/* Pastilla llamativa del tiempo en formato 1h35 */}
                      <span
                        className={`font-mono font-black text-xs px-2.5 py-1 rounded-xl shadow-2xs ${
                          evaluacion.tieneTareaAsignable
                            ? evaluacion.tipoMatch === 'CHOFER'
                              ? 'bg-amber-600 text-white ring-2 ring-amber-400/40'
                              : evaluacion.esUrgente
                              ? 'bg-rose-700 text-white ring-2 ring-rose-400/40'
                              : 'bg-emerald-700 text-white ring-2 ring-emerald-400/40'
                            : evaluacion.esPernocta
                            ? 'bg-indigo-700 text-white'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {tiempoFormateado}
                      </span>

                      {/* Botón táctico directo para Chofer o Taller */}
                      {evaluacion.tieneTareaAsignable && onAbrirEstacion && evaluacion.estacionDestino && (
                        <button
                          type="button"
                          onClick={() => onAbrirEstacion(evaluacion.estacionDestino!, evaluacion.itemCodigo)}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-black transition-all shadow-xs cursor-pointer active:scale-95 ${
                            evaluacion.tipoMatch === 'CHOFER'
                              ? 'bg-amber-600 hover:bg-amber-700 text-white'
                              : evaluacion.esUrgente
                              ? 'bg-rose-800 hover:bg-rose-900 text-white'
                              : 'bg-[#053225] hover:bg-[#073b2d] text-emerald-300 hover:text-white'
                          }`}
                        >
                          {evaluacion.tipoMatch === 'CHOFER' ? (
                            <span className="text-xs">🚌</span>
                          ) : (
                            <Wrench className="w-3 h-3" />
                          )}
                          <span>{evaluacion.textoBoton}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {/* ─── Desglose de Frecuencias Oficiales ─── */}
        <div className="mt-3 pt-2.5 border-t border-slate-100">
          <button
            onClick={() => setMostrarTodasFrecuencias(!mostrarTodasFrecuencias)}
            className="flex w-full items-center justify-between text-[11px] font-bold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
          >
            <span>Ver {vtActual.frecuencias?.length || 0} carreras del itinerario</span>
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform ${
                mostrarTodasFrecuencias ? 'rotate-180' : ''
              }`}
            />
          </button>

          {mostrarTodasFrecuencias && vtActual.frecuencias && (
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
