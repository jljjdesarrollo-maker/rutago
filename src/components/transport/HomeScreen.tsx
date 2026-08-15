'use client';

import { useState } from 'react';
import { History, Pencil, Truck, Users, LogOut, User, FileText, Database, Loader2, Share2, Settings, ArrowLeftRight, Ticket, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { UserSession } from './types';

interface HomeScreenProps {
  user: UserSession;
  isAdmin: boolean;
  onGoToForm: () => void;
  onGoToHistory: () => void;
  onGoToPersonal: () => void;
  onGoToReports: () => void;
  onGoToVtConfig: () => void;
  onGoToCompare: () => void;
  onGoToBoletos: () => void;
  onGoToVentasReview: () => void;
  onLogout: () => void;
  recordCount: number;
}

export function HomeScreen({ user, isAdmin, onGoToForm, onGoToHistory, onGoToPersonal, onGoToReports, onGoToVtConfig, onGoToCompare, onGoToBoletos, onGoToVentasReview, onLogout, recordCount }: HomeScreenProps) {
  const [backupLoading, setBackupLoading] = useState(false);

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
        {/* Primary: Nuevo Registro */}
        <Button
          onClick={onGoToForm}
          className="w-full h-18 text-lg font-semibold rounded-2xl bg-[#912D26] hover:bg-[#7A2520] text-white shadow-lg shadow-[#912D26]/20 active:scale-[0.98] transition-transform py-6"
        >
          <Pencil className="w-6 h-6 mr-3" />
          Nuevo Registro
        </Button>

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

        {/* RutaGo Boletos - visible to ALL users */}
        <Card
          onClick={onGoToBoletos}
          className="cursor-pointer hover:shadow-md transition-shadow rounded-2xl border-2 border-[#912D26]/30 bg-gradient-to-r from-[#912D26]/5 to-transparent"
        >
          <CardContent className="flex items-center gap-3 p-4">
            <div className="w-10 h-10 rounded-xl bg-[#912D26] flex items-center justify-center">
              <Ticket className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-[#912D26]">RutaGo - Venta de Boletos</p>
              <p className="text-xs text-[#3A3A3A]/60">Modulo offline de venta por frecuencia</p>
            </div>
          </CardContent>
        </Card>

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
        Transporte Control v2.7
      </footer>
    </div>
  );
}
