export interface TripData {
  routeFrom: string;
  routeTo: string;
  time: string;
  income: string;
  boletos: string;
}

export interface ExpenseData {
  description: string;
  amount: string;
}

export interface RecordFormData {
  date: string;
  km: string;
  conductor: string;
  ayudanteNombre: string;
  vtCode: string;
  trips: TripData[];
  expenses: ExpenseData[];
  tickets: string;
  sobrante: string;
}

export interface SavedRecord {
  id: string;
  date: string;
  km: string | null;
  conductor: string | null;
  ayudanteNombre: string | null;
  vtCode: string | null;
  production: number;
  cajaComun: number;
  sobrante: number;
  tickets: number;
  entregaAyudante: number;
  entregaCompania: number;
  totalGastos: number;
  photoUrl: string | null;
  createdAt: string;
  trips: {
    id: string;
    order: number;
    routeFrom: string;
    routeTo: string;
    time: string | null;
    income: number;
    efectivoReal: number;
    boletos: number;
  }[];
  expenses: {
    id: string;
    order: number;
    description: string;
    amount: number;
  }[];
}

export interface UserSession {
  id: string;
  nombre: string;
  rol: string;
  esActual?: boolean;
}

export type AppView = 'home' | 'form' | 'history' | 'reports' | 'operativo' | 'personal' | 'vtconfig' | 'compare' | 'ventas_review' | 'boletos_home' | 'boletos_frecuencias' | 'boletos_tickets' | 'boletos_cierre' | 'boletos_arqueo' | 'boletos_arqueo_general' | 'boletos_sync' | 'carga_historica';

export function num(v: string): number {
  return parseFloat(v) || 0;
}

export function getCurrentConductor(): Promise<string | null> {
  return fetch('/api/personas').then(r => r.json()).then((list: Array<{ esActual: boolean; rol: string; nombre: string }>) => {
    const c = list.find(p => p.rol === 'CONDUCTOR' && p.esActual);
    return c ? c.nombre : null;
  }).catch(() => null);
}

export function getCurrentAyudante(): Promise<string | null> {
  return fetch('/api/personas').then(r => r.json()).then((list: Array<{ esActual: boolean; rol: string; nombre: string }>) => {
    const a = list.find(p => p.rol === 'AYUDANTE' && p.esActual);
    return a ? a.nombre : null;
  }).catch(() => null);
}

export function createEmptyFormData(): RecordFormData {
  return {
    date: new Date().toISOString().split('T')[0],
    km: '',
    conductor: '',
    ayudanteNombre: '',
    vtCode: '',
    trips: [],
    expenses: [
      { description: 'Chofer', amount: '30' },
      { description: 'Ayudante', amount: '20' },
      { description: 'Diesel', amount: '0' },
      { description: 'Plan Renova', amount: '68' },
    ],
    tickets: '',
    sobrante: '',
  };
}
