'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  RefreshCw,
  Share2,
  Bus,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Users,
  Award,
  ChevronDown,
  ChevronUp,
  Gauge,
  DollarSign,
  FileSpreadsheet,
  Shield,
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  Info,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { getAllBuses, getActiveBusId, getActiveBus } from '@/lib/fleet-storage';
import { type BusItem } from '@/types/fleet';
import {
  type BenchmarkPeriod,
  type BenchmarkCircuitGroup,
  type FleetBenchmarkSummary,
  type BusBenchmarkMetric,
} from '@/types/benchmark';
import { computeFleetBenchmark } from '@/lib/benchmark-metrics';

interface BenchmarkScreenProps {
  onBack: () => void;
  currentUser?: any;
  activeBusId?: string;
}

export function BenchmarkScreen({ onBack, currentUser, activeBusId }: BenchmarkScreenProps) {
  const { toast } = useToast();
  const [fleet, setFleet] = useState<BusItem[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filtros de navegación
  const [period, setPeriod] = useState<BenchmarkPeriod>('ESTE_MES');
  const [circuitGroup, setCircuitGroup] = useState<BenchmarkCircuitGroup>('TRONCAL_VT');
  const [expandedBusId, setExpandedBusId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'UNIDADES' | 'TRIPULACIONES'>('UNIDADES');

  // Identificación del usuario y bus activo para protocolo de privacidad
  const isSuperAdmin = useMemo(() => {
    const rol = String(currentUser?.rol || '').toUpperCase();
    const id = String(currentUser?.id || '').toLowerCase();
    const nombre = String(currentUser?.nombre || '').toLowerCase();
    return rol === 'SUPERADMIN_SAAS' || id.includes('superadmin') || nombre.includes('superadmin');
  }, [currentUser]);

  // Permitir al SuperAdmin alternar entre vista anónima (como socio) y vista auditoría completa
  const [adminAuditorMode, setAdminAuditorMode] = useState(false);

  // Bus activo resuelto
  const currentActiveBusId = useMemo(() => {
    return activeBusId || getActiveBusId() || 'BUS-01';
  }, [activeBusId]);

  // Carga inicial de datos (Anti-Loop: se ejecuta estrictamente una vez al montar)
  const loadData = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      // 1. Obtener catálogo de flota oficial
      const busesList = getAllBuses();
      setFleet(busesList);

      // 2. Obtener registros con trips desde API
      let loadedRecords: any[] = [];
      try {
        const res = await fetch('/api/records?include=trips&limit=250');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            loadedRecords = data;
            try {
              localStorage.setItem('rg_benchmark_records_cache', JSON.stringify(data));
            } catch { /* ignore */ }
          }
        }
      } catch {
        console.warn('Error de conexión, intentando recuperar caché local...');
      }

      // Fallback a caché local si la red falla
      if (loadedRecords.length === 0) {
        try {
          const cached = localStorage.getItem('rg_benchmark_records_cache');
          if (cached) {
            loadedRecords = JSON.parse(cached);
          }
        } catch { /* ignore */ }
      }

      setRecords(loadedRecords);

      if (isManualRefresh) {
        toast({
          title: 'Datos actualizados',
          description: `Se auditaron ${loadedRecords.length} registros del historial.`,
        });
      }
    } catch (err) {
      console.error('Error al cargar datos de benchmark:', err);
      toast({
        title: 'Error al cargar',
        description: 'No se pudieron sincronizar los datos del benchmark.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Procesamiento reactivo del benchmark usando el motor matemático (Memoizado y Cero Bucles)
  const summary: FleetBenchmarkSummary = useMemo(() => {
    const isSuperAdminView = isSuperAdmin && adminAuditorMode;
    return computeFleetBenchmark(
      records,
      fleet,
      period,
      undefined,
      currentActiveBusId,
      isSuperAdminView
    );
  }, [records, fleet, period, currentActiveBusId, isSuperAdmin, adminAuditorMode]);

  // Grupo activo según selección del usuario
  const currentCircuitData = circuitGroup === 'TRONCAL_VT' ? summary.troncal : summary.alimentadores;

  // Resumen consolidado para auditoría de tripulaciones
  const crewAudit = useMemo(() => {
    const crewMap = new Map<
      string,
      {
        nombre: string;
        rol: 'CONDUCTOR' | 'AYUDANTE';
        busDisco: string;
        dias: number;
        vueltas: number;
        produccion: number;
      }
    >();

    for (const r of records) {
      if (r.date < summary.fechaInicio || r.date > summary.fechaFin) continue;

      const prod = Number(r.production) || 0;
      let vueltasCount = 0;
      if (Array.isArray(r.trips) && r.trips.length > 0) {
        vueltasCount = r.trips.filter((t: any) => t.tipo !== 'NO_REALIZADO').length;
      } else if (prod > 0) {
        vueltasCount = 6;
      }

      const busDisco = r.busId ? String(r.busId).replace('BUS-', '') : r.conductor?.match(/BUS-(\d+)/)?.[1] || '01';

      if (r.ayudanteNombre) {
        const key = `AYU_${r.ayudanteNombre.trim().toUpperCase()}`;
        const existing = crewMap.get(key) || {
          nombre: r.ayudanteNombre.trim(),
          rol: 'AYUDANTE',
          busDisco,
          dias: 0,
          vueltas: 0,
          produccion: 0,
        };
        existing.dias += 1;
        existing.vueltas += vueltasCount;
        existing.produccion += prod;
        crewMap.set(key, existing);
      }
    }

    return Array.from(crewMap.values()).map((c) => ({
      ...c,
      ipf: c.vueltas > 0 ? Math.round((c.produccion / c.vueltas) * 100) / 100 : 0,
    })).sort((a, b) => b.ipf - a.ipf);
  }, [records, summary.fechaInicio, summary.fechaFin]);

  // Compartir resumen ejecutivo por WhatsApp con protección estricta de privacidad
  const handleShareWhatsApp = () => {
    const t = summary.troncal;
    const a = summary.alimentadores;

    const text = [
      `📊 *RUTAGO - AUDITORÍA Y BENCHMARK DE FLOTA*`,
      `📅 *Período:* ${summary.periodoLabel} (${summary.fechaInicio} al ${summary.fechaFin})`,
      `📑 *Jornadas Auditadas:* ${summary.totalRegistrosAuditados}`,
      `🛡️ *Protocolo de Privacidad:* Unidades pares anonimizadas (#T y #A)`,
      ``,
      `🚍 *1. CIRCUITO TRONCAL GENERAL (45 Pax)*`,
      `• Producción Consolidada: S/ ${t.produccionConsolidada.toFixed(2)}`,
      `• Vueltas Operadas: ${t.vueltasConsolidadas} (No realizadas: ${t.vueltasNoRealizadasConsolidadas})`,
      `• *IPF Promedio General: S/ ${t.ipfPromedioGrupo.toFixed(2)} por vuelta*`,
      `• Desglose: Ruta S/ ${t.efectivoConsolidado.toFixed(2)} • Oficina S/ ${t.cajaComunConsolidada.toFixed(2)}`,
      ``,
      `🏆 *Ranking Troncal (IPF por Vuelta):*`,
      ...t.ranking
        .filter((b) => b.produccionTotal > 0)
        .map((b, idx) => {
          const delta = b.comparativaMediaIPF.diferencia;
          const sign = delta > 0 ? `+S/ ${delta.toFixed(2)}` : `S/ ${delta.toFixed(2)}`;
          const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '🔹';
          const label = b.esUnidadPropia
            ? `⭐ Tu Unidad (Bus ${b.numeroDisco})`
            : `${b.nombreDisplay}`;
          return `${medal} *${label}*: IPF S/ ${b.ipf.toFixed(2)} | Prod: S/ ${b.produccionTotal.toFixed(2)} (${b.vueltasEfectivas} vtas) [${sign}]`;
        }),
      ``,
      `🚐 *2. ALIMENTADORES ESPECIALES P (28 Pax)*`,
      `• Producción Consolidada: S/ ${a.produccionConsolidada.toFixed(2)}`,
      `• *IPF Promedio: S/ ${a.ipfPromedioGrupo.toFixed(2)} por vuelta*`,
      ...a.ranking
        .filter((b) => b.produccionTotal > 0)
        .map((b) => {
          const label = b.esUnidadPropia
            ? `⭐ Tu Unidad (Bus ${b.numeroDisco})`
            : `${b.nombreDisplay}`;
          return `🔹 *${label}*: IPF S/ ${b.ipf.toFixed(2)} | Prod: S/ ${b.produccionTotal.toFixed(2)} (${b.vueltasEfectivas} vtas)`;
        }),
      ``,
      `_Reporte emitido bajo estándar de confidencialidad gremial de RutaGo_`,
    ].join('\n');

    const encoded = encodeURIComponent(text);
    const url = `https://api.whatsapp.com/send?text=${encoded}`;
    window.open(url, '_blank');
  };

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#F8F9FA] text-[#2D3748]">
      {/* ─── CABECERA ERGONÓMICA ─── */}
      <header className="sticky top-0 z-20 bg-white border-b border-gray-200 px-4 py-3 shadow-xs">
        <div className="flex items-center justify-between max-w-xl mx-auto">
          <div className="flex items-center gap-2.5">
            <button
              onClick={onBack}
              id="btn-back-benchmark"
              className="p-2 -ml-2 rounded-xl text-gray-700 hover:bg-gray-100 active:scale-95 transition-all"
              aria-label="Volver"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-base text-[#912D26] tracking-tight">
                  Benchmark de Flota
                </h1>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  IPF Simétrico
                </span>
              </div>
              <p className="text-[11px] text-gray-500 font-medium">
                Auditoría simétrica con anonimato de pares
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => loadData(true)}
              disabled={refreshing}
              className="p-2 rounded-xl text-gray-600 hover:bg-gray-100 active:scale-95 transition-all disabled:opacity-50"
              title="Actualizar datos"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-[#912D26]' : ''}`} />
            </button>
            <button
              onClick={handleShareWhatsApp}
              className="p-2 rounded-xl text-emerald-600 hover:bg-emerald-50 active:scale-95 transition-all"
              title="Compartir por WhatsApp"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ─── CUERPO PRINCIPAL ─── */}
      <main className="flex-1 px-4 py-3 max-w-xl mx-auto w-full space-y-3 pb-24">
        {/* Banner de Protocolo de Privacidad Gremial */}
        <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
          <div className="flex-1 text-xs">
            <div className="flex items-center justify-between">
              <p className="font-bold text-blue-900">
                Protocolo de Confidencialidad Activo
              </p>
              {isSuperAdmin && (
                <button
                  onClick={() => setAdminAuditorMode(!adminAuditorMode)}
                  className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-200/80 text-blue-900 hover:bg-blue-300 transition"
                >
                  {adminAuditorMode ? 'Modo Auditor (Visible)' : 'Modo Socio (Anónimo)'}
                </button>
              )}
            </div>
            <p className="text-[11px] text-blue-800/90 mt-0.5 leading-relaxed">
              Tu unidad autenticada (<strong>Bus {currentActiveBusId.replace('BUS-', '')}</strong>) muestra el 100% de sus datos contables. Los demás autobuses se presentan anónimos (<strong>#T</strong> y <strong>#A</strong>) protegiendo sus libros privados.
            </p>
          </div>
        </div>

        {/* ─── FILTROS TEMPORALES (Pills) ─── */}
        <div className="flex items-center justify-between gap-1 overflow-x-auto pb-1 no-scrollbar text-xs font-semibold">
          {[
            { id: 'HOY', label: 'Hoy' },
            { id: '7_DIAS', label: '7 Días' },
            { id: 'ESTE_MES', label: 'Este Mes' },
            { id: 'MES_ANTERIOR', label: 'Mes Ant.' },
            { id: 'HISTORICO', label: 'Histórico' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setPeriod(item.id as BenchmarkPeriod)}
              className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all ${
                period === item.id
                  ? 'bg-[#912D26] text-white shadow-xs'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* ─── SELECTOR SIMÉTRICO DE CIRCUITO (FASE 4.1) ─── */}
        <div className="grid grid-cols-2 gap-2 bg-gray-200/70 p-1 rounded-2xl">
          <button
            onClick={() => setCircuitGroup('TRONCAL_VT')}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl font-bold text-xs transition-all ${
              circuitGroup === 'TRONCAL_VT'
                ? 'bg-white text-[#912D26] shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Bus className="w-4 h-4" />
            <span>Troncal (45 Pax)</span>
          </button>

          <button
            onClick={() => setCircuitGroup('ALIMENTADOR_P')}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl font-bold text-xs transition-all ${
              circuitGroup === 'ALIMENTADOR_P'
                ? 'bg-white text-[#912D26] shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Gauge className="w-4 h-4" />
            <span>Alimentador (28 Pax)</span>
          </button>
        </div>

        {/* ─── RESUMEN DEL CIRCUITO SELECCIONADO ─── */}
        <Card className="rounded-2xl border border-gray-200 bg-white shadow-xs overflow-hidden">
          <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white p-3.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase tracking-wider font-bold text-gray-300">
                  Media del Circuito
                </span>
                <h2 className="text-sm font-black">{currentCircuitData.titulo}</h2>
              </div>
              <span className="text-xs font-bold px-2 py-1 rounded-lg bg-white/10 text-white border border-white/10">
                {currentCircuitData.unidadesConRegistros} de {currentCircuitData.totalUnidades} buses
              </span>
            </div>
            <p className="text-[11px] text-gray-300 mt-1">{currentCircuitData.subtitulo}</p>
          </div>

          <CardContent className="p-3.5 space-y-3">
            {/* KPI Central: IPF Promedio del Circuito */}
            <div className="flex items-center justify-between bg-emerald-50/70 p-3 rounded-xl border border-emerald-200/70">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-800">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-emerald-900">
                    IPF Promedio del Circuito
                  </p>
                  <p className="text-[10px] text-emerald-700">
                    Ingreso por frecuencia efectiva
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-lg font-black text-emerald-900">
                  S/ {currentCircuitData.ipfPromedioGrupo.toFixed(2)}
                </span>
                <span className="text-[10px] block text-emerald-700 font-medium">
                  {currentCircuitData.vueltasConsolidadas} vueltas totales
                </span>
              </div>
            </div>

            {/* Micro métricas complementarias */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-100 text-center">
              <div>
                <p className="text-[10px] text-gray-400 font-medium">Efectivo Ruta</p>
                <p className="text-xs font-bold text-gray-700">
                  S/ {currentCircuitData.efectivoConsolidado.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 font-medium">Caja Común</p>
                <p className="text-xs font-bold text-gray-700">
                  S/ {currentCircuitData.cajaComunConsolidada.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 font-medium">No Realizadas</p>
                <p className="text-xs font-bold text-amber-600">
                  {currentCircuitData.vueltasNoRealizadasConsolidadas} vtas
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ─── SELECTOR SUB-PESTAÑA (UNIDADES vs TRIPULACIONES) ─── */}
        <div className="flex items-center justify-between border-b border-gray-200 pb-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('UNIDADES')}
              className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all ${
                activeTab === 'UNIDADES'
                  ? 'bg-gray-900 text-white shadow-xs'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              Ranking de Unidades ({currentCircuitData.ranking.length})
            </button>
            <button
              onClick={() => setActiveTab('TRIPULACIONES')}
              className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all ${
                activeTab === 'TRIPULACIONES'
                  ? 'bg-gray-900 text-white shadow-xs'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              Auditoría Ayudantes ({crewAudit.length})
            </button>
          </div>
          <span className="text-[11px] text-gray-400 font-medium">
            {summary.diasEnPeriodo} días evaluados
          </span>
        </div>

        {/* ─── PESTAÑA 1: RANKING DE UNIDADES Y COMPARATIVA IPF ─── */}
        {activeTab === 'UNIDADES' && (
          <div className="space-y-3">
            {currentCircuitData.ranking.map((bus, index) => {
              const isExpanded = expandedBusId === bus.busId;
              const { estado, diferencia, porcentajeDiferencia } = bus.comparativaMediaIPF;
              const hasRecords = bus.produccionTotal > 0;

              return (
                <Card
                  key={bus.busId}
                  className={`rounded-2xl border transition-all ${
                    bus.esUnidadPropia
                      ? 'border-blue-300 bg-gradient-to-br from-blue-50/60 via-white to-indigo-50/30 ring-2 ring-blue-300/80'
                      : 'border-gray-200 bg-white'
                  } shadow-xs overflow-hidden`}
                >
                  <CardContent className="p-3.5 space-y-2.5">
                    {/* Fila principal de la tarjeta */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        {/* Avatar o Distintivo */}
                        <div
                          className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-xs ${
                            bus.esUnidadPropia
                              ? 'bg-blue-600 text-white ring-2 ring-blue-400 shadow-xs'
                              : index === 0 && hasRecords
                              ? 'bg-amber-100 text-amber-800 ring-2 ring-amber-400 font-bold'
                              : hasRecords
                              ? 'bg-gray-100 text-gray-800'
                              : 'bg-gray-50 text-gray-400'
                          }`}
                        >
                          {bus.esUnidadPropia ? (
                            <span>{bus.numeroDisco}</span>
                          ) : hasRecords && index === 0 ? (
                            '👑'
                          ) : (
                            <span className="font-mono text-[11px]">{bus.codigoAnonimo || bus.numeroDisco}</span>
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-extrabold text-sm text-gray-900">
                              {bus.esUnidadPropia ? `Bus ${bus.numeroDisco}` : bus.nombreDisplay}
                            </span>

                            {/* Badge identificador del usuario propio */}
                            {bus.esUnidadPropia && (
                              <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-800 flex items-center gap-0.5">
                                ⭐ Tu Unidad (Socio)
                              </span>
                            )}

                            {/* Badge para Socio Líder si aplica */}
                            {bus.esSocioLider && !bus.esUnidadPropia && (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-gray-100 text-gray-600">
                                Troncal
                              </span>
                            )}

                            {/* Placa: Real si es propia, Reservada si es par */}
                            <span className="text-[10px] text-gray-500 font-mono bg-gray-100 px-1 py-0.5 rounded">
                              {bus.placaDisplay}
                            </span>
                          </div>

                          <p className="text-[11px] text-gray-500">
                            {bus.marca} • {bus.capacidadAsientos} pasajeros • {bus.propietarioDisplay}
                          </p>
                        </div>
                      </div>

                      {/* IPF y Delta vs Media */}
                      <div className="text-right">
                        <div className="flex items-baseline justify-end gap-1">
                          <span className="text-[10px] text-gray-400 font-bold">IPF</span>
                          <span className="text-base font-black text-gray-900">
                            S/ {bus.ipf.toFixed(2)}
                          </span>
                        </div>

                        {/* Semáforo vs Media */}
                        {hasRecords ? (
                          <div className="flex items-center justify-end gap-1 mt-0.5">
                            {estado === 'SUPERIOR' ? (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                                <TrendingUp className="w-3 h-3" />
                                +S/ {diferencia.toFixed(2)} (+{porcentajeDiferencia}%)
                              </span>
                            ) : estado === 'INFERIOR' ? (
                              <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                                <TrendingDown className="w-3 h-3" />
                                S/ {diferencia.toFixed(2)} ({porcentajeDiferencia}%)
                              </span>
                            ) : (
                              <span className="text-[10px] font-medium text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                                <Minus className="w-3 h-3" />
                                En media
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] text-gray-400 italic">Sin registros</span>
                        )}
                      </div>
                    </div>

                    {/* Barra de proporción IPF vs Media */}
                    {hasRecords && currentCircuitData.ipfPromedioGrupo > 0 && (
                      <div className="space-y-1">
                        <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden flex">
                          <div
                            className={`h-full rounded-full ${
                              estado === 'SUPERIOR'
                                ? 'bg-emerald-500'
                                : estado === 'INFERIOR'
                                ? 'bg-rose-400'
                                : 'bg-blue-500'
                            }`}
                            style={{
                              width: `${Math.min(
                                100,
                                Math.max(15, (bus.ipf / (currentCircuitData.ipfPromedioGrupo * 1.3)) * 100)
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Métricas rápidas de producción */}
                    <div className="grid grid-cols-3 gap-2 pt-1 text-center bg-gray-50/70 p-2 rounded-xl text-[11px]">
                      <div>
                        <span className="text-gray-400 block text-[9px] uppercase font-bold">
                          Producción
                        </span>
                        <span className="font-bold text-gray-800">
                          S/ {bus.produccionTotal.toFixed(2)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400 block text-[9px] uppercase font-bold">
                          Vueltas
                        </span>
                        <span className="font-bold text-gray-800">
                          {bus.vueltasEfectivas} efectivas
                        </span>
                        {bus.vueltasNoRealizadas > 0 && (
                          <span className="text-[9px] text-amber-600 block">
                            ({bus.vueltasNoRealizadas} faltas)
                          </span>
                        )}
                      </div>
                      <div>
                        <span className="text-gray-400 block text-[9px] uppercase font-bold">
                          Jornadas
                        </span>
                        <span className="font-bold text-gray-800">{bus.diasOperados} días</span>
                      </div>
                    </div>

                    {/* Botón para ver más detalles */}
                    {hasRecords && (
                      <div>
                        <button
                          type="button"
                          onClick={() => setExpandedBusId(isExpanded ? null : bus.busId)}
                          className="w-full text-[11px] font-semibold text-gray-500 hover:text-gray-800 flex items-center justify-center gap-1 pt-1"
                        >
                          <span>{isExpanded ? 'Ocultar desglose' : 'Ver desglose'}</span>
                          {isExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </button>

                        {isExpanded && (
                          <div className="mt-2 pt-2 border-t border-gray-100 text-xs">
                            {/* Caso A: Unidad Propia del Socio (o Modo Auditor) -> Transparencia 100% */}
                            {!bus.datosPrivadosOcultos ? (
                              <div className="space-y-1.5 text-gray-600 bg-blue-50/40 p-2.5 rounded-xl border border-blue-100">
                                <div className="flex items-center gap-1.5 text-blue-950 font-bold mb-1">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                                  <span>Libro Contable de Tu Unidad</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Efectivo Ruta (Ayudante):</span>
                                  <strong className="text-gray-900">
                                    S/ {bus.efectivoTotal.toFixed(2)}
                                  </strong>
                                </div>
                                <div className="flex justify-between">
                                  <span>Caja Común (Oficinas):</span>
                                  <strong className="text-gray-900">
                                    S/ {bus.cajaComunTotal.toFixed(2)}
                                  </strong>
                                </div>
                                <div className="flex justify-between">
                                  <span>Gastos Operativos & Diésel:</span>
                                  <strong className="text-rose-600">
                                    S/ {bus.totalGastos.toFixed(2)}
                                  </strong>
                                </div>
                                <div className="flex justify-between border-t border-blue-200/60 pt-1 font-bold">
                                  <span>Utilidad Neta Líquida:</span>
                                  <strong className="text-emerald-700">
                                    S/ {bus.utilidadNeta.toFixed(2)}
                                  </strong>
                                </div>
                                {bus.kmTotales > 0 && (
                                  <div className="flex justify-between text-[11px] text-gray-500 pt-1">
                                    <span>Rendimiento por Km:</span>
                                    <span>S/ {bus.rendimientoPorKm.toFixed(2)} / km ({bus.kmTotales} km)</span>
                                  </div>
                                )}
                                {bus.ultimoRegistro && (
                                  <p className="text-[10px] text-gray-400 text-right pt-1">
                                    Última jornada reportada: {bus.ultimoRegistro}
                                  </p>
                                )}
                              </div>
                            ) : (
                              /* Caso B: Unidad de un Par -> Anonimato y Blindaje de Libros */
                              <div className="p-3 bg-gray-50 border border-gray-200/80 rounded-xl space-y-2 text-gray-600">
                                <div className="flex items-center gap-1.5 font-bold text-gray-800">
                                  <Lock className="w-3.5 h-3.5 text-gray-500" />
                                  <span>Libros Contables Privados</span>
                                </div>
                                <p className="text-[11px] text-gray-500 leading-relaxed">
                                  El desglose de efectivo en mano, retenciones de caja común y gastos privados de esta unidad pertenecen a su socio propietario y están protegidos por el protocolo de confidencialidad gremial.
                                </p>
                                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-200/70 text-[11px]">
                                  <div>
                                    <span className="text-gray-400 block text-[9px] uppercase font-bold">
                                      Rendimiento Operativo
                                    </span>
                                    <span className="font-bold text-gray-800">
                                      S/ {bus.rendimientoPorKm.toFixed(2)} / km
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-gray-400 block text-[9px] uppercase font-bold">
                                      Eficiencia de Ruta
                                    </span>
                                    <span className="font-bold text-emerald-700">
                                      {bus.vueltasEfectivas} vtas operadas
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* ─── PESTAÑA 2: AUDITORÍA DE AYUDANTES ─── */}
        {activeTab === 'TRIPULACIONES' && (
          <div className="space-y-3">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl text-xs text-blue-900">
              <p className="font-bold flex items-center gap-1.5">
                <Users className="w-4 h-4 text-blue-700" />
                <span>Auditoría de Rendimiento por Ayudante</span>
              </p>
              <p className="text-[11px] text-blue-700 mt-0.5">
                Muestra la recaudación promedio por vuelta (IPF) y total acumulado según los turnos operados en el período.
              </p>
            </div>

            {crewAudit.length === 0 ? (
              <div className="text-center py-10 bg-white rounded-2xl border border-gray-200 text-gray-400">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm font-medium">No hay registros de ayudantes en este período</p>
              </div>
            ) : (
              crewAudit.map((crew, idx) => (
                <Card
                  key={crew.nombre}
                  className="rounded-2xl border border-gray-200 bg-white shadow-xs"
                >
                  <CardContent className="p-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center font-bold text-xs text-gray-700">
                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                      </div>
                      <div>
                        <p className="font-bold text-xs text-gray-900">{crew.nombre}</p>
                        <p className="text-[10px] text-gray-500">
                          {crew.dias} jornadas • {crew.vueltas} vueltas operadas
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="flex items-baseline justify-end gap-1">
                        <span className="text-[10px] text-gray-400 font-bold">IPF</span>
                        <span className="text-sm font-black text-gray-900">
                          S/ {crew.ipf.toFixed(2)}
                        </span>
                      </div>
                      <span className="text-[10px] text-gray-500">
                        Total: S/ {crew.produccion.toFixed(2)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default BenchmarkScreen;
