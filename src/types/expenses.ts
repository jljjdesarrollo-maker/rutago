export type OwnerExpenseCategory =
  | 'LLANTAS'
  | 'ACEITES_FILTROS'
  | 'MOTOR_CAJA_CORONA'
  | 'FRENOS_RODAJE'
  | 'ELECTRICO'
  | 'PAGOS_COMPANIA'
  | 'TRAMITES_PERMISOS'
  | 'OTROS';

export interface CategoryMeta {
  id: OwnerExpenseCategory;
  name: string;
  icon: string;
  description: string;
  badgeColor: string;
}

export const OWNER_EXPENSE_CATEGORIES: CategoryMeta[] = [
  {
    id: 'LLANTAS',
    name: 'Llantas',
    icon: '🛞',
    description: 'Compra de llantas nuevas, vulcanizado, parchado, rotación, tramado y alineación',
    badgeColor: 'bg-amber-50 text-amber-800 border-amber-300',
  },
  {
    id: 'ACEITES_FILTROS',
    name: 'Aceites y Filtros',
    icon: '🛢️',
    description: 'Cambios de aceite (motor, caja, corona) y filtros de aceite, combustible y aire',
    badgeColor: 'bg-orange-50 text-orange-800 border-orange-200',
  },
  {
    id: 'MOTOR_CAJA_CORONA',
    name: 'Motor, Caja y Corona',
    icon: '⚙️',
    description: 'Reparaciones mecánicas mayores, válvulas, empaques, correas, caja, corona y mano de obra',
    badgeColor: 'bg-blue-50 text-blue-800 border-blue-200',
  },
  {
    id: 'FRENOS_RODAJE',
    name: 'Frenos y Rodaje',
    icon: '🛑',
    description: 'Zapatas, pastillas, rectificación de tambores, rodillos, rodamientos, rachers y sistema de aire',
    badgeColor: 'bg-rose-50 text-rose-800 border-rose-300',
  },
  {
    id: 'ELECTRICO',
    name: 'Eléctrico y A/C',
    icon: '⚡',
    description: 'Baterías, alternadores, arrancador, focos, cableado, fusibles y aire acondicionado',
    badgeColor: 'bg-yellow-50 text-yellow-800 border-yellow-300',
  },
  {
    id: 'PAGOS_COMPANIA',
    name: 'Pagos a la Compañía',
    icon: '🏢',
    description: 'Cuotas cooperativas, aportes internos, pólizas de seguro vehicular y deducibles',
    badgeColor: 'bg-[#912D26]/10 text-[#912D26] border-[#912D26]/30',
  },
  {
    id: 'TRAMITES_PERMISOS',
    name: 'Trámites y Permisos',
    icon: '📄',
    description: 'Revisión técnica vehicular (RTV), matriculación ANT, habilitaciones y permisos',
    badgeColor: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  },
  {
    id: 'OTROS',
    name: 'Otros (Limpieza, Multas y Varios)',
    icon: '📦',
    description: 'Lavado general/diario, insumos de aseo, multas e infracciones de tránsito y gastos menores',
    badgeColor: 'bg-gray-100 text-[#3A3A3A] border-gray-300',
  },
];

export type PaymentMethod = 'TRANSFERENCIA' | 'EFECTIVO' | 'CREDITO_PENDIENTE';

export interface PaymentAbono {
  id: string;
  date: string; // YYYY-MM-DD (fecha del abono)
  amount: number;
  paymentMethod: 'TRANSFERENCIA' | 'EFECTIVO';
  comprobanteRef?: string;
  notes?: string;
  createdAt: string;
}

export interface OwnerExpense {
  id: string;
  busId: string; // ej. "BUS-04"
  
  // Eje fundamental: Fecha real contable del desembolso o compra
  expenseDate: string; // YYYY-MM-DD
  createdAt: string;   // Timestamp de registro en sistema
  
  category: OwnerExpenseCategory;
  description: string;
  provider?: string; // Taller, tienda o institución (ej. "Taller Don Carlos", "Coo. Vilcabambaturis")
  
  // Valores financieros
  totalAmount: number;     // Costo total pactado
  paidAmount: number;      // Lo que efectivamente se pagó en esta fecha o acumulado
  pendingBalance: number;  // totalAmount - paidAmount (si es > 0, es deuda pendiente)
  
  // Forma de pago y comprobante
  paymentMethod: PaymentMethod;
  comprobanteRef?: string; // ej. "Ref. 489201 Banco Loja", "Nota de venta #140"
  bankName?: string;       // ej. "Banco de Loja", "Banco Pichincha", "Efectivo"
  receiptPhotoUrl?: string; // Base64 o URL de la foto de la nota / captura
  
  // Historial de abonos (en caso de pagos parciales)
  abonos?: PaymentAbono[];
  
  status: 'PAGADO' | 'PENDIENTE';
}
