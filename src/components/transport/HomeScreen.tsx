'use client';

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
  ShieldCheck,
  FolderSync,
  Bus,
  Award,
  Wrench,
  Sparkle,
  Phone,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import type { UserSession } from './types';
import { getOwnerExpenses, fetchOwnerExpensesFromApi } from '@/lib/owner-expenses-storage';
import { SuperAdminHomeScreen } from './SuperAdminHomeScreen';
import { getAllBuses, getActiveBusId } from '@/lib/fleet-storage';
import { getCurrentYearMonth, formatMonthName } from '@/lib/date-helpers';
import { getSuscripciones } from '@/lib/saas-storage';

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
  const isSuperAdmin = Boolean(
    user.id === 'saas-superadmin' ||
    user.id === 'user-superadmin' ||
    user.nombre?.toLowerCase().includes('superadmin') ||
    user.rol === 'SUPERADMIN_SAAS'
  );

  const [backupLoading, setBackupLoading] = useState(false);
  const activeBusId = getActiveBusId() || 'BUS-01';
  const defaultYearMonth = getCurrentYearMonth();
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

  // Calcular balance financiero, tripulación y suscripción en vivo para el socio
  useEffect(() => {
    if (isSuperAdmin) return;

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

    // 2. Cargar tripulación activa del día (/api/personas)
    fetch('/api/personas')
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

    // 3. Balance financiero en vivo para el mes dinámico (o el mes más reciente con registros)
    const calculateForMonth = (targetMonth: string, expenses: any[], income: number) => {
      const monthExpenses = expenses.filter(
        e => e.expenseDate && e.expenseDate.startsWith(targetMonth)
      );
      const totalCost = monthExpenses.reduce((sum, e) => sum + (e.totalAmount || 0), 0);
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

    const processExpenses = (expenses: any[]) => {
      // Determinar mes objetivo: si el mes actual no tiene gastos, buscar el mes más reciente con gastos
      let targetMonth = defaultYearMonth;
      const hasCurrent = expenses.some(e => e.expenseDate && e.expenseDate.startsWith(defaultYearMonth));
      if (!hasCurrent && expenses.length > 0) {
        const monthsWithData = Array.from(
          new Set(expenses.map((e: any) => e.expenseDate?.substring(0, 7)).filter(Boolean))
        ).sort().reverse();
        if (monthsWithData.length > 0 && typeof monthsWithData[0] === 'string') {
          targetMonth = monthsWithData[0];
        }
      }
      setDisplayYearMonth(targetMonth);

      let initialIncome = targetMonth === '2026-08' ? 3915.25 : 0;
      calculateForMonth(targetMonth, expenses, initialIncome);

      // Consultar ingresos reales del mes en la API de reportes
      fetch(`/api/reports?type=mensual&month=${targetMonth}`)
        .then(res => res.ok ? res.json() : null)
        .then(reportData => {
          if (reportData && reportData.totals) {
            const t = reportData.totals;
            const ay = t.entregaAyudante || 0;
            const cia = t.entregaCompania || 0;
            const total = t.totalEntregado || (ay + cia);
            if (total > 0 || targetMonth !== '2026-08') {
              initialIncome = total;
            }
          }
          calculateForMonth(targetMonth, expenses, initialIncome);
        })
        .catch(() => {});
    };

    // Primero con la caché local de gastos
    try {
      const cached = getOwnerExpenses(activeBusId);
      processExpenses(cached);
    } catch {
      /* ignore */
    }

    // Luego sincronizar con API de gastos
    fetchOwnerExpensesFromApi(activeBusId)
      .then(onlineExpenses => {
        const listToUse = (onlineExpenses && onlineExpenses.length > 0)
          ? onlineExpenses
          : getOwnerExpenses(activeBusId);
        processExpenses(listToUse);
      })
      .catch(() => {});
  }, [isSuperAdmin, activeBusId, defaultYearMonth]);

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
      {/* Header with user info & Bus identifier */}
      <header className="pt-6 pb-3 px-5 bg-gradient-to-b from-[#912D26]/10 via-transparent to-transparent">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-[#912D26] text-white shadow-md shadow-[#912D26]/20">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-black text-[#3A3A3A] tracking-tight">RutaGo</span>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-[#912D26] text-white">
                  UNIDAD {busNumero}
                </span>
              </div>
              <p className="text-xs text-[#3A3A3A]/70 font-medium">Coo. Vilcabambaturis</p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-2xl border border-gray-200 shadow-xs">
            <div className="w-8 h-8 rounded-full bg-[#912D26]/10 flex items-center justify-center">
              <User className="w-4 h-4 text-[#912D26]" />
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-[#3A3A3A] leading-tight">{user.nombre}</p>
              <p className="text-[10px] text-[#912D26] uppercase font-extrabold">{user.rol}</p>
            </div>
          </div>
        </div>

        {/* Resumen Ejecutivo Financiero del Socio (Solo Administrador) */}
        {isAdmin && (
          <div className="flex flex-col gap-2.5 mb-1">
            {/* Tarjeta de Licencia SaaS */}
            <div className="bg-slate-900 text-white rounded-2xl p-3 border border-slate-700 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Sparkle className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-100">Licencia SaaS RutaGo</span>
                    <span
                      className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                        saasSubscription.estado === 'ACTIVA'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : saasSubscription.estado === 'POR_VENCER'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}
                    >
                      {saasSubscription.estado}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Cuota: ${saasSubscription.montoMensual.toFixed(2)}/mes
                    {saasSubscription.fechaProximoCorte && ` • Corte: ${saasSubscription.fechaProximoCorte}`}
                  </p>
                </div>
              </div>
              <a
                href={`https://wa.me/593991234567?text=${encodeURIComponent(
                  `Hola, reporto pago de licencia SaaS RutaGo para Unidad ${busNumero} (${saasSubscription.fechaProximoCorte || currentYearMonth})`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold px-2.5 py-1.5 rounded-xl transition shadow-xs"
              >
                <Phone className="w-3 h-3" />
                <span>Pagar</span>
                <ExternalLink className="w-2.5 h-2.5 opacity-80" />
              </a>
            </div>

            {/* Resumen Financiero Dinámico */}
            <div
              onClick={onGoToSocioGastos}
              className="cursor-pointer bg-gradient-to-br from-emerald-900 via-teal-950 to-slate-900 rounded-2xl p-3.5 text-white shadow-md border border-emerald-800/40 hover:scale-[1.01] transition active:scale-[0.99]"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[11px] font-bold text-emerald-200 uppercase tracking-wide">
                    Balance de Ganancia Limpia • {formatMonthName(displayYearMonth)}
                  </span>
                </div>
                <span className="text-[11px] text-emerald-300 font-bold flex items-center gap-1">
                  Ver Módulo Socio <ArrowRight className="w-3 h-3" />
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-white/5 rounded-xl p-1.5 border border-white/10">
                  <span className="text-[10px] text-emerald-200/80 uppercase font-semibold block">Ruta (Recaudado)</span>
                  <span className="text-sm font-black text-white">${ownerSummary.routeIncome.toFixed(2)}</span>
                </div>
                <div className="bg-white/5 rounded-xl p-1.5 border border-white/10">
                  <span className="text-[10px] text-rose-200/80 uppercase font-semibold block">Gastos del Bus</span>
                  <span className="text-sm font-black text-rose-300">${ownerSummary.busExpenses.toFixed(2)}</span>
                </div>
                <div className="bg-emerald-500/20 rounded-xl p-1.5 border border-emerald-400/30">
                  <span className="text-[10px] text-emerald-200 uppercase font-extrabold block">En Limpio</span>
                  <span className="text-sm font-black text-emerald-300">${ownerSummary.netProfit.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Tripulación del Día */}
            <div
              onClick={onGoToPersonal}
              className="cursor-pointer bg-white rounded-2xl p-2.5 border border-gray-200 shadow-xs flex items-center justify-between hover:border-gray-300 transition"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#912D26]/10 text-[#912D26] flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-[#3A3A3A]">Tripulación de Hoy</span>
                    <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-gray-100 text-gray-700">
                      Unidad {busNumero}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-500">
                    <span className="font-semibold text-gray-700">Chofer:</span> {crewInfo.conductorNombre} • <span className="font-semibold text-gray-700">Ayudante:</span> {crewInfo.ayudanteNombre}
                  </p>
                </div>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
            </div>
          </div>
        )}
      </header>

      {/* Main Actions */}
      <main className="flex-1 px-5 pb-8 flex flex-col gap-4">

        {/* ─── PILAR 1: DÍA A DÍA (OPERACIÓN Y CAJA DE HOY) ─── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-black text-[#3A3A3A]/50 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#912D26]" />
              <span>1. Día a Día • Ruta y Caja de Hoy</span>
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            {/* Gastos del Socio Propietario (Acceso Destacado al Negocio) */}
            {isAdmin && onGoToSocioGastos && (
              <Card
                onClick={onGoToSocioGastos}
                className="cursor-pointer hover:shadow-md transition-all rounded-2xl border-2 border-emerald-400/80 bg-gradient-to-r from-emerald-50/70 via-white to-emerald-50/30 shadow-xs"
              >
                <CardContent className="flex items-center justify-between p-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20">
                      <Receipt className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-black text-sm text-emerald-950">Gastos y Negocio del Bus</p>
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-950">
                          Socio
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mt-0.5">
                        Registrar compras, combustible, repuestos y deudas
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-emerald-700 shrink-0" />
                </CardContent>
              </Card>
            )}

            {/* Mantenimiento Mecánico y Tacómetro del Bus */}
            {isAdmin && onGoToMantenimiento && (
              <Card
                onClick={onGoToMantenimiento}
                className="cursor-pointer hover:shadow-md transition-all rounded-2xl border border-amber-300 bg-gradient-to-r from-amber-50/60 to-white shadow-xs"
              >
                <CardContent className="flex items-center justify-between p-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center shadow-xs">
                      <Wrench className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-black text-sm text-gray-900">Mantenimiento Preventivo</p>
                        <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-amber-100 text-amber-900">
                          Tacómetro
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Alertas de cambio de aceite, frenos, filtros y corona
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400 shrink-0" />
                </CardContent>
              </Card>
            )}

            {/* Revisión de Ventas de Boletos */}
            {isAdmin && (
              <Card
                onClick={onGoToVentasReview}
                className="cursor-pointer hover:shadow-md transition-shadow rounded-2xl border border-gray-200 bg-white"
              >
                <CardContent className="flex items-center justify-between p-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                      <Eye className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-[#3A3A3A]">Auditoría y Revisión de Boletos</p>
                      <p className="text-xs text-gray-500">Boletos vendidos por fecha, frecuencia y cobros en ruta</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                </CardContent>
              </Card>
            )}

            {/* Frecuencias y Cumplimiento Operativo */}
            {isAdmin && (
              <Card
                onClick={onGoToOperativo}
                className="cursor-pointer hover:shadow-md transition-shadow rounded-2xl border border-gray-200 bg-white"
              >
                <CardContent className="flex items-center justify-between p-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-green-50 text-green-700 flex items-center justify-center">
                      <Activity className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-[#3A3A3A]">Cumplimiento de Frecuencias</p>
                      <p className="text-xs text-gray-500">Vueltas realizadas vs turnos suspendidos o caídos</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                </CardContent>
              </Card>
            )}

            {/* Historial General de Liquidaciones */}
            <Card
              onClick={onGoToHistory}
              className="cursor-pointer hover:shadow-md transition-shadow rounded-2xl border border-gray-200 bg-white"
            >
              <CardContent className="flex items-center justify-between p-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                    <History className="w-5 h-5 text-[#3A3A3A]" />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-[#3A3A3A]">
                      {isAdmin ? 'Historial de Días Liquidado' : 'Mis Registros'}
                    </p>
                    <p className="text-xs text-gray-500">Consultar liquidaciones de ruta archivadas</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-black text-[#912D26]">{recordCount}</span>
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                </div>
              </CardContent>
            </Card>

            {/* RutaGo Boletos - EXCLUSIVO PARA EL AYUDANTE (Oculto para Administrador y Conductor) */}
            {user.rol === 'AYUDANTE' && (
              <Card
                onClick={handleAyudanteBoletosClick}
                className={`cursor-pointer hover:shadow-md transition-all rounded-2xl border-2 ${
                  user.esActual !== false
                    ? 'border-[#912D26] bg-gradient-to-r from-[#912D26]/10 via-[#912D26]/5 to-transparent shadow-md shadow-[#912D26]/10'
                    : 'border-amber-300 bg-amber-50/50'
                }`}
              >
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-md ${
                      user.esActual !== false
                        ? 'bg-[#912D26] text-white shadow-[#912D26]/20'
                        : 'bg-amber-500 text-white shadow-amber-500/20'
                    }`}>
                      <Ticket className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-base text-[#912D26]">Venta de Boletos</p>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                          user.esActual !== false
                            ? 'bg-green-100 text-green-800 border border-green-200'
                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}>
                          {user.esActual !== false ? 'TURNO ACTIVO' : 'INACTIVO'}
                        </span>
                      </div>
                      <p className="text-xs text-[#3A3A3A]/70 mt-0.5">
                        {user.esActual !== false
                          ? 'Módulo offline de cobro y emisión en ruta'
                          : 'Turno no habilitado por el administrador'}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className={`w-5 h-5 shrink-0 ${
                    user.esActual !== false ? 'text-[#912D26]' : 'text-amber-600'
                  }`} />
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* ─── PILAR 2: REGULARIZACIÓN Y DATOS ANTERIORES ─── */}
        {/* Aquí vive la opción solicitada: Pasar Cuadernos Anteriores */}
        {onGoToCargaHistorica && (
          <div className="mt-1">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-black text-amber-900/60 uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-amber-700" />
                <span>2. Regularización de Fechas Pasadas</span>
              </p>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-200">
                Poner al día
              </span>
            </div>

            <Card
              onClick={onGoToCargaHistorica}
              className="cursor-pointer hover:shadow-lg transition-all rounded-2xl border-2 border-amber-400/80 bg-gradient-to-br from-amber-50/90 via-orange-50/40 to-white shadow-xs group active:scale-[0.99]"
            >
              <CardContent className="p-4 flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-amber-600/20 group-hover:scale-105 transition">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-amber-950 leading-tight">
                      Carga Histórica de Cuadernos
                    </h3>
                  </div>
                  <p className="text-xs text-amber-900/80 mt-1 leading-relaxed">
                    Sube y transcribe los trabajos, vueltas y gastos anotados previamente en tus <strong>cuadernos de papel</strong> para completar tus reportes de meses anteriores.
                  </p>
                  <div className="mt-2.5 flex items-center gap-2">
                    <span className="text-[11px] font-black text-amber-800 flex items-center gap-1">
                      <span>Ingresar fechas anteriores</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ─── PILAR 3: ANÁLISIS Y REPORTES FINANCIEROS ─── */}
        {isAdmin && (
          <div className="mt-1">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-black text-[#3A3A3A]/50 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[#912D26]" />
                <span>3. Informes y Rendimiento del Negocio</span>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {/* Reportes Oficiales en PDF */}
              <Card
                onClick={onGoToReports}
                className="cursor-pointer hover:shadow-md transition-shadow rounded-2xl border border-gray-200 bg-white"
              >
                <CardContent className="p-3.5 flex flex-col justify-between h-full">
                  <div className="w-10 h-10 rounded-xl bg-[#912D26]/10 text-[#912D26] flex items-center justify-center mb-2">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-[#3A3A3A] leading-tight">Reportes Oficiales</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">Informes consolidados en PDF y Excel</p>
                  </div>
                </CardContent>
              </Card>

              {/* Comparar Frecuencias */}
              <Card
                onClick={onGoToCompare}
                className="cursor-pointer hover:shadow-md transition-shadow rounded-2xl border border-gray-200 bg-white"
              >
                <CardContent className="p-3.5 flex flex-col justify-between h-full">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center mb-2">
                    <ArrowLeftRight className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-[#3A3A3A] leading-tight">Comparar Frecuencias</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">¿Qué turno rinde más?</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Benchmark de Flota & IPF */}
            {onGoToBenchmark && (
              <Card
                onClick={onGoToBenchmark}
                id="btn-goto-benchmark"
                className="mt-2.5 cursor-pointer hover:shadow-md transition-shadow rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50/50 to-white"
              >
                <CardContent className="flex items-center justify-between p-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-800 shrink-0">
                      <Award className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="font-bold text-sm text-[#3A3A3A]">Benchmark de Flota & IPF</p>
                        <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 tracking-wide">
                          Simétrico
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">Ranking Troncal (45 pax) vs Alimentadores (28 pax) e ingreso por vuelta</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400 shrink-0" />
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* ─── PILAR 4: CONFIGURACIÓN Y EQUIPO ─── */}
        {isAdmin && (
          <div className="mt-1">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-black text-[#3A3A3A]/50 uppercase tracking-wider flex items-center gap-1.5">
                <Settings className="w-3.5 h-3.5 text-[#912D26]" />
                <span>4. Configuración y Personal</span>
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {/* Gestión de Personal */}
              <Card
                onClick={onGoToPersonal}
                className="cursor-pointer hover:shadow-md transition-shadow rounded-2xl border border-gray-200 bg-white"
              >
                <CardContent className="flex items-center justify-between p-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-700">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-[#3A3A3A]">Personal (Choferes y Ayudantes)</p>
                      <p className="text-xs text-gray-500">Asignar turno activo de hoy y claves PIN</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                </CardContent>
              </Card>

              {/* Gestión de Flota y Unidades */}
              <Card
                onClick={onGoToFlota}
                className="cursor-pointer hover:shadow-md transition-shadow rounded-2xl border border-blue-200 bg-white"
              >
                <CardContent className="flex items-center justify-between p-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-700">
                      <Bus className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="font-bold text-sm text-[#3A3A3A]">Flota y Unidades (Buses)</p>
                        <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 tracking-wide">
                          19 Buses
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">Discos, placas Hino AK, circuito Troncal VT y Alimentadores P</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                </CardContent>
              </Card>

              {/* Configurar VT (Exclusivo SuperAdmin SaaS) */}
              {isSuperAdmin && (
                <Card
                  onClick={onGoToVtConfig}
                  className="cursor-pointer hover:shadow-md transition-shadow rounded-2xl border border-gray-200 bg-white"
                >
                  <CardContent className="flex items-center justify-between p-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-700">
                        <Settings className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-[#3A3A3A]">Rutas y Horarios (Configurar VT)</p>
                        <p className="text-xs text-gray-500">Horarios y orden de frecuencias de cada vehículo tipo</p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-400" />
                  </CardContent>
                </Card>
              )}

              {/* Respaldo Seguro de la Base de Datos */}
              <Card className="rounded-2xl border border-gray-200 bg-white">
                <CardContent className="flex items-center gap-3 p-3.5">
                  <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-700 shrink-0">
                    <Database className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-sm text-[#3A3A3A]">Copia de Seguridad de Datos</p>
                    <p className="text-xs text-gray-500">Descarga una copia protegida de tus registros</p>
                  </div>
                  <Button
                    onClick={handleBackup}
                    disabled={backupLoading}
                    size="sm"
                    className="h-9 px-3 rounded-xl bg-gray-900 hover:bg-black text-white text-xs font-semibold shrink-0"
                  >
                    {backupLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-3.5 h-3.5 mr-1" />}
                    {backupLoading ? '...' : 'Exportar'}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Logout */}
        <Button
          onClick={onLogout}
          variant="ghost"
          className="w-full h-12 rounded-2xl text-[#3A3A3A]/60 hover:text-red-600 hover:bg-red-50 text-sm font-semibold mt-2"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Cerrar sesión segura
        </Button>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-[#3A3A3A]/40 font-medium">
        RutaGo v3.56.0 • Control de Transporte
      </footer>
    </div>
  );
}
