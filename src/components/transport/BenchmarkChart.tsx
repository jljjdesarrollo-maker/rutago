'use client';

import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  Cell,
  CartesianGrid,
  Legend,
} from 'recharts';
import { TrendingUp, DollarSign, RotateCw, BarChart3, Award, Info, ShieldCheck } from 'lucide-react';
import { type BusBenchmarkMetric, type BenchmarkCircuitGroup } from '@/types/benchmark';

interface BenchmarkChartProps {
  ranking: BusBenchmarkMetric[];
  ipfPromedioGrupo: number;
  circuito: BenchmarkCircuitGroup;
  tituloCircuito: string;
}

type ChartMetric = 'IPF' | 'PRODUCCION' | 'VUELTAS';

export function BenchmarkChart({
  ranking,
  ipfPromedioGrupo,
  circuito,
  tituloCircuito,
}: BenchmarkChartProps) {
  const [metric, setMetric] = useState<ChartMetric>('IPF');
  const [filterActiveOnly, setFilterActiveOnly] = useState(true);

  // Filtrado y mapeo de datos preparado para recharts (Cero Bucles & Memoizado)
  const chartData = useMemo(() => {
    let list = ranking;
    if (filterActiveOnly) {
      list = ranking.filter((b) => b.produccionTotal > 0 || b.vueltasEfectivas > 0);
    }

    return list.map((b) => {
      const label = b.esUnidadPropia
        ? `Bus ${b.numeroDisco} (Tú)`
        : b.codigoAnonimo || b.nombreDisplay;

      return {
        busId: b.busId,
        numeroDisco: b.numeroDisco,
        label,
        esUnidadPropia: b.esUnidadPropia,
        ipf: b.ipf,
        produccionTotal: b.produccionTotal,
        vueltasEfectivas: b.vueltasEfectivas,
        vueltasNoRealizadas: b.vueltasNoRealizadas,
        vueltasTotales: b.vueltasTotales,
        diasOperados: b.diasOperados,
        rendimientoPorKm: b.rendimientoPorKm,
        estado: b.comparativaMediaIPF.estado,
        diferencia: b.comparativaMediaIPF.diferencia,
        porcentajeDiferencia: b.comparativaMediaIPF.porcentajeDiferencia,
        placaDisplay: b.placaDisplay,
      };
    });
  }, [ranking, filterActiveOnly]);

  if (chartData.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-6 text-center text-gray-400 text-xs">
        <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-30" />
        <p className="font-semibold">Sin datos suficientes para graficar en este período.</p>
      </div>
    );
  }

  // Custom Tooltip estilizado con alta ergonomía y datos confidenciales protegidos
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0].payload;

    return (
      <div className="bg-gray-900/95 text-white text-xs rounded-xl p-3 shadow-xl border border-gray-700 backdrop-blur-md max-w-[230px] space-y-1.5 z-50">
        <div className="flex items-center justify-between border-b border-gray-700/80 pb-1.5 gap-2">
          <span className="font-extrabold text-sm text-amber-300">
            {data.label}
          </span>
          {data.esUnidadPropia ? (
            <span className="text-[9px] bg-blue-500/30 text-blue-300 px-1.5 py-0.5 rounded font-bold uppercase">
              Tu Unidad
            </span>
          ) : (
            <span className="text-[9px] bg-gray-700 text-gray-300 px-1.5 py-0.5 rounded font-mono">
              Par Anónimo
            </span>
          )}
        </div>

        <div className="space-y-1 pt-0.5">
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-gray-400">IPF / Vuelta:</span>
            <strong className="text-white text-xs">S/ {data.ipf.toFixed(2)}</strong>
          </div>

          <div className="flex justify-between items-center text-[11px]">
            <span className="text-gray-400">vs Media ({ipfPromedioGrupo.toFixed(2)}):</span>
            <span
              className={`font-bold ${
                data.diferencia > 0
                  ? 'text-emerald-400'
                  : data.diferencia < 0
                  ? 'text-rose-400'
                  : 'text-gray-300'
              }`}
            >
              {data.diferencia > 0 ? `+S/ ${data.diferencia.toFixed(2)}` : `S/ ${data.diferencia.toFixed(2)}`} ({data.porcentajeDiferencia}%)
            </span>
          </div>

          <div className="flex justify-between items-center text-[11px]">
            <span className="text-gray-400">Producción Total:</span>
            <strong className="text-gray-200">S/ {data.produccionTotal.toFixed(2)}</strong>
          </div>

          <div className="flex justify-between items-center text-[11px]">
            <span className="text-gray-400">Vueltas Operadas:</span>
            <span className="text-gray-200 font-medium">
              {data.vueltasEfectivas} efectivas
              {data.vueltasNoRealizadas > 0 && (
                <span className="text-amber-400 ml-1">({data.vueltasNoRealizadas} caídas)</span>
              )}
            </span>
          </div>

          <div className="flex justify-between items-center text-[11px]">
            <span className="text-gray-400">Jornadas:</span>
            <span className="text-gray-300">{data.diasOperados} días</span>
          </div>
        </div>

        {!data.esUnidadPropia && (
          <p className="text-[9px] text-gray-400 italic pt-1 border-t border-gray-800 flex items-center gap-1">
            <ShieldCheck className="w-2.5 h-2.5 text-blue-400 inline shrink-0" />
            Libros contables privados resguardados
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-3.5 shadow-xs space-y-3">
      {/* Encabezado del Gráfico con selector de variables */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-2.5">
        <div>
          <div className="flex items-center gap-1.5">
            <BarChart3 className="w-4 h-4 text-[#912D26]" />
            <h3 className="font-extrabold text-xs text-gray-900 uppercase tracking-tight">
              Gráfico Comparativo de Flota
            </h3>
          </div>
          <p className="text-[11px] text-gray-500">
            {metric === 'IPF'
              ? 'Ingreso Promedio por Frecuencia (S/ por vuelta)'
              : metric === 'PRODUCCION'
              ? 'Facturación Bruta Acumulada (S/)'
              : 'Vueltas Operadas vs Faltantes'}
          </p>
        </div>

        {/* Botonera de métricas */}
        <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded-xl text-[11px] font-bold">
          <button
            type="button"
            onClick={() => setMetric('IPF')}
            className={`px-2.5 py-1 rounded-lg transition-all ${
              metric === 'IPF'
                ? 'bg-white text-[#912D26] shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            IPF
          </button>
          <button
            type="button"
            onClick={() => setMetric('PRODUCCION')}
            className={`px-2.5 py-1 rounded-lg transition-all ${
              metric === 'PRODUCCION'
                ? 'bg-white text-[#912D26] shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Producción
          </button>
          <button
            type="button"
            onClick={() => setMetric('VUELTAS')}
            className={`px-2.5 py-1 rounded-lg transition-all ${
              metric === 'VUELTAS'
                ? 'bg-white text-[#912D26] shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Vueltas
          </button>
        </div>
      </div>

      {/* Área del Gráfico Responsive */}
      <div className="h-[260px] w-full pt-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 12, right: 8, left: -20, bottom: 26 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: '#4B5563', fontWeight: 600 }}
              interval={0}
              angle={-28}
              textAnchor="end"
              height={36}
            />
            <YAxis
              tick={{ fontSize: 10, fill: '#6B7280' }}
              tickFormatter={(val) =>
                metric === 'VUELTAS' ? `${val}` : `S/ ${val}`
              }
            />
            <Tooltip content={<CustomTooltip />} />

            {/* Línea de Referencia de la Media del Circuito (en modo IPF) */}
            {metric === 'IPF' && ipfPromedioGrupo > 0 && (
              <ReferenceLine
                y={ipfPromedioGrupo}
                stroke="#059669"
                strokeDasharray="4 4"
                strokeWidth={2}
                label={{
                  value: `Media S/ ${ipfPromedioGrupo.toFixed(1)}`,
                  position: 'insideTopRight',
                  fill: '#065F46',
                  fontSize: 10,
                  fontWeight: 800,
                }}
              />
            )}

            {metric === 'IPF' && (
              <Bar dataKey="ipf" radius={[6, 6, 0, 0]} maxBarSize={38}>
                {chartData.map((entry, index) => {
                  let fillColor = '#3B82F6'; // Default azul
                  if (entry.esUnidadPropia) {
                    fillColor = '#1D4ED8'; // Azul marino fuerte para tu unidad
                  } else if (entry.estado === 'SUPERIOR') {
                    fillColor = '#10B981'; // Verde esmeralda superior
                  } else if (entry.estado === 'INFERIOR') {
                    fillColor = '#F43F5E'; // Rosa/Rojo inferior
                  } else {
                    fillColor = '#94A3B8'; // Gris azulado en promedio
                  }
                  return (
                    <Cell
                      key={`cell-ipf-${index}`}
                      fill={fillColor}
                      stroke={entry.esUnidadPropia ? '#F59E0B' : 'none'}
                      strokeWidth={entry.esUnidadPropia ? 2 : 0}
                    />
                  );
                })}
              </Bar>
            )}

            {metric === 'PRODUCCION' && (
              <Bar dataKey="produccionTotal" radius={[6, 6, 0, 0]} maxBarSize={38}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-prod-${index}`}
                    fill={entry.esUnidadPropia ? '#2563EB' : '#64748B'}
                    stroke={entry.esUnidadPropia ? '#F59E0B' : 'none'}
                    strokeWidth={entry.esUnidadPropia ? 2 : 0}
                  />
                ))}
              </Bar>
            )}

            {metric === 'VUELTAS' && (
              <>
                <Bar
                  dataKey="vueltasEfectivas"
                  name="Efectivas"
                  stackId="vueltas"
                  fill="#0D9488"
                  radius={[0, 0, 0, 0]}
                  maxBarSize={38}
                />
                <Bar
                  dataKey="vueltasNoRealizadas"
                  name="Caídas / Faltas"
                  stackId="vueltas"
                  fill="#E11D48"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={38}
                />
              </>
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Leyenda interactiva & Explicación visual */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100 text-[10px] text-gray-500">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="flex items-center gap-1 font-bold text-blue-900">
            <span className="w-2.5 h-2.5 rounded bg-blue-700 ring-1 ring-amber-400 inline-block" />
            Tu Unidad
          </span>
          {metric === 'IPF' && (
            <>
              <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                <span className="w-2.5 h-2.5 rounded bg-emerald-500 inline-block" />
                Sobre la media
              </span>
              <span className="flex items-center gap-1 text-rose-700 font-semibold">
                <span className="w-2.5 h-2.5 rounded bg-rose-500 inline-block" />
                Bajo la media
              </span>
              <span className="flex items-center gap-1 text-gray-500 font-semibold">
                <span className="w-2.5 h-2.5 rounded bg-slate-400 inline-block" />
                En promedio
              </span>
            </>
          )}
          {metric === 'VUELTAS' && (
            <>
              <span className="flex items-center gap-1 text-teal-700 font-semibold">
                <span className="w-2.5 h-2.5 rounded bg-teal-600 inline-block" />
                Vueltas Efectivas
              </span>
              <span className="flex items-center gap-1 text-rose-700 font-semibold">
                <span className="w-2.5 h-2.5 rounded bg-rose-600 inline-block" />
                Vueltas Caídas
              </span>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setFilterActiveOnly(!filterActiveOnly)}
          className="text-[10px] text-gray-500 hover:text-gray-800 underline font-medium"
        >
          {filterActiveOnly ? 'Mostrar todas (incl. sin datos)' : 'Ocultar sin registros'}
        </button>
      </div>
    </div>
  );
}

export default BenchmarkChart;
