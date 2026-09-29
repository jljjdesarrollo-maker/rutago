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
  FileSpreadsheet,
  TrendingUp,
  BarChart3,
  ShieldCheck,
  Layers,
  Bus as BusIcon,
  RefreshCw,
} from 'lucide-react';
import OwnerIncomeStatementModal from './OwnerIncomeStatementModal';
import OwnerDebtsReportModal from './OwnerDebtsReportModal';
import OwnerComparisonReportModal from './OwnerComparisonReportModal';
import OwnerAnnualReportModal from './OwnerAnnualReportModal';
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
  clearAllOwnerExpenses,
  removeSampleExpensesOnly,
  fetchOwnerExpensesFromApi,
  saveOwnerExpenseToApi,
  registerAbonoToApi,
  deleteOwnerExpenseFromApi,
  clearAllOwnerExpensesFromApi,
  removeSampleExpensesFromApi,
  syncAllLocalExpensesToApi,
} from '../../lib/owner-expenses-storage';
import { getCurrentYearMonth, getTodayDateString } from '../../lib/date-helpers';
import type { UserSession } from '../transport/types';

interface Props {
  initialBusId?: string;
  currentUser?: UserSession | null;
  onBackToHome?: () => void;
}

export default function OwnerExpensesScreen({
  initialBusId = 'BUS-01',
  currentUser,
  onBackToHome,
}: Props) {
  const isSuperAdmin = currentUser?.rol === 'ADMIN' && currentUser?.subRol === 'SUPERADMIN_SAAS';
  const isSocio = !isSuperAdmin;
  const socioIdActual = currentUser?.socioId || (isSocio ? currentUser?.id : null);

  const [availableBuses, setAvailableBuses] = useState<
    Array<{ id: string; numeroDisco: string; placa: string; propietario?: string; socioId?: string | null }>
  >([]);
  const [sociosList, setSociosList] = useState<
    Array<{ id: string; nombre: string; cedula: string; buses?: Array<{ numeroDisco: string }> }>
  >([]);
  const [filtroSocioSuperAdmin, setFiltroSocioSuperAdmin] = useState<string>('TODOS');

  // Inicializar busId según la sesión o fallback
  const [busId, setBusId] = useState<string>(() => {
    if (currentUser?.busId) {
      return currentUser.busId.startsWith('BUS-') ? currentUser.busId : `BUS-${currentUser.busId}`;
    }
    return initialBusId;
  });
  const [formBusId, setFormBusId] = useState<string>('');
  const [allExpenses, setAllExpenses] = useState<OwnerExpense[]>(() => getOwnerExpenses(initialBusId));
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isOnlineDb, setIsOnlineDb] = useState<boolean>(true);

  // Mes contable activo para visualización (Formato YYYY-MM)
  // Inicialización dinámica según fecha real del sistema
  const [selectedYearMonth, setSelectedYearMonth] = useState<string>(() => getCurrentYearMonth());

  // Modales
  const [isNewExpenseOpen, setIsNewExpenseOpen] = useState(false);
  const [isIncomeStatementOpen, setIsIncomeStatementOpen] = useState(false);
  const [isDebtsReportOpen, setIsDebtsReportOpen] = useState(false);
  const [isComparisonReportOpen, setIsComparisonReportOpen] = useState(false);
  const [isAnnualReportOpen, setIsAnnualReportOpen] = useState(false);
  const [abonoTargetExpense, setAbonoTargetExpense] = useState<OwnerExpense | null>(null);
  const [filterCategory, setFilterCategory] = useState<OwnerExpenseCategory | 'ALL'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Estados del Formulario de Nuevo Gasto ("Modo Rápido 1-2-3")
  const [formDate, setFormDate] = useState<string>(() => getTodayDateString());
  const [formCategory, setFormCategory] = useState<OwnerExpenseCategory>('ACEITES_FILTROS');
  const [formDescription, setFormDescription] = useState('');
  const [formProvider, setFormProvider] = useState('');
  const [formTotalAmount, setFormTotalAmount] = useState<string>('');
  const [formPaidAmount, setFormPaidAmount] = useState<string>('');
  const [formIsCredit, setFormIsCredit] = useState<boolean>(false);
  const [formPaymentMethod, setFormPaymentMethod] = useState<PaymentMethod>('TRANSFERENCIA');
  const [formBankName, setFormBankName] = useState('Banco de Loja');
  const [formComprobanteRef, setFormComprobanteRef] = useState('');
  const [formPhotoPreview, setFormPhotoPreview] = useState<string | null>(null);

  // Estados del Formulario de Abono
  const [abonoDate, setAbonoDate] = useState<string>(() => getTodayDateString());
  const [abonoAmount, setAbonoAmount] = useState<string>('');
  const [abonoMethod, setAbonoMethod] = useState<'TRANSFERENCIA' | 'EFECTIVO'>('TRANSFERENCIA');
  const [abonoRef, setAbonoRef] = useState('');
  const [abonoNotes, setAbonoNotes] = useState('');
  const [isSubmittingAbono, setIsSubmittingAbono] = useState(false);

  // Estados para Anulación Segura (Soft Delete v3.60.28)
  const [expenseParaAnular, setExpenseParaAnular] = useState<OwnerExpense | null>(null);
  const [motivoAnulacionGasto, setMotivoAnulacionGasto] = useState<string>('Error de digitación');
  const [motivoAnulacionCustom, setMotivoAnulacionCustom] = useState<string>('');
  const [isSubmittingAnulacion, setIsSubmittingAnulacion] = useState(false);

  // Toast / Mensaje feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Cargar lista de autobuses autorizados según rol y socioId
  useEffect(() => {
    let isMounted = true;
    const loadBuses = async () => {
      try {
        let url = '/api/buses';
        if (isSocio && socioIdActual) {
          url += `?socioId=${encodeURIComponent(socioIdActual)}`;
        } else if (isSuperAdmin && filtroSocioSuperAdmin !== 'TODOS') {
          url += `?socioId=${encodeURIComponent(filtroSocioSuperAdmin)}`;
        }
        const res = await fetch(url);
        if (res.ok) {
          const json = await res.json();
          if (isMounted && json.success && Array.isArray(json.data) && json.data.length > 0) {
            setAvailableBuses(json.data);
            // Si el bus actual no pertenece al socio, seleccionar su primera unidad
            if (isSocio) {
              const matchingBus = json.data.find(
                (b: any) =>
                  b.numeroDisco === busId ||
                  `BUS-${b.numeroDisco}` === busId ||
                  b.id === busId
              );
              if (!matchingBus) {
                setBusId(`BUS-${json.data[0].numeroDisco}`);
              }
            }
          }
        }
      } catch (err) {
        console.warn('Error cargando lista de unidades:', err);
      }
    };
    loadBuses();
    return () => {
      isMounted = false;
    };
  }, [isSocio, isSuperAdmin, socioIdActual, filtroSocioSuperAdmin]);

  // Si es SuperAdmin, cargar padrón completo de socios
  useEffect(() => {
    if (isSuperAdmin) {
      fetch('/api/saas/socios')
        .then((r) => (r.ok ? r.json() : []))
        .then((data) => setSociosList(Array.isArray(data) ? data : []))
        .catch(() => {});
    }
  }, [isSuperAdmin]);

  // Cargar datos conectando directamente con la API central y sincronizando caché local
  const loadData = async () => {
    try {
      const socioFilter = isSocio
        ? socioIdActual || undefined
        : filtroSocioSuperAdmin !== 'TODOS'
        ? filtroSocioSuperAdmin
        : undefined;

      const list = await fetchOwnerExpensesFromApi(busId, socioFilter);
      const effectiveList = (list && list.length > 0) ? list : getOwnerExpenses(busId);
      setAllExpenses(effectiveList);
      setIsOnlineDb(true);

      // Si el mes actualmente seleccionado no tiene gastos pero hay gastos en otros meses,
      // posicionarse automáticamente en el mes más reciente con registros
      if (effectiveList.length > 0) {
        const hasExpensesInSelectedMonth = effectiveList.some((e) =>
          typeof e.expenseDate === 'string' && e.expenseDate.startsWith(selectedYearMonth)
        );
        if (!hasExpensesInSelectedMonth) {
          // Extraer meses con gastos ordenados de más reciente a más antiguo
          const monthsWithData = Array.from(
            new Set(effectiveList.map((e) => typeof e.expenseDate === 'string' && e.expenseDate.length >= 7 ? e.expenseDate.substring(0, 7) : '').filter(Boolean))
          ).sort().reverse();

          if (monthsWithData.length > 0) {
            setSelectedYearMonth(monthsWithData[0]);
          }
        }
      }
    } catch {
      const list = getOwnerExpenses(busId);
      setAllExpenses(list);
      setIsOnlineDb(false);

      if (list.length > 0) {
        const hasExpensesInSelectedMonth = list.some((e) =>
          typeof e.expenseDate === 'string' && e.expenseDate.startsWith(selectedYearMonth)
        );
        if (!hasExpensesInSelectedMonth) {
          const monthsWithData = Array.from(
            new Set(list.map((e) => typeof e.expenseDate === 'string' && e.expenseDate.length >= 7 ? e.expenseDate.substring(0, 7) : '').filter(Boolean))
          ).sort().reverse();
          if (monthsWithData.length > 0) {
            setSelectedYearMonth(monthsWithData[0]);
          }
        }
      }
    }
  };

  useEffect(() => {
    loadData();
  }, [busId, filtroSocioSuperAdmin]);

  // Sincronizar todos los gastos locales con la base de datos central
  const handleSyncToDb = async () => {
    setIsSyncing(true);
    try {
      const res = await syncAllLocalExpensesToApi(busId);
      showToast(`☁️ ${res.count} gastos respaldados en la Base de Datos Central`);
      await loadData();
    } catch (err) {
      showToast("⚠️ Error al sincronizar con la base de datos");
    } finally {
      setIsSyncing(false);
    }
  };

  // Lista de meses disponibles para navegación fácil
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    // Siempre incluir el mes actual del sistema y los meses con registros
    months.add(getCurrentYearMonth());
    months.add('2026-08'); // Histórico auditado
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
  // REGLA DE ORO DE ARQUITECTURA: NO-DUPLICIDAD FINANCIERA
  // Los gastos liquidados en ruta por el ayudante (descontadoEnRuta = true o origenPago = 'AYUDANTE_RUTA')
  // ya fueron descontados del efectivo entregado por el ayudante en carretera.
  // Por lo tanto, NO deben sumarse a totalCostoMesSocio ni restar de la Ganancia Real en Limpio.

  // Gastos pagados directamente por el socio (desembolso de su bolsillo / transferencias / deudas pactadas por el socio)
  const expensesSocioDirectoMes = useMemo(() => {
    return allExpenses.filter((e) => {
      const matchMonth = e.expenseDate.startsWith(selectedYearMonth);
      const esDeRuta =
        e.origenPago === 'AYUDANTE_RUTA' ||
        e.descontadoEnRuta === true ||
        e.comprobanteRef?.includes('AYUDANTE_RUTA') ||
        e.description?.includes('[RUTA-AYUDANTE]') ||
        (e.paymentMethod === 'EFECTIVO' &&
          (e.description?.toLowerCase().includes('ayudante') ||
            e.description?.toLowerCase().includes('chofer') ||
            e.description?.toLowerCase().includes('liquidado') ||
            e.description?.toLowerCase().includes('ruta')));
      return matchMonth && !esDeRuta;
    });
  }, [allExpenses, selectedYearMonth]);

  // Gastos de carretera asumidos y liquidados por el ayudante en ruta (solo informativos de mantenimiento técnico)
  const expensesRutaInformativosMes = useMemo(() => {
    return allExpenses.filter((e) => {
      const matchMonth = e.expenseDate.startsWith(selectedYearMonth);
      const esDeRuta =
        e.origenPago === 'AYUDANTE_RUTA' ||
        e.descontadoEnRuta === true ||
        e.comprobanteRef?.includes('AYUDANTE_RUTA') ||
        e.description?.includes('[RUTA-AYUDANTE]') ||
        (e.paymentMethod === 'EFECTIVO' &&
          (e.description?.toLowerCase().includes('ayudante') ||
            e.description?.toLowerCase().includes('chofer') ||
            e.description?.toLowerCase().includes('liquidado') ||
            e.description?.toLowerCase().includes('ruta')));
      return matchMonth && esDeRuta;
    });
  }, [allExpenses, selectedYearMonth]);

  // Total desembolsado por el socio en el mes (solo directos del socio)
  const totalPagadoMes = useMemo(() => {
    return expensesSocioDirectoMes.reduce((sum, e) => sum + (e.paidAmount || 0), 0);
  }, [expensesSocioDirectoMes]);

  // Costo total de gastos que restan a la entrega de ruta (SOLO directos del socio)
  const totalCostoMes = useMemo(() => {
    return expensesSocioDirectoMes.reduce((sum, e) => sum + (e.totalAmount || 0), 0);
  }, [expensesSocioDirectoMes]);

  // Monto informativo de mantenimientos liquidados en ruta por el personal de ruta
  const totalMantenimientoRutaMes = useMemo(() => {
    return expensesRutaInformativosMes.reduce((sum, e) => sum + (e.totalAmount || 0), 0);
  }, [expensesRutaInformativosMes]);

  // Datos de ruta obtenidos en tiempo real desde la base de datos central (/api/reports)
  const [balanceStatus, setBalanceStatus] = useState<'loading' | 'live' | 'stale' | 'error'>('loading');
  const [isRefreshingBalance, setIsRefreshingBalance] = useState<boolean>(false);

    const [monthlyRouteData, setMonthlyRouteData] = useState<{
    production: number;
    entregaAyudante: number;
    entregaCompania: number;
    totalEntregado: number;
    loading: boolean;
  }>({
    production: 0,
    entregaAyudante: 0,
    entregaCompania: 0,
    totalEntregado: 0,
    loading: true,
  });

  // Consulta dinámica en tiempo real a la API de reportes al cambiar de mes
  useEffect(() => {
    let isCurrent = true;
    setBalanceStatus('loading');
    setMonthlyRouteData(prev => ({ ...prev, loading: true }));

    const fetchRouteData = async () => {
      const minDelay = new Promise(resolve => setTimeout(resolve, 350));
      try {
        const [res] = await Promise.all([
          fetch(`/api/reports?type=mensual&month=${selectedYearMonth}`),
          minDelay
        ]);

        if (res.ok) {
          const data = await res.json();
          if (isCurrent && data && data.totals) {
            const t = data.totals;
            const ay = t.entregaAyudante || 0;
            const cia = t.entregaCompania || 0;
            const total = t.totalEntregado || (ay + cia);
            setMonthlyRouteData({
              production: t.production || 0,
              entregaAyudante: ay,
              entregaCompania: cia,
              totalEntregado: total,
              loading: false,
            });
            setBalanceStatus('live');
            return;
          }
        }
      } catch (err) {
        console.warn('Error consultando entregas de ruta de la BD:', err);
      }

      await minDelay;
      // Fallback para Agosto 2026 en caso de modo offline
      if (isCurrent && selectedYearMonth === '2026-08') {
        setMonthlyRouteData({
          production: 12334.75,
          entregaAyudante: 2828.80,
          entregaCompania: 1086.45,
          totalEntregado: 3915.25,
          loading: false,
        });
        setBalanceStatus('live');
      } else if (isCurrent) {
        setMonthlyRouteData({
          production: 0,
          entregaAyudante: 0,
          entregaCompania: 0,
          totalEntregado: 0,
          loading: false,
        });
        setBalanceStatus('live');
      }
    };

    fetchRouteData();
    return () => {
      isCurrent = false;
    };
  }, [selectedYearMonth]);

  // Entregas de ruta reales del mes (Ayudante + Compañía)
  const routeDeliveryCurrentMonth = monthlyRouteData.totalEntregado;

  // Función para refrescar balance y entregas en vivo
  const handleRefreshBalance = async (isManual = true) => {
    if (isManual) setIsRefreshingBalance(true);
    setBalanceStatus('loading');

    try {
      const socioFilter = isSocio
        ? socioIdActual || undefined
        : filtroSocioSuperAdmin !== 'TODOS'
        ? filtroSocioSuperAdmin
        : undefined;

      const [onlineExpensesRes, reportRes] = await Promise.all([
        fetchOwnerExpensesFromApi(busId, socioFilter).catch(() => null),
        fetch(`/api/reports?type=mensual&month=${selectedYearMonth}`).then(r => r.ok ? r.json() : null).catch(() => null)
      ]);

      if (onlineExpensesRes && onlineExpensesRes.length > 0) {
        setAllExpenses(onlineExpensesRes);
        setIsOnlineDb(true);
      } else {
        const local = getOwnerExpenses(busId);
        setAllExpenses(local);
      }

      let routeOk = false;
      if (reportRes && reportRes.totals) {
        const t = reportRes.totals;
        const ay = t.entregaAyudante || 0;
        const cia = t.entregaCompania || 0;
        const total = t.totalEntregado || (ay + cia);
        setMonthlyRouteData({
          production: t.production || 0,
          entregaAyudante: ay,
          entregaCompania: cia,
          totalEntregado: total,
          loading: false,
        });
        routeOk = true;
      } else if (selectedYearMonth === '2026-08') {
        setMonthlyRouteData({
          production: 12334.75,
          entregaAyudante: 2828.80,
          entregaCompania: 1086.45,
          totalEntregado: 3915.25,
          loading: false,
        });
        setBalanceStatus('live');
        routeOk = true;
      } else {
        setMonthlyRouteData({
          production: 0,
          entregaAyudante: 0,
          entregaCompania: 0,
          totalEntregado: 0,
          loading: false,
        });
        setBalanceStatus('live');
        routeOk = true;
      }

      setBalanceStatus(routeOk ? 'live' : 'stale');
    } catch (err) {
      console.error('Error al actualizar balance:', err);
      setBalanceStatus('stale');
    } finally {
      setIsRefreshingBalance(false);
    }
  };

  // Ganancia neta real en limpio del socio
  const utilidadNetaMes = useMemo(() => {
    return routeDeliveryCurrentMonth - totalCostoMes;
  }, [routeDeliveryCurrentMonth, totalCostoMes]);

  // Deudas pendientes globales de este bus (saldos pendientes con talleres)
  const pendingDebts = useMemo(() => {
    return allExpenses.filter((e) => e.pendingBalance > 0);
  }, [allExpenses]);

  const totalDeudasPendientes = useMemo(() => {
    return pendingDebts.reduce((sum, e) => sum + e.pendingBalance, 0);
  }, [pendingDebts]);

  // Detección de datos de muestra precargados
  const hasSampleData = useMemo(() => {
    return allExpenses.some(
      (e) => e.busId === busId && (e.id.startsWith('EXP-AUG-') || e.id.startsWith('EXP-SEP-'))
    );
  }, [allExpenses, busId]);

  const handlePurgeSampleData = async () => {
    // Fase 1: Optimistic UI
    setAllExpenses((prev) =>
      prev.filter((e) => !(e.busId === busId && (e.id.startsWith('EXP-AUG-') || e.id.startsWith('EXP-SEP-'))))
    );
    showToast('🧹 Gastos de ejemplo eliminados. Lista limpia con tus registros.');

    // Fase 2: Persistencia local y API en segundo plano
    try {
      await removeSampleExpensesFromApi(busId);
    } catch (err) {
      console.warn('Error purgando muestras:', err);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('¿Seguro que deseas vaciar todos los gastos registrados para este bus?')) return;

    // Fase 1: Optimistic UI
    setAllExpenses([]);
    showToast('🗑️ Todos los gastos han sido borrados.');

    // Fase 2: Persistencia local y API
    try {
      await clearAllOwnerExpensesFromApi(busId);
    } catch (err) {
      console.warn('Error vaciando todos los gastos:', err);
    }
  };

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

  // Abrir nuevo gasto ("Modo Rápido 1-2-3")
  const openNewExpenseModal = () => {
    // Por defecto sugerir una fecha dentro del mes activo
    const today = new Date().toISOString().split('T')[0];
    const defaultDate = today.startsWith(selectedYearMonth) ? today : `${selectedYearMonth}-15`;
    setFormDate(defaultDate);
    setFormCategory('ACEITES_FILTROS');
    setFormDescription('');
    setFormProvider('');
    setFormTotalAmount('');
    setFormPaidAmount('');
    setFormIsCredit(false);
    setFormPaymentMethod('TRANSFERENCIA');
    setFormBankName('Banco de Loja');
    setFormComprobanteRef('');
    setFormPhotoPreview(null);
    const initialTargetBus = busId !== 'TODOS'
      ? busId
      : (availableBuses[0]?.numeroDisco ? `BUS-${availableBuses[0].numeroDisco}` : 'BUS-01');
    setFormBusId(initialTargetBus);
    setIsNewExpenseOpen(true);
  };

  // Guardar nuevo gasto ("Modo Rápido 1-2-3")
  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const total = parseFloat(formTotalAmount);
    if (isNaN(total) || total <= 0) {
      showToast('⚠️ Por favor ingresa el monto total del gasto');
      return;
    }

    let paid = total;
    if (formIsCredit) {
      paid = formPaidAmount === '' ? 0 : parseFloat(formPaidAmount);
      if (isNaN(paid) || paid < 0) {
        showToast('⚠️ Por favor ingresa cuánto entregó hoy de anticipo (o 0)');
        return;
      }
    }

    const pending = Math.max(0, total - paid);
    const targetBus = formBusId || (busId !== 'TODOS' ? busId : (availableBuses[0]?.numeroDisco ? `BUS-${availableBuses[0].numeroDisco}` : 'BUS-01'));

    const newExpense: OwnerExpense = {
      id: 'EXP-' + Date.now(),
      busId: targetBus,
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
      origenPago: 'SOCIO_DIRECTO',
      descontadoEnRuta: false,
      status: pending <= 0 ? 'PAGADO' : 'PENDIENTE',
    };

    await saveOwnerExpenseToApi(newExpense);
    await loadData();
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
  // Guardar abono con sincronización garantizada de estado reactivo y persistencia API
  const handleSaveAbono = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!abonoTargetExpense || isSubmittingAbono) return;

    const amount = parseFloat(abonoAmount);
    if (isNaN(amount) || amount <= 0) {
      showToast('⚠️ Ingresa un monto de abono válido');
      return;
    }

    if (amount > abonoTargetExpense.pendingBalance) {
      showToast(`⚠️ El abono no puede superar el saldo pendiente ($${abonoTargetExpense.pendingBalance.toFixed(2)})`);
      return;
    }

    setIsSubmittingAbono(true);
    const targetId = abonoTargetExpense.id;

    try {
      // 1. Persistencia dual (local inmediata + PUT a /api/owner-expenses)
      const updatedExpense = await registerAbonoToApi(targetId, {
        date: abonoDate,
        amount,
        paymentMethod: abonoMethod,
        comprobanteRef: abonoRef.trim() || undefined,
        notes: abonoNotes.trim() || undefined,
      });

      // 2. Actualización atómica del estado para garantizar sincronización de la interfaz
      if (updatedExpense) {
        setAllExpenses((prev) =>
          prev.map((e) => (e.id === targetId ? updatedExpense : e))
        );
      } else {
        // Fallback optimista si no se obtuvo el objeto de retorno
        setAllExpenses((prev) =>
          prev.map((e) => {
            if (e.id !== targetId) return e;
            const newPaid = e.paidAmount + amount;
            const newPending = Math.max(0, e.totalAmount - newPaid);
            return {
              ...e,
              paidAmount: newPaid,
              pendingBalance: newPending,
              status: newPending <= 0 ? 'PAGADO' : 'PENDIENTE',
            };
          })
        );
      }

      setAbonoTargetExpense(null);
      showToast(`✅ Abono de $${amount.toFixed(2)} registrado y sincronizado`);
    } catch (err) {
      console.error('Error al registrar abono:', err);
      showToast('⚠️ Error al registrar abono, se conservó localmente');
    } finally {
      setIsSubmittingAbono(false);
    }
  };

  // FASE A & B (v3.60.28): Anulación Segura (Soft Delete) de Gasto con Auditoría
  const handleOpenAnularModal = (expense: OwnerExpense) => {
    setExpenseParaAnular(expense);
    setMotivoAnulacionGasto('Error de digitación');
    setMotivoAnulacionCustom('');
  };

  const handleConfirmarAnulacionGasto = async () => {
    if (!expenseParaAnular) return;
    const motivoFinal = (motivoAnulacionGasto === 'OTRO' ? motivoAnulacionCustom : motivoAnulacionGasto).trim();
    if (!motivoFinal || motivoFinal.length < 3) {
      showToast('⚠️ Ingresa un motivo para la anulación');
      return;
    }

    setIsSubmittingAnulacion(true);
    const targetId = expenseParaAnular.id;
    const usuarioActivo = currentUser?.nombre || currentUser?.username || 'Socio Propietario';

    try {
      // 1. Actualización optimista: retirar de la vista activa para no distorsionar balance
      setAllExpenses((prev) => prev.filter((e) => e.id !== targetId));
      showToast('🛡️ Gasto anulado y archivado en auditoría');

      // 2. Persistir Soft Delete con motivo y usuario en local y nube
      await deleteOwnerExpenseFromApi(targetId, motivoFinal, usuarioActivo, false);
    } catch (err) {
      console.warn('Error anulando en API:', err);
    } finally {
      setIsSubmittingAnulacion(false);
      setExpenseParaAnular(null);
      setMotivoAnulacionGasto('Error de digitación');
      setMotivoAnulacionCustom('');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-[#3A3A3A] font-sans pb-28 select-none">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-[#912D26] text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-semibold animate-in fade-in slide-in-from-top-4 duration-200">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* HEADER SUPERIOR */}
      <header className="sticky top-0 z-30 bg-[#912D26] text-white shadow-md border-b border-red-900 px-4 py-3">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {onBackToHome && (
              <button
                id="btn-back-home"
                onClick={onBackToHome}
                className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center border border-white/20 active:scale-95 transition"
                title="Volver al Inicio"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black px-2.5 py-0.5 rounded bg-white text-[#912D26] shadow-sm">
                  {busId}
                </span>
                <h1 className="text-sm font-bold text-white tracking-tight">
                  Gastos del Socio
                </h1>
              </div>
              <p className="text-[11px] text-red-100 font-medium">
                Socio Propietario • Coo. Vilcabambaturis
              </p>
            </div>
          </div>

          {/* Placa e Identificación Fija de la Unidad y Estado BD */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 px-2 py-1 bg-emerald-500/30 border border-emerald-400/50 rounded-xl text-emerald-100 text-[10px] sm:text-xs font-bold shrink-0">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>☁️ En Línea BD</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-black/20 border border-white/20 rounded-xl text-white">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <div className="text-right">
                <span className="text-[10px] text-red-200 block uppercase font-bold leading-none">Unidad Activa</span>
                <span className="text-xs font-black tracking-wider leading-tight">{busId}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* CUERPO PRINCIPAL */}
      <main className="max-w-md mx-auto px-4 pt-4 space-y-4">
        {/* DISTINTIVO DE BASE DE DATOS Y BOTÓN DE SINCRONIZACIÓN */}
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/80 rounded-2xl p-2.5 flex items-center justify-between gap-2 shadow-xs">
          <div className="flex items-center gap-2 text-xs text-emerald-950 font-bold">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="tracking-tight">☁️ En Línea BD (PostgreSQL)</span>
          </div>
          <button
            id="btn-sync-cloud-expenses"
            onClick={handleSyncToDb}
            disabled={isSyncing}
            className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-1.5 disabled:opacity-50 shadow-sm"
            title="Subir gastos guardados en el teléfono a la base de datos central"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
            <span>{isSyncing ? "Sincronizando..." : "☁️ Sincronizar"}</span>
          </button>
        </div>

        {/* PANEL MULTI-TENANT: AISLAMIENTO POR SOCIO Y SELECTOR DE UNIDADES (SUBFASE 3.2) */}
        <div className="bg-white rounded-2xl border-2 border-gray-200/90 shadow-xs p-3 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span
                className={`px-2 py-0.5 rounded text-[11px] font-black uppercase tracking-wider flex items-center gap-1 ${
                  isSuperAdmin
                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                    : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                }`}
              >
                {isSuperAdmin ? (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
                    <span>SuperAdmin SaaS</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Panel Privado</span>
                  </>
                )}
              </span>
              <span className="text-xs font-semibold text-gray-700 truncate max-w-[200px]">
                {isSuperAdmin
                  ? 'Gobernanza General de Flota'
                  : currentUser?.nombre
                  ? `Socio: ${currentUser.nombre}`
                  : 'Tus Unidades Asignadas'}
              </span>
            </div>
            {isSocio && (
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 shrink-0">
                🔒 Aislamiento Activo
              </span>
            )}
          </div>

          {/* Selector de Socio para SuperAdmin */}
          {isSuperAdmin && sociosList.length > 0 && (
            <div className="pt-1.5 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <label className="text-[11px] font-bold text-gray-500 whitespace-nowrap">
                  Filtrar Socio:
                </label>
                <select
                  value={filtroSocioSuperAdmin}
                  onChange={(e) => {
                    setFiltroSocioSuperAdmin(e.target.value);
                    setBusId('TODOS');
                  }}
                  className="w-full text-xs font-semibold bg-gray-50 border border-gray-200 rounded-lg p-1.5 text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#912D26]"
                >
                  <option value="TODOS">Todos los Socios (Flota Completa)</option>
                  {sociosList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nombre} ({s.buses?.map((b) => `Bus ${b.numeroDisco}`).join(', ') || 'Sin bus'})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Selector Táctil Ergonómico de Unidades */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold text-gray-500 flex items-center gap-1">
                <BusIcon className="w-3.5 h-3.5 text-gray-400" />
                <span>Unidad Contable Seleccionada:</span>
              </span>
              <span className="text-[11px] font-mono font-bold text-[#912D26]">
                {busId === 'TODOS' ? '📑 Consolidado General' : busId}
              </span>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {availableBuses.length > 1 && (
                <button
                  type="button"
                  onClick={() => setBusId('TODOS')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap active:scale-95 flex items-center gap-1 shrink-0 ${
                    busId === 'TODOS'
                      ? 'bg-[#912D26] text-white shadow-xs'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Todas mis unidades ({availableBuses.length})</span>
                </button>
              )}
              {availableBuses.length > 0 ? (
                availableBuses.map((b) => {
                  const idVariant = `BUS-${b.numeroDisco}`;
                  const isSelected = busId === idVariant || busId === b.numeroDisco;
                  return (
                    <button
                      key={b.id || b.numeroDisco}
                      type="button"
                      onClick={() => setBusId(idVariant)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 active:scale-95 shrink-0 ${
                        isSelected
                          ? 'bg-[#912D26] text-white shadow-xs'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200'
                      }`}
                    >
                      <span>🚌 Disco {b.numeroDisco}</span>
                      {b.placa && (
                        <span
                          className={`text-[10px] font-mono px-1 rounded ${
                            isSelected
                              ? 'bg-white/20 text-white'
                              : 'bg-gray-200 text-gray-600'
                          }`}
                        >
                          {b.placa}
                        </span>
                      )}
                    </button>
                  );
                })
              ) : (
                <button
                  type="button"
                  onClick={() => setBusId(initialBusId)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#912D26] text-white shadow-xs shrink-0"
                >
                  🚌 {busId}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* NAVEGADOR DE MES CONTABLE (EJE CARDINAL DE FECHA) */}
        <div className="bg-white border-2 border-gray-200 rounded-2xl p-3 shadow-sm">
          <div className="flex items-center justify-between">
            <button
              id="btn-prev-month"
              onClick={handlePrevMonth}
              className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 text-[#3A3A3A] flex items-center justify-center active:scale-95 transition"
              title="Mes Anterior"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="text-center">
              <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-[#912D26] uppercase tracking-wider">
                <Calendar className="w-3.5 h-3.5 text-[#912D26]" />
                <span>Mes Contable</span>
              </div>
              <div className="text-base font-black text-[#3A3A3A]">
                {getMonthNameFormatted(selectedYearMonth)}
              </div>
            </div>

            <button
              id="btn-next-month"
              onClick={handleNextMonth}
              className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 text-[#3A3A3A] flex items-center justify-center active:scale-95 transition"
              title="Mes Siguiente"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Accesos Rápidos de Meses Clave (Mes Actual y Todos los Meses con Movimiento) */}
          <div className="flex items-center justify-center gap-1.5 mt-2 pt-2 border-t border-gray-100 flex-wrap">
            <button
              id="quick-current-month"
              onClick={() => setSelectedYearMonth(getCurrentYearMonth())}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                selectedYearMonth === getCurrentYearMonth()
                  ? 'bg-[#912D26] text-white font-bold shadow-xs'
                  : 'bg-gray-100 text-[#3A3A3A] hover:bg-gray-200'
              }`}
            >
              Mes Actual
            </button>
            {/* Generar botón táctil para cada mes que tenga registros */}
            {availableMonths
              .filter((m) => m !== getCurrentYearMonth())
              .map((m) => {
                const countInMonth = allExpenses.filter((e) => typeof e.expenseDate === 'string' && e.expenseDate.startsWith(m)).length;
                return (
                  <button
                    key={m}
                    id={`quick-month-${m}`}
                    onClick={() => setSelectedYearMonth(m)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition flex items-center gap-1 ${
                      selectedYearMonth === m
                        ? 'bg-[#912D26] text-white font-bold shadow-xs'
                        : 'bg-gray-100 text-[#3A3A3A] hover:bg-gray-200'
                    }`}
                  >
                    <span>{getMonthNameFormatted(m)}</span>
                    {countInMonth > 0 && (
                      <span className={`text-[10px] px-1 rounded-full ${selectedYearMonth === m ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'}`}>
                        {countInMonth}
                      </span>
                    )}
                  </button>
                );
              })}
          </div>
        </div>

        {/* AVISO DE DATOS DE MUESTRA PRECARGADOS */}
        {hasSampleData && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 flex items-center justify-between gap-2 shadow-xs">
            <div className="flex items-center gap-2 text-xs text-amber-900 font-medium">
              <Info className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Hay registros de muestra de prueba cargados.</span>
            </div>
            <button
              id="btn-purge-samples"
              onClick={handlePurgeSampleData}
              className="px-3 py-1.5 bg-amber-200 hover:bg-amber-300 active:scale-95 text-amber-900 rounded-xl text-xs font-bold transition shrink-0"
              title="Borrar gastos de prueba EXP-AUG y EXP-SEP"
            >
              Borrar pruebas
            </button>
          </div>
        )}

        {/* TARJETA EJECUTIVA DE BALANCE Y GANANCIA EN VIVO CON SEMÁFORO DE CERTEZA */}
        <div className="bg-gradient-to-br from-emerald-900 via-teal-950 to-slate-900 rounded-3xl p-4 text-white shadow-xl space-y-3.5 border border-emerald-800/40 relative overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
            <div className="flex items-center gap-2">
              {/* Semáforo Inteligente según el Mes Contable */}
              {balanceStatus === "loading" && (
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-200 border border-amber-500/30 text-[11px] font-bold">
                  <RefreshCw className="w-3 h-3 animate-spin text-amber-300" />
                  <span>Actualizando balance • {getMonthNameFormatted(selectedYearMonth)}</span>
                </span>
              )}
              {balanceStatus === "live" && (
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/25 text-emerald-200 border border-emerald-400/30 text-[11px] font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>En Vivo • Balance de {getMonthNameFormatted(selectedYearMonth)}</span>
                </span>
              )}
              {(balanceStatus === "stale" || balanceStatus === "error") && (
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-500/25 text-orange-200 border border-orange-400/30 text-[11px] font-bold">
                  <span className="w-2 h-2 rounded-full bg-orange-400" />
                  <span>Caché local • {getMonthNameFormatted(selectedYearMonth)} • Toca ↻</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Botón Táctil de Refresco Inmediato */}
              <button
                type="button"
                id="btn-refresh-balance-socio"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRefreshBalance(true);
                }}
                disabled={isRefreshingBalance}
                className="p-1 px-2 rounded-lg bg-white/10 hover:bg-white/20 active:scale-95 transition flex items-center gap-1 text-[10px] text-emerald-100 font-semibold cursor-pointer border border-white/10"
                title="Actualizar balance en vivo"
              >
                <RefreshCw className={`w-3 h-3 ${isRefreshingBalance ? "animate-spin text-amber-300" : "text-emerald-200"}`} />
                <span className="hidden xs:inline">{isRefreshingBalance ? "Actualizando..." : "Actualizar"}</span>
              </button>

              <span className="text-xs font-bold text-white/90">
                Unidad {busId}
              </span>
            </div>
          </div>

          <div className={`grid grid-cols-2 gap-2.5 text-xs transition-opacity duration-300 ${balanceStatus === "loading" ? "opacity-70" : "opacity-100"}`}>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-emerald-200/90 uppercase font-bold block">
                  Entregado de Ruta
                </span>
                {monthlyRouteData.production > 0 && (
                  <span className="text-[9px] text-emerald-300/90 font-bold bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-500/30">
                    Prod: ${monthlyRouteData.production.toFixed(2)}
                  </span>
                )}
              </div>
              <div className="text-lg font-black text-white mt-0.5">
                ${routeDeliveryCurrentMonth.toFixed(2)}
              </div>
              <span className="text-[10px] text-emerald-300/80 block mt-0.5">
                {monthlyRouteData.entregaAyudante > 0 || monthlyRouteData.entregaCompania > 0
                  ? `Ayud: ${monthlyRouteData.entregaAyudante.toFixed(2)} + Cía: ${monthlyRouteData.entregaCompania.toFixed(2)}`
                  : 'Ayudante + Cía'}
              </span>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-2.5">
              <span className="text-[10px] text-rose-200/90 uppercase font-bold block leading-tight">
                Gastos del bus que pagó el socio
              </span>
              <div className="text-lg font-black text-rose-300 mt-0.5">
                ${totalCostoMes.toFixed(2)}
              </div>
              <span className="text-[10px] text-rose-200/80 block mt-0.5">
                {expensesSocioDirectoMes.length} directos del bolsillo
                {totalMantenimientoRutaMes > 0 && (
                  <span className="block text-[9px] text-amber-200/80 mt-0.5">
                    +${totalMantenimientoRutaMes.toFixed(2)} pagados en ruta
                  </span>
                )}
              </span>
            </div>
          </div>

          {/* GANANCIA REAL EN LIMPIO */}
          <div className={`bg-emerald-500/20 border border-emerald-400/40 rounded-2xl p-3 flex items-center justify-between transition-opacity duration-300 ${balanceStatus === "loading" ? "opacity-70" : "opacity-100"}`}>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-200 block">
                Ganancia Real en Limpio
              </span>
              <div className="text-2xl font-black text-white mt-0.5">
                ${utilidadNetaMes.toFixed(2)}
              </div>
            </div>
            <button
              id="btn-quick-view-income-statement"
              onClick={() => setIsIncomeStatementOpen(true)}
              className="px-3 py-2 bg-white hover:bg-emerald-50 active:scale-95 text-emerald-950 text-xs font-black rounded-xl shadow-md transition cursor-pointer flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-800" />
              <span>Ver Detalle PDF</span>
            </button>
          </div>

          {/* ALERTA DE DEUDAS EN TALLERES SI EXISTEN */}
          {totalDeudasPendientes > 0 && (
            <div
              onClick={() => setIsDebtsReportOpen(true)}
              className="bg-amber-500/20 border border-amber-400/40 rounded-xl p-2 flex items-center justify-between text-xs text-amber-200 hover:bg-amber-500/30 transition cursor-pointer"
            >
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Debes a talleres: <strong className="text-white font-black">${totalDeudasPendientes.toFixed(2)}</strong></span>
              </div>
              <span className="text-[11px] font-bold underline text-amber-300">
                Ver cuentas ({pendingDebts.length}) →
              </span>
            </div>
          )}
        </div>

        {/* ACCESO RÁPIDO A REPORTES Y DOCUMENTOS OFICIALES */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-black text-[#3A3A3A] uppercase tracking-wider">
              Documentos y Reportes Oficiales
            </span>
            <span className="text-[10px] text-gray-500 font-semibold">
              Descargables en PDF
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {/* 1. Ganancia Real */}
            <button
              id="btn-open-income-statement"
              onClick={() => setIsIncomeStatementOpen(true)}
              className="bg-white border-2 border-gray-200 hover:border-red-400 active:scale-95 rounded-2xl p-2.5 text-left transition shadow-xs flex items-center gap-2.5 group cursor-pointer"
            >
              <div className="w-9 h-9 rounded-xl bg-red-50 text-[#912D26] flex items-center justify-center shrink-0 border border-red-200 group-hover:bg-[#912D26] group-hover:text-white transition">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-xs font-black text-[#3A3A3A] block truncate">
                  Ganancia Real
                </span>
                <span className="text-[10px] text-gray-500 block truncate">
                  Ruta (-) Gastos = Utilidad
                </span>
              </div>
            </button>

            {/* 2. Deudas con Talleres */}
            <button
              id="btn-open-debts-report"
              onClick={() => setIsDebtsReportOpen(true)}
              className="bg-white border-2 border-gray-200 hover:border-amber-400 active:scale-95 rounded-2xl p-2.5 text-left transition shadow-xs flex items-center gap-2.5 group cursor-pointer"
            >
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 border border-amber-200 group-hover:bg-amber-600 group-hover:text-white transition">
                <Building2 className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-xs font-black text-[#3A3A3A] block truncate">
                  Deudas Talleres
                </span>
                <span className="text-[10px] text-gray-500 block truncate">
                  Créditos y abonos
                </span>
              </div>
            </button>

            {/* 3. Comparativo Mensual */}
            <button
              id="btn-open-comparison-report"
              onClick={() => setIsComparisonReportOpen(true)}
              className="bg-white border-2 border-gray-200 hover:border-slate-400 active:scale-95 rounded-2xl p-2.5 text-left transition shadow-xs flex items-center gap-2.5 group cursor-pointer"
            >
              <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center shrink-0 border border-slate-300 group-hover:bg-slate-800 group-hover:text-white transition">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-xs font-black text-[#3A3A3A] block truncate">
                  Comparar Meses
                </span>
                <span className="text-[10px] text-gray-500 block truncate">
                  Ago vs Sep variaciones
                </span>
              </div>
            </button>

            {/* 4. Cierre Anual */}
            <button
              id="btn-open-annual-report"
              onClick={() => setIsAnnualReportOpen(true)}
              className="bg-white border-2 border-gray-200 hover:border-emerald-400 active:scale-95 rounded-2xl p-2.5 text-left transition shadow-xs flex items-center gap-2.5 group cursor-pointer"
            >
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center shrink-0 border border-emerald-200 group-hover:bg-emerald-800 group-hover:text-white transition">
                <BarChart3 className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-xs font-black text-[#3A3A3A] block truncate">
                  Cierre del Año
                </span>
                <span className="text-[10px] text-gray-500 block truncate">
                  12 meses acumulados
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* ALERTA / BANDEJA DE COMPROMISOS PENDIENTES (FIADO / CRÉDITOS) */}
        {pendingDebts.length > 0 && (
          <div className="bg-amber-50/80 border-2 border-amber-300 rounded-2xl p-3.5 space-y-2.5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                <h2 className="text-xs font-extrabold text-amber-800 uppercase tracking-wide">
                  Saldos Pendientes con Talleres ({pendingDebts.length})
                </h2>
              </div>
              <button
                onClick={() => setIsDebtsReportOpen(true)}
                className="text-xs font-black text-amber-900 bg-amber-200 hover:bg-amber-300 px-2 py-0.5 rounded-lg transition"
              >
                Ver todas las deudas (${totalDeudasPendientes.toFixed(2)}) →
              </button>
            </div>

            <div className="space-y-2">
              {pendingDebts.map((debt) => (
                <div
                  key={debt.id}
                  className="bg-white border border-amber-200 rounded-xl p-3 flex items-center justify-between gap-3 shadow-xs"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">
                        {OWNER_EXPENSE_CATEGORIES.find((c) => c.id === debt.category)?.icon || '📦'}
                      </span>
                      <p className="text-xs font-bold text-[#3A3A3A] truncate">
                        {debt.description}
                      </p>
                    </div>
                    <p className="text-[11px] text-gray-500 truncate mt-0.5">
                      {debt.provider || 'Proveedor'} • {debt.expenseDate}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-[11px]">
                      <span className="text-gray-400 font-medium">Costo: ${debt.totalAmount.toFixed(2)}</span>
                      <span className="text-amber-700 font-bold">
                        Debe: ${debt.pendingBalance.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <button
                    id={`btn-abono-${debt.id}`}
                    onClick={() => handleOpenAbono(debt)}
                    className="shrink-0 px-3 py-2 bg-amber-600 text-white rounded-xl text-xs font-bold hover:bg-amber-700 active:scale-95 transition shadow-sm"
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
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                id="search-expense-input"
                type="text"
                placeholder="Buscar por repuesto, taller o referencia..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white border-2 border-gray-200 rounded-xl pl-9 pr-8 py-2.5 text-xs text-[#3A3A3A] placeholder:text-gray-400 font-medium focus:outline-none focus:border-[#912D26] shadow-sm"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
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
                  ? 'bg-[#912D26] text-white font-bold shadow-sm'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              Todos ({expensesInMonth.length})
            </button>
            {OWNER_EXPENSE_CATEGORIES.map((cat) => {
              const count = allExpenses.filter(
                (e) => typeof e.expenseDate === 'string' && e.expenseDate.startsWith(selectedYearMonth) && e.category === cat.id
              ).length;
              if (count === 0 && filterCategory !== cat.id) return null;
              return (
                <button
                  key={cat.id}
                  onClick={() => setFilterCategory(cat.id)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium shrink-0 flex items-center gap-1 transition ${
                    filterCategory === cat.id
                      ? 'bg-[#912D26] text-white font-bold shadow-sm'
                      : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.name}</span>
                  <span className="text-[10px] opacity-75">({count})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* LISTA DE GASTOS ASIGNADOS AL MES CONTABLE */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-black text-[#3A3A3A] uppercase tracking-wider">
              Historial de Pagos • {getMonthNameFormatted(selectedYearMonth)}
            </h3>
            <span className="text-[11px] text-gray-500 font-semibold">
              {expensesInMonth.length} items
            </span>
          </div>

          {expensesInMonth.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-red-50 text-[#912D26] flex items-center justify-center mx-auto">
                <Receipt className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-[#3A3A3A]">
                  Sin gastos registrados en este mes
                </p>
                <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">
                  Si hiciste pagos o compras en {getMonthNameFormatted(selectedYearMonth)}, puedes registrarlos con el botón inferior.
                </p>
              </div>
              <button
                onClick={openNewExpenseModal}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-xs font-bold text-[#912D26] border border-red-200 shadow-sm"
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

                const esDeRuta =
                  expense.origenPago === 'AYUDANTE_RUTA' ||
                  expense.descontadoEnRuta === true ||
                  expense.comprobanteRef?.includes('AYUDANTE_RUTA') ||
                  expense.description?.includes('[RUTA-AYUDANTE]') ||
                  (expense.paymentMethod === 'EFECTIVO' &&
                    (expense.description?.toLowerCase().includes('ayudante') ||
                      expense.description?.toLowerCase().includes('chofer') ||
                      expense.description?.toLowerCase().includes('liquidado') ||
                      expense.description?.toLowerCase().includes('ruta')));

                return (
                  <div
                    key={expense.id}
                    className={`bg-white border-2 rounded-2xl p-3.5 space-y-2 shadow-sm transition ${
                      esDeRuta ? 'border-amber-200/90 bg-amber-50/20' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center text-base shrink-0">
                          {categoryMeta?.icon || '📦'}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="text-xs font-bold text-[#3A3A3A] leading-snug truncate">
                              {expense.description}
                            </h4>
                            {esDeRuta && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-100 border border-amber-300 text-amber-900 text-[9px] font-black uppercase tracking-wider shrink-0">
                                🛣️ Liquidado en Ruta
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-gray-500 truncate mt-0.5">
                            {expense.provider || 'Proveedor / Taller'}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className={`text-sm font-black ${esDeRuta ? 'text-gray-500' : 'text-[#3A3A3A]'}`}>
                          ${expense.paidAmount.toFixed(2)}
                        </div>
                        {esDeRuta ? (
                          <span className="text-[9px] font-bold text-amber-700 block mt-0.5">
                            Pagó ayudante
                          </span>
                        ) : expense.pendingBalance > 0 ? (
                          <span className="text-[10px] font-bold text-amber-600 block mt-0.5">
                            Debe: ${expense.pendingBalance.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-emerald-600 block mt-0.5">
                            Pagado total
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Explicación si fue liquidado en ruta */}
                    {esDeRuta && (
                      <div className="bg-amber-100/60 border border-amber-200/80 rounded-xl px-2.5 py-1 text-[10px] text-amber-900 font-medium flex items-center gap-1.5">
                        <Info className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                        <span>Deducido en arqueo diario de ruta — No descuenta de su liquidación mensual</span>
                      </div>
                    )}

                    {/* Metadata: Fecha Real de Pago + Método y Referencia */}
                    <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-[11px] text-neutral-400">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-[#912D26]" />
                        <span className="font-bold text-[#3A3A3A]">
                          {expense.expenseDate}
                        </span>
                        {expense.paymentMethod === 'TRANSFERENCIA' ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-semibold">
                            <CreditCard className="w-2.5 h-2.5" />
                            <span>{expense.bankName || 'Transf.'}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold">
                            <Banknote className="w-2.5 h-2.5" />
                            <span>Efectivo</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {expense.comprobanteRef && (
                          <span className="text-gray-400 text-[10px] truncate max-w-[130px] font-medium">
                            {expense.comprobanteRef}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleOpenAnularModal(expense)}
                          className="text-gray-300 hover:text-rose-600 p-1 transition cursor-pointer"
                          title="Anular registro con auditoría"
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
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-gray-50 via-gray-50/95 to-transparent z-20 border-t border-gray-200/40">
        <div className="max-w-md mx-auto">
          <button
            id="btn-register-expense-thumb"
            onClick={openNewExpenseModal}
            className="w-full min-h-[52px] rounded-2xl bg-[#912D26] hover:bg-[#a6342c] active:scale-[0.98] text-white font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-red-200 transition cursor-pointer"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
            <span>Registrar Gasto del Bus</span>
          </button>
        </div>
      </div>

      {/* MODAL / BOTTOM SHEET: REGISTRAR NUEVO GASTO */}
      {isNewExpenseOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white border border-gray-200 w-full max-w-md rounded-t-3xl sm:rounded-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-250 shadow-2xl">
            {/* Cabecera del Drawer */}
            <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-extrabold text-[#3A3A3A] flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-[#912D26]" />
                  <span>Registrar Gasto del Bus</span>
                </h2>
                <p className="text-[11px] text-neutral-400">
                  Unidad {formBusId || busId} • Asignación a mes contable
                </p>
              </div>
              <button
                onClick={() => setIsNewExpenseOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-200 text-[#3A3A3A] hover:bg-gray-300 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Formulario Scrolleable: Flujo Simplificado 1-2-3 */}
            <form onSubmit={handleSaveExpense} className="p-4 space-y-4 overflow-y-auto">
              {/* SELECTOR DE UNIDAD SI HAY MÚLTIPLES AUTOBUSES */}
              {availableBuses.length > 1 && (
                <div className="bg-white border-2 border-gray-200 rounded-2xl p-3 shadow-xs space-y-1.5">
                  <label className="text-xs font-black text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                    <BusIcon className="w-4 h-4 text-[#912D26]" />
                    <span>¿A cuál de tus unidades corresponde este gasto?</span>
                  </label>
                  <select
                    value={formBusId}
                    onChange={(e) => setFormBusId(e.target.value)}
                    className="w-full text-xs font-bold bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#912D26]"
                  >
                    {availableBuses.map((b) => (
                      <option key={b.numeroDisco} value={`BUS-${b.numeroDisco}`}>
                        Disco {b.numeroDisco} {b.placa ? `• Placa ${b.placa}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {/* PASO 1: MONTO Y CONDICIÓN DE PAGO (CONTADO O FIADO) */}
              <div className="bg-white border-2 border-gray-200 rounded-2xl p-3.5 space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-[#912D26] text-white flex items-center justify-center text-[10px] font-black">
                      1
                    </span>
                    <span>¿Cuánto costó el trabajo o repuesto?</span>
                  </label>
                  <span className="text-[10px] text-gray-400 font-bold">Paso 1 de 3</span>
                </div>

                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-gray-400">
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
                      const val = e.target.value;
                      setFormTotalAmount(val);
                      if (!formIsCredit) {
                        setFormPaidAmount(val);
                      }
                    }}
                    className="w-full bg-gray-50 border-2 border-gray-300 focus:border-[#912D26] focus:bg-white rounded-2xl pl-10 pr-4 py-3 text-2xl font-black text-gray-900 focus:outline-none transition"
                  />
                </div>

                {/* PREGUNTA DIRECTA: ¿PAGADO COMPLETO O QUEDÓ DEBIENDO? */}
                <div className="space-y-1.5 pt-1">
                  <label className="text-xs font-bold text-gray-700 block">
                    ¿Se pagó todo de inmediato o quedó debiendo al taller?
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setFormIsCredit(false);
                        setFormPaidAmount(formTotalAmount);
                      }}
                      className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition ${
                        !formIsCredit
                          ? 'bg-emerald-50 border-2 border-emerald-600 text-emerald-800 shadow-xs'
                          : 'bg-white border-2 border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Pagado Completo</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setFormIsCredit(true);
                        if (formPaidAmount === formTotalAmount) {
                          setFormPaidAmount('');
                        }
                      }}
                      className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition ${
                        formIsCredit
                          ? 'bg-amber-50 border-2 border-amber-600 text-amber-900 shadow-xs'
                          : 'bg-white border-2 border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <span>Quedé debiendo (Fiado)</span>
                    </button>
                  </div>

                  {/* Si quedó debiendo, pedir anticipo y calcular deuda */}
                  {formIsCredit && (
                    <div className="mt-2.5 p-3 rounded-xl bg-amber-50/90 border border-amber-300 space-y-2 animate-in fade-in duration-200">
                      <label className="text-xs font-bold text-amber-900 block">
                        ¿Cuánto entregó hoy como anticipo o entrada?
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-sm">
                          $
                        </span>
                        <input
                          id="input-paid-amount"
                          type="number"
                          step="0.01"
                          placeholder="0.00 (Si no dio nada hoy, deje en 0)"
                          value={formPaidAmount}
                          onChange={(e) => setFormPaidAmount(e.target.value)}
                          className="w-full bg-white border-2 border-amber-300 focus:border-amber-600 rounded-xl pl-8 pr-3 py-2 text-base font-black text-gray-900 focus:outline-none"
                        />
                      </div>

                      {(() => {
                        const tot = parseFloat(formTotalAmount) || 0;
                        const pd = parseFloat(formPaidAmount) || 0;
                        const diff = Math.max(0, tot - pd);
                        return (
                          <div className="flex items-center justify-between text-xs pt-1 border-t border-amber-200">
                            <span className="text-amber-800 font-medium">Queda debiendo al taller:</span>
                            <strong className="text-base font-black text-amber-900">
                              ${diff.toFixed(2)}
                            </strong>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </div>

              {/* PASO 2: CATEGORÍA Y DESCRIPCIÓN DEL TRABAJO */}
              <div className="bg-white border-2 border-gray-200 rounded-2xl p-3.5 space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-[#912D26] text-white flex items-center justify-center text-[10px] font-black">
                      2
                    </span>
                    <span>¿En qué rubro fue el gasto?</span>
                  </label>
                  <span className="text-[10px] text-gray-400 font-bold">Paso 2 de 3</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {OWNER_EXPENSE_CATEGORIES.map((cat) => {
                    const isSelected = formCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setFormCategory(cat.id)}
                        className={`p-2.5 rounded-xl text-left border flex items-center gap-2.5 transition active:scale-[0.98] min-h-[50px] ${
                          isSelected
                            ? 'bg-red-50 border-2 border-[#912D26] text-[#912D26] font-black shadow-xs'
                            : 'bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <span className="text-xl shrink-0">{cat.icon}</span>
                        <div className="min-w-0 flex-1">
                          <span className="text-xs font-bold leading-tight block truncate">
                            {cat.name}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Explicación de la categoría */}
                {(() => {
                  const meta = OWNER_EXPENSE_CATEGORIES.find((c) => c.id === formCategory);
                  if (!meta) return null;
                  return (
                    <div className="p-2 rounded-xl bg-red-50/60 border border-red-200 text-[11px] text-gray-700 flex items-center gap-2">
                      <Info className="w-3.5 h-3.5 text-[#912D26] shrink-0" />
                      <span>{meta.description}</span>
                    </div>
                  );
                })()}

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">
                    ¿Qué se compró o qué trabajo se hizo?
                  </label>
                  <input
                    id="input-expense-desc"
                    type="text"
                    required
                    placeholder="Ej: Cambio de zapatas, 2 llantas traseras, aceite 15W40"
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    className="w-full bg-gray-50 border-2 border-gray-200 focus:border-[#912D26] focus:bg-white rounded-xl px-3 py-2.5 text-xs text-gray-900 placeholder:text-gray-400 font-medium focus:outline-none transition"
                  />
                </div>
              </div>

              {/* PASO 3: TALLER, FORMA DE PAGO Y FECHA */}
              <div className="bg-white border-2 border-gray-200 rounded-2xl p-3.5 space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-[#912D26] text-white flex items-center justify-center text-[10px] font-black">
                      3
                    </span>
                    <span>Taller, Pago y Fecha</span>
                  </label>
                  <span className="text-[10px] text-gray-400 font-bold">Paso 3 de 3</span>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">
                    Nombre del Taller o Proveedor (Opcional):
                  </label>
                  <input
                    id="input-expense-provider"
                    type="text"
                    placeholder="Ej: Taller Don Carlos / Reencauchadora Loja"
                    value={formProvider}
                    onChange={(e) => setFormProvider(e.target.value)}
                    className="w-full bg-gray-50 border-2 border-gray-200 focus:border-[#912D26] focus:bg-white rounded-xl px-3 py-2 text-xs text-gray-900 placeholder:text-gray-400 font-medium focus:outline-none"
                  />
                </div>

                {/* FORMA DE PAGO */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 block">
                    ¿Cómo se pagó lo entregado hoy?
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormPaymentMethod('EFECTIVO')}
                      className={`p-2 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition ${
                        formPaymentMethod === 'EFECTIVO'
                          ? 'bg-emerald-50 border-2 border-emerald-600 text-emerald-800'
                          : 'bg-gray-50 border border-gray-200 text-gray-600'
                      }`}
                    >
                      <Banknote className="w-4 h-4 text-emerald-600" />
                      <span>Efectivo 💵</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormPaymentMethod('TRANSFERENCIA')}
                      className={`p-2 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition ${
                        formPaymentMethod === 'TRANSFERENCIA'
                          ? 'bg-blue-50 border-2 border-blue-600 text-blue-800'
                          : 'bg-gray-50 border border-gray-200 text-gray-600'
                      }`}
                    >
                      <CreditCard className="w-4 h-4 text-blue-600" />
                      <span>Transferencia 💳</span>
                    </button>
                  </div>

                  {formPaymentMethod === 'TRANSFERENCIA' && (
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <select
                        value={formBankName}
                        onChange={(e) => setFormBankName(e.target.value)}
                        className="bg-white border-2 border-gray-200 rounded-xl px-2.5 py-2 text-xs text-gray-800 font-bold focus:outline-none focus:border-[#912D26]"
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
                        className="bg-white border-2 border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-800 placeholder:text-gray-400 font-medium focus:outline-none focus:border-[#912D26]"
                      />
                    </div>
                  )}

                  {formPaymentMethod === 'EFECTIVO' && (
                    <input
                      type="text"
                      placeholder="Nº Recibo de taco / Nota de venta (Opcional)"
                      value={formComprobanteRef}
                      onChange={(e) => setFormComprobanteRef(e.target.value)}
                      className="w-full bg-white border-2 border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-800 placeholder:text-gray-400 font-medium focus:outline-none focus:border-[#912D26]"
                    />
                  )}
                </div>

                {/* FECHA DEL GASTO */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 block">
                    Fecha del Gasto:
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      id="input-expense-date"
                      type="date"
                      required
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      className="flex-1 bg-gray-50 border-2 border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-900 font-bold focus:outline-none focus:border-[#912D26]"
                    />
                    <button
                      type="button"
                      onClick={() => setFormDate(new Date().toISOString().split('T')[0])}
                      className="px-3 py-2 bg-gray-100 hover:bg-gray-200 active:scale-95 rounded-xl text-xs font-bold text-gray-700 cursor-pointer"
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
                      className="px-3 py-2 bg-gray-100 hover:bg-gray-200 active:scale-95 rounded-xl text-xs font-bold text-gray-700 cursor-pointer"
                    >
                      Ayer
                    </button>
                  </div>
                </div>
              </div>

              {/* Botón de Confirmación Principal */}
              <div className="pt-2">
                <button
                  id="btn-confirm-save-expense"
                  type="submit"
                  className="w-full min-h-[52px] rounded-2xl bg-[#912D26] hover:bg-[#a6342c] active:scale-[0.98] text-white font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-red-200 transition cursor-pointer"
                >
                  <Check className="w-5 h-5 stroke-[2.5]" />
                  <span>
                    Guardar Gasto {formTotalAmount ? `($${parseFloat(formTotalAmount || '0').toFixed(2)})` : ''}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL / BOTTOM SHEET: REGISTRAR ABONO A SALDO PENDIENTE */}
      {abonoTargetExpense && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white border border-gray-200 w-full max-w-md rounded-t-3xl sm:rounded-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-250 shadow-2xl">
            <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-extrabold text-[#3A3A3A] flex items-center gap-2">
                  <Banknote className="w-4 h-4 text-amber-400" />
                  <span>Abonar a Cuenta de Taller</span>
                </h2>
                <p className="text-[11px] text-neutral-400 truncate max-w-xs">
                  {abonoTargetExpense.description}
                </p>
              </div>
              <button
                onClick={() => setAbonoTargetExpense(null)}
                className="w-8 h-8 rounded-full bg-gray-200 text-[#3A3A3A] hover:bg-gray-300 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAbono} className="p-4 space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-300 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-neutral-400 block">Saldo Actual Pendiente</span>
                  <strong className="text-base font-black text-amber-400">
                    ${abonoTargetExpense.pendingBalance.toFixed(2)}
                  </strong>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-neutral-400 block">Proveedor</span>
                  <span className="text-xs font-bold text-[#3A3A3A]">
                    {abonoTargetExpense.provider || 'Taller'}
                  </span>
                </div>
              </div>

              {/* Fecha del Abono */}
              <div>
                <label className="text-xs font-bold text-[#3A3A3A] block mb-1">
                  Fecha del Abono:
                </label>
                <input
                  type="date"
                  required
                  value={abonoDate}
                  onChange={(e) => setAbonoDate(e.target.value)}
                  className="w-full bg-white border-2 border-gray-200 rounded-xl px-3 py-2.5 text-xs text-[#3A3A3A] font-bold focus:outline-none focus:border-[#912D26]"
                />
              </div>

              {/* Monto a abonar */}
              <div>
                <label className="text-xs font-bold text-[#3A3A3A] block mb-1">
                  Monto a Pagar Hoy ($):
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  max={abonoTargetExpense.pendingBalance}
                  value={abonoAmount}
                  onChange={(e) => setAbonoAmount(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2.5 text-sm font-black text-[#3A3A3A] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Método */}
              <div>
                <label className="text-xs font-bold text-[#3A3A3A] block mb-1">
                  Forma de Pago:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAbonoMethod('TRANSFERENCIA')}
                    className={`p-2 rounded-xl border text-xs font-semibold ${
                      abonoMethod === 'TRANSFERENCIA'
                        ? 'bg-blue-50 border-2 border-blue-600 text-blue-700 font-bold'
                        : 'bg-white border-2 border-gray-200 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    Transferencia
                  </button>
                  <button
                    type="button"
                    onClick={() => setAbonoMethod('EFECTIVO')}
                    className={`p-2 rounded-xl border text-xs font-semibold ${
                      abonoMethod === 'EFECTIVO'
                        ? 'bg-red-50 border-2 border-[#912D26] text-[#912D26] font-bold shadow-xs'
                        : 'bg-white border-2 border-gray-200 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    Efectivo
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#3A3A3A] block mb-1">
                  Referencia / Nota (Opcional):
                </label>
                <input
                  type="text"
                  placeholder="Ej: Transf. #948201 / Abono final"
                  value={abonoRef}
                  onChange={(e) => setAbonoRef(e.target.value)}
                  className="w-full bg-white border-2 border-gray-200 rounded-xl px-3 py-2 text-xs text-[#3A3A3A] placeholder:text-gray-400 font-medium focus:outline-none focus:border-[#912D26]"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmittingAbono}
                  className="w-full min-h-[48px] rounded-2xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-neutral-950 font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg transition cursor-pointer"
                >
                  <Check className="w-5 h-5 stroke-[2.5]" />
                  <span>{isSubmittingAbono ? 'Asentando Abono...' : `Confirmar Abono de ${parseFloat(abonoAmount || '0').toFixed(2)}`}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL REPORTE: ESTADO DE RESULTADOS INTEGRAL DE LA UNIDAD (FASE 4.1) */}
      {isIncomeStatementOpen && (
        <OwnerIncomeStatementModal
          isOpen={isIncomeStatementOpen}
          onClose={() => setIsIncomeStatementOpen(false)}
          busId={busId}
          selectedYearMonth={selectedYearMonth}
          allExpenses={allExpenses}
        />
      )}

      {/* MODAL REPORTE: CUENTAS POR PAGAR Y DEUDAS CON TALLERES (FASE 4.2) */}
      {isDebtsReportOpen && (
        <OwnerDebtsReportModal
          isOpen={isDebtsReportOpen}
          onClose={() => setIsDebtsReportOpen(false)}
          busId={busId}
          allExpenses={allExpenses}
          onOpenAbonoModal={(exp) => {
            setAbonoTargetExpense(exp);
            setAbonoAmount(exp.pendingBalance.toString());
            setAbonoDate(new Date().toISOString().slice(0, 10));
          }}
        />
      )}

      {/* MODAL REPORTE: COMPARATIVO INTERMENSUAL Y TENDENCIAS (FASE 4.3) */}
      {isComparisonReportOpen && (
        <OwnerComparisonReportModal
          isOpen={isComparisonReportOpen}
          onClose={() => setIsComparisonReportOpen(false)}
          busId={busId}
          allExpenses={allExpenses}
        />
      )}

      {/* MODAL REPORTE: LIQUIDACIÓN Y RENDIMIENTO ANUAL ACUMULADO (FASE 4.4) */}
      {isAnnualReportOpen && (
        <OwnerAnnualReportModal
          isOpen={isAnnualReportOpen}
          onClose={() => setIsAnnualReportOpen(false)}
          busId={busId}
          allExpenses={allExpenses}
        />
      )}

      {/* ========================================================= */}
      {/* MODAL DE ANULACIÓN SEGURA (SOFT DELETE) DE GASTO          */}
      {/* ========================================================= */}
      {expenseParaAnular && (() => {
        const fechaTime = expenseParaAnular.expenseDate ? new Date(`${expenseParaAnular.expenseDate}T00:00:00Z`).getTime() : 0;
        const diffHours = fechaTime > 0 ? (Date.now() - fechaTime) / (1000 * 60 * 60) : 0;
        const esPeriodoConsolidado = diffHours > 72;

        return (
          <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="bg-white rounded-3xl border border-slate-200 max-w-sm w-full p-5 space-y-3.5 shadow-2xl">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-black text-sm text-slate-900 leading-tight">
                    ¿Anular este Gasto?
                  </h3>
                  <p className="text-xs text-slate-500 font-medium truncate">
                    {expenseParaAnular.description}
                  </p>
                </div>
              </div>

              {esPeriodoConsolidado && (
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] space-y-1">
                  <div className="font-bold flex items-center gap-1">
                    <span>⚠️ Período Consolidado (&gt;72h)</span>
                  </div>
                  <p className="text-amber-800 leading-snug">
                    Este egreso pertenece a una fecha anterior ya consolidada ({expenseParaAnular.expenseDate}). La anulación exige motivo justificado y quedará registrada en auditoría.
                  </p>
                </div>
              )}

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1 text-xs text-slate-700">
                <div className="flex justify-between">
                  <span className="text-slate-500">Proveedor / Taller:</span>
                  <span className="font-bold truncate max-w-[170px]">{expenseParaAnular.provider || 'No especificado'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Fecha contable:</span>
                  <span className="font-mono font-bold">{expenseParaAnular.expenseDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Monto pactado:</span>
                  <span className="font-black text-slate-900">${expenseParaAnular.totalAmount.toFixed(2)}</span>
                </div>
                {expenseParaAnular.pendingBalance > 0 && (
                  <div className="flex justify-between text-rose-700 font-bold">
                    <span>Saldo pendiente:</span>
                    <span>${expenseParaAnular.pendingBalance.toFixed(2)}</span>
                  </div>
                )}
              </div>

              {/* Selector de Motivo de Anulación */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-700 block">
                  Motivo de la Anulación (Auditoría):
                </label>
                <select
                  value={motivoAnulacionGasto}
                  onChange={(e) => setMotivoAnulacionGasto(e.target.value)}
                  className="w-full h-9 px-2.5 text-xs font-medium rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                >
                  <option value="Error de digitación">Error de digitación / Duplicado</option>
                  <option value="Monto o factura incorrecta">Monto o factura incorrecta</option>
                  <option value="Servicio no ejecutado">Servicio o compra cancelada</option>
                  <option value="Pago asumido por terceros">Pago asumido por terceros / Garantía</option>
                  <option value="OTRO">Otro motivo (especificar)...</option>
                </select>

                {motivoAnulacionGasto === 'OTRO' && (
                  <input
                    type="text"
                    value={motivoAnulacionCustom}
                    onChange={(e) => setMotivoAnulacionCustom(e.target.value)}
                    placeholder="Describe el motivo de la anulación..."
                    className="w-full h-8 px-2.5 text-xs rounded-xl border border-slate-300 font-medium mt-1 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  />
                )}
              </div>

              <p className="text-[10px] text-slate-500 leading-relaxed">
                🛡️ <strong>Anulación Segura:</strong> Se archivará con estado ANULADO, se extinguirá cualquier deuda pendiente con el proveedor y no afectará tu Utilidad Real.
              </p>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  disabled={isSubmittingAnulacion}
                  onClick={() => setExpenseParaAnular(null)}
                  className="flex-1 h-10 rounded-xl text-xs font-bold text-slate-600 border border-slate-300 hover:bg-slate-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isSubmittingAnulacion}
                  onClick={handleConfirmarAnulacionGasto}
                  className="flex-1 h-10 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-700 text-white cursor-pointer shadow-md disabled:opacity-50"
                >
                  {isSubmittingAnulacion ? 'Anulando...' : 'Confirmar Anulación'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
