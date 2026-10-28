import type { SavedRecord } from '@/components/transport/types';

export interface HomeSummarySnapshot {
  busId: string;
  displayYearMonth: string;
  routeIncome: number;
  busExpenses: number;
  netProfit: number;
  pendingDebts: number;
  conductorNombre: string;
  ayudanteNombre: string;
  updatedAt: number;
}

const HOME_SNAPSHOT_PREFIX = 'rg_swr_home_v1_';
const HISTORY_SNAPSHOT_PREFIX = 'rg_swr_history_v1_';
const BUSES_CACHE_PREFIX = 'rg_swr_buses_v1_';
const PERSONAS_CACHE_PREFIX = 'rg_swr_personas_v1_';

// Caché en memoria de sesión para respuesta < 1ms al navegar entre pantallas
const memoryHomeCache = new Map<string, HomeSummarySnapshot>();
const memoryHistoryCache = new Map<string, SavedRecord[]>();
const memoryBusesCache = new Map<string, { data: any[]; timestamp: number }>();
const memoryPersonasCache = new Map<string, { data: any[]; timestamp: number }>();

const SESSION_TTL_MS = 60 * 1000; // 60s de frescura en memoria antes de revalidar en background

export function normalizeCacheBusKey(busId?: string | null): string {
  if (!busId || busId === 'TODOS') return 'TODOS';
  const digits = String(busId).replace(/^BUS-/i, '').replace(/\D/g, '');
  return digits ? `BUS-${digits.padStart(2, '0')}` : String(busId).trim().toUpperCase();
}

export function buildHistoryFilterKey(
  busId: string | undefined,
  isChofer: boolean,
  filter: string,
  monthValue?: string
): string {
  const busKey = normalizeCacheBusKey(busId);
  if (isChofer) return `${busKey}__chofer`;
  if (filter === 'mes') return `${busKey}__mes__${monthValue || ''}`;
  return `${busKey}__${filter}`;
}

export function getHomeSummarySnapshot(busId?: string | null): HomeSummarySnapshot | null {
  const key = normalizeCacheBusKey(busId);
  const mem = memoryHomeCache.get(key);
  if (mem) return mem;

  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(`${HOME_SNAPSHOT_PREFIX}${key}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as HomeSummarySnapshot;
    if (parsed && typeof parsed.routeIncome === 'number') {
      memoryHomeCache.set(key, parsed);
      return parsed;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function saveHomeSummarySnapshot(
  busId: string | null | undefined,
  snapshot: Omit<HomeSummarySnapshot, 'busId' | 'updatedAt'>
): HomeSummarySnapshot {
  const key = normalizeCacheBusKey(busId);
  const full: HomeSummarySnapshot = {
    ...snapshot,
    busId: key,
    updatedAt: Date.now(),
  };
  memoryHomeCache.set(key, full);
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(`${HOME_SNAPSHOT_PREFIX}${key}`, JSON.stringify(full));
    } catch {
      /* ignore quota */
    }
  }
  return full;
}

export function getHistoryRecordsSnapshot(filterKey: string): SavedRecord[] | null {
  const mem = memoryHistoryCache.get(filterKey);
  if (mem) return mem;

  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(`${HISTORY_SNAPSHOT_PREFIX}${filterKey}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      memoryHistoryCache.set(filterKey, parsed);
      return parsed;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function saveHistoryRecordsSnapshot(
  filterKey: string,
  records: SavedRecord[]
): void {
  // Guardar versión liviana sin photoUrl para no saturar localStorage
  const slim = (records || []).slice(0, 90).map((r) => {
    const { photoUrl, ...rest } = r as SavedRecord & { photoUrl?: string };
    return rest as SavedRecord;
  });
  memoryHistoryCache.set(filterKey, slim);
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(`${HISTORY_SNAPSHOT_PREFIX}${filterKey}`, JSON.stringify(slim));
    } catch {
      /* ignore quota */
    }
  }
}

export async function fetchBusesCached(socioId?: string | null): Promise<any[]> {
  const key = socioId && socioId !== 'TODOS' ? String(socioId) : 'ALL';
  const now = Date.now();
  const mem = memoryBusesCache.get(key);
  if (mem && now - mem.timestamp < SESSION_TTL_MS) {
    return mem.data;
  }

  if (typeof window !== 'undefined' && !mem) {
    try {
      const raw = localStorage.getItem(`${BUSES_CACHE_PREFIX}${key}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          memoryBusesCache.set(key, { data: parsed, timestamp: now - SESSION_TTL_MS / 2 });
        }
      }
    } catch {
      /* ignore */
    }
  }

  const url = key !== 'ALL' ? `/api/buses?socioId=${encodeURIComponent(key)}` : '/api/buses';
  try {
    const res = await fetch(url);
    if (res.ok) {
      const json = await res.json();
      const list = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
      memoryBusesCache.set(key, { data: list, timestamp: Date.now() });
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(`${BUSES_CACHE_PREFIX}${key}`, JSON.stringify(list));
        } catch {}
      }
      return list;
    }
  } catch {
    /* fallback to cache */
  }
  return memoryBusesCache.get(key)?.data || [];
}

export async function fetchPersonasCached(socioId?: string | null): Promise<any[]> {
  const key = socioId && socioId !== 'TODOS' ? String(socioId) : 'ALL';
  const now = Date.now();
  const mem = memoryPersonasCache.get(key);
  if (mem && now - mem.timestamp < SESSION_TTL_MS) {
    return mem.data;
  }

  if (typeof window !== 'undefined' && !mem) {
    try {
      const raw = localStorage.getItem(`${PERSONAS_CACHE_PREFIX}${key}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          memoryPersonasCache.set(key, { data: parsed, timestamp: now - SESSION_TTL_MS / 2 });
        }
      }
    } catch {
      /* ignore */
    }
  }

  const url = key !== 'ALL' ? `/api/personas?socioId=${encodeURIComponent(key)}` : '/api/personas';
  try {
    const res = await fetch(url);
    if (res.ok) {
      const list = await res.json();
      if (Array.isArray(list)) {
        memoryPersonasCache.set(key, { data: list, timestamp: Date.now() });
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(`${PERSONAS_CACHE_PREFIX}${key}`, JSON.stringify(list));
          } catch {}
        }
        return list;
      }
    }
  } catch {
    /* fallback to cache */
  }
  return memoryPersonasCache.get(key)?.data || [];
}
