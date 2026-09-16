import { OwnerExpense, PaymentAbono } from '../types/expenses';

const STORAGE_KEY = 'rutago_owner_expenses_v1';
const INITIALIZED_KEY = 'rutago_owner_expenses_initialized_flag';

export function getOwnerExpenses(busId = 'BUS-01'): OwnerExpense[] {
  if (typeof window === 'undefined') return [];
  try {
    let raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Auto-inicialización segura con los datos validados del socio
      seedSampleExpenses(busId);
      raw = localStorage.getItem(STORAGE_KEY);
    }
    if (!raw) return [];
    const all: OwnerExpense[] = JSON.parse(raw);
    const busExpenses = all.filter((item) => item.busId === busId);
    if (busExpenses.length === 0 && busId === 'BUS-01') {
      seedSampleExpenses(busId);
      const reRead = localStorage.getItem(STORAGE_KEY);
      if (reRead) {
        const reAll: OwnerExpense[] = JSON.parse(reRead);
        return reAll.filter((item) => item.busId === busId);
      }
    }
    return busExpenses;
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
    localStorage.setItem(INITIALIZED_KEY, 'true');
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
    localStorage.setItem(INITIALIZED_KEY, 'true');
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
    localStorage.setItem(INITIALIZED_KEY, 'true');
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
 * Limpia todos los gastos para una unidad (no vuelve a autogenerar datos de ejemplo)
 */
export function clearAllOwnerExpenses(busId = 'BUS-01'): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const all: OwnerExpense[] = JSON.parse(raw);
    const filtered = all.filter((e) => e.busId !== busId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    localStorage.setItem(INITIALIZED_KEY, 'true');
  } catch (err) {
    console.error('Error limpiando gastos:', err);
  }
}

/**
 * Elimina exclusivamente los gastos precargados de ejemplo (EXP-AUG-* y EXP-SEP-*)
 * conservando los gastos reales que el socio haya creado manualmente.
 */
export function removeSampleExpensesOnly(busId = 'BUS-01'): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const all: OwnerExpense[] = JSON.parse(raw);
    const filtered = all.filter(
      (e) => !(e.busId === busId && (e.id.startsWith('EXP-AUG-') || e.id.startsWith('EXP-SEP-')))
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    localStorage.setItem(INITIALIZED_KEY, 'true');
  } catch (err) {
    console.error('Error eliminando gastos de muestra:', err);
  }
}

/**
 * Semillero con los datos de ejemplo (solo se ejecuta bajo acción explícita)
 */
export function seedSampleExpenses(busId = 'BUS-01'): void {
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
    localStorage.setItem(INITIALIZED_KEY, 'true');
  }
}

// ─── CONEXIÓN ASÍNCRONA CON LA BASE DE DATOS CENTRAL (/api/owner-expenses) ───

export async function fetchOwnerExpensesFromApi(busId = 'BUS-01'): Promise<OwnerExpense[]> {
  try {
    const res = await fetch(`/api/owner-expenses?busId=${encodeURIComponent(busId)}`, {
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (json.success && Array.isArray(json.data)) {
      if (json.data.length > 0) {
        // 1. La base de datos central ya tiene gastos guardados
        const parsed: OwnerExpense[] = json.data.map((item: any) => ({
          ...item,
          abonos: typeof item.abonos === 'string' ? JSON.parse(item.abonos || '[]') : (item.abonos || []),
        }));

        if (typeof window !== 'undefined') {
          const raw = localStorage.getItem(STORAGE_KEY);
          const existing: OwnerExpense[] = raw ? JSON.parse(raw) : [];
          const otherBuses = existing.filter((e) => e.busId !== busId);
          localStorage.setItem(STORAGE_KEY, JSON.stringify([...parsed, ...otherBuses]));
          localStorage.setItem(INITIALIZED_KEY, 'true');
        }

        return parsed;
      } else {
        // 2. La base de datos central está vacía (tabla recién creada)
        // Verificamos si en este teléfono ya existían gastos (ej: los $809 de Agosto)
        const localList = getOwnerExpenses(busId);
        if (localList.length > 0) {
          console.log(`Auto-migrando ${localList.length} gastos locales a la base de datos central...`);
          // Subirlos a la nube en segundo plano para que queden asegurados
          fetch('/api/owner-expenses', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bulk: localList }),
          }).catch((err) => console.warn('Error en auto-migracion:', err));

          return localList;
        }
        return [];
      }
    }
  } catch (err) {
    console.warn('No se pudo conectar a la base de datos central, usando caché local:', err);
  }
  // Fallback transparente a almacenamiento local
  return getOwnerExpenses(busId);
}

export async function saveOwnerExpenseToApi(expense: OwnerExpense): Promise<OwnerExpense> {
  // 1. Guardar de inmediato en local para respuesta táctil instantánea (optimistic UI)
  saveOwnerExpense(expense);

  // 2. Enviar a la base de datos central
  try {
    const res = await fetch('/api/owner-expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(expense),
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        return {
          ...json.data,
          abonos: typeof json.data.abonos === 'string' ? JSON.parse(json.data.abonos || '[]') : (json.data.abonos || []),
        };
      }
    }
  } catch (err) {
    console.warn('Guardado en nube pendiente (se conservó localmente):', err);
  }
  return expense;
}

export async function registerAbonoToApi(
  expenseId: string,
  abono: Omit<PaymentAbono, 'id' | 'createdAt'>
): Promise<OwnerExpense | null> {
  // 1. Actualizar localmente
  const localUpdated = registerAbonoToExpense(expenseId, abono);

  // 2. Sincronizar con API
  try {
    const res = await fetch('/api/owner-expenses', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: expenseId,
        abono,
      }),
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        return {
          ...json.data,
          abonos: typeof json.data.abonos === 'string' ? JSON.parse(json.data.abonos || '[]') : (json.data.abonos || []),
        };
      }
    }
  } catch (err) {
    console.warn('Abono en nube pendiente (se conservó localmente):', err);
  }
  return localUpdated;
}

export async function deleteOwnerExpenseFromApi(id: string): Promise<boolean> {
  // 1. Eliminar localmente
  deleteOwnerExpense(id);

  // 2. Eliminar en API
  try {
    const res = await fetch(`/api/owner-expenses?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    return res.ok;
  } catch (err) {
    console.warn('Eliminación en nube falló:', err);
    return true; // Localmente ya se borró
  }
}

export async function syncAllLocalExpensesToApi(busId = 'BUS-01'): Promise<{ count: number }> {
  const localList = getOwnerExpenses(busId);
  if (localList.length === 0) return { count: 0 };

  try {
    const res = await fetch('/api/owner-expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bulk: localList }),
    });
    if (res.ok) {
      const json = await res.json();
      return { count: json.migratedCount || localList.length };
    }
  } catch (err) {
    console.error('Error al sincronizar gastos a la base de datos:', err);
    throw err;
  }
  return { count: 0 };
}
