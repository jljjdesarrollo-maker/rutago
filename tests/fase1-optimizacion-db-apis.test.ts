import { describe, it, expect } from 'bun:test';
import { readFileSync } from 'fs';
import { join } from 'path';
import { DAILY_RECORD_LIST_SELECT } from '../src/lib/canonical-record-payload';

const ROOT_DIR = join(__dirname, '..');

describe('⚡ FASE 1: Optimización de Base de Datos y APIs Críticas (v3.61.63)', () => {
  it('1. DAILY_RECORD_LIST_SELECT excluye photoUrl a nivel SQL y conserva los 17 campos escalares', () => {
    expect('photoUrl' in DAILY_RECORD_LIST_SELECT).toBe(false);
    const expectedFields = [
      'id',
      'date',
      'km',
      'kmInicial',
      'kmFinal',
      'conductor',
      'ayudanteNombre',
      'vtCode',
      'production',
      'cajaComun',
      'sobrante',
      'tickets',
      'entregaAyudante',
      'entregaCompania',
      'totalGastos',
      'createdAt',
      'updatedAt',
    ];
    for (const field of expectedFields) {
      expect((DAILY_RECORD_LIST_SELECT as Record<string, boolean>)[field]).toBe(true);
    }
    expect(Object.keys(DAILY_RECORD_LIST_SELECT).length).toBe(17);
  });

  it('2. GET /api/records ejecuta un único db.dailyRecord.findMany con select liviano y paraleliza auto-saneamiento con Promise.all', () => {
    const recordsRoute = readFileSync(join(ROOT_DIR, 'src/app/api/records/route.ts'), 'utf8');
    // Extraer bloque de GET
    const getBlock = recordsRoute.split('export async function POST')[0];
    const findManyMatches = getBlock.match(/db\.dailyRecord\.findMany\(/g) || [];
    expect(findManyMatches.length).toBe(1);
    expect(getBlock).toContain('...DAILY_RECORD_LIST_SELECT');
    expect(getBlock).toContain('await Promise.all(healPromises)');
  });

  it('3. GET /api/records/[id] solo selecciona photoUrl en PostgreSQL cuando ?photo=true es solicitado', () => {
    const recordByIdRoute = readFileSync(join(ROOT_DIR, 'src/app/api/records/[id]/route.ts'), 'utf8');
    expect(recordByIdRoute).toContain('...DAILY_RECORD_LIST_SELECT');
    expect(recordByIdRoute).toContain('...(includePhoto ? { photoUrl: true } : {})');
  });

  it('4. GET /api/reports excluye photoUrl en reporte general y Caja Común y reemplaza N+1 por db.frecuencia.groupBy', () => {
    const reportsRoute = readFileSync(join(ROOT_DIR, 'src/app/api/reports/route.ts'), 'utf8');
    expect(reportsRoute).toContain('...DAILY_RECORD_LIST_SELECT');
    expect(reportsRoute).toContain('db.frecuencia.groupBy(');
    expect(reportsRoute).not.toContain('db.frecuencia.count(');
    // Verificar que handleCajaComunReport usa select explícito sin photoUrl
    const cajaComunBlock = reportsRoute.split('async function handleCajaComunReport')[1];
    expect(cajaComunBlock).toContain('select: {');
    expect(cajaComunBlock).not.toContain('include: { trips:');
  });

  it('5. GET /api/reports/operativo y GET /api/reports/compare-frequencies usan select explícito sin photoUrl', () => {
    const operativoRoute = readFileSync(join(ROOT_DIR, 'src/app/api/reports/operativo/route.ts'), 'utf8');
    const compareRoute = readFileSync(join(ROOT_DIR, 'src/app/api/reports/compare-frequencies/route.ts'), 'utf8');

    expect(operativoRoute).toContain('select: {');
    expect(operativoRoute).not.toContain('include: { trips:');
    expect(compareRoute).toContain('select: {');
    expect(compareRoute).not.toContain('include: {\n        trips:');
  });

  it('6. prisma/schema.prisma declara los nuevos índices de rendimiento en DailyRecord, Trip y Expense', () => {
    const schema = readFileSync(join(ROOT_DIR, 'prisma/schema.prisma'), 'utf8');
    expect(schema).toContain('@@index([conductor, date])');
    const recordIdIndexes = schema.match(/@@index\(\[recordId\]\)/g) || [];
    expect(recordIdIndexes.length).toBeGreaterThanOrEqual(2);
  });
});
