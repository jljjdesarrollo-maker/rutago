import { describe, it, expect } from 'bun:test';
import fs from 'fs';
import path from 'path';

describe('Fase 3: Adelgazamiento del Arranque Móvil con Carga Diferida (next/dynamic)', () => {
  const pagePath = path.join(__dirname, '../src/app/page.tsx');
  const homePath = path.join(__dirname, '../src/components/transport/HomeScreen.tsx');
  const pageSource = fs.readFileSync(pagePath, 'utf8');
  const homeSource = fs.readFileSync(homePath, 'utf8');

  it('mantiene en carga síncrona inmediata (0 ms) el núcleo operativo diario en src/app/page.tsx', () => {
    const coreScreens = [
      "import { HomeScreen } from '@/components/transport/HomeScreen'",
      "import { HistoryScreen } from '@/components/transport/HistoryScreen'",
      "import { LoginScreen } from '@/components/transport/LoginScreen'",
      "import { HomeScreenVT } from '@/components/transport/HomeScreenVT'",
      "import { FrecuenciaSelector } from '@/components/transport/FrecuenciaSelector'",
      "import { TicketScreen } from '@/components/transport/TicketScreen'",
      "import { ArqueoScreen } from '@/components/transport/ArqueoScreen'",
    ];
    for (const stmt of coreScreens) {
      expect(pageSource).toContain(stmt);
    }
  });

  it('migra las 17 pantallas secundarias y administrativas a next/dynamic en src/app/page.tsx', () => {
    expect(pageSource).toContain("import dynamic from 'next/dynamic'");

    const dynamicTargets = [
      'RecordForm',
      'CargaHistoricaScreen',
      'RecordDetail',
      'ComprobanteModal',
      'PersonalScreen',
      'ReportsScreen',
      'ReporteOperativoScreen',
      'VTConfigScreen',
      'CompareFrequenciesScreen',
      'VentasReviewScreen',
      'ArqueoGeneralScreen',
      'SyncScreen',
      'OwnerExpensesScreen',
      'FlotaScreen',
      'BenchmarkScreen',
      'SaaSAdminScreen',
      'MantenimientoScreen',
    ];

    for (const comp of dynamicTargets) {
      expect(pageSource).toContain(`const ${comp} = dynamic(`);
      expect(pageSource).not.toMatch(new RegExp(`^import\\s+.*?\\b${comp}\\b.*?from`, 'm'));
    }
  });

  it('separa por rol y bajo demanda los widgets pesados en src/components/transport/HomeScreen.tsx', () => {
    expect(homeSource).toContain("import dynamic from 'next/dynamic'");

    const homeDynamicTargets = [
      'ChoferMantenimientoWidget',
      'SocioMantenimientoWidget',
      'SuperAdminHomeScreen',
      'ReporteSocioCalendarioModal',
    ];

    for (const widget of homeDynamicTargets) {
      expect(homeSource).toContain(`const ${widget} = dynamic(`);
      expect(homeSource).not.toMatch(new RegExp(`^import\\s+.*?\\b${widget}\\b.*?from`, 'm'));
    }
  });
});
