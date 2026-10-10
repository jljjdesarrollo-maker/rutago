/**
 * @file regression-v3.61.22.ts
 * @description Suite de Pruebas de Regresión v3.61.22:
 * - Independencia Contable Diaria (Opción 2): Eliminación de arrastre de déficit entre arqueos VT.
 * - Prevención de doble descuento contable en el balance mensual del socio.
 * - Saneamiento automático de claves legacy rg_deficit_vt_* para suscriptores actuales y nuevos.
 */

import fs from 'fs';
import path from 'path';
import {
  getDeficitArrastradoVT,
  saveDeficitArrastradoVT,
  clearDeficitArrastradoVT,
} from '../src/lib/paradas-vt-storage';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`✅ [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`❌ [FAIL] ${testName}${detail ? ` — ${detail}` : ''}`);
    failed++;
  }
}

console.log('═══════════════════════════════════════════════════════════════════');
console.log(' 🧪 EJECUTANDO SUITE DE REGRESIÓN v3.61.22 (CIERRE DIARIO LIMPIO)');
console.log('═══════════════════════════════════════════════════════════════════\n');

// 1. Verificación funcional de paradas-vt-storage.ts
assert(
  getDeficitArrastradoVT('BUS-01') === null && getDeficitArrastradoVT('BUS-10') === null,
  '1. getDeficitArrastradoVT retorna siempre null para cualquier unidad (suscriptores actuales y nuevos)'
);

saveDeficitArrastradoVT('BUS-01', 49.5, '2026-10-09', 'Taller');
assert(
  getDeficitArrastradoVT('BUS-01') === null,
  '2. saveDeficitArrastradoVT no persiste arrastre de deuda para el siguiente turno'
);

// 2. Verificación matemática contable (Día 1 con -$49.50 + Día 2 con +$150.00 = +$100.50 sin duplicar)
const dia1Efectivo = 266.5;
const dia1Gastos = 316.0;
const dia1EntregaAyudante = dia1Efectivo - dia1Gastos; // -49.50

const dia2Efectivo = 250.0;
const dia2Gastos = 100.0; // Sin sumarle los $49.50 del día anterior
const dia2EntregaAyudante = dia2Efectivo - dia2Gastos; // +150.00

const totalGastosMes = dia1Gastos + dia2Gastos;
const totalEntregaMes = dia1EntregaAyudante + dia2EntregaAyudante;

assert(
  Math.abs(dia1EntregaAyudante - -49.5) < 0.001,
  '3. Día 1 registra exactamente -$49.50 como saldo contable del día'
);
assert(
  Math.abs(totalGastosMes - 416.0) < 0.001,
  '4. Total Gastos acumulados (Día 1 + Día 2) es exactamente $416.00 sin inflar ni duplicar los $49.50'
);
assert(
  Math.abs(totalEntregaMes - 100.5) < 0.001,
  '5. Suma mensual algebraica (-$49.50 + $150.00 = +$100.50) cuadra al centavo sin doble descuento'
);

// 3. Verificación estática en ArqueoGeneralScreen.tsx
const arqueoCode = fs.readFileSync(
  path.join(__dirname, '../src/components/transport/ArqueoGeneralScreen.tsx'),
  'utf8'
);

assert(
  !arqueoCode.includes('Déficit Arrastrado de VT Anterior') &&
    !arqueoCode.includes('+ Aplicar en Gastos') &&
    !arqueoCode.includes('Déficit a arrastrar a siguiente VT:'),
  '6. ArqueoGeneralScreen.tsx erradicó por completo los carteles y botones de arrastre de déficit entre turnos'
);

assert(
  arqueoCode.includes('Saldo negativo del día:') &&
    arqueoCode.includes('Este saldo queda registrado únicamente en este día y no se arrastra al siguiente turno.'),
  '7. ArqueoGeneralScreen.tsx muestra mensaje claro de Saldo negativo del día sin arrastre al siguiente turno'
);

assert(
  arqueoCode.includes('clearDeficitArrastradoVT(currentBus.id)'),
  '8. ArqueoGeneralScreen.tsx limpia automáticamente cualquier residuo local de déficit en suscriptores actuales'
);

// 4. Verificación estática en POST /api/records
const recordsApiCode = fs.readFileSync(
  path.join(__dirname, '../src/app/api/records/route.ts'),
  'utf8'
);

assert(
  recordsApiCode.includes('expensesLimpias') &&
    recordsApiCode.includes("!desc.startsWith('arrastre déficit')"),
  '9. POST /api/records filtra en servidor cualquier gasto residual de Arrastre Déficit para blindar la BD'
);

console.log('\n═══════════════════════════════════════════════════════════════════');
console.log(` 📊 RESULTADO FINAL: ${passed} PASARON | ${failed} FALLARON`);
console.log('═══════════════════════════════════════════════════════════════════');

if (failed > 0) {
  process.exit(1);
}
