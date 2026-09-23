import React, { useState, useMemo } from 'react';
import {
  X,
  FileDown,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  Calendar,
  Building2,
  Search,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Banknote,
  Receipt,
  Plus,
} from 'lucide-react';
import { OwnerExpense, OWNER_EXPENSE_CATEGORIES } from '../../types/expenses';
import { generateOwnerDebtsPDF, OwnerDebtsReportData } from '../../lib/generate-owner-debts-pdf';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  busId: string;
  allExpenses: OwnerExpense[];
  onOpenAbonoModal: (expense: OwnerExpense) => void;
}

export default function OwnerDebtsReportModal({
  isOpen,
  onClose,
  busId,
  allExpenses,
  onOpenAbonoModal,
}: Props) {
  // Estado de filtros
  const [filterView, setFilterView] = useState<'PENDING' | 'ALL'>('PENDING');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedExpenseId, setExpandedExpenseId] = useState<string | null>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // Filtrado de deudas de esta unidad
  const debtsForBus = useMemo(() => {
    return allExpenses.filter((e) => e.busId === busId);
  }, [allExpenses, busId]);

  // Cálculos consolidados de cartera
  const totalDeudaPendiente = useMemo(() => {
    return debtsForBus.reduce((sum, e) => sum + (e.pendingBalance || 0), 0);
  }, [debtsForBus]);

  const totalCreditoOriginal = useMemo(() => {
    // Gastos que en algún momento fueron a crédito o tienen saldo
    const creditExpenses = debtsForBus.filter(
      (e) => (e.pendingBalance || 0) > 0 || (e.abonos && e.abonos.length > 0)
    );
    return creditExpenses.reduce((sum, e) => sum + (e.totalAmount || 0), 0);
  }, [debtsForBus]);

  const totalAbonado = useMemo(() => {
    return debtsForBus.reduce((sum, e) => {
      const abonosSum = e.abonos ? e.abonos.reduce((s, a) => s + (a.amount || 0), 0) : 0;
      return sum + abonosSum;
    }, 0);
  }, [debtsForBus]);

  const activeCreditorsCount = useMemo(() => {
    const active = debtsForBus.filter((e) => (e.pendingBalance || 0) > 0);
    const providers = new Set(active.map((e) => e.provider || 'Sin Proveedor'));
    return providers.size;
  }, [debtsForBus]);

  // Lista filtrada según tabs y búsqueda
  const filteredList = useMemo(() => {
    return debtsForBus.filter((item) => {
      const matchFilter =
        filterView === 'PENDING'
          ? (item.pendingBalance || 0) > 0
          : (item.pendingBalance || 0) > 0 || (item.abonos && item.abonos.length > 0);

      const q = searchTerm.toLowerCase().trim();
      const matchSearch =
        q === '' ||
        (item.provider && item.provider.toLowerCase().includes(q)) ||
        item.description.toLowerCase().includes(q) ||
        (item.comprobanteRef && item.comprobanteRef.toLowerCase().includes(q));

      return matchFilter && matchSearch;
    });
  }, [debtsForBus, filterView, searchTerm]);

  // Descarga del reporte PDF
  const handleDownloadPDF = async () => {
    try {
      setIsGeneratingPDF(true);
      const reportData: OwnerDebtsReportData = {
        busId,
        totalDeudaPendiente,
        totalCreditoOriginal,
        totalAbonado,
        activeCreditorsCount,
        debtsList: filteredList,
      };
      await generateOwnerDebtsPDF(reportData);
    } catch (err) {
      console.error('Error generando PDF de deudas:', err);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedExpenseId((prev) => (prev === id ? null : id));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white border border-gray-200 w-full max-w-xl rounded-3xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
        {/* CABECERA MODAL */}
        <div className="p-4 border-b border-gray-100 bg-[#912D26] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black px-2 py-0.5 rounded bg-white text-[#912D26]">
                  {busId}
                </span>
                <h2 className="text-sm font-extrabold tracking-tight">
                  Mis Deudas · Cuentas por Pagar a Talleres
                </h2>
              </div>
              <p className="text-[11px] text-red-100">
                Saldos pendientes, compras diferidas y control de abonos
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

        {/* CONTENIDO SCROLLABLE */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {/* TARJETAS RESUMEN DE CARTERA */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="bg-rose-50/80 border border-rose-200 rounded-2xl p-3 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider block">
                Saldo Pendiente
              </span>
              <div className="text-lg font-black text-rose-700 mt-1">
                ${totalDeudaPendiente.toFixed(2)}
              </div>
              <span className="text-[10px] text-rose-600 mt-0.5">
                {activeCreditorsCount} talleres activos
              </span>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-3 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                Total a Crédito
              </span>
              <div className="text-lg font-black text-gray-800 mt-1">
                ${totalCreditoOriginal.toFixed(2)}
              </div>
              <span className="text-[10px] text-gray-500 mt-0.5">
                Monto contratado
              </span>
            </div>

            <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-3 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                Total Abonado
              </span>
              <div className="text-lg font-black text-emerald-700 mt-1">
                ${totalAbonado.toFixed(2)}
              </div>
              <span className="text-[10px] text-emerald-600 mt-0.5">
                Amortización registrada
              </span>
            </div>
          </div>

          {/* FILTROS Y BÚSQUEDA */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex bg-gray-100 p-1 rounded-xl flex-1 text-xs">
                <button
                  onClick={() => setFilterView('PENDING')}
                  className={`flex-1 py-1.5 rounded-lg font-bold transition ${
                    filterView === 'PENDING'
                      ? 'bg-white text-[#912D26] shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Solo Con Saldo ({debtsForBus.filter((e) => e.pendingBalance > 0).length})
                </button>
                <button
                  onClick={() => setFilterView('ALL')}
                  className={`flex-1 py-1.5 rounded-lg font-bold transition ${
                    filterView === 'ALL'
                      ? 'bg-white text-[#912D26] shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Historial Completo
                </button>
              </div>

              {/* Botón Descargar PDF */}
              <button
                id="btn-download-debts-pdf"
                onClick={handleDownloadPDF}
                disabled={isGeneratingPDF}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition disabled:opacity-50 shrink-0 cursor-pointer"
              >
                <FileDown className="w-4 h-4" />
                <span>{isGeneratingPDF ? 'Generando...' : 'PDF'}</span>
              </button>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por taller, mecánico, repuesto o comprobante..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-xl pl-8 pr-3 py-2 text-xs text-[#3A3A3A] placeholder:text-gray-400 focus:outline-none focus:border-[#912D26]"
              />
            </div>
          </div>

          {/* LISTADO DE CUENTAS POR PAGAR */}
          <div className="space-y-2.5">
            {filteredList.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 border border-dashed border-gray-200 rounded-2xl p-6">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                <p className="text-sm font-bold text-gray-800">
                  ¡No hay deudas pendientes en esta vista!
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Todas las compras a crédito y órdenes de reparación registradas se encuentran solventadas o no coinciden con la búsqueda.
                </p>
              </div>
            ) : (
              filteredList.map((item) => {
                const isPending = item.pendingBalance > 0;
                const percentPaid =
                  item.totalAmount > 0
                    ? Math.min(100, Math.round((item.paidAmount / item.totalAmount) * 100))
                    : 100;
                const isExpanded = expandedExpenseId === item.id;
                const categoryMeta = OWNER_EXPENSE_CATEGORIES.find((c) => c.id === item.category);

                return (
                  <div
                    key={item.id}
                    className={`border rounded-2xl p-3.5 transition shadow-xs ${
                      isPending
                        ? 'bg-white border-amber-200 hover:border-amber-300'
                        : 'bg-emerald-50/30 border-emerald-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-sm font-black text-[#3A3A3A]">
                            {item.provider || 'Taller sin nombre'}
                          </span>
                          <span
                            className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border ${
                              categoryMeta?.badgeColor || 'bg-gray-100 text-gray-700 border-gray-200'
                            }`}
                          >
                            {categoryMeta?.icon} {categoryMeta?.name || item.category}
                          </span>
                          {(item.description?.includes('Servicio Rápido Lubricadora') || item.description?.includes('Parada Chofer')) && (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300">
                              🚌 Ruta Chofer
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-gray-600 font-medium mt-1 leading-snug">
                          {item.description}
                        </p>

                        <div className="flex items-center gap-3 text-[11px] text-gray-500 mt-1.5 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-gray-400" />
                            {item.expenseDate}
                          </span>
                          {item.comprobanteRef && (
                            <span className="flex items-center gap-1">
                              <Receipt className="w-3.5 h-3.5 text-gray-400" />
                              {item.comprobanteRef}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Saldo y Botón de Abono */}
                      <div className="text-right shrink-0">
                        <span className="text-[10px] font-bold text-gray-400 uppercase block">
                          Saldo Pendiente
                        </span>
                        <div
                          className={`text-base font-black ${
                            isPending ? 'text-rose-700' : 'text-emerald-700'
                          }`}
                        >
                          ${(Number(item.pendingBalance) || 0).toFixed(2)}
                        </div>

                        {isPending && (
                          <button
                            id={`btn-abono-modal-${item.id}`}
                            onClick={() => {
                              onClose();
                              onOpenAbonoModal(item);
                            }}
                            className="mt-1.5 px-3 py-1 bg-amber-500 hover:bg-amber-600 active:scale-95 text-neutral-950 font-black rounded-lg text-xs transition shadow-xs cursor-pointer"
                          >
                            + Abonar
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Barra de amortización */}
                    <div className="mt-3 pt-2.5 border-t border-gray-100 space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-gray-500 font-medium">
                          Pagado: ${(Number(item.paidAmount) || 0).toFixed(2)} de ${(Number(item.totalAmount) || 0).toFixed(2)}
                        </span>
                        <span className="font-bold text-gray-700">{percentPaid}%</span>
                      </div>
                      <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            isPending ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${percentPaid}%` }}
                        />
                      </div>
                    </div>

                    {/* Historial de abonos desplegable */}
                    {item.abonos && item.abonos.length > 0 && (
                      <div className="mt-2.5 pt-2 border-t border-dashed border-gray-200">
                        <button
                          onClick={() => toggleExpand(item.id)}
                          className="w-full flex items-center justify-between text-xs font-bold text-gray-600 hover:text-[#912D26] py-1 cursor-pointer"
                        >
                          <span className="flex items-center gap-1">
                            <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                            Ver historial de {item.abonos.length} abonos
                          </span>
                          {isExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </button>

                        {isExpanded && (
                          <div className="mt-2 space-y-1.5 bg-gray-50 p-2.5 rounded-xl border border-gray-200 text-xs">
                            {item.abonos.map((abono) => (
                              <div
                                key={abono.id}
                                className="flex items-center justify-between py-1 border-b border-gray-200/60 last:border-0"
                              >
                                <div>
                                  <span className="font-bold text-gray-800">{abono.date}</span>
                                  <span className="text-[11px] text-gray-500 ml-2">
                                    ({abono.paymentMethod})
                                  </span>
                                  {abono.comprobanteRef && (
                                    <span className="text-[10px] text-gray-400 block">
                                      Ref: {abono.comprobanteRef}
                                    </span>
                                  )}
                                </div>
                                <span className="font-extrabold text-emerald-700">
                                  +${(Number(abono.amount) || 0).toFixed(2)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* PIE DEL MODAL */}
        <div className="p-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <div className="text-xs text-gray-500">
            <span className="font-bold text-gray-700">{filteredList.length}</span> cuentas en lista
          </div>
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
