'use client';

import { useState, useEffect, useCallback } from 'react';
import { HomeScreen } from '@/components/transport/HomeScreen';
import { RecordForm } from '@/components/transport/RecordForm';
import { HistoryScreen } from '@/components/transport/HistoryScreen';
import { RecordDetail } from '@/components/transport/RecordDetail';
import { ComprobanteModal } from '@/components/transport/ComprobanteModal';
import { LoginScreen } from '@/components/transport/LoginScreen';
import { PersonalScreen } from '@/components/transport/PersonalScreen';
import { ReportsScreen } from '@/components/transport/ReportsScreen';
import { ReporteOperativoScreen } from '@/components/transport/ReporteOperativoScreen';
import { VTConfigScreen } from '@/components/transport/VTConfigScreen';
import { CompareFrequenciesScreen } from '@/components/transport/CompareFrequenciesScreen';
import { VentasReviewScreen } from '@/components/transport/VentasReviewScreen';
import { HomeScreenVT } from '@/components/transport/HomeScreenVT';
import { FrecuenciaSelector } from '@/components/transport/FrecuenciaSelector';
import { TicketScreen } from '@/components/transport/TicketScreen';
import { ArqueoScreen } from '@/components/transport/ArqueoScreen';
import { ArqueoGeneralScreen } from '@/components/transport/ArqueoGeneralScreen';
import { SyncScreen } from '@/components/transport/SyncScreen';
import { type AppView, type RecordFormData, type SavedRecord, type UserSession, num } from '@/components/transport/types';
import { type VTSession, type FrecuenciaEstado } from '@/components/transport/types-boletos';
import { useToast } from '@/hooks/use-toast';
import { useConnectionStatus } from '@/hooks/use-connection';

export default function Home() {
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<AppView>('home');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recordCount, setRecordCount] = useState(0);
  const [detailRecord, setDetailRecord] = useState<SavedRecord | null>(null);
  const [comprobanteRecord, setComprobanteRecord] = useState<SavedRecord | null>(null);
  const { toast } = useToast();

  // Boletos state
  const [vtSession, setVtSession] = useState<VTSession | null>(null);
  const [currentEstado, setCurrentEstado] = useState<FrecuenciaEstado | null>(null);
  const [esUltimaFrecuencia, setEsUltimaFrecuencia] = useState(false);
  const connection = useConnectionStatus();

  // Restore session from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('ct_session');
      if (stored) {
        const session = JSON.parse(stored) as UserSession;
        if (session.id && session.rol) {
          setUser(session);
        }
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  // Auto-restore VT session if exists and has unfinished frequencies
  const [vtRestoreChecked, setVtRestoreChecked] = useState(false);
  useEffect(() => {
    if (user && !vtRestoreChecked) {
      setVtRestoreChecked(true);
      try {
        const stored = localStorage.getItem('rg_vt_session');
        if (!stored) return;
        const saved: VTSession & { timestamp: number } = JSON.parse(stored);
        if (!saved.vtCode || !saved.fecha) return;
        // Check if there are unfinished frequencies for this VT
        const estadosKey = `rg_estados_${saved.vtCode}_${saved.fecha}`;
        const estadosRaw = localStorage.getItem(estadosKey);
        if (!estadosRaw) return;
        const estados: { estado: string }[] = JSON.parse(estadosRaw);
        const hasUnfinished = estados.some(e => e.estado === 'pendiente' || e.estado === 'abierta');
        if (!hasUnfinished) {
          // All done but session not cleared — clean up
          localStorage.removeItem('rg_vt_session');
          return;
        }
        // Restore VT session and go directly to frequencies
        const { timestamp, ...sessionData } = saved;
        setVtSession(sessionData);
        setView('boletos_frecuencias');
      } catch { /* ignore parse errors */ }
    }
  }, [user, vtRestoreChecked]);

  const isAdmin = user?.rol === 'ADMIN';

  const fetchCount = useCallback(async () => {
    try {
      const res = await fetch('/api/records/count');
      const data = await res.json();
      setRecordCount(data.count ?? 0);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { if (user) fetchCount(); }, [fetchCount, user]);

  const handleLogin = (userData: UserSession) => {
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('ct_session');
    setUser(null);
    setView('home');
  };

  const handleSave = async (data: RecordFormData, photoBase64: string | null) => {
    setSaving(true);
    setError(null);
    try {
      // Log photo size for debugging
      const photoSizeKB = photoBase64 ? Math.round(photoBase64.length / 1024) : 0;
      console.log('Foto size:', photoSizeKB, 'KB');
      if (photoBase64 && photoSizeKB > 4000) {
        throw new Error('La foto es muy grande (' + photoSizeKB + 'KB). Usa una imagen mas pequena o toma la foto desde la PC.');
      }

      const res = await fetch('/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: data.date,
          km: data.km,
          conductor: data.conductor,
          ayudanteNombre: data.ayudanteNombre,
          vtCode: data.vtCode || null,
          tickets: num(data.tickets),
          sobrante: num(data.sobrante),
          trips: data.trips.map(t => ({
            routeFrom: t.routeFrom,
            routeTo: t.routeTo,
            time: t.time || null,
            income: num(t.income),
            boletos: num(t.boletos),
          })),
          expenses: data.expenses.map(e => ({
            description: e.description,
            amount: num(e.amount),
          })),
          photoUrl: photoBase64,
        }),
      });

      if (!res.ok) {
        const result = await res.json();
        throw new Error(result.error || 'Error al guardar');
      }

      const savedRecord = await res.json();
      toast({ title: 'Registro guardado', description: 'Liquidacion registrada correctamente.' });
      fetchCount();
      setView('home');
      setComprobanteRecord(savedRecord);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al guardar';
      setError(message);
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // Loading / Auth gate
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[100dvh] bg-white">
        <div className="w-10 h-10 border-4 border-[#D6D6D6] border-t-[#912D26] rounded-full animate-spin" />
      </div>
    );
  }

  // Not logged in — show PIN screen
  if (!user) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  const handleViewRecord = async (record: SavedRecord) => {
    // Fetch con foto incluida para evitar 413 en la lista general
    try {
      const res = await fetch(`/api/records/${record.id}?photo=true`);
      if (res.ok) {
        const withPhoto = await res.json();
        setDetailRecord(withPhoto);
        return;
      }
    } catch { /* fallback al record sin foto */ }
    setDetailRecord(record);
  };

  // Comprobante modal overlay
  if (comprobanteRecord) {
    return (
      <ComprobanteModal
        record={comprobanteRecord}
        onClose={() => setComprobanteRecord(null)}
      />
    );
  }

  if (detailRecord) {
    return (
      <RecordDetail
        record={detailRecord}
        isAdmin={isAdmin}
        onBack={() => setDetailRecord(null)}
        onRecordUpdated={(updated) => setDetailRecord(updated)}
      />
    );
  }

  // Personal screen (admin only)
  if (view === 'personal') {
    return (
      <PersonalScreen
        currentUser={user}
        onBack={() => setView('home')}
      />
    );
  }

  // Reports screen (admin only)
  if (view === 'reports') {
    return (
      <ReportsScreen
        onBack={() => setView('home')}
      />
    );
  }

  // Reporte Operativo screen
  if (view === 'operativo') {
    return (
      <ReporteOperativoScreen
        onBack={() => setView('home')}
      />
    );
  }

  // VT Config screen (admin only)
  if (view === 'vtconfig') {
    return (
      <VTConfigScreen
        onBack={() => setView('home')}
      />
    );
  }

  // Compare Frequencies screen (all users)
  if (view === 'compare') {
    return (
      <CompareFrequenciesScreen
        onBack={() => setView('home')}
      />
    );
  }

  // Ventas Review screen (admin)
  if (view === 'ventas_review') {
    return (
      <VentasReviewScreen
        onBack={() => setView('home')}
      />
    );
  }

  // ─── Boletos views ───
  if (view === 'boletos_home') {
    return <HomeScreenVT onSessionStart={(s) => { setVtSession(s); setView('boletos_frecuencias'); }} />;
  }
  if (view === 'boletos_frecuencias' && vtSession) {
    return (
      <FrecuenciaSelector
        session={vtSession}
        onOpenFrequency={(e) => { setCurrentEstado(e); setView('boletos_tickets'); }}
        onGoToArqueo={(e, esUltima) => { setCurrentEstado(e); setEsUltimaFrecuencia(esUltima); setView('boletos_arqueo'); }}
        onGoToArqueoGeneral={() => setView('boletos_arqueo_general')}
        onBack={() => setView('home')}
        onGoToSync={() => setView('boletos_sync')}
      />
    );
  }
  if (view === 'boletos_tickets' && vtSession && currentEstado) {
    return <TicketScreen session={vtSession} estado={currentEstado} connection={connection.info} onClose={() => { setCurrentEstado(null); setView('boletos_frecuencias'); }} ganadorPosicion={currentEstado.ganadorPosicion} />;
  }
  if (view === 'boletos_arqueo' && vtSession && currentEstado) {
    return (
      <ArqueoScreen
        session={vtSession}
        estado={currentEstado}
        connection={connection.info}
        esUltima={esUltimaFrecuencia}
        onArqueoConfirmado={() => {
          setCurrentEstado(null);
          setView('boletos_frecuencias');
        }}
        onBack={() => { setCurrentEstado(null); setView('boletos_frecuencias'); }}
      />
    );
  }
  if (view === 'boletos_arqueo_general' && vtSession) {
    return (
      <ArqueoGeneralScreen
        session={vtSession}
        connection={connection.info}
        onClose={() => setView('boletos_frecuencias')}
        onGoToSync={() => setView('boletos_sync')}
        onSaved={() => {
          // Limpiar sesión VT persistida al completar arqueo general
          const estadosKey = `rg_estados_${vtSession.vtCode}_${vtSession.fecha}`;
          const arqueoKey = `arqueo_general_${vtSession.vtCode}_${vtSession.fecha}`;
          localStorage.removeItem(estadosKey);
          localStorage.removeItem(arqueoKey);
          localStorage.removeItem('rg_vt_session');
          setVtSession(null);
          setView('home');
        }}
      />
    );
  }
  if (view === 'boletos_sync' && vtSession) {
    return <SyncScreen session={vtSession} onBack={() => setView('boletos_frecuencias')} />;
  }

  switch (view) {
    case 'form':
      return (
        <RecordForm
          saving={saving}
          error={error}
          onBack={() => { setView('home'); setError(null); }}
          onSave={handleSave}
        />
      );
    case 'history':
      return (
        <HistoryScreen
          isAdmin={isAdmin}
          onBack={() => setView('home')}
          onViewRecord={handleViewRecord}
        />
      );
    default:
      return (
        <HomeScreen
          user={user}
          isAdmin={isAdmin}
          onGoToForm={() => setView('form')}
          onGoToHistory={() => setView('history')}
          onGoToPersonal={() => setView('personal')}
          onGoToReports={() => setView('reports')}
          onGoToOperativo={() => setView('operativo')}
          onGoToVtConfig={() => setView('vtconfig')}
          onGoToCompare={() => setView('compare')}
          onGoToBoletos={() => setView('boletos_home')}
          onGoToVentasReview={() => setView('ventas_review')}
          onLogout={handleLogout}
          recordCount={recordCount}
        />
      );
  }
}
