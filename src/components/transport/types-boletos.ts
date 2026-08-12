export interface FrecuenciaData {
  id: string;
  vtCode: string;
  nombre: string;
  ruta: string;
  hora: string;
  direccion: string;
  activo: boolean;
  createdAt: string;
}

export interface FrecuenciaEstado {
  id: string;
  estadoId: string;
  frecuenciaId: string;
  nombre: string;
  ruta: string;
  hora: string;
  direccion: string;
  estado: 'pendiente' | 'abierta' | 'cerrada' | 'no_realizada';
  ventasCount: number;
  totalRecaudado: number;
}

export interface VTSession {
  vtCode: string;
  nombre: string;
  ayudanteId: string;
  ayudanteNombre: string;
  fecha: string; // Fecha del turno (cuando se inició, no necesariamente hoy)
}
