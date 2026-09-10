export type OwnerExpenseCategory =
  | 'LLANTAS'
  | 'MECANICA_REPUESTOS'
  | 'ELECTRICO_AC'
  | 'SEGURO'
  | 'COOPERATIVA'
  | 'TRAMITES'
  | 'LIMPIEZA_ASEO'
  | 'MULTAS_ATRASOS'
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
    name: 'Llantas / Alineación',
    icon: '🛞',
    description: 'Compra de llantas nuevas o recauchadas, alineación y balanceo',
    badgeColor: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  },
  {
    id: 'MECANICA_REPUESTOS',
    name: 'Mecánica y Repuestos',
    icon: '⚙️',
    description: 'Motor, caja, corona, válvulas, zapatas, muelles, aceite, repuestos',
    badgeColor: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  },
  {
    id: 'ELECTRICO_AC',
    name: 'Eléctrico y A/C',
    icon: '⚡',
    description: 'Luces, alternadores, baterías, recarga y mantenimiento de aire acondicionado',
    badgeColor: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30',
  },
  {
    id: 'SEGURO',
    name: 'Seguro Vehicular',
    icon: '🛡️',
    description: 'Pólizas, primas y coberturas de protección vehicular',
    badgeColor: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  },
  {
    id: 'COOPERATIVA',
    name: 'Cuota Cooperativa',
    icon: '🏢',
    description: 'Cuotas administrativas mensuales, aportes y compromisos internos',
    badgeColor: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
  },
  {
    id: 'TRAMITES',
    name: 'Trámites / Matrícula',
    icon: '📄',
    description: 'Revisión técnica vehicular, matrícula, permisos ANT y trámites legales',
    badgeColor: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
  },
  {
    id: 'LIMPIEZA_ASEO',
    name: 'Limpieza y Aseo',
    icon: '🧼',
    description: 'Insumos de limpieza, lavado general a presión y polverizado',
    badgeColor: 'bg-teal-500/15 text-teal-300 border-teal-500/30',
  },
  {
    id: 'MULTAS_ATRASOS',
    name: 'Multas y Atrasos',
    icon: '⚠️',
    description: 'Sanciones internas por retrasos en frecuencias o faltas operativas',
    badgeColor: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  },
  {
    id: 'OTROS',
    name: 'Otros Gastos Socio',
    icon: '📦',
    description: 'Garajes especiales, viáticos imprevistos del socio, pagos menores',
    badgeColor: 'bg-neutral-500/15 text-neutral-300 border-neutral-500/30',
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
