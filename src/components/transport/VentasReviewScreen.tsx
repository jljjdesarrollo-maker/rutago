'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ChevronLeft,
  Search,
  Filter,
  AlertTriangle,
  Download,
  Ticket,
  DollarSign,
  Users,
  Clock,
  Bus,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Zap,
  Info
} from 'lucide-react';

interface VentasReviewScreenProps {
  onBack: () => void;
}

interface FrecuenciaRel {
  id: string;
  nombre: string;
  ruta: string;
  hora: string;
  direccion: string;
}

interface Venta {
  id: string;
  fecha: string;
  fechaOperacion?: string;
  diaTurno?: number;
  fechaEmision?: string;
  syncedAt?: string;
  vtCode: string;
  frecuenciaId: string | null;
  ruta: string;
  parada: string;
  tipo: string;
  tarifaOficial: number;
  cobrado: number;
  hora: string;
  ayudanteId: string;
  ayudanteNombre: string;
  pasajeroTipo?: string;
  createdAt: string;
  frecuencia?: FrecuenciaRel | null;
}

export function VentasReviewScreen({ onBack }: VentasReviewScreenProps) {
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedFecha, setSelectedFecha] = useState(new Date().toISOString().split('T')[0]);
  const [selectedVT, setSelectedVT] = useState('');
  const [selectedAyudante, setSelectedAyudante] = useState('');
  const [vts, setVts] = useState<string[]>([]);
  const [vtCounts, setVtCounts] = useState<Record<string, number>>({});
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // Cargar lista de VTs disponibles para la fecha seleccionada
  useEffect(() => {
    const loadVTs = async () => {
      try {
        const res = await fetch(`/api/ventas?fecha=${selectedFecha}`);
        if (res.ok) {
          const data: Venta[] = await res.json();
          const uniqueVTs = [...new Set(data.map(v => v.vtCode).filter(Boolean))].sort();
          setVts(uniqueVTs);
          const counts: Record<string, number> = {};
          data.forEach(v => {
            if (v.vtCode) counts[v.vtCode] = (counts[v.vtCode] || 0) + 1;
          });
          setVtCounts(counts);
        }
      } catch { /* ignore */ }
    };
    loadVTs();
  }, [selectedFecha]);

  // Cargar ventas cuando cambian los filtros principales
  const loadVentas = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      let url = `/api/ventas?fecha=${selectedFecha}`;
      if (selectedVT) url += `&vtCode=${selectedVT}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Error al cargar datos');
      const data: Venta[] = await res.json();
      setVentas(data);

      // Auto-expandir todos los grupos por defecto
      const groups = buildFrequencyGroups(data, selectedAyudante);
      const expanded: Record<string, boolean> = {};
      Object.keys(groups).forEach(k => { expanded[k] = true; });
      setExpandedGroups(expanded);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      setVentas([]);
    } finally {
      setLoading(false);
    }
  }, [selectedFecha, selectedVT, selectedAyudante]);

  useEffect(() => {
    loadVentas();
  }, [loadVentas]);

  // Filtrado en memoria por Ayudante si aplica
  const filteredVentas = useMemo(() => {
    if (!selectedAyudante) return ventas;
    return ventas.filter(v => v.ayudanteNombre === selectedAyudante);
  }, [ventas, selectedAyudante]);

  // Función constructora de agrupación por Frecuencia Real Oficial y Turno
  function buildFrequencyGroups(data: Venta[], ayudanteFilter: string) {
    const items = ayudanteFilter ? data.filter(v => v.ayudanteNombre === ayudanteFilter) : data;
    const groups: Record<string, {
      title: string;
      frecuenciaHora?: string;
      ruta?: string;
      vtCode: string;
      items: Venta[];
    }> = {};

    items.forEach(v => {
      let groupKey: string;
      let title: string;
      let frecHora: string | undefined = undefined;

      if (v.frecuencia) {
        groupKey = `FREC_${v.vtCode}_${v.frecuencia.id}`;
        title = `[${v.vtCode}] ${v.frecuencia.hora || ''} ${v.frecuencia.nombre || v.frecuencia.ruta || v.ruta}`.trim();
        frecHora = v.frecuencia.hora;
      } else if (v.ruta) {
        // Agrupar por VT y Ruta registrada
        groupKey = `RUTA_${v.vtCode}_${v.ruta}_${v.tipo}`;
        title = `[${v.vtCode}] ${v.ruta} (${v.tipo === 'ida' ? 'Ida' : 'Vuelta'})`;
      } else {
        groupKey = `VT_${v.vtCode}_GENERAL`;
        title = `[${v.vtCode}] Ventas Generales`;
      }

      if (!groups[groupKey]) {
        groups[groupKey] = {
          title,
          frecuenciaHora: frecHora,
          ruta: v.ruta,
          vtCode: v.vtCode,
          items: [],
        };
      }
      groups[groupKey].items.push(v);
    });

    // Ordenar boletos dentro de cada grupo cronológicamente (más antiguo a más reciente)
    Object.values(groups).forEach(g => {
      g.items.sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        if (timeA !== timeB) return timeA - timeB;
        return (a.hora || '').localeCompare(b.hora || '');
      });
    });

    return groups;
  }

  const groups = useMemo(() => {
    return buildFrequencyGroups(ventas, selectedAyudante);
  }, [ventas, selectedAyudante]);

  // Lista de ayudantes únicos en los datos
  const ayudantes = useMemo(() => {
    return [...new Set(ventas.map(v => v.ayudanteNombre).filter(Boolean))].sort();
  }, [ventas]);

  // Métricas y Estadísticas
  const totalPasajeros = filteredVentas.length;
  const totalRecaudado = filteredVentas.reduce((s, v) => s + v.cobrado, 0);

  // Alertas de sospecha:
  // 1. Tarifa inusual (> $10)
  // 2. Discrepancia con tarifa oficial (ej. cobró más o cobró 0 sin ser gratis)
  const sospechosasTarifa = useMemo(() => {
    return filteredVentas.filter(v => v.cobrado > 10 || (v.tarifaOficial > 0 && Math.abs(v.cobrado - v.tarifaOficial) > 2.0));
  }, [filteredVentas]);

  // Detección de posibles ráfagas (más de 4 boletos en menos de 60 segundos)
  const rafagasSospechosas = useMemo(() => {
    const alerts: { count: number; hora: string; parada: string; vtCode: string }[] = [];
    const timeMap: Record<string, Venta[]> = {};
    filteredVentas.forEach(v => {
      const key = `${v.vtCode}_${v.hora?.slice(0, 5) || '00:00'}`;
      if (!timeMap[key]) timeMap[key] = [];
      timeMap[key].push(v);
    });
    Object.entries(timeMap).forEach(([k, list]) => {
      if (list.length >= 5) {
        alerts.push({
          count: list.length,
          hora: list[0].hora,
          parada: list[0].parada,
          vtCode: list[0].vtCode,
        });
      }
    });
    return alerts;
  }, [filteredVentas]);

  const toggleGroup = (key: string) => {
    setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Formato legible de hora con segundos y timestamp exacto
  const formatExactTime = (horaStr: string, createdAtStr: string) => {
    if (createdAtStr) {
      try {
        const d = new Date(createdAtStr);
        // Formato local HH:MM:SS
        return d.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
      } catch { /* fallback */ }
    }
    return horaStr || '--:--';
  };

  const exportCSV = () => {
    if (filteredVentas.length === 0) return;
    const headers = '#,Vehiculo,Fecha,Hora_Emision,Timestamp_UTC,Frecuencia_Oficial,Ruta,Sentido,Parada,Tipo_Pasajero,Tarifa_Oficial,Cobrado,Ayudante,ID_Boleto';
    const rows = filteredVentas.map((v, i) => {
      const frecNombre = v.frecuencia ? `${v.frecuencia.hora} ${v.frecuencia.nombre}` : '';
      return `${i + 1},"${v.vtCode}","${v.fecha}","${v.hora}","${v.createdAt}","${frecNombre}","${v.ruta}","${v.tipo}","${v.parada}","${v.pasajeroTipo || 'normal'}",${v.tarifaOficial.toFixed(2)},${v.cobrado.toFixed(2)},"${v.ayudanteNombre}","${v.id}"`;
    });
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `auditoria_boletos_${selectedFecha}${selectedVT ? '_' + selectedVT : ''}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#F8F9FA]">
      {/* Header Ejecutivo */}
      <header className="bg-[#912D26] text-white px-4 py-3.5 shadow-md flex-shrink-0 sticky top-0 z-20">
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="p-1 -ml-1 text-white/80 hover:text-white rounded-lg active:scale-95 transition-transform"
            aria-label="Volver"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="text-center">
            <h1 className="text-base font-bold tracking-tight flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-amber-300" />
              Auditoría y Revisión de Ventas
            </h1>
            <p className="text-white/70 text-[11px]">Auditoría por Grupo de Turno (VT) y Frecuencia</p>
          </div>
          <div className="w-6" />
        </div>
      </header>

      {/* Barra de Filtros Operativos */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 space-y-2.5 shadow-xs flex-shrink-0">
        <div className="grid grid-cols-3 gap-2">
          {/* Fecha */}
          <div>
            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">
              Fecha
            </label>
            <input
              type="date"
              value={selectedFecha}
              onChange={e => setSelectedFecha(e.target.value)}
              className="w-full h-10 rounded-xl border border-gray-300 px-2.5 text-xs font-semibold text-gray-800 bg-gray-50/50 focus:bg-white focus:border-[#912D26] focus:outline-none"
            />
          </div>

          {/* Selector de Vehículo (VT) */}
          <div>
            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">
              Grupo Turno (VT)
            </label>
            <select
              value={selectedVT}
              onChange={e => setSelectedVT(e.target.value)}
              className="w-full h-10 rounded-xl border border-gray-300 px-2 text-xs font-semibold text-gray-800 bg-gray-50/50 focus:bg-white focus:border-[#912D26] focus:outline-none"
            >
              <option value="">Todos ({vts.length})</option>
              {vts.map(vt => (
                <option key={vt} value={vt}>
                  {vt} ({vtCounts[vt] || 0} boletos)
                </option>
              ))}
            </select>
          </div>

          {/* Selector de Ayudante */}
          <div>
            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">
              Ayudante
            </label>
            <select
              value={selectedAyudante}
              onChange={e => setSelectedAyudante(e.target.value)}
              className="w-full h-10 rounded-xl border border-gray-300 px-2 text-xs font-semibold text-gray-800 bg-gray-50/50 focus:bg-white focus:border-[#912D26] focus:outline-none"
            >
              <option value="">Todos ({ayudantes.length})</option>
              {ayudantes.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Indicadores Clave de Auditoría */}
        {!loading && filteredVentas.length > 0 && (
          <div className="grid grid-cols-3 gap-2 pt-1">
            <div className="bg-amber-50/60 border border-amber-200/70 rounded-xl p-2 text-center">
              <div className="flex items-center justify-center gap-1 mb-0.5 text-amber-700">
                <Ticket className="w-3.5 h-3.5" />
                <span className="text-[10px] font-bold uppercase">Boletos</span>
              </div>
              <span className="font-extrabold text-base text-gray-900">{totalPasajeros}</span>
            </div>

            <div className="bg-emerald-50/60 border border-emerald-200/70 rounded-xl p-2 text-center">
              <div className="flex items-center justify-center gap-1 mb-0.5 text-emerald-700">
                <DollarSign className="w-3.5 h-3.5" />
                <span className="text-[10px] font-bold uppercase">Total Cobrado</span>
              </div>
              <span className="font-extrabold text-base text-emerald-700">${totalRecaudado.toFixed(2)}</span>
            </div>

            <div className="bg-blue-50/60 border border-blue-200/70 rounded-xl p-2 text-center">
              <div className="flex items-center justify-center gap-1 mb-0.5 text-blue-700">
                <Bus className="w-3.5 h-3.5" />
                <span className="text-[10px] font-bold uppercase">Frecuencias</span>
              </div>
              <span className="font-extrabold text-base text-blue-800">{Object.keys(groups).length}</span>
            </div>
          </div>
        )}

        {/* Alertas Antifraude */}
        {sospechosasTarifa.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-2.5 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-red-700 leading-tight">
              <p className="font-bold">{sospechosasTarifa.length} boleto(s) con tarifa atípica detectada</p>
              <p className="text-[11px] text-red-600 mt-0.5">
                Revise boletos con valores mayores a $10 o discrepancias marcadas respecto a la tarifa de la ruta.
              </p>
            </div>
          </div>
        )}

        {rafagasSospechosas.length > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-2.5 flex items-start gap-2">
            <Zap className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-orange-800 leading-tight">
              <p className="font-bold">Alerta: Ráfagas de emisión en el mismo minuto</p>
              <p className="text-[11px] text-orange-700 mt-0.5">
                Detectados 5 o más boletos emitidos simultáneamente ({rafagasSospechosas.map(r => `[${r.vtCode}] ${r.hora}`).join(', ')}). Verifique si fue grupo familiar o facturación retardada.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Listado de Boletos por Frecuencia Oficial */}
      <main className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {loading && (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-3 border-[#912D26]/20 border-t-[#912D26] rounded-full animate-spin mx-auto mb-3" />
            <p className="text-gray-500 text-sm font-medium">Consultando registros en base de datos...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-center">
            <p className="text-red-700 text-sm font-medium">{error}</p>
          </div>
        )}

        {!loading && !error && filteredVentas.length === 0 && (
          <div className="text-center py-14 bg-white rounded-2xl border border-gray-200 p-6">
            <Search className="w-12 h-12 text-gray-300 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-gray-700">Sin boletos registrados</h3>
            <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
              No se encontraron ventas sincronizadas para el día {selectedFecha} con los filtros seleccionados.
            </p>
          </div>
        )}

        {/* Frecuencias / Vueltas */}
        {!loading && Object.entries(groups).map(([groupKey, group]) => {
          const groupTotal = group.items.reduce((s, v) => s + v.cobrado, 0);
          const isExpanded = expandedGroups[groupKey] !== false;
          const primerBoleto = group.items[0];
          const ultimoBoleto = group.items[group.items.length - 1];

          return (
            <div
              key={groupKey}
              className="bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden transition-all"
            >
              {/* Encabezado de Frecuencia */}
              <button
                onClick={() => toggleGroup(groupKey)}
                className="w-full p-3.5 flex items-center justify-between bg-gray-50/80 hover:bg-gray-100/80 active:bg-gray-200/50 text-left transition-colors border-b border-gray-100"
              >
                <div className="flex-1 min-w-0 pr-2">
                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#912D26]/10 text-[#912D26] tracking-wide">
                      Turno {group.vtCode}
                    </span>
                    <h3 className="text-xs font-bold text-gray-900 truncate">
                      {group.title}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-gray-500">
                    <span className="flex items-center gap-1 font-medium">
                      <Clock className="w-3 h-3 text-gray-400" />
                      {primerBoleto ? formatExactTime(primerBoleto.hora, primerBoleto.createdAt) : '--:--'}
                      {ultimoBoleto && ultimoBoleto !== primerBoleto && ` → ${formatExactTime(ultimoBoleto.hora, ultimoBoleto.createdAt)}`}
                    </span>
                    <span>•</span>
                    <span className="truncate">
                      Ayudante: <strong className="text-gray-700">{primerBoleto?.ayudanteNombre || 'Sin asignar'}</strong>
                    </span>
                  </div>
                </div>

                <div className="text-right flex items-center gap-2 flex-shrink-0">
                  <div>
                    <span className="text-xs font-black text-emerald-700 block">
                      ${groupTotal.toFixed(2)}
                    </span>
                    <span className="text-[10px] text-gray-500 font-medium">
                      {group.items.length} boleto{group.items.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <svg
                    className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {/* Detalle Minuto a Minuto de los Boletos Emitidos */}
              {isExpanded && (
                <div className="divide-y divide-gray-100">
                  {/* Encabezado de columnas */}
                  <div className="px-3.5 py-2 bg-gray-50/50 flex items-center text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    <span className="w-14">Hora</span>
                    <span className="flex-1 px-1">Parada / Tramo</span>
                    <span className="w-16 text-center">Tipo</span>
                    <span className="w-14 text-right">Cobrado</span>
                  </div>

                  {group.items.map((v, i) => {
                    const exactTime = formatExactTime(v.hora, v.createdAt);
                    const isSospechoso = v.cobrado > 10;
                    const esMedia = v.pasajeroTipo === 'media';

                    return (
                      <div
                        key={v.id}
                        className={`px-3.5 py-2.5 flex items-center text-xs transition-colors hover:bg-gray-50/50 ${
                          isSospechoso ? 'bg-red-50/80 text-red-900' : 'text-gray-800'
                        }`}
                      >
                        {/* Minuto exacto */}
                        <div className="w-14 flex-shrink-0">
                          <span className="font-mono text-[11px] font-bold text-gray-700 block">
                            {exactTime}
                          </span>
                          <div className="flex items-center gap-1">
                            <span className="text-[9px] text-gray-400 font-mono">
                              #{i + 1}
                            </span>
                            {v.diaTurno === 2 && (
                              <span className="bg-amber-100 text-amber-800 text-[8px] font-bold px-1 py-0.2 rounded" title="Retorno tras pernocta (Día 2)">
                                D2
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Parada y Ruta */}
                        <div className="flex-1 min-w-0 px-1">
                          <div className="flex items-center gap-1 truncate">
                            <span className="font-semibold text-gray-900 truncate">
                              {v.parada}
                            </span>
                            <span className="text-[10px] text-gray-400 flex-shrink-0">
                              {v.tipo === 'ida' ? '→' : '←'}
                            </span>
                          </div>
                          <span className="text-[10px] text-gray-500 truncate block">
                            {v.ruta || 'Ruta estándar'} • Tarifa oficial: ${v.tarifaOficial.toFixed(2)}
                          </span>
                        </div>

                        {/* Tipo de Pasajero */}
                        <div className="w-16 text-center flex-shrink-0">
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold tracking-tight ${
                              esMedia
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {esMedia ? '½ Tarifa' : 'Entero'}
                          </span>
                        </div>

                        {/* Monto cobrado */}
                        <div className="w-14 text-right flex-shrink-0">
                          <span
                            className={`font-black text-xs ${
                              isSospechoso ? 'text-red-600' : 'text-[#912D26]'
                            }`}
                          >
                            ${v.cobrado.toFixed(2)}
                          </span>
                          {v.cobrado === 0 && (
                            <span className="text-[9px] text-emerald-600 font-bold block">
                              GRATIS
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </main>

      {/* Botonera Inferior (Thumb Zone) */}
      {!loading && filteredVentas.length > 0 && (
        <div className="bg-white border-t border-gray-200 px-4 py-3 shadow-lg flex-shrink-0 sticky bottom-0 z-10">
          <button
            onClick={exportCSV}
            className="w-full h-12 rounded-xl bg-[#912D26] hover:bg-[#7A2520] active:scale-[0.98] text-white font-bold text-xs flex items-center justify-center gap-2 transition-transform shadow-md shadow-[#912D26]/20"
          >
            <Download className="w-4 h-4" />
            Descargar Auditoría Forense CSV ({filteredVentas.length} Boletos)
          </button>
        </div>
      )}
    </div>
  );
}
