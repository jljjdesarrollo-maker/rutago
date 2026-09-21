import { PromoViajeGratisConfig } from '../components/transport/types-boletos';

export type TipoOperacionBus = 'TRONCAL_VT' | 'ALIMENTADOR_P';

export interface BusItem {
  id: string;
  numeroDisco: string; // "01", "10", "16", "18"
  placa: string; // "TAA-5152"
  marca: string; // "Hino AK"
  modelo?: string; // "AK"
  anio?: number;
  capacidadAsientos: number; // 45 para buses grandes, 25-30 para microbuses
  propietario: string; // "José Leonardo Jaya Jaramillo" o "VilcabambaTuris Cía. Ltda."
  tipoOperacion: TipoOperacionBus; // TRONCAL_VT (VT01-VT15) vs ALIMENTADOR_P (P1-P3)
  activo: boolean;
  notas?: string;
  promoConfig?: PromoViajeGratisConfig;
  odometroInicial?: string; // Configuración desacoplada de Viaje Gratis por Unidad
  createdAt?: string;
  updatedAt?: string;
}

export interface BusFormData {
  numeroDisco: string;
  placa: string;
  marca: string;
  modelo?: string;
  anio?: number | '';
  capacidadAsientos: number;
  propietario: string;
  tipoOperacion: TipoOperacionBus;
  activo: boolean;
  notas?: string;
  promoConfig?: PromoViajeGratisConfig;
  odometroInicial?: string;
}
