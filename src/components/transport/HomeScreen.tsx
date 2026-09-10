'use client';

import { useState } from 'react';
import { History, Pencil, BookOpen, Truck, Users, LogOut, User, FileText, Database, Loader2, Share2, Settings, ArrowLeftRight, Ticket, Eye, Activity, ArrowRight, AlertCircle, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import type { UserSession } from './types';

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

export function HomeScreen({ user, isAdmin, onGoToForm, onGoToCargaHistorica, onGoToHistory, onGoToPersonal, onGoToReports, onGoToOperativo, onGoToVtConfig, onGoToCompare, onGoToBoletos, onGoToVentasReview, onGoToSocioGastos, onLogout, recordCount }: HomeScreenProps) {
  const [backupLoading, setBackupLoading] = useState(false);
  const { toast } = useToast();

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
      {/* Header with user info */}
      <header className="pt-8 pb-4 px-6">
        <div className="flex items-center justify-between mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#912D26]">
            <Truck className="w-6 h-6 text-white" />
          </div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-[#F5F5F5] flex items-center justify-center">
              <User className="w-4 h-4 text-[#3A3A3A]" />
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-[#3A3A3A]">{user.nombre}</p>
              <p className="text-[10px] text-[#3A3A3A]/40 uppercase">{user.rol}</p>
            </div>
          </div>
        </div>
        <h1 className="text-xl font-bold text-[#3A3A3A]">Control de Transporte</h1>
        <p className="text-[#3A3A3A]/60 mt-0.5 text-sm">Registra tus gastos e ingresos diarios</p>
      </header>

      {/* Main Actions */}
      <main className="flex-1 px-5 pb-6 flex flex-col gap-3">
        {/* Primary: Carga Histórica de Cuadernos (Reemplazo oficial de Nuevo Registro) */}
        {onGoToCargaHistorica && (
          <Button
            onClick={onGoToCargaHistorica}
            className="w-full h-18 text-lg font-semibold rounded-2xl bg-[#912D26] hover:bg-[#7A2520] text-white shadow-lg shadow-[#912D26]/20 active:scale-[0.98] transition-transform py-6 flex items-center justify-center gap-3"
          >
            <BookOpen className="w-6 h-6" />
            Carga Histórica de Cuadernos
          </Button>
        )}

        {/* History Card */}
        <Card
          onClick={onGoToHistory}
          className="cursor-pointer hover:shadow-md transition-shadow rounded-2xl border border-[#D6D6D6] bg-white"
        >
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#D6D6D6] flex items-center justify-center">
                <History className="w-5 h-5 text-[#3A3A3A]" />
              </div>
              <div>
                <p className="font-semibold text-[#3A3A3A]">{isAdmin ? 'Historial Completo' : 'Mi Historial'}</p>
                <p className="text-xs text-[#3A3A3A]/60">{isAdmin ? 'Ver todos los registros' : 'Ver registros anteriores'}</p>
              </div>
            </div>
            <span className="text-2xl font-bold text-[#912D26]">{recordCount}</span>
          </CardContent>
        </Card>

        {/* Compare Frequencies - visible to ALL users */}
        <Card
          onClick={onGoToCompare}
          className="cursor-pointer hover:shadow-md transition-shadow rounded-2xl border border-[#D6D6D6] bg-white"
        >
          <CardContent className="flex items-center gap-3 p-4">
            <div className="w-10 h-10 rounded-xl bg-[#912D26]/10 flex items-center justify-center">
              <ArrowLeftRight className="w-5 h-5 text-[#912D26]" />
            </div>
            <div>
              <p className="font-semibold text-[#3A3A3A]">Comparar Frecuencias</p>
              <p className="text-xs text-[#3A3A3A]/60">Evalua cual frecuencia rinde mas</p>
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

        {/* Admin-only sections */}
        {isAdmin && (
          <>
            <div className="pt-2">
              <p className="text-xs font-bold text-[#3A3A3A]/40 uppercase tracking-wider mb-2">Administracion</p>
            </div>

            {/* Personal */}
            <Card
              onClick={onGoToPersonal}
              className="cursor-pointer hover:shadow-md transition-shadow rounded-2xl border border-[#D6D6D6] bg-white"
            >
              <CardContent className="flex items-center gap-3 p-4">
                <div className="w-10 h-10 rounded-xl bg-[#912D26]/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-[#912D26]" />
                </div>
                <div>
                  <p className="font-semibold text-[#3A3A3A]">Personal</p>
                  <p className="text-xs text-[#3A3A3A]/60">Gestionar conductores y ayudantes</p>
                </div>
              </CardContent>
            </Card>

            {/* Reporte Operativo */}
            <Card
              onClick={onGoToOperativo}
              className="cursor-pointer hover:shadow-md transition-shadow rounded-2xl border border-[#D6D6D6] bg-white"
            >
              <CardContent className="flex items-center gap-3 p-4">
                <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
                  <Activity className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold text-[#3A3A3A]">Operativo</p>
                  <p className="text-xs text-[#3A3A3A]/60">Frecuencias realizadas y perdidas</p>
                </div>
              </CardContent>
            </Card>

            {/* Reports */}
            <Card
              onClick={onGoToReports}
              className="cursor-pointer hover:shadow-md transition-shadow rounded-2xl border border-[#D6D6D6] bg-white"
            >
              <CardContent className="flex items-center gap-3 p-4">
                <div className="w-10 h-10 rounded-xl bg-[#912D26]/10 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-[#912D26]" />
                </div>
                <div>
                  <p className="font-semibold text-[#3A3A3A]">Reportes</p>
                  <p className="text-xs text-[#3A3A3A]/60">Reportes consolidados PDF</p>
                </div>
              </CardContent>
            </Card>

            {/* Revision de Ventas */}
            <Card
              onClick={onGoToVentasReview}
              className="cursor-pointer hover:shadow-md transition-shadow rounded-2xl border border-[#D6D6D6] bg-white"
            >
              <CardContent className="flex items-center gap-3 p-4">
                <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                  <Eye className="w-5 h-5 text-green-700" />
                </div>
                <div>
                  <p className="font-semibold text-[#3A3A3A]">Revision de Ventas</p>
                  <p className="text-xs text-[#3A3A3A]/60">Boletos vendidos por fecha y frecuencia</p>
                </div>
              </CardContent>
            </Card>

            {/* Configurar VT */}
            <Card
              onClick={onGoToVtConfig}
              className="cursor-pointer hover:shadow-md transition-shadow rounded-2xl border border-[#D6D6D6] bg-white"
            >
              <CardContent className="flex items-center gap-3 p-4">
                <div className="w-10 h-10 rounded-xl bg-[#912D26]/10 flex items-center justify-center">
                  <Settings className="w-5 h-5 text-[#912D26]" />
                </div>
                <div>
                  <p className="font-semibold text-[#3A3A3A]">Configurar VT</p>
                  <p className="text-xs text-[#3A3A3A]/60">Editar frecuencias de cada vehiculo tipo</p>
                </div>
              </CardContent>
            </Card>

            {/* Gastos del Socio Propietario */}
            {onGoToSocioGastos && (
              <Card
                onClick={onGoToSocioGastos}
                className="cursor-pointer hover:shadow-md transition-all rounded-2xl border border-emerald-300 bg-emerald-50/40"
              >
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                      <Receipt className="w-5 h-5 text-emerald-700" />
                    </div>
                    <div>
                      <p className="font-semibold text-[#3A3A3A] flex items-center gap-1.5">
                        <span>Gastos del Socio</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-200/80 text-emerald-900">
                          9 Categorías
                        </span>
                      </p>
                      <p className="text-xs text-[#3A3A3A]/60">Pagos, transferencias y deudas con talleres</p>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-emerald-600 shrink-0" />
                </CardContent>
              </Card>
            )}

            {/* Datos section */}
            <div className="pt-2">
              <p className="text-xs font-bold text-[#3A3A3A]/40 uppercase tracking-wider mb-2">Datos</p>
            </div>

            {/* Respaldo BD */}
            <Card className="rounded-2xl border border-[#D6D6D6] bg-white">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="w-10 h-10 rounded-xl bg-[#912D26]/10 flex items-center justify-center">
                  <Database className="w-5 h-5 text-[#912D26]" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-[#3A3A3A]">Respaldo BD</p>
                  <p className="text-xs text-[#3A3A3A]/60">Descargar copia completa (JSON)</p>
                </div>
                <Button
                  onClick={handleBackup}
                  disabled={backupLoading}
                  size="sm"
                  className="h-9 px-3 rounded-xl bg-[#912D26] hover:bg-[#7A2520] text-white text-xs font-medium"
                >
                  {backupLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4 mr-1" />}
                  {backupLoading ? '...' : 'Descargar'}
                </Button>
              </CardContent>
            </Card>
          </>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Logout */}
        <Button
          onClick={onLogout}
          variant="ghost"
          className="w-full h-12 rounded-2xl text-[#3A3A3A]/40 hover:text-red-500 hover:bg-red-50 text-sm"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Cerrar sesion
        </Button>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-[#3A3A3A]/40">
        RutaGo v3.49.0 - Carga Histórica
      </footer>
    </div>
  );
}
