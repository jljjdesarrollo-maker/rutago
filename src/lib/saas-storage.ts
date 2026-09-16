import { Socio, SuscripcionSocio, SesionUsuario } from '@/types/saas';
import { BusItem } from '@/types/fleet';
import { getAllBuses } from './fleet-storage';

const SOCIOS_STORAGE_KEY = 'rutago_socios_list';
const SUSCRIPCIONES_STORAGE_KEY = 'rutago_suscripciones_list';
const SESION_STORAGE_KEY = 'rutago_sesion_activa';

// Socios semilla iniciales (Unidad 01 asignada al Socio Líder / Propietario)
const INITIAL_SOCIOS: Socio[] = [
  {
    id: 'SOCIO-01',
    nombre: 'Socio Líder (Propietario RutaGo)',
    cedula: '1104123456',
    telefono: '0991234567',
    email: 'ciavilcabambaturis@gmail.com',
    pinAcceso: '2026',
    activo: true,
    esPropietarioSaaS: true,
    busIdsAsignados: ['BUS-01'],
    configuracionPromocion: {
      promocionPasajeGratisHabilitada: true,
      viajesParaGratis: 10,
      textoTicketPromo: '¡Viaja 10 veces y el 11vo es GRATIS!',
    },
  },
  {
    id: 'SOCIO-02',
    nombre: 'Manuel Benítez',
    cedula: '1103987654',
    telefono: '0987654321',
    pinAcceso: '1002',
    activo: true,
    esPropietarioSaaS: false,
    busIdsAsignados: ['BUS-02'],
    configuracionPromocion: {
      promocionPasajeGratisHabilitada: false, // Por defecto apagada si el socio no desea asumirla
      viajesParaGratis: 10,
    },
  },
  {
    id: 'SOCIO-05',
    nombre: 'Rodrigo Guamán',
    cedula: '1102554433',
    telefono: '0978112233',
    pinAcceso: '1005',
    activo: true,
    esPropietarioSaaS: false,
    busIdsAsignados: ['BUS-05'],
    configuracionPromocion: {
      promocionPasajeGratisHabilitada: false,
      viajesParaGratis: 10,
    },
  },
];

// Suscripciones semilla
const INITIAL_SUSCRIPCIONES: SuscripcionSocio[] = [
  {
    id: 'SUB-01',
    socioId: 'SOCIO-01',
    busId: 'BUS-01',
    numeroDisco: '01',
    montoMensual: 20.00,
    diaPagoMensual: 1,
    fechaUltimoPago: '2026-09-01',
    fechaProximoCorte: '2026-10-01',
    estado: 'ACTIVA',
    notas: 'Unidad Piloto Socio Fundador',
  },
  {
    id: 'SUB-02',
    socioId: 'SOCIO-02',
    busId: 'BUS-02',
    numeroDisco: '02',
    montoMensual: 20.00,
    diaPagoMensual: 5,
    fechaUltimoPago: '2026-09-05',
    fechaProximoCorte: '2026-10-05',
    estado: 'ACTIVA',
  },
  {
    id: 'SUB-05',
    socioId: 'SOCIO-05',
    busId: 'BUS-05',
    numeroDisco: '05',
    montoMensual: 20.00,
    diaPagoMensual: 10,
    fechaUltimoPago: '2026-08-10',
    fechaProximoCorte: '2026-09-10',
    estado: 'POR_VENCER',
    notas: 'Pendiente transferencia septiembre',
  },
];

export function getSocios(): Socio[] {
  if (typeof window === 'undefined') return INITIAL_SOCIOS;
  try {
    const raw = localStorage.getItem(SOCIOS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(SOCIOS_STORAGE_KEY, JSON.stringify(INITIAL_SOCIOS));
      return INITIAL_SOCIOS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_SOCIOS;
  }
}

export function saveSocio(socio: Socio): void {
  if (typeof window === 'undefined') return;
  try {
    const socios = getSocios();
    const idx = socios.findIndex(s => s.id === socio.id);
    if (idx >= 0) {
      socios[idx] = socio;
    } else {
      socios.push(socio);
    }
    localStorage.setItem(SOCIOS_STORAGE_KEY, JSON.stringify(socios));
  } catch (err) {
    console.error('Error saving socio:', err);
  }
}

export function getSuscripciones(): SuscripcionSocio[] {
  if (typeof window === 'undefined') return INITIAL_SUSCRIPCIONES;
  try {
    const raw = localStorage.getItem(SUSCRIPCIONES_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(SUSCRIPCIONES_STORAGE_KEY, JSON.stringify(INITIAL_SUSCRIPCIONES));
      return INITIAL_SUSCRIPCIONES;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_SUSCRIPCIONES;
  }
}

export function saveSuscripcion(sub: SuscripcionSocio): void {
  if (typeof window === 'undefined') return;
  try {
    const list = getSuscripciones();
    const idx = list.findIndex(s => s.id === sub.id);
    if (idx >= 0) {
      list[idx] = sub;
    } else {
      list.push(sub);
    }
    localStorage.setItem(SUSCRIPCIONES_STORAGE_KEY, JSON.stringify(list));
  } catch (err) {
    console.error('Error saving suscripcion:', err);
  }
}

export function getBusesForSocio(socioId: string): BusItem[] {
  const allBuses = getAllBuses();
  const socios = getSocios();
  const socio = socios.find(s => s.id === socioId);
  if (!socio) return [];
  return allBuses.filter(b => socio.busIdsAsignados.includes(b.id));
}

// Sesión Activa y Switch de Rol
export function getSesionActiva(): SesionUsuario {
  if (typeof window === 'undefined') {
    return {
      rol: 'SUPERADMIN_SAAS',
      esModoPropietarioSaaS: true,
      socioId: 'SOCIO-01',
      socioNombre: 'Socio Líder (Propietario RutaGo)',
      busIdActivo: 'BUS-01',
    };
  }
  try {
    const raw = localStorage.getItem(SESION_STORAGE_KEY);
    if (!raw) {
      const defaultSesion: SesionUsuario = {
        rol: 'SUPERADMIN_SAAS',
        esModoPropietarioSaaS: true,
        socioId: 'SOCIO-01',
        socioNombre: 'Socio Líder (Propietario RutaGo)',
        busIdActivo: 'BUS-01',
      };
      localStorage.setItem(SESION_STORAGE_KEY, JSON.stringify(defaultSesion));
      return defaultSesion;
    }
    return JSON.parse(raw);
  } catch {
    return {
      rol: 'SUPERADMIN_SAAS',
      esModoPropietarioSaaS: true,
      socioId: 'SOCIO-01',
      busIdActivo: 'BUS-01',
    };
  }
}

export function setSesionActiva(sesion: SesionUsuario): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SESION_STORAGE_KEY, JSON.stringify(sesion));
  } catch (err) {
    console.error('Error setting sesion:', err);
  }
}
