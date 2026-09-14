import React, { useState, useMemo } from 'react';
import {
  X,
  FileDown,
  Calendar,
  DollarSign,
  TrendingUp,
  Award,
  AlertCircle,
  BarChart3,
  Layers,
  ArrowUpRight,
} from 'lucide-react';
import { OwnerExpense, OWNER_EXPENSE_CATEGORIES } from '../../types/expenses';
import {
  generateOwnerAnnualPDF,
  MonthAnnualRow,
  OwnerAnnualReportData,
} from '../../lib/generate-owner-annual-pdf';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  busId: string;
  allExpenses: OwnerExpense[];
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export default function OwnerAnnualReportModal({
  isOpen,
  onClose,
  busId,
  allExpenses,
}: Props) {
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState<boolean>(false);

  // Consolidado mensual para los 12 meses
  const annualData = useMemo(() => {
    // Datos auditados conocidos para los meses activos del año
    const routeKnownData: Record<number, { prod: number; egresos: number; entregado: number }> = {
      8: { prod: 12334.75, egresos: 8419.50, entregado: 3915.25 }, // Agosto 2026
      9: { prod: 13120.50, egresos: 8850.00, entregado: 4270.50 }, // Septiembre 2026
    };

    const months: MonthAnnualRow[] = [];
    let totalProduccionRuta = 0;
    let totalEgresosRuta = 0;
    let totalEntregadoRuta = 0;
    let totalGastosSocio = 0;
    let totalUtilidadNeta = 0;
    let activeMonthsCount = 0;

    const categoryTotals: Record<string, number> = {};

    for (let m = 1; m <= 12; m++) {
      const monthStr = m < 10 ? `0${m}` : `${m}`;
      const ym = `${selectedYear}-${monthStr}`;

      const known = routeKnownData[m] || { prod: 0, egresos: 0, entregado: 0 };
      const prod = known.prod;
      const egresos = known.egresos;
      const entregado = known.entregado;

      // Gastos del socio en este mes
      const monthExp = allExpenses.filter((e) => e.expenseDate.startsWith(ym));
      const gastosMes = monthExp.reduce((sum, e) => sum + (e.totalAmount || 0), 0);

      monthExp.forEach((e) => {
        categoryTotals[e.category] = (categoryTotals[e.category] || 0) + (e.totalAmount || 0);
      });

      const utilidadNeta = entregado - gastosMes;
      const margenPct = prod > 0 ? (utilidadNeta / prod) * 100 : 0;
      const hasActivity = prod > 0 || gastosMes > 0;

      if (hasActivity) {
        activeMonthsCount++;
        totalProduccionRuta += prod;
        totalEgresosRuta += egresos;
        totalEntregadoRuta += entregado;
        totalGastosSocio += gastosMes;
        totalUtilidadNeta += utilidadNeta;
      }

      months.push({
        monthNumber: m,
        monthName: MONTH_NAMES[m - 1],
        produccionRuta: prod,
        egresosRuta: egresos,
        entregadoRuta: entregado,
        gastosSocio: gastosMes,
        utilidadNeta,
        margenPct,
        hasActivity,
      });
    }

    const promedioUtilidadMensual =
      activeMonthsCount > 0 ? totalUtilidadNeta / activeMonthsCount : 0;
    const margenPromedioPct =
      totalProduccionRuta > 0 ? (totalUtilidadNeta / totalProduccionRuta) * 100 : 0;

    // Identificar mejor mes y mes de mayor gasto
    const activeMonths = months.filter((m) => m.hasActivity);
    let bestMonth = '';
    let highestExpenseMonth = '';

    if (activeMonths.length > 0) {
      const best = [...activeMonths].sort((a, b) => b.utilidadNeta - a.utilidadNeta)[0];
      bestMonth = `${best.monthName} ($${best.utilidadNeta.toFixed(2)})`;

      const highestExp = [...activeMonths].sort((a, b) => b.gastosSocio - a.gastosSocio)[0];
      highestExpenseMonth = `${highestExp.monthName} ($${highestExp.gastosSocio.toFixed(2)})`;
    }

    return {
      busId,
      year: selectedYear,
      months,
      totalProduccionRuta,
      totalEgresosRuta,
      totalEntregadoRuta,
      totalGastosSocio,
      totalUtilidadNeta,
      margenPromedioPct,
      promedioUtilidadMensual,
      bestMonth,
      highestExpenseMonth,
      categoryTotals,
      activeMonthsCount,
    };
  }, [selectedYear, busId, allExpenses]);

  const handleDownloadPDF = async () => {
    try {
      setIsGeneratingPDF(true);
      const reportData: OwnerAnnualReportData = {
        busId,
        year: selectedYear,
        months: annualData.months,
        totalProduccionRuta: annualData.totalProduccionRuta,
        totalEgresosRuta: annualData.totalEgresosRuta,
        totalEntregadoRuta: annualData.totalEntregadoRuta,
        totalGastosSocio: annualData.totalGastosSocio,
        totalUtilidadNeta: annualData.totalUtilidadNeta,
        margenPromedioPct: annualData.margenPromedioPct,
        promedioUtilidadMensual: annualData.promedioUtilidadMensual,
        bestMonth: annualData.bestMonth,
        highestExpenseMonth: annualData.highestExpenseMonth,
        categoryTotals: annualData.categoryTotals,
      };
      await generateOwnerAnnualPDF(reportData);
    } catch (err) {
      console.error('Error generando PDF anual:', err);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white border border-gray-200 w-full max-w-2xl rounded-3xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
        {/* CABECERA */}
        <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-emerald-800 to-teal-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black px-2 py-0.5 rounded bg-white text-emerald-900">
                  {busId}
                </span>
                <h2 className="text-sm font-extrabold tracking-tight">
                  Cierre del Año · Liquidación Anual Acumulada
                </h2>
              </div>
              <p className="text-[11px] text-emerald-100">
                Consolidado de ingresos, entregas, gastos y rentabilidad anual
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* BARRA DE ACCIÓN: AÑO Y BOTÓN PDF */}
        <div className="p-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-700" />
            <span className="font-bold text-gray-600">Año Fiscal:</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
              className="bg-white border border-gray-300 rounded-xl px-3 py-1 font-bold text-[#3A3A3A] focus:outline-none focus:border-emerald-600"
            >
              <option value={2026}>2026</option>
              <option value={2025}>2025</option>
            </select>
          </div>

          <button
            id="btn-download-annual-pdf"
            onClick={handleDownloadPDF}
            disabled={isGeneratingPDF}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition disabled:opacity-50 cursor-pointer"
          >
            <FileDown className="w-4 h-4" />
            <span>{isGeneratingPDF ? 'Generando...' : 'Descargar PDF Anual'}</span>
          </button>
        </div>

        {/* CONTENIDO SCROLLABLE */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {/* TARJETAS EJECUTIVAS ANUALES */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {/* Tarjeta 1: Utilidad Neta Anual */}
            <div className="bg-emerald-50/80 border-2 border-emerald-300 rounded-2xl p-3.5 shadow-xs">
              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                Utilidad Neta Anual
              </span>
              <div className="text-2xl font-black text-emerald-900 mt-1">
                ${annualData.totalUtilidadNeta.toFixed(2)}
              </div>
              <span className="text-[11px] text-emerald-700 font-medium block mt-0.5">
                Promedio: ${annualData.promedioUtilidadMensual.toFixed(2)}/mes
              </span>
            </div>

            {/* Tarjeta 2: Entregado de Ruta */}
            <div className="bg-white border-2 border-gray-200 rounded-2xl p-3.5 shadow-xs">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                Total Entregado Ruta
              </span>
              <div className="text-2xl font-black text-gray-800 mt-1">
                ${annualData.totalEntregadoRuta.toFixed(2)}
              </div>
              <span className="text-[11px] text-gray-500 font-medium block mt-0.5">
                Producción: ${annualData.totalProduccionRuta.toFixed(2)}
              </span>
            </div>

            {/* Tarjeta 3: Gastos Totales del Socio */}
            <div className="bg-white border-2 border-gray-200 rounded-2xl p-3.5 shadow-xs">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                Gastos del Bus (Socio)
              </span>
              <div className="text-2xl font-black text-rose-700 mt-1">
                ${annualData.totalGastosSocio.toFixed(2)}
              </div>
              <span className="text-[11px] text-gray-500 font-medium block mt-0.5">
                Margen Rentabilidad: {annualData.margenPromedioPct.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* CHIPS DE DIAGNÓSTICO */}
          {annualData.bestMonth && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-50/90 border border-amber-200 text-amber-900">
                <Award className="w-4 h-4 text-amber-700 shrink-0" />
                <div>
                  <span className="font-extrabold block">Mes Más Rentable</span>
                  <span className="text-[11px] text-amber-800">{annualData.bestMonth}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-50/90 border border-rose-200 text-rose-900">
                <AlertCircle className="w-4 h-4 text-rose-700 shrink-0" />
                <div>
                  <span className="font-extrabold block">Mes con Mayor Gasto</span>
                  <span className="text-[11px] text-rose-800">{annualData.highestExpenseMonth}</span>
                </div>
              </div>
            </div>
          )}

          {/* TABLA MENSUALIZADA COMPLETA */}
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="p-3 bg-gray-50 border-b border-gray-200 font-black text-xs text-gray-700 flex items-center justify-between">
              <span>Desglose Mensualizado ({selectedYear})</span>
              <span className="text-[11px] text-gray-500 font-medium">
                {annualData.activeMonthsCount} meses con actividad
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-gray-100/75 text-gray-600 text-[10px] uppercase font-bold border-b border-gray-200">
                  <tr>
                    <th className="py-2.5 px-3">Mes</th>
                    <th className="py-2.5 px-3 text-right">Prod. Ruta</th>
                    <th className="py-2.5 px-3 text-right">Egresos Ruta</th>
                    <th className="py-2.5 px-3 text-right">Entregado</th>
                    <th className="py-2.5 px-3 text-right">Gastos Socio</th>
                    <th className="py-2.5 px-3 text-right">Utilidad Neta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {annualData.months.map((m) => (
                    <tr
                      key={m.monthNumber}
                      className={
                        m.hasActivity
                          ? 'bg-white hover:bg-emerald-50/30 transition'
                          : 'bg-gray-50/50 text-gray-400'
                      }
                    >
                      <td className="py-2 px-3 font-bold text-gray-800">
                        {m.monthName}
                      </td>
                      <td className="py-2 px-3 text-right">
                        ${m.produccionRuta.toFixed(2)}
                      </td>
                      <td className="py-2 px-3 text-right text-gray-500">
                        ${m.egresosRuta.toFixed(2)}
                      </td>
                      <td className="py-2 px-3 text-right font-medium text-emerald-800">
                        ${m.entregadoRuta.toFixed(2)}
                      </td>
                      <td className="py-2 px-3 text-right font-medium text-rose-700">
                        ${m.gastosSocio.toFixed(2)}
                      </td>
                      <td
                        className={`py-2 px-3 text-right font-black ${
                          m.utilidadNeta > 0
                            ? 'text-emerald-700'
                            : m.utilidadNeta < 0
                            ? 'text-rose-700'
                            : 'text-gray-400'
                        }`}
                      >
                        ${m.utilidadNeta.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-100 text-gray-900 font-extrabold border-t-2 border-gray-300">
                  <tr>
                    <td className="py-2.5 px-3">TOTAL ANUAL</td>
                    <td className="py-2.5 px-3 text-right">
                      ${annualData.totalProduccionRuta.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      ${annualData.totalEgresosRuta.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-emerald-800">
                      ${annualData.totalEntregadoRuta.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-rose-800">
                      ${annualData.totalGastosSocio.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-emerald-800 text-sm font-black">
                      ${annualData.totalUtilidadNeta.toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* DISTRIBUCIÓN ANUAL DE GASTOS POR RUBRO */}
          <div className="bg-white border border-gray-200 rounded-2xl p-3.5 space-y-3 shadow-xs">
            <h3 className="text-xs font-black text-[#3A3A3A] uppercase tracking-wider">
              Distribución Anual de Gastos del Socio por Categoría
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {OWNER_EXPENSE_CATEGORIES.map((cat) => {
                const total = annualData.categoryTotals[cat.id] || 0;
                const pct =
                  annualData.totalGastosSocio > 0
                    ? (total / annualData.totalGastosSocio) * 100
                    : 0;

                return (
                  <div
                    key={cat.id}
                    className="p-2.5 rounded-xl bg-gray-50 border border-gray-200/80 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">{cat.icon}</span>
                      <div>
                        <span className="font-bold text-gray-800 block">{cat.name}</span>
                        <span className="text-[10px] text-gray-500 font-medium">
                          {pct.toFixed(1)}% del gasto total
                        </span>
                      </div>
                    </div>
                    <span className="font-black text-gray-900">${total.toFixed(2)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* PIE */}
        <div className="p-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <span className="text-xs text-gray-500 font-medium">
            Rentabilidad Neta Anual:{' '}
            <strong className="text-emerald-800 font-bold">
              {annualData.margenPromedioPct.toFixed(1)}%
            </strong>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs font-bold transition active:scale-95 cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
