'use client';

import { useState, useEffect, useCallback } from 'react';
import { countVentasPendientes } from '@/lib/indexeddb';

export type ConnectionState = 'online' | 'offline' | 'syncing' | 'has_pending';

export interface ConnectionInfo {
  status: ConnectionState;
  label: string;
  icon: string;
  color: string;
  bgColor: string;
  pendingCount: number;
}

function getStatus(pendingCount: number, isOnline: boolean, isSyncing: boolean): ConnectionState {
  if (isSyncing) return 'syncing';
  if (!isOnline) return 'offline';
  if (pendingCount > 0) return 'has_pending';
  return 'online';
}

const STATUS_MAP: Record<ConnectionState, { label: string; icon: string; color: string; bgColor: string }> = {
  online:      { label: 'Conectado',           icon: '📶', color: 'text-green-800',     bgColor: 'bg-green-100' },
  offline:     { label: 'Sin conexión',        icon: '✈️', color: 'text-red-800',       bgColor: 'bg-red-100' },
  syncing:     { label: 'Sincronizando...',    icon: '⏳', color: 'text-yellow-800',    bgColor: 'bg-yellow-100' },
  has_pending:  { label: 'Pendientes',          icon: '📥', color: 'text-blue-800',      bgColor: 'bg-blue-100' },
};

export function useConnectionStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const refreshPending = useCallback(async () => {
    try {
      const count = await countVentasPendientes();
      setPendingCount(count);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    refreshPending();
    const interval = setInterval(refreshPending, 3000);
    return () => clearInterval(interval);
  }, [refreshPending]);

  const setSyncing = useCallback((val: boolean) => setIsSyncing(val), []);

  const status = getStatus(pendingCount, isOnline, isSyncing);
  const info = STATUS_MAP[status];

  return {
    status,
    info: { ...info, pendingCount },
    isOnline,
    pendingCount,
    refreshPending,
    setSyncing,
  };
}
