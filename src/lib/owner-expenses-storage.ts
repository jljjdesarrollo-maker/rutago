import { OwnerExpense, PaymentAbono } from '../types/expenses';

const STORAGE_KEY = 'rutago_owner_expenses_v1';

export function getOwnerExpenses(busId = 'BUS-04'): OwnerExpense[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const all: OwnerExpense[] = JSON.parse(raw);
    return all.filter((item) => item.busId === busId);
  } catch (err) {
    console.error('Error cargando gastos de socio:', err);
    return [];
  }
}

export function saveOwnerExpense(expense: OwnerExpense): OwnerExpense {
  if (typeof window === 'undefined') return expense;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const all: OwnerExpense[] = raw ? JSON.parse(raw) : [];
    
    const existingIndex = all.findIndex((e) => e.id === expense.id);
    if (existingIndex >= 0) {
      all[existingIndex] = expense;
    } else {
      all.unshift(expense);
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    return expense;
  } catch (err) {
    console.error('Error guardando gasto de socio:', err);
    return expense;
  }
}

export function deleteOwnerExpense(id: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const all: OwnerExpense[] = JSON.parse(raw);
    const filtered = all.filter((e) => e.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return true;
  } catch (err) {
    console.error('Error eliminando gasto de socio:', err);
    return false;
  }
}

export function registerAbonoToExpense(
  expenseId: string,
  abono: Omit<PaymentAbono, 'id' | 'createdAt'>
): OwnerExpense | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const all: OwnerExpense[] = JSON.parse(raw);
    const index = all.findIndex((e) => e.id === expenseId);
    if (index === -1) return null;

    const current = all[index];
    const newAbono: PaymentAbono = {
      ...abono,
      id: 'ABO-' + Date.now(),
      createdAt: new Date().toISOString(),
    };

    const updatedAbonos = [...(current.abonos || []), newAbono];
    const newPaidAmount = Math.min(current.totalAmount, current.paidAmount + abono.amount);
    const newPending = Math.max(0, current.totalAmount - newPaidAmount);

    const updated: OwnerExpense = {
      ...current,
      paidAmount: newPaidAmount,
      pendingBalance: newPending,
      abonos: updatedAbonos,
      status: newPending <= 0 ? 'PAGADO' : 'PENDIENTE',
    };

    all[index] = updated;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    return updated;
  } catch (err) {
    console.error('Error registrando abono:', err);
    return null;
  }
}

/**
 * Filtra gastos imputados a un mes específico considerando la FECHA REAL DE PAGO/COMPRA.
 * Formato del mes: 'YYYY-MM' (ej: '2026-08' o '2026-09')
 */
export function getExpensesByMonth(busId: string, yearMonth: string): OwnerExpense[] {
  const list = getOwnerExpenses(busId);
  return list.filter((e) => e.expenseDate.startsWith(yearMonth));
}

/**
 * Obtiene todas las deudas activas con talleres o proveedores (saldoPendiente > 0)
 */
export function getPendingDebts(busId: string): OwnerExpense[] {
  const list = getOwnerExpenses(busId);
  return list.filter((e) => e.pendingBalance > 0);
}

/**
 * Semillero con los datos de ejemplo sugeridos para Agosto y Septiembre 2026
 */
export function seedSampleExpenses(busId = 'BUS-04'): void {
  const sampleData: OwnerExpense[] = [
    // ─── AGOSTO 2026 ───
    {
      id: 'EXP-AUG-01',
      busId,
      expenseDate: '2026-08-05',
      createdAt: '2026-08-05T14:20:00Z',
      category: 'PAGOS_COMPANIA',
      description: 'Póliza mensual de seguro contra accidentes (Póliza Colectiva)',
      provider: 'Seguros Sucre / Broker',
      totalAmount: 55.0,
      paidAmount: 55.0,
      pendingBalance: 0,
      paymentMethod: 'TRANSFERENCIA',
      bankName: 'Banco de Loja',
      comprobanteRef: 'Transf. #741829',
      status: 'PAGADO',
    },
    {
      id: 'EXP-AUG-02',
      busId,
      expenseDate: '2026-08-12',
      createdAt: '2026-08-12T18:30:00Z',
      category: 'PAGOS_COMPANIA',
      description: 'Cuota administrativa mensual de socio',
      provider: 'Coo. Vilcabambaturis (Oficina)',
      totalAmount: 90.0,
      paidAmount: 90.0,
      pendingBalance: 0,
      paymentMethod: 'TRANSFERENCIA',
      bankName: 'Banco de Loja',
      comprobanteRef: 'Transf. #749021',
      status: 'PAGADO',
    },
    {
      id: 'EXP-AUG-03',
      busId,
      expenseDate: '2026-08-18',
      createdAt: '2026-08-18T19:00:00Z',
      category: 'LLANTAS',
      description: '2 Llantas traseras de tracción (Reencauche)',
      provider: 'Reencauchadora La Nacional Loja',
      totalAmount: 340.0,
      paidAmount: 200.0, // Pagó 200, quedó debiendo 140
      pendingBalance: 140.0,
      paymentMethod: 'TRANSFERENCIA',
      bankName: 'Banco Pichincha',
      comprobanteRef: 'Transf. #881923 (Nota #412)',
      status: 'PENDIENTE',
    },
    {
      id: 'EXP-AUG-04',
      busId,
      expenseDate: '2026-08-27',
      createdAt: '2026-09-02T10:15:00Z', // Se digitó en septiembre pero pertenece a agosto
      category: 'ELECTRICO',
      description: 'Mantenimiento de alternador y cambio de carbones',
      provider: 'Taller Eléctrico Don Fausto',
      totalAmount: 65.0,
      paidAmount: 65.0,
      pendingBalance: 0,
      paymentMethod: 'EFECTIVO',
      comprobanteRef: 'Recibo simple de taco #089',
      status: 'PAGADO',
    },

    // ─── SEPTIEMBRE 2026 ───
    {
      id: 'EXP-SEP-01',
      busId,
      expenseDate: '2026-09-03',
      createdAt: '2026-09-03T11:00:00Z',
      category: 'FRENOS_RODAJE',
      description: 'Cambio de zapatas delanteras y calibración de frenos',
      provider: 'Taller Frenos y Aire Don Carlos (Catamayo)',
      totalAmount: 110.0,
      paidAmount: 110.0,
      pendingBalance: 0,
      paymentMethod: 'TRANSFERENCIA',
      bankName: 'Banco de Loja',
      comprobanteRef: 'Transf. #903411',
      status: 'PAGADO',
    },
    {
      id: 'EXP-SEP-02',
      busId,
      expenseDate: '2026-09-06',
      createdAt: '2026-09-06T16:45:00Z',
      category: 'OTROS',
      description: 'Lavado general a presión de chasis y polverizado',
      provider: 'Lavadora El Bosque - Vilcabamba',
      totalAmount: 25.0,
      paidAmount: 25.0,
      pendingBalance: 0,
      paymentMethod: 'EFECTIVO',
      comprobanteRef: 'Ticket lavado #204',
      status: 'PAGADO',
    },
    {
      id: 'EXP-SEP-03',
      busId,
      expenseDate: '2026-09-08',
      createdAt: '2026-09-08T09:20:00Z',
      category: 'PAGOS_COMPANIA',
      description: 'Cuota administrativa mensual de socio (Septiembre)',
      provider: 'Coo. Vilcabambaturis (Oficina)',
      totalAmount: 90.0,
      paidAmount: 90.0,
      pendingBalance: 0,
      paymentMethod: 'TRANSFERENCIA',
      bankName: 'Banco de Loja',
      comprobanteRef: 'Transf. #914201',
      status: 'PAGADO',
    },
    {
      id: 'EXP-SEP-04',
      busId,
      expenseDate: '2026-09-09',
      createdAt: '2026-09-09T15:30:00Z',
      category: 'ACEITES_FILTROS',
      description: 'Cambio de aceite de motor 15W40 + Filtros de aceite y combustible',
      provider: 'Lubricadora San Pedro',
      totalAmount: 145.0,
      paidAmount: 145.0,
      pendingBalance: 0,
      paymentMethod: 'TRANSFERENCIA',
      bankName: 'Banco de Loja',
      comprobanteRef: 'Transf. #915832',
      status: 'PAGADO',
    },
  ];

  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sampleData));
    localStorage.setItem(STORAGE_KEY + '_seeded', 'true');
  }
}

export function clearAllOwnerExpenses(busId = 'BUS-04'): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const all: OwnerExpense[] = JSON.parse(raw);
    const filtered = all.filter((e) => e.busId !== busId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    localStorage.setItem(STORAGE_KEY + '_seeded', 'true'); // Marca que ya fue inicializado para no volver a auto-crear prueba
  } catch (err) {
    console.error('Error limpiando gastos:', err);
  }
}
