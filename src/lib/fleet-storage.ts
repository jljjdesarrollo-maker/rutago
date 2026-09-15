import { BusItem } from '../types/fleet';

const STORAGE_KEY = 'rutago_fleet_buses_v1';
const INITIALIZED_KEY = 'rutago_fleet_buses_initialized_flag';

// ─── UNIDAD 01 OFICIAL DEL SOCIO LÍDER (DATOS VALIDADOS) ───
export const INITIAL_PILOT_BUS: BusItem = {
  id: 'BUS-01',
  numeroDisco: '01',
  placa: 'TAA-5152',
  marca: 'Hino AK',
  modelo: 'AK',
  anio: 2022,
  capacidadAsientos: 45,
  propietario: 'José Leonardo Jaya Jaramillo',
  tipoOperacion: 'TRONCAL_VT',
  activo: true,
  notas: 'Unidad Piloto del Socio Líder • Circuito Troncal General (VT01 - VT15)',
};

/**
 * Obtiene todas las unidades de la flota guardadas localmente.
 * Si no existen, inicializa automáticamente con la Unidad 01 del Socio Líder.
 */
export function getAllBuses(): BusItem[] {
  if (typeof window === 'undefined') return [INITIAL_PILOT_BUS];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Primera inicialización automática con Bus 01
      const initial = [INITIAL_PILOT_BUS];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      localStorage.setItem(INITIALIZED_KEY, 'true');
      return initial;
    }
    const list: BusItem[] = JSON.parse(raw);
    // Garantizar que la Unidad 01 siempre exista con los datos oficiales
    const hasBus01 = list.some((b) => b.numeroDisco === '01' || b.id === 'BUS-01');
    if (!hasBus01) {
      list.unshift(INITIAL_PILOT_BUS);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    }
    return list;
  } catch (err) {
    console.error('Error cargando catálogo de flota:', err);
    return [INITIAL_PILOT_BUS];
  }
}

/**
 * Obtiene una unidad por número de disco o por ID.
 */
export function getBusByDisco(discoOrId: string): BusItem | undefined {
  const buses = getAllBuses();
  const normalized = discoOrId.trim().toUpperCase();
  return buses.find(
    (b) =>
      b.id.toUpperCase() === normalized ||
      b.numeroDisco.toUpperCase() === normalized ||
      `BUS-${b.numeroDisco}`.toUpperCase() === normalized
  );
}

/**
 * Guarda o actualiza una unidad en el almacenamiento local.
 */
export function saveBus(bus: BusItem): BusItem {
  if (typeof window === 'undefined') return bus;
  try {
    const buses = getAllBuses();
    const existingIndex = buses.findIndex(
      (b) => b.id === bus.id || b.numeroDisco === bus.numeroDisco
    );
    if (existingIndex >= 0) {
      buses[existingIndex] = { ...buses[existingIndex], ...bus, updatedAt: new Date().toISOString() };
    } else {
      buses.push({ ...bus, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(buses));
    return bus;
  } catch (err) {
    console.error('Error guardando unidad de flota:', err);
    return bus;
  }
}

/**
 * Elimina una unidad por su ID.
 */
export function deleteBus(id: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const buses = getAllBuses();
    const filtered = buses.filter((b) => b.id !== id && b.numeroDisco !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return true;
  } catch (err) {
    console.error('Error eliminando unidad de flota:', err);
    return false;
  }
}

// ─── COMUNICACIÓN ASÍNCRONA CON LA API CENTRAL (/api/buses) ───

export async function fetchBusesFromApi(): Promise<BusItem[]> {
  try {
    const res = await fetch('/api/buses', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const json = await res.json();
    if (json.success && Array.isArray(json.data) && json.data.length > 0) {
      // Sincronizar hacia localStorage para disponibilidad offline
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(json.data));
      }
      return json.data;
    }
    return getAllBuses();
  } catch (err) {
    console.warn('Conexión con /api/buses offline o fallida, usando caché local:', err);
    return getAllBuses();
  }
}

export async function saveBusToApi(bus: Partial<BusItem>): Promise<BusItem | null> {
  try {
    const res = await fetch('/api/buses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bus),
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const json = await res.json();
    if (json.success && json.data) {
      saveBus(json.data);
      return json.data;
    }
    return null;
  } catch (err) {
    console.error('Error al sincronizar unidad con la API:', err);
    return null;
  }
}

export async function updateBusInApi(id: string, bus: Partial<BusItem>): Promise<BusItem | null> {
  try {
    const res = await fetch(`/api/buses`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...bus }),
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const json = await res.json();
    if (json.success && json.data) {
      saveBus(json.data);
      return json.data;
    }
    return null;
  } catch (err) {
    console.error('Error al actualizar unidad en la API:', err);
    return null;
  }
}

export async function deleteBusFromApi(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/buses?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const json = await res.json();
    if (json.success) {
      deleteBus(id);
      return true;
    }
    return false;
  } catch (err) {
    console.error('Error al eliminar unidad en la API:', err);
    return false;
  }
}
