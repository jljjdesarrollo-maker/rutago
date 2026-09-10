'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  ArrowDownCircle,
  AlertTriangle,
  CheckCircle2,
  Receipt,
  Building2,
  Wrench,
  Search,
  Filter,
  DollarSign,
  X,
  CreditCard,
  Banknote,
  Upload,
  Check,
  Trash2,
  Clock,
  Sparkles,
  Info,
} from 'lucide-react';
import {
  OwnerExpense,
  OwnerExpenseCategory,
  OWNER_EXPENSE_CATEGORIES,
  PaymentMethod,
} from '../../types/expenses';
import {
  getOwnerExpenses,
  saveOwnerExpense,
  deleteOwnerExpense,
  registerAbonoToExpense,
  seedSampleExpenses,
} from '../../lib/owner-expenses-storage';

interface Props {
  initialBusId?: string;
  onBackToHome?: () => void;
}

export default function OwnerExpensesScreen({
  initialBusId = 'BUS-04',
  onBackToHome,
}: Props) {
  const [busId, setBusId] = useState<string>(initialBusId);
  const [allExpenses, setAllExpenses] = useState<OwnerExpense[]>([]);

  // Mes contable activo para visualización (Formato YYYY-MM)
  // Por defecto inicializamos en Septiembre 2026 (mes activo del sistema)
  const [selectedYearMonth, setSelectedYearMonth] = useState<string>('2026-09');

  // Modales
  const [isNewExpenseOpen, setIsNewExpenseOpen] = useState(false);
  const [abonoTargetExpense, setAbonoTargetExpense] = useState<OwnerExpense | null>(null);
  const [filterCategory, setFilterCategory] = useState<OwnerExpenseCategory | 'ALL'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Estados del Formulario de Nuevo Gasto
  const [formDate, setFormDate] = useState<string>('2026-09-10');
  const [formCategory, setFormCategory] = useState<OwnerExpenseCategory>('MECANICA_REPUESTOS');
  const [formDescription, setFormDescription] = useState('');
  const [formProvider, setFormProvider] = useState('');
  const [formTotalAmount, setFormTotalAmount] = useState<string>('');
  const [formPaidAmount, setFormPaidAmount] = useState<string>('');
  const [formPaymentMethod, setFormPaymentMethod] = useState<PaymentMethod>('TRANSFERENCIA');
  const [formBankName, setFormBankName] = useState('Banco de Loja');
  const [formComprobanteRef, setFormComprobanteRef] = useState('');
  const [formPhotoPreview, setFormPhotoPreview] = useState<string | null>(null);

  // Estados del Formulario de Abono
  const [abonoDate, setAbonoDate] = useState<string>('2026-09-10');
  const [abonoAmount, setAbonoAmount] = useState<string>('');
  const [abonoMethod, setAbonoMethod] = useState<'TRANSFERENCIA' | 'EFECTIVO'>('TRANSFERENCIA');
  const [abonoRef, setAbonoRef] = useState('');
  const [abonoNotes, setAbonoNotes] = useState('');

  // Toast / Mensaje feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Cargar datos
  const loadData = () => {
    const list = getOwnerExpenses(busId);
    if (list.length === 0) {
      // Si no hay datos, inicializamos con los gastos de prueba de Agosto y Septiembre
      seedSampleExpenses(busId);
      setAllExpenses(getOwnerExpenses(busId));
    } else {
      setAllExpenses(list);
    }
  };

  useEffect(() => {
    loadData();
  }, [busId]);

  // Lista de meses disponibles para navegación fácil
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    // Siempre incluir Agosto y Septiembre 2026
    months.add('2026-08');
    months.add('2026-09');
    allExpenses.forEach((e) => {
      if (e.expenseDate && e.expenseDate.length >= 7) {
        months.add(e.expenseDate.substring(0, 7));
      }
    });
    return Array.from(months).sort();
  }, [allExpenses]);

  // Gastos asignados al mes seleccionado por su FECHA REAL
  const expensesInMonth = useMemo(() => {
    return allExpenses.filter((e) => {
      const matchMonth = e.expenseDate.startsWith(selectedYearMonth);
      const matchCategory = filterCategory === 'ALL' || e.category === filterCategory;
      const matchSearch =
        searchTerm.trim() === '' ||
        e.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (e.provider && e.provider.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (e.comprobanteRef && e.comprobanteRef.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchMonth && matchCategory && matchSearch;
    });
  }, [allExpenses, selectedYearMonth, filterCategory, searchTerm]);

  // Totales financieros del mes
  const totalPagadoMes = useMemo(() => {
    return allExpenses
      .filter((e) => e.expenseDate.startsWith(selectedYearMonth))
      .reduce((sum, e) => sum + (e.paidAmount || 0), 0);
  }, [allExpenses, selectedYearMonth]);

  const totalCostoMes = useMemo(() => {
    return allExpenses
      .filter((e) => e.expenseDate.startsWith(selectedYearMonth))
      .reduce((sum, e) => sum + (e.totalAmount || 0), 0);
  }, [allExpenses, selectedYearMonth]);

  // Deudas pendientes globales de este bus (saldos pendientes con talleres)
  const pendingDebts = useMemo(() => {
    return allExpenses.filter((e) => e.pendingBalance > 0);
  }, [allExpenses]);

  const totalDeudasPendientes = useMemo(() => {
    return pendingDebts.reduce((sum, e) => sum + e.pendingBalance, 0);
  }, [pendingDebts]);

  // Navegación de mes
  const handlePrevMonth = () => {
    const currentIndex = availableMonths.indexOf(selectedYearMonth);
    if (currentIndex > 0) {
      setSelectedYearMonth(availableMonths[currentIndex - 1]);
    } else {
      // Si no está, calcular mes calendario anterior
      const [y, m] = selectedYearMonth.split('-').map(Number);
      const prevDate = new Date(y, m - 2, 1);
      const prevStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
      setSelectedYearMonth(prevStr);
    }
  };

  const handleNextMonth = () => {
    const currentIndex = availableMonths.indexOf(selectedYearMonth);
    if (currentIndex >= 0 && currentIndex < availableMonths.length - 1) {
      setSelectedYearMonth(availableMonths[currentIndex + 1]);
    } else {
      const [y, m] = selectedYearMonth.split('-').map(Number);
      const nextDate = new Date(y, m, 1);
      const nextStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`;
      setSelectedYearMonth(nextStr);
    }
  };

  const getMonthNameFormatted = (ym: string) => {
    const [year, month] = ym.split('-');
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    const monthIndex = parseInt(month, 10) - 1;
    return `${months[monthIndex]} ${year}`;
  };

  // Abrir nuevo gasto
  const openNewExpenseModal = () => {
    // Por defecto sugerir una fecha dentro del mes activo
    const today = new Date().toISOString().split('T')[0];
    const defaultDate = today.startsWith(selectedYearMonth) ? today : `${selectedYearMonth}-15`;
    setFormDate(defaultDate);
    setFormCategory('MECANICA_REPUESTOS');
    setFormDescription('');
    setFormProvider('');
    setFormTotalAmount('');
    setFormPaidAmount('');
    setFormPaymentMethod('TRANSFERENCIA');
    setFormBankName('Banco de Loja');
    setFormComprobanteRef('');
    setFormPhotoPreview(null);
    setIsNewExpenseOpen(true);
  };

  // Guardar nuevo gasto
  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const total = parseFloat(formTotalAmount);
    if (isNaN(total) || total <= 0) {
      showToast('⚠️ Por favor ingresa un monto total válido');
      return;
    }

    const paid = formPaidAmount === '' ? total : parseFloat(formPaidAmount);
    if (isNaN(paid) || paid < 0) {
      showToast('⚠️ Por favor ingresa un monto pagado válido');
      return;
    }

    const pending = Math.max(0, total - paid);

    const newExpense: OwnerExpense = {
      id: 'EXP-' + Date.now(),
      busId,
      expenseDate: formDate,
      createdAt: new Date().toISOString(),
      category: formCategory,
      description: formDescription.trim() || 'Gasto operativo sin descripción',
      provider: formProvider.trim() || undefined,
      totalAmount: total,
      paidAmount: paid,
      pendingBalance: pending,
      paymentMethod: formPaymentMethod,
      bankName: formPaymentMethod === 'TRANSFERENCIA' ? formBankName : undefined,
      comprobanteRef: formComprobanteRef.trim() || undefined,
      receiptPhotoUrl: formPhotoPreview || undefined,
      status: pending <= 0 ? 'PAGADO' : 'PENDIENTE',
    };

    saveOwnerExpense(newExpense);
    loadData();
    setIsNewExpenseOpen(false);

    // Si la fecha corresponde a otro mes, avisar al usuario
    const expenseMonth = formDate.substring(0, 7);
    if (expenseMonth !== selectedYearMonth) {
      setSelectedYearMonth(expenseMonth);
      showToast(`✅ Gasto guardado y asignado al mes de ${getMonthNameFormatted(expenseMonth)}`);
    } else {
      showToast('✅ Gasto registrado exitosamente');
    }
  };

  // Abrir modal de abono
  const handleOpenAbono = (expense: OwnerExpense) => {
    setAbonoTargetExpense(expense);
    setAbonoDate(new Date().toISOString().split('T')[0]);
    setAbonoAmount(expense.pendingBalance.toString());
    setAbonoMethod('TRANSFERENCIA');
    setAbonoRef('');
    setAbonoNotes('');
  };

  // Guardar abono
  const handleSaveAbono = (e: React.FormEvent) => {
    e.preventDefault();
    if (!abonoTargetExpense) return;

    const amount = parseFloat(abonoAmount);
    if (isNaN(amount) || amount <= 0) {
      showToast('⚠️ Ingresa un monto de abono válido');
      return;
    }

    if (amount > abonoTargetExpense.pendingBalance) {
      showToast(`⚠️ El abono no puede superar el saldo pendiente ($${abonoTargetExpense.pendingBalance.toFixed(2)})`);
      return;
    }

    registerAbonoToExpense(abonoTargetExpense.id, {
      date: abonoDate,
      amount,
      paymentMethod: abonoMethod,
      comprobanteRef: abonoRef.trim() || undefined,
      notes: abonoNotes.trim() || undefined,
    });

    loadData();
    setAbonoTargetExpense(null);
    showToast(`✅ Abono de $${amount.toFixed(2)} registrado correctamente`);
  };

  // Eliminar gasto
  const handleDelete = (id: string) => {
    if (window.confirm('¿Seguro que deseas eliminar este registro de gasto?')) {
      deleteOwnerExpense(id);
      loadData();
      showToast('🗑️ Registro eliminado');
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans pb-28 select-none">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-semibold animate-in fade-in slide-in-from-top-4 duration-200">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* HEADER SUPERIOR */}
      <header className="sticky top-0 z-30 bg-neutral-900/95 backdrop-blur border-b border-neutral-800 px-4 py-3">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {onBackToHome && (
              <button
                id="btn-back-home"
                onClick={onBackToHome}
                className="w-10 h-10 rounded-xl bg-neutral-800 text-neutral-300 hover:text-white flex items-center justify-center border border-neutral-700 active:scale-95 transition"
                title="Volver al Inicio"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {busId}
                </span>
                <h1 className="text-sm font-bold text-white tracking-tight">
                  Gastos del Socio
                </h1>
              </div>
              <p className="text-[11px] text-neutral-400">
                Socio Propietario • Coo. Vilcabambaturis
              </p>
            </div>
          </div>

          {/* Selector de Unidad (Demostración de los 19 Buses) */}
          <div className="flex items-center gap-1">
            <select
              id="bus-selector-header"
              value={busId}
              onChange={(e) => setBusId(e.target.value)}
              className="text-xs font-semibold bg-neutral-800 text-neutral-200 border border-neutral-700 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="BUS-04">Bus #04 (Mi Unidad)</option>
              <option value="BUS-07">Bus #07</option>
              <option value="BUS-12">Bus #12</option>
              <option value="BUS-19">Bus #19 (Flota)</option>
            </select>
          </div>
        </div>
      </header>

      {/* CUERPO PRINCIPAL */}
      <main className="max-w-md mx-auto px-4 pt-4 space-y-4">
        {/* NAVEGADOR DE MES CONTABLE (EJE CARDINAL DE FECHA) */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-3 shadow-md">
          <div className="flex items-center justify-between">
            <button
              id="btn-prev-month"
              onClick={handlePrevMonth}
              className="w-10 h-10 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 flex items-center justify-center active:scale-95 transition"
              title="Mes Anterior"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="text-center">
              <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                <Calendar className="w-3.5 h-3.5" />
                <span>Mes Contable</span>
              </div>
              <div className="text-base font-extrabold text-white">
                {getMonthNameFormatted(selectedYearMonth)}
              </div>
            </div>

            <button
              id="btn-next-month"
              onClick={handleNextMonth}
              className="w-10 h-10 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 flex items-center justify-center active:scale-95 transition"
              title="Mes Siguiente"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Accesos Rápidos de Meses Clave (Agosto y Septiembre) */}
          <div className="flex items-center justify-center gap-2 mt-2 pt-2 border-t border-neutral-800">
            <button
              id="quick-august"
              onClick={() => setSelectedYearMonth('2026-08')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                selectedYearMonth === '2026-08'
                  ? 'bg-emerald-500 text-neutral-950 font-bold'
                  : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
              }`}
            >
              Agosto 2026
            </button>
            <button
              id="quick-september"
              onClick={() => setSelectedYearMonth('2026-09')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                selectedYearMonth === '2026-09'
                  ? 'bg-emerald-500 text-neutral-950 font-bold'
                  : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
              }`}
            >
              Septiembre 2026 (Actual)
            </button>
          </div>
        </div>

        {/* TARJETA RESUMEN FINANCIERO DEL MES */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-3.5 flex flex-col justify-between">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-neutral-400">
              <Banknote className="w-3.5 h-3.5 text-emerald-400" />
              <span>Pagado en el Mes</span>
            </div>
            <div className="text-xl font-black text-emerald-400 mt-1">
              ${totalPagadoMes.toFixed(2)}
            </div>
            <span className="text-[10px] text-neutral-500 mt-0.5">
              {expensesInMonth.length} salidas registradas
            </span>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-3.5 flex flex-col justify-between">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-neutral-400">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>Deudas en Talleres</span>
            </div>
            <div className="text-xl font-black text-amber-400 mt-1">
              ${totalDeudasPendientes.toFixed(2)}
            </div>
            <span className="text-[10px] text-neutral-500 mt-0.5">
              {pendingDebts.length} compromisos activos
            </span>
          </div>
        </div>

        {/* ALERTA / BANDEJA DE COMPROMISOS PENDIENTES (FIADO / CRÉDITOS) */}
        {pendingDebts.length > 0 && (
          <div className="bg-amber-950/20 border border-amber-500/30 rounded-2xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                <h2 className="text-xs font-bold text-amber-300 uppercase tracking-wide">
                  Saldos Pendientes con Talleres ({pendingDebts.length})
                </h2>
              </div>
              <span className="text-xs font-extrabold text-amber-400">
                Total: ${totalDeudasPendientes.toFixed(2)}
              </span>
            </div>

            <div className="space-y-2">
              {pendingDebts.map((debt) => (
                <div
                  key={debt.id}
                  className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-3 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">
                        {OWNER_EXPENSE_CATEGORIES.find((c) => c.id === debt.category)?.icon || '📦'}
                      </span>
                      <p className="text-xs font-bold text-white truncate">
                        {debt.description}
                      </p>
                    </div>
                    <p className="text-[11px] text-neutral-400 truncate mt-0.5">
                      {debt.provider || 'Proveedor'} • {debt.expenseDate}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-[11px]">
                      <span className="text-neutral-500">Costo: ${debt.totalAmount.toFixed(2)}</span>
                      <span className="text-amber-400 font-semibold">
                        Debe: ${debt.pendingBalance.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <button
                    id={`btn-abono-${debt.id}`}
                    onClick={() => handleOpenAbono(debt)}
                    className="shrink-0 px-3 py-2 bg-amber-500 text-neutral-950 rounded-xl text-xs font-bold hover:bg-amber-400 active:scale-95 transition shadow-sm"
                  >
                    Abonar
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* BARRA DE BÚSQUEDA Y FILTRO DE CATEGORÍAS */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
              <input
                id="search-expense-input"
                type="text"
                placeholder="Buscar por repuesto, taller o referencia..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Chips horizontales de categorías con scroll ergonómico */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            <button
              onClick={() => setFilterCategory('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium shrink-0 transition ${
                filterCategory === 'ALL'
                  ? 'bg-neutral-200 text-neutral-950 font-bold'
                  : 'bg-neutral-900 text-neutral-400 border border-neutral-800'
              }`}
            >
              Todos ({expensesInMonth.length})
            </button>
            {OWNER_EXPENSE_CATEGORIES.map((cat) => {
              const count = allExpenses.filter(
                (e) => e.expenseDate.startsWith(selectedYearMonth) && e.category === cat.id
              ).length;
              if (count === 0 && filterCategory !== cat.id) return null;
              return (
                <button
                  key={cat.id}
                  onClick={() => setFilterCategory(cat.id)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium shrink-0 flex items-center gap-1 transition ${
                    filterCategory === cat.id
                      ? 'bg-emerald-500 text-neutral-950 font-bold'
                      : 'bg-neutral-900 text-neutral-400 border border-neutral-800'
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.name.split('/')[0]}</span>
                  <span className="text-[10px] opacity-75">({count})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* LISTA DE GASTOS ASIGNADOS AL MES CONTABLE */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
              Historial de Pagos • {getMonthNameFormatted(selectedYearMonth)}
            </h3>
            <span className="text-[11px] text-neutral-500">
              {expensesInMonth.length} items
            </span>
          </div>

          {expensesInMonth.length === 0 ? (
            <div className="bg-neutral-900/50 border border-neutral-800/80 rounded-2xl p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-neutral-800 text-neutral-400 flex items-center justify-center mx-auto">
                <Receipt className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-neutral-200">
                  Sin gastos registrados en este mes
                </p>
                <p className="text-xs text-neutral-500 mt-1 max-w-xs mx-auto">
                  Si hiciste pagos o compras en {getMonthNameFormatted(selectedYearMonth)}, puedes registrarlos con el botón inferior.
                </p>
              </div>
              <button
                onClick={openNewExpenseModal}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-emerald-400 border border-neutral-700"
              >
                <Plus className="w-4 h-4" />
                <span>Registrar Gasto de {getMonthNameFormatted(selectedYearMonth).split(' ')[0]}</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {expensesInMonth.map((expense) => {
                const categoryMeta = OWNER_EXPENSE_CATEGORIES.find(
                  (c) => c.id === expense.category
                );
                return (
                  <div
                    key={expense.id}
                    className="bg-neutral-900 border border-neutral-800/90 rounded-2xl p-3.5 space-y-2 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-neutral-800 border border-neutral-700/60 flex items-center justify-center text-base shrink-0">
                          {categoryMeta?.icon || '📦'}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-white leading-snug truncate">
                            {expense.description}
                          </h4>
                          <p className="text-[11px] text-neutral-400 truncate mt-0.5">
                            {expense.provider || 'Proveedor / Taller'}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-sm font-black text-white">
                          ${expense.paidAmount.toFixed(2)}
                        </div>
                        {expense.pendingBalance > 0 ? (
                          <span className="text-[10px] font-semibold text-amber-400 block mt-0.5">
                            Debe: ${expense.pendingBalance.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-emerald-400 block mt-0.5">
                            Pagado total
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Metadata: Fecha Real de Pago + Método y Referencia */}
                    <div className="flex items-center justify-between pt-2 border-t border-neutral-800 text-[11px] text-neutral-400">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3 h-3 text-emerald-400" />
                        <span className="font-semibold text-neutral-300">
                          {expense.expenseDate}
                        </span>
                        {expense.paymentMethod === 'TRANSFERENCIA' ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-300 text-[10px]">
                            <CreditCard className="w-2.5 h-2.5" />
                            <span>{expense.bankName || 'Transf.'}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 text-[10px]">
                            <Banknote className="w-2.5 h-2.5" />
                            <span>Efectivo</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {expense.comprobanteRef && (
                          <span className="text-neutral-500 text-[10px] truncate max-w-[130px]">
                            {expense.comprobanteRef}
                          </span>
                        )}
                        <button
                          onClick={() => handleDelete(expense.id)}
                          className="text-neutral-600 hover:text-rose-400 p-1 transition"
                          title="Eliminar registro"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* BOTÓN FLOTANTE FIJO EN LA THUMB ZONE (ZONA DEL PULGAR) */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-neutral-950 via-neutral-950/90 to-transparent z-20">
        <div className="max-w-md mx-auto">
          <button
            id="btn-register-expense-thumb"
            onClick={openNewExpenseModal}
            className="w-full min-h-[52px] rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-neutral-950 font-extrabold text-sm flex items-center justify-center gap-2 shadow-xl shadow-emerald-950/50 transition cursor-pointer"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
            <span>Registrar Gasto del Bus</span>
          </button>
        </div>
      </div>

      {/* MODAL / BOTTOM SHEET: REGISTRAR NUEVO GASTO */}
      {isNewExpenseOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-neutral-900 border border-neutral-800 w-full max-w-md rounded-t-3xl sm:rounded-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-250">
            {/* Cabecera del Drawer */}
            <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-emerald-400" />
                  <span>Registrar Gasto del Bus</span>
                </h2>
                <p className="text-[11px] text-neutral-400">
                  Unidad {busId} • Asignación a mes contable
                </p>
              </div>
              <button
                onClick={() => setIsNewExpenseOpen(false)}
                className="w-8 h-8 rounded-full bg-neutral-800 text-neutral-400 hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Formulario Scrolleable */}
            <form onSubmit={handleSaveExpense} className="p-4 space-y-4 overflow-y-auto">
              {/* 1. FECHA REAL DE PAGO O COMPRA (EJE CARDINAL) */}
              <div className="bg-neutral-950/60 border border-neutral-800 rounded-2xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Fecha Real de Pago / Compra</span>
                  </label>
                  <span className="text-[10px] text-neutral-400 font-medium">
                    (Determina el mes contable)
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    id="input-expense-date"
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="flex-1 bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2.5 text-xs text-white font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  {/* Botones rápidos de fecha */}
                  <button
                    type="button"
                    onClick={() => setFormDate(new Date().toISOString().split('T')[0])}
                    className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-xl text-xs font-medium text-neutral-200"
                  >
                    Hoy
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const yesterday = new Date();
                      yesterday.setDate(yesterday.getDate() - 1);
                      setFormDate(yesterday.toISOString().split('T')[0]);
                    }}
                    className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-xl text-xs font-medium text-neutral-200"
                  >
                    Ayer
                  </button>
                </div>
              </div>

              {/* 2. CATEGORÍA OFICIAL (9 CHIPS TÁCTILES) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-300">
                  Categoría del Gasto:
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {OWNER_EXPENSE_CATEGORIES.map((cat) => {
                    const isSelected = formCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setFormCategory(cat.id)}
                        className={`p-2 rounded-xl text-left border flex flex-col justify-between transition min-h-[58px] ${
                          isSelected
                            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                            : 'bg-neutral-950/40 border-neutral-800 text-neutral-400 hover:bg-neutral-800'
                        }`}
                      >
                        <span className="text-base">{cat.icon}</span>
                        <span className="text-[11px] font-semibold leading-tight line-clamp-1">
                          {cat.name.split('/')[0]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. DETALLE Y PROVEEDOR (TALLER / TIENDA) */}
              <div className="space-y-2">
                <div>
                  <label className="text-xs font-semibold text-neutral-300 block mb-1">
                    Detalle del Repuesto o Trabajo:
                  </label>
                  <input
                    id="input-expense-desc"
                    type="text"
                    required
                    placeholder="Ej: Cambio de zapatas y rectificación"
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2.5 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-neutral-300 block mb-1">
                    Taller / Proveedor / Tienda (Opcional):
                  </label>
                  <input
                    id="input-expense-provider"
                    type="text"
                    placeholder="Ej: Taller Don Carlos / Reencauchadora Loja"
                    value={formProvider}
                    onChange={(e) => setFormProvider(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2.5 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* 4. MONTOS Y DETECCIÓN DE SALDO FIADO */}
              <div className="bg-neutral-950/80 border border-neutral-800 rounded-2xl p-3.5 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-neutral-300 block mb-1">
                      Costo Total:
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 font-bold text-xs">
                        $
                      </span>
                      <input
                        id="input-total-amount"
                        type="number"
                        step="0.01"
                        required
                        placeholder="0.00"
                        value={formTotalAmount}
                        onChange={(e) => {
                          setFormTotalAmount(e.target.value);
                          // Auto-completar pagado igual al total si aún no se ha modificado
                          if (formPaidAmount === '' || formPaidAmount === formTotalAmount) {
                            setFormPaidAmount(e.target.value);
                          }
                        }}
                        className="w-full bg-neutral-900 border border-neutral-700 rounded-xl pl-7 pr-3 py-2.5 text-sm font-black text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-neutral-300 block mb-1">
                      Pagado en Fecha:
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 font-bold text-xs">
                        $
                      </span>
                      <input
                        id="input-paid-amount"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={formPaidAmount}
                        onChange={(e) => setFormPaidAmount(e.target.value)}
                        className="w-full bg-neutral-900 border border-neutral-700 rounded-xl pl-7 pr-3 py-2.5 text-sm font-black text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Banner reactivo de saldo fiado */}
                {(() => {
                  const total = parseFloat(formTotalAmount) || 0;
                  const paid = formPaidAmount === '' ? total : parseFloat(formPaidAmount) || 0;
                  const diff = total - paid;
                  if (diff > 0.01) {
                    return (
                      <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-between text-xs text-amber-300">
                        <span className="flex items-center gap-1.5 font-medium">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Queda debiendo al taller:</span>
                        </span>
                        <strong className="font-extrabold text-sm text-amber-400">
                          ${diff.toFixed(2)}
                        </strong>
                      </div>
                    );
                  } else if (total > 0 && paid >= total) {
                    return (
                      <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center text-xs text-emerald-400 font-medium">
                        ✓ Pagado de contado al 100% (Sin saldo pendiente)
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>

              {/* 5. FORMA DE PAGO Y NÚMERO DE TRANSFERENCIA / NOTA */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-neutral-300 block">
                  Forma de Pago del Desembolso:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormPaymentMethod('TRANSFERENCIA')}
                    className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 text-xs font-semibold transition ${
                      formPaymentMethod === 'TRANSFERENCIA'
                        ? 'bg-blue-500/20 border-blue-500 text-blue-300'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                    }`}
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Transferencia</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormPaymentMethod('EFECTIVO')}
                    className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 text-xs font-semibold transition ${
                      formPaymentMethod === 'EFECTIVO'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                    }`}
                  >
                    <Banknote className="w-4 h-4" />
                    <span>Efectivo</span>
                  </button>
                </div>

                {formPaymentMethod === 'TRANSFERENCIA' && (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <select
                      value={formBankName}
                      onChange={(e) => setFormBankName(e.target.value)}
                      className="bg-neutral-950 border border-neutral-700 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none"
                    >
                      <option value="Banco de Loja">Banco de Loja</option>
                      <option value="Banco Pichincha">Banco Pichincha</option>
                      <option value="Banco Guayaquil">Banco Guayaquil</option>
                      <option value="Cooperativa">Coo. Ahorro y Crédito</option>
                      <option value="Otro">Otro Banco</option>
                    </select>

                    <input
                      id="input-ref-transfer"
                      type="text"
                      placeholder="Nº Referencia (ej. 481920)"
                      value={formComprobanteRef}
                      onChange={(e) => setFormComprobanteRef(e.target.value)}
                      className="bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                )}

                {formPaymentMethod === 'EFECTIVO' && (
                  <input
                    type="text"
                    placeholder="Nº Recibo de taco / Nota (Opcional)"
                    value={formComprobanteRef}
                    onChange={(e) => setFormComprobanteRef(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                )}
              </div>

              {/* Botón de Confirmación */}
              <div className="pt-2">
                <button
                  id="btn-confirm-save-expense"
                  type="submit"
                  className="w-full min-h-[48px] rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-neutral-950 font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg transition"
                >
                  <Check className="w-5 h-5 stroke-[2.5]" />
                  <span>Guardar Gasto en {getMonthNameFormatted(formDate.substring(0, 7)).split(' ')[0]}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL / BOTTOM SHEET: REGISTRAR ABONO A SALDO PENDIENTE */}
      {abonoTargetExpense && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-neutral-900 border border-neutral-800 w-full max-w-md rounded-t-3xl sm:rounded-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-250">
            <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Banknote className="w-4 h-4 text-amber-400" />
                  <span>Abonar a Cuenta de Taller</span>
                </h2>
                <p className="text-[11px] text-neutral-400 truncate max-w-xs">
                  {abonoTargetExpense.description}
                </p>
              </div>
              <button
                onClick={() => setAbonoTargetExpense(null)}
                className="w-8 h-8 rounded-full bg-neutral-800 text-neutral-400 hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAbono} className="p-4 space-y-4">
              <div className="p-3 bg-amber-500/10 border border-amber-500/25 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-neutral-400 block">Saldo Actual Pendiente</span>
                  <strong className="text-base font-black text-amber-400">
                    ${abonoTargetExpense.pendingBalance.toFixed(2)}
                  </strong>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-neutral-400 block">Proveedor</span>
                  <span className="text-xs font-semibold text-neutral-200">
                    {abonoTargetExpense.provider || 'Taller'}
                  </span>
                </div>
              </div>

              {/* Fecha del Abono */}
              <div>
                <label className="text-xs font-bold text-neutral-300 block mb-1">
                  Fecha del Abono:
                </label>
                <input
                  type="date"
                  required
                  value={abonoDate}
                  onChange={(e) => setAbonoDate(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2.5 text-xs text-white font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Monto a abonar */}
              <div>
                <label className="text-xs font-bold text-neutral-300 block mb-1">
                  Monto a Pagar Hoy ($):
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  max={abonoTargetExpense.pendingBalance}
                  value={abonoAmount}
                  onChange={(e) => setAbonoAmount(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2.5 text-sm font-black text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Método */}
              <div>
                <label className="text-xs font-bold text-neutral-300 block mb-1">
                  Forma de Pago:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAbonoMethod('TRANSFERENCIA')}
                    className={`p-2 rounded-xl border text-xs font-semibold ${
                      abonoMethod === 'TRANSFERENCIA'
                        ? 'bg-blue-500/20 border-blue-500 text-blue-300'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                    }`}
                  >
                    Transferencia
                  </button>
                  <button
                    type="button"
                    onClick={() => setAbonoMethod('EFECTIVO')}
                    className={`p-2 rounded-xl border text-xs font-semibold ${
                      abonoMethod === 'EFECTIVO'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                    }`}
                  >
                    Efectivo
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-300 block mb-1">
                  Referencia / Nota (Opcional):
                </label>
                <input
                  type="text"
                  placeholder="Ej: Transf. #948201 / Abono final"
                  value={abonoRef}
                  onChange={(e) => setAbonoRef(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white placeholder:text-neutral-500 focus:outline-none"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full min-h-[48px] rounded-2xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg transition"
                >
                  <Check className="w-5 h-5 stroke-[2.5]" />
                  <span>Confirmar Abono de ${parseFloat(abonoAmount || '0').toFixed(2)}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
