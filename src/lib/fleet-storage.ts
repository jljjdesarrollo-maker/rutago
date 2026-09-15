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

// ─── FLOTA DEMO / BENCHMARK COOPERATIVA (19 BUSES DE REFERENCIA) ───
export const BENCHMARK_FLEET_BUSES: BusItem[] = [
  INITIAL_PILOT_BUS,
  {
    id: 'BUS-02',
    numeroDisco: '02',
    placa: 'TAA-4102',
    marca: 'Hino AK',
    modelo: 'AK',
    anio: 2021,
    capacidadAsientos: 45,
    propietario: 'Socio VilcabambaTuris',
    tipoOperacion: 'TRONCAL_VT',
    activo: true,
  },
  {
    id: 'BUS-03',
    numeroDisco: '03',
    placa: 'TAA-3903',
    marca: 'Hino AK',
    modelo: 'AK',
    anio: 2020,
    capacidadAsientos: 45,
    propietario: 'Socio VilcabambaTuris',
    tipoOperacion: 'TRONCAL_VT',
    activo: true,
  },
  {
    id: 'BUS-04',
    numeroDisco: '04',
    placa: 'TAA-4004',
    marca: 'Hino AK',
    modelo: 'AK',
    anio: 2019,
    capacidadAsientos: 45,
    propietario: 'Socio VilcabambaTuris',
    tipoOperacion: 'TRONCAL_VT',
    activo: true,
  },
  {
    id: 'BUS-10',
    numeroDisco: '10',
    placa: 'TAA-3420',
    marca: 'Hino AK',
    modelo: 'AK',
    anio: 2022,
    capacidadAsientos: 45,
    propietario: 'Socio VilcabambaTuris',
    tipoOperacion: 'TRONCAL_VT',
    activo: true,
    notas: 'Unidad Troncal de Alta Capacidad • VT01 - VT15',
  },
  {
    id: 'BUS-12',
    numeroDisco: '12',
    placa: 'TAA-4212',
    marca: 'Hino AK',
    modelo: 'AK',
    anio: 2021,
    capacidadAsientos: 45,
    propietario: 'Socio VilcabambaTuris',
    tipoOperacion: 'TRONCAL_VT',
    activo: true,
    notas: 'Unidad Troncal de Alta Capacidad • VT01 - VT15',
  },
  {
    id: 'BUS-16',
    numeroDisco: '16',
    placa: 'LBA-7816',
    marca: 'Hino FC',
    modelo: 'FC Microbús',
    anio: 2023,
    capacidadAsientos: 28,
    propietario: 'Socio Alimentador',
    tipoOperacion: 'ALIMENTADOR_P',
    activo: true,
    notas: 'Circuito Especial Alimentador P1-P3 (Yangana / La Elvira / Quinara)',
  },
  {
    id: 'BUS-17',
    numeroDisco: '17',
    placa: 'LBA-7917',
    marca: 'Hino FC',
    modelo: 'FC Microbús',
    anio: 2023,
    capacidadAsientos: 28,
    propietario: 'Socio Alimentador',
    tipoOperacion: 'ALIMENTADOR_P',
    activo: true,
    notas: 'Circuito Especial Alimentador P1-P3 (Yangana / La Elvira / Quinara)',
  },
  {
    id: 'BUS-18',
    numeroDisco: '18',
    placa: 'TAA-4018',
    marca: 'Hino AK',
    modelo: 'AK',
    anio: 2021,
    capacidadAsientos: 45,
    propietario: 'Socio VilcabambaTuris',
    tipoOperacion: 'TRONCAL_VT',
    activo: true,
    notas: 'Unidad Troncal de Alta Capacidad • VT01 - VT15',
  },
  {
    id: 'BUS-19',
    numeroDisco: '19',
    placa: 'TAA-4919',
    marca: 'Hino AK',
    modelo: 'AK',
    anio: 2022,
    capacidadAsientos: 45,
    propietario: 'Socio VilcabambaTuris',
    tipoOperacion: 'TRONCAL_VT',
    activo: true,
    notas: 'Unidad Troncal de Alta Capacidad • VT01 - VT15',
  },
];

/**
 * Obtiene todas las unidades de la flota guardadas localmente.
 * Si no existen o faltan unidades de la cooperativa, inicializa automáticamente
 * respetando a la Unidad 01 del Socio Líder en primer lugar.
 */
export function getAllBuses(): BusItem[] {
  if (typeof window === 'undefined') return BENCHMARK_FLEET_BUSES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Primera inicialización automática con la flota oficial
      localStorage.setItem(STORAGE_KEY, JSON.stringify(BENCHMARK_FLEET_BUSES));
      localStorage.setItem(INITIALIZED_KEY, 'true');
      return BENCHMARK_FLEET_BUSES;
    }
    const list: BusItem[] = JSON.parse(raw);
    let modified = false;

    // Garantizar que todas las unidades de la cooperativa estén disponibles
    BENCHMARK_FLEET_BUSES.forEach((b) => {
      const exists = list.some(
        (item) => item.numeroDisco === b.numeroDisco || item.id === b.id
      );
      if (!exists) {
        list.push(b);
        modified = true;
      }
    });

    // Garantizar que la Unidad 01 siempre exista con los datos oficiales del Socio Líder
    const bus01Index = list.findIndex((b) => b.numeroDisco === '01' || b.id === 'BUS-01');
    if (bus01Index < 0) {
      list.unshift(INITIAL_PILOT_BUS);
      modified = true;
    }

    if (modified) {
      list.sort((a, b) =>
        a.numeroDisco.localeCompare(b.numeroDisco, undefined, { numeric: true })
      );
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    }
    return list;
  } catch (err) {
    console.error('Error cargando catálogo de flota:', err);
    return BENCHMARK_FLEET_BUSES;
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

export function seedBenchmarkFleet(): BusItem[] {
  if (typeof window === 'undefined') return BENCHMARK_FLEET_BUSES;
  try {
    const current = getAllBuses();
    const map = new Map<string, BusItem>();
    // Pre-cargar los actuales
    current.forEach((b) => map.set(b.numeroDisco, b));
    // Agregar benchmark sin sobreescribir si ya existe
    BENCHMARK_FLEET_BUSES.forEach((b) => {
      if (!map.has(b.numeroDisco)) {
        map.set(b.numeroDisco, b);
      }
    });
    const merged = Array.from(map.values()).sort((a, b) =>
      a.numeroDisco.localeCompare(b.numeroDisco, undefined, { numeric: true })
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    return merged;
  } catch (err) {
    console.error('Error semillando benchmark de flota:', err);
    return getAllBuses();
  }
}

// ─── GESTIÓN DE UNIDAD FÍSICA ACTIVA EN JORNADA (FASE 3) ───
export const ACTIVE_BUS_KEY = 'rutago_active_bus_id';

/**
 * Obtiene el autobús físico actualmente activo en el dispositivo.
 * Si no se ha seleccionado ninguno, retorna por defecto la Unidad Piloto 01 del Socio Líder.
 */
export function getActiveBus(): BusItem {
  if (typeof window === 'undefined') return INITIAL_PILOT_BUS;
  try {
    const savedId = localStorage.getItem(ACTIVE_BUS_KEY);
    if (savedId) {
      const found = getBusByDisco(savedId);
      if (found) return found;
    }
    // Fallback prioritario: Unidad 01
    const bus01 = getBusByDisco('01');
    if (bus01) return bus01;
    return INITIAL_PILOT_BUS;
  } catch (err) {
    console.error('Error obteniendo bus activo:', err);
    return INITIAL_PILOT_BUS;
  }
}

/**
 * Asigna y persiste el autobús físico activo en el dispositivo.
 * Despacha el evento `rutago:active_bus_changed` para reactividad en todas las pantallas.
 */
export function setActiveBus(discoOrId: string): BusItem {
  const bus = getBusByDisco(discoOrId) || INITIAL_PILOT_BUS;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(ACTIVE_BUS_KEY, bus.id);
      window.dispatchEvent(new CustomEvent('rutago:active_bus_changed', { detail: bus }));
    } catch (err) {
      console.error('Error guardando bus activo:', err);
    }
  }
  return bus;
}

/**
 * Suscripción reactiva al cambio de unidad física activa.
 */
export function subscribeToActiveBus(callback: (bus: BusItem) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = (event: Event) => {
    const custom = event as CustomEvent<BusItem>;
    if (custom.detail) {
      callback(custom.detail);
    } else {
      callback(getActiveBus());
    }
  };
  window.addEventListener('rutago:active_bus_changed', handler);
  window.addEventListener('storage', (e) => {
    if (e.key === ACTIVE_BUS_KEY) {
      callback(getActiveBus());
    }
  });
  return () => {
    window.removeEventListener('rutago:active_bus_changed', handler);
  };
}

// ─── CONTROL DE ODÓMETRO AISLADO POR AUTOBÚS FÍSICO (FASE 3.2) ───

export interface BusOdometerRecord {
  busId: string;
  numeroDisco: string;
  kmFinal: string;
  date: string;
  updatedAt: string;
}

/**
 * Almacena de forma persistente y dedicada la última lectura del odómetro para un autobús específico.
 */
export function saveBusOdometer(busIdOrDisco: string, kmFinal: string, date: string): void {
  if (typeof window === 'undefined' || !kmFinal || !kmFinal.trim()) return;
  try {
    const cleanDisco = busIdOrDisco.replace(/^BUS-/, '').padStart(2, '0');
    const key = `rutago_odometro_bus_${cleanDisco}`;
    const payload: BusOdometerRecord = {
      busId: `BUS-${cleanDisco}`,
      numeroDisco: cleanDisco,
      kmFinal: kmFinal.trim(),
      date,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(key, JSON.stringify(payload));
  } catch (err) {
    console.error('Error guardando odómetro de bus:', err);
  }
}

/**
 * Obtiene la última lectura conocida del odómetro para un autobús físico específico.
 */
export function getLatestBusOdometer(busIdOrDisco: string): { kmFinal: string; date: string } | null {
  if (typeof window === 'undefined') return null;
  try {
    const cleanDisco = busIdOrDisco.replace(/^BUS-/, '').padStart(2, '0');
    const key = `rutago_odometro_bus_${cleanDisco}`;
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.kmFinal) {
        return { kmFinal: parsed.kmFinal, date: parsed.date || '' };
      }
    }
    return null;
  } catch (err) {
    console.error('Error leyendo odómetro de bus:', err);
    return null;
  }
}


