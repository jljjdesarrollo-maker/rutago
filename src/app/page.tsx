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
import { VTConfigScreen } from '@/components/transport/VTConfigScreen';
import { CompareFrequenciesScreen } from '@/components/transport/CompareFrequenciesScreen';
import { type AppView, type RecordFormData, type SavedRecord, type UserSession, num } from '@/components/transport/types';
import { useToast } from '@/hooks/use-toast';

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
          onViewRecord={(record) => setDetailRecord(record)}
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
          onGoToVtConfig={() => setView('vtconfig')}
          onGoToCompare={() => setView('compare')}
          onLogout={handleLogout}
          recordCount={recordCount}
        />
      );
  }
}
