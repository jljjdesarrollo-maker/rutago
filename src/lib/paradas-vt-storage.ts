/**
 * Almacenamiento y Gestión de Pagos de Paradas de Taller y Arrastre de Saldos de VT (Fases 3 y 4)
 * Separa roles: Chofer (reset mecánico), Ayudante (dinero y arqueo), Socio (contabilidad patrimonial).
 */

import { deleteOwnerExpense, getDeletedExpenseIds } from './owner-expenses-storage';

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
const STORAGE_DELETED_PARADAS_KEY = 'rg_paradas_pago_deleted_ids_v1';
const STORAGE_DEFICIT_PREFIX = 'rg_deficit_arrastre_vt_';

export function getDeletedParadaIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_DELETED_PARADAS_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

export function recordDeletedParadaId(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    const ids = getDeletedParadaIds();
    ids.add(id);
    localStorage.setItem(STORAGE_DELETED_PARADAS_KEY, JSON.stringify(Array.from(ids)));
  } catch (err) {
    console.warn('Error guardando tombstone de parada eliminada:', err);
  }
}

/**
 * Lector y sincronizador de compatibilidad retroactiva:
 * Proyecta e importa gastos de taller/mantenimiento previamente asentados en OwnerExpenses
 * hacia el Historial de Paradas Técnicas (rg_paradas_pago_v1), permitiendo auditarlos,
 * visualizarlos y anularlos en cascada limpia con el botón papelera [ 🗑️ ].
 */
export function syncRetroactiveParadasFromExpenses(busId?: string): number {
  if (typeof window === 'undefined') return 0;
  try {
    const rawParadas = localStorage.getItem(STORAGE_PARADAS_KEY);
    const paradasList: ParadaPagoRegistro[] = rawParadas ? JSON.parse(rawParadas) : [];

    // Conjunto de IDs ya vinculados o eliminados
    const existingExpenseIds = new Set<string>();
    const existingParadaIds = new Set<string>();
    paradasList.forEach((p) => {
      existingParadaIds.add(p.id);
      if (p.ownerExpenseId) existingExpenseIds.add(p.ownerExpenseId);
    });

    const deletedParadaIds = getDeletedParadaIds();
    const deletedExpenseIds = getDeletedExpenseIds();

    // Leer los gastos del socio
    const rawExpenses = localStorage.getItem('rutago_owner_expenses_v1');
    if (!rawExpenses) return 0;
    const allExpenses: any[] = JSON.parse(rawExpenses);

    // Muestras precargadas históricas de meses anteriores a excluir
    const sampleIds = new Set([
      'EXP-AUG-01',
      'EXP-AUG-02',
      'EXP-AUG-03',
      'EXP-AUG-04',
      'EXP-SEP-01',
      'EXP-SEP-02',
      'EXP-SEP-03',
      'EXP-SEP-04',
    ]);

    const categoriasTaller = new Set([
      'ACEITES_FILTROS',
      'FRENOS_RODAJE',
      'MOTOR_CAJA_CORONA',
      'LLANTAS',
      'ELECTRICO',
    ]);

    let agregados = 0;

    for (const exp of allExpenses) {
      if (!exp || !exp.id) continue;
      if (busId && exp.busId && exp.busId !== busId) continue;
      if (existingExpenseIds.has(exp.id)) continue;
      if (deletedExpenseIds.has(exp.id)) continue;
      if (sampleIds.has(exp.id)) continue;

      const generatedParadaId = `PARADA-RETRO-${exp.id}`;
      if (existingParadaIds.has(generatedParadaId) || deletedParadaIds.has(generatedParadaId)) {
        continue;
      }

      // Evaluar si es un gasto de mantenimiento / taller
      const esPrefijoTaller =
        exp.id.startsWith('gasto-lubricadora-') ||
        exp.id.startsWith('EXP-PARADA-') ||
        exp.id.startsWith('EXP-COMBO-') ||
        exp.id.startsWith('EXP-ESTACION-') ||
        exp.id.startsWith('EXP-MNT-');

      const esCategoriaMantenimiento = categoriasTaller.has(exp.category);

      const desc = (exp.description || '').toLowerCase();
      const notas = (exp.notes || '').toLowerCase();
      const prov = (exp.provider || '').toLowerCase();

      const tienePalabrasClave =
        desc.includes('lubricador') ||
        desc.includes('aceite') ||
        desc.includes('filtro') ||
        desc.includes('trampa') ||
        desc.includes('diésel') ||
        desc.includes('diesel') ||
        desc.includes('freno') ||
        desc.includes('zapata') ||
        desc.includes('bocina') ||
        desc.includes('muelle') ||
        desc.includes('embrague') ||
        desc.includes('caja') ||
        desc.includes('corona') ||
        desc.includes('engrase') ||
        desc.includes('alineaci') ||
        desc.includes('llanta') ||
        desc.includes('taller') ||
        desc.includes('fosa') ||
        desc.includes('combo') ||
        prov.includes('lubricador') ||
        prov.includes('taller');

      if (!esPrefijoTaller && !esCategoriaMantenimiento && !tienePalabrasClave) {
        continue;
      }

      // Deducir estación
      let estacionId = 'LUBRICADORA';
      let estacionNombre = 'Lubricadora (Combo)';

      if (
        exp.category === 'FRENOS_RODAJE' ||
        desc.includes('freno') ||
        desc.includes('zapata') ||
        desc.includes('bocina') ||
        desc.includes('muelle')
      ) {
        estacionId = 'FRENOS_RODAJE';
        estacionNombre =
          desc.includes('4 rueda') || desc.includes('combo')
            ? 'Combo 4 Ruedas (Frenos y Rodaje)'
            : 'Frenos y Rodaje';
      } else if (
        exp.category === 'MOTOR_CAJA_CORONA' ||
        desc.includes('caja') ||
        desc.includes('corona') ||
        desc.includes('embrague') ||
        desc.includes('motor')
      ) {
        estacionId = 'MANTENIMIENTO_MAYOR';
        estacionNombre = 'Mantenimiento Mayor';
      } else if (exp.category === 'LLANTAS' || desc.includes('llanta') || desc.includes('alineaci')) {
        estacionId = 'LLANTERA';
        estacionNombre = 'Alineación y Llantas';
      } else if (desc.includes('aire') || desc.includes('tobera')) {
        estacionId = 'SISTEMA_AIRE';
        estacionNombre = 'Sistema de Aire y Admisión';
      }

      // Deducir Odómetro: si está en notes o en desc, ej. "893,100 km"
      let odoKm = 0;
      const matchOdo = `${exp.notes || ''} ${exp.description || ''}`.match(
        /(\d{1,3}(?:[.,]\d{3})+|\d{5,7})\s*(?:km|kms)/i
      );
      if (matchOdo && matchOdo[1]) {
        odoKm = parseInt(matchOdo[1].replace(/[.,]/g, ''), 10);
      }
      if (!odoKm || isNaN(odoKm)) {
        try {
          const rawOdo = localStorage.getItem(`rg_last_km_${exp.busId || 'BUS-01'}`);
          if (rawOdo) odoKm = parseInt(rawOdo, 10);
        } catch {
          odoKm = 0;
        }
      }

      // Deducir pagador y modalidades
      const esPagadoPorAyudante =
        exp.paymentMethod === 'EFECTIVO' &&
        (desc.includes('ayudante') || desc.includes('ruta') || notas.includes('ayudante'));
      const pagador: ParadaPagador = esPagadoPorAyudante ? 'AYUDANTE' : 'SOCIO';

      const total = Number(exp.totalAmount) || 0;
      const pagado = Number(exp.paidAmount) || 0;
      const saldo =
        Number(exp.pendingBalance) >= 0 ? Number(exp.pendingBalance) : Math.max(0, total - pagado);

      let socioModalidad: SocioModalidadPago = 'TRANSFERENCIA_TOTAL';
      if (saldo > 0) {
        socioModalidad = pagado > 0 ? 'TRANSFERENCIA_PARCIAL' : 'CREDITO_FIADO';
      }

      const disco = (exp.busId || 'BUS-01').replace(/^BUS-0?/, '') || '01';

      const nuevaParada: ParadaPagoRegistro = {
        id: generatedParadaId,
        busId: exp.busId || busId || 'BUS-01',
        disco,
        fecha: exp.expenseDate || new Date().toISOString().split('T')[0],
        estacionId,
        estacionNombre,
        taller: exp.provider || 'Taller Particular',
        factura: exp.comprobanteRef
          ? exp.comprobanteRef.replace(/^(?:Fac|Nota|Ticket):\s*/i, '').trim()
          : undefined,
        odometroKm: odoKm || 0,
        costoTotal: total,
        pagador,
        montoCubiertoAyudante: pagador === 'AYUDANTE' ? pagado : 0,
        descontadoEnVT: false,
        socioModalidad: pagador === 'SOCIO' ? socioModalidad : undefined,
        socioMontoTransferido: pagador === 'SOCIO' ? pagado : undefined,
        socioSaldoPendiente: pagador === 'SOCIO' ? saldo : undefined,
        ownerExpenseId: exp.id,
        createdAt: exp.createdAt || new Date().toISOString(),
      };

      paradasList.unshift(nuevaParada);
      existingExpenseIds.add(exp.id);
      existingParadaIds.add(generatedParadaId);
      agregados++;
    }

    if (agregados > 0) {
      localStorage.setItem(STORAGE_PARADAS_KEY, JSON.stringify(paradasList));
      window.dispatchEvent(
        new CustomEvent('rg_paradas_pago_updated', { detail: { busId, retroSyncCount: agregados } })
      );
    }

    return agregados;
  } catch (err) {
    console.error('Error en syncRetroactiveParadasFromExpenses:', err);
    return 0;
  }
}

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
 * Obtiene todas las paradas de una unidad asegurando compatibilidad retroactiva
 */
export function getParadasPagoByBus(busId: string): ParadaPagoRegistro[] {
  if (typeof window === 'undefined') return [];
  try {
    // Sincronizar de forma segura gastos previos que no tengan parada técnica aún
    syncRetroactiveParadasFromExpenses(busId);

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
    recordDeletedParadaId(paradaId);
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

    // Eliminar gastos asociados y registrar tombstones
    paradasDeBus.forEach(p => {
      recordDeletedParadaId(p.id);
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
