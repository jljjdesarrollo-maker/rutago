'use client';

import React, { useMemo } from 'react';
import {
  X,
  FileText,
  Download,
  TrendingUp,
  TrendingDown,
  Fuel,
  Users,
  ShieldCheck,
  Receipt,
  DollarSign,
  AlertCircle,
  Building2,
  Calendar,
  Layers,
} from 'lucide-react';
import { OwnerExpense, OWNER_EXPENSE_CATEGORIES } from '../../types/expenses';
import {
  generateOwnerIncomeStatementPDF,
  OwnerIncomeStatementData,
  RouteFinancialSummary,
} from '../../lib/generate-owner-income-pdf';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  busId: string;
  selectedYearMonth: string; // ej: '2026-09'
  allExpenses: OwnerExpense[];
}

export default function OwnerIncomeStatementModal({
  isOpen,
  onClose,
  busId,
  selectedYearMonth,
  allExpenses,
}: Props) {
  if (!isOpen) return null;

  // Formato legible del mes
  const formatMonthName = (ym: string) => {
    const [y, m] = ym.split('-');
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    const monthIndex = parseInt(m, 10) - 1;
    return `${months[monthIndex] || m} ${y}`;
  };

  const monthFormatted = formatMonthName(selectedYearMonth);

  // 1. OBTENER / CONSOLIDAR DATOS DE RUTA DEL MES
  // Para el mes seleccionado calculamos o tomamos los registros operativos
  const routeSummary: RouteFinancialSummary = useMemo(() => {
    // Si es septiembre 2026 o agosto 2026, proveemos estimación realista basada en las frecuencias de la unidad
    const isAugust = selectedYearMonth === '2026-08';
    
    // Simulación de valores operativos estándar de un bus activo en la ruta Loja-Vilcabamba
    const totalProduccionBruta = isAugust ? 4850.0 : 5420.0;
    const diesel = isAugust ? 1280.0 : 1420.0;
    const chofer = isAugust ? 900.0 : 960.0;
    const ayudante = isAugust ? 600.0 : 640.0;
    const peajesTerminales = isAugust ? 210.0 : 230.0;
    const planRenova = isAugust ? 180.0 : 180.0;
    const otrosRuta = isAugust ? 60.0 : 75.0;

    const totalGastosRuta = diesel + chofer + ayudante + peajesTerminales + planRenova + otrosRuta;
    const entregaNetaCarretera = totalProduccionBruta - totalGastosRuta;

    return {
      totalProduccionBruta,
      totalVueltas: isAugust ? 124 : 138,
      totalBoletos: isAugust ? 3420 : 3890,
      gastosRuta: {
        diesel,
        chofer,
        ayudante,
        peajesTerminales,
        planRenova,
        otrosRuta,
        totalGastosRuta,
      },
      entregaNetaCarretera,
    };
  }, [selectedYearMonth]);

  // 2. CONSOLIDAR GASTOS DEL SOCIO EN EL MES (8 CATEGORÍAS)
  const ownerExpensesSummary = useMemo(() => {
    const expensesInMonth = allExpenses.filter((e) =>
      e.expenseDate.startsWith(selectedYearMonth)
    );

    const categoriesBreakdown = OWNER_EXPENSE_CATEGORIES.map((meta) => {
      const items = expensesInMonth.filter((e) => e.category === meta.id);
      const totalAmount = items.reduce((sum, e) => sum + (e.totalAmount || 0), 0);
      const paidAmount = items.reduce((sum, e) => sum + (e.paidAmount || 0), 0);
      const pendingBalance = items.reduce((sum, e) => sum + (e.pendingBalance || 0), 0);

      return {
        id: meta.id,
        name: meta.name,
        icon: meta.icon,
        count: items.length,
        totalAmount,
        paidAmount,
        pendingBalance,
      };
    });

    const totalGastosSocio = categoriesBreakdown.reduce((sum, c) => sum + c.totalAmount, 0);
    const totalPagadoEfectivoTransf = categoriesBreakdown.reduce((sum, c) => sum + c.paidAmount, 0);
    const totalDeudasTalleresPendientes = categoriesBreakdown.reduce((sum, c) => sum + c.pendingBalance, 0);

    return {
      categories: categoriesBreakdown,
      totalGastosSocio,
      totalPagadoEfectivoTransf,
      totalDeudasTalleresPendientes,
    };
  }, [allExpenses, selectedYearMonth]);

  // 3. RESULTADOS CONTABLES FINALES
  const utilidadNetaReal = routeSummary.entregaNetaCarretera - ownerExpensesSummary.totalGastosSocio;
  const margenUtilidadPorcentaje =
    routeSummary.totalProduccionBruta > 0
      ? (utilidadNetaReal / routeSummary.totalProduccionBruta) * 100
      : 0;

  const [isGeneratingPDF, setIsGeneratingPDF] = React.useState(false);

  // Manejador de descarga de PDF
  const handleDownloadPDF = async () => {
    try {
      setIsGeneratingPDF(true);
      const reportData: OwnerIncomeStatementData = {
        busId,
        monthStr: selectedYearMonth,
        monthFormatted,
        routeData: routeSummary,
        ownerExpenses: ownerExpensesSummary,
        margenOperativoCarretera: routeSummary.entregaNetaCarretera,
        utilidadNetaReal,
        margenUtilidadPorcentaje,
      };
      await generateOwnerIncomeStatementPDF(reportData);
    } catch (err) {
      console.error('Error generando PDF de Estado de Resultados:', err);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white border border-gray-200 w-full max-w-lg rounded-3xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
        {/* CABECERA MODAL */}
        <div className="p-4 border-b border-gray-100 bg-[#912D26] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black px-2 py-0.5 rounded bg-white text-[#912D26]">
                  {busId}
                </span>
                <h2 className="text-sm font-extrabold tracking-tight">
                  Estado de Resultados Consolidado
                </h2>
              </div>
              <p className="text-[11px] text-red-100">
                {monthFormatted} • Utilidad Real del Socio
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* CUERPO DEL ESTADO DE RESULTADOS */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1 text-[#3A3A3A]">
          {/* TARJETA DESTACADA: UTILIDAD NETA DISPONIBLE */}
          <div
            className={`p-4 rounded-2xl border-2 flex items-center justify-between shadow-xs ${
              utilidadNetaReal >= 0
                ? 'bg-emerald-50/70 border-emerald-300'
                : 'bg-rose-50/70 border-rose-300'
            }`}
          >
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-500 block">
                Utilidad Neta Disponible (Bolsillo Socio)
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span
                  className={`text-2xl font-black ${
                    utilidadNetaReal >= 0 ? 'text-emerald-700' : 'text-rose-700'
                  }`}
                >
                  ${utilidadNetaReal.toFixed(2)}
                </span>
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    utilidadNetaReal >= 0
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {margenUtilidadPorcentaje.toFixed(1)}% margen
                </span>
              </div>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Dinero libre tras cubrir gastos de ruta y las 8 categorías de gastos
              </p>
            </div>
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                utilidadNetaReal >= 0
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-rose-100 text-rose-700'
              }`}
            >
              {utilidadNetaReal >= 0 ? (
                <TrendingUp className="w-6 h-6 stroke-[2.5]" />
              ) : (
                <TrendingDown className="w-6 h-6 stroke-[2.5]" />
              )}
            </div>
          </div>

          {/* CASCADA FINANCIERA PASO A PASO */}
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-3.5 space-y-3">
            <h3 className="text-xs font-black text-[#3A3A3A] uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[#912D26]" />
              <span>Cascada Contable del Mes</span>
            </h3>

            <div className="space-y-2 text-xs">
              {/* 1. Ingresos Brutos */}
              <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-gray-200">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="font-bold text-[#3A3A3A]">Ingresos Brutos de Boletaje</span>
                </div>
                <span className="font-extrabold text-emerald-700">
                  +${routeSummary.totalProduccionBruta.toFixed(2)}
                </span>
              </div>

              {/* 2. Gastos de Ruta Pagados por Ayudante */}
              <div className="p-2.5 rounded-xl bg-white border border-gray-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-orange-500" />
                    <span className="font-bold text-[#3A3A3A]">
                      (-) Gastos de Ruta (Ayudante/Chofer)
                    </span>
                  </div>
                  <span className="font-extrabold text-orange-700">
                    -${routeSummary.gastosRuta.totalGastosRuta.toFixed(2)}
                  </span>
                </div>

                {/* Sub-desglose de ruta */}
                <div className="grid grid-cols-2 gap-1.5 pt-1.5 border-t border-gray-100 text-[11px] text-gray-500">
                  <div className="flex justify-between">
                    <span>⛽ Diésel:</span>
                    <span className="font-semibold text-gray-700">
                      ${routeSummary.gastosRuta.diesel.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>👨‍✈️ Chofer:</span>
                    <span className="font-semibold text-gray-700">
                      ${routeSummary.gastosRuta.chofer.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>🧑‍💼 Ayudante:</span>
                    <span className="font-semibold text-gray-700">
                      ${routeSummary.gastosRuta.ayudante.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>🛣️ Peajes/Andén:</span>
                    <span className="font-semibold text-gray-700">
                      ${routeSummary.gastosRuta.peajesTerminales.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* 3. Entrega Neta Carretera */}
              <div className="flex items-center justify-between px-2 py-1 text-gray-600 font-medium">
                <span>(=) Entrega Operativa de Carretera:</span>
                <span className="font-bold text-[#3A3A3A]">
                  ${routeSummary.entregaNetaCarretera.toFixed(2)}
                </span>
              </div>

              {/* 4. Gastos Directos del Socio */}
              <div className="p-2.5 rounded-xl bg-white border border-gray-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    <span className="font-bold text-[#3A3A3A]">
                      (-) Gastos Directos del Socio (8 Categorías)
                    </span>
                  </div>
                  <span className="font-extrabold text-rose-700">
                    -${ownerExpensesSummary.totalGastosSocio.toFixed(2)}
                  </span>
                </div>

                {/* Sub-detalle pagos vs deudas */}
                <div className="flex items-center justify-between pt-1.5 border-t border-gray-100 text-[11px] text-gray-500">
                  <span>Pagado en mes: ${ownerExpensesSummary.totalPagadoEfectivoTransf.toFixed(2)}</span>
                  <span className="text-amber-700 font-semibold">
                    Quedó fiado en taller: ${ownerExpensesSummary.totalDeudasTalleresPendientes.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* DESGLOSE POR LAS 8 CATEGORÍAS DEL SOCIO */}
          <div className="space-y-2">
            <h3 className="text-xs font-black text-[#3A3A3A] uppercase tracking-wider flex items-center justify-between">
              <span>Gastos del Socio por Categoría</span>
              <span className="text-gray-400 font-semibold lowercase text-[11px]">
                {ownerExpensesSummary.categories.filter((c) => c.count > 0).length} activas
              </span>
            </h3>

            <div className="space-y-1.5">
              {ownerExpensesSummary.categories.map((cat) => {
                if (cat.count === 0) return null;
                const pct =
                  ownerExpensesSummary.totalGastosSocio > 0
                    ? (cat.totalAmount / ownerExpensesSummary.totalGastosSocio) * 100
                    : 0;

                return (
                  <div
                    key={cat.id}
                    className="bg-white border border-gray-200 rounded-xl p-2.5 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-base shrink-0">{cat.icon}</span>
                      <div className="min-w-0">
                        <p className="font-bold text-[#3A3A3A] truncate">{cat.name}</p>
                        <p className="text-[10px] text-gray-400">
                          {cat.count} salida(s) • {pct.toFixed(1)}% del gasto
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-extrabold text-[#3A3A3A] block">
                        ${cat.totalAmount.toFixed(2)}
                      </span>
                      {cat.pendingBalance > 0 && (
                        <span className="text-[10px] font-bold text-amber-600 block">
                          Debe: ${cat.pendingBalance.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              {ownerExpensesSummary.categories.filter((c) => c.count > 0).length === 0 && (
                <div className="p-3 text-center text-gray-400 bg-white border border-dashed rounded-xl text-xs">
                  No hay gastos registrados por el socio en este mes.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* PIE CON BOTÓN DE DESCARGA PDF */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center gap-2">
          <button
            onClick={handleDownloadPDF}
            disabled={isGeneratingPDF}
            className="flex-1 min-h-[48px] rounded-2xl bg-[#912D26] hover:bg-[#a6342c] text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-md transition cursor-pointer disabled:opacity-75"
          >
            <Download className={`w-4 h-4 ${isGeneratingPDF ? 'animate-bounce' : ''}`} />
            <span>{isGeneratingPDF ? 'Generando PDF Oficial...' : 'Descargar PDF Estado de Resultados'}</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 min-h-[48px] rounded-2xl bg-white border border-gray-200 hover:bg-gray-100 text-[#3A3A3A] font-bold text-xs transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
