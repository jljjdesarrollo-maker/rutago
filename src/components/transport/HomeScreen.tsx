'use client';

import { isSuperAdmin as checkIsSuperAdmin } from '@/lib/roles';

import { useState, useEffect } from 'react';
import {
  History,
  Pencil,
  BookOpen,
  Truck,
  Users,
  LogOut,
  User,
  FileText,
  Database,
  Loader2,
  Share2,
  Settings,
  ArrowLeftRight,
  Ticket,
  Eye,
  Activity,
  ArrowRight,
  AlertCircle,
  Receipt,
  Calendar,
  Sparkles,
  TrendingUp,
  Clock,
  CheckCircle2,
  RefreshCw,
  ShieldCheck,
  FolderSync,
  Bus,
  Award,
  Wrench,
  Sparkle,
  Phone,
  ExternalLink,
  Building2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ChoferMantenimientoWidget } from './ChoferMantenimientoWidget';
import { SafeErrorBoundary } from './SafeErrorBoundary';
import { SocioMantenimientoWidget } from './SocioMantenimientoWidget';
import { AyudanteMantenimientoBar } from './AyudanteMantenimientoBar';
import { AyudanteJornadaCard } from './AyudanteJornadaCard';
import type { UserSession } from './types';
import { getOwnerExpenses, fetchOwnerExpensesFromApi } from '@/lib/owner-expenses-storage';
import { SuperAdminHomeScreen } from './SuperAdminHomeScreen';
import { getAllBuses, getActiveBusId, setActiveBus, subscribeToActiveBus } from '@/lib/fleet-storage';
import { getCurrentYearMonth, formatMonthName } from '@/lib/date-helpers';
import { getSuscripciones } from '@/lib/saas-storage';
import { getBusModuloMantenimientoActivo, isBusModuloMantenimientoConfigurado, syncMantenimientoConfigConServidor } from '@/lib/mantenimiento-estaciones';

interface HomeScreenProps {
  user: UserSession;
  isAdmin: boolean;
  onGoToForm?: () => void;
  onGoToCargaHistorica?: () => void;
  onGoToHistory: () => void;
  onGoToPersonal: () => void;
  onGoToReports: () => void;
  onGoToOperativo: () => void;
  onGoToVtConfig: () => void;
  onGoToCompare: () => void;
  onGoToBoletos: () => void;
  onGoToVentasReview: () => void;
  onGoToSocioGastos?: () => void;
  onGoToFlota?: () => void;
  onGoToBenchmark?: () => void;
  onGoToSaaSAdmin?: () => void;
  onGoToMantenimiento?: () => void;
  onLogout: () => void;
  recordCount: number;
}

export function HomeScreen({
  user,
  isAdmin,
  onGoToForm,
  onGoToCargaHistorica,
  onGoToHistory,
  onGoToPersonal,
  onGoToReports,
  onGoToOperativo,
  onGoToVtConfig,
  onGoToCompare,
  onGoToBoletos,
  onGoToVentasReview,
  onGoToSocioGastos,
  onGoToFlota,
  onGoToBenchmark,
  onGoToSaaSAdmin,
  onGoToMantenimiento,
  onLogout,
  recordCount,
}: HomeScreenProps) {
  const isSuperAdmin = checkIsSuperAdmin(user);

  // Soberanía del Socio Propietario / Administrador sobre el autobús asignado
  const isSocioOwner = Boolean(isSuperAdmin || isAdmin || user.rol === 'SOCIO' || user.rol === 'ADMIN');

  const [backupLoading, setBackupLoading] = useState(false);
  const [activeBusId, setActiveBusId] = useState<string>(() => {
    if (user?.busId) return user.busId;
    return getActiveBusId() || 'BUS-01';
  });

  // ─── Auto-enlace y Sincronización Multi-Tenant de Unidad para Socios ───
  useEffect(() => {
    const unsub = subscribeToActiveBus((bus) => {
      if (bus?.id) {
        setActiveBusId(bus.id);
      }
    });

    if (!isSocioOwner || !user) return unsub;

    const resolveSocioBus = async () => {
      if (user.busId) {
        if (getActiveBusId() !== user.busId) {
          const assigned = setActiveBus(user.busId);
          setActiveBusId(assigned.id);
        }
        return;
      }

      const sId = user.socioId || user.id;
      if (sId) {
        try {
          const res = await fetch(`/api/buses?socioId=${sId}`);
          if (res.ok) {
            const data = await res.json();
            const busList = data?.data || data;
            if (Array.isArray(busList) && busList.length > 0) {
              const miBus = busList[0];
              if (miBus?.id || miBus?.numeroDisco) {
                const assigned = setActiveBus(miBus.id || miBus.numeroDisco);
                setActiveBusId(assigned.id);
                if (typeof window !== 'undefined') {
                  const stored = localStorage.getItem('ct_session');
                  if (stored) {
                    try {
                      const parsed = JSON.parse(stored);
                      parsed.busId = assigned.id;
                      parsed.busNumero = assigned.numeroDisco;
                      parsed.busPlaca = assigned.placa;
                      localStorage.setItem('ct_session', JSON.stringify(parsed));
                    } catch {}
                  }
                }
              }
            }
          }
        } catch {
          // Mantener bus previo en caso de falla de red
        }
      }
    };

    resolveSocioBus();
    return unsub;
  }, [user?.id, user?.socioId, user?.busId, isSocioOwner]);
  const defaultYearMonth = getCurrentYearMonth();
  const currentYearMonth = defaultYearMonth;
  const [displayYearMonth, setDisplayYearMonth] = useState<string>(defaultYearMonth);

  const [ownerSummary, setOwnerSummary] = useState<{
    routeIncome: number;
    busExpenses: number;
    netProfit: number;
    pendingDebts: number;
  }>({
    routeIncome: 0,
    busExpenses: 0,
    netProfit: 0,
    pendingDebts: 0,
  });
  const [balanceStatus, setBalanceStatus] = useState<'loading' | 'live' | 'stale' | 'error'>('loading');
  const [isRefreshingBalance, setIsRefreshingBalance] = useState<boolean>(false);

  // Tripulación activa del día (Conductor y Ayudante)
  const [crewInfo, setCrewInfo] = useState<{
    conductorNombre: string;
    ayudanteNombre: string;
  }>({
    conductorNombre: 'No asignado',
    ayudanteNombre: 'No asignado',
  });

  // Estado de suscripción SaaS del bus activo
  const [saasSubscription, setSaasSubscription] = useState<{
    estado: 'ACTIVA' | 'POR_VENCER' | 'VENCIDA' | 'GRACIA';
    fechaProximoCorte: string;
    montoMensual: number;
  }>({
    estado: 'ACTIVA',
    fechaProximoCorte: '',
    montoMensual: 20.0,
  });

  const { toast } = useToast();

  const [moduloMantenimientoActivo, setModuloMantenimientoActivo] = useState<boolean>(() =>
    getBusModuloMantenimientoActivo(activeBusId)
  );

  useEffect(() => {
    setModuloMantenimientoActivo(getBusModuloMantenimientoActivo(activeBusId));
    syncMantenimientoConfigConServidor(activeBusId).then((cloud) => {
      if (cloud && typeof cloud.moduloActivo === 'boolean') {
        setModuloMantenimientoActivo(cloud.moduloActivo);
      }
    });

    const handleSync = (e: any) => {
      if (!e.detail || !e.detail.busId || e.detail.busId === activeBusId) {
        setModuloMantenimientoActivo(getBusModuloMantenimientoActivo(activeBusId));
      }
    };
    window.addEventListener('rg_mantenimiento_config_sync', handleSync);
    return () => window.removeEventListener('rg_mantenimiento_config_sync', handleSync);
  }, [activeBusId]);

  // Calcular balance financiero, tripulación y suscripción en vivo para el socio (EXCLUSIVO ADMIN / SOCIO)
  // El chofer y el ayudante no deben ejecutar estas consultas contables para garantizar entrada instantánea
  useEffect(() => {
    if (isSuperAdmin || !isSocioOwner) return;

    // 1. Cargar suscripción del bus activo
    try {
      const subs = getSuscripciones();
      const mySub = subs.find(s => s.busId === activeBusId);
      if (mySub) {
        setSaasSubscription({
          estado: mySub.estado,
          fechaProximoCorte: mySub.fechaProximoCorte,
          montoMensual: mySub.montoMensual || 20.0,
        });
      }
    } catch {
      /* ignore */
    }

    // 2. Cargar tripulación activa del día (/api/personas) aislada por socio
    const personasUrl = (user?.socioId) ? `/api/personas?socioId=${user.socioId}` : '/api/personas';
    fetch(personasUrl)
      .then(res => res.ok ? res.json() : [])
      .then(personas => {
        if (Array.isArray(personas)) {
          const conductor = personas.find((p: any) => p.rol === 'CONDUCTOR' && p.esActual);
          const ayudante = personas.find((p: any) => p.rol === 'AYUDANTE' && p.esActual);
          setCrewInfo({
            conductorNombre: conductor ? conductor.nombre : 'No asignado',
            ayudanteNombre: ayudante ? ayudante.nombre : 'No asignado',
          });
        }
      })
      .catch(() => {});

    // 3. Sincronización de balance financiero en vivo con Semáforo de Estado
    const calculateForMonth = (targetMonth: string, expenses: any[], income: number) => {
      const monthExpenses = expenses.filter(
        e => e.expenseDate && e.expenseDate.startsWith(targetMonth)
      );
      const expensesSocioDirecto = monthExpenses.filter(e => {
        const esDeRuta =
          e.origenPago === "AYUDANTE_RUTA" ||
          e.descontadoEnRuta === true ||
          e.comprobanteRef?.includes("AYUDANTE_RUTA") ||
          e.description?.includes("[RUTA-AYUDANTE]") ||
          (e.paymentMethod === "EFECTIVO" &&
            (e.description?.toLowerCase().includes("ayudante") ||
              e.description?.toLowerCase().includes("chofer") ||
              e.description?.toLowerCase().includes("liquidado") ||
              e.description?.toLowerCase().includes("ruta")));
        return !esDeRuta;
      });
      const totalCost = expensesSocioDirecto.reduce((sum, e) => sum + (e.totalAmount || 0), 0);
      const debts = expenses
        .filter(e => e.pendingBalance > 0)
        .reduce((sum, e) => sum + e.pendingBalance, 0);

      setOwnerSummary({
        routeIncome: income,
        busExpenses: totalCost,
        netProfit: income - totalCost,
        pendingDebts: debts,
      });
    };

    const runSync = async () => {
      setBalanceStatus("loading");
      try {
        // Cargar caché local primero para respuesta inmediata
        let localExpenses: any[] = [];
        try {
          localExpenses = getOwnerExpenses(activeBusId);
        } catch {}

        let expensesToUse = localExpenses;

        // Intentar traer los gastos oficiales de la API
        try {
          const onlineExpenses = await fetchOwnerExpensesFromApi(activeBusId);
          if (onlineExpenses && onlineExpenses.length > 0) {
            expensesToUse = onlineExpenses;
          }
        } catch {
          // Mantener caché local si falla la red
        }

        // Determinar mes objetivo: Para socios propietarios SIEMPRE el mes actual en curso (defaultYearMonth)
        // Solo para cuentas fundadoras en modo demo se permite saltar a meses anteriores si no hay datos actuales
        let targetMonth = defaultYearMonth;
        if (user?.esFundadorSaaS) {
          const hasCurrent = expensesToUse.some(e => e.expenseDate && e.expenseDate.startsWith(defaultYearMonth));
          if (!hasCurrent && expensesToUse.length > 0) {
            const monthsWithData = Array.from(
              new Set(expensesToUse.map((e: any) => e.expenseDate?.substring(0, 7)).filter(Boolean))
            ).sort().reverse();
            if (monthsWithData.length > 0 && typeof monthsWithData[0] === "string") {
              targetMonth = monthsWithData[0];
            }
          }
        }
        setDisplayYearMonth(targetMonth);

        // Consultar ingresos de ruta reales del mes aislados por socio y unidad
        let initialIncome = (user?.esFundadorSaaS && targetMonth === "2026-08") ? 3915.25 : 0;
        let apiSuccess = false;
        try {
          const effectiveSocioId = user?.socioId || user?.id || '';
          const busParam = activeBusId ? `&busId=${encodeURIComponent(activeBusId)}` : '';
          const socioParam = effectiveSocioId ? `&socioId=${encodeURIComponent(effectiveSocioId)}` : '';
          const res = await fetch(`/api/reports?type=mensual&month=${targetMonth}${busParam}${socioParam}`);
          if (res.ok) {
            const reportData = await res.json();
            if (reportData && reportData.totals) {
              const t = reportData.totals;
              const ay = t.entregaAyudante || 0;
              const cia = t.entregaCompania || 0;
              const total = t.totalEntregado || (ay + cia);
              initialIncome = total;
            }
            apiSuccess = true;
          }
        } catch {
          apiSuccess = false;
        }

        calculateForMonth(targetMonth, expensesToUse, initialIncome);
        setBalanceStatus(apiSuccess || expensesToUse.length > 0 ? "live" : "stale");
      } catch (err) {
        console.error("Error en balance:", err);
        setBalanceStatus("stale");
      } finally {
        setIsRefreshingBalance(false);
      }
    };

    runSync();  }, [isSuperAdmin, activeBusId, defaultYearMonth]);

  const handleAyudanteBoletosClick = () => {
    if (user.esActual === false) {
      toast({
        title: 'Turno no asignado',
        description: 'Actualmente no estás asignado como el ayudante activo del día. Solicita al Administrador que active tu turno en Personal.',
        variant: 'destructive',
      });
      return;
    }
    onGoToBoletos();
  };

  const handleBackup = async () => {
    setBackupLoading(true);
    try {
      const res = await fetch('/api/backup');
      if (!res.ok) throw new Error('Error al generar respaldo');
      const data = await res.json();
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `respaldo_${dateStr}.json`;

      if (navigator.share) {
        try {
          const file = new File([blob], filename, { type: 'application/json' });
          await navigator.share({
            title: 'Respaldo BD - RutaGo',
            text: `Respaldo completo de ${data.summary?.totalRecords || 0} registros`,
            files: [file],
          });
          return;
        } catch { /* user cancelled, fallback to download */ }
      }

      // Fallback: download directly
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Backup error:', err);
    } finally {
      setBackupLoading(false);
    }
  };

  if (isSuperAdmin) {
    return (
      <SuperAdminHomeScreen
        user={user}
        onGoToSaaSAdmin={onGoToSaaSAdmin}
        onGoToFlota={onGoToFlota}
        onGoToBenchmark={onGoToBenchmark}
        onGoToOperativo={onGoToOperativo}
        onGoToCompare={onGoToCompare}
        onGoToReports={onGoToReports}
        onGoToVentasReview={onGoToVentasReview}
        onGoToPersonal={onGoToPersonal}
        onGoToVtConfig={onGoToVtConfig}
        onBackup={handleBackup}
        backupLoading={backupLoading}
        onLogout={onLogout}
      />
    );
  }

  const activeBus = getAllBuses().find(b => b.id === getActiveBusId());
  const busNumero = activeBus?.numeroDisco || '01';

  return (
    <div className="flex flex-col min-h-[100dvh] bg-white">
      {/* ─── CABECERA SEGÚN ROL ─── */}
      {isSocioOwner ? (
        <header className="pt-6 pb-2 px-5 bg-white">
          {/* Fila 1: Saludo y Selector de Unidad */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="text-sm font-medium text-slate-500 block leading-tight">Hola,</span>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">
                {user.nombre || "Socio 01"}
              </h1>
            </div>

            {/* Pastilla del Autobús */}
            <div
              onClick={onGoToFlota}
              className="cursor-pointer flex items-center gap-2 bg-slate-50 hover:bg-slate-100 border border-slate-200/90 rounded-full px-3.5 py-1.5 shadow-2xs transition"
              title="Ficha técnica de la unidad"
            >
              <Bus className="w-4 h-4 text-emerald-800" />
              <span className="text-xs font-bold text-slate-800">
                Bus {busNumero} • {activeBus?.placa || "HAA-1234"}
              </span>
              <span
                className={`w-2 h-2 rounded-full ${
                  saasSubscription.estado === "ACTIVA"
                    ? "bg-emerald-500"
                    : saasSubscription.estado === "POR_VENCER"
                    ? "bg-amber-500 animate-pulse"
                    : "bg-rose-500 animate-pulse"
                }`}
                title={`SaaS: ${saasSubscription.estado}`}
              />
            </div>
          </div>

          {/* Tarjeta Ejecutiva de Balance (Idéntica a la maqueta) */}
          <div
            onClick={onGoToSocioGastos}
            className="cursor-pointer bg-[#053225] hover:bg-[#04281e] text-white rounded-3xl p-5 shadow-xl border border-emerald-900/60 transition active:scale-[0.99] relative overflow-hidden"
          >
            {/* Fila superior: Pastilla En Vivo + Botón Refresco */}
            <div className="flex items-center justify-between mb-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
                <span className={`w-2 h-2 rounded-full ${balanceStatus === "live" ? "bg-emerald-400 animate-pulse" : "bg-orange-400"}`} />
                <span>En Vivo • {formatMonthName(displayYearMonth)}</span>
              </span>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsRefreshingBalance(true);
                  setBalanceStatus("loading");
                  const target = displayYearMonth || defaultYearMonth;
                  const effectiveSocioId = user?.socioId || user?.id || '';
                  const busParam = activeBusId ? `&busId=${encodeURIComponent(activeBusId)}` : '';
                  const socioParam = effectiveSocioId ? `&socioId=${encodeURIComponent(effectiveSocioId)}` : '';
                  Promise.all([
                    fetchOwnerExpensesFromApi(activeBusId, effectiveSocioId).catch(() => []),
                    fetch(`/api/reports?type=mensual&month=${target}${busParam}${socioParam}`).then(r => r.ok ? r.json() : null).catch(() => null)
                  ]).then(([expensesRes, reportRes]) => {
                    const expenses = (expensesRes && expensesRes.length > 0) ? expensesRes : getOwnerExpenses(activeBusId);
                    let inc = (user?.esFundadorSaaS && target === "2026-08") ? 3915.25 : 0;
                    if (reportRes && reportRes.totals) {
                      const t = reportRes.totals;
                      const total = t.totalEntregado || ((t.entregaAyudante || 0) + (t.entregaCompania || 0));
                      if (total > 0 || target !== "2026-08") inc = total;
                    }
                    const monthExpenses = expenses.filter((e: any) => e.expenseDate && e.expenseDate.startsWith(target));
                    const expensesSocioDirecto = monthExpenses.filter((e: any) => {
                      const esDeRuta =
                        e.origenPago === "AYUDANTE_RUTA" ||
                        e.descontadoEnRuta === true ||
                        e.comprobanteRef?.includes("AYUDANTE_RUTA") ||
                        e.description?.includes("[RUTA-AYUDANTE]") ||
                        (e.paymentMethod === "EFECTIVO" &&
                          (e.description?.toLowerCase().includes("ayudante") ||
                            e.description?.toLowerCase().includes("chofer") ||
                            e.description?.toLowerCase().includes("liquidado") ||
                            e.description?.toLowerCase().includes("ruta")));
                      return !esDeRuta;
                    });
                    const totalCost = expensesSocioDirecto.reduce((sum: number, e: any) => sum + (e.totalAmount || 0), 0);
                    const debts = expenses.filter((e: any) => e.pendingBalance > 0).reduce((sum: number, e: any) => sum + e.pendingBalance, 0);
                    setOwnerSummary({ routeIncome: inc, busExpenses: totalCost, netProfit: inc - totalCost, pendingDebts: debts });
                    setBalanceStatus("live");
                  }).catch(() => {
                    setBalanceStatus("stale");
                  }).finally(() => {
                    setIsRefreshingBalance(false);
                  });
                }}
                disabled={isRefreshingBalance}
                className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-emerald-200 transition cursor-pointer"
                title="Actualizar balance en vivo"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingBalance ? "animate-spin text-amber-300" : ""}`} />
              </button>
            </div>

            {/* Número Rey: Ganancia en Limpio */}
            <div className={`text-center py-2 transition-opacity duration-300 ${balanceStatus === "loading" ? "opacity-70" : "opacity-100"}`}>
              <div className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight drop-shadow-sm">
                ${ownerSummary.netProfit.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-xs sm:text-sm font-black uppercase tracking-widest text-emerald-200/90 mt-1">
                EN LIMPIO
              </div>
            </div>

            {/* Línea divisoria y Métricas Secundarias */}
            <div className={`mt-5 pt-3.5 border-t border-emerald-800/60 flex items-center justify-between text-xs text-emerald-200/90 px-1 transition-opacity duration-300 ${balanceStatus === "loading" ? "opacity-70" : "opacity-100"}`}>
              <div>
                <span>Ruta: </span>
                <strong className="text-white font-bold">${ownerSummary.routeIncome.toFixed(2)}</strong>
              </div>
              <div>
                <span>Gastos: </span>
                <strong className="text-white font-bold">${ownerSummary.busExpenses.toFixed(2)}</strong>
              </div>
            </div>
          </div>

          {/* Tripulación del Día Compacta */}
          <div
            onClick={onGoToPersonal}
            className="mt-3 cursor-pointer bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-2xl px-3.5 py-2 flex items-center justify-between text-xs transition"
          >
            <div className="flex items-center gap-2 truncate">
              <Users className="w-3.5 h-3.5 text-emerald-800 shrink-0" />
              <span className="font-semibold text-slate-700">Tripulación:</span>
              <span className="text-slate-600 truncate">
                {crewInfo.conductorNombre} (Chofer) • {crewInfo.ayudanteNombre} (Ayudante)
              </span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
          </div>
        </header>
      ) : user.rol === "CONDUCTOR" ? (
        /* Header Minimalista para Conductor (Coherente con la del Socio) */
        <header className="pt-6 pb-2 px-5 bg-white">
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="text-sm font-medium text-slate-500 block leading-tight">Hola,</span>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">
                {user.nombre || "Conductor"}
              </h1>
            </div>

            {/* Pastilla del Autobús */}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/90 rounded-full px-3.5 py-1.5 shadow-2xs">
              <Bus className="w-4 h-4 text-emerald-800" />
              <span className="text-xs font-bold text-slate-800">
                Bus {busNumero} • {activeBus?.placa || "HAA-1234"}
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500" title="En Turno" />
            </div>
          </div>

          {/* Compañero de Ruta Compacto */}
          <div className="mt-1 bg-slate-50 border border-slate-200/80 rounded-2xl px-3.5 py-2 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 truncate">
              <Users className="w-3.5 h-3.5 text-emerald-800 shrink-0" />
              <span className="font-semibold text-slate-700">Compañero:</span>
              <span className="text-slate-600 truncate">
                {crewInfo.ayudanteNombre || "Sin asignar"} (Ayudante en Caja)
              </span>
            </div>
            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-full">
              En Ruta
            </span>
          </div>
        </header>
      ) : (
        /* Header Minimalista para Ayudante (Coherente con Conductor y Socio) */
        <header className="pt-6 pb-2 px-5 bg-white">
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="text-sm font-medium text-slate-500 block leading-tight">Hola,</span>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">
                {user.nombre || "Ayudante"}
              </h1>
            </div>

            {/* Pastilla del Autobús */}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/90 rounded-full px-3.5 py-1.5 shadow-2xs">
              <Bus className="w-4 h-4 text-emerald-800" />
              <span className="text-xs font-bold text-slate-800">
                Bus {busNumero} • {activeBus?.placa || "HAA-1234"}
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500" title="En Turno" />
            </div>
          </div>

          {/* Compañero de Ruta (Chofer) Compacto */}
          <div className="mt-1 bg-slate-50 border border-slate-200/80 rounded-2xl px-3.5 py-2 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 truncate">
              <Users className="w-3.5 h-3.5 text-emerald-800 shrink-0" />
              <span className="font-semibold text-slate-700">Tripulación:</span>
              <span className="text-slate-600 truncate">
                {crewInfo.conductorNombre || "Sin asignar"} (Chofer al Volante)
              </span>
            </div>
            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-full">
              En Ruta
            </span>
          </div>
        </header>
      )}

      {/* Main Actions */}
      <main className="flex-1 px-5 pb-28 flex flex-col gap-4">
        {/* ─── VISTA DEL SOCIO: CUADRÍCULA EJECUTIVA 2x2 (IDÉNTICA A LA MAQUETA) ─── */}
        {isSocioOwner && (
          <div className="flex flex-col gap-4">
            {/* Cuadrícula 2x2 */}
            <div className="grid grid-cols-2 gap-3.5 mt-1">
              {/* 1. Liquidación de Hoy */}
              <button
                type="button"
                onClick={onGoToHistory}
                className="cursor-pointer bg-[#053225] hover:bg-[#073b2d] active:scale-[0.98] text-white rounded-3xl p-4 sm:p-5 text-left transition shadow-md flex flex-col justify-between min-h-[115px] border border-emerald-900/60"
              >
                <div className="w-9 h-9 rounded-2xl bg-white/10 flex items-center justify-center text-emerald-300">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-sm sm:text-base font-bold block leading-snug">Liquidación de Hoy</span>
                  <span className="text-[11px] text-emerald-200/70 font-medium">Caja y vueltas</span>
                </div>
              </button>

              {/* 2. Gastos del Bus */}
              <button
                type="button"
                onClick={onGoToSocioGastos}
                className="cursor-pointer bg-[#053225] hover:bg-[#073b2d] active:scale-[0.98] text-white rounded-3xl p-4 sm:p-5 text-left transition shadow-md flex flex-col justify-between min-h-[115px] border border-emerald-900/60"
              >
                <div className="w-9 h-9 rounded-2xl bg-white/10 flex items-center justify-center text-emerald-300">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-sm sm:text-base font-bold block leading-snug">Gastos del Bus</span>
                  <span className="text-[11px] text-emerald-200/70 font-medium">Compras y deudas</span>
                </div>
              </button>

              {/* 3. Mantenimiento */}
              <button
                type="button"
                onClick={onGoToMantenimiento}
                className="cursor-pointer bg-[#053225] hover:bg-[#073b2d] active:scale-[0.98] text-white rounded-3xl p-4 sm:p-5 text-left transition shadow-md flex flex-col justify-between min-h-[115px] border border-emerald-900/60"
              >
                <div className="w-9 h-9 rounded-2xl bg-white/10 flex items-center justify-center text-emerald-300">
                  <Wrench className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-sm sm:text-base font-bold block leading-snug">Mantenimiento</span>
                  <span className="text-[11px] text-emerald-200/70 font-medium">Aceite y filtros</span>
                </div>
              </button>

              {/* 4. Reportes e Informes */}
              <button
                type="button"
                onClick={onGoToReports}
                className="cursor-pointer bg-[#053225] hover:bg-[#073b2d] active:scale-[0.98] text-white rounded-3xl p-4 sm:p-5 text-left transition shadow-md flex flex-col justify-between min-h-[115px] border border-emerald-900/60"
              >
                <div className="w-9 h-9 rounded-2xl bg-white/10 flex items-center justify-center text-emerald-300">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-sm sm:text-base font-bold block leading-snug">Reportes e Informes</span>
                  <span className="text-[11px] text-emerald-200/70 font-medium">PDF y balances</span>
                </div>
              </button>
            </div>

            {/* ─── RADAR Y ASESORÍA PATRIMONIAL DE VENTANAS OPERATIVAS (SOCIO PROPIETARIO) ─── */}
            <SocioMantenimientoWidget
              propBusId={activeBusId}
              onGoToMantenimiento={onGoToMantenimiento}
            />

            {/* SECCIÓN 2: AUDITORÍA Y RENDIMIENTO AVANZADO */}
            <div className="mt-2">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-emerald-800" />
                  <span>Análisis Operativo y Auditoría</span>
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {/* Cumplimiento Frecuencias */}
                <Card
                  onClick={onGoToOperativo}
                  className="cursor-pointer hover:shadow-md transition-shadow rounded-2xl border border-gray-200 bg-white"
                >
                  <CardContent className="p-3.5 flex flex-col justify-between h-full">
                    <div className="w-9 h-9 rounded-xl bg-green-50 text-green-700 flex items-center justify-center mb-2">
                      <Activity className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-xs sm:text-sm text-[#3A3A3A] leading-tight">Cumplimiento Frecuencias</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">Vueltas vs turnos caídos</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Comparar Frecuencias */}
                <Card
                  onClick={onGoToCompare}
                  className="cursor-pointer hover:shadow-md transition-shadow rounded-2xl border border-gray-200 bg-white"
                >
                  <CardContent className="p-3.5 flex flex-col justify-between h-full">
                    <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center mb-2">
                      <ArrowLeftRight className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-xs sm:text-sm text-[#3A3A3A] leading-tight">Comparar Frecuencias</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">¿Qué turno rinde más?</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Benchmark y Auditoría de Boletos */}
              <div className="grid grid-cols-1 gap-2 mt-2">
                {onGoToBenchmark && (
                  <Card
                    onClick={onGoToBenchmark}
                    className="cursor-pointer hover:shadow-md transition-shadow rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50/40 to-white"
                  >
                    <CardContent className="flex items-center justify-between p-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-800 shrink-0">
                          <Award className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="font-bold text-xs sm:text-sm text-[#3A3A3A]">Benchmark de Flota & IPF</p>
                            <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 tracking-wide">
                              Simétrico
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-500">Ranking Troncal (45 pax) vs Alimentadores (28 pax)</p>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-gray-400 shrink-0" />
                    </CardContent>
                  </Card>
                )}

                {onGoToVentasReview && (
                  <Card
                    onClick={onGoToVentasReview}
                    className="cursor-pointer hover:shadow-md transition-shadow rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50/40 to-white"
                  >
                    <CardContent className="flex items-center justify-between p-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700 shrink-0">
                          <Eye className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-bold text-xs sm:text-sm text-[#3A3A3A]">Auditoría y Revisión de Boletos</p>
                          <p className="text-[11px] text-gray-500">Boletos vendidos por fecha y frecuencia</p>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-gray-400 shrink-0" />
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>

            {/* SECCIÓN 3: CONFIGURACIÓN Y REGULARIZACIÓN */}
            <div className="mt-2">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Settings className="w-3.5 h-3.5 text-slate-700" />
                  <span>Configuración y Regularización</span>
                </p>
              </div>

              <div className="grid grid-cols-1 gap-2">
                {/* Gestión de Personal */}
                <Card
                  onClick={onGoToPersonal}
                  className="cursor-pointer hover:shadow-md transition-shadow rounded-2xl border border-gray-200 bg-white"
                >
                  <CardContent className="flex items-center justify-between p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-gray-700">
                        <Users className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-bold text-xs sm:text-sm text-[#3A3A3A]">Personal (Choferes y Ayudantes)</p>
                        <p className="text-[11px] text-gray-500">Asignar turno activo de hoy y claves PIN</p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-400" />
                  </CardContent>
                </Card>

                {/* Ficha de Mi Unidad */}
                <Card
                  onClick={onGoToFlota}
                  className="cursor-pointer hover:shadow-md transition-shadow rounded-2xl border border-blue-200 bg-white"
                >
                  <CardContent className="flex items-center justify-between p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-700">
                        <Bus className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="font-bold text-xs sm:text-sm text-[#3A3A3A]">
                            Mi Autobús (Bus {busNumero})
                          </p>
                          <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 tracking-wide">
                            {activeBus?.placa || "HAA-1234"}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-500">Ficha técnica, odómetro y notas de mantenimiento</p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-400" />
                  </CardContent>
                </Card>

                {/* Carga Histórica de Cuadernos */}
                {onGoToCargaHistorica && (
                  <Card
                    onClick={onGoToCargaHistorica}
                    className="cursor-pointer hover:shadow-md transition-shadow rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50/50 to-white"
                  >
                    <CardContent className="flex items-center justify-between p-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center text-amber-800 shrink-0">
                          <BookOpen className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="font-bold text-xs sm:text-sm text-[#3A3A3A]">Carga Histórica de Cuadernos</p>
                            <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 tracking-wide">
                              Poner al día
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-500">Transcribir liquidaciones y vueltas de meses anteriores</p>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-gray-400 shrink-0" />
                    </CardContent>
                  </Card>
                )}

                {/* Respaldo Seguro de la Base de Datos */}
                <Card className="rounded-2xl border border-gray-200 bg-white">
                  <CardContent className="flex items-center gap-3 p-3">
                    <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-gray-700 shrink-0">
                      <Database className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-xs sm:text-sm text-[#3A3A3A]">Copia de Seguridad</p>
                      <p className="text-[11px] text-gray-500">Descarga un archivo JSON de respaldo</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleBackup}
                      disabled={backupLoading}
                      className="rounded-xl border-gray-300 text-xs font-bold shrink-0 cursor-pointer"
                    >
                      {backupLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Database className="w-3.5 h-3.5 mr-1 text-gray-600" />}
                      <span>Descargar</span>
                    </Button>
                  </CardContent>
                </Card>

                {/* Cerrar Sesión */}
                <Card
                  onClick={onLogout}
                  className="cursor-pointer hover:bg-rose-50/50 transition rounded-2xl border border-gray-200 bg-white"
                >
                  <CardContent className="flex items-center justify-between p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
                        <LogOut className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-bold text-xs sm:text-sm text-[#3A3A3A]">Cerrar Sesión</p>
                        <p className="text-[11px] text-gray-500">Salir de la cuenta de {user.nombre}</p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-400" />
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}

        {/* ─── VISTA PARA AYUDANTE (#053225, HERO CARD Y CUADRÍCULA 2x2) ─── */}
        {!isSocioOwner && user.rol === "AYUDANTE" && (
          <div className="flex flex-col gap-4">
            {/* 1. Hero Card del Ayudante (Número Rey de Caja de Ruta o Iniciar Turno) */}
            {onGoToBoletos && (
              <AyudanteJornadaCard
                user={user}
                busNumero={busNumero}
                onGoToBoletos={handleAyudanteBoletosClick}
              />
            )}

            {/* 2. Barra de Supervisión de Odómetro y Novedad Mecánica */}
            <AyudanteMantenimientoBar
              busId={activeBusId}
              busNumero={busNumero}
            />

            {/* 3. Cuadrícula Táctica 2x2 para Ayudante (#053225) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-emerald-800" />
                  <span>Acciones Tácticas de Ruta</span>
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                {/* 1. Emitir Boletos */}
                <button
                  type="button"
                  onClick={handleAyudanteBoletosClick}
                  className="cursor-pointer bg-[#053225] hover:bg-[#073b2d] active:scale-[0.98] text-white rounded-3xl p-4 sm:p-5 text-left transition shadow-md flex flex-col justify-between min-h-[115px] border border-emerald-900/60"
                >
                  <div className="w-9 h-9 rounded-2xl bg-white/10 flex items-center justify-center text-emerald-300">
                    <Ticket className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-sm sm:text-base font-bold block leading-snug">Emitir Boletos</span>
                    <span className="text-[11px] text-emerald-200/70 font-medium">Cobro en ruta</span>
                  </div>
                </button>

                {/* 2. Arqueo y Gastos */}
                <button
                  type="button"
                  onClick={handleAyudanteBoletosClick}
                  className="cursor-pointer bg-[#053225] hover:bg-[#073b2d] active:scale-[0.98] text-white rounded-3xl p-4 sm:p-5 text-left transition shadow-md flex flex-col justify-between min-h-[115px] border border-emerald-900/60"
                >
                  <div className="w-9 h-9 rounded-2xl bg-white/10 flex items-center justify-center text-emerald-300">
                    <Receipt className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-sm sm:text-base font-bold block leading-snug">Arqueo y Gastos</span>
                    <span className="text-[11px] text-emerald-200/70 font-medium">Cuadre y diésel</span>
                  </div>
                </button>

                {/* 3. Vueltas del Día */}
                <button
                  type="button"
                  onClick={handleAyudanteBoletosClick}
                  className="cursor-pointer bg-[#053225] hover:bg-[#073b2d] active:scale-[0.98] text-white rounded-3xl p-4 sm:p-5 text-left transition shadow-md flex flex-col justify-between min-h-[115px] border border-emerald-900/60"
                >
                  <div className="w-9 h-9 rounded-2xl bg-white/10 flex items-center justify-center text-emerald-300">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-sm sm:text-base font-bold block leading-snug">Vueltas del Día</span>
                    <span className="text-[11px] text-emerald-200/70 font-medium">Frecuencias VT</span>
                  </div>
                </button>

                {/* 4. Mis Registros */}
                <button
                  type="button"
                  onClick={onGoToHistory}
                  className="cursor-pointer bg-[#053225] hover:bg-[#073b2d] active:scale-[0.98] text-white rounded-3xl p-4 sm:p-5 text-left transition shadow-md flex flex-col justify-between min-h-[115px] border border-emerald-900/60 relative"
                >
                  <div className="w-9 h-9 rounded-2xl bg-white/10 flex items-center justify-center text-emerald-300">
                    <History className="w-5 h-5" />
                  </div>
                  <span className="absolute top-4 right-4 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-black px-2 py-0.5 rounded-full">
                    {recordCount}
                  </span>
                  <div>
                    <span className="text-sm sm:text-base font-bold block leading-snug">Mis Registros</span>
                    <span className="text-[11px] text-emerald-200/70 font-medium">Historial archivado</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Configuración y Salida */}
            <div className="mt-2">
              <Card
                onClick={onLogout}
                className="cursor-pointer hover:bg-rose-50/50 transition rounded-2xl border border-gray-200 bg-white"
              >
                <CardContent className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
                      <LogOut className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-xs sm:text-sm text-[#3A3A3A]">Cerrar Sesión</p>
                      <p className="text-[11px] text-gray-500">Salir de la cuenta de {user.nombre}</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* ─── VISTA PARA CONDUCTOR ─── */}
        {!isSocioOwner && user.rol === "CONDUCTOR" && (
          <div className="flex flex-col gap-4">
            {onGoToMantenimiento && moduloMantenimientoActivo && (
              <div id="chofer-mantenimiento-section" className="scroll-mt-4">
                <SafeErrorBoundary
                  fallbackTitle="Panel de Mantenimiento del Conductor"
                  onGoHome={() => {}}
                >
                  <ChoferMantenimientoWidget
                    user={user}
                    onVerMas={onGoToHistory}
                    onGoToHistory={onGoToHistory}
                    recordCount={recordCount}
                  />
                </SafeErrorBoundary>
              </div>
            )}
            {/* Configuración y Salida */}
            <div className="mt-2">
              <Card
                onClick={onLogout}
                className="cursor-pointer hover:bg-rose-50/50 transition rounded-2xl border border-gray-200 bg-white"
              >
                <CardContent className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
                      <LogOut className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-xs sm:text-sm text-[#3A3A3A]">Cerrar Sesión</p>
                      <p className="text-[11px] text-gray-500">Salir de la cuenta de {user.nombre}</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                </CardContent>
              </Card>
            </div>
          </div>
        )}
        </main>

      <aside aria-label="Acciones Rápidas" className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-gray-200/90 px-4 py-2.5 shadow-[0_-4px_25px_rgba(0,0,0,0.08)]">
        <div className="max-w-md mx-auto flex items-center gap-2">
          {/* Si es AYUDANTE: Botón táctico primario para emisión de boletos en ruta */}
          {user.rol === 'AYUDANTE' && onGoToBoletos && (
            <Button
              onClick={handleAyudanteBoletosClick}
              className="flex-1 h-12 rounded-2xl bg-[#053225] hover:bg-[#073b2d] text-white font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/20 active:scale-95 transition cursor-pointer border border-emerald-800/60"
            >
              <Ticket className="w-5 h-5 text-emerald-300" />
              <span>Emitir Boletos (Jornada)</span>
            </Button>
          )}

          {/* Si es CONDUCTOR: Acceso rápido a Mantenimiento y Registros de Turno */}
          {user.rol === 'CONDUCTOR' && (
            <>
              <Button
                onClick={() => {
                  const elem = document.getElementById('chofer-mantenimiento-section');
                  if (elem) {
                    elem.scrollIntoView({ behavior: 'smooth' });
                  } else if (onGoToMantenimiento) {
                    onGoToMantenimiento();
                  }
                }}
                className="flex-1 h-12 rounded-2xl bg-[#053225] hover:bg-[#073b2d] text-white font-black text-xs uppercase tracking-wide flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950/20 active:scale-95 transition cursor-pointer border border-emerald-800/60"
              >
                <Wrench className="w-4 h-4 text-emerald-300" />
                <span>Mantenimiento</span>
              </Button>
              <Button
                onClick={onGoToHistory}
                variant="outline"
                className="flex-1 h-12 rounded-2xl border-gray-300 text-gray-800 font-bold text-xs uppercase tracking-wide flex items-center justify-center gap-1.5 active:scale-95 transition cursor-pointer"
              >
                <History className="w-4 h-4 text-gray-600" />
                <span>Mis Vueltas</span>
              </Button>
            </>
          )}

          {/* Si es SOCIO / ADMIN: Acceso directo a Gastos del Bus y Mantenimiento */}
          {isSocioOwner && (
            <>
              {onGoToSocioGastos && (
                <Button
                  onClick={onGoToSocioGastos}
                  className="flex-1 h-12 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md shadow-emerald-700/20 active:scale-95 transition cursor-pointer"
                >
                  <Receipt className="w-4 h-4" />
                  <span>Gastos del Bus</span>
                </Button>
              )}
              {onGoToMantenimiento && (
                <Button
                  onClick={onGoToMantenimiento}
                  className="flex-1 h-12 rounded-2xl bg-slate-900 hover:bg-black text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md shadow-slate-900/20 active:scale-95 transition cursor-pointer"
                >
                  <Wrench className="w-4 h-4 text-amber-400" />
                  <span>Mantenimiento</span>
                </Button>
              )}
              {isSuperAdmin && onGoToSaaSAdmin && (
                <Button
                  onClick={onGoToSaaSAdmin}
                  className="h-12 w-12 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black flex items-center justify-center shrink-0 shadow-md shadow-amber-500/20 active:scale-95 transition cursor-pointer"
                  title="Panel SaaS"
                >
                  <Building2 className="w-5 h-5" />
                </Button>
              )}
            </>
          )}
        </div>
      </aside>
    </div>
  );
}
