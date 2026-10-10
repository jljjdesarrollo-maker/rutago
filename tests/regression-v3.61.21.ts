/**
 * @file regression-v3.61.21.ts
 * @description Suite de Pruebas de Regresión v3.61.21:
 * - Aislamiento estricto de VT por unidad física (Bus 01 vs Bus 10 u otras unidades).
 * - Corrección de semilla auditada de Unidad 01 (VT11 el 2026-10-01 -> VT04 el 2026-10-09).
 * - Estado "En calibración (X/3 registros)" cuando una unidad tiene < 3 arqueos.
 * - Activación automática del cálculo de VT propio al completar el 3er registro de arqueo de cada bus.
 */

import fs from 'fs';
import path from 'path';
import {
  normalizarDisco,
  resolverDiscoPorUnidad,
  obtenerCalibracionLocalBus,
  calcularProyeccionSecuencia,
  HISTORIAL_SEMILLA_AUDITADO_UNIDAD_01,
} from '../src/lib/turno-secuencia-tracker';

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
console.log(' 🧪 EJECUTANDO SUITE DE REGRESIÓN v3.61.21 (AISLAMIENTO VT POR BUS)');
console.log('═══════════════════════════════════════════════════════════════════\n');

// 1. Prueba de normalizarDisco y resolverDiscoPorUnidad
assert(normalizarDisco('01') === '01', '1. normalizarDisco("01") retorna "01"');
assert(normalizarDisco('BUS-10') === '10', '2. normalizarDisco("BUS-10") retorna "10"');
assert(normalizarDisco('BUS-10 - Carlos 2') === '10', '3. normalizarDisco("BUS-10 - Carlos 2") prioriza el prefijo BUS-10 y retorna "10"');
assert(normalizarDisco('José Luis') === '', '4. normalizarDisco("José Luis") sin números retorna string vacío "" (nunca "00")');
assert(resolverDiscoPorUnidad('01', 'BUS-10') === '10', '5. resolverDiscoPorUnidad("01", "BUS-10") corrige fallback y retorna "10"');
assert(resolverDiscoPorUnidad('10', 'BUS-10') === '10', '6. resolverDiscoPorUnidad("10", "BUS-10") retorna "10"');
assert(resolverDiscoPorUnidad('01', 'BUS-01') === '01', '7. resolverDiscoPorUnidad("01", "BUS-01") retorna "01"');

// 2. Prueba matemática de Unidad 01 el 2026-10-09
assert(
  HISTORIAL_SEMILLA_AUDITADO_UNIDAD_01.length === 3 &&
    HISTORIAL_SEMILLA_AUDITADO_UNIDAD_01[2].date === '2026-10-01' &&
    HISTORIAL_SEMILLA_AUDITADO_UNIDAD_01[2].vtCode === 'VT11',
  '8. HISTORIAL_SEMILLA_AUDITADO_UNIDAD_01 contiene los 3 cierres auditados reales hasta 2026-10-01 (VT11)'
);

const proyBus01 = calcularProyeccionSecuencia(
  HISTORIAL_SEMILLA_AUDITADO_UNIDAD_01,
  null,
  '2026-10-09'
);
assert(
  proyBus01.estado === 'CONFIRMADO' &&
    proyBus01.conteoArqueos === 3 &&
    proyBus01.turnoProyectado === 'VT04',
  '9. Bus 01 proyecta exactamente VT04 para el 2026-10-09 en estado CONFIRMADO (3/3)',
  `Obtenido: ${proyBus01.turnoProyectado} (${proyBus01.estado})`
);

// 3. Prueba de Bus 10 con 0, 1, 2 y 3 registros (independencia total del Bus 01)
const proyBus10_0 = calcularProyeccionSecuencia([], null, '2026-10-09');
assert(
  proyBus10_0.estado === 'CALIBRANDO' && proyBus10_0.conteoArqueos === 0,
  '10. Bus 10 sin registros permanece en estado CALIBRANDO (0/3 arqueos)'
);

const proyBus10_1 = calcularProyeccionSecuencia(
  [{ date: '2026-10-06', vtCode: 'VT07', conductor: 'BUS-10', numeroDisco: '10' }],
  null,
  '2026-10-09'
);
assert(
  proyBus10_1.estado === 'CALIBRANDO' && proyBus10_1.conteoArqueos === 1,
  '11. Bus 10 con 1 registro permanece en estado CALIBRANDO (1/3 arqueos)'
);

const proyBus10_2 = calcularProyeccionSecuencia(
  [
    { date: '2026-10-06', vtCode: 'VT07', conductor: 'BUS-10', numeroDisco: '10' },
    { date: '2026-10-07', vtCode: 'VT08', conductor: 'BUS-10', numeroDisco: '10' },
  ],
  null,
  '2026-10-09'
);
assert(
  proyBus10_2.estado === 'CALIBRANDO' && proyBus10_2.conteoArqueos === 2,
  '12. Bus 10 con 2 registros permanece en estado CALIBRANDO (2/3 arqueos)'
);

const proyBus10_3 = calcularProyeccionSecuencia(
  [
    { date: '2026-10-06', vtCode: 'VT07', conductor: 'BUS-10', numeroDisco: '10' },
    { date: '2026-10-07', vtCode: 'VT08', conductor: 'BUS-10', numeroDisco: '10' },
    { date: '2026-10-08', vtCode: 'VT09', conductor: 'BUS-10', numeroDisco: '10' },
  ],
  null,
  '2026-10-09'
);
assert(
  proyBus10_3.estado === 'CONFIRMADO' &&
    proyBus10_3.conteoArqueos === 3 &&
    proyBus10_3.turnoProyectado === 'VT10',
  '13. Bus 10 al completar su 3er registro habilita automáticamente estado CONFIRMADO (3/3) y calcula su propio VT (VT10) distinto al VT04 del Bus 01',
  `Obtenido: ${proyBus10_3.turnoProyectado} (${proyBus10_3.estado})`
);

// 4. Verificación estática de aislamiento en API y Componentes UI
const apiRecordsCode = fs.readFileSync(
  path.join(__dirname, '../src/app/api/records/route.ts'),
  'utf8'
);
assert(
  apiRecordsCode.includes("(!cleanBusNum || cleanBusNum === '01')") &&
    apiRecordsCode.includes('startsWith: `BUS-${cleanBusNum}`'),
  '14. GET /api/records aísla estrictamente los registros por unidad para que Bus 10 nunca herede arqueos del Bus 01'
);
assert(
  apiRecordsCode.includes('conductorNormalizado') && apiRecordsCode.includes('BUS-${cleanDiscoPost}'),
  '15. POST /api/records etiqueta cada registro nuevo con el identificador BUS-XX de su unidad'
);

const trackerCode = fs.readFileSync(
  path.join(__dirname, '../src/lib/turno-secuencia-tracker.ts'),
  'utf8'
);
assert(
  trackerCode.includes('`/api/records?limit=60&busId=${encodeURIComponent(effectiveBusId)}`'),
  '16. obtenerUltimosArqueosBus consulta /api/records pasando explícitamente busId de la unidad activa'
);
assert(
  trackerCode.includes('esUnidad01Genuina') && trackerCode.includes('if (listaFinal.length >= 3)'),
  '17. obtenerCalibracionLocalBus restringe la semilla inicial exclusivamente a la Unidad 01 y persiste ficha al llegar a 3 fechas distintas'
);

const socioWidgetCode = fs.readFileSync(
  path.join(__dirname, '../src/components/transport/SocioMantenimientoWidget.tsx'),
  'utf8'
);
assert(
  socioWidgetCode.includes('estaCalibradoAutomatico') &&
    socioWidgetCode.includes('En calibración ({proyeccionTurno.conteoArqueos}/3 registros de arqueo)'),
  '18. SocioMantenimientoWidget muestra aviso claro de calibración (X/3 registros) cuando el bus aún no tiene 3 arqueos'
);

const choferCardCode = fs.readFileSync(
  path.join(__dirname, '../src/components/transport/ChoferDisponibilidadCard.tsx'),
  'utf8'
);
assert(
  choferCardCode.includes("proyeccion?.estado === 'CALIBRANDO'") &&
    choferCardCode.includes('en calibración ({proyeccion.conteoArqueos}/3 arqueos)'),
  '19. ChoferDisponibilidadCard muestra banner de calibración (X/3 arqueos) cuando la unidad aún no completa 3 registros'
);

console.log('\n═══════════════════════════════════════════════════════════════════');
console.log(` 📊 RESULTADO FINAL: ${passed} PASARON | ${failed} FALLARON`);
console.log('═══════════════════════════════════════════════════════════════════');

if (failed > 0) {
  process.exit(1);
}
