'use client';

import {
  ShieldCheck,
  CreditCard,
  Bus,
  Users,
  Settings,
  Database,
  Loader2,
  Share2,
  ArrowRight,
  LogOut,
  User,
  DollarSign,
  Wrench,
  Info,
  LifeBuoy,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { UserSession } from './types';

interface SuperAdminHomeScreenProps {
  user: UserSession;
  onGoToSaaSAdmin?: () => void;
  onGoToFlota?: () => void;
  onGoToBenchmark?: () => void;
  onGoToOperativo?: () => void;
  onGoToCompare?: () => void;
  onGoToReports?: () => void;
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
  onGoToVentasReview,
  onGoToPersonal,
  onGoToVtConfig,
  onBackup,
  backupLoading,
  onLogout,
}: SuperAdminHomeScreenProps) {
  return (
    <div className="flex flex-col min-h-[100dvh] bg-slate-50">
      {/* Header Corporativo SaaS Desarrollador */}
      <header className="pt-6 pb-4 px-5 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white shadow-md">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-600/30">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-black tracking-tight">RutaGo Cloud Master</span>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-indigo-500 text-white">
                  Vendor SaaS
                </span>
              </div>
              <p className="text-xs text-slate-300 font-medium">Consola de la Empresa Desarrolladora</p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-2xl border border-white/15">
            <div className="w-7 h-7 rounded-full bg-indigo-500/30 flex items-center justify-center">
              <User className="w-3.5 h-3.5 text-indigo-300" />
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-white leading-tight">SuperAdmin</p>
              <p className="text-[9px] text-indigo-300 uppercase font-black">Desarrollador</p>
            </div>
          </div>
        </div>

        {/* Resumen Comercial SaaS (19 Buses x $20.00 = $380 MRR Potencial) */}
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
              <span className="text-[10px] text-slate-300 uppercase font-semibold block">Clientes Potenciales</span>
              <span className="text-base font-black text-white">19 Buses</span>
            </div>
            <div className="bg-white/5 rounded-xl p-2 border border-white/5">
              <span className="text-[10px] text-slate-300 uppercase font-semibold block">Tarifa SaaS</span>
              <span className="text-base font-black text-indigo-300">$20/mes</span>
            </div>
            <div className="bg-emerald-500/20 rounded-xl p-2 border border-emerald-400/30">
              <span className="text-[10px] text-emerald-200 uppercase font-extrabold block">MRR Máximo</span>
              <span className="text-base font-black text-emerald-400">$380.00</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 px-4 py-4 max-w-xl mx-auto w-full flex flex-col gap-4">

        {/* ─── PILAR 1: GESTIÓN COMERCIAL & COBRANZAS SAAS ($20/mes) ─── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-black text-indigo-950/60 uppercase tracking-wider flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
              <span>1. Cobranzas & Facturación SaaS</span>
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
                    <p className="font-black text-sm text-indigo-950">Suscripciones y Recaudación</p>
                    <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 tracking-wide">
                      Recurrente
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Registrar cobros mensuales de $20, emitir recibos, renovar vigencias y recordatorios por WhatsApp
                  </p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-indigo-600 shrink-0" />
            </CardContent>
          </Card>
        </div>

        {/* ─── PILAR 2: CLIENTES & ADOPCIÓN DE FLOTA (19 AUTOBUSES) ─── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-black text-slate-800/60 uppercase tracking-wider flex items-center gap-1.5">
              <Bus className="w-3.5 h-3.5 text-blue-600" />
              <span>2. Clientes & Adopción de Flota</span>
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
                    <p className="font-bold text-sm text-gray-900">Padrón de Clientes y Autobuses</p>
                    <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 tracking-wide">
                      Padrón
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Socios propietarios, unidades activas con licencia, placas y tipos de circuito (Troncal vs Alimentador)
                  </p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400 shrink-0" />
            </CardContent>
          </Card>
        </div>

        {/* ─── PILAR 3: CONSOLA DE SOPORTE TÉCNICO L2 & MANTENIMIENTO DE DATOS ─── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-black text-slate-800/60 uppercase tracking-wider flex items-center gap-1.5">
              <LifeBuoy className="w-3.5 h-3.5 text-amber-600" />
              <span>3. Soporte Técnico L2 & Mantenimiento de Datos</span>
            </p>
          </div>

          <div className="flex flex-col gap-2.5">
            {/* Sanación de Boletos Huérfanos */}
            <Card
              onClick={onGoToVentasReview}
              id="btn-goto-sanacion-boletos"
              className="cursor-pointer hover:shadow-md transition-shadow rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50/60 to-white shadow-xs"
            >
              <CardContent className="flex items-center justify-between p-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-800 shrink-0">
                    <Wrench className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="font-bold text-sm text-gray-900">Sanación y Auditoría de Boletos</p>
                      <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 tracking-wide">
                        Soporte L2
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Reparación de boletos huérfanos, corrección de horas y vinculación foránea de turnos de clientes
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400 shrink-0" />
              </CardContent>
            </Card>

            {/* Directorio de Accesos & Credenciales */}
            <Card
              onClick={onGoToPersonal}
              className="cursor-pointer hover:shadow-md transition-shadow rounded-2xl border border-gray-200 bg-white shadow-xs"
            >
              <CardContent className="flex items-center justify-between p-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 shrink-0">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-gray-900">Directorio de Usuarios y Accesos</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Gestión de PINs de tripulantes de los clientes y soporte de Cédula Única
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400 shrink-0" />
              </CardContent>
            </Card>

            {/* Mallas de Horarios & Parámetros Técnicos */}
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
                    <p className="font-bold text-sm text-gray-900">Parámetros y Tolerancias Técnicas (VT)</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Configuración de tiempos límite de bloqueo de frecuencia e itinerarios
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
                  <p className="font-bold text-sm text-gray-900">Copia de Seguridad Central (BD)</p>
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

        {/* Banner Informativo sobre Informes de Cooperativa (Roadmap) */}
        <div className="p-3.5 rounded-2xl bg-indigo-50/80 border border-indigo-100 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
          <div className="text-xs text-indigo-950">
            <span className="font-bold block mb-0.5">Roadmap de Informes para la Cooperativa</span>
            Los informes consolidados de interés institucional (cumplimiento de horarios, caja común y rotación de franjas) se habilitarán cuando la totalidad o mayoría de los socios implementen formalmente la plataforma.
          </div>
        </div>

        {/* Botón de Cierre de Sesión en la Thumb Zone */}
        <Button
          onClick={onLogout}
          variant="ghost"
          className="w-full h-12 rounded-2xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 text-sm font-semibold mt-2 mb-4"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Cerrar sesión de desarrollador
        </Button>
      </main>

      <footer className="py-4 text-center text-xs text-slate-400 font-medium">
        RutaGo Cloud Platform • Consola Vendor SaaS v3.55.0
      </footer>
    </div>
  );
}

