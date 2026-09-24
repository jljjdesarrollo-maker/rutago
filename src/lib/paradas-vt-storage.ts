/**
 * Almacenamiento y Gestión de Pagos de Paradas de Taller y Arrastre de Saldos de VT (Fases 3 y 4)
 * Separa roles: Chofer (reset mecánico), Ayudante (dinero y arqueo), Socio (contabilidad patrimonial).
 */

import {
  deleteOwnerExpense,
  deleteOwnerExpenseFromApi,
  clearAllParadaExpensesFromApi,
  recordDeletedExpenseId,
  getDeletedExpenseIds,
} from './owner-expenses-storage';

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
  odometroKm: number; // Odómetro del servicio realizado (ej: 892491)
  odometroServicio?: number; // Odómetro específico al momento del cambio físico (ej. 892491)
  odometroActualBus?: number; // Odómetro del tablero en el momento del registro (ej. 893485)
  esRetroactivo?: boolean; // Indicador de servicio regularizado de fecha/km anterior
  kmRodadosDesdeServicio?: number; // Kilómetros transcurridos desde el servicio (odometroActualBus - odometroServicio)
  costoTotal: number;
  pagador: ParadaPagador;
  montoCubiertoAyudante?: number;
  descontadoEnVT?: boolean;
  socioModalidad?: SocioModalidadPago;
  socioMontoTransferido?: number;
  socioSaldoPendiente?: number;
  ownerExpenseId?: string;
  detalleTrabajo?: string; // Descripción precisa del trabajo o repuestos (ej. "Enlainar paquete delantero derecho y cambio de arandelas")
  notas?: string; // Notas o comentarios adicionales del taller
  itemsRealizados?: string[]; // Nombres de ítems realizados (ej. ["Aceite Motor", "Filtro Aceite"])
  codigosMantenimiento?: string[]; // Códigos de catálogo involucrados (ej. ["MNT-01", "MNT-02"])
  createdAt: string;
}

export interface ResultadoCalculoRegularizacion {
  kmRodados: number;
  kmRestantes: number;
  porcentajeRestante: number;
  esVencido: boolean;
  esInvalido: boolean;
  mensajeError?: string;
  advertencia?: string;
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
      if (
        existingParadaIds.has(generatedParadaId) ||
        deletedParadaIds.has(generatedParadaId) ||
        deletedParadaIds.has(exp.id) ||
        deletedExpenseIds.has(exp.id)
      ) {
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

      // Deducir estación precisa
      let estacionId = 'LUBRICADORA';
      let estacionNombre = 'Lubricadora (Combo)';

      if (
        desc.includes('radiador') ||
        desc.includes('coolant') ||
        desc.includes('enfriamiento') ||
        desc.includes('intercooler') ||
        prov.includes('radiador')
      ) {
        estacionId = 'RADIADOR';
        estacionNombre = 'Radiador y Sistema de Enfriamiento';
      } else if (
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
        desc.includes('aire') ||
        desc.includes('tobera') ||
        desc.includes('admisión') ||
        desc.includes('admision')
      ) {
        estacionId = 'SISTEMA_AIRE';
        estacionNombre = 'Sistema de Aire y Admisión';
      } else if (exp.category === 'LLANTAS' || desc.includes('llanta') || desc.includes('alineaci')) {
        estacionId = 'LLANTERA';
        estacionNombre = 'Alineación y Llantas';
      } else if (
        exp.category === 'MOTOR_CAJA_CORONA' ||
        desc.includes('caja') ||
        desc.includes('corona') ||
        desc.includes('embrague') ||
        (desc.includes('motor') && !desc.includes('aceite'))
      ) {
        estacionId = 'MANTENIMIENTO_MAYOR';
        estacionNombre = 'Mantenimiento Mayor';
      } else if (
        desc.includes('aceite') ||
        desc.includes('lubricador') ||
        desc.includes('filtro') ||
        desc.includes('trampa')
      ) {
        estacionId = 'LUBRICADORA';
        estacionNombre = 'Lubricadora (Combo)';
      }

      // Deducir Odómetro: buscar primero odómetro de servicio específico, luego general
      let odoKm = 0;
      const textoBuscarKm = `${exp.notes || ''} ${exp.description || ''} ${exp.comprobanteRef || ''}`;
      const matchServicio = textoBuscarKm.match(/od[óo]metro(?:\s+servicio)?[:\s]*(\d{1,3}(?:[.,]\d{3})+|\d{5,7})/i);
      if (matchServicio && matchServicio[1]) {
        const num = parseInt(matchServicio[1].replace(/[.,]/g, ''), 10);
        if (num > 1000) odoKm = num;
      }
      if (!odoKm) {
        const matchGen = textoBuscarKm.match(/(?:km|tac[óo]metro)?[:\s]*(\d{1,3}(?:[.,]\d{3})+|\d{5,7})\s*(?:km|kms)?/i);
        if (matchGen && matchGen[1]) {
          const num = parseInt(matchGen[1].replace(/[.,]/g, ''), 10);
          if (num > 1000) odoKm = num;
        }
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

      // Extraer detalle legible del trabajo realizado desde descripción o notas
      const detalleTrabajo = exp.description || exp.notes || undefined;

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
        detalleTrabajo,
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
 * FASE 1: Realiza el cálculo matemático en tiempo real del desgaste y vida restante
 * para servicios realizados en fecha o kilometraje anterior al tablero actual del bus.
 */
export function calcularDesgasteRegularizacion(
  odometroActualBus: number,
  odometroServicio: number,
  intervaloKm: number = 5000
): ResultadoCalculoRegularizacion {
  if (isNaN(odometroServicio) || odometroServicio <= 0) {
    return {
      kmRodados: 0,
      kmRestantes: intervaloKm,
      porcentajeRestante: 100,
      esVencido: false,
      esInvalido: true,
      mensajeError: "Ingresa un kilometraje válido.",
    };
  }

  if (odometroServicio > odometroActualBus) {
    return {
      kmRodados: 0,
      kmRestantes: intervaloKm,
      porcentajeRestante: 100,
      esVencido: false,
      esInvalido: true,
      mensajeError: `El kilometraje del cambio (${odometroServicio.toLocaleString()} km) no puede ser mayor al odómetro actual del autobús (${odometroActualBus.toLocaleString()} km).`,
    };
  }

  const kmRodados = Math.max(0, odometroActualBus - odometroServicio);
  const kmRestantes = Math.max(0, intervaloKm - kmRodados);
  const porcentajeRestante = Math.max(0, Math.min(100, Math.round((kmRestantes / intervaloKm) * 100)));
  const esVencido = kmRodados >= intervaloKm;

  let advertencia: string | undefined;
  if (esVencido) {
    advertencia = `⚠️ Con este kilometraje el componente ya rodó ${kmRodados.toLocaleString()} km y figurará como VENCIDO para cambio inmediato.`;
  } else if (kmRestantes < 1000) {
    advertencia = `⚠️ Atención: restan solo ${kmRestantes.toLocaleString()} km de vida útil (${porcentajeRestante}% restante).`;
  }

  return {
    kmRodados,
    kmRestantes,
    porcentajeRestante,
    esVencido,
    esInvalido: false,
    advertencia,
  };
}

/**
 * Guarda o actualiza un registro de pago de parada técnica.
 * Aplica la regla de blindaje contable: si el servicio es en fecha pasada y pagó el Ayudante,
 * se marca descontadoEnVT = true para que NUNCA descuente en el arqueo del día activo del ayudante.
 */
export function saveParadaPago(registro: ParadaPagoRegistro): void {
  if (typeof window === 'undefined') return;
  try {
    const today = new Date().toISOString().split('T')[0];

    // 1. Armonizar odómetro de servicio y odómetro de registro
    if (typeof registro.odometroServicio === 'number' && registro.odometroServicio > 0) {
      registro.odometroKm = registro.odometroServicio;
    } else if (typeof registro.odometroKm === 'number' && registro.odometroKm > 0) {
      registro.odometroServicio = registro.odometroKm;
    }

    // 2. Cálculo de desgaste y detección de regularización retroactiva
    if (typeof registro.odometroActualBus === 'number' && typeof registro.odometroServicio === 'number') {
      registro.kmRodadosDesdeServicio = Math.max(0, registro.odometroActualBus - registro.odometroServicio);
      if (registro.odometroServicio < registro.odometroActualBus || registro.fecha < today) {
        registro.esRetroactivo = true;
      }
    } else if (registro.fecha < today) {
      registro.esRetroactivo = true;
    }

    // 3. Blindaje Inmutable del Arqueo de Ruta:
    // Si el servicio ocurrió en fecha pasada (fecha < today) y el pagador fue el Ayudante,
    // la caja de ese día ya fue liquidada en el pasado. Se marca descontadoEnVT = true para
    // que la caja y arqueo del ayudante de HOY permanezcan 100% blindados e intactos.
    if (registro.pagador === 'AYUDANTE' && registro.fecha < today) {
      registro.descontadoEnVT = true;
    }

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
    const busDisco = busId.replace(/^BUS-/i, '');
    return list
      .filter(p => p.busId === busId || p.disco === busDisco || p.disco === busId)
      .map(p => ({
        ...p,
        costoTotal: Number(p.costoTotal) || 0,
        odometroKm: Number(p.odometroKm) || 0,
        odometroServicio: p.odometroServicio ? Number(p.odometroServicio) : (Number(p.odometroKm) || 0),
        montoCubiertoAyudante: Number(p.montoCubiertoAyudante) || 0,
        socioMontoTransferido: p.socioMontoTransferido !== undefined ? (Number(p.socioMontoTransferido) || 0) : undefined,
        socioSaldoPendiente: p.socioSaldoPendiente !== undefined ? (Number(p.socioSaldoPendiente) || 0) : undefined,
      }))
      .sort((a, b) => {
        // 1. Criterio Maestro: Fecha descendente (más reciente arriba)
        const dateA = a.fecha || '';
        const dateB = b.fecha || '';
        if (dateA !== dateB) {
          return dateB.localeCompare(dateA);
        }
        // 2. Si la fecha es idéntica: Odómetro de servicio descendente (mayor km arriba)
        const kmA = (a.odometroServicio && a.odometroServicio > 0) ? a.odometroServicio : (a.odometroKm || 0);
        const kmB = (b.odometroServicio && b.odometroServicio > 0) ? b.odometroServicio : (b.odometroKm || 0);
        if (kmA !== kmB) {
          return kmB - kmA;
        }
        // 3. Fallback: Creación cronológica en base de datos descendente
        const timeA = a.createdAt || a.id || '';
        const timeB = b.createdAt || b.id || '';
        return timeB.localeCompare(timeA);
      });
  } catch {
    return [];
  }
}

/**
 * Motor de búsqueda y filtrado multi-criterio 100% offline para el historial de paradas
 * Cero llamadas a red, búsqueda predictiva instantánea (< 2ms)
 */
export function filtrarParadasPagoOffline(
  paradas: ParadaPagoRegistro[],
  criterioTexto: string = '',
  filtroEstacion: string = 'TODAS'
): ParadaPagoRegistro[] {
  if (!Array.isArray(paradas) || paradas.length === 0) return [];

  const queryNorm = criterioTexto.trim().toLowerCase();

  return paradas.filter(p => {
    // 1. Filtro por tipo o estación si no es 'TODAS'
    if (filtroEstacion !== 'TODAS') {
      const estId = (p.estacionId || '').toUpperCase();
      const estNom = (p.estacionNombre || '').toUpperCase();
      const desc = `${estNom} ${p.notas || ''} ${p.codigosMantenimiento?.join(' ') || ''}`.toUpperCase();

      if (filtroEstacion === 'LUBRICADORA' && !estId.includes('LUBRICADORA') && !desc.includes('ACEITE') && !desc.includes('FILTRO')) {
        return false;
      }
      if (filtroEstacion === 'FRENOS' && !estId.includes('FRENO') && !desc.includes('ZAPATA') && !desc.includes('RACHE') && !desc.includes('BOCINA')) {
        return false;
      }
      if (filtroEstacion === 'AIRE' && !estId.includes('AIRE') && !desc.includes('ADMISION') && !desc.includes('TOBERA') && !desc.includes('COMPRESOR')) {
        return false;
      }
      if (filtroEstacion === 'LLANTAS' && !estId.includes('LLANTA') && !desc.includes('ALINEAC') && !desc.includes('ROTAC')) {
        return false;
      }
      if (filtroEstacion === 'MAYOR' && !estId.includes('MAYOR') && !desc.includes('CAJA') && !desc.includes('CORONA') && !desc.includes('EMBRAGUE')) {
        return false;
      }
    }

    // 2. Filtro predictivo de texto libre (busca en nombre, taller, notas, factura, codigos, pagador)
    if (!queryNorm) return true;

    const textoCompleto = [
      p.estacionNombre || '',
      p.taller || '',
      p.detalleTrabajo || '',
      p.factura || '',
      p.pagador || '',
      Array.isArray(p.itemsRealizados) ? p.itemsRealizados.join(' ') : '',
      Array.isArray(p.codigosMantenimiento) ? p.codigosMantenimiento.join(' ') : '',
      p.odometroServicio ? `${p.odometroServicio} km` : '',
      p.odometroKm ? `${p.odometroKm} km` : '',
      p.costoTotal ? `$${p.costoTotal}` : '',
      p.fecha || '',
    ].join(' ').toLowerCase();

    return textoCompleto.includes(queryNorm);
  });
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
export async function deleteParadaPagoCascada(paradaId: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  try {
    recordDeletedParadaId(paradaId);
    if (paradaId.startsWith('PARADA-RETRO-')) {
      const origExpenseId = paradaId.replace('PARADA-RETRO-', '');
      recordDeletedExpenseId(origExpenseId);
      recordDeletedParadaId(origExpenseId);
    }
    const raw = localStorage.getItem(STORAGE_PARADAS_KEY);
    if (!raw) return false;
    const list: ParadaPagoRegistro[] = JSON.parse(raw);
    const target = list.find(p => p.id === paradaId);
    if (!target) return false;

    // 1. Eliminar de la lista de paradas
    const updatedList = list.filter(p => p.id !== paradaId);
    localStorage.setItem(STORAGE_PARADAS_KEY, JSON.stringify(updatedList));

    // 2. Si tenía gasto de socio vinculado o derivado, eliminarlo en cascada tanto en local como en la nube (Fase A)
    const relatedExpenseId = target.ownerExpenseId || (paradaId.startsWith('PARADA-RETRO-') ? paradaId.replace('PARADA-RETRO-', '') : null);
    if (relatedExpenseId) {
      recordDeletedExpenseId(relatedExpenseId);
      recordDeletedParadaId(relatedExpenseId);
      recordDeletedParadaId(`PARADA-RETRO-${relatedExpenseId}`);
      deleteOwnerExpense(relatedExpenseId);
      deleteOwnerExpenseFromApi(relatedExpenseId).catch(err => console.warn('Aviso eliminación en nube:', err));
      window.dispatchEvent(new CustomEvent('rg_owner_expenses_sync', { detail: { expenseId: relatedExpenseId, deleted: true } }));
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
 * FASE A: Limpieza total de registros de paradas de prueba para una unidad específica (Local + Nube)
 */
export async function clearAllParadasByBus(busId: string): Promise<number> {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = localStorage.getItem(STORAGE_PARADAS_KEY);
    if (!raw) return 0;
    const list: ParadaPagoRegistro[] = JSON.parse(raw);
    const paradasDeBus = list.filter(p => p.busId === busId);

    // Eliminar gastos asociados y registrar tombstones tanto local como en nube (Fase A)
    paradasDeBus.forEach(p => {
      recordDeletedParadaId(p.id);
      const relatedExpId = p.ownerExpenseId || (p.id.startsWith('PARADA-RETRO-') ? p.id.replace('PARADA-RETRO-', '') : null);
      if (relatedExpId) {
        recordDeletedExpenseId(relatedExpId);
        recordDeletedParadaId(relatedExpId);
        recordDeletedParadaId(`PARADA-RETRO-${relatedExpId}`);
        deleteOwnerExpense(relatedExpId);
        deleteOwnerExpenseFromApi(relatedExpId).catch(() => {});
      }
    });

    // Purgar también en la base de datos central en la nube
    clearAllParadaExpensesFromApi(busId).catch(() => {});

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
