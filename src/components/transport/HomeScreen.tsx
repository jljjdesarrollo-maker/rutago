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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import type { UserSession } from './types';
import { getOwnerExpenses, fetchOwnerExpensesFromApi } from '@/lib/owner-expenses-storage';

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
  onLogout,
  recordCount,
}: HomeScreenProps) {
  const [backupLoading, setBackupLoading] = useState(false);
  const [ownerSummary, setOwnerSummary] = useState<{
    routeIncome: number;
    busExpenses: number;
    netProfit: number;
    pendingDebts: number;
  }>({
    routeIncome: 3915.25,
    busExpenses: 0,
    netProfit: 3915.25,
    pendingDebts: 0,
  });
  const { toast } = useToast();

  // Calcular balance financiero en vivo para el socio (con sincronización en línea)
  useEffect(() => {
    const updateSummaryFromList = (expenses: any[]) => {
      const augExpenses = expenses.filter(e => e.expenseDate && e.expenseDate.startsWith('2026-08'));
      const totalCost = augExpenses.reduce((sum, e) => sum + (e.totalAmount || 0), 0);
      const debts = expenses.filter(e => e.pendingBalance > 0).reduce((sum, e) => sum + e.pendingBalance, 0);
      const routeIncome = 3915.25; // Base auditada de entregas
      setOwnerSummary({
        routeIncome,
        busExpenses: totalCost,
        netProfit: routeIncome - totalCost,
        pendingDebts: debts,
      });
    };

    try {
      // 1. Lectura inmediata desde caché
      const cached = getOwnerExpenses('BUS-04');
      updateSummaryFromList(cached);

      // 2. Consulta asíncrona a la base de datos central
      fetchOwnerExpensesFromApi('BUS-04').then((online) => {
        if (online && online.length > 0) {
          updateSummaryFromList(online);
        }
      }).catch(() => {});
    } catch {
      /* ignore */
    }
  }, []);

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
                  UNIDAD 04
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
          <div
            onClick={onGoToSocioGastos}
            className="cursor-pointer bg-gradient-to-br from-emerald-900 via-teal-950 to-slate-900 rounded-2xl p-3.5 text-white shadow-md border border-emerald-800/40 hover:scale-[1.01] transition active:scale-[0.99] mb-1"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[11px] font-bold text-emerald-200 uppercase tracking-wide">
                  Balance de Ganancia Limpia • Agosto 2026
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
                        <p className="font-black text-sm text-emerald-950">Gastos y Mantenimiento del Bus</p>
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-950">
                          Socio
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mt-0.5">
                        Registrar compras, lubricadora, repuestos y deudas
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-emerald-700 shrink-0" />
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

              {/* Configurar VT */}
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
        RutaGo v3.49.0 • Control de Transporte
      </footer>
    </div>
  );
}
