'use client';

import {
  ShieldCheck,
  CreditCard,
  Bus,
  Award,
  Activity,
  ArrowLeftRight,
  FileText,
  Users,
  Settings,
  Database,
  Loader2,
  Share2,
  ArrowRight,
  LogOut,
  User,
  DollarSign,
  Layers,
  Sparkles,
  Search,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { UserSession } from './types';

interface SuperAdminHomeScreenProps {
  user: UserSession;
  onGoToSaaSAdmin?: () => void;
  onGoToFlota?: () => void;
  onGoToBenchmark?: () => void;
  onGoToOperativo: () => void;
  onGoToCompare: () => void;
  onGoToReports: () => void;
  onGoToVentasReview: () => void;
  onGoToPersonal: () => void;
  onGoToVtConfig: () => void;
  onBackup: () => void;
  backupLoading: boolean;
  onLogout: () => void;
}

export function SuperAdminHomeScreen({
  user,
  onGoToSaaSAdmin,
  onGoToFlota,
  onGoToBenchmark,
  onGoToOperativo,
  onGoToCompare,
  onGoToReports,
  onGoToVentasReview,
  onGoToPersonal,
  onGoToVtConfig,
  onBackup,
  backupLoading,
  onLogout,
}: SuperAdminHomeScreenProps) {
  return (
    <div className="flex flex-col min-h-[100dvh] bg-slate-50">
      {/* Header Corporativo SaaS */}
      <header className="pt-6 pb-4 px-5 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white shadow-md">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-600/30">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-black tracking-tight">RutaGo Master</span>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-indigo-500 text-white">
                  SaaS Multi-Flota
                </span>
              </div>
              <p className="text-xs text-slate-300 font-medium">Panel Ejecutivo de Cooperativa</p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-2xl border border-white/15">
            <div className="w-7 h-7 rounded-full bg-indigo-500/30 flex items-center justify-center">
              <User className="w-3.5 h-3.5 text-indigo-300" />
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-white leading-tight">SuperAdmin</p>
              <p className="text-[9px] text-indigo-300 uppercase font-black">Control Total</p>
            </div>
          </div>
        </div>

        {/* Resumen Ejecutivo SaaS (19 Buses x $20.00 = $380 MRR) */}
        <div
          onClick={onGoToSaaSAdmin}
          className="cursor-pointer bg-white/10 hover:bg-white/15 transition rounded-2xl p-3.5 border border-white/15 shadow-sm active:scale-[0.99]"
        >
          <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2.5">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <span className="text-[11px] font-bold text-slate-200 uppercase tracking-wide">
                Ingreso Mensual Recurrente (MRR)
              </span>
            </div>
            <span className="text-[11px] text-indigo-300 font-bold flex items-center gap-1">
              Ver Cobranzas <ArrowRight className="w-3 h-3" />
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-white/5 rounded-xl p-2 border border-white/5">
              <span className="text-[10px] text-slate-300 uppercase font-semibold block">Padrón Flota</span>
              <span className="text-base font-black text-white">19 Buses</span>
            </div>
            <div className="bg-white/5 rounded-xl p-2 border border-white/5">
              <span className="text-[10px] text-slate-300 uppercase font-semibold block">Tarifa SaaS</span>
              <span className="text-base font-black text-indigo-300">$20/mes</span>
            </div>
            <div className="bg-emerald-500/20 rounded-xl p-2 border border-emerald-400/30">
              <span className="text-[10px] text-emerald-200 uppercase font-extrabold block">Proyección</span>
              <span className="text-base font-black text-emerald-400">$380.00</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 px-4 py-4 max-w-xl mx-auto w-full flex flex-col gap-4">

        {/* ─── MÓDULO 1: SUSCRIPCIONES SAAS & MENSUALIDADES (Prioridad #1) ─── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-black text-indigo-950/60 uppercase tracking-wider flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
              <span>1. Suscripciones SaaS & Cobranzas</span>
            </p>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-900">
              $20 / Bus
            </span>
          </div>

          <Card
            onClick={onGoToSaaSAdmin}
            id="btn-goto-saas-admin"
            className="cursor-pointer hover:shadow-lg transition-all rounded-2xl border-2 border-indigo-500 bg-gradient-to-r from-indigo-50/80 via-white to-indigo-50/40 shadow-xs"
          >
            <CardContent className="flex items-center justify-between p-3.5">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20 shrink-0">
                  <CreditCard className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-black text-sm text-indigo-950">Cobranza y Estados de Cuenta</p>
                    <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 tracking-wide">
                      Recurrente
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Registrar cobros mensuales de $20, enviar recordatorios por WhatsApp y vigencias
                  </p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-indigo-600 shrink-0" />
            </CardContent>
          </Card>
        </div>

        {/* ─── MÓDULO 2: GESTIÓN MAESTRA DE FLOTA (19 AUTOBUSES) ─── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-black text-slate-800/60 uppercase tracking-wider flex items-center gap-1.5">
              <Bus className="w-3.5 h-3.5 text-blue-600" />
              <span>2. Gestión de Flota & Unidades</span>
            </p>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-100 text-blue-900">
              19 Unidades
            </span>
          </div>

          <Card
            onClick={onGoToFlota}
            id="btn-goto-flota"
            className="cursor-pointer hover:shadow-md transition-shadow rounded-2xl border border-blue-200 bg-white shadow-xs"
          >
            <CardContent className="flex items-center justify-between p-3.5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-700 shrink-0">
                  <Bus className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="font-bold text-sm text-gray-900">Padrón de 19 Autobuses</p>
                    <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 tracking-wide">
                      Simétrico
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Troncal General VT (45 pax) vs Alimentadores Especiales P (28 pax), discos y placas
                  </p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400 shrink-0" />
            </CardContent>
          </Card>
        </div>

        {/* ─── MÓDULO 3: BENCHMARK COOPERATIVO & AUDITORÍA GLOBAL ─── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-black text-slate-800/60 uppercase tracking-wider flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-emerald-600" />
              <span>3. Benchmark & Auditoría Cooperativa</span>
            </p>
          </div>

          <div className="flex flex-col gap-2.5">
            {/* Benchmark y Ranking */}
            <Card
              onClick={onGoToBenchmark}
              id="btn-goto-benchmark"
              className="cursor-pointer hover:shadow-md transition-shadow rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50/60 to-white shadow-xs"
            >
              <CardContent className="flex items-center justify-between p-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-800 shrink-0">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="font-bold text-sm text-gray-900">Benchmark de Flota & IPF</p>
                      <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 tracking-wide">
                        Ranking
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Ranking por circuito, ingreso promedio por vuelta y comparador de tripulaciones
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400 shrink-0" />
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-2.5">
              {/* Cumplimiento Operativo */}
              <Card
                onClick={onGoToOperativo}
                className="cursor-pointer hover:shadow-md transition-shadow rounded-2xl border border-gray-200 bg-white"
              >
                <CardContent className="p-3.5 flex flex-col justify-between h-full">
                  <div className="w-9 h-9 rounded-xl bg-green-50 text-green-700 flex items-center justify-center mb-2">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-xs text-gray-900 leading-tight">Cumplimiento Operativo</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">Vueltas hechas vs caídas</p>
                  </div>
                </CardContent>
              </Card>

              {/* Comparador de Frecuencias */}
              <Card
                onClick={onGoToCompare}
                className="cursor-pointer hover:shadow-md transition-shadow rounded-2xl border border-gray-200 bg-white"
              >
                <CardContent className="p-3.5 flex flex-col justify-between h-full">
                  <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center mb-2">
                    <ArrowLeftRight className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-xs text-gray-900 leading-tight">Comparar Horarios</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">Rendimiento por franja</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {/* Reportes Oficiales */}
              <Card
                onClick={onGoToReports}
                className="cursor-pointer hover:shadow-md transition-shadow rounded-2xl border border-gray-200 bg-white"
              >
                <CardContent className="p-3.5 flex flex-col justify-between h-full">
                  <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center mb-2">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-xs text-gray-900 leading-tight">Reportes Consolidados</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">PDF y Excel para asambleas</p>
                  </div>
                </CardContent>
              </Card>

              {/* Auditoría de Boletos */}
              <Card
                onClick={onGoToVentasReview}
                className="cursor-pointer hover:shadow-md transition-shadow rounded-2xl border border-gray-200 bg-white"
              >
                <CardContent className="p-3.5 flex flex-col justify-between h-full">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center mb-2">
                    <Search className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-xs text-gray-900 leading-tight">Auditoría Boletos</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">Boletos huérfanos y fechas</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* ─── MÓDULO 4: POOL LABORAL COMPARTIDO (CÉDULA ÚNICA) ─── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-black text-slate-800/60 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-amber-600" />
              <span>4. Pool Laboral de la Cooperativa</span>
            </p>
          </div>

          <Card
            onClick={onGoToPersonal}
            className="cursor-pointer hover:shadow-md transition-shadow rounded-2xl border border-gray-200 bg-white shadow-xs"
          >
            <CardContent className="flex items-center justify-between p-3.5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-700 shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-sm text-gray-900">Directorio Laboral (Choferes y Ayudantes)</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Padrón único de tripulantes sin duplicados al rotar entre unidades y claves PIN
                  </p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400 shrink-0" />
            </CardContent>
          </Card>
        </div>

        {/* ─── MÓDULO 5: CONFIGURACIÓN GLOBAL & RESPALDO ─── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-black text-slate-800/60 uppercase tracking-wider flex items-center gap-1.5">
              <Settings className="w-3.5 h-3.5 text-slate-600" />
              <span>5. Configuración y Respaldo Central</span>
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            {/* Rutas y Mallas VT */}
            <Card
              onClick={onGoToVtConfig}
              className="cursor-pointer hover:shadow-md transition-shadow rounded-2xl border border-gray-200 bg-white shadow-xs"
            >
              <CardContent className="flex items-center justify-between p-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-700 shrink-0">
                    <Settings className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-gray-900">Mallas de Horarios (Configurar VT)</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Itinerarios, orden de frecuencias y tolerancias de tiempo de viaje
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400 shrink-0" />
              </CardContent>
            </Card>

            {/* Respaldo Central de Base de Datos */}
            <Card className="rounded-2xl border border-gray-200 bg-white shadow-xs">
              <CardContent className="flex items-center gap-3 p-3.5">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-800 shrink-0">
                  <Database className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-sm text-gray-900">Copia de Seguridad Central</p>
                  <p className="text-xs text-gray-500 mt-0.5">Descarga protegida de todos los registros en JSON</p>
                </div>
                <Button
                  onClick={onBackup}
                  disabled={backupLoading}
                  size="sm"
                  className="h-9 px-3 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-semibold shrink-0"
                >
                  {backupLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-3.5 h-3.5 mr-1" />}
                  {backupLoading ? '...' : 'Exportar'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Botón de Cierre de Sesión en la Thumb Zone */}
        <Button
          onClick={onLogout}
          variant="ghost"
          className="w-full h-12 rounded-2xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 text-sm font-semibold mt-2 mb-4"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Cerrar sesión segura (SuperAdmin)
        </Button>
      </main>

      <footer className="py-4 text-center text-xs text-slate-400 font-medium">
        RutaGo Master SaaS v3.55.0 • Cooperativa Vilcabambaturis
      </footer>
    </div>
  );
}
