'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  Fuel,
  Gauge,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  X,
  Building2,
  Bus as BusIcon,
  RefreshCw,
  Award,
  ChevronDown,
  ChevronUp,
  Wifi,
  WifiOff,
  DollarSign,
  Clock,
  Wrench,
  Sparkles,
} from 'lucide-react';
import {
  type ReporteSocioPayload,
  type ModoAuditoriaSocio,
  getReporteCalendarioSnapshot,
  saveReporteCalendarioSnapshot,
} from '@/lib/reporte-calendario-socio';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  busId: string;
  numeroDisco: string;
}

export function ReporteSocioCalendarioModal({ isOpen, onClose, busId, numeroDisco }: Props) {
  const [modo, setModo] = useState<ModoAuditoriaSocio>('15_DIAS');
  const [customDesde, setCustomDesde] = useState<string>('');
  const [customHasta, setCustomHasta] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [reporte, setReporte] = useState<ReporteSocioPayload | null>(null);
  const [networkStatus, setNetworkStatus] = useState<'live' | 'stale' | 'syncing'>('syncing');
  const [lastSyncTime, setLastSyncTime] = useState<string>('');
  const [showRanking, setShowRanking] = useState(false);

  // Fechas de límite defensivo para calendario personalizado (Máx 60 días, corte a ayer)
  const { ayerIso, limite60DiasIso, defaultDesdeIso } = React.useMemo(() => {
    const hoy = new Date();
    const ayer = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - 1, 12, 0, 0);
    const y = ayer.getFullYear();
    const m = String(ayer.getMonth() + 1).padStart(2, '0');
    const d = String(ayer.getDate()).padStart(2, '0');
    const ay = `${y}-${m}-${d}`;

    const lim = new Date(ayer);
    lim.setDate(ayer.getDate() - 59); // 60 días máximo
    const ly = lim.getFullYear();
    const lm = String(lim.getMonth() + 1).padStart(2, '0');
    const ld = String(lim.getDate()).padStart(2, '0');
    const limIso = `${ly}-${lm}-${ld}`;

    const def = new Date(ayer);
    def.setDate(ayer.getDate() - 29);
    const dy = def.getFullYear();
    const dm = String(def.getMonth() + 1).padStart(2, '0');
    const dd = String(def.getDate()).padStart(2, '0');
    const defIso = `${dy}-${dm}-${dd}`;

    return { ayerIso: ay, limite60DiasIso: limIso, defaultDesdeIso: defIso };
  }, []);

  // Inicializar inputs personalizados con valores seguros por defecto
  useEffect(() => {
    if (!customHasta && ayerIso) setCustomHasta(ayerIso);
    if (!customDesde && defaultDesdeIso) setCustomDesde(defaultDesdeIso);
  }, [ayerIso, defaultDesdeIso, customHasta, customDesde]);

  // Función de carga con estrategia Offline-First (SWR)
  const cargarReporte = useCallback(
    async (
      modoSel: ModoAuditoriaSocio,
      opciones?: { desde?: string; hasta?: string; forzarRed?: boolean }
    ) => {
      const forzarRed = opciones?.forzarRed || false;
      const fIni = opciones?.desde || customDesde || defaultDesdeIso;
      const fFin = opciones?.hasta || customHasta || ayerIso;
      const claveCache =
        modoSel === 'PERSONALIZADO'
          ? `CUSTOM_${fIni}_${fFin}`
          : modoSel;

      // 1. Carga inmediata de 0 ms desde caché local
      const cached = getReporteCalendarioSnapshot(busId, claveCache);
      if (cached && !forzarRed) {
        setReporte(cached.payload);
        const fechaCach = new Date(cached.cachedAt);
        setLastSyncTime(
          fechaCach.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        );
        setNetworkStatus('stale');
      } else if (!cached) {
        setLoading(true);
      }

      // 2. Revalidación en segundo plano contra PostgreSQL
      setIsRefreshing(true);
      setNetworkStatus('syncing');

      try {
        let url = `/api/socio/reporte-calendario?busId=${encodeURIComponent(busId)}&modo=${encodeURIComponent(modoSel)}`;
        if (modoSel === 'PERSONALIZADO') {
          url += `&fechaInicio=${encodeURIComponent(fIni)}&fechaFin=${encodeURIComponent(fFin)}`;
        }

        const res = await fetch(url);
        if (!res.ok) throw new Error('Respuesta no satisfactoria del servidor');

        const data: ReporteSocioPayload = await res.json();
        setReporte(data);
        saveReporteCalendarioSnapshot(busId, claveCache, data);

        const ahora = new Date();
        setLastSyncTime(
          ahora.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        );
        setNetworkStatus('live');
      } catch (err) {
        console.warn('Operando en modo offline o sin red para reporte calendario:', err);
        // Si falló pero teníamos caché previa, se mantiene
        if (cached) {
          setNetworkStatus('stale');
        }
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    },
    [busId, customDesde, customHasta, defaultDesdeIso, ayerIso]
  );

  const handleSeleccionarModo = (nuevoModo: ModoAuditoriaSocio) => {
    setModo(nuevoModo);
    if (nuevoModo !== 'PERSONALIZADO') {
      cargarReporte(nuevoModo);
    } else {
      cargarReporte('PERSONALIZADO', {
        desde: customDesde || defaultDesdeIso,
        hasta: customHasta || ayerIso,
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      cargarReporte(modo);
    }
  }, [isOpen, modo, cargarReporte]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-slate-950 border border-slate-800 text-white w-full max-w-2xl max-h-[94vh] rounded-t-3xl sm:rounded-3xl flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-200">
        
        {/* Cabecera Principal */}
        <div className="p-4 bg-slate-900/90 border-b border-slate-800/90 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <BusIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base text-white tracking-tight">
                  Auditoría Calendario • Bus {numeroDisco}
                </h3>
                {/* Chip de estado de conectividad */}
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    networkStatus === 'live'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : networkStatus === 'syncing'
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                  title={
                    networkStatus === 'live'
                      ? 'Datos actualizados en vivo desde la base de datos'
                      : networkStatus === 'syncing'
                      ? 'Sincronizando con PostgreSQL...'
                      : 'Mostrando datos de memoria local'
                  }
                >
                  {networkStatus === 'live' ? (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span>En Vivo {lastSyncTime}</span>
                    </>
                  ) : networkStatus === 'syncing' ? (
                    <>
                      <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                      <span>Sincronizando...</span>
                    </>
                  ) : (
                    <>
                      <WifiOff className="w-2.5 h-2.5 text-slate-400" />
                      <span>Caché {lastSyncTime}</span>
                    </>
                  )}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Línea temporal fija sin sesgos • $/km diésel y baches de ayudante
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => cargarReporte(modo, { forzarRed: true })}
              disabled={isRefreshing}
              className="w-9 h-9 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 flex items-center justify-center active:scale-95 transition cursor-pointer"
              title="Refrescar datos de la nube"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-amber-400' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center active:scale-95 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Selector Inteligente de Cierres de Calendario */}
        <div className="px-4 py-3 bg-slate-900/80 border-b border-slate-800/80 space-y-2.5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 bg-slate-950 rounded-2xl border border-slate-800 shadow-inner">
            <button
              type="button"
              onClick={() => handleSeleccionarModo('15_DIAS')}
              className={`px-2.5 py-2 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer text-center ${
                modo === '15_DIAS'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              15 Días (Rueda VT)
            </button>
            <button
              type="button"
              onClick={() => handleSeleccionarModo('MES_ANTERIOR')}
              className={`px-2.5 py-2 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer text-center ${
                modo === 'MES_ANTERIOR'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              Mes Anterior
            </button>
            <button
              type="button"
              onClick={() => handleSeleccionarModo('MES_ACTUAL')}
              className={`px-2.5 py-2 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer text-center ${
                modo === 'MES_ACTUAL'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              Mes en Curso
            </button>
            <button
              type="button"
              onClick={() => handleSeleccionarModo('PERSONALIZADO')}
              className={`px-2.5 py-2 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer text-center ${
                modo === 'PERSONALIZADO'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              📅 Rango (Máx 60d)
            </button>
          </div>

          {/* Formulario Desplegable para Rango Personalizado */}
          {modo === 'PERSONALIZADO' && (
            <div className="p-2.5 bg-slate-950/70 border border-slate-800 rounded-xl flex flex-wrap sm:flex-nowrap items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="flex items-center gap-1.5 flex-1 min-w-[130px]">
                <label className="text-[11px] font-semibold text-slate-400 shrink-0">Desde:</label>
                <input
                  type="date"
                  value={customDesde}
                  min={limite60DiasIso}
                  max={customHasta || ayerIso}
                  onChange={(e) => setCustomDesde(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-lg px-2 py-1 text-xs text-white outline-none"
                />
              </div>
              <div className="flex items-center gap-1.5 flex-1 min-w-[130px]">
                <label className="text-[11px] font-semibold text-slate-400 shrink-0">Hasta:</label>
                <input
                  type="date"
                  value={customHasta}
                  min={customDesde || limite60DiasIso}
                  max={ayerIso}
                  onChange={(e) => setCustomHasta(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-lg px-2 py-1 text-xs text-white outline-none"
                />
              </div>
              <button
                type="button"
                onClick={() =>
                  cargarReporte('PERSONALIZADO', {
                    desde: customDesde,
                    hasta: customHasta,
                    forzarRed: true,
                  })
                }
                disabled={isRefreshing || !customDesde || !customHasta}
                className="w-full sm:w-auto px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition active:scale-95 disabled:opacity-50 cursor-pointer shrink-0"
              >
                Aplicar Rango
              </button>
            </div>
          )}

          {/* Cinta de Micro-Feedback Dinámico */}
          <div className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  reporte?.ventana.esPeriodoCerrado !== false
                    ? 'bg-emerald-400'
                    : 'bg-amber-400 animate-pulse'
                }`}
              />
              <span className="font-medium text-slate-300 truncate text-[11px] sm:text-xs">
                {reporte?.ventana.descripcionPeriodo || (
                  reporte?.ventana
                    ? `${reporte.ventana.fechaInicio} — ${reporte.ventana.fechaFin} (${reporte.ventana.dias} días)`
                    : 'Calculando período de auditoría...'
                )}
              </span>
            </div>
            <span
              className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full shrink-0 tracking-wide ${
                reporte?.ventana.esPeriodoCerrado !== false
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
              }`}
            >
              {reporte?.ventana.esPeriodoCerrado !== false ? 'Período Cerrado' : 'Cierre Parcial'}
            </span>
          </div>
        </div>

        {/* Cuerpo Principal del Reporte con Scroll */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {loading && !reporte ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-400">
              <div className="w-9 h-9 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-semibold">Auditando fechas de calendario y consumos...</p>
            </div>
          ) : reporte ? (
            <>
              {/* 1. Tarjeta del Dictamen Ejecutivo de la IA */}
              <div
                className={`p-4 rounded-2xl border ${
                  reporte.dictamen.badgeColor === 'emerald'
                    ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200'
                    : reporte.dictamen.badgeColor === 'rose'
                    ? 'bg-rose-950/40 border-rose-500/30 text-rose-200'
                    : reporte.dictamen.badgeColor === 'amber'
                    ? 'bg-amber-950/40 border-amber-500/30 text-amber-200'
                    : 'bg-blue-950/40 border-blue-500/30 text-blue-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl shrink-0 mt-0.5">{reporte.dictamen.icon}</span>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-sm text-white flex items-center gap-2">
                        {reporte.dictamen.titulo}
                      </h4>
                      <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-white/10 text-white">
                        {reporte.dictamen.nivel.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed pt-0.5">
                      {reporte.dictamen.resumen}
                    </p>
                    {reporte.dictamen.recomendaciones.length > 0 && (
                      <div className="mt-2.5 pt-2 border-t border-white/10 space-y-1 text-[11px] text-slate-300">
                        {reporte.dictamen.recomendaciones.map((rec, i) => (
                          <div key={i} className="flex items-start gap-1.5">
                            <span className="text-amber-400 font-bold shrink-0">•</span>
                            <span>{rec}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 2. Auditoría de Cobertura y Baches del Ayudante */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-200 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-amber-400" />
                    Cobertura de Jornadas Cerradas:
                  </span>
                  <span
                    className={`font-black px-2.5 py-0.5 rounded-full text-[11px] ${
                      reporte.unidadSocio.coberturaPorcentaje >= 85
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : reporte.unidadSocio.coberturaPorcentaje >= 60
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}
                  >
                    {reporte.unidadSocio.diasConRegistro} / {reporte.unidadSocio.diasCalendario} Días (
                    {reporte.unidadSocio.coberturaPorcentaje}%)
                  </span>
                </div>

                {/* Barra visual de cobertura */}
                <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-800">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      reporte.unidadSocio.coberturaPorcentaje >= 85
                        ? 'bg-emerald-500'
                        : reporte.unidadSocio.coberturaPorcentaje >= 60
                        ? 'bg-amber-500'
                        : 'bg-rose-500'
                    }`}
                    style={{ width: `${Math.min(reporte.unidadSocio.coberturaPorcentaje, 100)}%` }}
                  />
                </div>

                {reporte.fechasSinRegistro.length > 0 ? (
                  <div className="text-[11px] text-slate-300 bg-rose-950/20 border border-rose-900/30 rounded-xl p-2.5 flex items-start gap-2 mt-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-rose-300 font-semibold">
                        {reporte.fechasSinRegistro.length} días sin arqueo reportado:{' '}
                      </strong>
                      <span className="text-slate-400">
                        {reporte.fechasSinRegistro.slice(0, 6).join(', ')}
                        {reporte.fechasSinRegistro.length > 6
                          ? ` y ${reporte.fechasSinRegistro.length - 6} fechas más`
                          : ''}
                      </span>
                      <p className="text-[10px] text-slate-400 mt-1">
                        👉 Exigir sincronización o registrar los cuadernos en Carga Histórica.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-[11px] text-emerald-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Línea temporal completa sin baches: 100% de arqueos al día.</span>
                  </div>
                )}
              </div>

              {/* 3. Cuadrícula 2x2: Métricas Clave de Tu Unidad */}
              <div className="grid grid-cols-2 gap-2.5">
                {/* 3.1 Producción Bruta */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 flex flex-col justify-between">
                  <span className="text-[11px] text-slate-400 font-medium block">Producción Bruta</span>
                  <div className="text-xl font-black text-emerald-400 tracking-tight my-1">
                    ${reporte.unidadSocio.ingresosTotales.toFixed(2)}
                  </div>
                  <span className="text-[10px] text-slate-400">
                    en {reporte.unidadSocio.diasConRegistro} días con datos
                  </span>
                </div>

                {/* 3.2 Frecuencias y Lucro Cesante */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 flex flex-col justify-between">
                  <span className="text-[11px] text-slate-400 font-medium block">Vueltas Realizadas</span>
                  <div className="text-xl font-black text-white tracking-tight my-1">
                    {reporte.unidadSocio.frecuenciasRealizadas} / {reporte.unidadSocio.frecuenciasProgramadas}
                  </div>
                  {reporte.unidadSocio.lucroCesanteVueltas > 0 ? (
                    <span className="text-[10px] font-bold text-amber-400">
                      -${reporte.unidadSocio.lucroCesanteVueltas.toFixed(2)} lucro cesante ({reporte.unidadSocio.frecuenciasNoRealizadas} caídas)
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-emerald-400">
                      100% cumplidas sin caídas
                    </span>
                  )}
                </div>

                {/* 3.3 Diésel Total */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 flex flex-col justify-between">
                  <span className="text-[11px] text-slate-400 font-medium block">Consumo Diésel</span>
                  <div className="text-xl font-black text-amber-400 tracking-tight my-1">
                    ${reporte.unidadSocio.dieselTotal.toFixed(2)}
                  </div>
                  <span className="text-[10px] text-slate-400">
                    sobre {reporte.unidadSocio.kmValidosTotales} km auditados
                  </span>
                </div>

                {/* 3.4 Costo por Kilómetro */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 flex flex-col justify-between">
                  <span className="text-[11px] text-slate-400 font-medium block">Costo Diésel / Km</span>
                  <div className="text-xl font-black text-blue-400 tracking-tight my-1">
                    ${reporte.unidadSocio.costoPorKm.toFixed(3)}
                    <span className="text-xs font-bold text-slate-400">/km</span>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    Margen neto: <strong>${reporte.unidadSocio.margenNetoPorKm.toFixed(3)}/km</strong>
                  </span>
                </div>
              </div>

              {/* 4. Bullet Chart Visual: Tú vs. El Cardumen */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Fuel className="w-4 h-4 text-blue-400" />
                    <span className="text-xs font-bold text-white">
                      Dispersión de Combustible ($/km) • Tú vs. Flota
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                      reporte.bulletChart.diferenciaPorcentualVsMedia <= 0
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}
                  >
                    {reporte.bulletChart.diferenciaPorcentualVsMedia <= 0
                      ? `✓ ${Math.abs(reporte.bulletChart.diferenciaPorcentualVsMedia)}% más eficiente`
                      : `▲ +${reporte.bulletChart.diferenciaPorcentualVsMedia}% sobrecosto`}
                  </span>
                </div>

                {/* Visualización de la Barra de Rango Continuo */}
                <div className="space-y-1.5 pt-1">
                  <div className="relative w-full bg-slate-950 h-5 rounded-xl border border-slate-800 flex items-center px-1">
                    {/* Gradiente de fondo de eficiencia */}
                    <div className="absolute inset-x-0 inset-y-0 rounded-xl bg-gradient-to-r from-emerald-500/20 via-blue-500/20 to-rose-500/20 pointer-events-none" />

                    {/* Línea vertical de la media cooperativa */}
                    {reporte.bulletChart.maxCostoKm > reporte.bulletChart.minCostoKm && (
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-slate-400 z-10"
                        style={{
                          left: `${Math.max(
                            5,
                            Math.min(
                              95,
                              ((reporte.bulletChart.mediaCostoKm - reporte.bulletChart.minCostoKm) /
                                (reporte.bulletChart.maxCostoKm - reporte.bulletChart.minCostoKm)) *
                                100
                            )
                          )}%`,
                        }}
                      >
                        <span className="absolute -top-4 -translate-x-1/2 text-[9px] text-slate-400 font-bold">
                          Media
                        </span>
                      </div>
                    )}

                    {/* Marcador de Tu Bus */}
                    {reporte.bulletChart.maxCostoKm > reporte.bulletChart.minCostoKm && (
                      <div
                        className="absolute z-20 flex flex-col items-center -translate-x-1/2 transition-all"
                        style={{
                          left: `${Math.max(
                            8,
                            Math.min(
                              92,
                              ((reporte.bulletChart.tuCostoKm - reporte.bulletChart.minCostoKm) /
                                (reporte.bulletChart.maxCostoKm - reporte.bulletChart.minCostoKm)) *
                                100
                            )
                          )}%`,
                        }}
                      >
                        <span className="w-3.5 h-3.5 rounded-full bg-amber-400 border-2 border-slate-950 shadow-md ring-2 ring-amber-400/50 animate-pulse" />
                      </div>
                    )}
                  </div>

                  {/* Leyenda de valores extremos */}
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium px-1">
                    <span>Mín: ${reporte.bulletChart.minCostoKm.toFixed(3)}</span>
                    <span className="text-amber-300 font-bold">
                      📍 Tu Bus: ${reporte.bulletChart.tuCostoKm.toFixed(3)}
                    </span>
                    <span>Máx: ${reporte.bulletChart.maxCostoKm.toFixed(3)}</span>
                  </div>
                </div>
              </div>

              {/* 5. Split-Screen (Espejo de Rendimiento: Tu Bus vs. Media Cooperativa) */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-slate-400" />
                    <span className="text-xs font-bold text-white">
                      Comparativa Espejo • Circuito {reporte.busActual.tipoOperacion === 'TRONCAL_VT' ? 'Troncal' : 'Alimentador'}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 bg-slate-950 px-2 py-0.5 rounded-full border border-slate-800">
                    {reporte.mediaCooperativa.unidadesConCoberturaSuficiente} unidades comparadas
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  {/* Columna Izquierda: Tu Bus */}
                  <div className="bg-slate-950/80 border border-emerald-500/30 rounded-xl p-3 space-y-2">
                    <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                      <BusIcon className="w-3 h-3" /> Tu Unidad (Disco {numeroDisco})
                    </span>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 text-[11px]">Diésel/km:</span>
                        <strong className="text-blue-300 font-mono">
                          ${reporte.unidadSocio.costoPorKm.toFixed(3)}
                        </strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 text-[11px]">Vueltas:</span>
                        <strong className="text-white font-mono">
                          {reporte.unidadSocio.cumplimientoPorcentaje}%
                        </strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 text-[11px]">Prod/Día:</span>
                        <strong className="text-emerald-300 font-mono">
                          $
                          {reporte.unidadSocio.diasConRegistro > 0
                            ? (
                                reporte.unidadSocio.ingresosTotales /
                                reporte.unidadSocio.diasConRegistro
                              ).toFixed(0)
                            : '0'}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Columna Derecha: Media Cooperativa */}
                  <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 space-y-2">
                    <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                      <Building2 className="w-3 h-3" /> Media Cooperativa
                    </span>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 text-[11px]">Diésel/km:</span>
                        <strong className="text-slate-300 font-mono">
                          ${reporte.mediaCooperativa.costoPorKmPromedio.toFixed(3)}
                        </strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 text-[11px]">Vueltas:</span>
                        <strong className="text-slate-300 font-mono">
                          {reporte.mediaCooperativa.cumplimientoPromedio}%
                        </strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 text-[11px]">Prod/Día:</span>
                        <strong className="text-slate-300 font-mono">
                          ${reporte.mediaCooperativa.produccionPorDiaPromedio.toFixed(0)}
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 6. Diagnóstico Financiero Privado y Recomendaciones Clave en Dólares ($) */}
              {Array.isArray(reporte.diagnosticoPrivadoSocio) && reporte.diagnosticoPrivadoSocio.length > 0 && (
                <div className="bg-slate-900/90 border border-amber-500/30 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                        Diagnóstico Financiero Privado • Bus {numeroDisco}
                      </h4>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
                      🔒 Solo Visible Para Ti
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400">
                    Análisis cuantitativo de impacto económico en dólares ($) proyectado a tu ventana operativa:
                  </p>

                  <div className="space-y-2.5">
                    {reporte.diagnosticoPrivadoSocio.map((diag) => {
                      const isAlert = diag.tipo === 'alerta';
                      const isOpp = diag.tipo === 'oportunidad';

                      const borderClass = isAlert
                        ? 'border-rose-500/30 bg-rose-950/20'
                        : isOpp
                        ? 'border-amber-500/30 bg-amber-950/20'
                        : 'border-emerald-500/30 bg-emerald-950/20';

                      const iconColor = isAlert
                        ? 'text-rose-400'
                        : isOpp
                        ? 'text-amber-400'
                        : 'text-emerald-400';

                      return (
                        <div
                          key={diag.id}
                          className={`p-3 rounded-xl border ${borderClass} transition hover:bg-slate-800/40`}
                        >
                          <div className="flex items-start gap-2.5">
                            <span className="shrink-0 mt-0.5">
                              {diag.id === 'pasajes_lider' && <TrendingUp className={`w-4 h-4 ${iconColor}`} />}
                              {diag.id === 'diesel_media' && <Fuel className={`w-4 h-4 ${iconColor}`} />}
                              {diag.id === 'faltantes_caja' && <DollarSign className={`w-4 h-4 ${iconColor}`} />}
                              {diag.id === 'vueltas_caidas' && <Clock className={`w-4 h-4 ${iconColor}`} />}
                              {diag.id === 'cuadernos_baches' && <AlertTriangle className={`w-4 h-4 ${iconColor}`} />}
                            </span>
                            <div className="flex-1 space-y-0.5">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-200">{diag.titulo}</span>
                                {typeof diag.impactoDolares === 'number' && diag.impactoDolares !== 0 && (
                                  <span
                                    className={`text-[11px] font-mono font-black ${
                                      diag.impactoDolares > 0 ? 'text-emerald-400' : 'text-rose-400'
                                    }`}
                                  >
                                    {diag.impactoDolares > 0
                                      ? `+$${diag.impactoDolares}`
                                      : `-$${Math.abs(diag.impactoDolares)}`}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-300 leading-snug">
                                {diag.mensajeCorto}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 7. Podio y Ranking Anónimo Alfabético (#T-A, #T-B...) */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowRanking(!showRanking)}
                  className="w-full p-4 flex items-center justify-between hover:bg-slate-800/40 transition active:scale-[0.99] cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-white">
                      Ranking Anónimo del Circuito ({reporte.rankingAnonimo.length} Unidades)
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-slate-400 text-xs">
                    <span>{showRanking ? 'Ocultar' : 'Ver Podio'}</span>
                    {showRanking ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                </button>

                {showRanking && (
                  <div className="p-4 pt-0 border-t border-slate-800/80 space-y-2">
                    <p className="text-[11px] text-slate-400 pb-1">
                      🔒 Las unidades hermanas están codificadas alfabéticamente (#T-A, #T-B...) para garantizar anonimato absoluto.
                    </p>

                    <div className="divide-y divide-slate-800/60 max-h-72 overflow-y-auto pr-1">
                      {reporte.rankingAnonimo.map((item) => (
                        <div
                          key={item.codigoAnonimo}
                          className={`py-2.5 px-3 rounded-xl flex items-center justify-between text-xs transition ${
                            item.esTuUnidad
                              ? 'bg-amber-500/10 border border-amber-500/30 font-bold'
                              : 'hover:bg-slate-800/30'
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            <span className="w-5 text-center font-black text-slate-400 text-sm mt-0.5">
                              {item.medalla || `${item.posicion}.`}
                            </span>
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span
                                  className={
                                    item.esTuUnidad ? 'text-amber-400 font-bold' : 'text-slate-300'
                                  }
                                >
                                  {item.codigoAnonimo}
                                </span>
                                {item.coberturaParcial && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                    🟡 {item.diasConRegistro} arqueos (Parcial)
                                  </span>
                                )}
                              </div>
                              <span className="block text-[10px] text-slate-400 font-normal">
                                {item.diasConRegistro} arqueos • {item.vueltasRealizadas || 0} vueltas
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 text-right">
                            <div>
                              <span className="block font-mono font-bold text-slate-200">
                                ${item.produccionTotal.toFixed(0)} Total
                              </span>
                              <span className="block text-[10px] text-slate-400">
                                ({item.cumplimientoPorcentaje}% vueltas)
                              </span>
                            </div>

                            <div className="min-w-[70px]">
                              <span className="block font-mono font-bold text-emerald-400 text-[11px]">
                                ${(item.promedioPorVuelta || 0).toFixed(2)} /vta
                              </span>
                              <span className="block font-mono text-[10px] text-slate-400">
                                ${item.costoPorKm.toFixed(3)} dsl
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="py-12 text-center text-xs text-slate-400">
              No se encontraron registros para la ventana seleccionada.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between">
          <span className="text-[11px] text-slate-400 pl-2">
            RutaGo • Auditoría Inteligente de Flota
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold active:scale-95 transition cursor-pointer"
          >
            Cerrar Reporte
          </button>
        </div>

      </div>
    </div>
  );
}
