/**
 * Almacenamiento y Gestión de Pagos de Paradas de Taller y Arrastre de Saldos de VT (Fases 3 y 4)
 * Separa roles: Chofer (reset mecánico), Ayudante (dinero y arqueo), Socio (contabilidad patrimonial).
 */

import { deleteOwnerExpense } from './owner-expenses-storage';

export type ParadaPagador = 'AYUDANTE' | 'SOCIO';
export type SocioModalidadPago = 'TRANSFERENCIA_TOTAL' | 'TRANSFERENCIA_PARCIAL' | 'CREDITO_FIADO';

export interface ParadaPagoRegistro {
  id: string;
  busId: string;
  disco: string;
  fecha: string; // YYYY-MM-DD
  estacionId: string;
  estacionNombre: string;
  taller: string;
  factura?: string;
  odometroKm: number;
  costoTotal: number;
  pagador: ParadaPagador;
  montoCubiertoAyudante?: number;
  descontadoEnVT?: boolean;
  socioModalidad?: SocioModalidadPago;
  socioMontoTransferido?: number;
  socioSaldoPendiente?: number;
  ownerExpenseId?: string;
  createdAt: string;
}

export interface DeficitArrastradoVT {
  busId: string;
  amount: number;
  fechaOrigen: string;
  descripcion: string;
  tallerOrigen?: string;
  createdAt: string;
}

const STORAGE_PARADAS_KEY = 'rg_paradas_pago_v1';
const STORAGE_DEFICIT_PREFIX = 'rg_deficit_arrastre_vt_';

/**
 * Guarda o actualiza un registro de pago de parada técnica
 */
export function saveParadaPago(registro: ParadaPagoRegistro): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(STORAGE_PARADAS_KEY);
    const list: ParadaPagoRegistro[] = raw ? JSON.parse(raw) : [];
    const idx = list.findIndex(p => p.id === registro.id);
    if (idx >= 0) {
      list[idx] = registro;
    } else {
      list.unshift(registro);
    }
    localStorage.setItem(STORAGE_PARADAS_KEY, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent('rg_paradas_pago_updated', { detail: { busId: registro.busId, paradaId: registro.id } }));
  } catch (err) {
    console.error('Error guardando pago de parada:', err);
  }
}

/**
 * Obtiene todas las paradas de una unidad
 */
export function getParadasPagoByBus(busId: string): ParadaPagoRegistro[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_PARADAS_KEY);
    if (!raw) return [];
    const list: ParadaPagoRegistro[] = JSON.parse(raw);
    return list.filter(p => p.busId === busId);
  } catch {
    return [];
  }
}

/**
 * Obtiene paradas que pagó el ayudante pendientes de descontar en el arqueo de la fecha indicada
 */
export function getParadasAyudantePendientesArqueo(busId: string, fecha: string): ParadaPagoRegistro[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_PARADAS_KEY);
    if (!raw) return [];
    const list: ParadaPagoRegistro[] = JSON.parse(raw);
    return list.filter(
      p => p.busId === busId && p.fecha === fecha && p.pagador === 'AYUDANTE' && !p.descontadoEnVT
    );
  } catch {
    return [];
  }
}

/**
 * Marca una o varias paradas como formalmente descontadas en el Arqueo General de la VT
 */
export function markParadasComoDescontadas(paradaIds: string[]): void {
  if (typeof window === 'undefined' || paradaIds.length === 0) return;
  try {
    const raw = localStorage.getItem(STORAGE_PARADAS_KEY);
    if (!raw) return;
    const list: ParadaPagoRegistro[] = JSON.parse(raw);
    const setIds = new Set(paradaIds);
    let modificado = false;
    const updated = list.map(p => {
      if (setIds.has(p.id)) {
        modificado = true;
        return { ...p, descontadoEnVT: true };
      }
      return p;
    });
    if (modificado) {
      localStorage.setItem(STORAGE_PARADAS_KEY, JSON.stringify(updated));
    }
  } catch (err) {
    console.error('Error marcando paradas descontadas:', err);
  }
}

/**
 * Obtiene el déficit operativo arrastrado de una unidad (si la recaudación no alcanzó a cubrir el taller)
 */
export function getDeficitArrastradoVT(busId: string): DeficitArrastradoVT | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(`${STORAGE_DEFICIT_PREFIX}${busId}`);
    if (!raw) return null;
    const data: DeficitArrastradoVT = JSON.parse(raw);
    if (data.amount <= 0) return null;
    return data;
  } catch {
    return null;
  }
}

/**
 * Guarda o actualiza el déficit operativo arrastrado para la siguiente VT
 */
export function saveDeficitArrastradoVT(
  busId: string,
  amount: number,
  fechaOrigen: string,
  descripcion: string,
  tallerOrigen?: string
): void {
  if (typeof window === 'undefined') return;
  try {
    if (amount <= 0) {
      clearDeficitArrastradoVT(busId);
      return;
    }
    const data: DeficitArrastradoVT = {
      busId,
      amount: Math.round(amount * 100) / 100,
      fechaOrigen,
      descripcion,
      tallerOrigen,
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem(`${STORAGE_DEFICIT_PREFIX}${busId}`, JSON.stringify(data));
  } catch (err) {
    console.error('Error guardando deficit arrastrado de VT:', err);
  }
}

/**
 * Elimina o extingue el déficit arrastrado cuando ha sido completamente cubierto
 */
export function clearDeficitArrastradoVT(busId: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(`${STORAGE_DEFICIT_PREFIX}${busId}`);
  } catch {
    // ignore
  }
}

/**
 * Obtiene un registro de parada técnica asociado a un ID de gasto contable
 */
export function getParadaPagoByExpenseId(expenseId: string): ParadaPagoRegistro | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const raw = localStorage.getItem(STORAGE_PARADAS_KEY);
    if (!raw) return undefined;
    const list: ParadaPagoRegistro[] = JSON.parse(raw);
    return list.find(p => p.ownerExpenseId === expenseId);
  } catch {
    return undefined;
  }
}

/**
 * Actualiza el saldo pendiente y transferido de una parada técnica cuando el socio realiza un abono
 */
export function updateParadaPagoAbono(expenseId: string, montoAbono: number): void {
  if (typeof window === 'undefined' || montoAbono <= 0) return;
  try {
    const raw = localStorage.getItem(STORAGE_PARADAS_KEY);
    if (!raw) return;
    const list: ParadaPagoRegistro[] = JSON.parse(raw);
    let modificado = false;
    const updated = list.map(p => {
      if (p.ownerExpenseId === expenseId) {
        modificado = true;
        const prevTransferido = p.socioMontoTransferido || 0;
        const nuevoTransferido = Math.min(p.costoTotal, prevTransferido + montoAbono);
        const nuevoSaldo = Math.max(0, p.costoTotal - nuevoTransferido);
        return {
          ...p,
          socioMontoTransferido: nuevoTransferido,
          socioSaldoPendiente: nuevoSaldo,
          socioModalidad: (nuevoSaldo <= 0 ? 'TRANSFERENCIA_TOTAL' : 'TRANSFERENCIA_PARCIAL') as SocioModalidadPago,
        };
      }
      return p;
    });
    if (modificado) {
      localStorage.setItem(STORAGE_PARADAS_KEY, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('rg_paradas_pago_updated', { detail: { expenseId } }));
    }
  } catch (err) {
    console.error('Error actualizando abono en parada técnica:', err);
  }
}

/**
 * FASE B: Anula y elimina un registro de parada técnica en CASCADA LIMPIA:
 * 1. Lo retira del historial de paradas de la unidad.
 * 2. Si generó un gasto contable al Socio (ownerExpenseId), lo elimina de OwnerExpense y deudas.
 * 3. Si afectó el arqueo pendiente del ayudante, lo cancela para que no descuente en VT.
 * 4. Emite eventos reactivos globales para actualizar la UI en vivo.
 */
export function deleteParadaPagoCascada(paradaId: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = localStorage.getItem(STORAGE_PARADAS_KEY);
    if (!raw) return false;
    const list: ParadaPagoRegistro[] = JSON.parse(raw);
    const target = list.find(p => p.id === paradaId);
    if (!target) return false;

    // 1. Eliminar de la lista de paradas
    const updatedList = list.filter(p => p.id !== paradaId);
    localStorage.setItem(STORAGE_PARADAS_KEY, JSON.stringify(updatedList));

    // 2. Si tenía gasto de socio vinculado, eliminarlo en cascada
    if (target.ownerExpenseId) {
      deleteOwnerExpense(target.ownerExpenseId);
      window.dispatchEvent(new CustomEvent('rg_owner_expenses_sync', { detail: { expenseId: target.ownerExpenseId, deleted: true } }));
    }

    // 3. Notificar actualización reactiva a todos los componentes
    window.dispatchEvent(new CustomEvent('rg_paradas_pago_updated', { detail: { busId: target.busId, paradaId, deleted: true } }));
    return true;
  } catch (err) {
    console.error('Error al eliminar parada técnica en cascada:', err);
    return false;
  }
}

/**
 * FASE B: Limpieza total de registros de paradas de prueba para una unidad específica
 */
export function clearAllParadasByBus(busId: string): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = localStorage.getItem(STORAGE_PARADAS_KEY);
    if (!raw) return 0;
    const list: ParadaPagoRegistro[] = JSON.parse(raw);
    const paradasDeBus = list.filter(p => p.busId === busId);
    if (paradasDeBus.length === 0) return 0;

    // Eliminar gastos asociados
    paradasDeBus.forEach(p => {
      if (p.ownerExpenseId) {
        deleteOwnerExpense(p.ownerExpenseId);
      }
    });

    const restantes = list.filter(p => p.busId !== busId);
    localStorage.setItem(STORAGE_PARADAS_KEY, JSON.stringify(restantes));

    window.dispatchEvent(new CustomEvent('rg_owner_expenses_sync', { detail: { busId, cleared: true } }));
    window.dispatchEvent(new CustomEvent('rg_paradas_pago_updated', { detail: { busId, cleared: true } }));
    return paradasDeBus.length;
  } catch (err) {
    console.error('Error al limpiar paradas de prueba del bus:', err);
    return 0;
  }
}
