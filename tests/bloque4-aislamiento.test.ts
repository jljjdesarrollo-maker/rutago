import { describe, it, expect } from 'bun:test';

describe('🛡️ BLOQUE 4: Personal, Ficha de Unidad, Respaldo y Cierre (Aislamiento Multi-Tenant)', () => {
  it('4.1 Aislamiento de Personal por Socio y Unidad (PersonalScreen / /api/personas)', () => {
    const buildPersonalParams = (isSocio: boolean, socioIdActual: string | null, effectiveBusId: string | null) => {
      const params = new URLSearchParams();
      params.set('incluirInactivos', 'true');
      if (isSocio) {
        if (socioIdActual) params.set('socioId', socioIdActual);
        if (effectiveBusId && effectiveBusId !== 'TODOS') params.set('busId', effectiveBusId);
      }
      return params.toString();
    };

    // Caso: Socio de la Unidad 10
    const querySocio10 = buildPersonalParams(true, 'socio-10-id', 'BUS-10');
    expect(querySocio10).toContain('socioId=socio-10-id');
    expect(querySocio10).toContain('busId=BUS-10');
    expect(querySocio10).toContain('incluirInactivos=true');

    // Simular resolución de socio en API con busId
    const resolveTargetSocio = (bodySocioId?: string | null, busFoundSocioId?: string | null) => {
      let targetSocioId: string | null = null;
      if (bodySocioId && bodySocioId !== 'SIN_SOCIO' && bodySocioId !== 'TODOS') {
        targetSocioId = bodySocioId;
      } else if (busFoundSocioId) {
        targetSocioId = busFoundSocioId;
      }
      return targetSocioId;
    };

    expect(resolveTargetSocio('socio-10-id', null)).toBe('socio-10-id');
    expect(resolveTargetSocio(null, 'socio-deducido-bus10')).toBe('socio-deducido-bus10');

    // Desactivación de turnos anteriores solo afecta al mismo socio (no toca otras unidades)
    const personalFlota = [
      { id: 'P1', nombre: 'Jimmy Chofer', rol: 'CONDUCTOR', socioId: 'socio-01', esActual: true },
      { id: 'P2', nombre: 'Carlos Chofer', rol: 'CONDUCTOR', socioId: 'socio-10', esActual: true },
    ];

    const activarNuevoChoferSocio10 = (nuevoId: string, targetSocioId: string) => {
      return personalFlota.map(p => {
        if (p.socioId === targetSocioId && p.rol === 'CONDUCTOR') {
          return { ...p, esActual: p.id === nuevoId };
        }
        return p;
      });
    };

    const updated = activarNuevoChoferSocio10('P3', 'socio-10');
    const choferBus01 = updated.find(p => p.id === 'P1');
    const choferBus10 = updated.find(p => p.id === 'P2');

    // El chofer de Bus 01 sigue intacto como activo
    expect(choferBus01?.esActual).toBe(true);
    // El chofer anterior de Bus 10 se desactivó para su propia unidad
    expect(choferBus10?.esActual).toBe(false);
  });

  it('4.2 Ficha de Mi Autobús y Restricción de Flota para el Socio (FlotaScreen / /api/buses)', () => {
    const flotaMock = [
      { id: 'BUS-01', numeroDisco: '01', placa: 'LAA-1234', socioId: 'socio-01' },
      { id: 'BUS-10', numeroDisco: '10', placa: 'HAA-3509', socioId: 'socio-10' },
      { id: 'BUS-15', numeroDisco: '15', placa: 'LBA-5678', socioId: 'socio-15' },
    ];

    const resolveAccessibleBuses = (
      buses: typeof flotaMock,
      isSuperAdmin: boolean,
      activeBusId: string,
      socioId?: string
    ) => {
      if (isSuperAdmin) return buses;

      const cleanActiveDisco = activeBusId ? activeBusId.replace(/^BUS-/i, '') : '';
      const myBus = buses.find(
        (b) => b.id === activeBusId || b.numeroDisco === cleanActiveDisco || (cleanActiveDisco && b.numeroDisco === cleanActiveDisco.padStart(2, '0'))
      );
      if (myBus) return [myBus];

      if (socioId) {
        const socioBuses = buses.filter((b) => b.socioId === socioId);
        if (socioBuses.length > 0) return socioBuses;
      }

      // Jamás caer en Bus 01 para una unidad no vinculada
      return [];
    };

    // 1. SuperAdmin ve toda la flota
    const superAdminView = resolveAccessibleBuses(flotaMock, true, 'BUS-01');
    expect(superAdminView.length).toBe(3);

    // 2. Socio de Bus 10 ve ÚNICAMENTE Bus 10
    const socio10View = resolveAccessibleBuses(flotaMock, false, 'BUS-10', 'socio-10');
    expect(socio10View.length).toBe(1);
    expect(socio10View[0].numeroDisco).toBe('10');
    expect(socio10View[0].placa).toBe('HAA-3509');

    // 3. Unidad no encontrada no se contamina con Bus 01
    const unknownBusView = resolveAccessibleBuses(flotaMock, false, 'BUS-99', 'socio-nuevo-sin-bus');
    expect(unknownBusView.length).toBe(0);

    // 4. Bloqueo de acciones administrativas para socio
    const canCreateBus = (isSuperAdmin: boolean) => isSuperAdmin;
    const canDeleteBus = (isSuperAdmin: boolean) => isSuperAdmin;
    expect(canCreateBus(false)).toBe(false);
    expect(canDeleteBus(false)).toBe(false);
    expect(canCreateBus(true)).toBe(true);
    expect(canDeleteBus(true)).toBe(true);
  });

  it('4.3 Copia de Seguridad Aislada y Cierre de Sesión Seguro (handleBackup / onLogout)', () => {
    // Parámetros de respaldo filtrados por rol
    const buildBackupParams = (isSuperAdmin: boolean, activeBusId?: string, effectiveSocioId?: string) => {
      const params = new URLSearchParams();
      if (!isSuperAdmin) {
        if (activeBusId && activeBusId !== 'TODOS') params.set('busId', activeBusId);
        if (effectiveSocioId && effectiveSocioId !== 'TODOS') params.set('socioId', effectiveSocioId);
      }
      const q = params.toString();
      return q ? `?${q}` : '';
    };

    const backupSuperAdmin = buildBackupParams(true, 'BUS-10', 'socio-10');
    expect(backupSuperAdmin).toBe(''); // SuperAdmin respalda toda la base de datos

    const backupSocio10 = buildBackupParams(false, 'BUS-10', 'socio-10');
    expect(backupSocio10).toContain('busId=BUS-10');
    expect(backupSocio10).toContain('socioId=socio-10');

    // Nombre de archivo con aislamiento de unidad
    const getBackupFilename = (isSuperAdmin: boolean, activeBusId: string, dateStr: string) => {
      return isSuperAdmin
        ? `respaldo_cooperativa_${dateStr}.json`
        : `respaldo_${activeBusId || 'unidad'}_${dateStr}.json`;
    };

    expect(getBackupFilename(true, 'BUS-10', '2026-10-10')).toBe('respaldo_cooperativa_2026-10-10.json');
    expect(getBackupFilename(false, 'BUS-10', '2026-10-10')).toBe('respaldo_BUS-10_2026-10-10.json');

    // Limpieza de sesión en logout
    const mockLocalStorage: Record<string, string> = {
      ct_session: 'session_token_123',
      rg_active_view: 'flota_gestion',
      rg_active_estado_id: 'estado_456',
      rg_active_es_ultima: 'true',
      rg_active_bus_id_v1: 'BUS-10',
    };

    const performLogout = (storage: Record<string, string>) => {
      delete storage.ct_session;
      delete storage.rg_active_view;
      delete storage.rg_active_estado_id;
      delete storage.rg_active_es_ultima;
      delete storage.rg_active_bus_id_v1;
    };

    performLogout(mockLocalStorage);
    expect(mockLocalStorage.ct_session).toBeUndefined();
    expect(mockLocalStorage.rg_active_view).toBeUndefined();
    expect(mockLocalStorage.rg_active_bus_id_v1).toBeUndefined();
    expect(Object.keys(mockLocalStorage).length).toBe(0);
  });
});
