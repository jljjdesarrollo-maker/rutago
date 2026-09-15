export type RolUsuario = 'SUPERADMIN_SAAS' | 'SOCIO' | 'CHOFER' | 'AYUDANTE';

export type EstadoSuscripcion = 'ACTIVA' | 'POR_VENCER' | 'VENCIDA' | 'GRACIA';

export interface SuscripcionSocio {
  id: string;
  socioId: string;
  busId: string;
  numeroDisco: string;
  montoMensual: number; // Ej. 20.00 USD / mes por bus
  diaPagoMensual: number; // Ej. día 5 de cada mes
  fechaUltimoPago?: string; // YYYY-MM-DD
  fechaProximoCorte: string; // YYYY-MM-DD
  estado: EstadoSuscripcion;
  comprobanteUltimoPago?: string;
  notas?: string;
}

export interface Socio {
  id: string; // Ej. "SOCIO-01", "SOCIO-02"
  nombre: string;
  cedula: string;
  telefono?: string;
  email?: string;
  pinAcceso: string; // PIN de 4 dígitos para login
  activo: boolean;
  esPropietarioSaaS?: boolean; // true si es la cuenta personal del dueño de la app
  busIdsAsignados: string[]; // Ej. ["BUS-01"]
  // Promociones configurables por socio para sus buses
  configuracionPromocion?: {
    promocionPasajeGratisHabilitada: boolean; // Toggle opcional por socio
    viajesParaGratis: number; // Por defecto 10 viajes = 1 gratis
    textoTicketPromo?: string;
  };
}

export interface SesionUsuario {
  rol: RolUsuario;
  socioId?: string;
  socioNombre?: string;
  personaId?: string;
  personaNombre?: string;
  busIdActivo?: string;
  esModoPropietarioSaaS: boolean;
}
