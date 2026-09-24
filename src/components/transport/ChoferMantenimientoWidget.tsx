'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Wrench,
  AlertTriangle,
  CheckCircle2,
  Clock,
  RotateCcw,
  Gauge,
  UserCheck,
  Save,
  Check,
  ChevronRight,
  ShieldCheck,
  Zap,
  X,
  Wind,
  Receipt,
  History,
  Building2,
  Calendar,
  Wifi,
  RefreshCw,
  Search,
  Filter,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { getAllBuses, getActiveBusId, getLatestBusOdometer, saveBusOdometer, subscribeToActiveBus, subscribeToBusOdometer } from '@/lib/fleet-storage';
import { getCatalogoMaestroGlobal } from '@/lib/mantenimiento-catalogo';
import { saveOwnerExpense, saveOwnerExpenseToApi } from '@/lib/owner-expenses-storage';
import { type PaymentMethod, type PaymentAbono } from '@/types/expenses';
import {
  saveParadaPago,
  getParadasPagoByBus,
  calcularDesgasteRegularizacion,
  filtrarParadasPagoOffline,
  type ParadaPagoRegistro,
  type ParadaPagador,
  type SocioModalidadPago,
} from '@/lib/paradas-vt-storage';
import { type MantenimientoBusItem } from './MantenimientoScreen';
import { 
  getBusModuloMantenimientoActivo, 
  type EstacionServicioId, 
  ESTACIONES_SERVICIO_CONFIG, 
  getComboUnidad, 
  resolverCascadaEstacion, 
  getCategoriaContablePorEstacion,
  syncMantenimientoConfigConServidor
} from '@/lib/mantenimiento-estaciones';
import { syncMantenimientoBidireccional, flushMantenimientoOutbox, getMantenimientoOutbox } from '@/lib/mantenimiento-sync';

export function ChoferMantenimientoWidget({ onVerMas }: { onVerMas?: () => void }) {
  const { toast } = useToast();

  const [activeBusId, setActiveBusId] = useState<string>(() => {
    if (typeof window === 'undefined') return 'BUS-01';
    return getActiveBusId();
  });

  const resolverKmActual = useCallback((busId: string): number => {
    if (typeof window === 'undefined') return 187420;
    const busesList = getAllBuses();
    const current = busesList.find(b => b.id === busId);
    const disco = current?.numeroDisco || '01';

    const audited = getLatestBusOdometer(disco);
    if (audited && audited.kmFinal) {
      const num = parseInt(audited.kmFinal, 10);
      if (!isNaN(num) && num > 0) return num;
    }
    const savedKm = localStorage.getItem(`rg_last_km_${busId}`);
    if (savedKm) {
      const num = parseInt(savedKm, 10);
      if (!isNaN(num) && num > 0) return num;
    }
    const savedKmDisco = localStorage.getItem(`rg_last_km_${disco}`);
    if (savedKmDisco) {
      const num = parseInt(savedKmDisco, 10);
      if (!isNaN(num) && num > 0) return num;
    }
    if (current && (current as any).odometroInicial) {
      const num = parseInt((current as any).odometroInicial, 10);
      if (!isNaN(num) && num > 0) return num;
    }
    if (disco === '01' || busId === 'BUS-01') return 893485;
    return 187420;
  }, []);

  const [kmActual, setKmActual] = useState<number>(() => resolverKmActual(getActiveBusId()));

  const cargarItems = useCallback((busId: string) => {
    if (typeof window === 'undefined') return [];
    const storageKey = `rg_mantenimientos_v2_${busId}`;
    const currentKm = resolverKmActual(busId) || 893485;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const desfaseExtremo = parsed.some(
            (it: MantenimientoBusItem) => it.ultimoKm > 0 && Math.abs(currentKm - it.ultimoKm) > 100000
          );
          if (!desfaseExtremo) {
            return parsed.filter((it: MantenimientoBusItem) => it.activo !== false);
          }
          console.warn('Detectado desfase histórico en widget del chofer. Re-calibrando a línea base real...');
        }
      } catch (e) {
        console.error(e);
      }
    }

    if (!getBusModuloMantenimientoActivo(busId)) {
      return [];
    }

    const catalogo = getCatalogoMaestroGlobal();
    return catalogo
      .map(c => {
        const esChofer = Boolean(c.asignadoChoferPorDefecto);
        // Aceite de motor y tríada de filtros: Cambiados anteayer (19 de septiembre de 2026) a 893,100 km
        if (
          c.codigo === 'MNT-ACEITE-MOT' ||
          c.codigo === 'MNT-FILT-ACEITE' ||
          c.codigo === 'MNT-FILT-TRAMPA' ||
          c.codigo === 'MNT-FILT-DIESEL-SEC'
        ) {
          return {
            id: `mbus-${c.id}-calibrado`,
            catalogoId: c.id,
            codigo: c.codigo,
            nombre: c.nombre,
            categoria: c.categoria,
            intervaloKm: c.intervaloKmOficial,
            ultimoKm: 893100,
            fechaUltimo: '2026-09-19',
            costoEstimado: 0,
            repuestoDetalle: c.especificacionLubricanteRepuesto,
            asignadoChofer: esChofer,
            activo: true,
          };
        }
        // Engrase de chasis
        if (c.codigo === 'MNT-ENGRASE-CHASIS') {
          return {
            id: `mbus-${c.id}-calibrado`,
            catalogoId: c.id,
            codigo: c.codigo,
            nombre: c.nombre,
            categoria: c.categoria,
            intervaloKm: c.intervaloKmOficial,
            ultimoKm: 893085,
            fechaUltimo: '2026-09-19',
            costoEstimado: 0,
            repuestoDetalle: c.especificacionLubricanteRepuesto,
            asignadoChofer: esChofer,
            activo: true,
          };
        }
        // Rotación mensual de baterías (8,600 km ciclo / 30 días - sh chofer)
        if (c.codigo === 'MNT-ROTACION-BATERIAS') {
          return {
            id: `mbus-${c.id}-calibrado`,
            catalogoId: c.id,
            codigo: c.codigo,
            nombre: c.nombre,
            categoria: c.categoria,
            intervaloKm: c.intervaloKmOficial,
            ultimoKm: Math.max(0, currentKm - 1500),
            fechaUltimo: '2026-09-15',
            costoEstimado: 0,
            repuestoDetalle: c.especificacionLubricanteRepuesto,
            asignadoChofer: esChofer,
            activo: true,
          };
        }
        return {
          id: `mbus-${c.id}-default`,
          catalogoId: c.id,
          codigo: c.codigo,
          nombre: c.nombre,
          categoria: c.categoria,
          intervaloKm: c.intervaloKmOficial,
          ultimoKm: Math.max(0, currentKm - Math.floor(c.intervaloKmOficial * 0.2)),
          fechaUltimo: '2026-09-10',
          costoEstimado: 0,
          repuestoDetalle: c.especificacionLubricanteRepuesto,
          asignadoChofer: esChofer,
          activo: true,
        };
      });
  }, [resolverKmActual]);

  // Tareas asignadas al Chofer y Catálogo Completo del Bus
  const [items, setItems] = useState<MantenimientoBusItem[]>(() => cargarItems(getActiveBusId()));
  // FASE 1: Selector de Alcance en 1 Toque (Mis Tareas vs Todo el Bus)
  const [filtroAlcance, setFiltroAlcance] = useState<'CHOFER' | 'TODOS'>('CHOFER');
  // FASE 2 y 3: Búsqueda, Filtros de Estación y Pagador Offline para el Historial
  const [busquedaHistorial, setBusquedaHistorial] = useState<string>('');
  const [filtroEstacionHistorial, setFiltroEstacionHistorial] = useState<string>('TODAS');
  const [filtroPagadorHistorial, setFiltroPagadorHistorial] = useState<'TODOS' | 'AYUDANTE' | 'SOCIO'>('TODOS');
  const [, setComboSyncCounter] = useState<number>(0);
  const [outboxCount, setOutboxCount] = useState<number>(() => {
    if (typeof window === 'undefined') return 0;
    return getMantenimientoOutbox().length;
  });

  // Modal para Novedad / Arreglo Rápido Fuera de Catálogo (v3.60.12)
  const [isArregloModalOpen, setIsArregloModalOpen] = useState<boolean>(false);
  const [arregloDescripcion, setArregloDescripcion] = useState<string>('');
  const [arregloKm, setArregloKm] = useState<string>('');
  const [arregloFecha, setArregloFecha] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [arregloTaller, setArregloTaller] = useState<string>('');
  const [arregloFactura, setArregloFactura] = useState<string>('');
  const [arregloCosto, setArregloCosto] = useState<string>('');
  const [arregloPagador, setArregloPagador] = useState<ParadaPagador>('AYUDANTE');
  const [arregloSocioModalidad, setArregloSocioModalidad] = useState<SocioModalidadPago>('TRANSFERENCIA_TOTAL');
  const [arregloSocioAbono, setArregloSocioAbono] = useState<string>('');
  const [arregloIsSaving, setArregloIsSaving] = useState<boolean>(false);

  // Suscripción reactiva al cambio de unidad física y al odómetro auditado (Arqueo de Llegada)
  useEffect(() => {
    const unsubBus = subscribeToActiveBus((bus) => {
      setActiveBusId(bus.id);
      setKmActual(resolverKmActual(bus.id));
      setItems(cargarItems(bus.id));
      setHistorialParadas(getParadasPagoByBus(bus.id));
    });

    const unsubOdo = subscribeToBusOdometer((data) => {
      const busesList = getAllBuses();
      const current = busesList.find(b => b.id === activeBusId);
      const disco = current?.numeroDisco || '01';
      if (data.numeroDisco === disco || data.busId === activeBusId) {
        const num = parseInt(data.kmFinal, 10);
        if (!isNaN(num) && num > 0) {
          setKmActual(num);
        }
      }
    });

    const handleConfigSync = () => {
      setItems(cargarItems(activeBusId));
    };
    window.addEventListener('rg_mantenimiento_config_sync', handleConfigSync);

    const handleParadasSync = () => {
      setHistorialParadas(getParadasPagoByBus(activeBusId));
    };
    const handleCombosSync = () => {
      setComboSyncCounter(c => c + 1);
      // Si el chofer tiene el modal de una estación abierto, actualizar la receta en vivo
      setEstacionSeleccionadaChofer(currEst => {
        if (currEst) {
          const comboData = getComboUnidad(activeBusId, currEst);
          setEstacionItemsChofer(comboData.items);
          const checksMap: Record<string, boolean> = {};
          comboData.items.forEach(it => {
            checksMap[it.codigo] = it.preMarcado;
          });
          setEstacionChecksChofer(checksMap);
        }
        return currEst;
      });
    };
    window.addEventListener('rg_paradas_pago_updated', handleParadasSync);
    window.addEventListener('rg_combo_unidad_actualizado', handleCombosSync);

    const handleOutboxUpdate = () => {
      setOutboxCount(getMantenimientoOutbox().length);
    };
    const handleSyncExito = (e: any) => {
      const count = e?.detail?.count || 1;
      setOutboxCount(getMantenimientoOutbox().length);
      toast({
        title: '✅ Mantenimientos Sincronizados',
        description: `${count} servicio(s) pendiente(s) subidos a la nube con éxito.`,
      });
    };
    window.addEventListener('rg_mantenimiento_outbox_updated', handleOutboxUpdate);
    window.addEventListener('rg_mantenimiento_sincronizado_exito', handleSyncExito);

    // Sincronización bidireccional automática al detectar conexión a internet (Frecuencia en Ruta)
    const handleOnline = () => {
      syncMantenimientoBidireccional(activeBusId).then(() => {
        setItems(cargarItems(activeBusId));
        setHistorialParadas(getParadasPagoByBus(activeBusId));
        setOutboxCount(getMantenimientoOutbox().length);
      }).catch(() => {});
    };
    window.addEventListener('online', handleOnline);

    // Disparar sincronización silenciosa de entrada diferida (2 segundos) para no competir con el render inicial del Chofer
    let initTimer: any = null;
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      initTimer = setTimeout(() => {
        syncMantenimientoBidireccional(activeBusId).catch(() => {});
      }, 2000);
    }

    return () => {
      if (initTimer) clearTimeout(initTimer);
      unsubBus();
      unsubOdo();
      window.removeEventListener('rg_mantenimiento_config_sync', handleConfigSync);
      window.removeEventListener('rg_paradas_pago_updated', handleParadasSync);
      window.removeEventListener('rg_combo_unidad_actualizado', handleCombosSync);
      window.removeEventListener('rg_mantenimiento_outbox_updated', handleOutboxUpdate);
      window.removeEventListener('rg_mantenimiento_sincronizado_exito', handleSyncExito);
      window.removeEventListener('online', handleOnline);
    };
  }, [activeBusId, resolverKmActual, cargarItems]);

  // Historial de Mantenimientos y Paradas de Taller del Autobús (Fase A)
  const [isHistorialModalOpen, setIsHistorialModalOpen] = useState(false);
  const [isSyncingManual, setIsSyncingManual] = useState(false);

  const ejecutarSincronizacionManual = async () => {
    if (isSyncingManual) return;
    setIsSyncingManual(true);
    try {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        toast({
          title: '📶 Modo Fuera de Línea',
          description: 'No hay conexión a internet actualmente. Los datos se mantienen protegidos localmente.',
          variant: 'destructive',
        });
        setIsSyncingManual(false);
        return;
      }
      const res = await syncMantenimientoBidireccional(activeBusId);
      setItems(cargarItems(activeBusId));
      setHistorialParadas(getParadasPagoByBus(activeBusId));
      setOutboxCount(getMantenimientoOutbox().length);
      toast({
        title: '☁️ Nube y Base de Datos Al Día',
        description: `Sincronización completa. ${res.downloaded} registros consultados y respaldados en PostgreSQL.`,
      });
    } catch (err) {
      toast({
        title: 'Aviso de Red',
        description: 'La sincronización se completará automáticamente en segundo plano.',
      });
    } finally {
      setIsSyncingManual(false);
    }
  };
  const [historialParadas, setHistorialParadas] = useState<ParadaPagoRegistro[]>(() => {
    if (typeof window === 'undefined') return [];
    return getParadasPagoByBus(getActiveBusId());
  });

  // Modal rápido de registro para el chofer
  const [modalItem, setModalItem] = useState<MantenimientoBusItem | null>(null);
  const [registroKm, setRegistroKm] = useState<string>('');
  const [registroFecha, setRegistroFecha] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [registroCosto, setRegistroCosto] = useState<string>('');
  const [registroTaller, setRegistroTaller] = useState<string>('');

  const handleGuardarRegistroChofer = () => {
    if (!modalItem) return;
    const km = parseInt(registroKm, 10);
    if (isNaN(km) || km <= 0) {
      toast({
        title: 'Kilometraje inválido',
        description: 'Ingresa la lectura que marca el velocímetro/tacómetro.',
        variant: 'destructive',
      });
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const fechaFinal = registroFecha || today;
    const costoNum = parseFloat(registroCosto) || 0;
    const tallerFinal = registroTaller.trim() || 'Servicio en Ruta (Chofer)';
    const storageKey = `rg_mantenimientos_v2_${activeBusId}`;

    // Actualizar en el storage completo del bus
    let fullList: MantenimientoBusItem[] = [];
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) fullList = JSON.parse(saved);
    } catch {}

    const updatedFull = fullList.map(it =>
      it.id === modalItem.id
        ? {
            ...it,
            ultimoKm: km,
            fechaUltimo: fechaFinal,
            costoEstimado: costoNum > 0 ? costoNum : it.costoEstimado,
            tallerMecanico: tallerFinal,
          }
        : it
    );

    localStorage.setItem(storageKey, JSON.stringify(updatedFull));

    // Actualizar lista local de widget
    setItems(prev =>
      prev.map(it =>
        it.id === modalItem.id
          ? {
              ...it,
              ultimoKm: km,
              fechaUltimo: fechaFinal,
              costoEstimado: costoNum > 0 ? costoNum : it.costoEstimado,
              tallerMecanico: tallerFinal,
            }
          : it
      )
    );

    // Regla Inmutable: El odómetro del bus nunca retrocede
    if (km > kmActual) {
      saveBusOdometer(disco, km.toString(), 'Mantenimiento ' + modalItem.nombre);
      setKmActual(km);
    }

    // Persistir parada técnica en historial y sincronizar a BD central
    const paradaId = `parada-chofer-${Date.now()}`;
    const expenseId = `gasto-mnt-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

    saveParadaPago({
      id: paradaId,
      busId: activeBusId,
      disco,
      fecha: fechaFinal,
      estacionId: 'SERVICIO_INDIVIDUAL',
      estacionNombre: modalItem.nombre,
      taller: tallerFinal,
      odometroKm: km,
      odometroServicio: km,
      odometroActualBus: Math.max(kmActual, km),
      esRetroactivo: km < kmActual || fechaFinal < today,
      kmRodadosDesdeServicio: Math.max(0, kmActual - km),
      costoTotal: costoNum,
      pagador: 'AYUDANTE',
      montoCubiertoAyudante: costoNum,
      descontadoEnVT: false,
      detalleTrabajo: `${modalItem.nombre} - Cambio / Servicio realizado`,
      itemsRealizados: [modalItem.nombre],
      codigosMantenimiento: modalItem.codigo ? [modalItem.codigo] : [],
      ownerExpenseId: expenseId,
      createdAt: new Date().toISOString(),
    });

    const descGasto = costoNum > 0
      ? `${modalItem.nombre} (Km ${km.toLocaleString()}) - ${tallerFinal}`
      : `${modalItem.nombre} (Km ${km.toLocaleString()}) - ${tallerFinal} [Sin costo / Garantía]`;

    saveOwnerExpenseToApi({
      id: expenseId,
      busId: activeBusId,
      category: 'OTROS',
      description: descGasto,
      provider: tallerFinal,
      totalAmount: costoNum,
      paidAmount: costoNum,
      pendingBalance: 0,
      paymentMethod: 'EFECTIVO',
      status: 'PAGADO',
      expenseDate: fechaFinal,
      createdAt: new Date().toISOString(),
    }).then(res => {
      if (res.syncedToCloud) {
        toast({
          title: '☁️ Sincronizado en Base de Datos Central',
          description: `${modalItem.nombre} asentado y guardado en la base de datos central exitosamente.`,
        });
      } else {
        toast({
          title: '📡 Guardado Local (Sin Conexión)',
          description: 'Sin internet al asentar. La información está segura en el teléfono y se sincronizará a la base de datos automáticamente al recuperar la señal.',
        });
      }
    }).catch(() => {
      toast({
        title: '📡 Guardado Local (Sin Conexión)',
        description: 'Guardado localmente. Se sincronizará a la base de datos central al restablecer la conexión.',
      });
    });

    toast({
      title: 'Mantenimiento Asentado',
      description: `${modalItem.nombre} registrado con éxito en ${km.toLocaleString()} km.`,
    });

    setModalItem(null);
  };

  // FASE 2: Modal Oficial de Estaciones de Taller / Combos de Parada del Chofer
  const [estacionSeleccionadaChofer, setEstacionSeleccionadaChofer] = useState<EstacionServicioId | null>(null);
  const [estacionItemsChofer, setEstacionItemsChofer] = useState<{ codigo: string; nombre: string; intervaloKm: number; preMarcado: boolean; opcionalTexto?: string }[]>([]);
  const [estacionChecksChofer, setEstacionChecksChofer] = useState<Record<string, boolean>>({});
  const [estacionKmChofer, setEstacionKmChofer] = useState<string>('');
  const [estacionModoRetroactivoChofer, setEstacionModoRetroactivoChofer] = useState<boolean>(false);
  const [estacionKmServicioChofer, setEstacionKmServicioChofer] = useState<string>('');
  const [estacionFechaServicioChofer, setEstacionFechaServicioChofer] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [estacionCostoChofer, setEstacionCostoChofer] = useState<string>('');
  const [estacionFacturaChofer, setEstacionFacturaChofer] = useState<string>('');
  const [estacionTallerChofer, setEstacionTallerChofer] = useState<string>('');
  // Sub-fase 3.1: Bifurcación de Pagador de Parada y Modalidad del Socio
  const [pagadorChofer, setPagadorChofer] = useState<ParadaPagador>('AYUDANTE');
  const [socioModalidadChofer, setSocioModalidadChofer] = useState<SocioModalidadPago>('TRANSFERENCIA_TOTAL');
  const [socioAbonoChofer, setSocioAbonoChofer] = useState<string>('');

  // Abrir Modal de Parada de Taller cargando la receta oficial del socio
  const handleAbrirEstacionChofer = (estacionId: EstacionServicioId) => {
    const config = ESTACIONES_SERVICIO_CONFIG[estacionId];
    if (!config) return;

    // Cargar combo de la unidad afinado por el socio en Fase 1
    const comboData = getComboUnidad(activeBusId, estacionId);
    
    // Checks basados en la receta del socio
    const checksMap: Record<string, boolean> = {};
    comboData.items.forEach(it => {
      checksMap[it.codigo] = it.preMarcado;
    });

    setEstacionSeleccionadaChofer(estacionId);
    setEstacionItemsChofer(comboData.items);
    setEstacionChecksChofer(checksMap);
    setEstacionKmChofer(kmActual.toString());
    setEstacionModoRetroactivoChofer(false);
    setEstacionKmServicioChofer(kmActual.toString());
    setEstacionFechaServicioChofer(new Date().toISOString().split('T')[0]);
    setEstacionCostoChofer('');
    setEstacionFacturaChofer('');
    setPagadorChofer('AYUDANTE');
    setSocioModalidadChofer('TRANSFERENCIA_TOTAL');
    setSocioAbonoChofer('');
    setEstacionTallerChofer(
      estacionId === 'LUBRICADORA' ? 'Lubricadora Vilcabamba' :
      estacionId === 'FRENOS_RUEDAS' ? 'Taller de Frenos Don Fausto' :
      estacionId === 'MNT_MAYOR' ? 'Taller Mecánico Especializado Hino' :
      estacionId === 'ADMISION_AIRE' ? 'Taller de Filtros y Neumática' :
      estacionId === 'ALINEACION' ? 'Serviteca y Alineación Continental' :
      estacionId === 'RADIADOR' ? 'Taller Radiadores Loja' : 'Terminal / Taller Parada'
    );
  };

  // Alternar ítem con 1 solo toque en fosa (soporta resolver cascada)
  const handleToggleItemChofer = (codigo: string) => {
    setEstacionChecksChofer(prev => {
      const nuevoValor = !prev[codigo];
      const actualizado = { ...prev, [codigo]: nuevoValor };

      // Si se activó mantenimiento mayor con cascada
      if (nuevoValor) {
        const activos = Object.keys(actualizado).filter(c => actualizado[c]);
        const resueltos = resolverCascadaEstacion(activos);
        resueltos.forEach(c => {
          actualizado[c] = true;
        });
      }
      return actualizado;
    });
  };

  // Asentar Parada de Taller: RESIDUO INMUTABLE -> Reset inmediato de odómetro a 0 km transcurridos
  const handleAsentarParadaChofer = () => {
    if (!estacionSeleccionadaChofer) return;
    const config = ESTACIONES_SERVICIO_CONFIG[estacionSeleccionadaChofer];
    if (!config) return;

    const km = parseInt(estacionKmChofer, 10);
    if (isNaN(km) || km <= 0) {
      toast({
        title: 'Kilometraje inválido',
        description: 'Ingresa la lectura actual del tacómetro del autobús.',
        variant: 'destructive',
      });
      return;
    }

    const codigosMarcados = Object.keys(estacionChecksChofer).filter(c => estacionChecksChofer[c]);
    if (codigosMarcados.length === 0) {
      toast({
        title: 'Selecciona al menos un componente',
        description: 'Debes marcar las tareas que efectivamente se ejecutaron en el taller.',
        variant: 'destructive',
      });
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const storageKey = 'rg_mantenimientos_v2_' + activeBusId;
    const catalogo = getCatalogoMaestroGlobal();
    let fullList: MantenimientoBusItem[] = [];
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) fullList = JSON.parse(saved);
    } catch {}

    const tallerStr = estacionTallerChofer.trim() || config.nombre;
    const facturaDetalle = estacionFacturaChofer.trim() ? 'Fac: ' + estacionFacturaChofer.trim() : '';
    const tallerCompleto = facturaDetalle ? tallerStr + ' (' + facturaDetalle + ')' : tallerStr;

    const valorTotal = parseFloat(estacionCostoChofer) || 0;
    const costoPorItem = valorTotal > 0 ? Math.round((valorTotal / codigosMarcados.length) * 100) / 100 : 0;

    const kmTablero = km;
    let kmEfectivoServicio = kmTablero;
    let fechaEfectiva = today;
    let esRetro = false;

    if (estacionModoRetroactivoChofer) {
      const kmServ = parseInt(estacionKmServicioChofer, 10);
      if (isNaN(kmServ) || kmServ <= 0) {
        toast({
          title: 'Kilometraje histórico inválido',
          description: 'Ingresa el kilometraje en que se realizó el cambio en taller.',
          variant: 'destructive',
        });
        return;
      }
      if (kmServ > kmTablero) {
        toast({
          title: 'Kilometraje inconsistente',
          description: `El cambio (${kmServ.toLocaleString()} km) no puede ser mayor al odómetro actual (${kmTablero.toLocaleString()} km).`,
          variant: 'destructive',
        });
        return;
      }
      kmEfectivoServicio = kmServ;
      fechaEfectiva = estacionFechaServicioChofer || today;
      esRetro = kmServ < kmTablero || fechaEfectiva < today;
    }

    // CALIBRACIÓN MECÁNICA: Asigna el últimoKm del servicio (ej: 892491) y su fecha histórica
    codigosMarcados.forEach(cod => {
      const catItem = catalogo.find(c => c.codigo === cod);
      const index = fullList.findIndex(it => it.codigo === cod);
      if (index >= 0) {
        fullList[index] = {
          ...fullList[index],
          ultimoKm: kmEfectivoServicio,
          fechaUltimo: fechaEfectiva,
          tallerMecanico: tallerCompleto,
          costoEstimado: costoPorItem > 0 ? costoPorItem : fullList[index].costoEstimado,
        };
      } else {
        fullList.push({
          id: 'mbus-' + cod + '-' + Date.now(),
          catalogoId: catItem?.id,
          codigo: cod,
          nombre: catItem?.nombre || cod,
          categoria: (catItem?.categoria as any) || 'MOTOR',
          intervaloKm: catItem?.intervaloKmOficial || 5000,
          ultimoKm: kmEfectivoServicio,
          fechaUltimo: fechaEfectiva,
          tallerMecanico: tallerCompleto,
          costoEstimado: costoPorItem,
          repuestoDetalle: catItem?.especificacionLubricanteRepuesto || '',
          asignadoChofer: true,
          activo: true,
        });
      }
    });

    localStorage.setItem(storageKey, JSON.stringify(fullList));

    // REGLA INMUTABLE: El odómetro del bus NUNCA retrocede. Solo se actualiza si el tablero actual supera kmActual
    if (kmTablero > kmActual) {
      saveBusOdometer(disco, kmTablero.toString(), 'Taller ' + config.nombre);
      setKmActual(kmTablero);
    }

    // Actualizar lista en pantalla del chofer
    setItems(fullList.filter(it => it.asignadoChofer && it.activo));

    // Registro técnico y financiero en Historial de Paradas (Soporta valor 0 y con costo)
    try {
      const paradaId = 'parada-' + Date.now();
      const expenseId = 'gasto-parada-' + Date.now();
      let paidAmount = 0;
      let pendingBalance = 0;
      let paymentMethod: PaymentMethod = 'EFECTIVO';
      let expenseStatus: 'PAGADO' | 'PENDIENTE' = 'PAGADO';
      let abonosList: PaymentAbono[] | undefined = undefined;
      let descripcionContable = '';

      if (valorTotal > 0) {
        if (pagadorChofer === 'AYUDANTE') {
          paidAmount = valorTotal;
          pendingBalance = 0;
          paymentMethod = 'EFECTIVO';
          expenseStatus = 'PAGADO';
          descripcionContable = 'Parada Técnica ' + config.nombre + ' [' + codigosMarcados.join(', ') + '] - Cubierto en Ruta por Ayudante';
        } else {
          if (socioModalidadChofer === 'TRANSFERENCIA_TOTAL') {
            paidAmount = valorTotal;
            pendingBalance = 0;
            paymentMethod = 'TRANSFERENCIA';
            expenseStatus = 'PAGADO';
            descripcionContable = 'Parada Técnica ' + config.nombre + ' [' + codigosMarcados.join(', ') + '] - Transferencia Socio 100%';
          } else if (socioModalidadChofer === 'TRANSFERENCIA_PARCIAL') {
            const abonoNum = parseFloat(socioAbonoChofer) || 0;
            paidAmount = Math.min(valorTotal, Math.max(0, abonoNum));
            pendingBalance = Math.max(0, Math.round((valorTotal - paidAmount) * 100) / 100);
            paymentMethod = 'TRANSFERENCIA';
            expenseStatus = pendingBalance <= 0 ? 'PAGADO' : 'PENDIENTE';
            descripcionContable = 'Parada Técnica ' + config.nombre + ' [' + codigosMarcados.join(', ') + '] - Anticipo Transferido ($' + paidAmount.toFixed(2) + ')';
            if (paidAmount > 0) {
              abonosList = [
                {
                  id: 'abono-' + Date.now(),
                  amount: paidAmount,
                  date: fechaEfectiva,
                  paymentMethod: 'TRANSFERENCIA',
                  comprobanteRef: estacionFacturaChofer.trim() ? 'Fac: ' + estacionFacturaChofer.trim() : undefined,
                  notes: 'Anticipo/Transferencia inicial del socio en parada técnica',
                  createdAt: new Date().toISOString(),
                },
              ];
            }
          } else if (socioModalidadChofer === 'CREDITO_FIADO') {
            paidAmount = 0;
            pendingBalance = valorTotal;
            paymentMethod = 'CREDITO_PENDIENTE';
            expenseStatus = 'PENDIENTE';
            descripcionContable = 'Parada Técnica ' + config.nombre + ' [' + codigosMarcados.join(', ') + '] - Crédito Total Fiado Taller';
          }
        }
      } else {
        descripcionContable = 'Parada Técnica ' + config.nombre + ' [' + codigosMarcados.join(', ') + '] - Mantenimiento sin costo / Garantía';
      }

      // Deducir nombres legibles de los ítems realizados
      const nombresItemsMarcados = codigosMarcados.map(cod => {
        const matched = catalogo.find(c => c.codigo === cod) || items.find(it => it.codigo === cod);
        return matched?.nombre || cod;
      });
      const detalleTextoEstacion = nombresItemsMarcados.join(', ');

      // 1. Guardar SIEMPRE en registro operativo de paradas VT (se refleja en Historial de Paradas del Chofer y Socio)
      saveParadaPago({
        id: paradaId,
        busId: activeBusId,
        disco,
        fecha: fechaEfectiva,
        estacionId: estacionSeleccionadaChofer,
        estacionNombre: config.nombre,
        taller: tallerStr,
        factura: estacionFacturaChofer.trim() || undefined,
        odometroKm: kmEfectivoServicio,
        odometroServicio: kmEfectivoServicio,
        odometroActualBus: kmTablero,
        esRetroactivo: esRetro,
        kmRodadosDesdeServicio: Math.max(0, kmTablero - kmEfectivoServicio),
        costoTotal: valorTotal,
        pagador: pagadorChofer,
        montoCubiertoAyudante: pagadorChofer === 'AYUDANTE' ? valorTotal : 0,
        descontadoEnVT: pagadorChofer === 'AYUDANTE' && fechaEfectiva < today ? true : false,
        socioModalidad: pagadorChofer === 'SOCIO' ? socioModalidadChofer : undefined,
        socioMontoTransferido: pagadorChofer === 'SOCIO' ? paidAmount : undefined,
        socioSaldoPendiente: pagadorChofer === 'SOCIO' ? pendingBalance : undefined,
        detalleTrabajo: `${config.nombre}: ${detalleTextoEstacion}`,
        itemsRealizados: nombresItemsMarcados,
        codigosMantenimiento: codigosMarcados,
        ownerExpenseId: expenseId,
        createdAt: new Date().toISOString(),
      });

      // 2. Sincronizar en Base de Datos Central (soporta tanto costo > 0 como costo $0 de garantía)
      // BLINDAJE CONTABLE EXPERTO: Si el pagador fue el ayudante y la fecha es anterior a hoy,
      // esos valores YA fueron liquidados y pagados en ruta por el ayudante ese día histórico.
      // Por ende, NO se crea un nuevo gasto deducible al socio para evitar duplicar el cobro.
      const esFechaAnteriorAyudante = pagadorChofer === 'AYUDANTE' && fechaEfectiva < today;

      if (!esFechaAnteriorAyudante) {
        saveOwnerExpenseToApi({
          id: expenseId,
          busId: activeBusId,
          category: getCategoriaContablePorEstacion(estacionSeleccionadaChofer) as any,
          totalAmount: valorTotal,
          paidAmount,
          pendingBalance,
          paymentMethod,
          status: expenseStatus,
          expenseDate: fechaEfectiva,
          description: descripcionContable,
          provider: tallerStr,
          comprobanteRef: estacionFacturaChofer.trim() ? 'Fac: ' + estacionFacturaChofer.trim() : undefined,
          abonos: abonosList,
          createdAt: new Date().toISOString(),
        }).then(res => {
          if (res.syncedToCloud) {
            toast({
              title: '☁️ Sincronizado en Base de Datos Central',
              description: `El mantenimiento en ${config.nombre} ha sido guardado exitosamente en la nube de RutaGo.`,
            });
          } else {
            toast({
              title: '📡 Guardado Local (Sin Conexión)',
              description: `Sin internet al asentar. La información está segura en el teléfono y se sincronizará a la base de datos automáticamente al recuperar la señal.`,
            });
          }
        }).catch(() => {
          toast({
            title: '📡 Guardado Local (Sin Conexión)',
            description: `Guardado localmente. Se sincronizará a la base de datos central cuando haya conexión estable.`,
          });
        });
      }
    } catch (err) {
      console.error('Error registrando parada técnica:', err);
    }
    if (esRetro) {
      const rodados = Math.max(0, kmTablero - kmEfectivoServicio);
      toast({
        title: '⚡ Servicio Histórico Regularizado',
        description: `${codigosMarcados.length} componentes calibrados a ${kmEfectivoServicio.toLocaleString()} km (hace ${rodados.toLocaleString()} km rodados). Tablero se mantiene en ${kmTablero.toLocaleString()} km.`,
      });
    } else {
      toast({
        title: '⚡ Parada de Taller Asentada',
        description: `${codigosMarcados.length} componentes reseteados a 0 km recorridos en ${kmTablero.toLocaleString()} km (Bus ${disco}).`,
      });
    }
    setEstacionSeleccionadaChofer(null);
  };

  // Modal de Registro Rápido de Lubricadora (Combo)
  const [isComboModalOpen, setIsComboModalOpen] = useState(false);
  const [comboKm, setComboKm] = useState<string>('');
  const [comboModoRetroactivo, setComboModoRetroactivo] = useState<boolean>(false);
  const [comboKmServicio, setComboKmServicio] = useState<string>('');
  const [comboFechaServicio, setComboFechaServicio] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [comboFacturaValor, setComboFacturaValor] = useState<string>('');
  const [comboFacturaNum, setComboFacturaNum] = useState<string>('');
  const [comboTaller, setComboTaller] = useState<string>('Lubricadora Vilcabamba');
  const [comboPagador, setComboPagador] = useState<ParadaPagador>('AYUDANTE');
  const [comboSocioModalidad, setComboSocioModalidad] = useState<SocioModalidadPago>('TRANSFERENCIA_TOTAL');
  const [comboSocioAbono, setComboSocioAbono] = useState<string>('');
  const [comboChecks, setComboChecks] = useState({
    aceite: true,
    filtroAceite: true,
    trampaAgua: true,
    filtroCombustible: true,
    filtroAireSecundario: false, // Desmarcado por defecto según indicación del usuario
    filtroAirePrimario: false,   // Desmarcado por defecto según indicación del usuario
  });

  const handleAbrirComboLubricadora = () => {
    setComboKm(kmActual.toString());
    setComboModoRetroactivo(false);
    setComboKmServicio(kmActual.toString());
    setComboFechaServicio(new Date().toISOString().split('T')[0]);
    setComboFacturaValor('');
    setComboFacturaNum('');
    setComboTaller('Lubricadora Vilcabamba');
    setComboPagador('AYUDANTE');
    setComboSocioModalidad('TRANSFERENCIA_TOTAL');
    setComboSocioAbono('');
    setComboChecks({
      aceite: true,
      filtroAceite: true,
      trampaAgua: true,
      filtroCombustible: true,
      filtroAireSecundario: false,
      filtroAirePrimario: false,
    });
    setIsComboModalOpen(true);
  };

  const comboConfigItems = [
    {
      key: 'aceite' as const,
      codigo: 'MNT-ACEITE-MOT',
      icono: '🛢️',
      nombre: 'Aceite de Motor (Fluido / Galones)',
      detalle: 'Recambio de aceite multigrado SAE 15W-40',
      esFiltroAire: false,
    },
    {
      key: 'filtroAceite' as const,
      codigo: 'MNT-FILT-ACEITE',
      icono: '🔘',
      nombre: 'Filtro de Aceite de Motor',
      detalle: 'Elemento de flujo pleno (C1314 / C5002)',
      esFiltroAire: false,
    },
    {
      key: 'trampaAgua' as const,
      codigo: 'MNT-FILT-TRAMPA',
      icono: '⛽',
      nombre: 'Filtro Separador / Trampa Combustible',
      detalle: 'Cartucho trampa de agua con purga (SF1307)',
      esFiltroAire: false,
    },
    {
      key: 'filtroCombustible' as const,
      codigo: 'MNT-FILT-DIESEL-SEC',
      icono: '⛽',
      nombre: 'Filtro de Combustible (Secundario)',
      detalle: 'Filtro diésel fino de micras (EF1802)',
      esFiltroAire: false,
    },
    {
      key: 'filtroAireSecundario' as const,
      codigo: 'MNT-FILT-AIRE-SEC',
      icono: '💨',
      nombre: 'Filtro Aire Pequeño',
      detalle: 'Cartucho interior de seguridad (~20,000 km / cada 4 cambios)',
      esFiltroAire: true,
    },
    {
      key: 'filtroAirePrimario' as const,
      codigo: 'MNT-FILT-AIRE-GRANDE',
      icono: '💨',
      nombre: 'Filtro Aire Grande',
      detalle: 'Cartucho exterior cilíndrico principal (~40,000 km / cada 8 cambios)',
      esFiltroAire: true,
    },
  ];

  const handleGuardarComboLubricadora = () => {
    const km = parseInt(comboKm, 10);
    if (isNaN(km) || km <= 0) {
      toast({
        title: 'Kilometraje inválido',
        description: 'Ingresa la lectura actual que marca el tacómetro.',
        variant: 'destructive',
      });
      return;
    }

    const itemsSeleccionados = comboConfigItems.filter(ci => comboChecks[ci.key]);
    if (itemsSeleccionados.length === 0) {
      toast({
        title: 'Selecciona al menos un ítem',
        description: 'Debes marcar al menos una tarea realizada en la lubricadora.',
        variant: 'destructive',
      });
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const storageKey = `rg_mantenimientos_v2_${activeBusId}`;
    const catalogo = getCatalogoMaestroGlobal();

    let fullList: MantenimientoBusItem[] = [];
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) fullList = JSON.parse(saved);
    } catch {}

    const tallerStr = comboTaller.trim() || 'Lubricadora Vilcabamba';
    const facturaDetalle = comboFacturaNum.trim() ? `Fac: ${comboFacturaNum.trim()}` : '';
    const tallerCompleto = facturaDetalle ? `${tallerStr} (${facturaDetalle})` : tallerStr;

    const valorFactura = parseFloat(comboFacturaValor) || 0;
    const costoPorItem = valorFactura > 0 ? Math.round((valorFactura / itemsSeleccionados.length) * 100) / 100 : 0;

    const kmTablero = km;
    let kmEfectivoServicio = kmTablero;
    let fechaEfectiva = today;
    let esRetro = false;

    if (comboModoRetroactivo) {
      const kmServ = parseInt(comboKmServicio, 10);
      if (isNaN(kmServ) || kmServ <= 0) {
        toast({
          title: 'Kilometraje histórico inválido',
          description: 'Ingresa el kilometraje en que se realizó el cambio en lubricadora.',
          variant: 'destructive',
        });
        return;
      }
      if (kmServ > kmTablero) {
        toast({
          title: 'Kilometraje inconsistente',
          description: `El cambio (${kmServ.toLocaleString()} km) no puede ser mayor al odómetro actual (${kmTablero.toLocaleString()} km).`,
          variant: 'destructive',
        });
        return;
      }
      kmEfectivoServicio = kmServ;
      fechaEfectiva = comboFechaServicio || today;
      esRetro = kmServ < kmTablero || fechaEfectiva < today;
    }

    itemsSeleccionados.forEach(ci => {
      const index = fullList.findIndex(
        it =>
          it.codigo === ci.codigo ||
          it.nombre.toLowerCase().includes(ci.nombre.toLowerCase()) ||
          (ci.key === 'aceite' && (it.nombre.toLowerCase().includes('aceite') && !it.nombre.toLowerCase().includes('filtro'))) ||
          (ci.key === 'filtroAceite' && it.nombre.toLowerCase().includes('filtro') && it.nombre.toLowerCase().includes('aceite')) ||
          (ci.key === 'trampaAgua' && (it.nombre.toLowerCase().includes('trampa') || it.nombre.toLowerCase().includes('separador'))) ||
          (ci.key === 'filtroCombustible' && it.nombre.toLowerCase().includes('combustible') && it.nombre.toLowerCase().includes('secundario')) ||
          (ci.key === 'filtroAireSecundario' && (it.nombre.toLowerCase().includes('aire pequeño') || it.nombre.toLowerCase().includes('aire secundario'))) ||
          (ci.key === 'filtroAirePrimario' && (it.nombre.toLowerCase().includes('aire grande') || it.nombre.toLowerCase().includes('admisión principal')))
      );

      if (index >= 0) {
        fullList[index] = {
          ...fullList[index],
          ultimoKm: kmEfectivoServicio,
          fechaUltimo: fechaEfectiva,
          tallerMecanico: tallerCompleto,
          costoEstimado: costoPorItem > 0 ? costoPorItem : fullList[index].costoEstimado,
        };
      } else {
        const catItem =
          catalogo.find(c => c.codigo === ci.codigo) ||
          catalogo.find(c => c.nombre.toLowerCase().includes(ci.nombre.toLowerCase()));
        fullList.push({
          id: `mbus-${ci.codigo}-${Date.now()}`,
          catalogoId: catItem?.id,
          codigo: ci.codigo,
          nombre: ci.nombre,
          categoria: (catItem?.categoria as any) || (ci.esFiltroAire ? 'SISTEMA_AIRE' : 'SISTEMA_COMBUSTIBLE'),
          intervaloKm:
            catItem?.intervaloKmOficial ||
            (ci.key === 'filtroAirePrimario' ? 40000 : ci.key === 'filtroAireSecundario' ? 20000 : 5000),
          ultimoKm: kmEfectivoServicio,
          fechaUltimo: fechaEfectiva,
          tallerMecanico: tallerCompleto,
          costoEstimado: costoPorItem,
          repuestoDetalle: catItem?.especificacionLubricanteRepuesto || ci.detalle,
          asignadoChofer: true,
          activo: true,
        });
      }
    });

    localStorage.setItem(storageKey, JSON.stringify(fullList));

    // REGLA INMUTABLE: El odómetro del bus NUNCA retrocede. Solo se actualiza si el tablero actual supera kmActual
    if (kmTablero > kmActual) {
      saveBusOdometer(disco, kmTablero.toString(), 'Lubricadora Combo');
      setKmActual(kmTablero);
    }

    // Actualizar lista local del widget
    setItems(fullList.filter(it => it.asignadoChofer && it.activo));

    // Registro técnico y financiero en Historial de Paradas (Soporta valor 0 y con costo)
    try {
      const paradaId = `parada-lubricadora-${Date.now()}`;
      const expenseId = `gasto-lubricadora-${Date.now()}`;
      let paidAmount = valorFactura;
      let pendingBalance = 0;
      let paymentMethod: PaymentMethod = 'EFECTIVO';
      let expenseStatus: 'PAGADO' | 'PENDIENTE' = 'PAGADO';
      let abonosList: any[] = [];

      if (valorFactura > 0) {
        if (comboPagador === 'AYUDANTE') {
          paidAmount = valorFactura;
          pendingBalance = 0;
          paymentMethod = 'EFECTIVO';
          expenseStatus = 'PAGADO';
        } else {
          paymentMethod = 'TRANSFERENCIA';
          if (comboSocioModalidad === 'TRANSFERENCIA_TOTAL') {
            paidAmount = valorFactura;
            pendingBalance = 0;
            expenseStatus = 'PAGADO';
          } else if (comboSocioModalidad === 'CREDITO_FIADO') {
            paidAmount = 0;
            pendingBalance = valorFactura;
            paymentMethod = 'CREDITO_PENDIENTE';
            expenseStatus = 'PENDIENTE';
          } else if (comboSocioModalidad === 'TRANSFERENCIA_PARCIAL') {
            const abono = parseFloat(comboSocioAbono) || 0;
            paidAmount = Math.min(valorFactura, Math.max(0, abono));
            pendingBalance = Math.max(0, valorFactura - paidAmount);
            paymentMethod = 'TRANSFERENCIA';
            expenseStatus = pendingBalance <= 0 ? 'PAGADO' : 'PENDIENTE';

            if (paidAmount > 0) {
              abonosList.push({
                id: `abono-init-${Date.now()}`,
                amount: paidAmount,
                date: fechaEfectiva,
                paymentMethod: 'TRANSFERENCIA',
                comprobanteRef: comboFacturaNum.trim() ? `Fac: ${comboFacturaNum.trim()}` : undefined,
                notes: 'Anticipo/Transferencia inicial del socio en parada de lubricadora',
                createdAt: new Date().toISOString(),
              });
            }
          }
        }
      }

      const nombresComboRapido = itemsSeleccionados.map(i => i.nombre);
      const codigosComboRapido = itemsSeleccionados.map(i => i.codigo);

      // 1. Guardar SIEMPRE en registro operativo de paradas VT (se refleja en Historial de Paradas del Chofer y Socio)
      saveParadaPago({
        id: paradaId,
        busId: activeBusId,
        disco,
        fecha: fechaEfectiva,
        estacionId: 'LUBRICADORA',
        estacionNombre: 'Lubricadora (Combo)',
        taller: tallerStr,
        factura: comboFacturaNum.trim() || undefined,
        odometroKm: kmEfectivoServicio,
        odometroServicio: kmEfectivoServicio,
        odometroActualBus: kmTablero,
        esRetroactivo: esRetro,
        kmRodadosDesdeServicio: Math.max(0, kmTablero - kmEfectivoServicio),
        costoTotal: valorFactura,
        pagador: comboPagador,
        montoCubiertoAyudante: comboPagador === 'AYUDANTE' ? valorFactura : 0,
        descontadoEnVT: comboPagador === 'AYUDANTE' && fechaEfectiva < today ? true : false,
        socioModalidad: comboPagador === 'SOCIO' ? comboSocioModalidad : undefined,
        socioMontoTransferido: comboPagador === 'SOCIO' ? paidAmount : undefined,
        socioSaldoPendiente: comboPagador === 'SOCIO' ? pendingBalance : undefined,
        detalleTrabajo: `Lubricadora: ${nombresComboRapido.join(', ')}`,
        itemsRealizados: nombresComboRapido,
        codigosMantenimiento: codigosComboRapido,
        ownerExpenseId: expenseId,
        createdAt: new Date().toISOString(),
      });

      // 2. Sincronizar en Base de Datos Central (soporta tanto costo > 0 como costo $0 de garantía)
      // BLINDAJE CONTABLE EXPERTO: Si el pagador fue el ayudante y la fecha es anterior a hoy,
      // esos valores YA fueron liquidados y pagados en ruta por el ayudante ese día histórico.
      // Por ende, NO se crea un nuevo gasto deducible al socio para evitar duplicar el cobro.
      const esFechaAnteriorAyudante = comboPagador === 'AYUDANTE' && fechaEfectiva < today;

      if (!esFechaAnteriorAyudante) {
        const descServicio = valorFactura > 0 
          ? `Servicio Rápido Lubricadora [${itemsSeleccionados.map(i => i.nombre).join(', ')}]`
          : `Servicio Rápido Lubricadora [${itemsSeleccionados.map(i => i.nombre).join(', ')}] - Mantenimiento sin costo / Garantía`;

        saveOwnerExpenseToApi({
          id: expenseId,
          busId: activeBusId,
          category: 'ACEITES_FILTROS',
          description: descServicio,
          provider: tallerStr,
          totalAmount: valorFactura,
          paidAmount,
          pendingBalance,
          paymentMethod,
          comprobanteRef: comboFacturaNum.trim() ? `Fac: ${comboFacturaNum.trim()}` : undefined,
          status: expenseStatus,
          expenseDate: fechaEfectiva,
          abonos: abonosList,
          createdAt: new Date().toISOString(),
        }).then(res => {
          if (res.syncedToCloud) {
            toast({
              title: '☁️ Sincronizado en Base de Datos Central',
              description: 'El cambio de lubricadora y filtros ha sido guardado exitosamente en la nube de RutaGo.',
            });
          } else {
            toast({
              title: '📡 Guardado Local (Sin Conexión)',
              description: 'Sin internet al asentar. La información está segura en el teléfono y se sincronizará a la base de datos automáticamente al recuperar la señal.',
            });
          }
        }).catch(() => {
          toast({
            title: '📡 Guardado Local (Sin Conexión)',
            description: 'Guardado localmente. Se sincronizará a la base de datos central cuando haya conexión estable.',
          });
        });
      }
    } catch (err) {
      console.error('Error registrando servicio de lubricadora:', err);
    }
    if (esRetro) {
      const rodados = Math.max(0, kmTablero - kmEfectivoServicio);
      const restantes = Math.max(0, 5000 - rodados);
      toast({
        title: '⚡ Lubricadora Regularizada',
        description: `${itemsSeleccionados.length} componentes calibrados a ${kmEfectivoServicio.toLocaleString()} km (${restantes.toLocaleString()} km restantes). Tablero se mantiene en ${kmTablero.toLocaleString()} km.`,
      });
    } else {
      toast({
        title: '⚡ Servicio de Lubricadora Asentado',
        description: `${itemsSeleccionados.length} ítems asentados con éxito en ${kmTablero.toLocaleString()} km (Bus ${disco}).`,
      });
    }

    setIsComboModalOpen(false);
  };

  // FASE 3 (v3.60.12): Guardar Novedad / Arreglo Rápido Extraordinario Fuera de Catálogo
  const handleGuardarArregloRapido = async () => {
    const descTrim = arregloDescripcion.trim();
    if (!descTrim) {
      toast({
        title: 'Descripción requerida',
        description: 'Escribe brevemente qué arreglo o novedad se realizó (ej. Enlainar paquete delantero).',
        variant: 'destructive',
      });
      return;
    }

    const kmNum = parseInt(arregloKm || '', 10) || kmActual;
    const costoNum = Math.max(0, parseFloat(arregloCosto || '0') || 0);
    const tallerFinal = arregloTaller.trim() || 'Taller Particular';
    const facturaFinal = arregloFactura.trim();
    const today = new Date().toISOString().split('T')[0];
    const fechaFinal = arregloFecha.trim() || today;
    const esRetro = fechaFinal < today || (kmNum < kmActual);

    setArregloIsSaving(true);

    try {
      // 1. Si el tacómetro ingresado es superior al actual, avanzar odómetro del bus
      if (kmNum > kmActual) {
        saveBusOdometer(disco, kmNum.toString(), `Arreglo: ${descTrim}`);
        setKmActual(kmNum);
      }

      const paradaId = `parada-arreglo-${Date.now()}`;
      const expenseId = `gasto-arreglo-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

      let paidAmount = 0;
      let pendingBalance = 0;
      let paymentMethod: PaymentMethod = 'EFECTIVO';
      let expenseStatus: 'PAGADO' | 'PENDIENTE' = 'PAGADO';
      let abonosList: PaymentAbono[] | undefined = undefined;

      if (costoNum > 0) {
        if (arregloPagador === 'AYUDANTE') {
          paidAmount = costoNum;
          pendingBalance = 0;
          paymentMethod = 'EFECTIVO';
          expenseStatus = 'PAGADO';
        } else {
          if (arregloSocioModalidad === 'TRANSFERENCIA_TOTAL') {
            paidAmount = costoNum;
            pendingBalance = 0;
            paymentMethod = 'TRANSFERENCIA';
            expenseStatus = 'PAGADO';
          } else if (arregloSocioModalidad === 'TRANSFERENCIA_PARCIAL') {
            const abonoNum = parseFloat(arregloSocioAbono || '0') || 0;
            paidAmount = Math.min(costoNum, Math.max(0, abonoNum));
            pendingBalance = Math.max(0, Math.round((costoNum - paidAmount) * 100) / 100);
            paymentMethod = 'TRANSFERENCIA';
            expenseStatus = pendingBalance <= 0 ? 'PAGADO' : 'PENDIENTE';
            if (paidAmount > 0) {
              abonosList = [
                {
                  id: `abono-${Date.now()}`,
                  amount: paidAmount,
                  date: fechaFinal,
                  paymentMethod: 'TRANSFERENCIA',
                  comprobanteRef: facturaFinal ? `Fac: ${facturaFinal}` : undefined,
                  notes: 'Anticipo/Transferencia inicial de socio en arreglo extraordinario',
                  createdAt: new Date().toISOString(),
                },
              ];
            }
          } else {
            // CREDITO_FIADO
            paidAmount = 0;
            pendingBalance = costoNum;
            paymentMethod = 'CREDITO_PENDIENTE';
            expenseStatus = 'PENDIENTE';
          }
        }
      }

      // Blindaje Contable: Si la fecha es de días anteriores y pagó el ayudante,
      // se marca descontadoEnVT = true para NO descontarle injustamente al ayudante de hoy en su Arqueo General
      const yaDescontado = arregloPagador === 'AYUDANTE' && fechaFinal < today;

      // Guardar en el historial operativo de paradas VT (se refleja en Chofer y Socio)
      saveParadaPago({
        id: paradaId,
        busId: activeBusId,
        disco,
        fecha: fechaFinal,
        estacionId: 'ARREGLO_EXTRAORDINARIO',
        estacionNombre: 'Arreglo / Novedad Extraordinaria',
        taller: tallerFinal,
        factura: facturaFinal || undefined,
        odometroKm: kmNum,
        odometroServicio: kmNum,
        odometroActualBus: Math.max(kmActual, kmNum),
        esRetroactivo: esRetro,
        kmRodadosDesdeServicio: Math.max(0, kmActual - kmNum),
        costoTotal: costoNum,
        pagador: arregloPagador,
        montoCubiertoAyudante: arregloPagador === 'AYUDANTE' ? paidAmount : 0,
        descontadoEnVT: yaDescontado,
        socioModalidad: arregloPagador === 'SOCIO' ? arregloSocioModalidad : undefined,
        socioMontoTransferido: arregloPagador === 'SOCIO' ? paidAmount : undefined,
        socioSaldoPendiente: arregloPagador === 'SOCIO' ? pendingBalance : undefined,
        detalleTrabajo: descTrim,
        itemsRealizados: [descTrim],
        codigosMantenimiento: [],
        ownerExpenseId: expenseId,
        createdAt: new Date().toISOString(),
      });

      // Sincronizar gasto contable con la base de datos central
      // BLINDAJE CONTABLE EXPERTO: Si el pagador fue el ayudante y la fecha es anterior a hoy,
      // esos valores YA fueron liquidados y pagados en ruta por el ayudante ese día histórico.
      // Por ende, NO se crea un nuevo gasto deducible al socio para evitar duplicar el cobro.
      const esFechaAnteriorAyudante = arregloPagador === 'AYUDANTE' && fechaFinal < today;

      if (!esFechaAnteriorAyudante) {
        const descContable = costoNum > 0
          ? `Novedad / Arreglo: ${descTrim} (Km ${kmNum.toLocaleString()}) - ${tallerFinal}`
          : `Revisión / Garantía: ${descTrim} (Km ${kmNum.toLocaleString()}) - ${tallerFinal} [Sin costo]`;

        await saveOwnerExpenseToApi({
          id: expenseId,
          busId: activeBusId,
          category: 'OTROS',
          totalAmount: costoNum,
          paidAmount,
          pendingBalance,
          paymentMethod,
          status: expenseStatus,
          expenseDate: fechaFinal,
          description: descContable,
          provider: tallerFinal,
          comprobanteRef: facturaFinal ? `Fac: ${facturaFinal}` : undefined,
          abonos: abonosList,
          createdAt: new Date().toISOString(),
        });
      }

      // Refrescar historial en vivo
      setHistorialParadas(getParadasPagoByBus(activeBusId));

      toast({
        title: '✅ Arreglo Registrado con Éxito',
        description: `Se guardó "${descTrim}" (${fechaFinal}) a ${kmNum.toLocaleString()} km en el historial del bus.`,
      });

      setIsArregloModalOpen(false);
      setArregloDescripcion('');
      setArregloFecha(new Date().toISOString().split('T')[0]);
      setArregloTaller('');
      setArregloFactura('');
      setArregloCosto('');
    } catch (err) {
      console.error('Error guardando arreglo rápido:', err);
      toast({
        title: 'Error al registrar',
        description: 'Ocurrió un error guardando el arreglo. Inténtalo nuevamente.',
        variant: 'destructive',
      });
    } finally {
      setArregloIsSaving(false);
    }
  };

  const buses = getAllBuses();
  const currentBus = buses.find(b => b.id === activeBusId);
  const disco = currentBus?.numeroDisco || '01';

  // Helper de badges para categorías mecánicas
  const getCategoriaBadge = (categoria?: string) => {
    switch (categoria) {
      case 'MOTOR':
        return { label: 'Motor', icon: '🛢️', color: 'bg-amber-100 text-amber-900 border-amber-300' };
      case 'TRANSMISION':
        return { label: 'Transmisión', icon: '⚙️', color: 'bg-indigo-100 text-indigo-900 border-indigo-300' };
      case 'ADMISION_AIRE':
      case 'SISTEMA_AIRE':
        return { label: 'Aire / Admisión', icon: '💨', color: 'bg-cyan-100 text-cyan-900 border-cyan-300' };
      case 'RODAJE_SUSPENSION':
      case 'SUSPENSION':
        return { label: 'Rodaje / Chasis', icon: '🛞', color: 'bg-emerald-100 text-emerald-900 border-emerald-300' };
      case 'FRENOS_NEUMATICO':
      case 'FRENOS':
        return { label: 'Frenos', icon: '🛑', color: 'bg-rose-100 text-rose-900 border-rose-300' };
      default:
        return { label: 'General', icon: '🔧', color: 'bg-slate-100 text-slate-800 border-slate-300' };
    }
  };

  // Cálculos semafóricos con Priorización por Severidad Mecánica (Fase 1)
  const tareasCalculadas = useMemo(() => {
    const itemsFiltrados = filtroAlcance === 'CHOFER'
      ? items.filter(it => it.asignadoChofer && it.activo !== false)
      : items.filter(it => it.activo !== false);

    const list = itemsFiltrados.map(item => {
      const kmRecorridos = kmActual - item.ultimoKm;
      const kmRestantes = item.intervaloKm - kmRecorridos;
      const esVencido = kmRestantes <= 0;
      const esUrgente = kmRestantes > 0 && kmRestantes <= 800;
      const porcentaje = Math.min(100, Math.max(0, (kmRecorridos / item.intervaloKm) * 100));

      return {
        ...item,
        kmRecorridos,
        kmRestantes,
        esVencido,
        esUrgente,
        porcentaje,
      };
    });

    // PRIORIZACIÓN INTELIGENTE POR SEVERIDAD MECÁNICA:
    // 1º Vencidos (esVencido === true), con mayor km excedido primero
    // 2º Próximos / Urgentes (esUrgente === true), con menor km restante primero
    // 3º En Regla, con menor km restante primero (lo que está más próximo a vencer primero)
    return list.sort((a, b) => {
      // Prioridad 1: Vencidos primero
      if (a.esVencido && !b.esVencido) return -1;
      if (!a.esVencido && b.esVencido) return 1;

      // Si ambos están vencidos: el más excedido (menor kmRestantes negativo) va primero
      if (a.esVencido && b.esVencido) {
        return a.kmRestantes - b.kmRestantes;
      }

      // Prioridad 2: Urgentes (≤ 800 km)
      if (a.esUrgente && !b.esUrgente) return -1;
      if (!a.esUrgente && b.esUrgente) return 1;

      // Prioridad 3: En regla: el que tiene MENOR km restante va primero
      return a.kmRestantes - b.kmRestantes;
    });
  }, [items, kmActual, filtroAlcance]);

  const criticosCount = useMemo(() => {
    return items.filter(it => {
      const kmRecorridos = kmActual - it.ultimoKm;
      return (it.intervaloKm - kmRecorridos) <= 0 && it.activo !== false;
    }).length;
  }, [items, kmActual]);

  const proximosCount = useMemo(() => {
    return items.filter(it => {
      const kmRecorridos = kmActual - it.ultimoKm;
      const rest = it.intervaloKm - kmRecorridos;
      return rest > 0 && rest <= 800 && it.activo !== false;
    }).length;
  }, [items, kmActual]);

  const countChofer = useMemo(() => items.filter(it => it.asignadoChofer && it.activo !== false).length, [items]);
  const countTodos = useMemo(() => items.filter(it => it.activo !== false).length, [items]);

  // FASE 2 y 3: Filtrado Offline en memoria del Historial de Paradas con Pagador
  const paradasFiltradas = useMemo(() => {
    let list = filtrarParadasPagoOffline(historialParadas, busquedaHistorial, filtroEstacionHistorial);
    if (filtroPagadorHistorial === 'AYUDANTE') {
      list = list.filter(p => p.pagador === 'AYUDANTE');
    } else if (filtroPagadorHistorial === 'SOCIO') {
      list = list.filter(p => p.pagador !== 'AYUDANTE');
    }
    return list;
  }, [historialParadas, busquedaHistorial, filtroEstacionHistorial, filtroPagadorHistorial]);

  // FASE 3: Resumen Ejecutivo del Historial para la Zona del Pulgar
  const resumenHistorial = useMemo(() => {
    let totalInvertido = 0;
    let pagadoAyudante = 0;
    let pagadoSocio = 0;
    let countAyudante = 0;
    let countSocio = 0;

    historialParadas.forEach(p => {
      const costo = p.costoTotal || 0;
      totalInvertido += costo;
      if (p.pagador === 'AYUDANTE') {
        pagadoAyudante += costo;
        countAyudante++;
      } else {
        pagadoSocio += costo;
        countSocio++;
      }
    });

    return {
      totalServicios: historialParadas.length,
      totalInvertido,
      pagadoAyudante,
      pagadoSocio,
      countAyudante,
      countSocio,
    };
  }, [historialParadas]);

  // Si el módulo está apagado por el socio, no renderizar nada
  if (!getBusModuloMantenimientoActivo(activeBusId) || items.length === 0) return null;

  return (
    <Card className="rounded-2xl border-2 border-amber-300/80 bg-gradient-to-br from-amber-50/50 via-white to-amber-50/20 shadow-xs overflow-hidden">
      <CardContent className="p-3.5 space-y-3">
        {/* Cabecera del Widget */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shadow-xs">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-xs text-slate-900 uppercase tracking-tight">
                  Mantenimientos a Realizar (Conductor)
                </span>
                <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-[9px] px-1.5 py-0 font-extrabold">
                  Bus {disco}
                </Badge>
              </div>
              <p className="text-[10px] text-slate-500 font-medium">
                Tacómetro actual: <strong className="text-slate-800">{(kmActual ?? 187420).toLocaleString()} km</strong> • Alimentado del arqueo de llegada
              </p>
            </div>
          </div>

          {criticosCount > 0 ? (
            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-600 text-white flex items-center gap-1 animate-pulse">
              <AlertTriangle className="w-3 h-3" /> {criticosCount} Urgentes
            </span>
          ) : proximosCount > 0 ? (
            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 flex items-center gap-1">
              <Clock className="w-3 h-3" /> {proximosCount} Próximos
            </span>
          ) : (
            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Al Día
            </span>
          )}
        </div>

        {/* PARADAS DE TALLER Y OPERACIONES EN RUTA - REDISEÑO BASADO EN CARDS CON CÓDIGO DE COLOR */}
        <div className="space-y-2.5">
          {/* CARD 1: OPERACIONES RÁPIDAS EN RUTA (VERDE ESMERALDA) */}
          <Card className="bg-slate-900 border-emerald-500/35 shadow-md overflow-hidden py-0 gap-0 text-white">
            <div className="p-3 bg-gradient-to-r from-emerald-950/50 via-slate-900 to-slate-900 border-b border-emerald-500/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-lg bg-emerald-500 text-slate-950 flex items-center justify-center shadow-xs">
                  <Zap className="w-3.5 h-3.5 fill-slate-950" />
                </span>
                <div>
                  <span className="text-xs font-black uppercase tracking-tight text-emerald-400 block leading-tight">
                    Paradas en Ruta (Servicios Rápidos)
                  </span>
                  <span className="text-[10px] text-slate-300 font-medium block leading-tight">
                    Combos frecuentes durante el turno y carretera
                  </span>
                </div>
              </div>
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[9px] font-bold shrink-0">
                🟢 En Ruta
              </Badge>
            </div>

            <CardContent className="p-2.5">
              <div className="grid grid-cols-2 gap-2">
                {/* Combo 1: Lubricadora Rápida */}
                <button
                  type="button"
                  onClick={() => handleAbrirEstacionChofer('LUBRICADORA')}
                  className="group flex flex-col justify-between p-2.5 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/60 active:scale-[0.98] border border-emerald-500/40 hover:border-emerald-400 text-left transition-all cursor-pointer shadow-xs min-h-[72px]"
                >
                  <div className="flex items-start justify-between w-full gap-1">
                    <span className="text-2xl p-1 rounded-lg bg-emerald-500/20 text-emerald-300 group-hover:scale-105 transition-transform">
                      🛢️
                    </span>
                    <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md bg-emerald-400 text-slate-950 shadow-2xs">
                      1 Toque ⚡
                    </span>
                  </div>
                  <div className="mt-1">
                    <span className="text-xs font-black text-white group-hover:text-emerald-200 transition-colors block leading-tight">
                      Lubricadora Rápida
                    </span>
                    <span className="text-[10px] text-emerald-300/80 font-medium block truncate leading-tight mt-0.5">
                      Aceite + 4 Filtros
                    </span>
                  </div>
                </button>

                {/* Combo 2: Arreglo Rápido */}
                <button
                  type="button"
                  onClick={() => {
                    setArregloDescripcion('');
                    setArregloKm(kmActual.toString());
                    setArregloTaller('');
                    setArregloFactura('');
                    setArregloCosto('');
                    setArregloPagador('AYUDANTE');
                    setArregloSocioModalidad('TRANSFERENCIA_TOTAL');
                    setArregloSocioAbono('');
                    setArregloFecha(new Date().toISOString().split('T')[0]);
                    setIsArregloModalOpen(true);
                  }}
                  className="group flex flex-col justify-between p-2.5 rounded-xl bg-emerald-950/30 hover:bg-emerald-900/50 active:scale-[0.98] border border-emerald-500/30 hover:border-emerald-400 text-left transition-all cursor-pointer shadow-xs min-h-[72px]"
                  title="Registrar un trabajo puntual fuera de catálogo (enlainar paquetes, soldaduras, arreglos rápidos)"
                >
                  <div className="flex items-start justify-between w-full gap-1">
                    <span className="text-2xl p-1 rounded-lg bg-orange-500/20 text-orange-300 group-hover:scale-105 transition-transform">
                      🔧
                    </span>
                    <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md bg-orange-400/90 text-slate-950 shadow-2xs">
                      Imprevisto
                    </span>
                  </div>
                  <div className="mt-1">
                    <span className="text-xs font-black text-white group-hover:text-orange-200 transition-colors block leading-tight">
                      Arreglo Rápido
                    </span>
                    <span className="text-[10px] text-slate-300 font-medium block truncate leading-tight mt-0.5">
                      Soldaduras, mangueras...
                    </span>
                  </div>
                </button>
              </div>
            </CardContent>
          </Card>

          {/* CARD 2: TALLERES ESPECIALIZADOS Y SERVITECAS (AZUL CYAN) */}
          <Card className="bg-slate-900 border-blue-500/35 shadow-md overflow-hidden py-0 gap-0 text-white">
            <div className="p-3 bg-gradient-to-r from-blue-950/50 via-slate-900 to-slate-900 border-b border-blue-500/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-lg bg-blue-500 text-white flex items-center justify-center shadow-xs">
                  <Wrench className="w-3.5 h-3.5" />
                </span>
                <div>
                  <span className="text-xs font-black uppercase tracking-tight text-blue-400 block leading-tight">
                    Talleres Especializados (Por Receta)
                  </span>
                  <span className="text-[10px] text-slate-300 font-medium block leading-tight">
                    Catálogo oficial Hino AK y configuración del socio
                  </span>
                </div>
              </div>
              <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/40 text-[9px] font-bold shrink-0">
                🔵 Taller
              </Badge>
            </div>

            <CardContent className="p-2.5 space-y-2.5">
              {/* Grid Responsive Consistente (3 cols en móvil, 6 en desktop) */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {(['LUBRICADORA', 'FRENOS_RUEDAS', 'MNT_MAYOR', 'ADMISION_AIRE', 'ALINEACION', 'RADIADOR'] as EstacionServicioId[]).map(estId => {
                  const est = ESTACIONES_SERVICIO_CONFIG[estId];
                  const comboUnidad = getComboUnidad(activeBusId, estId);
                  const nombresCortos: Record<EstacionServicioId, string> = {
                    LUBRICADORA: 'Fosa / Aceite',
                    FRENOS_RUEDAS: 'Frenos / Ruedas',
                    MNT_MAYOR: 'Mantenim. Mayor',
                    ADMISION_AIRE: 'Admisión / Aire',
                    ALINEACION: 'Serviteca / Llantas',
                    RADIADOR: 'Radiador / Coolant',
                  };
                  return (
                    <button
                      key={estId}
                      type="button"
                      onClick={() => handleAbrirEstacionChofer(estId)}
                      className="flex flex-col items-center justify-center p-2 rounded-xl bg-blue-950/30 hover:bg-blue-900/50 active:scale-95 border border-blue-500/25 hover:border-blue-400/50 transition-all cursor-pointer text-center group min-h-[74px]"
                    >
                      <span className="text-xl mb-1 group-hover:scale-110 transition-transform">
                        {est.icono}
                      </span>
                      <span className="text-[10px] font-black text-slate-100 group-hover:text-blue-200 leading-tight truncate w-full">
                        {nombresCortos[estId] || est.nombre.split(' ')[0]}
                      </span>
                      <span className="text-[8px] text-blue-300 font-bold mt-0.5">
                        {comboUnidad.items.length} ítems
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Barra de Historial Operativo y Sincronización en la Nube */}
              <div className="pt-2 border-t border-blue-500/20 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-[10px] text-slate-300 font-medium min-w-0">
                  <div className="flex items-center gap-1 truncate">
                    <History className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    <span>
                      {historialParadas.length === 0
                        ? 'Sin servicios'
                        : `${historialParadas.length} en historial`}
                    </span>
                  </div>
                  {outboxCount > 0 ? (
                    <button
                      type="button"
                      onClick={ejecutarSincronizacionManual}
                      className="flex items-center gap-1 text-[9px] font-black bg-amber-400 hover:bg-amber-300 text-slate-950 px-1.5 py-0.5 rounded-md animate-pulse cursor-pointer shadow-xs"
                      title="Toca para subir a la base de datos ahora"
                    >
                      <RefreshCw className="w-3 h-3 animate-spin" /> {outboxCount} subir
                    </button>
                  ) : (
                    <span className="hidden sm:inline-flex items-center gap-0.5 text-[8px] text-emerald-400 font-semibold opacity-80">
                      ● BD activa
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Botón Sincronizar Bidireccional */}
                  <button
                    type="button"
                    onClick={ejecutarSincronizacionManual}
                    disabled={isSyncingManual}
                    className="px-2 py-1 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-slate-200 hover:text-white text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer border border-white/15 disabled:opacity-50"
                    title="Sincronizar con la Base de Datos central en la nube"
                  >
                    <RefreshCw className={`w-3 h-3 text-cyan-300 ${isSyncingManual ? 'animate-spin text-amber-400' : ''}`} />
                    <span className="hidden xs:inline">{isSyncingManual ? 'Sincronizando...' : 'Sincronizar'}</span>
                  </button>

                  {/* Botón Ver Historial */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsHistorialModalOpen(true);
                      ejecutarSincronizacionManual();
                    }}
                    className="px-2.5 py-1 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 active:scale-95 text-blue-300 hover:text-blue-200 text-[10px] font-black transition-all flex items-center gap-1 cursor-pointer border border-blue-400/30"
                  >
                    <History className="w-3 h-3" />
                    <span>Ver Historial ({historialParadas.length})</span>
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* FASE 1: Selector de Alcance en 1 Toque (Mis Tareas vs Todo el Bus) */}
        <div className="flex items-center justify-between gap-2 pt-0.5">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-xl border border-slate-200/80 w-full shadow-inner">
            <button
              type="button"
              onClick={() => setFiltroAlcance('CHOFER')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                filtroAlcance === 'CHOFER'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5 shrink-0" />
              <span>Mis Tareas ({countChofer})</span>
            </button>

            <button
              type="button"
              onClick={() => setFiltroAlcance('TODOS')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                filtroAlcance === 'TODOS'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <Wrench className="w-3.5 h-3.5 shrink-0" />
              <span>Todo el Bus ({countTodos})</span>
            </button>
          </div>
        </div>

        {/* Lista de tareas tipo semáforo (Priorizada por severidad mecánica) */}
        <div className="space-y-2">
          {tareasCalculadas.length === 0 ? (
            <div className="text-center py-6 px-4 bg-slate-50/80 rounded-xl border border-dashed border-slate-300">
              <p className="text-xs font-bold text-slate-600">No hay tareas pendientes en este filtro</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Todos los componentes se encuentran calibrados y al día.</p>
            </div>
          ) : (
            tareasCalculadas.map(tarea => {
              const catBadge = getCategoriaBadge(tarea.categoria);
              return (
                <div
                  key={tarea.id}
                  className={`p-2.5 rounded-xl border transition-all ${
                    tarea.esVencido
                      ? 'bg-rose-50/80 border-rose-300 shadow-xs'
                      : tarea.esUrgente
                      ? 'bg-amber-50/60 border-amber-300'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Semáforo visual táctil */}
                        <span
                          className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                            tarea.esVencido
                              ? 'bg-rose-600 animate-ping'
                              : tarea.esUrgente
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                        />
                        <h5 className="font-black text-xs text-slate-900 truncate">
                          {tarea.nombre}
                        </h5>
                        <span className={`text-[9px] font-black px-1.5 py-0.2 rounded-md border flex items-center gap-0.5 ${catBadge.color}`}>
                          <span>{catBadge.icon}</span>
                          <span>{catBadge.label}</span>
                        </span>
                        {!tarea.asignadoChofer && (
                          <span className="text-[9px] font-black px-1.5 py-0.2 rounded-md bg-slate-100 text-slate-600 border border-slate-300">
                            🛠️ Taller/Socio
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 pl-4 mt-0.5">
                        {tarea.esVencido ? (
                          <span className="text-rose-700 font-black">
                            ¡VENCIDO! Excedido por {Math.abs(tarea.kmRestantes).toLocaleString()} km
                          </span>
                        ) : tarea.esUrgente ? (
                          <span className="text-amber-800 font-black">
                            ⚠️ Urgente en ruta • Faltan {tarea.kmRestantes.toLocaleString()} km (de {tarea.intervaloKm.toLocaleString()} km)
                          </span>
                        ) : (
                          <span>
                            Faltan <strong className="text-slate-800">{tarea.kmRestantes.toLocaleString()} km</strong> (de {tarea.intervaloKm.toLocaleString()} km)
                          </span>
                        )}
                      </p>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setModalItem(tarea);
                        setRegistroKm(kmActual.toString());
                        setRegistroFecha(new Date().toISOString().split('T')[0]);
                        setRegistroCosto(tarea.costoEstimado ? tarea.costoEstimado.toString() : '');
                        setRegistroTaller(tarea.tallerMecanico || '');
                      }}
                      className={`h-7 px-2 text-[10px] font-black rounded-lg shrink-0 border cursor-pointer ${
                        tarea.esVencido
                          ? 'bg-rose-600 text-white border-rose-600 hover:bg-rose-700'
                          : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      <RotateCcw className="w-3 h-3 mr-1" />
                      Realizado
                    </Button>
                  </div>

                  {/* Micro barra de progreso */}
                  <div className="w-full h-1.5 rounded-full bg-gray-100 overflow-hidden mt-2">
                    <div
                      className={`h-full rounded-full ${
                        tarea.esVencido
                          ? 'bg-rose-600'
                          : tarea.esUrgente
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${tarea.porcentaje}%` }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {onVerMas && (
          <div className="pt-1 flex justify-end">
            <button
              type="button"
              onClick={onVerMas}
              className="text-[11px] font-bold text-amber-900 hover:text-amber-950 flex items-center gap-1"
            >
              Ver ficha completa del Socio <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </CardContent>

      {/* Modal táctil rápido para el Chofer */}
      {modalItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full max-w-sm bg-white rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="border-b pb-2">
              <div className="flex items-center gap-2">
                <Badge className="bg-amber-500 text-slate-950 text-[10px] font-black">
                  Chofer Bus {disco}
                </Badge>
                <h4 className="font-black text-sm text-slate-900">Registrar Mantenimiento</h4>
              </div>
              <p className="text-xs text-slate-600 mt-1 font-bold">{modalItem.nombre}</p>
            </div>

            <div className="space-y-3">
              <div>
                <Label className="text-xs font-bold text-slate-700 block mb-1">
                  Kilometraje del Tacómetro al Cambiar *
                </Label>
                <Input
                  type="number"
                  value={registroKm}
                  onChange={e => setRegistroKm(e.target.value)}
                  className="h-11 rounded-xl text-base font-black bg-slate-50 border-slate-300"
                />
              </div>

              <div>
                <Label className="text-xs font-bold text-slate-700 block mb-1">
                  Lugar o Taller (Opcional)
                </Label>
                <Input
                  value={registroTaller}
                  onChange={e => setRegistroTaller(e.target.value)}
                  placeholder="ej. Lubricadora Vilcabamba / Mecánica Central"
                  className="h-9 rounded-xl text-xs bg-slate-50 border-slate-300"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Button
                onClick={() => setModalItem(null)}
                variant="ghost"
                className="flex-1 h-11 rounded-xl text-gray-600 font-semibold text-xs"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleGuardarRegistroChofer}
                className="flex-1 h-11 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shadow-sm"
              >
                <Save className="w-4 h-4 mr-1" />
                Asentar Servicio
              </Button>
            </div>
          </div>
        </div>
      )}

            {/* FASE 2: MODAL EJECUCIÓN DE PARADA DE TALLER DEL CHOFER (ARQUITECTURA POR CARDS DE 3 BLOQUES) */}
      {estacionSeleccionadaChofer && (() => {
        const config = ESTACIONES_SERVICIO_CONFIG[estacionSeleccionadaChofer];
        if (!config) return null;
        const totalItems = estacionItemsChofer.length;
        const totalMarcados = Object.values(estacionChecksChofer).filter(Boolean).length;
        const isRuta = estacionSeleccionadaChofer === 'LUBRICADORA';

        return (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
            <div className={`w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden border ${isRuta ? 'border-emerald-500/40' : 'border-blue-500/40'} animate-in slide-in-from-bottom duration-200`}>
              {/* CABECERA ERGONÓMICA CON CÓDIGO CROMÁTICO (Verde Ruta vs Azul Taller) */}
              <div className={`p-4 ${isRuta ? 'bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-900 border-b border-emerald-500/30' : 'bg-gradient-to-r from-blue-950 via-slate-900 to-slate-900 border-b border-blue-500/30'} text-white flex items-center justify-between shrink-0 shadow-md`}>
                <div className="flex items-center gap-2.5">
                  <div className={`w-10 h-10 rounded-2xl ${isRuta ? 'bg-emerald-500 text-slate-950' : 'bg-blue-600 text-white'} flex items-center justify-center text-xl shadow-xs font-black`}>
                    {config.icono}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="text-base font-black text-white leading-tight">
                        {config.nombre}
                      </h3>
                      <Badge className={`text-[10px] font-black border-0 ${isRuta ? 'bg-emerald-400/20 text-emerald-300' : 'bg-blue-400/20 text-blue-300'}`}>
                        {isRuta ? '🟢 EN RUTA' : '🔵 TALLER'}
                      </Badge>
                      <Badge className="bg-white/10 text-slate-200 border-0 text-[10px] font-black">
                        Bus {disco}
                      </Badge>
                    </div>
                    <p className={`text-[11px] font-medium leading-tight mt-0.5 ${isRuta ? 'text-emerald-300/80' : 'text-blue-300/80'}`}>
                      {isRuta
                        ? 'Servicio rápido en carretera • Receta oficial autorizada por el Socio'
                        : 'Taller Especializado • Receta oficial autorizada por el Socio'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEstacionSeleccionadaChofer(null)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* CONTENIDO PRINCIPAL SCROLLABLE (3 CARDS MODULARES) */}
              <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-3.5">
                {/* 🔵 CARD 1: TACÓMETRO Y FECHA (Lectura de Tablero) */}
                <div className={`p-3.5 rounded-2xl border ${isRuta ? 'bg-emerald-50/50 border-emerald-500/30' : 'bg-blue-50/50 border-blue-500/30'} shadow-2xs space-y-2.5`}>
                  <div className="flex items-center justify-between">
                    <Label className={`text-xs font-black flex items-center gap-1.5 ${isRuta ? 'text-emerald-950' : 'text-blue-950'}`}>
                      <Gauge className={`w-4 h-4 ${isRuta ? 'text-emerald-700' : 'text-blue-700'}`} />
                      Tacómetro del Tablero (Km)
                    </Label>
                    <span className={`text-[10px] font-extrabold uppercase tracking-tight px-2 py-0.5 rounded-full ${isRuta ? 'bg-emerald-200/80 text-emerald-900' : 'bg-blue-200/80 text-blue-900'}`}>
                      Lectura Obligatoria
                    </span>
                  </div>

                  <div className="relative">
                    <Input
                      type="number"
                      value={estacionKmChofer}
                      onChange={e => {
                        setEstacionKmChofer(e.target.value);
                        if (!estacionModoRetroactivoChofer) {
                          setEstacionKmServicioChofer(e.target.value);
                        }
                      }}
                      placeholder={kmActual.toString()}
                      className={`h-11 rounded-xl text-lg font-black bg-white pr-12 text-slate-900 ${isRuta ? 'border-emerald-300 focus:border-emerald-500' : 'border-blue-300 focus:border-blue-500'}`}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-extrabold text-slate-500">
                      KM
                    </span>
                  </div>

                  {/* Enlace sutil no invasivo anti-fricción */}
                  <div className="pt-0.5 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        const nuevoModo = !estacionModoRetroactivoChofer;
                        setEstacionModoRetroactivoChofer(nuevoModo);
                        if (nuevoModo && (!estacionKmServicioChofer || estacionKmServicioChofer === estacionKmChofer)) {
                          setEstacionKmServicioChofer(estacionKmChofer || kmActual.toString());
                        }
                      }}
                      className={`text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors ${isRuta ? 'text-emerald-900 hover:text-emerald-950' : 'text-blue-900 hover:text-blue-950'}`}
                    >
                      <span>⏱️ ¿Se realizó antes?</span>
                      <span className={`underline underline-offset-2 ${isRuta ? 'decoration-emerald-600' : 'decoration-blue-600'}`}>
                        {estacionModoRetroactivoChofer ? "Ocultar regularización (Hoy)" : "Toca aquí para regularizar fecha o km"}
                      </span>
                    </button>
                  </div>

                  {/* Bloque desplegable de Regularización Retroactiva */}
                  {estacionModoRetroactivoChofer && (() => {
                    const odoBus = parseInt(estacionKmChofer, 10) || kmActual;
                    const odoServicio = parseInt(estacionKmServicioChofer, 10) || 0;
                    const calculo = calcularDesgasteRegularizacion(odoBus, odoServicio, 5000);

                    return (
                      <div className={`mt-2 pt-2.5 border-t ${isRuta ? 'border-emerald-200' : 'border-blue-200'} space-y-2.5 animate-in fade-in slide-in-from-top-1 duration-200`}>
                        <div className="flex items-center justify-between">
                          <span className={`text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${isRuta ? 'text-emerald-950' : 'text-blue-950'}`}>
                            <Calendar className={`w-3 h-3 ${isRuta ? 'text-emerald-700' : 'text-blue-700'}`} /> Regularizar Servicio Anterior
                          </span>
                          <Badge className={`text-[9px] font-black ${isRuta ? 'bg-emerald-200 text-emerald-900 border-emerald-300' : 'bg-blue-200 text-blue-900 border-blue-300'}`}>
                            Cálculo en Vivo
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-[10px] font-black text-slate-700 block mb-1">
                              Km al momento del cambio *
                            </Label>
                            <Input
                              type="number"
                              value={estacionKmServicioChofer}
                              onChange={e => setEstacionKmServicioChofer(e.target.value)}
                              placeholder="ej. 892491"
                              className={`h-9 rounded-xl text-xs font-black bg-white ${isRuta ? 'border-emerald-300' : 'border-blue-300'}`}
                            />
                          </div>
                          <div>
                            <Label className="text-[10px] font-black text-slate-700 block mb-1">
                              Fecha del servicio *
                            </Label>
                            <Input
                              type="date"
                              value={estacionFechaServicioChofer}
                              onChange={e => setEstacionFechaServicioChofer(e.target.value)}
                              className={`h-9 rounded-xl text-xs font-bold bg-white ${isRuta ? 'border-emerald-300' : 'border-blue-300'}`}
                            />
                          </div>
                        </div>

                        {/* Tarjeta de Cálculo en Vivo y Candado de Seguridad */}
                        {odoServicio > 0 && (
                          <div
                            className={
                              "p-2.5 rounded-xl border text-xs leading-relaxed " +
                              (calculo.esInvalido
                                ? "bg-rose-50 border-rose-300 text-rose-900 font-bold"
                                : calculo.esVencido
                                ? "bg-amber-100 border-amber-400 text-amber-950"
                                : "bg-emerald-50 border-emerald-300 text-emerald-950")
                            }
                          >
                            {calculo.esInvalido ? (
                              <div className="flex items-start gap-1.5">
                                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                                <div>
                                  <p className="font-black text-[11px] text-rose-800">Kilometraje Inválido</p>
                                  <p className="text-[10px] text-rose-700 font-medium">{calculo.mensajeError}</p>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-1">
                                <div className="flex items-center justify-between font-black text-[11px]">
                                  <span className="flex items-center gap-1 text-emerald-800">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                    ✓ Hace {calculo.kmRodados.toLocaleString()} km
                                  </span>
                                  <span className="text-emerald-900 bg-emerald-200/80 px-2 py-0.5 rounded-full text-[10px]">
                                    Restan {calculo.kmRestantes.toLocaleString()} km ({calculo.porcentajeRestante}%)
                                  </span>
                                </div>
                                <p className="text-[10px] text-slate-600 font-medium">
                                  • El odómetro del autobús se mantendrá en <strong>{odoBus.toLocaleString()} km</strong>
                                </p>
                                {calculo.advertencia && (
                                  <p className="text-[10px] text-amber-800 font-bold mt-1">
                                    {calculo.advertencia}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  <p className={`text-[10px] font-medium leading-tight ${isRuta ? 'text-emerald-900' : 'text-blue-900'}`}>
                    {estacionModoRetroactivoChofer
                      ? "Los componentes seleccionados se calibrarán al kilometraje histórico ingresado."
                      : "Al guardar, todos los componentes marcados se resetearán inmediatamente a 0 km recorridos."}
                  </p>
                </div>

                {/* 📋 CARD 2: TAREAS Y REPUESTOS DE RECETA (Grid Responsive de Micro-Cards) */}
                <div className={`p-3.5 rounded-2xl border ${isRuta ? 'bg-slate-50/80 border-emerald-500/25' : 'bg-slate-50/80 border-blue-500/25'} shadow-2xs space-y-2.5`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <span>📋</span> Tareas de Receta ({totalMarcados} de {totalItems})
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const todos = totalMarcados === totalItems;
                        const nuevoMap: Record<string, boolean> = {};
                        estacionItemsChofer.forEach(it => {
                          nuevoMap[it.codigo] = !todos;
                        });
                        setEstacionChecksChofer(nuevoMap);
                      }}
                      className={`text-[11px] font-bold cursor-pointer transition-colors ${isRuta ? 'text-emerald-700 hover:text-emerald-900' : 'text-blue-700 hover:text-blue-900'}`}
                    >
                      {totalMarcados === totalItems ? 'Desmarcar todos' : 'Marcar todos'}
                    </button>
                  </div>

                  {/* Grid Responsive de Micro-Cards (1 col en pantallas muy estrechas, 2 cols estándar) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto p-1">
                    {estacionItemsChofer.map(it => {
                      const estaActivo = !!estacionChecksChofer[it.codigo];
                      return (
                        <div
                          key={it.codigo}
                          onClick={() => handleToggleItemChofer(it.codigo)}
                          className={`min-h-[54px] p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 select-none active:scale-[0.99] ${
                            estaActivo
                              ? isRuta
                                ? 'bg-emerald-50 border-emerald-400 text-emerald-950 ring-1 ring-emerald-400/40 shadow-2xs'
                                : 'bg-blue-50 border-blue-400 text-blue-950 ring-1 ring-blue-400/40 shadow-2xs'
                              : 'bg-white border-slate-200 text-slate-500 opacity-70 hover:opacity-100 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <div
                              className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 border transition-all ${
                                estaActivo
                                  ? isRuta
                                    ? 'bg-emerald-600 border-emerald-600 text-white'
                                    : 'bg-blue-600 border-blue-600 text-white'
                                  : 'border-slate-300 bg-white'
                              }`}
                            >
                              {estaActivo && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <span className={`text-xs font-black block truncate leading-tight ${estaActivo ? 'text-slate-900' : 'text-slate-600'}`}>
                                {it.nombre}
                              </span>
                              <span className="text-[10px] text-slate-500 block truncate leading-tight mt-0.5">
                                {it.intervaloKm.toLocaleString()} km {it.opcionalTexto ? '• ' + it.opcionalTexto : ''}
                              </span>
                            </div>
                          </div>

                          {it.preMarcado ? (
                            <Badge className={`text-[8px] py-0 px-1 font-bold shrink-0 border-0 ${isRuta ? 'bg-emerald-100 text-emerald-900' : 'bg-blue-100 text-blue-900'}`}>
                              Receta Socio
                            </Badge>
                          ) : (
                            <Badge className="bg-slate-100 text-slate-600 border-0 text-[8px] py-0 px-1 font-medium shrink-0">
                              Extra Fosa
                            </Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 🧾 CARD 3: COSTO, COMPROBANTE Y PAGADOR (Grid Simétrico) */}
                <div className={`p-3.5 rounded-2xl border ${isRuta ? 'bg-slate-50 border-emerald-500/25' : 'bg-slate-50 border-blue-500/25'} shadow-2xs space-y-3`}>
                  <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                    <Label className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <span>🧾</span>
                      Comprobante y Costo del Servicio
                    </Label>
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-200/70 px-2 py-0.5 rounded-full">
                      Opcional
                    </span>
                  </div>

                  {/* Fila 1: Inputs Simétricos 2 Columnas */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <Label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Total Factura / Nota ($)
                      </Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={estacionCostoChofer}
                        onChange={e => setEstacionCostoChofer(e.target.value)}
                        placeholder="0.00"
                        className={`h-10 rounded-xl text-xs bg-white border-slate-300 font-black shadow-2xs ${isRuta ? 'text-emerald-800 focus:border-emerald-500' : 'text-blue-800 focus:border-blue-500'}`}
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Nº Factura / Comprobante
                      </Label>
                      <Input
                        value={estacionFacturaChofer}
                        onChange={e => setEstacionFacturaChofer(e.target.value)}
                        placeholder="ej. 001-002-1458"
                        className="h-10 rounded-xl text-xs bg-white border-slate-300 shadow-2xs"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Taller / Lugar de Servicio
                    </Label>
                    <Input
                      value={estacionTallerChofer}
                      onChange={e => setEstacionTallerChofer(e.target.value)}
                      placeholder="Nombre del taller o lubricadora"
                      className="h-9 rounded-xl text-xs bg-white border-slate-300 shadow-2xs"
                    />
                  </div>

                  {/* Fila 2: Selección Simétrica de Pagador */}
                  <div className="space-y-2 pt-1 border-t border-slate-200">
                    {/* Alerta inteligente de Fecha Anterior */}
                    {(() => {
                      const today = new Date().toISOString().split('T')[0];
                      const fechaServicio = estacionModoRetroactivoChofer ? (estacionFechaServicioChofer || today) : today;
                      const esFechaAnterior = fechaServicio < today;

                      if (esFechaAnterior && pagadorChofer === 'AYUDANTE') {
                        return (
                          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-400/40 text-amber-900 text-xs flex items-start gap-2 animate-in fade-in duration-150">
                            <span className="text-base shrink-0">🛡️</span>
                            <div className="space-y-0.5">
                              <p className="font-black text-[11px] leading-tight text-amber-950">
                                Mantenimiento de fecha anterior ({fechaServicio})
                              </p>
                              <p className="text-[10px] text-amber-800 leading-tight">
                                Solo se registrarán los datos del mantenimiento porque esos valores ya los pagó el ayudante el día del mantenimiento. No se descontará en el arqueo de hoy ni se duplicará al socio.
                              </p>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}

                    <div className="flex items-center justify-between">
                      <Label className="text-[11px] font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <span>💳</span>
                        ¿Quién cubre este valor?
                      </Label>
                      {(parseFloat(estacionCostoChofer) || 0) > 0 && (
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${isRuta ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'}`}>
                          ${(parseFloat(estacionCostoChofer) || 0).toFixed(2)}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {/* Opción A: Descontar en caja del ayudante */}
                      {(() => {
                        const today = new Date().toISOString().split('T')[0];
                        const fechaServicio = estacionModoRetroactivoChofer ? (estacionFechaServicioChofer || today) : today;
                        const esFechaAnterior = fechaServicio < today;

                        return (
                          <button
                            type="button"
                            onClick={() => setPagadorChofer('AYUDANTE')}
                            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between min-h-[64px] ${
                              pagadorChofer === 'AYUDANTE'
                                ? 'bg-amber-500/15 border-amber-500 text-amber-950 font-black ring-1 ring-amber-500 shadow-2xs'
                                : 'bg-white border-slate-200 text-slate-700 font-bold hover:bg-slate-100/60'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className="font-black text-xs flex items-center gap-1">
                                <span>🚌</span> {esFechaAnterior ? 'Pagó Ayudante (Ruta)' : 'Descontar en caja ayudante'}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-500 leading-tight">
                              {esFechaAnterior
                                ? 'Solo se registrarán los datos del mantenimiento porque esos valores ya los pagó el ayudante el día del mantenimiento.'
                                : 'Se liquida en caja hoy con el arqueo del viaje.'}
                            </p>
                          </button>
                        );
                      })()}

                      {/* Opción B: Gasto directo del Socio */}
                      <button
                        type="button"
                        onClick={() => setPagadorChofer('SOCIO')}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between min-h-[64px] ${
                          pagadorChofer === 'SOCIO'
                            ? 'bg-blue-600/15 border-blue-600 text-blue-950 font-black ring-1 ring-blue-600 shadow-2xs'
                            : 'bg-white border-slate-200 text-slate-700 font-bold hover:bg-slate-100/60'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="font-black text-xs flex items-center gap-1">
                            <span>👤</span> Gasto directo del Socio
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 leading-tight">
                          Transferencia o crédito directo del dueño con sus opciones de pago.
                        </p>
                      </button>
                    </div>

                    {/* Si PAGA EL SOCIO: Modalidades Simétricas */}
                    {pagadorChofer === 'SOCIO' && (
                      <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-3 space-y-2 animate-in fade-in duration-150">
                        <Label className="text-[10px] font-black text-blue-950 uppercase tracking-wider block">
                          Modalidad acordada con el Socio:
                        </Label>

                        <div className="grid grid-cols-3 gap-1.5">
                          {/* Transfiere Todo */}
                          <button
                            type="button"
                            onClick={() => {
                              setSocioModalidadChofer('TRANSFERENCIA_TOTAL');
                              setSocioAbonoChofer('');
                            }}
                            className={`p-2 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center min-h-[52px] ${
                              socioModalidadChofer === 'TRANSFERENCIA_TOTAL'
                                ? 'bg-emerald-600 border-emerald-700 text-white font-black shadow-xs'
                                : 'bg-white border-slate-200 text-slate-700 font-bold hover:bg-slate-50'
                            }`}
                          >
                            <span className="text-[10px] uppercase block">Transfiere Todo</span>
                            <span className="text-xs font-black block mt-0.5">
                              {'$' + (parseFloat(estacionCostoChofer) || 0).toFixed(2)}
                            </span>
                          </button>

                          {/* Transfiere una Parte */}
                          <button
                            type="button"
                            onClick={() => {
                              setSocioModalidadChofer('TRANSFERENCIA_PARCIAL');
                              if (!socioAbonoChofer) {
                                const total = parseFloat(estacionCostoChofer) || 0;
                                setSocioAbonoChofer(total > 0 ? (Math.round((total / 2) * 100) / 100).toString() : '');
                              }
                            }}
                            className={`p-2 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center min-h-[52px] ${
                              socioModalidadChofer === 'TRANSFERENCIA_PARCIAL'
                                ? 'bg-amber-500 border-amber-600 text-slate-950 font-black shadow-xs'
                                : 'bg-white border-slate-200 text-slate-700 font-bold hover:bg-slate-50'
                            }`}
                          >
                            <span className="text-[10px] uppercase block">Una Parte</span>
                            <span className="text-[11px] block mt-0.5">Anticipo + Saldo</span>
                          </button>

                          {/* Saca Fiado */}
                          <button
                            type="button"
                            onClick={() => {
                              setSocioModalidadChofer('CREDITO_FIADO');
                              setSocioAbonoChofer('0');
                            }}
                            className={`p-2 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center min-h-[52px] ${
                              socioModalidadChofer === 'CREDITO_FIADO'
                                ? 'bg-rose-600 border-rose-700 text-white font-black shadow-xs'
                                : 'bg-white border-slate-200 text-slate-700 font-bold hover:bg-slate-50'
                            }`}
                          >
                            <span className="text-[10px] uppercase block">Saca Fiado</span>
                            <span className="text-xs font-black block mt-0.5">$0 Hoy</span>
                          </button>
                        </div>

                        {/* Detalle si es pago parcial */}
                        {socioModalidadChofer === 'TRANSFERENCIA_PARCIAL' && (
                          <div className="pt-2 border-t border-blue-200 space-y-1.5">
                            <div className="flex items-center gap-2">
                              <Label className="text-[10px] font-bold text-blue-950 shrink-0">
                                Monto transferido por el socio hoy ($):
                              </Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={socioAbonoChofer}
                                onChange={e => setSocioAbonoChofer(e.target.value)}
                                placeholder="0.00"
                                className="h-8 rounded-lg text-xs bg-white border-blue-300 font-black text-amber-900"
                              />
                            </div>
                            {(() => {
                              const total = parseFloat(estacionCostoChofer) || 0;
                              const abono = parseFloat(socioAbonoChofer) || 0;
                              const saldo = Math.max(0, total - abono);
                              return (
                                <div className="flex items-center justify-between text-[11px] bg-white/90 p-2 rounded-xl border border-blue-200">
                                  <span className="text-emerald-700 font-bold">Transferido: ${abono.toFixed(2)}</span>
                                  <span className="text-amber-800 font-black">Saldo Deuda Taller: ${saldo.toFixed(2)}</span>
                                </div>
                              );
                            })()}
                          </div>
                        )}

                        {socioModalidadChofer === 'TRANSFERENCIA_TOTAL' && (
                          <p className="text-[10px] text-emerald-800 bg-emerald-100/80 p-1.5 rounded-lg text-center font-bold">
                            ✓ Transferencia completa por ${(parseFloat(estacionCostoChofer) || 0).toFixed(2)}. Gasto liquidado.
                          </p>
                        )}

                        {socioModalidadChofer === 'CREDITO_FIADO' && (
                          <p className="text-[10px] text-rose-800 bg-rose-100/80 p-1.5 rounded-lg text-center font-bold">
                            ⚠️ Deuda completa por ${(parseFloat(estacionCostoChofer) || 0).toFixed(2)} asentada a crédito pendiente.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* BOTONERA FIJA AL PULGAR (Sticky Bottom Zero Fricción) */}
              <div className="shrink-0 p-3 sm:p-4 bg-white/95 backdrop-blur-xs border-t border-slate-200 flex items-center gap-2 shadow-lg">
                <Button
                  type="button"
                  onClick={() => setEstacionSeleccionadaChofer(null)}
                  variant="ghost"
                  className="h-12 px-4 rounded-xl text-slate-600 font-bold text-xs cursor-pointer hover:bg-slate-100"
                >
                  Cancelar
                </Button>

                {(() => {
                  const odoBus = parseInt(estacionKmChofer, 10) || kmActual;
                  const odoServicio = parseInt(estacionKmServicioChofer, 10) || 0;
                  const esInvalido = estacionModoRetroactivoChofer && (odoServicio > odoBus || odoServicio <= 0);
                  const calculo = estacionModoRetroactivoChofer ? calcularDesgasteRegularizacion(odoBus, odoServicio, 5000) : null;

                  return (
                    <Button
                      type="button"
                      disabled={esInvalido}
                      onClick={handleAsentarParadaChofer}
                      className={`flex-1 h-12 rounded-xl font-black text-xs shadow-md flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                        esInvalido
                          ? "bg-rose-300 text-rose-800 cursor-not-allowed"
                          : isRuta
                          ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/25"
                          : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/25"
                      }`}
                    >
                      {esInvalido ? (
                        <>
                          <AlertTriangle className="w-4 h-4 text-rose-700" />
                          Km Mayor al Tablero (Bloqueado)
                        </>
                      ) : estacionModoRetroactivoChofer && calculo && !calculo.esInvalido ? (
                        <>
                          <Save className="w-4 h-4" />
                          Calibrar a {calculo.kmRestantes.toLocaleString()} km Restantes
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          Asentar {isRuta ? 'Parada en Ruta' : 'Mantenimiento de Taller'} ({totalMarcados} tarea{totalMarcados === 1 ? '' : 's'})
                        </>
                      )}
                    </Button>
                  );
                })()}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal: REGISTRO RÁPIDO DE LUBRICADORA */}
      {isComboModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            {/* Cabecera del Modal */}
            <div className="flex items-start justify-between border-b pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-xs">
                  <Zap className="w-5 h-5 fill-slate-950" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-black text-sm text-slate-900 uppercase tracking-tight">
                      Registro Rápido de Lubricadora
                    </h3>
                    <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-[9px] px-1.5 py-0 font-extrabold">
                      Bus {disco}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Asentamiento rápido en ruta para el Chofer
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsComboModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tacómetro / Odómetro actual */}
            <div className="bg-amber-50/70 p-3 rounded-2xl border border-amber-200 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                  <Gauge className="w-3.5 h-3.5 text-amber-700" />
                  Odómetro actual del Tacómetro *
                </Label>
                <span className="text-[10px] text-amber-900 font-bold bg-amber-200/80 px-2 py-0.5 rounded-full">
                  Lectura en Tablero
                </span>
              </div>
              <div className="relative">
                <Input
                  type="number"
                  value={comboKm}
                  onChange={e => {
                    setComboKm(e.target.value);
                    if (!comboModoRetroactivo) {
                      setComboKmServicio(e.target.value);
                    }
                  }}
                  placeholder="ej. 893485"
                  className="h-11 rounded-xl text-lg font-black bg-white border-amber-300 pr-12 text-slate-900"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-extrabold text-slate-500">
                  KM
                </span>
              </div>

              {/* Enlace sutil no invasivo anti-fricción */}
              <div className="pt-0.5 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    const nuevoModo = !comboModoRetroactivo;
                    setComboModoRetroactivo(nuevoModo);
                    if (nuevoModo && (!comboKmServicio || comboKmServicio === comboKm)) {
                      setComboKmServicio(comboKm || kmActual.toString());
                    }
                  }}
                  className="text-[11px] font-bold text-amber-900 hover:text-amber-950 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <span>⏱️ ¿Se realizó antes?</span>
                  <span className="underline decoration-amber-600 underline-offset-2">
                    {comboModoRetroactivo ? "Ocultar regularización (Hoy)" : "Toca aquí para regularizar fecha o km"}
                  </span>
                </button>
              </div>

              {/* Bloque desplegable de Regularización Retroactiva */}
              {comboModoRetroactivo && (() => {
                const odoBus = parseInt(comboKm, 10) || kmActual;
                const odoServicio = parseInt(comboKmServicio, 10) || 0;
                const calculo = calcularDesgasteRegularizacion(odoBus, odoServicio, 5000);

                return (
                  <div className="mt-2 pt-2.5 border-t border-amber-300/60 space-y-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-amber-950 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-amber-700" /> Regularizar Servicio Anterior
                      </span>
                      <Badge className="bg-amber-200 text-amber-900 border-amber-300 text-[9px] font-black">
                        Cálculo en Vivo
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-[10px] font-black text-slate-700 block mb-1">
                          Km al momento del cambio *
                        </Label>
                        <Input
                          type="number"
                          value={comboKmServicio}
                          onChange={e => setComboKmServicio(e.target.value)}
                          placeholder="ej. 892491"
                          className="h-9 rounded-xl text-xs font-black bg-white border-amber-300"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] font-black text-slate-700 block mb-1">
                          Fecha del servicio *
                        </Label>
                        <Input
                          type="date"
                          value={comboFechaServicio}
                          onChange={e => setComboFechaServicio(e.target.value)}
                          className="h-9 rounded-xl text-xs font-bold bg-white border-amber-300"
                        />
                      </div>
                    </div>

                    {/* Tarjeta de Cálculo en Vivo y Candado de Seguridad */}
                    {odoServicio > 0 && (
                      <div
                        className={
                          "p-2.5 rounded-xl border text-xs leading-relaxed " +
                          (calculo.esInvalido
                            ? "bg-rose-50 border-rose-300 text-rose-900 font-bold"
                            : calculo.esVencido
                            ? "bg-amber-100 border-amber-400 text-amber-950"
                            : "bg-emerald-50 border-emerald-300 text-emerald-950")
                        }
                      >
                        {calculo.esInvalido ? (
                          <div className="flex items-start gap-1.5">
                            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                            <div>
                              <p className="font-black text-[11px] text-rose-800">Kilometraje Inválido</p>
                              <p className="text-[10px] text-rose-700 font-medium">{calculo.mensajeError}</p>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between font-black text-[11px]">
                              <span className="flex items-center gap-1 text-emerald-800">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                ✓ Hace {calculo.kmRodados.toLocaleString()} km
                              </span>
                              <span className="text-emerald-900 bg-emerald-200/80 px-2 py-0.5 rounded-full text-[10px]">
                                Restan {calculo.kmRestantes.toLocaleString()} km ({calculo.porcentajeRestante}%)
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-600 font-medium">
                              • El odómetro del autobús se mantendrá en <strong>{odoBus.toLocaleString()} km</strong>
                            </p>
                            {calculo.advertencia && (
                              <p className="text-[10px] text-amber-800 font-bold mt-1">
                                {calculo.advertencia}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
            {/* Checklist: ¿Qué se realizó en este servicio? */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-900 uppercase tracking-tight">
                  ¿Qué se realizó en este servicio?
                </span>
                <span className="text-[10px] text-slate-500 font-medium">
                  Toca para marcar/desmarcar
                </span>
              </div>

              {/* Lista de Ítems */}
              <div className="space-y-1.5">
                {comboConfigItems.map(ci => {
                  const isChecked = comboChecks[ci.key];

                  return (
                    <div key={ci.key}>
                      {/* Separador visual antes de los filtros de aire */}
                      {ci.key === 'filtroAireSecundario' && (
                        <div className="pt-2 pb-1 flex items-center justify-between">
                          <span className="text-[10px] font-black text-sky-900 uppercase tracking-wider flex items-center gap-1">
                            <Wind className="w-3 h-3 text-sky-600" /> Filtros de Aire (Opcionales)
                          </span>
                          <Badge variant="outline" className="text-[9px] text-sky-700 border-sky-300 bg-sky-50 px-1.5 py-0 font-bold">
                            Desmarcados por defecto
                          </Badge>
                        </div>
                      )}

                      <div
                        onClick={() =>
                          setComboChecks(prev => ({
                            ...prev,
                            [ci.key]: !prev[ci.key],
                          }))
                        }
                        className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2.5 select-none ${
                          isChecked
                            ? ci.esFiltroAire
                              ? 'bg-sky-50/90 border-sky-400 shadow-xs ring-1 ring-sky-300/60'
                              : 'bg-emerald-50/90 border-emerald-400 shadow-xs ring-1 ring-emerald-300/60'
                            : 'bg-slate-50/80 border-slate-200 hover:bg-slate-100/70 text-slate-500'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div
                            className={`w-6 h-6 rounded-lg flex items-center justify-center font-black text-xs shrink-0 transition-all ${
                              isChecked
                                ? ci.esFiltroAire
                                  ? 'bg-sky-600 text-white'
                                  : 'bg-emerald-600 text-white'
                                : 'bg-white border-2 border-slate-300 text-transparent'
                            }`}
                          >
                            <Check className="w-4 h-4 stroke-[3]" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs">{ci.icono}</span>
                              <h5
                                className={`text-xs font-black truncate ${
                                  isChecked
                                    ? ci.esFiltroAire
                                      ? 'text-sky-950'
                                      : 'text-emerald-950'
                                    : 'text-slate-600'
                                }`}
                              >
                                {ci.nombre}
                              </h5>
                            </div>
                            <p className="text-[10px] text-slate-500 truncate mt-0.5">
                              {ci.detalle}
                            </p>
                          </div>
                        </div>

                        <Badge
                          className={`text-[9px] px-1.5 py-0 font-bold shrink-0 ${
                            isChecked
                              ? ci.esFiltroAire
                                ? 'bg-sky-200 text-sky-900 border-sky-300'
                                : 'bg-emerald-200 text-emerald-900 border-emerald-300'
                              : 'bg-slate-200 text-slate-600 border-slate-300'
                          }`}
                        >
                          {isChecked ? 'Incluido' : 'Omitido'}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Guía explicativa para el chofer */}
              <p className="text-[10px] text-slate-500 bg-slate-100 p-2 rounded-xl leading-relaxed">
                ℹ️ <strong>Regla Operativa:</strong> Los 4 ítems estándar de lubricadora vienen
                pre-marcados. Los 2 filtros de aire están <strong>desmarcados</strong>; márcalos con un
                toque si fueron reemplazados en este servicio.
              </p>
            </div>

            {/* Datos opcionales de comprobante / costo */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-2.5 mt-2">
              <div className="flex items-center justify-between pb-1 border-b border-slate-200/80">
                <Label className="text-[11px] font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <span>🧾</span>
                  Comprobante y Costo
                </Label>
                <span className="text-[10px] font-bold text-slate-500 bg-slate-200/60 px-2 py-0.5 rounded-full">
                  Opcional
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Valor Factura ($)
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={comboFacturaValor}
                    onChange={e => setComboFacturaValor(e.target.value)}
                    placeholder="ej. 175.50"
                    className="h-9 rounded-xl text-xs bg-white border-slate-300 font-bold text-emerald-800"
                  />
                </div>
                <div>
                  <Label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Nº Factura / Nota
                  </Label>
                  <Input
                    value={comboFacturaNum}
                    onChange={e => setComboFacturaNum(e.target.value)}
                    placeholder="ej. 001-002-1458"
                    className="h-9 rounded-xl text-xs bg-white border-slate-300"
                  />
                </div>
              </div>

              <div>
                <Label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Lugar / Lubricadora
                </Label>
                <Input
                  value={comboTaller}
                  onChange={e => setComboTaller(e.target.value)}
                  placeholder="ej. Lubricadora Vilcabamba / San Pedro"
                  className="h-9 rounded-xl text-xs bg-white border-slate-300"
                />
              </div>
            </div>

            {/* Bifurcación de Pagador si hay un costo pactado en el Combo */}
            {(parseFloat(comboFacturaValor) || 0) > 0 && (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-2.5 shrink-0 animate-in fade-in duration-150">
                {/* Alerta inteligente de Fecha Anterior */}
                {(() => {
                  const today = new Date().toISOString().split('T')[0];
                  const fechaServicio = comboModoRetroactivo ? (comboFechaServicio || today) : today;
                  const esFechaAnterior = fechaServicio < today;

                  if (esFechaAnterior && comboPagador === 'AYUDANTE') {
                    return (
                      <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-400/40 text-amber-900 text-xs flex items-start gap-2 animate-in fade-in duration-150">
                        <span className="text-base shrink-0">🛡️</span>
                        <div className="space-y-0.5">
                          <p className="font-black text-[11px] leading-tight text-amber-950">
                            Mantenimiento de fecha anterior ({fechaServicio})
                          </p>
                          <p className="text-[10px] text-amber-800 leading-tight">
                            Solo se registrarán los datos del mantenimiento porque esos valores ya los pagó el ayudante el día del mantenimiento. No se descontará en el arqueo de hoy ni se duplicará al socio.
                          </p>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}

                <div className="flex items-center justify-between">
                  <Label className="text-[11px] font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <span>💳</span>
                    ¿Quién cubre este gasto de lubricadora? *
                  </Label>
                  <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                    ${(parseFloat(comboFacturaValor) || 0).toFixed(2)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {/* Opción A: Descontar en caja del ayudante */}
                  {(() => {
                    const today = new Date().toISOString().split('T')[0];
                    const fechaServicio = comboModoRetroactivo ? (comboFechaServicio || today) : today;
                    const esFechaAnterior = fechaServicio < today;

                    return (
                      <button
                        type="button"
                        onClick={() => setComboPagador('AYUDANTE')}
                        className={
                          'p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between min-h-[64px] ' +
                          (comboPagador === 'AYUDANTE'
                            ? 'bg-amber-500/15 border-amber-500 text-amber-950 font-black ring-1 ring-amber-500 shadow-xs'
                            : 'bg-white border-slate-200 text-slate-700 font-bold hover:bg-slate-100/60')
                        }
                      >
                        <div className="flex items-center gap-1.5 font-black text-xs mb-1">
                          <span>🚌</span>
                          <span>{esFechaAnterior ? 'Pagó Ayudante (Ruta)' : 'Descontar en caja ayudante'}</span>
                        </div>
                        <p className="text-[10px] text-slate-500 leading-tight">
                          {esFechaAnterior
                            ? 'Solo se registrarán los datos del mantenimiento porque esos valores ya los pagó el ayudante el día del mantenimiento.'
                            : 'Se liquida en caja hoy con el arqueo del viaje.'}
                        </p>
                      </button>
                    );
                  })()}

                  {/* Opción B: Gasto directo del Socio */}
                  <button
                    type="button"
                    onClick={() => setComboPagador('SOCIO')}
                    className={
                      'p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between min-h-[64px] ' +
                      (comboPagador === 'SOCIO'
                        ? 'bg-purple-600/15 border-purple-600 text-purple-950 font-black ring-1 ring-purple-600 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 font-bold hover:bg-slate-100/60')
                    }
                  >
                    <div className="flex items-center gap-1.5 font-black text-xs mb-1">
                      <span>👤</span>
                      <span>Gasto directo del Socio</span>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-tight">
                      Transferencia o crédito directo del dueño con sus opciones de pago.
                    </p>
                  </button>
                </div>

                {/* Si PAGA EL SOCIO: 3 Botones de 1 toque */}
                {comboPagador === 'SOCIO' && (
                  <div className="bg-purple-50/70 border border-purple-200 rounded-2xl p-3 space-y-2 animate-in fade-in duration-150">
                    <Label className="text-[10px] font-black text-purple-950 uppercase tracking-wider block">
                      Modalidad acordada con el Socio:
                    </Label>

                    <div className="grid grid-cols-3 gap-1.5">
                      {/* Botón 1: Transfiere Todo */}
                      <button
                        type="button"
                        onClick={() => {
                          setComboSocioModalidad('TRANSFERENCIA_TOTAL');
                          setComboSocioAbono('');
                        }}
                        className={
                          'p-2 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center ' +
                          (comboSocioModalidad === 'TRANSFERENCIA_TOTAL'
                            ? 'bg-emerald-600 border-emerald-700 text-white font-black shadow-xs'
                            : 'bg-white border-slate-200 text-slate-700 font-bold hover:bg-slate-50')
                        }
                      >
                        <span className="text-[10px] uppercase block">Transfiere Todo</span>
                        <span className="text-xs font-black block mt-0.5">
                          {'$' + (parseFloat(comboFacturaValor) || 0).toFixed(2)}
                        </span>
                      </button>

                      {/* Botón 2: Transfiere una Parte */}
                      <button
                        type="button"
                        onClick={() => {
                          setComboSocioModalidad('TRANSFERENCIA_PARCIAL');
                          if (!comboSocioAbono) {
                            const total = parseFloat(comboFacturaValor) || 0;
                            setComboSocioAbono(total > 0 ? (Math.round((total / 2) * 100) / 100).toString() : '');
                          }
                        }}
                        className={
                          'p-2 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center ' +
                          (comboSocioModalidad === 'TRANSFERENCIA_PARCIAL'
                            ? 'bg-amber-500 border-amber-600 text-slate-950 font-black shadow-xs'
                            : 'bg-white border-slate-200 text-slate-700 font-bold hover:bg-slate-50')
                        }
                      >
                        <span className="text-[10px] uppercase block">Una Parte</span>
                        <span className="text-[11px] block mt-0.5">Anticipo + Saldo</span>
                      </button>

                      {/* Botón 3: Saca Fiado ($0 hoy) */}
                      <button
                        type="button"
                        onClick={() => {
                          setComboSocioModalidad('CREDITO_FIADO');
                          setComboSocioAbono('0');
                        }}
                        className={
                          'p-2 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center ' +
                          (comboSocioModalidad === 'CREDITO_FIADO'
                            ? 'bg-rose-600 border-rose-700 text-white font-black shadow-xs'
                            : 'bg-white border-slate-200 text-slate-700 font-bold hover:bg-slate-50')
                        }
                      >
                        <span className="text-[10px] uppercase block">Saca Fiado</span>
                        <span className="text-xs font-black block mt-0.5">$0 Hoy (Crédito)</span>
                      </button>
                    </div>

                    {/* Detalle si es pago parcial */}
                    {comboSocioModalidad === 'TRANSFERENCIA_PARCIAL' && (
                      <div className="pt-2 border-t border-purple-200 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <Label className="text-[10px] font-bold text-purple-950 shrink-0">
                            Monto transferido por el socio hoy ($):
                          </Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={comboSocioAbono}
                            onChange={e => setComboSocioAbono(e.target.value)}
                            placeholder="0.00"
                            className="h-8 rounded-lg text-xs bg-white border-purple-300 font-black text-amber-900"
                          />
                        </div>
                        {(() => {
                          const total = parseFloat(comboFacturaValor) || 0;
                          const abono = parseFloat(comboSocioAbono) || 0;
                          const saldo = Math.max(0, total - abono);
                          return (
                            <div className="flex items-center justify-between text-[11px] bg-white/90 p-2 rounded-xl border border-purple-200">
                              <span className="text-emerald-700 font-bold">Transferido: ${abono.toFixed(2)}</span>
                              <span className="text-amber-800 font-black">Saldo Deuda Taller: ${saldo.toFixed(2)}</span>
                            </div>
                          );
                        })()}
                      </div>
                    )}

                    {comboSocioModalidad === 'TRANSFERENCIA_TOTAL' && (
                      <p className="text-[10px] text-emerald-800 bg-emerald-100/80 p-1.5 rounded-lg text-center font-bold">
                        ✓ Transferencia completa por ${(parseFloat(comboFacturaValor) || 0).toFixed(2)}. Gasto liquidado.
                      </p>
                    )}

                    {comboSocioModalidad === 'CREDITO_FIADO' && (
                      <p className="text-[10px] text-rose-800 bg-rose-100/80 p-1.5 rounded-lg text-center font-bold">
                        ⚠️ Deuda completa por ${(parseFloat(comboFacturaValor) || 0).toFixed(2)} asentada a crédito pendiente.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Botones de acción final */}
            <div className="flex items-center gap-2 pt-1">
              <Button
                type="button"
                onClick={() => setIsComboModalOpen(false)}
                variant="ghost"
                className="flex-1 h-11 rounded-xl text-gray-600 font-bold text-xs"
              >
                Cancelar
              </Button>
              {(() => {
                const odoBus = parseInt(comboKm, 10) || kmActual;
                const odoServicio = parseInt(comboKmServicio, 10) || 0;
                const esInvalido = comboModoRetroactivo && (odoServicio > odoBus || odoServicio <= 0);
                const calculo = comboModoRetroactivo ? calcularDesgasteRegularizacion(odoBus, odoServicio, 5000) : null;

                return (
                  <Button
                    type="button"
                    disabled={esInvalido}
                    onClick={handleGuardarComboLubricadora}
                    className={
                      "flex-1 h-11 rounded-xl font-black text-xs shadow-md flex items-center justify-center gap-1.5 transition-all " +
                      (esInvalido
                        ? "bg-rose-300 text-rose-800 cursor-not-allowed"
                        : "bg-amber-500 hover:bg-amber-600 text-slate-950")
                    }
                  >
                    {esInvalido ? (
                      <>
                        <AlertTriangle className="w-4 h-4 text-rose-700" />
                        Km Mayor al Tablero (Bloqueado)
                      </>
                    ) : comboModoRetroactivo && calculo && !calculo.esInvalido ? (
                      <>
                        <Save className="w-4 h-4 fill-slate-950" />
                        Calibrar a {calculo.kmRestantes.toLocaleString()} km Restantes
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 fill-slate-950" />
                        Asentar Servicio (1 Clic)
                      </>
                    )}
                  </Button>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* FASE A & 3: MODAL ERGONÓMICO DE HISTORIAL EN ZONA DEL PULGAR */}
      {/* ========================================================= */}
      {isHistorialModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl border border-slate-200 w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-200">
            {/* Tirador táctil ergonómico para smartphones */}
            <div className="w-12 h-1.5 rounded-full bg-slate-300 mx-auto mt-2.5 sm:hidden shrink-0" />

            {/* Cabecera del Historial con Sincronización a BD */}
            <div className="p-3.5 sm:p-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-900 flex items-center justify-center shrink-0">
                  <History className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3 className="font-black text-sm text-slate-900">
                      Historial de Mantenimientos
                    </h3>
                    <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-[10px] px-1.5 py-0 font-extrabold">
                      Bus {disco}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium truncate">
                    Control operativo y financiero del vehículo
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={ejecutarSincronizacionManual}
                  disabled={isSyncingManual}
                  className="h-8 px-2.5 rounded-full bg-amber-100/80 hover:bg-amber-200 text-amber-900 border border-amber-300 text-[11px] font-extrabold flex items-center gap-1.5 transition active:scale-95 cursor-pointer disabled:opacity-50 shadow-xs"
                  title="Sincronizar subida y bajada con la base de datos central"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-amber-800 ${isSyncingManual ? 'animate-spin text-amber-600' : ''}`} />
                  <span className="text-[11px]">{isSyncingManual ? 'Sincronizando...' : 'Sincronizar'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsHistorialModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* FASE 3: TARJETA DE RESUMEN EJECUTIVO (ZONA DEL PULGAR) */}
            <div className="px-3.5 pt-3 pb-2 bg-gradient-to-r from-amber-500/10 via-slate-50 to-emerald-500/10 border-b border-slate-200/80 shrink-0">
              <div className="grid grid-cols-3 gap-2">
                <div className="p-2 rounded-xl bg-white border border-slate-200 shadow-2xs text-center">
                  <span className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider">Total Gastado</span>
                  <span className="text-xs sm:text-sm font-black text-slate-900 font-mono">
                    ${resumenHistorial.totalInvertido.toFixed(2)}
                  </span>
                  <span className="text-[9px] text-slate-400 block font-medium">
                    {resumenHistorial.totalServicios} servicios
                  </span>
                </div>

                <div className="p-2 rounded-xl bg-blue-50/70 border border-blue-200 shadow-2xs text-center">
                  <span className="text-[10px] font-bold text-blue-700 block uppercase tracking-wider">En Ruta (Ayud.)</span>
                  <span className="text-xs sm:text-sm font-black text-blue-900 font-mono">
                    ${resumenHistorial.pagadoAyudante.toFixed(2)}
                  </span>
                  <span className="text-[9px] text-blue-600 block font-medium">
                    {resumenHistorial.countAyudante} paradas
                  </span>
                </div>

                <div className="p-2 rounded-xl bg-emerald-50/70 border border-emerald-200 shadow-2xs text-center">
                  <span className="text-[10px] font-bold text-emerald-700 block uppercase tracking-wider">Socio Propietario</span>
                  <span className="text-xs sm:text-sm font-black text-emerald-900 font-mono">
                    ${resumenHistorial.pagadoSocio.toFixed(2)}
                  </span>
                  <span className="text-[9px] text-emerald-600 block font-medium">
                    {resumenHistorial.countSocio} servicios
                  </span>
                </div>
              </div>

              {/* FASE 3: SELECTOR DE PAGADOR RÁPIDO (1 TOQUE CON EL PULGAR) */}
              <div className="flex items-center gap-1.5 mt-2 bg-slate-200/60 p-1 rounded-xl">
                {[
                  { id: 'TODOS', label: 'Todos', count: resumenHistorial.totalServicios },
                  { id: 'AYUDANTE', label: '🚌 Ruta (Ayudante)', count: resumenHistorial.countAyudante },
                  { id: 'SOCIO', label: '👤 Socio Propietario', count: resumenHistorial.countSocio },
                ].map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setFiltroPagadorHistorial(tab.id as any)}
                    className={`flex-1 py-1 px-2 rounded-lg text-[10px] font-black transition-all flex items-center justify-center gap-1 cursor-pointer ${
                      filtroPagadorHistorial === tab.id
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span className="opacity-70 font-mono text-[9px]">({tab.count})</span>
                  </button>
                ))}
              </div>
            </div>

            {/* FASE 2: BARRA DE BÚSQUEDA Y FILTRADO OFFLINE (ZERO LATENCY) */}
            <div className="p-3 bg-slate-50 border-b border-slate-200/80 space-y-2 shrink-0">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <Input
                  type="text"
                  value={busquedaHistorial}
                  onChange={e => setBusquedaHistorial(e.target.value)}
                  placeholder="Buscar por repuesto, aceite, taller, factura..."
                  className="pl-9 pr-8 h-9 text-xs bg-white rounded-xl border-slate-300 font-medium placeholder:text-slate-400"
                />
                {busquedaHistorial.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setBusquedaHistorial('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-slate-200 text-slate-600 hover:bg-slate-300 flex items-center justify-center text-xs cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Chips de Categorías / Estaciones de Taller */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar text-xs">
                {[
                  { id: 'TODAS', label: 'Todos', icon: '📋', count: historialParadas.length },
                  { id: 'LUBRICADORA', label: 'Aceite / Filtros', icon: '🛢️' },
                  { id: 'FRENOS', label: 'Frenos y Zapatas', icon: '🛑' },
                  { id: 'AIRE', label: 'Aire y Toberas', icon: '💨' },
                  { id: 'LLANTAS', label: 'Llantas / Alineación', icon: '🛞' },
                  { id: 'MAYOR', label: 'Taller Mayor', icon: '🛠️' },
                ].map(chip => (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => setFiltroEstacionHistorial(chip.id)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-black shrink-0 transition-all flex items-center gap-1 cursor-pointer border ${
                      filtroEstacionHistorial === chip.id
                        ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-2xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>{chip.icon}</span>
                    <span>{chip.label}</span>
                    {chip.count !== undefined && (
                      <span className="opacity-70 font-mono text-[9px]">({chip.count})</span>
                    )}
                  </button>
                ))}
              </div>

              {/* Indicador de resultados */}
              <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold px-0.5 pt-0.5">
                <span>
                  Mostrando <strong className="text-slate-900">{paradasFiltradas.length}</strong> de {historialParadas.length} servicios
                </span>
                <span className="text-emerald-700 font-extrabold flex items-center gap-1">
                  <span>↓</span> Más reciente primero
                </span>
              </div>
            </div>

            {/* Lista Cronológica Scrollable */}
            <div className="p-3 sm:p-4 overflow-y-auto space-y-2.5 flex-1">
              {paradasFiltradas.length === 0 ? (
                <div className="text-center py-10 px-4 space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                    {historialParadas.length === 0 ? (
                      <History className="w-6 h-6" />
                    ) : (
                      <Search className="w-6 h-6" />
                    )}
                  </div>
                  <p className="text-xs font-bold text-slate-700">
                    {historialParadas.length === 0
                      ? 'Sin mantenimientos registrados aún'
                      : 'No se encontraron mantenimientos'}
                  </p>
                  <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                    {historialParadas.length === 0
                      ? 'Cuando asientes una parada de taller o lubricadora, aparecerá aquí cronológicamente con su odómetro y pagador.'
                      : `No hay resultados que coincidan con la búsqueda "${busquedaHistorial}" o filtro seleccionado.`}
                  </p>
                  {historialParadas.length > 0 && (busquedaHistorial || filtroEstacionHistorial !== 'TODAS' || filtroPagadorHistorial !== 'TODOS') && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setBusquedaHistorial('');
                        setFiltroEstacionHistorial('TODAS');
                        setFiltroPagadorHistorial('TODOS');
                      }}
                      className="h-8 text-xs font-bold rounded-xl mt-2 cursor-pointer"
                    >
                      Limpiar Filtros
                    </Button>
                  )}
                </div>
              ) : (
                paradasFiltradas.map((p, idx) => {
                  const esAyudante = p.pagador === 'AYUDANTE';
                  const odometroBase = p.odometroServicio && p.odometroServicio > 0 ? p.odometroServicio : (p.odometroKm || 0);
                  const kmRodados = p.kmRodadosDesdeServicio ?? (odometroBase > 0 ? Math.max(0, kmActual - odometroBase) : 0);

                  return (
                    <div
                      key={p.id || idx}
                      className="p-3 rounded-2xl border border-slate-200/90 bg-white hover:bg-slate-50/70 transition-all space-y-2 shadow-2xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-black text-xs text-slate-900 truncate">
                              {p.estacionNombre}
                            </span>
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono border border-slate-200">
                              {odometroBase.toLocaleString()} km
                            </span>
                            {kmRodados > 0 ? (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-amber-100/80 text-amber-900 border border-amber-200 font-mono">
                                Hace {kmRodados.toLocaleString()} km
                              </span>
                            ) : (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200">
                                En este odómetro
                              </span>
                            )}
                            {p.esRetroactivo && (
                              <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300">
                                ⏱️ Regularizado
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-600 flex-wrap">
                            <span className="flex items-center gap-1 font-medium">
                              <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                              <strong className="text-slate-800">{p.taller || 'Taller sin nombre'}</strong>
                            </span>
                            {p.factura && (
                              <span className="font-mono text-slate-600 bg-slate-50 px-1.5 py-0.5 rounded-md border border-slate-200 text-[10px]">
                                Fac: {p.factura}
                              </span>
                            )}
                          </div>

                          {/* Detalle preciso del trabajo realizado o repuestos cambiados */}
                          {p.detalleTrabajo && (
                            <div className="mt-1 p-2 rounded-xl bg-slate-50 border border-slate-200/90 text-[11px] text-slate-800 leading-snug">
                              <span className="font-extrabold text-slate-900 block text-[10px] uppercase tracking-wider text-slate-500 mb-0.5">
                                🔧 Trabajo / Repuestos:
                              </span>
                              <span className="font-semibold text-slate-800">
                                {p.detalleTrabajo}
                              </span>
                            </div>
                          )}

                          {/* Chips o repuestos asociados si existen */}
                          {p.itemsRealizados && p.itemsRealizados.length > 0 && !p.detalleTrabajo && (
                            <div className="flex items-center gap-1 flex-wrap mt-1.5">
                              {p.itemsRealizados.slice(0, 6).map((nombreItem, i) => (
                                <span
                                  key={i}
                                  className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-0.5"
                                >
                                  <span>✓</span> {nombreItem}
                                </span>
                              ))}
                              {p.itemsRealizados.length > 6 && (
                                <span className="text-[9px] text-slate-400 font-bold">
                                  +{p.itemsRealizados.length - 6} más
                                </span>
                              )}
                            </div>
                          )}

                          {/* Fallback para códigos de catálogo si no tiene detalleTrabajo ni itemsRealizados */}
                          {!p.detalleTrabajo && (!p.itemsRealizados || p.itemsRealizados.length === 0) && p.codigosMantenimiento && p.codigosMantenimiento.length > 0 && (
                            <div className="flex items-center gap-1 flex-wrap mt-1.5">
                              {p.codigosMantenimiento.slice(0, 5).map((cod) => {
                                const matchedItem = items.find(it => it.codigo === cod);
                                const nombreCorto = matchedItem?.nombre || cod.replace('MNT-', '');
                                return (
                                  <span
                                    key={cod}
                                    className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-slate-100 text-slate-600 border border-slate-200"
                                  >
                                    ✓ {nombreCorto}
                                  </span>
                                );
                              })}
                              {p.codigosMantenimiento.length > 5 && (
                                <span className="text-[9px] text-slate-400 font-bold">
                                  +{p.codigosMantenimiento.length - 5} más
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Costo total */}
                        <div className="text-right shrink-0">
                          <span className="text-sm font-black text-slate-900 block font-mono">
                            ${(p.costoTotal || 0).toFixed(2)}
                          </span>
                          <span className="text-[9px] font-bold text-slate-400 block">
                            {p.fecha}
                          </span>
                        </div>
                      </div>

                      {/* Barra de Modalidad / Quién pagó */}
                      <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                        {esAyudante ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-blue-100 text-blue-900 border border-blue-200 flex items-center gap-1">
                            <span>🚌</span>
                            <span>Cubierto en Ruta por Ayudante</span>
                            {p.descontadoEnVT && (
                              <span className="text-[9px] text-blue-700 font-semibold">• Descontado en VT</span>
                            )}
                          </span>
                        ) : p.socioModalidad === 'TRANSFERENCIA_TOTAL' ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-900 border border-emerald-200 flex items-center gap-1">
                            <span>👤</span>
                            <span>Pagado por Socio (Transferencia 100%)</span>
                          </span>
                        ) : p.socioModalidad === 'TRANSFERENCIA_PARCIAL' ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-amber-100 text-amber-900 border border-amber-200 flex items-center gap-1">
                            <span>👤</span>
                            <span>Socio: Anticipo ${(p.socioMontoTransferido || 0).toFixed(2)} • Saldo: ${(p.socioSaldoPendiente || 0).toFixed(2)}</span>
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-rose-100 text-rose-900 border border-rose-200 flex items-center gap-1">
                            <span>👤</span>
                            <span>Socio: Crédito Fiado • Deuda: ${(p.socioSaldoPendiente || p.costoTotal || 0).toFixed(2)}</span>
                          </span>
                        )}

                        <span className="text-[9px] text-slate-400 font-medium">
                          {p.createdAt ? new Date(p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* FASE 3: Pie del Modal con botón táctil ergonómico de 48px para el pulgar */}
            <div className="p-3 border-t border-slate-200/80 bg-slate-50/80 rounded-b-3xl shrink-0">
              <Button
                type="button"
                onClick={() => setIsHistorialModalOpen(false)}
                className="w-full h-12 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs cursor-pointer shadow-md active:scale-[0.99] transition-transform"
              >
                Cerrar Historial
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL BOTTOM-SHEET: NOVEDAD O ARREGLO RÁPIDO FUERA DE CATÁLOGO (v3.60.12)  */}
      {/* ========================================================================= */}
      {isArregloModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden border border-slate-200 animate-in slide-in-from-bottom duration-300">
            {/* Cabecera Ergonómica */}
            <div className="p-4 bg-gradient-to-r from-orange-600 via-amber-600 to-amber-700 text-white flex items-center justify-between shrink-0 shadow-md">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-2xl bg-white/20 text-white text-xl flex items-center justify-center shadow-inner">
                  🔧
                </span>
                <div>
                  <h3 className="text-base font-black leading-tight flex items-center gap-1.5">
                    <span>Arreglo Rápido / Novedad</span>
                    <Badge className="bg-white/20 text-white text-[10px] font-black border-white/20">
                      Extraordinario
                    </Badge>
                  </h3>
                  <p className="text-xs text-orange-100 font-medium">
                    Bus {disco} • Trabajos fuera de catálogo oficial
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsArregloModalOpen(false)}
                className="p-2 rounded-full hover:bg-white/20 active:scale-95 text-white/80 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenido con scroll táctil */}
            <div className="p-4 overflow-y-auto space-y-3.5 flex-1 text-slate-800">
              {/* Descripción del Trabajo */}
              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <span>📝 Trabajo Realizado o Repuesto</span>
                  <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={arregloDescripcion}
                  onChange={(e) => setArregloDescripcion(e.target.value)}
                  placeholder="Ej: Enlainar paquete delantero derecho, soldadura escape, etc."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-orange-500 shadow-2xs placeholder:text-slate-400 placeholder:font-normal"
                />

                {/* Chips de sugerencias rápidas en 1 toque */}
                <div className="flex items-center gap-1.5 flex-wrap mt-2">
                  <span className="text-[10px] font-bold text-slate-400">Sugerencias:</span>
                  {[
                    'Enlainar paquete delantero',
                    'Parchada de llanta',
                    'Soldadura de escape',
                    'Ajuste de terminales',
                    'Cambio de fusible/foco',
                    'Engrase cruceta'
                  ].map((sug) => (
                    <button
                      key={sug}
                      type="button"
                      onClick={() => setArregloDescripcion(sug)}
                      className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-900 border border-orange-200 transition-colors cursor-pointer"
                    >
                      + {sug}
                    </button>
                  ))}
                </div>

                <p className="text-[10px] text-slate-500 mt-1 font-medium">
                  Escribe claro qué se hizo o qué repuesto se instaló para que el socio lo identifique.
                </p>
              </div>

              {/* Grid Tacómetro, Costo y Fecha */}
              <div className="grid grid-cols-2 gap-3">
                {/* Odómetro */}
                <div>
                  <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1">
                    Tacómetro (Km)
                  </label>
                  <input
                    type="number"
                    value={arregloKm}
                    onChange={(e) => setArregloKm(e.target.value)}
                    placeholder={kmActual.toString()}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm font-black font-mono text-slate-900 focus:ring-2 focus:ring-orange-500 shadow-2xs"
                  />
                  <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">
                    Actual: {kmActual.toLocaleString()} km
                  </span>
                </div>

                {/* Costo Factura */}
                <div>
                  <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1">
                    Costo Total ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={arregloCosto}
                    onChange={(e) => setArregloCosto(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm font-black font-mono text-slate-900 focus:ring-2 focus:ring-orange-500 shadow-2xs"
                  />
                  <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">
                    $0 si fue garantía o cortesía
                  </span>
                </div>
              </div>

              {/* Fecha del Servicio con Auditoría */}
              <div>
                <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1">
                  Fecha del Arreglo / Servicio
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={arregloFecha}
                    onChange={(e) => setArregloFecha(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm font-bold font-mono text-slate-900 focus:ring-2 focus:ring-orange-500 shadow-2xs"
                  />
                  {arregloFecha !== new Date().toISOString().split('T')[0] && (
                    <button
                      type="button"
                      onClick={() => setArregloFecha(new Date().toISOString().split('T')[0])}
                      className="px-2.5 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl border border-slate-200 transition-colors"
                    >
                      Hoy
                    </button>
                  )}
                </div>
                {arregloFecha < new Date().toISOString().split('T')[0] && (
                  <p className="text-[10px] text-blue-700 font-semibold mt-1 bg-blue-50 border border-blue-200 rounded-lg px-2 py-1">
                    🛡️ <span className="font-bold">Fecha anterior:</span> Quedará registrado en el historial sin afectar la caja del ayudante en el arqueo de hoy.
                  </p>
                )}
              </div>

              {/* Taller y Factura */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1">
                    Taller / Mecánico
                  </label>
                  <input
                    type="text"
                    value={arregloTaller}
                    onChange={(e) => setArregloTaller(e.target.value)}
                    placeholder="Ej. Taller Don Pepe"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm font-medium text-slate-900 focus:ring-2 focus:ring-orange-500 shadow-2xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1">
                    Factura / Nota Ref
                  </label>
                  <input
                    type="text"
                    value={arregloFactura}
                    onChange={(e) => setArregloFactura(e.target.value)}
                    placeholder="Ej. 001-002-1234"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm font-mono text-slate-900 focus:ring-2 focus:ring-orange-500 shadow-2xs"
                  />
                </div>
              </div>

              {/* Quién asumió el pago */}
              <div className="pt-2 border-t border-slate-200 space-y-2">
                {/* Alerta inteligente de Fecha Anterior */}
                {(() => {
                  const today = new Date().toISOString().split('T')[0];
                  const esFechaAnterior = arregloFecha < today;

                  if (esFechaAnterior && arregloPagador === 'AYUDANTE') {
                    return (
                      <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-400/40 text-amber-900 text-xs flex items-start gap-2 animate-in fade-in duration-150">
                        <span className="text-base shrink-0">🛡️</span>
                        <div className="space-y-0.5">
                          <p className="font-black text-[11px] leading-tight text-amber-950">
                            Mantenimiento de fecha anterior ({arregloFecha})
                          </p>
                          <p className="text-[10px] text-amber-800 leading-tight">
                            Solo se registrarán los datos del mantenimiento porque esos valores ya los pagó el ayudante el día del mantenimiento. No se descontará en el arqueo de hoy ni se duplicará al socio.
                          </p>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}

                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider">
                  ¿Quién asume el valor?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {/* Opción A: Descontar en caja del ayudante */}
                  {(() => {
                    const today = new Date().toISOString().split('T')[0];
                    const esFechaAnterior = arregloFecha < today;

                    return (
                      <button
                        type="button"
                        onClick={() => setArregloPagador('AYUDANTE')}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between min-h-[64px] ${
                          arregloPagador === 'AYUDANTE'
                            ? 'bg-blue-600/15 border-blue-600 text-blue-950 font-black ring-1 ring-blue-600 shadow-2xs'
                            : 'bg-slate-50 border-slate-200 text-slate-700 font-bold hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="font-black text-xs flex items-center gap-1">
                            <span>🚌</span> {esFechaAnterior ? 'Pagó Ayudante (Ruta)' : 'Descontar en caja ayudante'}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 leading-tight">
                          {esFechaAnterior
                            ? 'Solo se registrarán los datos del mantenimiento porque esos valores ya los pagó el ayudante el día del mantenimiento.'
                            : 'Se liquida en caja hoy con el arqueo del viaje.'}
                        </p>
                      </button>
                    );
                  })()}

                  {/* Opción B: Gasto directo del Socio */}
                  <button
                    type="button"
                    onClick={() => setArregloPagador('SOCIO')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between min-h-[64px] ${
                      arregloPagador === 'SOCIO'
                        ? 'bg-emerald-600/15 border-emerald-600 text-emerald-950 font-black ring-1 ring-emerald-600 shadow-2xs'
                        : 'bg-slate-50 border-slate-200 text-slate-700 font-bold hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="font-black text-xs flex items-center gap-1">
                        <span>👤</span> Gasto directo del Socio
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-tight">
                      Transferencia o crédito directo del dueño con sus opciones de pago.
                    </p>
                  </button>
                </div>

                {/* Sub-modalidad del Socio */}
                {arregloPagador === 'SOCIO' && (
                  <div className="mt-2.5 p-3 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2">
                    <span className="text-[10px] font-black uppercase text-emerald-900 block">
                      Modalidad del Socio
                    </span>
                    <div className="grid grid-cols-3 gap-1.5 text-[10px] font-black">
                      <button
                        type="button"
                        onClick={() => setArregloSocioModalidad('TRANSFERENCIA_TOTAL')}
                        className={`py-1.5 px-1 rounded-lg border text-center transition-all cursor-pointer ${
                          arregloSocioModalidad === 'TRANSFERENCIA_TOTAL'
                            ? 'bg-emerald-700 text-white border-emerald-800'
                            : 'bg-white text-emerald-900 border-emerald-300'
                        }`}
                      >
                        100% Transferido
                      </button>
                      <button
                        type="button"
                        onClick={() => setArregloSocioModalidad('TRANSFERENCIA_PARCIAL')}
                        className={`py-1.5 px-1 rounded-lg border text-center transition-all cursor-pointer ${
                          arregloSocioModalidad === 'TRANSFERENCIA_PARCIAL'
                            ? 'bg-emerald-700 text-white border-emerald-800'
                            : 'bg-white text-emerald-900 border-emerald-300'
                        }`}
                      >
                        Anticipo
                      </button>
                      <button
                        type="button"
                        onClick={() => setArregloSocioModalidad('CREDITO_FIADO')}
                        className={`py-1.5 px-1 rounded-lg border text-center transition-all cursor-pointer ${
                          arregloSocioModalidad === 'CREDITO_FIADO'
                            ? 'bg-emerald-700 text-white border-emerald-800'
                            : 'bg-white text-emerald-900 border-emerald-300'
                        }`}
                      >
                        Crédito Fiado
                      </button>
                    </div>

                    {arregloSocioModalidad === 'TRANSFERENCIA_PARCIAL' && (
                      <div className="pt-1">
                        <label className="block text-[10px] font-bold text-emerald-900 mb-0.5">
                          Monto Transferido / Anticipo ($)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={arregloSocioAbono}
                          onChange={(e) => setArregloSocioAbono(e.target.value)}
                          placeholder="0.00"
                          className="w-full px-2.5 py-1.5 rounded-lg border border-emerald-300 bg-white text-xs font-mono font-bold text-emerald-950"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Botones de acción en la zona del pulgar (Bottom Bar) */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center gap-2 shrink-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsArregloModalOpen(false)}
                disabled={arregloIsSaving}
                className="h-12 px-4 rounded-2xl border-slate-300 text-slate-700 font-bold text-xs cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleGuardarArregloRapido}
                disabled={arregloIsSaving || !arregloDescripcion.trim()}
                className="h-12 flex-1 rounded-2xl bg-orange-600 hover:bg-orange-500 text-white font-black text-xs shadow-md active:scale-[0.99] transition-transform cursor-pointer disabled:opacity-50"
              >
                {arregloIsSaving ? (
                  <span className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" /> Guardando...
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <span>💾</span> Guardar Arreglo en Historial
                  </span>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
