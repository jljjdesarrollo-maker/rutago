'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Wrench,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowLeft,
  Gauge,
  Calendar,
  Save,
  Plus,
  Bus as BusIcon,
  ShieldCheck,
  RotateCcw,
  BookOpen,
  DollarSign,
  UserCheck,
  Trash2,
  Check,
  Search,
  Filter,
  Sliders,
  Settings2,
  Sparkles,
  Cloud,
  PauseCircle,
  CreditCard,
  Banknote,
  FileDown,
  Receipt,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Building2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { getAllBuses, getActiveBusId, getLatestBusOdometer, saveBusOdometer, setActiveBus, subscribeToActiveBus, subscribeToBusOdometer } from '@/lib/fleet-storage';
import {
  saveOwnerExpense,
  saveOwnerExpenseToApi,
  getPendingDebts,
  getOwnerExpenses,
  registerAbonoToApi,
} from '@/lib/owner-expenses-storage';
import {
  getParadasPagoByBus,
  saveParadaPago,
  deleteParadaPagoCascada,
  clearAllParadasByBus,
  calcularDesgasteRegularizacion,
  type ParadaPagoRegistro,
  type SocioModalidadPago,
} from '@/lib/paradas-vt-storage';
import { type OwnerExpense, type PaymentAbono } from '@/types/expenses';
import OwnerDebtsReportModal from '../socio/OwnerDebtsReportModal';
import {
  type MantenimientoCatalogoItem,
  getCatalogoMaestroGlobal,
  EFECTO_CASCADA_TRANSMISION,
} from '@/lib/mantenimiento-catalogo';
import {
  type NivelControlMantenimiento,
  PLANTILLAS_NIVEL_CONTROL,
  CODIGOS_NIVEL_BASICO,
  CODIGOS_NIVEL_MEDIO,
  getBusNivelControl,
  saveBusNivelControl,
  getBusItemsActivosConfig,
  saveBusItemsActivosConfig,
  getBusModuloMantenimientoActivo,
  saveBusModuloMantenimientoActivo,
  saveBusMantenimientoConfigCompleta,
  syncMantenimientoConfigConServidor,
  isMantenimientoDecisionTomada,
  type EstacionServicioId,
  type ItemEstacionConfig,
  ESTACIONES_SERVICIO_CONFIG,
  getComboUnidad,
  saveComboUnidad,
  resetComboUnidad,
  isItemProtegidoReceta,
  resolverCascadaEstacion,
  getCategoriaContablePorEstacion,
} from '@/lib/mantenimiento-estaciones';

export interface MantenimientoBusItem {
  id: string;
  catalogoId?: string;
  codigo?: string;
  nombre: string;
  categoria?: 'MOTOR' | 'TRANSMISION' | 'FRENOS' | 'SUSPENSION' | 'SISTEMA_AIRE' | 'RODAJE' | 'SISTEMA_COMBUSTIBLE';
  intervaloKm: number;
  ultimoKm: number;
  fechaUltimo?: string;
  costoEstimado?: number;
  tallerMecanico?: string;
  repuestoDetalle?: string;
  asignadoChofer: boolean;
  notas?: string;
  activo: boolean;
}

export interface MantenimientoScreenProps {
  onBack: () => void;
  onGoToSocioGastos?: () => void;
}

export function MantenimientoScreen({ onBack, onGoToSocioGastos }: MantenimientoScreenProps) {
  const { toast } = useToast();

  const [activeBusId, setActiveBusId] = useState<string>(() => {
    if (typeof window === 'undefined') return 'BUS-01';
    return getActiveBusId();
  });
  const buses = getAllBuses();
  const currentBus = buses.find(b => b.id === activeBusId);
  const activeBusDisco = currentBus?.numeroDisco || '01';
  const activeBusPlaca = currentBus?.placa || 'TAA-5152';

  const resolverKmActual = useCallback((busId: string): number => {
    if (typeof window === 'undefined') return 187420;
    const busesList = getAllBuses();
    const current = busesList.find(b => b.id === busId);
    const disco = current?.numeroDisco || '01';

    // 1. Prioridad: Odómetro auditado oficial de la flota
    const audited = getLatestBusOdometer(disco);
    if (audited && audited.kmFinal) {
      const num = parseInt(audited.kmFinal, 10);
      if (!isNaN(num) && num > 0) return num;
    }
    // 2. Fallback: LocalStorage directo
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
    // 3. Fallback: Ficha del bus (odometroInicial)
    if (current && (current as any).odometroInicial) {
      const num = parseInt((current as any).odometroInicial, 10);
      if (!isNaN(num) && num > 0) return num;
    }
    // 4. Referencia estándar segura para no romper cálculos ni toLocaleString
    if (disco === '01' || busId === 'BUS-01') return 893485;
    return 187420;
  }, []);

  // Odómetro actual del bus auditado (garantizado numérico para evitar errores de render)
  const [kmActual, setKmActual] = useState<number>(() => resolverKmActual(getActiveBusId()));

  const cargarItems = useCallback((busId: string): MantenimientoBusItem[] => {
    if (typeof window === 'undefined') return [];
    const storageKey = `rg_mantenimientos_v2_${busId}`;
    const baseKm = resolverKmActual(busId) || 893485;
    const nivel = getBusNivelControl(busId);
    const catalogo = getCatalogoMaestroGlobal();
    const itemsConfig = getBusItemsActivosConfig(busId, catalogo.map(c => c.codigo));

    const calibrarItem = (c: any): MantenimientoBusItem => {
      // Aceite de motor y tríada de filtros: 19 de septiembre de 2026 a 893,100 km
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
          costoEstimado: c.codigo === 'MNT-ACEITE-MOT' ? 120 : 35,
          repuestoDetalle: c.especificacionLubricanteRepuesto,
          asignadoChofer: c.asignadoChoferPorDefecto,
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
          costoEstimado: 25,
          repuestoDetalle: c.especificacionLubricanteRepuesto,
          asignadoChofer: c.asignadoChoferPorDefecto,
          activo: true,
        };
      }
      // Aire acondicionado: 13 de septiembre de 2026
      if (c.codigo === 'MNT-AIRE-ACONDICIONADO') {
        return {
          id: `mbus-${c.id}-calibrado`,
          catalogoId: c.id,
          codigo: c.codigo,
          nombre: c.nombre,
          categoria: c.categoria,
          intervaloKm: c.intervaloKmOficial,
          ultimoKm: 892000,
          fechaUltimo: '2026-09-13',
          costoEstimado: 60,
          repuestoDetalle: c.especificacionLubricanteRepuesto,
          asignadoChofer: false,
          activo: true,
        };
      }
      // Calibración de raches de freno (800 km ciclo)
      if (c.codigo === 'MNT-RACHES-FRENO') {
        return {
          id: `mbus-${c.id}-calibrado`,
          catalogoId: c.id,
          codigo: c.codigo,
          nombre: c.nombre,
          categoria: c.categoria,
          intervaloKm: c.intervaloKmOficial,
          ultimoKm: Math.max(0, baseKm - 250),
          fechaUltimo: '2026-09-20',
          costoEstimado: 0,
          repuestoDetalle: c.especificacionLubricanteRepuesto,
          asignadoChofer: true,
          activo: true,
        };
      }
      // Rotación mensual de baterías (8,600 km ciclo / 30 días - Chofer sh)
      if (c.codigo === 'MNT-ROTACION-BATERIAS') {
        return {
          id: `mbus-${c.id}-calibrado`,
          catalogoId: c.id,
          codigo: c.codigo,
          nombre: c.nombre,
          categoria: c.categoria,
          intervaloKm: c.intervaloKmOficial,
          ultimoKm: Math.max(0, baseKm - 1500),
          fechaUltimo: '2026-09-15',
          costoEstimado: 0,
          repuestoDetalle: c.especificacionLubricanteRepuesto,
          asignadoChofer: true,
          activo: true,
        };
      }
      // Renovación de baterías par 24V (200,000 km ciclo / 2 años - Socio ~50)
      if (c.codigo === 'MNT-BATERIAS-PAR') {
        return {
          id: `mbus-${c.id}-calibrado`,
          catalogoId: c.id,
          codigo: c.codigo,
          nombre: c.nombre,
          categoria: c.categoria,
          intervaloKm: c.intervaloKmOficial,
          ultimoKm: Math.max(0, baseKm - 48000),
          fechaUltimo: '2026-04-10',
          costoEstimado: 350,
          repuestoDetalle: c.especificacionLubricanteRepuesto,
          asignadoChofer: false,
          activo: true,
        };
      }
      // Demás ítems del catálogo Hino AK calibrados con 20% de desgaste (Al Día)
      return {
        id: `mbus-${c.id}-calibrado`,
        catalogoId: c.id,
        codigo: c.codigo,
        nombre: c.nombre,
        categoria: c.categoria,
        intervaloKm: c.intervaloKmOficial,
        ultimoKm: Math.max(0, baseKm - Math.floor(c.intervaloKmOficial * 0.2)),
        fechaUltimo: '2026-09-15',
        costoEstimado: c.categoria === 'MOTOR' ? 120 : c.categoria === 'FRENOS' ? 80 : 45,
        repuestoDetalle: c.especificacionLubricanteRepuesto,
        asignadoChofer: c.asignadoChoferPorDefecto,
        activo: true,
      };
    };

    let itemsExistentes: MantenimientoBusItem[] = [];
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const desfaseExtremo = parsed.some(
            (it: MantenimientoBusItem) => it.ultimoKm > 0 && Math.abs(baseKm - it.ultimoKm) > 100000
          );
          if (!desfaseExtremo) {
            itemsExistentes = parsed;
          } else {
            console.warn('Detectado desfase histórico en items guardados. Aplicando calibración oficial.');
          }
        }
      } catch (e) {
        console.error('Error parseando mantenimientos:', e);
      }
    }

    const catalogoActivo = catalogo.filter(c => c.activoBiblioteca);
    const codigosExistentes = new Set(itemsExistentes.map(it => it.codigo));
    let itemsActualizados = [...itemsExistentes];

    // Si el socio seleccionó Control Total (27) o faltan componentes del nivel activo:
    catalogoActivo.forEach(c => {
      const debeEstar = nivel === 'TOTAL' ? true : (itemsConfig[c.codigo] ?? true);
      if (debeEstar && !codigosExistentes.has(c.codigo)) {
        itemsActualizados.push(calibrarItem(c));
        codigosExistentes.add(c.codigo);
      }
    });

    if (itemsActualizados.length === 0) {
      itemsActualizados = catalogoActivo.map(calibrarItem);
    }

    if (itemsActualizados.length > itemsExistentes.length || !saved) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(itemsActualizados));
      } catch (e) {
        console.error('Error guardando items ampliados:', e);
      }
    }

    return itemsActualizados;
  }, [resolverKmActual]);

  // Mantenimientos activos de esta unidad
  const [items, setItems] = useState<MantenimientoBusItem[]>(() => cargarItems(getActiveBusId()));

  // Suscripción reactiva al cambio de unidad física y al odómetro auditado (Arqueo de Llegada)
  useEffect(() => {
    const unsubBus = subscribeToActiveBus((bus) => {
      setActiveBusId(bus.id);
      setKmActual(resolverKmActual(bus.id));
      setItems(cargarItems(bus.id));
      setNivelControl(getBusNivelControl(bus.id));
      setItemsActivosConfig(getBusItemsActivosConfig(bus.id));
      setModuloActivo(getBusModuloMantenimientoActivo(bus.id));
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

    return () => {
      unsubBus();
      unsubOdo();
    };
  }, [activeBusId, resolverKmActual, cargarItems]);

  // Modales
  const [editingItem, setEditingItem] = useState<MantenimientoBusItem | null>(null);
  const [newUltimoKm, setNewUltimoKm] = useState('');
  const [fechaRegistro, setFechaRegistro] = useState(new Date().toISOString().split('T')[0]);
  const [costoRegistro, setCostoRegistro] = useState('');
  const [tallerRegistro, setTallerRegistro] = useState('');

  const [isCatalogoModalOpen, setIsCatalogoModalOpen] = useState(false);
  const [catalogoBusqueda, setCatalogoBusqueda] = useState('');
  const [catalogoFiltroCat, setCatalogoFiltroCat] = useState('TODAS');

  // Modal de Estaciones de Servicio (Combos de Parada en Taller)
  const [estacionSeleccionada, setEstacionSeleccionada] = useState<EstacionServicioId | null>(null);
  // Fase 1: Modo configurador de receta de unidad para el socio
  const [modoConfigurarCombo, setModoConfigurarCombo] = useState(false);
  const [comboUnidadItems, setComboUnidadItems] = useState<{ codigo: string; nombre: string; intervaloKm: number; preMarcado: boolean; opcionalTexto?: string }[]>([]);
  const [comboUnidadChecks, setComboUnidadChecks] = useState<Record<string, boolean>>({});
  const [comboUnidadExtras, setComboUnidadExtras] = useState<string[]>([]);
  const [comboUnidadExcluidos, setComboUnidadExcluidos] = useState<string[]>([]);
  const [busquedaExtraModal, setBusquedaExtraModal] = useState('');
  const [estacionCodigosSeleccionados, setEstacionCodigosSeleccionados] = useState<string[]>([]);
  const [estacionKm, setEstacionKm] = useState<string>();
  const [estacionCosto, setEstacionCosto] = useState<string>();
  const [estacionTaller, setEstacionTaller] = useState<string>();
  const [estacionFactura, setEstacionFactura] = useState<string>();
  const [estacionMetodoPago, setEstacionMetodoPago] = useState<'EFECTIVO' | 'TRANSFERENCIA'>('EFECTIVO');
  // Modalidad de pago al asentar parada de taller en el modal (Fase 4)
  const [estacionModalidadPago, setEstacionModalidadPago] = useState<'PAGO_TOTAL' | 'PAGO_PARCIAL' | 'CREDITO_FIADO'>('PAGO_TOTAL');
  const [estacionMontoAbono, setEstacionMontoAbono] = useState<string>('');

  // Regularización Retroactiva en Estaciones de Servicio (Socio)
  const [estacionModoRetroactivo, setEstacionModoRetroactivo] = useState<boolean>(false);
  const [estacionKmServicio, setEstacionKmServicio] = useState<string>("");
  const [estacionFechaServicio, setEstacionFechaServicio] = useState<string>(() => new Date().toISOString().split("T")[0]);

  // Regularización Retroactiva en Combo 4 Ruedas (Socio)
  const [comboRuedasModoRetroactivo, setComboRuedasModoRetroactivo] = useState<boolean>(false);
  const [comboRuedasKmServicio, setComboRuedasKmServicio] = useState<string>("");
  const [comboRuedasFechaServicio, setComboRuedasFechaServicio] = useState<string>(() => new Date().toISOString().split("T")[0]);

  // Cartera de Cuentas por Pagar y Deudas con Talleres (Fase 4)
  const [deudasTalleres, setDeudasTalleres] = useState<OwnerExpense[]>(() => {
    if (typeof window === 'undefined') return [];
    return getPendingDebts(activeBusId);
  });
  const [allOwnerExpenses, setAllOwnerExpenses] = useState<OwnerExpense[]>(() => {
    if (typeof window === 'undefined') return [];
    return getOwnerExpenses(activeBusId);
  });
  const [paradasTallerHistorial, setParadasTallerHistorial] = useState<ParadaPagoRegistro[]>(() => {
    if (typeof window === 'undefined') return [];
    return getParadasPagoByBus(activeBusId);
  });
  const [isDebtsReportModalOpen, setIsDebtsReportModalOpen] = useState(false);
  const [isAbonoModalOpen, setIsAbonoModalOpen] = useState(false);
  const [abonoTargetExpense, setAbonoTargetExpense] = useState<OwnerExpense | null>(null);
  const [abonoAmount, setAbonoAmount] = useState<string>('');
  const [abonoDate, setAbonoDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [abonoMethod, setAbonoMethod] = useState<'TRANSFERENCIA' | 'EFECTIVO'>('TRANSFERENCIA');
  const [abonoRef, setAbonoRef] = useState('');
  const [abonoNotes, setAbonoNotes] = useState('');
  const [isSubmittingAbono, setIsSubmittingAbono] = useState(false);
  const [seccionCarteraColapsada, setSeccionCarteraColapsada] = useState(false);
  const [seccionParadasColapsada, setSeccionParadasColapsada] = useState(false);

  // FASE B: Modal de confirmación para anulación/eliminación en cascada de parada técnica
  const [paradaParaEliminar, setParadaParaEliminar] = useState<ParadaPagoRegistro | null>(null);
  const [modalConfirmLimpiarPruebasOpen, setModalConfirmLimpiarPruebasOpen] = useState(false);

  // Modal Combo 4 Ruedas (Rodaje y Suspensión)
  const [isComboRuedasModalOpen, setIsComboRuedasModalOpen] = useState(false);
  const [comboRuedasKm, setComboRuedasKm] = useState<string>('');
  const [comboRuedasCosto, setComboRuedasCosto] = useState<string>('');
  const [comboRuedasFactura, setComboRuedasFactura] = useState<string>('');
  const [comboRuedasTaller, setComboRuedasTaller] = useState<string>('');
  const [comboRuedasMetodo, setComboRuedasMetodo] = useState<'EFECTIVO' | 'TRANSFERENCIA'>('EFECTIVO');

  // Filtro de la vista principal del socio
  const [filtroVista, setFiltroVista] = useState<'TODOS' | 'VENCIDOS' | 'CHOFER'>('TODOS');
  const [filtroCategoria, setFiltroCategoria] = useState<string>('TODAS');

  // Nivel de Control del Socio (BÁSICO 7 | MEDIO 15 | TOTAL 27) y Switches
  const [nivelControl, setNivelControl] = useState<NivelControlMantenimiento>(() => {
    if (typeof window === 'undefined') return 'BASICO';
    return getBusNivelControl(activeBusId);
  });
  const [itemsActivosConfig, setItemsActivosConfig] = useState<Record<string, boolean>>(() => {
    if (typeof window === 'undefined') return {};
    return getBusItemsActivosConfig(activeBusId);
  });
  const [mostrarSoloActivos, setMostrarSoloActivos] = useState<boolean>(true);
  const [mostrarCalibrarOdo, setMostrarCalibrarOdo] = useState<boolean>(false);
  const [mostrarEstacionesSocio, setMostrarEstacionesSocio] = useState<boolean>(false);
  const [isPoliticasModalOpen, setIsPoliticasModalOpen] = useState<boolean>(false);

  // Decisión del Socio: ¿Desea utilizar las funciones de mantenimiento o solo operativas?
  const [moduloActivo, setModuloActivo] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return getBusModuloMantenimientoActivo(activeBusId);
  });

  // Modales de Confirmación de Decisiones del Socio (Cross-Device Sync & Confirmación)
  const [modalConfirmPausarOpen, setModalConfirmPausarOpen] = useState<boolean>(false);
  const [modalConfirmNivel, setModalConfirmNivel] = useState<{
    nivel: NivelControlMantenimiento;
    activarModulo: boolean;
  } | null>(null);
  const [modalConfirmReactivarOpen, setModalConfirmReactivarOpen] = useState<boolean>(false);
  const [isCloudSyncing, setIsCloudSyncing] = useState<boolean>(false);

  // Sincronización en segundo plano con el servidor al cambiar de unidad
  useEffect(() => {
    setIsCloudSyncing(true);
    syncMantenimientoConfigConServidor(activeBusId)
      .then((cloudData) => {
        if (cloudData) {
          if (typeof cloudData.moduloActivo === 'boolean') {
            setModuloActivo(cloudData.moduloActivo);
          }
          if (cloudData.nivelControl) {
            setNivelControl(cloudData.nivelControl);
          }
          if (cloudData.itemsActivos) {
            setItemsActivosConfig(cloudData.itemsActivos);
          }
        }
      })
      .finally(() => {
        setIsCloudSyncing(false);
      });
  }, [activeBusId]);

  // Suscripción al evento global de sincronización en tiempo real
  useEffect(() => {
    const handleSync = (e: any) => {
      const detail = e.detail;
      if (!detail) return;
      if (detail.busId && detail.busId !== activeBusId) return;
      if (typeof detail.moduloActivo === 'boolean') {
        setModuloActivo(detail.moduloActivo);
      }
      if (detail.nivelControl) {
        setNivelControl(detail.nivelControl);
      }
      if (detail.itemsActivos) {
        setItemsActivosConfig(detail.itemsActivos);
      }
    };

    window.addEventListener('rg_mantenimiento_config_sync', handleSync);
    return () => {
      window.removeEventListener('rg_mantenimiento_config_sync', handleSync);
    };
  }, [activeBusId]);

  // Recarga de deudas contables y paradas técnicas vinculadas (Fase 4)
  const recargarCarteraYParadas = useCallback(() => {
    setDeudasTalleres(getPendingDebts(activeBusId));
    setAllOwnerExpenses(getOwnerExpenses(activeBusId));
    setParadasTallerHistorial(getParadasPagoByBus(activeBusId));
  }, [activeBusId]);

  useEffect(() => {
    recargarCarteraYParadas();
    const handleSync = () => recargarCarteraYParadas();
    window.addEventListener('rg_owner_expenses_sync', handleSync);
    window.addEventListener('rg_paradas_pago_updated', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('rg_owner_expenses_sync', handleSync);
      window.removeEventListener('rg_paradas_pago_updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [activeBusId, recargarCarteraYParadas]);

  // Interceptar el toggle para solicitar confirmación consciente (evitar clicks accidentales)
  const handleToggleModuloActivo = (activar: boolean) => {
    if (!activar) {
      setModalConfirmPausarOpen(true);
    } else {
      setModalConfirmReactivarOpen(true);
    }
  };

  const ejecutarPausaModulo = () => {
    setModuloActivo(false);
    saveBusModuloMantenimientoActivo(activeBusId, false);
    setModalConfirmPausarOpen(false);
    toast({
      title: "Módulo de Mantenimiento Pausado",
      description: `Se pausó el control mecánico para la Unidad ${activeBusDisco}. La decisión se sincronizó en la nube.`,
    });
  };

  const ejecutarReactivacionModulo = () => {
    setModuloActivo(true);
    saveBusModuloMantenimientoActivo(activeBusId, true);
    setModalConfirmReactivarOpen(false);
    toast({
      title: "Módulo de Mantenimiento Reactivado",
      description: `Se reanudó la supervisión mecánica para la Unidad ${activeBusDisco} con tu plan guardado.`,
    });
  };

  const solicitarConfirmacionNivel = (nuevoNivel: NivelControlMantenimiento, activarModulo: boolean = true) => {
    setModalConfirmNivel({ nivel: nuevoNivel, activarModulo });
  };

  const ejecutarCambioNivelConfirmado = () => {
    if (!modalConfirmNivel) return;
    const { nivel, activarModulo } = modalConfirmNivel;

    const nuevoModuloActivo = activarModulo ? true : moduloActivo;
    setModuloActivo(nuevoModuloActivo);
    setNivelControl(nivel);

    const catalogo = getCatalogoMaestroGlobal();
    const nuevaConfig: Record<string, boolean> = {};
    if (nivel === "TOTAL") {
      catalogo.forEach(c => { nuevaConfig[c.codigo] = true; });
    } else if (nivel === "MEDIO") {
      const setMedio = new Set(CODIGOS_NIVEL_MEDIO);
      catalogo.forEach(c => { nuevaConfig[c.codigo] = setMedio.has(c.codigo); });
    } else {
      const setBasico = new Set(CODIGOS_NIVEL_BASICO);
      catalogo.forEach(c => { nuevaConfig[c.codigo] = setBasico.has(c.codigo); });
    }
    setItemsActivosConfig(nuevaConfig);

    saveBusMantenimientoConfigCompleta(activeBusId, {
      moduloActivo: nuevoModuloActivo,
      nivelControl: nivel,
      itemsActivos: nuevaConfig,
      decisionTomada: true,
    });

    const codigosExistentes = new Set(items.map(it => it.codigo));
    const itemsNuevosParaAgregar: MantenimientoBusItem[] = [];
    catalogo.forEach(c => {
      const debeEstarActivo = nuevaConfig[c.codigo];
      if (debeEstarActivo && !codigosExistentes.has(c.codigo)) {
        itemsNuevosParaAgregar.push({
          id: `mbus-${c.id}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          catalogoId: c.id,
          codigo: c.codigo,
          nombre: c.nombre,
          categoria: c.categoria,
          intervaloKm: c.intervaloKmOficial,
          ultimoKm: Math.max(0, kmActual - Math.floor(c.intervaloKmOficial * 0.2)),
          fechaUltimo: new Date().toISOString().split("T")[0],
          costoEstimado: c.categoria === "MOTOR" ? 120 : 50,
          repuestoDetalle: c.especificacionLubricanteRepuesto,
          asignadoChofer: c.asignadoChoferPorDefecto,
          activo: true,
        });
      }
    });
    if (itemsNuevosParaAgregar.length > 0) {
      saveItems([...items, ...itemsNuevosParaAgregar]);
    }

    setModalConfirmNivel(null);

    const plantilla = PLANTILLAS_NIVEL_CONTROL[nivel];
    toast({
      title: `Plan ${plantilla.nombre} Confirmado y Guardado`,
      description: `Recordaremos tu decisión para la Unidad ${activeBusDisco}. La supervisión de mantenimiento está activa y sincronizada entre tu celular y tu PC.`,
    });
  };

  const saveItems = (updated: MantenimientoBusItem[]) => {
    setItems(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem(`rg_mantenimientos_v2_${activeBusId}`, JSON.stringify(updated));
    }
  };

  const handleSincronizarBloqueMotor = () => {
    const catalogo = getCatalogoMaestroGlobal();
    const motorItemsCatalogo = catalogo.filter(c => c.categoria === 'MOTOR');
    const codigosExistentes = new Set(items.map(it => it.codigo));
    const nuevos: MantenimientoBusItem[] = [];

    // Actualizar nombre y detalle de MNT-RADIADOR-COOLANT si ya existía
    const itemsActualizados = items.map(it => {
      if (it.codigo === 'MNT-RADIADOR-COOLANT') {
        return {
          ...it,
          nombre: 'Lavado de Radiador, Intercooler y Refrigerante',
          repuestoDetalle: 'Lavado químico de circuito (flushing) + lavado de intercooler + 4 galones Coolant Heavy Duty 50/50',
        };
      }
      return it;
    });

    motorItemsCatalogo.forEach(c => {
      if (!codigosExistentes.has(c.codigo)) {
        nuevos.push({
          id: `mbus-${c.id}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          catalogoId: c.id,
          codigo: c.codigo,
          nombre: c.nombre,
          categoria: c.categoria,
          intervaloKm: c.intervaloKmOficial,
          ultimoKm: Math.max(0, kmActual - Math.floor(c.intervaloKmOficial * 0.3)),
          fechaUltimo: new Date().toISOString().split('T')[0],
          costoEstimado: c.codigo === 'MNT-ACEITE-MOT' ? 120 : c.codigo === 'MNT-RADIADOR-COOLANT' ? 130 : c.codigo.includes('FILT') ? 35 : 80,
          repuestoDetalle: c.especificacionLubricanteRepuesto,
          asignadoChofer: c.asignadoChoferPorDefecto,
          activo: true,
        });
      }
    });

    const huboCambios = nuevos.length > 0 || itemsActualizados.some((it, idx) => it !== items[idx]);
    if (huboCambios) {
      const actualizados = [...itemsActualizados, ...nuevos];
      saveItems(actualizados);
      toast({
        title: 'Bloque de Motor Sincronizado',
        description: `Se activaron los ítems oficiales de Motor (incluye Radiador, Intercooler y Coolant) en tu unidad.`,
      });
    } else {
      toast({
        title: 'Motor Completo',
        description: 'Todos los 9 ítems oficiales de Motor ya están activos en este autobús.',
      });
    }
  };

  const handleSincronizarBloqueTransmision = () => {
    const catalogo = getCatalogoMaestroGlobal();
    const transmisionItemsCatalogo = catalogo.filter(c => c.categoria === 'TRANSMISION');
    const codigosExistentes = new Set(items.map(it => it.codigo));
    const nuevos: MantenimientoBusItem[] = [];

    // Migrar ítems con códigos legados si existen
    const actualizadosExistentes = items.map(it => {
      if (it.codigo === 'MNT-VALVULINA-CAJA' || it.nombre.toLowerCase().includes('valvulina de caja')) {
        return { ...it, codigo: 'MNT-ACEITE-CAJA', nombre: 'Aceite de Caja', intervaloKm: 30000 };
      }
      if (it.codigo === 'MNT-VALVULINA-CORONA' || it.nombre.toLowerCase().includes('valvulina de diferencial')) {
        return { ...it, codigo: 'MNT-ACEITE-CORONA', nombre: 'Aceite de Corona', intervaloKm: 30000 };
      }
      return it;
    });

    const codigosActualizados = new Set(actualizadosExistentes.map(it => it.codigo));

    transmisionItemsCatalogo.forEach(c => {
      if (!codigosActualizados.has(c.codigo)) {
        nuevos.push({
          id: `mbus-${c.id}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          catalogoId: c.id,
          codigo: c.codigo,
          nombre: c.nombre,
          categoria: c.categoria,
          intervaloKm: c.intervaloKmOficial,
          ultimoKm: Math.max(0, kmActual - Math.floor(c.intervaloKmOficial * 0.2)),
          fechaUltimo: new Date().toISOString().split('T')[0],
          costoEstimado: c.codigo === 'MNT-KIT-EMBRAGUE' ? 450 : c.codigo.includes('MNT-MNT') ? 600 : 90,
          repuestoDetalle: c.especificacionLubricanteRepuesto,
          asignadoChofer: c.asignadoChoferPorDefecto,
          activo: true,
        });
      }
    });

    const resultadoFinal = [...actualizadosExistentes, ...nuevos];
    saveItems(resultadoFinal);

    if (nuevos.length > 0) {
      toast({
        title: 'Bloque Transmisión Sincronizado',
        description: `Se activaron los ${nuevos.length} ítems oficiales de Transmisión en tu unidad.`,
      });
    } else {
      toast({
        title: 'Transmisión Homologada',
        description: 'Los 5 ítems oficiales de Transmisión ya están activos y homologados.',
      });
    }
  };

  const handleSincronizarBloqueAire = () => {
    const catalogo = getCatalogoMaestroGlobal();
    const aireItemsCatalogo = catalogo.filter(c => c.categoria === 'SISTEMA_AIRE');
    const nuevos: MantenimientoBusItem[] = [];

    // Migrar ítems con nombres/intervalos legados o reclasificar secador/compresor a Frenos, y filtrar Intercooler (fusionado en Motor)
    const actualizadosExistentes = items.map(it => {
      if (it.codigo === 'MNT-SOPLADO-AIRE') {
        return { ...it, nombre: 'Soplado Filtro Aire', intervaloKm: 5000 };
      }
      if (it.codigo === 'MNT-FILT-AIRE-SEC') {
        return { ...it, nombre: 'Filtro Aire Pequeño', intervaloKm: 20000 };
      }
      if (it.codigo === 'MNT-FILT-AIRE-GRANDE') {
        return { ...it, nombre: 'Filtro Aire Grande', intervaloKm: 40000 };
      }
      if (it.codigo === 'MNT-SECADOR-AIRE' || it.codigo === 'MNT-COMPRESOR-AIRE') {
        return { ...it, categoria: 'FRENOS' as const };
      }
      return it;
    }).filter(it => it.codigo !== 'MNT-LAVADO-INTERCOOLER');

    const codigosActualizados = new Set(actualizadosExistentes.map(it => it.codigo));

    aireItemsCatalogo.forEach(c => {
      if (!codigosActualizados.has(c.codigo)) {
        nuevos.push({
          id: `mbus-${c.id}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          catalogoId: c.id,
          codigo: c.codigo,
          nombre: c.nombre,
          categoria: c.categoria,
          intervaloKm: c.intervaloKmOficial,
          ultimoKm: Math.max(0, kmActual - Math.floor(c.intervaloKmOficial * 0.2)),
          fechaUltimo: new Date().toISOString().split('T')[0],
          costoEstimado: c.codigo === 'MNT-FILT-AIRE-GRANDE' ? 65 : c.codigo === 'MNT-FILT-AIRE-SEC' ? 35 : 15,
          repuestoDetalle: c.especificacionLubricanteRepuesto,
          asignadoChofer: c.asignadoChoferPorDefecto,
          activo: true,
        });
      }
    });

    const resultadoFinal = [...actualizadosExistentes, ...nuevos];
    saveItems(resultadoFinal);

    if (nuevos.length > 0) {
      toast({
        title: 'Bloque Admisión y Aire Sincronizado',
        description: `Se activaron los ${nuevos.length} ítems oficiales de Aire (Soplado, Malla Pasillo, Mangueras y Filtros) en tu unidad.`,
      });
    } else {
      toast({
        title: 'Admisión y Aire Homologado',
        description: 'Los 5 ítems oficiales de Admisión y Aire ya están activos y homologados.',
      });
    }
  };

  const handleSincronizarBloqueRodaje = () => {
    const catalogo = getCatalogoMaestroGlobal();
    const rodajeItemsCatalogo = catalogo.filter(c => c.categoria === 'RODAJE');
    const nuevos: MantenimientoBusItem[] = [];

    // Localizar odómetro previo de bocinas si existía para mantener continuidad histórica
    const bocinaPrevia = items.find(
      it => it.codigo === 'MNT-ENGRASE-BOCINAS' || it.codigo === 'MNT-BOCINAS-POST' || it.codigo === 'MNT-BOCINAS-DEL'
    );

    // Migrar ítems con nombres/intervalos legados de Suspensión y Rodaje
    const actualizadosExistentes = items.map(it => {
      // 1. Engrase de chasis a 1,500 km
      if (it.codigo === 'MNT-ENGRASE-CHASIS') {
        return {
          ...it,
          nombre: 'Engrase de Chasis',
          categoria: 'RODAJE' as const,
          intervaloKm: 1500,
          repuestoDetalle: 'Grasa EP2 para crucetas, muñones, candados y terminales (manual en cooperativa cada 3-4 días o en rampa a los 5,000 km)',
          asignadoChofer: true,
        };
      }
      // 2. Rotación a Alineación y Chequeo Llantas 15,000 km
      if (it.codigo === 'MNT-ROTACION-LLANTAS' || it.codigo === 'MNT-ALINEACION-LLANTAS') {
        return {
          ...it,
          codigo: 'MNT-ALINEACION-LLANTAS',
          nombre: 'Alineación y Chequeo Llantas',
          categoria: 'RODAJE' as const,
          intervaloKm: 15000,
          repuestoDetalle: 'Alineación, balanceo e inspección de desgaste en hombros por curvas de montaña (Loja–Vilcabamba)',
        };
      }
      // 3. Bocinas anteriores: si tenía MNT-ENGRASE-BOCINAS o MNT-BOCINAS-POST, calibrar a Posteriores (50k)
      if (it.codigo === 'MNT-ENGRASE-BOCINAS' || it.codigo === 'MNT-BOCINAS-POST') {
        return {
          ...it,
          codigo: 'MNT-BOCINAS-POST',
          nombre: 'Engrase Bocinas Posteriores',
          categoria: 'RODAJE' as const,
          intervaloKm: 50000,
          repuestoDetalle: '3.5 kg de grasa de alta temperatura + 4 retenes posteriores (2 por rueda). Soporta el 70% del peso del bus y calor de tambores.',
        };
      }
      // 4. Bocinas Delanteras a 60k
      if (it.codigo === 'MNT-BOCINAS-DEL') {
        return {
          ...it,
          nombre: 'Engrase Bocinas Delanteras',
          categoria: 'RODAJE' as const,
          intervaloKm: 60000,
          repuestoDetalle: '1.5 kg de grasa de alta temperatura + 2 retenes delanteros (1 por rueda). Desmontaje rápido (1.5 horas).',
        };
      }
      // 5. Muelles y bujes a 50k
      if (it.codigo === 'MNT-MUELLES-MAESTRA' || it.codigo === 'MNT-MUELLES-BUJES') {
        return {
          ...it,
          codigo: 'MNT-MUELLES-BUJES',
          nombre: 'Revisión de Muelles y Bujes',
          categoria: 'RODAJE' as const,
          intervaloKm: 50000,
          repuestoDetalle: 'Inspección de hojas, cambio de bujes para no romper la hoja maestra, chequeo de perno de centro y apriete de abrazaderas en U.',
        };
      }
      // Si era de suspensión antigua, asegurar que quede en RODAJE
      if (it.categoria === 'SUSPENSION') {
        return { ...it, categoria: 'RODAJE' as const };
      }
      return it;
    });

    const codigosActualizados = new Set(actualizadosExistentes.map(it => it.codigo));

    // Agregar los ítems oficiales que falten
    rodajeItemsCatalogo.forEach(c => {
      if (!codigosActualizados.has(c.codigo)) {
        const ultimoKmCalculado = (c.codigo === 'MNT-BOCINAS-DEL' && bocinaPrevia)
          ? bocinaPrevia.ultimoKm
          : Math.max(0, kmActual - Math.floor(c.intervaloKmOficial * 0.2));

        nuevos.push({
          id: `mbus-${c.id}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          catalogoId: c.id,
          codigo: c.codigo,
          nombre: c.nombre,
          categoria: c.categoria,
          intervaloKm: c.intervaloKmOficial,
          ultimoKm: ultimoKmCalculado,
          fechaUltimo: bocinaPrevia?.fechaUltimo || new Date().toISOString().split('T')[0],
          costoEstimado: c.codigo.includes('BOCINAS') ? 140 : c.codigo === 'MNT-ENGRASE-CHASIS' ? 12 : c.codigo === 'MNT-ALINEACION-LLANTAS' ? 35 : 180,
          repuestoDetalle: c.especificacionLubricanteRepuesto,
          asignadoChofer: c.asignadoChoferPorDefecto,
          activo: true,
        });
      }
    });

    const resultadoFinal = [...actualizadosExistentes, ...nuevos];
    saveItems(resultadoFinal);

    toast({
      title: '🔄 Bloque Rodaje y Suspensión Homologado',
      description: `Los 5 ítems oficiales (Engrase Chasis 1.5k, Alineación 15k, Bocinas Post 50k, Bocinas Del 60k, Muelles/Bujes 50k) quedaron calibrados.`,
    });
  };

  const handleSincronizarBloqueFrenos = () => {
    const catalogo = getCatalogoMaestroGlobal();
    const frenosItemsCatalogo = catalogo.filter(c => c.categoria === 'FRENOS');
    const nuevos: MantenimientoBusItem[] = [];

    // Localizar odómetro previo de bandas si existía
    const bandaPrevia = items.find(
      it => it.codigo === 'MNT-BANDAS-FRENO' || it.codigo === 'MNT-ZAPATAS-POST' || it.codigo === 'MNT-ZAPATAS-DEL'
    );

    // Filtrar ítems legados/en reserva (Secador, Compresor, Intercooler) y migrar legados
    const actualizadosExistentes = items.map(it => {
      if (it.codigo === 'MNT-BANDAS-FRENO') {
        return {
          ...it,
          codigo: 'MNT-ZAPATAS-POST',
          nombre: 'Zapatas y Tambores Posteriores',
          categoria: 'FRENOS' as const,
          intervaloKm: 8000,
          repuestoDetalle: 'Visita al maestro de frenos: remachado de zapatas traseras (compuesto pesado) y rebaje de ceja en tambores',
        };
      }
      if (it.codigo === 'MNT-RACHES-FRENO') {
        return {
          ...it,
          intervaloKm: 800,
          asignadoChofer: true,
          repuestoDetalle: 'Ajuste manual de tuercas en matracas/raches con llave para mantener pedal alto y sensible',
        };
      }
      if (it.codigo === 'MNT-ZAPATAS-POST') {
        return {
          ...it,
          intervaloKm: 8000,
          repuestoDetalle: 'Visita al maestro de frenos: remachado de zapatas traseras (compuesto pesado) y rebaje de ceja en tambores',
        };
      }
      if (it.codigo === 'MNT-ZAPATAS-DEL') {
        return {
          ...it,
          intervaloKm: 11000,
          repuestoDetalle: 'Visita al maestro de frenos: remachado de zapatas delanteras y rebaje de ceja en tambores delanteros',
        };
      }
      return it;
    }).filter(it => it.codigo !== 'MNT-SECADOR-AIRE' && it.codigo !== 'MNT-COMPRESOR-AIRE' && it.codigo !== 'MNT-LAVADO-INTERCOOLER');

    const codigosActualizados = new Set(actualizadosExistentes.map(it => it.codigo));

    frenosItemsCatalogo.forEach(c => {
      if (!codigosActualizados.has(c.codigo)) {
        const ultimoKmCalculado = (c.codigo === 'MNT-ZAPATAS-DEL' && bandaPrevia)
          ? bandaPrevia.ultimoKm
          : (c.codigo === 'MNT-RACHES-FRENO')
          ? Math.max(0, kmActual - 400)
          : Math.max(0, kmActual - Math.floor(c.intervaloKmOficial * 0.2));

        nuevos.push({
          id: `mbus-${c.id}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          catalogoId: c.id,
          codigo: c.codigo,
          nombre: c.nombre,
          categoria: c.categoria,
          intervaloKm: c.intervaloKmOficial,
          ultimoKm: ultimoKmCalculado,
          fechaUltimo: bandaPrevia?.fechaUltimo || new Date().toISOString().split('T')[0],
          costoEstimado: c.codigo === 'MNT-RACHES-FRENO' ? 0 : c.codigo === 'MNT-ZAPATAS-POST' ? 140 : 120,
          repuestoDetalle: c.especificacionLubricanteRepuesto,
          asignadoChofer: c.asignadoChoferPorDefecto,
          activo: true,
        });
      }
    });

    const resultadoFinal = [...actualizadosExistentes, ...nuevos];
    saveItems(resultadoFinal);

    toast({
      title: '🛑 Bloque Frenos Homologado',
      description: `Los 3 ítems oficiales de Frenos (Raches 800 km Chofer, Zapatas Post 8k y Zapatas Del 11k) quedaron calibrados.`,
    });
  };

  const handleGuardarCombo4Ruedas = () => {
    const kmTablero = parseInt(comboRuedasKm || '', 10) || kmActual;
    const today = new Date().toISOString().split('T')[0];
    let km = kmTablero;
    let fechaFinal = today;
    let esRetro = false;

    if (comboRuedasModoRetroactivo) {
      const kmHist = parseInt(comboRuedasKmServicio || '', 10);
      if (isNaN(kmHist) || kmHist <= 0) {
        toast({
          title: 'Kilometraje histórico inválido',
          description: 'Ingresa el kilometraje en que se realizó el servicio de ruedas.',
          variant: 'destructive',
        });
        return;
      }
      if (kmHist > kmTablero) {
        toast({
          title: 'Kilometraje inconsistente',
          description: `El cambio (${kmHist.toLocaleString()} km) no puede ser mayor al odómetro actual (${kmTablero.toLocaleString()} km).`,
          variant: 'destructive',
        });
        return;
      }
      km = kmHist;
      fechaFinal = comboRuedasFechaServicio || today;
      esRetro = kmHist < kmTablero || fechaFinal < today;
    }

    const costoTotal = parseFloat(comboRuedasCosto) || 0;
    const tallerStr = comboRuedasTaller.trim() || 'Taller de Ruedas / Rulimanes';
    const facturaRef = comboRuedasFactura.trim();

    // Regla Inmutable del Autobús: El odómetro del bus nunca retrocede.
    if (kmTablero > kmActual) {
      saveBusOdometer(activeBusDisco, kmTablero.toString(), 'Combo 4 Ruedas');
      setKmActual(kmTablero);
    }

    let encontradasDel = false;
    let encontradasPost = false;

    let listaActualizada = items.map(it => {
      if (it.codigo === 'MNT-BOCINAS-DEL') {
        encontradasDel = true;
        return {
          ...it,
          ultimoKm: km,
          fechaUltimo: fechaFinal,
          tallerMecanico: tallerStr,
          costoEstimado: costoTotal > 0 ? Math.round(costoTotal * 0.4) : it.costoEstimado,
        };
      }
      if (it.codigo === 'MNT-BOCINAS-POST' || it.codigo === 'MNT-ENGRASE-BOCINAS') {
        encontradasPost = true;
        return {
          ...it,
          codigo: 'MNT-BOCINAS-POST',
          nombre: 'Engrase Bocinas Posteriores',
          categoria: 'RODAJE' as const,
          intervaloKm: 50000,
          ultimoKm: km,
          fechaUltimo: fechaFinal,
          tallerMecanico: tallerStr,
          costoEstimado: costoTotal > 0 ? Math.round(costoTotal * 0.6) : it.costoEstimado,
        };
      }
      return it;
    });

    if (!encontradasDel) {
      listaActualizada.push({
        id: `mbus-bocinas-del-${Date.now()}`,
        codigo: 'MNT-BOCINAS-DEL',
        nombre: 'Engrase Bocinas Delanteras',
        categoria: 'RODAJE',
        intervaloKm: 60000,
        ultimoKm: km,
        fechaUltimo: fechaFinal,
        tallerMecanico: tallerStr,
        costoEstimado: costoTotal > 0 ? Math.round(costoTotal * 0.4) : 90,
        repuestoDetalle: '1.5 kg de grasa de alta temperatura + 2 retenes delanteros (1 por rueda). Desmontaje rápido (1.5 horas).',
        asignadoChofer: false,
        activo: true,
      });
    }

    if (!encontradasPost) {
      listaActualizada.push({
        id: `mbus-bocinas-post-${Date.now()}`,
        codigo: 'MNT-BOCINAS-POST',
        nombre: 'Engrase Bocinas Posteriores',
        categoria: 'RODAJE',
        intervaloKm: 50000,
        ultimoKm: km,
        fechaUltimo: fechaFinal,
        tallerMecanico: tallerStr,
        costoEstimado: costoTotal > 0 ? Math.round(costoTotal * 0.6) : 130,
        repuestoDetalle: '3.5 kg de grasa de alta temperatura + 4 retenes posteriores (2 por rueda). Soporta el 70% del peso del bus y calor de tambores.',
        asignadoChofer: false,
        activo: true,
      });
    }

    saveItems(listaActualizada);

    // Guardar en contabilidad de gastos del socio si se especificó monto
    if (costoTotal > 0) {
      try {
        const expenseId = `EXP-COMBO-4RUEDAS-${Date.now()}`;
        const paradaId = `PARADA-RUEDAS-${Date.now()}`;

        // 1. Guardar parada operativa en historial técnico
        saveParadaPago({
          id: paradaId,
          busId: activeBusId,
          disco: activeBusDisco,
          fecha: fechaFinal,
          estacionId: 'FRENOS_RODAJE',
          estacionNombre: 'Combo 4 Ruedas (Frenos y Rodaje)',
          taller: tallerStr,
          factura: facturaRef || undefined,
          odometroKm: km,
          odometroServicio: km,
          odometroActualBus: kmTablero,
          esRetroactivo: esRetro,
          kmRodadosDesdeServicio: Math.max(0, kmTablero - km),
          costoTotal,
          pagador: 'SOCIO',
          socioModalidad: 'TRANSFERENCIA_TOTAL',
          socioMontoTransferido: costoTotal,
          socioSaldoPendiente: 0,
          ownerExpenseId: expenseId,
          createdAt: new Date().toISOString(),
        });

        // 2. Asentar gasto en contabilidad del socio
        saveOwnerExpense({
          id: expenseId,
          busId: activeBusId,
          expenseDate: fechaFinal,
          createdAt: new Date().toISOString(),
          category: 'FRENOS_RODAJE',
          description: `Engrase Integral Combo 4 Ruedas (Bocinas Delanteras 60k + Posteriores 50k)`,
          provider: tallerStr,
          totalAmount: costoTotal,
          paidAmount: costoTotal,
          pendingBalance: 0,
          paymentMethod: comboRuedasMetodo,
          comprobanteRef: facturaRef ? `Fac/Nota: ${facturaRef}` : undefined,
          status: 'PAGADO',
          notes: `Combo 4 Ruedas. Odómetro servicio: ${km.toLocaleString()} km. Tablero: ${kmTablero.toLocaleString()} km.${esRetro ? ' [Regularización Retroactiva]': ''}`,
        });

        recargarCarteraYParadas();
      } catch (err) {
        console.error('Error al registrar gasto contable de Combo 4 Ruedas:', err);
      }
    }

    toast({
      title: '⚡ Combo 4 Ruedas Asentado con Éxito',
      description: `Bocinas Delanteras (60,000 km) y Posteriores (50,000 km) reseteadas a ${km.toLocaleString()} km.${costoTotal > 0 ? ` Gasto de $${costoTotal.toFixed(2)} registrado en contabilidad.` : ''}`,
    });

    setIsComboRuedasModalOpen(false);
  };

  const handleUpdateKmActual = (nuevoKmStr: string) => {
    const num = parseInt(nuevoKmStr, 10);
    if (!isNaN(num) && num > 0) {
      setKmActual(num);
      localStorage.setItem(`rg_last_km_${activeBusId}`, num.toString());
      toast({
        title: 'Tacómetro Actualizado',
        description: `Odómetro base ajustado a ${num.toLocaleString()} km`,
      });
    }
  };

  const handleUpdateMantenimiento = () => {
    if (!editingItem) return;
    const km = parseInt(newUltimoKm, 10);
    if (isNaN(km) || km <= 0) {
      toast({ title: 'Kilometraje inválido', variant: 'destructive' });
      return;
    }
    const today = new Date().toISOString().split('T')[0];
    const fechaFinal = fechaRegistro || today;
    const costoNum = parseFloat(costoRegistro) || editingItem.costoEstimado || 0;

    // Detectar si el ítem tiene efecto cascada
    const cascadaCodigos = editingItem.codigo ? EFECTO_CASCADA_TRANSMISION[editingItem.codigo] : undefined;
    const itemsCascadaAfectados: string[] = [];

    const updated = items.map(it => {
      if (it.id === editingItem.id) {
        return {
          ...it,
          ultimoKm: km,
          fechaUltimo: fechaFinal,
          costoEstimado: costoNum,
          tallerMecanico: tallerRegistro.trim() || it.tallerMecanico,
        };
      }
      // Efecto cascada: si coincide con los códigos secundarios
      if (cascadaCodigos && it.codigo && cascadaCodigos.includes(it.codigo)) {
        itemsCascadaAfectados.push(it.nombre);
        return {
          ...it,
          ultimoKm: km,
          fechaUltimo: fechaFinal,
        };
      }
      return it;
    });

    // Regla Inmutable: El odómetro del bus solo avanza si el valor ingresado es mayor
    if (km > kmActual) {
      saveBusOdometer(activeBusDisco, km.toString(), 'Mantenimiento ' + editingItem.nombre);
      setKmActual(km);
    }

    saveItems(updated);
    const esRetro = km < kmActual || (fechaFinal < today);

    if (itemsCascadaAfectados.length > 0) {
      toast({
        title: 'Mantenimiento Mayor Registrado',
        description: `${editingItem.nombre} asentado en ${km.toLocaleString()} km. Efecto cascada reseteó: ${itemsCascadaAfectados.join(', ')}.${esRetro ? ` (hace ${(kmActual - km).toLocaleString()} km rodados)` : ''}`,
      });
    } else if (esRetro) {
      const rodados = Math.max(0, kmActual - km);
      toast({
        title: '⚡ Mantenimiento Regularizado',
        description: `${editingItem.nombre} calibrado a ${km.toLocaleString()} km (hace ${rodados.toLocaleString()} km rodados). Odómetro del bus conservado en ${kmActual.toLocaleString()} km.`,
      });
    } else {
      toast({
        title: 'Mantenimiento Registrado',
        description: `${editingItem.nombre} asentado en ${km.toLocaleString()} km`,
      });
    }
    setEditingItem(null);
  };

  const handleToggleChofer = (id: string, asignado: boolean) => {
    const updated = items.map(it => (it.id === id ? { ...it, asignadoChofer: asignado } : it));
    saveItems(updated);
    toast({
      title: asignado ? 'Delegado al Chofer' : 'Retirado de vista Chofer',
      description: asignado
        ? 'El chofer podrá ver y registrar este mantenimiento en carretera.'
        : 'Solo visible para el Socio Propietario.',
    });
  };

  const handleEliminarDelBus = (id: string, nombre: string) => {
    const updated = items.filter(it => it.id !== id);
    saveItems(updated);
    toast({
      title: 'Mantenimiento removido',
      description: `"${nombre}" ya no está asignado a esta unidad.`,
    });
  };

  const handleImportarDeCatalogo = (catItem: MantenimientoCatalogoItem) => {
    // Verificar si ya existe
    const yaExiste = items.some(
      it => it.catalogoId === catItem.id || it.nombre.toLowerCase() === catItem.nombre.toLowerCase()
    );
    if (yaExiste) {
      toast({
        title: 'Ya asignado',
        description: `"${catItem.nombre}" ya forma parte del plan de esta unidad.`,
      });
      return;
    }

    const nuevo: MantenimientoBusItem = {
      id: `mbus-${catItem.id}-${Date.now()}`,
      catalogoId: catItem.id,
      codigo: catItem.codigo,
      nombre: catItem.nombre,
      categoria: catItem.categoria,
      intervaloKm: catItem.intervaloKmOficial,
      ultimoKm: kmActual,
      fechaUltimo: new Date().toISOString().split('T')[0],
      costoEstimado: 0,
      repuestoDetalle: catItem.especificacionLubricanteRepuesto,
      asignadoChofer: catItem.asignadoChoferPorDefecto,
      activo: true,
    };

    saveItems([...items, nuevo]);
    toast({
      title: 'Mantenimiento Activado',
      description: `"${catItem.nombre}" agregado al plan del Bus con intervalo de ${catItem.intervaloKmOficial.toLocaleString()} km.`,
    });
  };



  // Abrir Modal de Estación de Taller (Cargando la receta personalizada de la unidad)
  const handleAbrirEstacionModal = (estacionId: EstacionServicioId, abrirEnModoConfigurar = false) => {
    const config = ESTACIONES_SERVICIO_CONFIG[estacionId];
    if (!config) return;

    // Cargar combo configurado para esta unidad (Fase 1 y 2)
    const comboData = getComboUnidad(currentBus.id, estacionId);
    const iniciales = comboData.codigosPreMarcados;
    
    // Resolver cascada si aplica
    const resueltos = resolverCascadaEstacion(iniciales);

    // Preparar estado de edición de receta
    const checksMap: Record<string, boolean> = {};
    comboData.items.forEach(it => {
      checksMap[it.codigo] = it.preMarcado;
    });
    setComboUnidadItems(comboData.items);
    setComboUnidadChecks(checksMap);
    setComboUnidadExtras(comboData.items.filter(it => !config.items.some(base => base.codigo === it.codigo)).map(it => it.codigo));
    setComboUnidadExcluidos(comboData.codigosExcluidos || []);
    setModoConfigurarCombo(abrirEnModoConfigurar);

    setEstacionSeleccionada(estacionId);
    setEstacionCodigosSeleccionados(resueltos);
    setEstacionKm(kmActual.toString());
    setEstacionModoRetroactivo(false);
    setEstacionKmServicio(kmActual.toString());
    setEstacionFechaServicio(new Date().toISOString().split("T")[0]);
    setEstacionCosto("");
    setEstacionFactura("");
    setEstacionTaller(
      estacionId === "LUBRICADORA" ? "Lubricadora La Fosa - Loja" :
      estacionId === "FRENOS_RUEDAS" ? "Taller de Frenos Don Fausto" :
      estacionId === "MNT_MAYOR" ? "Taller Especializado Hino (Mesías)" :
      estacionId === "ADMISION_AIRE" ? "Taller del Aire y Válvulas" :
      estacionId === "ALINEACION" ? "Serviteca Continental / Llantas" :
      estacionId === "RADIADOR" ? "Taller Radiadores Loja" : "Terminal / Parada"
    );
    setEstacionModalidadPago('PAGO_TOTAL');
    setEstacionMontoAbono('');
    setEstacionMetodoPago('EFECTIVO');
  };

  // Fase 1 y 2: Guardar Receta Personalizada del Combo para la Unidad
  const handleGuardarRecetaCombo = () => {
    if (!estacionSeleccionada) return;
    saveComboUnidad(
      currentBus.id,
      estacionSeleccionada,
      comboUnidadChecks,
      comboUnidadExtras,
      comboUnidadExcluidos
    );
    
    // Actualizar selección activa con los nuevos pre-marcados
    const seleccionados = comboUnidadItems
      .filter(it => comboUnidadChecks[it.codigo])
      .map(it => it.codigo);
    setEstacionCodigosSeleccionados(seleccionados);
    setModoConfigurarCombo(false);

    const descTexto = 'Se actualizó la receta de parada para la unidad ' + (currentBus.numeroDisco || currentBus.id) + '.';
    toast({
      title: '✅ Combo de Unidad Guardado',
      description: descTexto,
    });
  };

  // Fase 1 y 2: Restablecer combo de estación a los valores predeterminados de fábrica
  const handleRestablecerComboBase = () => {
    if (!estacionSeleccionada) return;
    resetComboUnidad(currentBus.id, estacionSeleccionada);
    const comboData = getComboUnidad(currentBus.id, estacionSeleccionada);
    const checksMap: Record<string, boolean> = {};
    comboData.items.forEach(it => {
      checksMap[it.codigo] = it.preMarcado;
    });
    setComboUnidadItems(comboData.items);
    setComboUnidadChecks(checksMap);
    setComboUnidadExtras([]);
    setComboUnidadExcluidos([]);
    setEstacionCodigosSeleccionados(comboData.codigosPreMarcados);
    toast({
      title: 'Receta Restablecida a Fábrica',
      description: 'Se restauraron los componentes oficiales predeterminados para esta estación.',
    });
  };

  // Fase 2: Quitar un componente de la receta de esta unidad
  const handleQuitarItemReceta = (codigo: string, nombre: string) => {
    if (!estacionSeleccionada) return;

    // Protección de seguridad del motor
    if (isItemProtegidoReceta(estacionSeleccionada, codigo)) {
      toast({
        title: 'Componente Vital Protegido',
        description: 'Por seguridad del motor Hino AK, este filtro no puede eliminarse de la receta de Lubricadora.',
        variant: 'destructive',
      });
      return;
    }

    // 1. Remover de la lista visible de items
    setComboUnidadItems(prev => prev.filter(it => it.codigo !== codigo));

    // 2. Limpiar check
    setComboUnidadChecks(prev => {
      const copy = { ...prev };
      delete copy[codigo];
      return copy;
    });

    // 3. Si era un extra añadido por el socio, quitarlo de extras
    setComboUnidadExtras(prev => prev.filter(c => c !== codigo));

    // 4. Si es un componente base de la estación, agregarlo a codigosExcluidos
    const configBase = ESTACIONES_SERVICIO_CONFIG[estacionSeleccionada];
    const esBase = configBase?.items.some(it => it.codigo === codigo);
    if (esBase) {
      setComboUnidadExcluidos(prev => prev.includes(codigo) ? prev : [...prev, codigo]);
    }

    toast({
      title: 'Componente Removido',
      description: `${nombre} ha sido retirado de la receta de esta estación. Pulsa "Guardar Receta" para confirmar.`,
    });
  };

  // Fase 1: Añadir ítem del catálogo maestro a este combo
  const handleAgregarItemExtraACombo = (codigoCat: string) => {
    const catalogo = getCatalogoMaestroGlobal();
    const catItem = catalogo.find(c => c.codigo === codigoCat);
    if (!catItem) return;

    if (comboUnidadItems.some(it => it.codigo === codigoCat)) {
      toast({
        title: 'Componente ya presente',
        description: 'Este ítem ya forma parte de esta estación.',
        variant: 'destructive',
      });
      return;
    }

    // Si estaba previamente excluido, sacarlo de la lista de exclusiones
    setComboUnidadExcluidos(prev => prev.filter(c => c !== codigoCat));

    const nuevoItem: ItemEstacionConfig = {
      codigo: catItem.codigo,
      nombre: catItem.nombre,
      intervaloKm: catItem.intervaloKmOficial || 5000,
      preMarcado: true,
      opcionalTexto: 'Añadido por el socio',
    };

    setComboUnidadItems(prev => [...prev, nuevoItem]);
    setComboUnidadChecks(prev => ({ ...prev, [codigoCat]: true }));
    setComboUnidadExtras(prev => [...prev, codigoCat]);
    setBusquedaExtraModal('');
    toast({
      title: 'Ítem Añadido al Combo',
      description: catItem.nombre + ' ahora está en el combo de esta unidad.',
    });
  };

  // Alternar selección de un ítem dentro del modal de la estación (con resolución de cascada)
  const handleToggleItemEstacion = (codigo: string) => {
    let nuevosCodigos: string[];
    if (estacionCodigosSeleccionados.includes(codigo)) {
      nuevosCodigos = estacionCodigosSeleccionados.filter(c => c !== codigo);
    } else {
      nuevosCodigos = [...estacionCodigosSeleccionados, codigo];
      // Si se activó caja o corona en Mantenimiento Mayor, activar sus dependientes
      nuevosCodigos = resolverCascadaEstacion(nuevosCodigos);
    }
    setEstacionCodigosSeleccionados(nuevosCodigos);
  };

  // Guardar y Asentar Servicio de Estación en el Plan del Bus y Contabilidad del Socio
  const handleGuardarEstacionServicio = () => {
    if (!estacionSeleccionada) return;
    const config = ESTACIONES_SERVICIO_CONFIG[estacionSeleccionada];
    if (!config) return;

    if (estacionCodigosSeleccionados.length === 0) {
      toast({
        title: "Selecciona al menos un ítem",
        description: "Debes marcar al menos un componente realizado en esta estación.",
        variant: "destructive",
      });
      return;
    }

    const kmTablero = parseInt(estacionKm || "", 10) || kmActual;
    const today = new Date().toISOString().split("T")[0];
    let kmServicio = kmTablero;
    let fechaFinal = today;
    let esRetro = false;

    if (estacionModoRetroactivo) {
      const odoHist = parseInt(estacionKmServicio || "", 10);
      if (isNaN(odoHist) || odoHist <= 0) {
        toast({
          title: "Kilometraje histórico inválido",
          description: "Ingresa el kilometraje en que se realizó el cambio en taller.",
          variant: "destructive",
        });
        return;
      }
      if (odoHist > kmTablero) {
        toast({
          title: "Kilometraje inconsistente",
          description: `El cambio (${odoHist.toLocaleString()} km) no puede ser mayor al odómetro actual (${kmTablero.toLocaleString()} km).`,
          variant: "destructive",
        });
        return;
      }
      kmServicio = odoHist;
      fechaFinal = estacionFechaServicio || today;
      esRetro = odoHist < kmTablero || fechaFinal < today;
    }

    // Regla Inmutable del Autobús: El odómetro del bus nunca retrocede.
    if (kmTablero > kmActual) {
      saveBusOdometer(activeBusDisco, kmTablero.toString(), "Taller " + config.nombre);
      setKmActual(kmTablero);
    }
    const costoTotal = parseFloat(estacionCosto) || 0;
    const tallerStr = estacionTaller.trim() || config.nombre;
    const facturaRef = estacionFactura.trim();

    const catalogo = getCatalogoMaestroGlobal();
    const mapCatalogo = new Map<string, MantenimientoCatalogoItem>(catalogo.map(c => [c.codigo, c]));

    const codigosSet = new Set(estacionCodigosSeleccionados);
    const codigosExistentesEnBus = new Set(items.map(it => it.codigo));

    // 1. Actualizar ítems existentes que coincidan con los seleccionados
    const itemsActualizados = items.map(it => {
      if (it.codigo && codigosSet.has(it.codigo)) {
        return {
          ...it,
          ultimoKm: kmServicio,
          fechaUltimo: fechaFinal,
          tallerMecanico: tallerStr,
          costoEstimado: costoTotal > 0 ? Math.round(costoTotal / codigosSet.size) : it.costoEstimado,
        };
      }
      return it;
    });

    // 2. Si hay ítems seleccionados que no estaban agregados al bus, incorporarlos
    const itemsNuevosParaAgregar: MantenimientoBusItem[] = [];
    estacionCodigosSeleccionados.forEach(cod => {
      if (!codigosExistentesEnBus.has(cod)) {
        const catItem = mapCatalogo.get(cod);
        if (catItem) {
          itemsNuevosParaAgregar.push({
            id: `mbus-${catItem.id}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            catalogoId: catItem.id,
            codigo: catItem.codigo,
            nombre: catItem.nombre,
            categoria: catItem.categoria,
            intervaloKm: catItem.intervaloKmOficial,
            ultimoKm: kmServicio,
            fechaUltimo: fechaFinal,
            costoEstimado: costoTotal > 0 ? Math.round(costoTotal / codigosSet.size) : 40,
            repuestoDetalle: catItem.especificacionLubricanteRepuesto,
            tallerMecanico: tallerStr,
            asignadoChofer: catItem.asignadoChoferPorDefecto,
            activo: true,
          });
        }
      }
    });

    const listaFinal = [...itemsActualizados, ...itemsNuevosParaAgregar];
    saveItems(listaFinal);

    // 3. Registrar Egreso Contable Automático y Cartera de Deudas si se especificó costo > 0 (Fase 4)
    if (costoTotal > 0) {
      const categoriaContable = getCategoriaContablePorEstacion(estacionSeleccionada);
      const nombresRealizados = estacionCodigosSeleccionados
        .map(c => mapCatalogo.get(c)?.nombre || c)
        .slice(0, 3)
        .join(", ");

      const expenseId = `exp-mnt-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
      let paidAmount = 0;
      let pendingBalance = 0;
      let expenseStatus: 'PAGADO' | 'PENDIENTE' = 'PAGADO';
      let abonosList: PaymentAbono[] | undefined = undefined;
      let modalidadDesc = '';
      let socioModalidad: SocioModalidadPago = 'TRANSFERENCIA_TOTAL';

      if (estacionModalidadPago === 'PAGO_TOTAL') {
        paidAmount = costoTotal;
        pendingBalance = 0;
        expenseStatus = 'PAGADO';
        modalidadDesc = 'Pago Total 100%';
        socioModalidad = 'TRANSFERENCIA_TOTAL';
      } else if (estacionModalidadPago === 'PAGO_PARCIAL') {
        const abonoNum = parseFloat(estacionMontoAbono || '0') || 0;
        paidAmount = Math.min(costoTotal, Math.max(0, abonoNum));
        pendingBalance = Math.max(0, Math.round((costoTotal - paidAmount) * 100) / 100);
        expenseStatus = pendingBalance <= 0 ? 'PAGADO' : 'PENDIENTE';
        modalidadDesc = `Anticipo Abonado ($${paidAmount.toFixed(2)})`;
        socioModalidad = 'TRANSFERENCIA_PARCIAL';
        if (paidAmount > 0) {
          abonosList = [
            {
              id: 'ABO-' + Date.now(),
              date: today,
              amount: paidAmount,
              paymentMethod: estacionMetodoPago,
              notes: 'Anticipo inicial registrado en parada de taller',
              createdAt: new Date().toISOString(),
            },
          ];
        }
      } else {
        // CREDITO_FIADO
        paidAmount = 0;
        pendingBalance = costoTotal;
        expenseStatus = 'PENDIENTE';
        modalidadDesc = 'Crédito Fiado Taller';
        socioModalidad = 'CREDITO_FIADO';
      }

      const descripcionEgreso = `Parada en ${config.nombre}: ${nombresRealizados}${estacionCodigosSeleccionados.length > 3 ? " y más" : ""} (Km ${kmServicio.toLocaleString()}) - ${modalidadDesc}`;

      // 1. Guardar en Parada Técnica Operativa (Fase 3 y 4)
      saveParadaPago({
        id: 'parada-socio-' + Date.now(),
        busId: activeBusId,
        disco: activeBusDisco,
        fecha: fechaFinal,
        estacionId: estacionSeleccionada,
        estacionNombre: config.nombre,
        taller: tallerStr,
        factura: facturaRef || undefined,
        odometroKm: kmServicio,
        odometroServicio: kmServicio,
        odometroActualBus: kmTablero,
        esRetroactivo: esRetro,
        kmRodadosDesdeServicio: Math.max(0, kmTablero - kmServicio),
        costoTotal,
        pagador: 'SOCIO',
        montoCubiertoAyudante: 0,
        descontadoEnVT: false,
        socioModalidad,
        socioMontoTransferido: paidAmount,
        socioSaldoPendiente: pendingBalance,
        ownerExpenseId: expenseId,
        createdAt: new Date().toISOString(),
      });

      // 2. Asentar gasto en libro contable y cartera de deudas del socio (Fase 4)
      saveOwnerExpenseToApi({
        id: expenseId,
        busId: activeBusId,
        expenseDate: fechaFinal,
        createdAt: new Date().toISOString(),
        category: categoriaContable,
        description: descripcionEgreso,
        provider: tallerStr,
        totalAmount: costoTotal,
        paidAmount,
        pendingBalance,
        paymentMethod: estacionModalidadPago === 'CREDITO_FIADO' ? 'CREDITO_PENDIENTE' : estacionMetodoPago,
        comprobanteRef: facturaRef || undefined,
        abonos: abonosList,
        status: expenseStatus,
        notes: `Servicio en ${config.nombre} con ${estacionCodigosSeleccionados.length} componentes atendidos. Odómetro servicio: ${kmServicio.toLocaleString()} km. Tablero: ${kmTablero.toLocaleString()} km.${esRetro ? ' [Regularización Retroactiva]': ''}`,
      });

      recargarCarteraYParadas();
    }

    if (esRetro) {
      const rodados = Math.max(0, kmTablero - kmServicio);
      toast({
        title: `⚡ Servicio en ${config.nombre} Regularizado`,
        description: `${estacionCodigosSeleccionados.length} componentes calibrados a ${kmServicio.toLocaleString()} km (hace ${rodados.toLocaleString()} km rodados). Odómetro del bus conservado en ${kmTablero.toLocaleString()} km.${costoTotal > 0 ? ` Asentado en fecha ${fechaFinal}.` : ''}`,
      });
    } else {
      toast({
        title: `Servicio en ${config.nombre} Asentado`,
        description: `${estacionCodigosSeleccionados.length} componentes actualizados a ${kmServicio.toLocaleString()} km${costoTotal > 0 ? ` y $${costoTotal.toFixed(2)} registrado en cartera y egresos.` : "."}`,
      });
    }

    setEstacionSeleccionada(null);
  };

  // Gestión de Cartera y Abonos a Talleres (Fase 4)
  const handleAbrirAbonoModal = (debt: OwnerExpense) => {
    setAbonoTargetExpense(debt);
    setAbonoAmount(debt.pendingBalance.toString());
    setAbonoDate(new Date().toISOString().split('T')[0]);
    setAbonoMethod('TRANSFERENCIA');
    setAbonoRef('');
    setAbonoNotes('');
    setIsAbonoModalOpen(true);
  };

  const handleConfirmarAbono = async () => {
    if (!abonoTargetExpense) return;
    const num = parseFloat(abonoAmount);
    if (isNaN(num) || num <= 0) {
      toast({
        title: 'Monto inválido',
        description: 'Ingresa un valor mayor a $0 para el abono.',
        variant: 'destructive',
      });
      return;
    }
    if (num > abonoTargetExpense.pendingBalance) {
      toast({
        title: 'Monto superior al saldo',
        description: `El abono no puede superar el saldo pendiente de $${abonoTargetExpense.pendingBalance.toFixed(2)}.`,
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSubmittingAbono(true);
      const updated = await registerAbonoToApi(abonoTargetExpense.id, {
        date: abonoDate,
        amount: num,
        paymentMethod: abonoMethod,
        comprobanteRef: abonoRef.trim() || undefined,
        notes: abonoNotes.trim() || undefined,
      });

      const nuevoSaldo = updated ? updated.pendingBalance : Math.max(0, abonoTargetExpense.pendingBalance - num);
      toast({
        title: nuevoSaldo <= 0 ? '🎉 Deuda Extinguida (100% Pagada)' : '✅ Abono Asentado en Cartera',
        description: `Abono de $${num.toFixed(2)} registrado para ${abonoTargetExpense.provider || 'Taller'}. Saldo restante: $${nuevoSaldo.toFixed(2)}.`,
      });

      setIsAbonoModalOpen(false);
      setAbonoTargetExpense(null);
      recargarCarteraYParadas();
    } catch (err) {
      console.error('Error registrando abono:', err);
      toast({
        title: 'Error al registrar abono',
        description: 'Ocurrió un error inesperado al asentar el abono.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmittingAbono(false);
    }
  };

  // FASE A: Anulación / Eliminación en Cascada de Paradas Técnicas (Local + Nube)
  const handleConfirmarEliminarParada = async () => {
    if (!paradaParaEliminar) return;
    const ok = await deleteParadaPagoCascada(paradaParaEliminar.id);
    if (ok) {
      toast({
        title: 'Registro de Parada Anulado',
        description: `Se eliminó el servicio en ${paradaParaEliminar.estacionNombre} y se canceló su impacto contable en deudas y caja (local y nube).`,
      });
      recargarCarteraYParadas();
    } else {
      toast({
        title: 'Error al anular registro',
        description: 'No se pudo eliminar el registro seleccionado.',
        variant: 'destructive',
      });
    }
    setParadaParaEliminar(null);
  };

  // FASE A: Limpieza total de paradas de prueba del autobús (Local + Nube)
  const handleConfirmarLimpiarPruebas = async () => {
    const eliminadas = await clearAllParadasByBus(activeBusId);
    toast({
      title: 'Limpieza de Pruebas Completada',
      description: `Se eliminaron ${eliminadas} ${eliminadas === 1 ? 'registro de prueba' : 'registros de prueba'} de la Unidad ${activeBusDisco}. Cartera y deudas saneadas en local y en el servidor.`,
    });
    setModalConfirmLimpiarPruebasOpen(false);
    recargarCarteraYParadas();
  };

  // Cambiar nivel de control rápido (BÁSICO 7, MEDIO 15, TOTAL 27)
  const handleCambiarNivelControl = (nuevoNivel: NivelControlMantenimiento) => {
    setNivelControl(nuevoNivel);
    const catalogo = getCatalogoMaestroGlobal();
    const nuevaConfig: Record<string, boolean> = {};

    if (nuevoNivel === 'TOTAL') {
      catalogo.forEach(c => { nuevaConfig[c.codigo] = true; });
    } else if (nuevoNivel === 'MEDIO') {
      const setMedio = new Set(CODIGOS_NIVEL_MEDIO);
      catalogo.forEach(c => { nuevaConfig[c.codigo] = setMedio.has(c.codigo); });
    } else {
      const setBasico = new Set(CODIGOS_NIVEL_BASICO);
      catalogo.forEach(c => { nuevaConfig[c.codigo] = setBasico.has(c.codigo); });
    }

    setItemsActivosConfig(nuevaConfig);
    saveBusMantenimientoConfigCompleta(activeBusId, {
      moduloActivo: true,
      nivelControl: nuevoNivel,
      itemsActivos: nuevaConfig,
      decisionTomada: true,
    });

    // Asegurar que todos los ítems recomendados del nivel existan en la lista de items del bus
    const codigosExistentes = new Set(items.map(it => it.codigo));
    const itemsNuevosParaAgregar: MantenimientoBusItem[] = [];

    catalogo.forEach(c => {
      const debeEstarActivo = nuevaConfig[c.codigo];
      if (debeEstarActivo && !codigosExistentes.has(c.codigo)) {
        itemsNuevosParaAgregar.push({
          id: `mbus-${c.id}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          catalogoId: c.id,
          codigo: c.codigo,
          nombre: c.nombre,
          categoria: c.categoria,
          intervaloKm: c.intervaloKmOficial,
          ultimoKm: Math.max(0, kmActual - Math.floor(c.intervaloKmOficial * 0.2)),
          fechaUltimo: new Date().toISOString().split('T')[0],
          costoEstimado: c.categoria === 'MOTOR' ? 120 : 50,
          repuestoDetalle: c.especificacionLubricanteRepuesto,
          asignadoChofer: c.asignadoChoferPorDefecto,
          activo: true,
        });
      }
    });

    if (itemsNuevosParaAgregar.length > 0) {
      saveItems([...items, ...itemsNuevosParaAgregar]);
    }

    const plantilla = PLANTILLAS_NIVEL_CONTROL[nuevoNivel];
    toast({
      title: `Nivel ${plantilla.nombre} Activado`,
      description: plantilla.descripcion,
    });
  };

  // Toggle individual de Switch [ON / OFF] por código de ítem
  const handleToggleItemActivo = (codigo: string, valor: boolean, nombre: string) => {
    const updatedConfig = { ...itemsActivosConfig, [codigo]: valor };
    setItemsActivosConfig(updatedConfig);
    saveBusItemsActivosConfig(activeBusId, updatedConfig);

    toast({
      title: valor ? 'Ítem Activado en Plan' : 'Ítem Pausado' ,
      description: `"${nombre}" ${valor ? "se mostrará en tus alertas de tablero" : "quedó en pausa para no saturar tu vista"}.`,
    });
  };

  // Cálculo de semáforos y filtrado con Nivel de Control y Switches
  const itemsFiltrados = useMemo(() => {
    return items.filter(it => {
      // Si el socio optó por ver solo activos y este ítem está apagado en sus switches
      const estaActivoPorSwitch = it.codigo ? (itemsActivosConfig[it.codigo] ?? true) : true;
      if (mostrarSoloActivos && !estaActivoPorSwitch && filtroVista !== 'TODOS') {
        return false;
      }

      if (filtroCategoria !== 'TODAS') {
        if (filtroCategoria === 'RODAJE') {
          if (it.categoria !== 'RODAJE' && it.categoria !== 'SUSPENSION') return false;
        } else if (it.categoria !== filtroCategoria) {
          return false;
        }
      }
      if (filtroVista === 'CHOFER') return it.asignadoChofer;
      if (filtroVista === 'VENCIDOS') {
        const kmRecorridos = kmActual - it.ultimoKm;
        return kmRecorridos >= it.intervaloKm;
      }
      return true;
    });
  }, [items, kmActual, filtroVista, filtroCategoria, itemsActivosConfig, mostrarSoloActivos]);

  const totalVencidos = useMemo(() => {
    return items.filter(it => kmActual - it.ultimoKm >= it.intervaloKm).length;
  }, [items, kmActual]);

  const totalProximos = useMemo(() => {
    return items.filter(it => {
      if (it.codigo && itemsActivosConfig[it.codigo] === false) return false;
      const rest = it.intervaloKm - (kmActual - it.ultimoKm);
      return rest > 0 && rest <= 1000;
    }).length;
  }, [items, kmActual, itemsActivosConfig]);

  const totalActivosCount = useMemo(() => {
    return items.filter(it => !it.codigo || itemsActivosConfig[it.codigo] !== false).length;
  }, [items, itemsActivosConfig]);

  const totalNormales = useMemo(() => {
    return items.filter(it => {
      if (it.codigo && itemsActivosConfig[it.codigo] === false) return false;
      const rest = it.intervaloKm - (kmActual - it.ultimoKm);
      return rest > 1000;
    }).length;
  }, [items, kmActual, itemsActivosConfig]);

  const catalogoOficial = getCatalogoMaestroGlobal();

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#F8FAFC]">
      {/* Header Premium Socio Propietario */}
      <header className="sticky top-0 z-20 bg-slate-900 border-b border-slate-800 text-white shadow-md px-4 py-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 flex items-center justify-center text-white transition"
              aria-label="Volver"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-black tracking-tight">Mantenimiento de Unidad</span>
                {buses.length > 1 ? (
                  <select
                    value={activeBusId}
                    onChange={(e) => {
                      const newBus = setActiveBus(e.target.value);
                      setActiveBusId(newBus.id);
                    }}
                    className="text-[11px] font-black uppercase px-2 py-0.5 rounded-md bg-amber-500 text-slate-950 border-none cursor-pointer focus:ring-2 focus:ring-amber-300 shadow-sm"
                  >
                    {buses.map(b => (
                      <option key={b.id} value={b.id}>
                        Bus {b.numeroDisco} ({b.placa})
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-amber-500 text-slate-950">
                    {currentBus ? `Bus ${currentBus.numeroDisco}` : 'Bus 01'}
                  </span>
                )}
                <Badge className="bg-blue-900/80 text-blue-200 border-blue-700 text-[10px] py-0 px-2">
                  PIN 2107 Socio
                </Badge>
              </div>
              <p className="text-[11px] text-slate-300 font-medium">
                Gestión patrimonial, alertas y delegación a chofer
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsPoliticasModalOpen(true)}
              className="h-9 px-2.5 rounded-xl border-slate-700 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-1.5 active:scale-95"
            >
              <Settings2 className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">Políticas</span>
            </Button>
            <Button
              size="sm"
              onClick={() => setIsCatalogoModalOpen(true)}
              className="h-9 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-sm active:scale-95"
            >
              <BookOpen className="w-4 h-4" />
              <span className="hidden sm:inline">Biblioteca</span> Hino AK
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 py-4 max-w-xl mx-auto w-full flex flex-col gap-4 pb-20">
        {/* BANNER GERENCIAL DE CONTROL OPTATIVO DEL MÓDULO */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-4 shadow-sm flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className={`w-9 h-9 rounded-2xl flex items-center justify-center ${moduloActivo ? "bg-emerald-500/10 text-emerald-600" : "bg-slate-100 text-slate-400"}`}>
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
                    Supervisión y Semáforo de Cumplimiento
                  </span>
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${moduloActivo ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>
                    {moduloActivo ? "Auditando Conductor" : "Solo Operativo"}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[9px] font-bold text-slate-500 bg-slate-100/90 px-2 py-0.5 rounded-full border border-slate-200/60">
                    <Cloud className={`w-3 h-3 ${isCloudSyncing ? "text-amber-500 animate-pulse" : "text-blue-600"}`} />
                    <span>{isCloudSyncing ? "Sincronizando..." : "Sincronizado en la nube (Móvil & PC)"}</span>
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-tight mt-0.5">
                  {moduloActivo
                    ? "Monitorea si el conductor cumple los mantenimientos. El tacómetro se sincroniza del arqueo que entrega el ayudante al terminar el VT. Tu configuración se conserva en la nube entre tu celular y tu PC."
                    : "Módulo pausado. Tu unidad opera exclusivamente con boletaje, vueltas y liquidación de caja diaria."}
                </p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <Switch
                checked={moduloActivo}
                onCheckedChange={handleToggleModuloActivo}
                className="data-[state=checked]:bg-emerald-600"
              />
              <span className="text-[9px] font-bold text-slate-400">
                {moduloActivo ? "Activado" : "Pausado"}
              </span>
            </div>
          </div>
        </div>

        {!moduloActivo ? (
          /* VISTA INICIAL DE ONBOARDING / BIENVENIDA CUANDO EL SOCIO DECIDE SI ACTIVAR O NO */
          <div className="bg-white rounded-3xl border-2 border-amber-200/80 p-6 shadow-md flex flex-col items-center text-center gap-5 my-2">
            <div className="w-16 h-16 rounded-3xl bg-amber-500/15 border border-amber-300 text-amber-900 flex items-center justify-center shadow-xs">
              <Wrench className="w-8 h-8 text-amber-600" />
            </div>
            <div className="flex flex-col gap-1.5 max-w-md">
              <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 w-fit mx-auto">
                Módulo Optativo del Socio
              </span>
              <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">
                ¿Deseas supervisar mantenimientos en esta unidad?
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Como socio propietario, tú decides si tu chofer reporta cambios de aceite y desgastes mecánicos en sus 3 toques, o si prefieres trabajar únicamente con boletos, vueltas y arqueo de caja.
              </p>
            </div>

            {/* Opciones de Niveles para elegir */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 w-full text-left">
              <div
                onClick={() => solicitarConfirmacionNivel('BASICO', true)}
                className="cursor-pointer p-3.5 rounded-2xl border-2 border-emerald-500/40 bg-emerald-50/40 hover:bg-emerald-50 hover:border-emerald-600 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-black text-emerald-950">1. BÁSICO</span>
                    <span className="text-[9px] font-black px-1.5 py-0.5 bg-emerald-200 text-emerald-900 rounded">7 Ítems</span>
                  </div>
                  <p className="text-[11px] text-emerald-800 leading-snug">
                    Aceite de motor, tríada de filtros (aceite, combustible y trampa de agua) y engrase de chasis.
                  </p>
                </div>
                <Button size="sm" className="mt-3 w-full h-8 text-[10px] font-black bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl">
                  Activar Básico
                </Button>
              </div>

              <div
                onClick={() => solicitarConfirmacionNivel('MEDIO', true)}
                className="cursor-pointer p-3.5 rounded-2xl border-2 border-amber-500/40 bg-amber-50/40 hover:bg-amber-50 hover:border-amber-600 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-black text-amber-950">2. MEDIO</span>
                    <span className="text-[9px] font-black px-1.5 py-0.5 bg-amber-200 text-amber-900 rounded">15 Ítems</span>
                  </div>
                  <p className="text-[11px] text-amber-800 leading-snug">
                    Básico + Raches de frenos, zapatas, filtros de aire, valvulinas y alineación de llantas.
                  </p>
                </div>
                <Button size="sm" className="mt-3 w-full h-8 text-[10px] font-black bg-amber-600 hover:bg-amber-700 text-white rounded-xl">
                  Activar Recomendado
                </Button>
              </div>

              <div
                onClick={() => solicitarConfirmacionNivel('TOTAL', true)}
                className="cursor-pointer p-3.5 rounded-2xl border-2 border-blue-500/40 bg-blue-50/40 hover:bg-blue-50 hover:border-blue-600 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-black text-blue-950">3. TOTAL</span>
                    <span className="text-[9px] font-black px-1.5 py-0.5 bg-blue-200 text-blue-900 rounded">27 Ítems</span>
                  </div>
                  <p className="text-[11px] text-blue-800 leading-snug">
                    Catálogo oficial Hino AK completo: embrague, corona, bocinas, radiador y bajada de motor.
                  </p>
                </div>
                <Button size="sm" className="mt-3 w-full h-8 text-[10px] font-black bg-blue-700 hover:bg-blue-800 text-white rounded-xl">
                  Activar Total Hino
                </Button>
              </div>
            </div>

            <div className="w-full pt-3 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
              <span className="text-[11px]">
                Si no deseas usar mantenimiento preventivo ahora, tu unidad opera 100% normal con caja y boletos.
              </span>
              <button
                type="button"
                onClick={() => {
                  handleToggleModuloActivo(false);
                  onBack();
                }}
                className="text-xs font-bold text-slate-700 hover:text-slate-900 underline cursor-pointer"
              >
                Volver a la pantalla principal
              </button>
            </div>
          </div>
        ) : (
          <>
        {/* Odómetro Actual del Tablero */}
        <Card className="rounded-3xl border-none bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white shadow-lg overflow-hidden">
          <CardContent className="p-4.5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Gauge className="w-5 h-5 text-amber-400" />
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Odómetro / Tacómetro Actual
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Auditado Flota
                </span>
              </div>
            </div>

            <div className="flex items-baseline justify-between mb-3">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black tracking-tight text-white">
                  {(kmActual ?? 187420).toLocaleString()}
                </span>
                <span className="text-sm font-bold text-amber-400">km</span>
              </div>

              {/* Indicadores rápidos de estado */}
              <div className="flex items-center gap-2">
                {totalVencidos > 0 && (
                  <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-rose-600/90 text-white flex items-center gap-1 animate-pulse">
                    <AlertTriangle className="w-3.5 h-3.5" /> {totalVencidos} vencidos
                  </span>
                )}
                {totalProximos > 0 && (
                  <span className="text-xs font-bold px-2 py-1 rounded-lg bg-amber-500 text-slate-950 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> {totalProximos} próximos
                  </span>
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-300">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Tacómetro alimentado del arqueo de caja registrado por el ayudante al cerrar el VT</span>
              </div>
              <button
                type="button"
                onClick={() => setMostrarCalibrarOdo(!mostrarCalibrarOdo)}
                className="text-[10px] font-bold text-amber-400 hover:text-amber-300 underline cursor-pointer"
              >
                {mostrarCalibrarOdo ? "Cerrar ajuste" : "Calibrar manual"}
              </button>
            </div>

            {mostrarCalibrarOdo && (
              <div className="mt-3 p-3 rounded-2xl bg-black/30 border border-white/10 flex items-center gap-2">
                <Input
                  type="number"
                  placeholder="Ajustar tacómetro actual..."
                  defaultValue={kmActual}
                  onBlur={e => handleUpdateKmActual(e.target.value)}
                  className="h-8 rounded-xl bg-white/10 border-white/20 text-white text-xs placeholder:text-white/40 font-bold"
                />
                <span className="text-[10px] text-slate-300 shrink-0 font-medium">
                  Guardar ajuste
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ========================================================= */}
        {/* ASISTENTE DE NIVELES DE CONTROL (BÁSICO 7 | MEDIO 15 | TOTAL 27) */}
        {/* ========================================================= */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-3.5 shadow-xs flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-slate-700" />
              <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
                Nivel de Control de Unidad
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-slate-500 font-bold">Solo Activos</span>
              <Switch
                checked={mostrarSoloActivos}
                onCheckedChange={setMostrarSoloActivos}
                className="data-[state=checked]:bg-slate-900 scale-75"
              />
            </div>
          </div>

          {/* Botonera de 3 Niveles */}
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => solicitarConfirmacionNivel('BASICO', false)}
              className={`flex flex-col items-center justify-center p-2 rounded-2xl border transition-all text-center cursor-pointer ${
                nivelControl === 'BASICO'
                  ? 'bg-emerald-500/10 border-emerald-500 text-emerald-950 shadow-xs ring-1 ring-emerald-500/50'
                  : 'bg-slate-50/80 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-1">
                <span className={`w-2 h-2 rounded-full ${nivelControl === 'BASICO' ? 'bg-emerald-600' : 'bg-slate-300'}`} />
                <span className="text-xs font-black">BÁSICO</span>
              </div>
              <span className="text-[10px] font-extrabold text-emerald-700 mt-0.5">7 Ítems</span>
              <span className="text-[9px] text-slate-500 leading-tight hidden sm:block">Esenciales & Vital</span>
            </button>

            <button
              type="button"
              onClick={() => solicitarConfirmacionNivel('MEDIO', false)}
              className={`flex flex-col items-center justify-center p-2 rounded-2xl border transition-all text-center cursor-pointer ${
                nivelControl === 'MEDIO'
                  ? 'bg-amber-500/10 border-amber-500 text-amber-950 shadow-xs ring-1 ring-amber-500/50'
                  : 'bg-slate-50/80 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-1">
                <span className={`w-2 h-2 rounded-full ${nivelControl === 'MEDIO' ? 'bg-amber-500' : 'bg-slate-300'}`} />
                <span className="text-xs font-black">MEDIO</span>
              </div>
              <span className="text-[10px] font-extrabold text-amber-700 mt-0.5">15 Ítems</span>
              <span className="text-[9px] text-slate-500 leading-tight hidden sm:block">Operativo & Rodaje</span>
            </button>

            <button
              type="button"
              onClick={() => solicitarConfirmacionNivel('TOTAL', false)}
              className={`flex flex-col items-center justify-center p-2 rounded-2xl border transition-all text-center cursor-pointer ${
                nivelControl === 'TOTAL'
                  ? 'bg-blue-500/10 border-blue-500 text-blue-950 shadow-xs ring-1 ring-blue-500/50'
                  : 'bg-slate-50/80 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-1">
                <span className={`w-2 h-2 rounded-full ${nivelControl === 'TOTAL' ? 'bg-blue-600' : 'bg-slate-300'}`} />
                <span className="text-xs font-black">TOTAL</span>
              </div>
              <span className="text-[10px] font-extrabold text-blue-700 mt-0.5">27 Ítems</span>
              <span className="text-[9px] text-slate-500 leading-tight hidden sm:block">Hino AK Completo</span>
            </button>
          </div>

          <div className="px-1 text-[11px] text-slate-500 flex items-center justify-between">
            <span>{PLANTILLAS_NIVEL_CONTROL[nivelControl].descripcion}</span>
            <span className="text-[10px] font-extrabold text-slate-700 shrink-0 ml-2">
              {Object.values(itemsActivosConfig).filter(Boolean).length} activos
            </span>
          </div>
        </div>

        {/* ========================================================= */}
        {/* BOTONERA DE 6 ESTACIONES DE TALLER (COMBOS DE PARADA)     */}
        {/* ========================================================= */}
        <div className="bg-slate-900 text-white rounded-3xl p-4 shadow-lg flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-black uppercase tracking-wider text-amber-300">
                Estaciones de Taller (Combos de Parada)
              </span>
            </div>
            <span className="text-[10px] font-bold text-slate-400">
              Toque rápido de fosa
            </span>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {(["LUBRICADORA", "FRENOS_RUEDAS", "MNT_MAYOR", "ADMISION_AIRE", "ALINEACION", "RADIADOR"] as EstacionServicioId[]).map(estId => {
              const est = ESTACIONES_SERVICIO_CONFIG[estId];
              return (
                <div key={estId} className="flex flex-col">
                  <button
                    type="button"
                    onClick={() => handleAbrirEstacionModal(estId, false)}
                    className="w-full flex flex-col items-center justify-center p-2 rounded-2xl bg-white/5 hover:bg-white/10 active:scale-95 border border-white/10 transition-all cursor-pointer text-center group"
                  >
                    <span className="text-xl mb-0.5 group-hover:scale-110 transition-transform">
                      {est.icono}
                    </span>
                    <span className="text-[11px] font-black text-slate-100 leading-tight">
                      {est.nombre.split(" ")[0]}
                    </span>
                    <span className="text-[9px] text-amber-400 font-semibold mt-0.5">
                      {getComboUnidad(currentBus.id, estId).items.length} ítems
                    </span>
                  </button>
                  <button
                    type="button"
                    title="Afinar receta del combo para mi unidad"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAbrirEstacionModal(estId, true);
                    }}
                    className="mt-1 py-0.5 px-1 rounded-lg bg-amber-400/10 hover:bg-amber-400/25 active:scale-95 text-[9px] font-bold text-amber-300 border border-amber-400/20 text-center transition-all cursor-pointer"
                  >
                    ⚙️ Mi Receta
                  </button>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-white/10">
            <span>Registra todo el paquete del taller con 1 factura y 1 odómetro.</span>
            <button
              type="button"
              onClick={() => handleAbrirEstacionModal("CHOFER_RUTINA")}
              className="text-[10px] font-extrabold text-amber-400 hover:text-amber-300 underline cursor-pointer"
            >
              🚌 Rutina Chofer
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* CARTERA DE CUENTAS POR PAGAR A TALLERES (FASE 4)          */}
        {/* ========================================================= */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-4 shadow-xs flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600">
                <CreditCard className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
                    Cartera de Deudas con Talleres
                  </span>
                  {deudasTalleres.length > 0 ? (
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                      {deudasTalleres.length} {deudasTalleres.length === 1 ? 'pendiente' : 'pendientes'}
                    </span>
                  ) : (
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Al Día
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-500">
                  {deudasTalleres.length > 0
                    ? `Total por saldar: $${deudasTalleres.reduce((sum, d) => sum + d.pendingBalance, 0).toFixed(2)}`
                    : 'Cuentas liquidadas al 100% con talleres y proveedores'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsDebtsReportModalOpen(true)}
                className="py-1 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                title="Ver Cartera Completa y Descargar PDF"
              >
                <FileDown className="w-3 h-3 text-slate-500" />
                <span>Reporte PDF</span>
              </button>

              {onGoToSocioGastos && (
                <button
                  type="button"
                  onClick={onGoToSocioGastos}
                  className="py-1 px-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                  title="Ir al Libro Contable de Egresos de Socio"
                >
                  <BookOpen className="w-3 h-3 text-amber-600" />
                  <span className="hidden sm:inline">Libro Gastos</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setSeccionCarteraColapsada(!seccionCarteraColapsada)}
                className="p-1 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
              >
                {seccionCarteraColapsada ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {!seccionCarteraColapsada && (
            <>
              {deudasTalleres.length === 0 ? (
                <div className="p-3 bg-emerald-50/60 border border-emerald-200/80 rounded-2xl flex items-center gap-3">
                  <div className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div className="text-[11px] text-emerald-900 leading-tight">
                    <p className="font-bold">Sin deudas pendientes con talleres mecánicos.</p>
                    <p className="text-[10px] text-emerald-700">Todos los servicios de esta unidad han sido liquidados o transferidos en su totalidad.</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {deudasTalleres.map(debt => (
                    <div
                      key={debt.id}
                      className="p-3 rounded-2xl border border-amber-200/80 bg-amber-50/30 flex flex-col gap-2 transition-all hover:border-amber-300"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-black text-slate-900 truncate">
                              {debt.provider || 'Taller Mecánico'}
                            </span>
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-900">
                              {debt.category}
                            </span>
                            {debt.comprobanteRef && (
                              <span className="text-[9px] text-slate-500 font-mono">
                                {debt.comprobanteRef}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-600 mt-0.5 line-clamp-1">
                            {debt.description}
                          </p>
                          <span className="text-[9px] text-slate-400">
                            Fecha de servicio: {debt.expenseDate}
                          </span>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-rose-600 block">
                            Saldo por Pagar
                          </span>
                          <span className="text-sm font-black text-rose-600">
                            ${debt.pendingBalance.toFixed(2)}
                          </span>
                          <span className="text-[9px] text-slate-400 block">
                            de ${debt.totalAmount.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* Progreso y Botón de Abono */}
                      <div className="pt-2 border-t border-amber-200/50 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-[10px] text-slate-500">
                          <span>Abonado: <strong className="text-emerald-700">${debt.paidAmount.toFixed(2)}</strong></span>
                          {debt.abonos && debt.abonos.length > 0 && (
                            <span className="px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-700 font-bold text-[9px]">
                              {debt.abonos.length} {debt.abonos.length === 1 ? 'abono' : 'abonos'}
                            </span>
                          )}
                        </div>

                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleAbrirAbonoModal(debt)}
                          className="h-7 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <CreditCard className="w-3 h-3 text-amber-400" />
                          <span>Registrar Abono</span>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* ========================================================= */}
        {/* HISTORIAL DE PARADAS DE TALLER DE LA UNIDAD (FASE 3 Y 4)   */}
        {/* ========================================================= */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-4 shadow-xs flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-600">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-black text-slate-900 uppercase tracking-wider block">
                  Historial de Paradas en Taller
                </span>
                <p className="text-[10px] text-slate-500">
                  {paradasTallerHistorial.length} {paradasTallerHistorial.length === 1 ? 'registro' : 'registros'} operativos sincronizados
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {paradasTallerHistorial.length > 0 && (
                <button
                  type="button"
                  onClick={() => setModalConfirmLimpiarPruebasOpen(true)}
                  className="px-2 py-1 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-[10px] font-bold transition-all flex items-center gap-1 border border-rose-200 cursor-pointer"
                  title="Eliminar todos los registros de prueba de este autobús"
                >
                  <Trash2 className="w-3 h-3 text-rose-600" />
                  <span className="hidden sm:inline">Limpiar Pruebas</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setSeccionParadasColapsada(!seccionParadasColapsada)}
                className="p-1 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
              >
                {seccionParadasColapsada ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {!seccionParadasColapsada && (
            <>
              {paradasTallerHistorial.length === 0 ? (
                <p className="text-xs text-slate-400 p-2 text-center">
                  No hay paradas en fosa registradas para esta unidad aún.
                </p>
              ) : (
                <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
                  {paradasTallerHistorial.slice(0, 10).map(p => {
                    const esAyudante = p.pagador === 'AYUDANTE';
                    const tieneSaldo = (p.socioSaldoPendiente || 0) > 0;
                    return (
                      <div
                        key={p.id}
                        className="p-2.5 rounded-2xl border border-slate-200 bg-slate-50/60 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-xs text-slate-900 truncate">
                              {p.estacionNombre}
                            </span>
                            <span className="text-[10px] font-mono text-slate-500">
                              {p.odometroKm.toLocaleString()} km
                            </span>
                            <span className="text-[9px] text-slate-400">
                              {p.fecha}
                            </span>
                            {p.esRetroactivo && (
                              <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300">
                                ⏱️ Regularizado ({p.odometroServicio?.toLocaleString() || p.odometroKm.toLocaleString()} km)
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-600">
                            <span>{p.taller}</span>
                            {p.factura && <span className="font-mono text-slate-400">• Fac: {p.factura}</span>}
                          </div>
                          
                          {/* Sello de Modalidad */}
                          <div className="mt-1 flex items-center gap-1 flex-wrap">
                            {esAyudante ? (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-800">
                                🚌 Pagado por Ayudante en Ruta (${p.montoCubiertoAyudante.toFixed(2)}) {p.descontadoEnVT ? '• Descontado en VT' : '• Pendiente de VT'}
                              </span>
                            ) : p.socioModalidad === 'TRANSFERENCIA_TOTAL' ? (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                                🏦 Transferencia Socio 100% Pagada
                              </span>
                            ) : p.socioModalidad === 'TRANSFERENCIA_PARCIAL' ? (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-900">
                                ⚠️ Anticipo ${(p.socioMontoTransferido || 0).toFixed(2)} • Saldo: ${(p.socioSaldoPendiente || 0).toFixed(2)}
                              </span>
                            ) : (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-800">
                                💳 Crédito Fiado • Saldo: ${(p.socioSaldoPendiente || 0).toFixed(2)}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-right shrink-0 flex flex-col items-end gap-1">
                          <span className="font-black text-xs text-slate-900">
                            ${p.costoTotal.toFixed(2)}
                          </span>
                          <div className="flex items-center gap-1">
                            {tieneSaldo && p.ownerExpenseId && (
                              <button
                                type="button"
                                onClick={() => {
                                  const targetExp = allOwnerExpenses.find(e => e.id === p.ownerExpenseId) || deudasTalleres.find(d => d.id === p.ownerExpenseId);
                                  if (targetExp) {
                                    handleAbrirAbonoModal(targetExp);
                                  }
                                }}
                                className="py-1 px-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-[10px] cursor-pointer shadow-xs"
                              >
                                Abonar
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setParadaParaEliminar(p)}
                              className="p-1 rounded-lg hover:bg-rose-100 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                              title="Anular / Eliminar este registro"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>


        {/* ========================================================= */}
        {/* SEMÁFORO EJECUTIVO DE SALUD DE FLOTA (RESUMEN EN 3 SEGUNDOS) */}
        {/* ========================================================= */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-3.5 shadow-xs flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
              Estado de Salud de Unidad ({totalActivosCount} Activos)
            </span>
            {totalVencidos === 0 && totalProximos === 0 ? (
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Estado Óptimo
              </span>
            ) : totalVencidos > 0 ? (
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 animate-pulse flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Atención Inmediata
              </span>
            ) : (
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Próximos Servicios
              </span>
            )}
          </div>

          {/* 3 Bloques Semafóricos Interactivos */}
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setFiltroVista(filtroVista === "TODOS" ? "TODOS" : "TODOS")}
              className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                filtroVista === "TODOS"
                  ? "border-emerald-500 bg-emerald-50/50 shadow-xs ring-1 ring-emerald-500"
                  : "border-slate-200 bg-slate-50/70 hover:bg-slate-100/70"
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span className="text-[11px] font-bold text-slate-600">En Regla</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-black text-slate-900">{totalNormales}</span>
                <span className="text-[10px] text-slate-500">ítems</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setFiltroVista(filtroVista === "CHOFER" ? "TODOS" : "CHOFER")}
              className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                filtroVista === "CHOFER"
                  ? "border-amber-500 bg-amber-50/50 shadow-xs ring-1 ring-amber-500"
                  : "border-slate-200 bg-slate-50/70 hover:bg-slate-100/70"
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                <span className="text-[11px] font-bold text-slate-600">Por Vencer</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-black text-amber-700">{totalProximos}</span>
                <span className="text-[10px] text-slate-500">&lt; 1,000 km</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setFiltroVista(filtroVista === "VENCIDOS" ? "TODOS" : "VENCIDOS")}
              className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                filtroVista === "VENCIDOS"
                  ? "border-rose-500 bg-rose-50/50 shadow-xs ring-1 ring-rose-500"
                  : "border-slate-200 bg-slate-50/70 hover:bg-slate-100/70"
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-600"></span>
                <span className="text-[11px] font-bold text-slate-600">Vencidos</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-black text-rose-700">{totalVencidos}</span>
                <span className="text-[10px] text-slate-500">urgentes</span>
              </div>
            </button>
          </div>
        </div>

        {/* Chips de Categorías Técnicas */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
          {[
            { id: 'TODAS', label: 'Todas las Áreas' },
            { id: 'MOTOR', label: '🛢️ Motor' },
            { id: 'TRANSMISION', label: '⚙️ Transmisión' },
            { id: 'FRENOS', label: '🛑 Frenos' },
            { id: 'SISTEMA_AIRE', label: '💨 Admisión / Aire' },
            { id: 'RODAJE', label: '🔄 Rodaje y Suspensión' },
          ].map(cat => {
            const count = cat.id === 'TODAS'
              ? items.length
              : cat.id === 'RODAJE'
              ? items.filter(i => i.categoria === 'RODAJE' || i.categoria === 'SUSPENSION').length
              : items.filter(i => i.categoria === cat.id).length;
            const isSelected = filtroCategoria === cat.id;

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setFiltroCategoria(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span>{cat.label}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isSelected ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600 font-extrabold'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Banner Exclusivo: Bloque 1 - MOTOR */}
        {filtroCategoria === 'MOTOR' && (
          <div className="bg-blue-50/90 border border-blue-200 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-xs text-blue-950">🛢️ Bloque 1: MOTOR (Homologación Hino AK)</span>
                <Badge className="bg-blue-200 text-blue-900 text-[10px] font-black border-0">
                  9 Ítems Oficiales
                </Badge>
              </div>
              <p className="text-[11px] text-blue-800/80 mt-0.5">
                Aceite, Filtros (Aceite, Trampa, Diésel Fino), Calibración Válvulas, Bandas, Termostato, Radiador/Intercooler/Coolant y Metales.
              </p>
            </div>
            {items.filter(i => i.categoria === 'MOTOR').length < 9 && (
              <Button
                size="sm"
                onClick={handleSincronizarBloqueMotor}
                className="h-8 px-3 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-black text-xs shrink-0 self-start sm:self-center shadow-xs"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                Cargar los 9 de Motor
              </Button>
            )}
          </div>
        )}

        {/* Banner Exclusivo: Bloque 2 - TRANSMISIÓN */}
        {filtroCategoria === 'TRANSMISION' && (
          <div className="bg-emerald-50/90 border border-emerald-200 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-xs text-emerald-950">⚙️ Bloque 2: TRANSMISIÓN (Homologación Hino AK)</span>
                <Badge className="bg-emerald-200 text-emerald-900 text-[10px] font-black border-0">
                  5 Ítems Oficiales
                </Badge>
              </div>
              <p className="text-[11px] text-emerald-800/80 mt-0.5">
                Aceite Caja (30k GL-4), Aceite Corona (30k GL-5), Kit Embrague (100k) y Overhaul con Efecto Cascada (150k).
              </p>
            </div>
            {items.filter(i => i.categoria === 'TRANSMISION').length < 5 && (
              <Button
                size="sm"
                onClick={handleSincronizarBloqueTransmision}
                className="h-8 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs shrink-0 self-start sm:self-center shadow-xs"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                Homologar Transmisión
              </Button>
            )}
          </div>
        )}

        {/* Banner Exclusivo: Bloque 3 - ADMISIÓN Y AIRE */}
        {filtroCategoria === 'SISTEMA_AIRE' && (
          <div className="bg-sky-50/90 border border-sky-200 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-xs text-sky-950">💨 Bloque 3: ADMISIÓN Y AIRE (Homologación Hino AK)</span>
                <Badge className="bg-sky-200 text-sky-900 text-[10px] font-black border-0">
                  5 Ítems Oficiales
                </Badge>
              </div>
              <p className="text-[11px] text-sky-800/80 mt-0.5">
                Soplado Filtro (5k), Lavado Malla Pasillo (5k), Ajuste Mangueras (10k), Filtro Pequeño (20k) y Filtro Grande (40k).
              </p>
            </div>
            {items.filter(i => i.categoria === 'SISTEMA_AIRE').length < 5 && (
              <Button
                size="sm"
                onClick={handleSincronizarBloqueAire}
                className="h-8 px-3 rounded-xl bg-sky-700 hover:bg-sky-800 text-white font-black text-xs shrink-0 self-start sm:self-center shadow-xs cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                Homologar Admisión y Aire
              </Button>
            )}
          </div>
        )}

        {/* Banner Exclusivo: Bloque 4 - RODAJE Y SUSPENSIÓN */}
        {filtroCategoria === 'RODAJE' && (
          <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-xs text-amber-950">🔄 Bloque 4: RODAJE Y SUSPENSIÓN (Homologación Hino AK)</span>
                <Badge className="bg-amber-200 text-amber-900 text-[10px] font-black border-0">
                  5 Ítems Oficiales
                </Badge>
              </div>
              <p className="text-[11px] text-amber-800/80 mt-0.5">
                Engrase Chasis (1.5k), Alineación Llantas (15k), Bocinas Post (50k), Bocinas Del (60k) y Muelles/Bujes (50k).
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
              <Button
                size="sm"
                onClick={() => {
                  setComboRuedasKm(kmActual.toString());
                  setComboRuedasModoRetroactivo(false);
                  setComboRuedasKmServicio(kmActual.toString());
                  setComboRuedasFechaServicio(new Date().toISOString().split('T')[0]);
                  setComboRuedasCosto('');
                  setComboRuedasFactura('');
                  setComboRuedasTaller('');
                  setIsComboRuedasModalOpen(true);
                }}
                className="h-8 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Combo 4 Ruedas
              </Button>
              <Button
                size="sm"
                onClick={handleSincronizarBloqueRodaje}
                className="h-8 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs shadow-xs flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                Homologar Rodaje
              </Button>
            </div>
          </div>
        )}

        {/* Banner Exclusivo: Bloque 5 - FRENOS */}
        {filtroCategoria === 'FRENOS' && (
          <div className="bg-rose-50/90 border border-rose-200 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-xs text-rose-950">🛑 Bloque 5: FRENOS (Homologación Hino AK)</span>
                <Badge className="bg-rose-200 text-rose-900 text-[10px] font-black border-0">
                  3 Ítems Oficiales
                </Badge>
              </div>
              <p className="text-[11px] text-rose-800/80 mt-0.5">
                Calibración Raches (800 km - Chofer), Zapatas Posteriores (8,000 km) y Zapatas Delanteras (11,000 km).
              </p>
            </div>
            {items.filter(i => i.categoria === 'FRENOS').length < 3 && (
              <Button
                size="sm"
                onClick={handleSincronizarBloqueFrenos}
                className="h-8 px-3 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-black text-xs shrink-0 self-start sm:self-center shadow-xs cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                Homologar Frenos
              </Button>
            )}
          </div>
        )}

        {/* Lista de Mantenimientos Asignados */}
        <div className="flex flex-col gap-3">
          {itemsFiltrados.length === 0 ? (
            <Card className="rounded-2xl border-dashed border-2 border-gray-200 bg-white p-6 text-center">
              <p className="text-xs text-gray-500 font-medium">
                No hay mantenimientos activos bajo este filtro.
              </p>
              <Button
                size="sm"
                onClick={() => setIsCatalogoModalOpen(true)}
                className="mt-3 h-8 text-xs font-bold bg-slate-900 text-white"
              >
                Abrir Biblioteca Hino AK
              </Button>
            </Card>
          ) : (
            itemsFiltrados.map(item => {
              const kmRecorridos = kmActual - item.ultimoKm;
              const kmRestantes = item.intervaloKm - kmRecorridos;
              const porcentaje = Math.min(100, Math.max(0, (kmRecorridos / item.intervaloKm) * 100));
              const esVencido = kmRestantes <= 0;
              const esUrgente = kmRestantes > 0 && kmRestantes <= 1000;
              const itemEstaActivo = !item.codigo || itemsActivosConfig[item.codigo] !== false;

                return (
                  <Card
                    key={item.id}
                    className={`rounded-2xl border transition-all ${
                      !itemEstaActivo
                        ? "border-slate-200 bg-slate-50/60 opacity-60"
                        : esVencido
                        ? "border-rose-300 bg-rose-50/30 shadow-xs ring-1 ring-rose-200"
                        : esUrgente
                        ? "border-amber-300 bg-amber-50/30"
                        : "border-slate-200/90 bg-white hover:border-slate-300"
                    }`}
                  >
                    <CardContent className="p-3.5 space-y-2.5">
                      {/* Fila superior: Identificación, Delegación y Switch Activo */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap mb-1">
                            {item.codigo && (
                              <span className="text-[9px] font-mono font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                                {item.codigo}
                              </span>
                            )}
                            <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200/60">
                              {item.categoria ? item.categoria.replace("_", " ") : "Mecánica"}
                            </span>
                            {item.asignadoChofer ? (
                              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-0.5">
                                <UserCheck className="w-2.5 h-2.5" /> Chofer en Fosa
                              </span>
                            ) : (
                              <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                                🔧 Serviteca / Taller
                              </span>
                            )}
                          </div>
                          <h4 className="font-extrabold text-sm text-slate-900 truncate">
                            {item.nombre}
                          </h4>
                          {item.repuestoDetalle && (
                            <p className="text-[11px] text-slate-500 truncate">
                              ⚙️ {item.repuestoDetalle}
                            </p>
                          )}
                        </div>

                        {/* Estado Semafórico y Switch individual */}
                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          <span
                            className={`text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                              !itemEstaActivo
                                ? "bg-slate-200 text-slate-600"
                                : esVencido
                                ? "bg-rose-600 text-white shadow-xs animate-pulse"
                                : esUrgente
                                ? "bg-amber-500 text-slate-950 font-black"
                                : "bg-emerald-100 text-emerald-800"
                            }`}
                          >
                            {!itemEstaActivo ? "Pausado" : esVencido ? "¡Cambio Urgente!" : esUrgente ? "Próximo" : "En Regla"}
                          </span>

                          {item.codigo && (
                            <div className="flex items-center gap-1">
                              <span className="text-[9px] text-slate-400 font-bold">
                                {itemEstaActivo ? "Vigilar" : "Ignorar"}
                              </span>
                              <Switch
                                checked={itemEstaActivo}
                                onCheckedChange={(checked) => handleToggleItemActivo(item.codigo!, checked, item.nombre)}
                                className="scale-75 data-[state=checked]:bg-slate-800"
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Barra de Progreso de Odómetro y Desgaste */}
                      <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            !itemEstaActivo
                              ? "bg-slate-300"
                              : esVencido
                              ? "bg-rose-600"
                              : esUrgente
                              ? "bg-amber-500"
                              : "bg-emerald-500"
                          }`}
                          style={{ width: `${porcentaje}%` }}
                        />
                      </div>

                      {/* Kilometraje y Acción Gerencial */}
                      <div className="flex items-center justify-between text-xs pt-0.5">
                        <div className="font-medium text-slate-600">
                          {esVencido ? (
                            <span className="text-rose-700 font-black flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                              Excedido por {(Math.abs(kmRestantes) || 0).toLocaleString()} km
                            </span>
                          ) : (
                            <span>
                              Faltan <strong className="text-slate-900">{(kmRestantes || 0).toLocaleString()} km</strong>
                            </span>
                          )}
                          <span className="text-slate-400 text-[10px] ml-1.5">
                            (Intervalo: cada {item.intervaloKm.toLocaleString()} km)
                          </span>
                        </div>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingItem(item);
                            setNewUltimoKm(kmActual.toString());
                            setCostoRegistro(item.costoEstimado ? item.costoEstimado.toString() : "");
                            setFechaRegistro(new Date().toISOString().split("T")[0]);
                          }}
                          className="h-7 px-2.5 text-[10px] font-extrabold uppercase rounded-lg border-slate-300 hover:bg-slate-100 text-slate-700"
                        >
                          Asentar Fosa
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
            })
          )}
        </div>
          </>
        )}
      </main>

      {/* ========================================================= */}
      {/* MODAL ERGONÓMICO: ESTACIÓN DE TALLER (COMBOS DE PARADA)   */}
      {/* ========================================================= */}
      {estacionSeleccionada && (() => {
        const config = ESTACIONES_SERVICIO_CONFIG[estacionSeleccionada];
        if (!config) return null;
        const totalItemsEstacion = config.items.length;
        const totalSeleccionados = estacionCodigosSeleccionados.length;

        return (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-200">
              
              {/* Header Modal Estación con Selector de Modo (Asentar vs Configurar Receta) */}
              <div className="flex flex-col gap-2.5 border-b pb-3 shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-2xl bg-slate-900 flex items-center justify-center text-xl shadow-xs">
                      {config.icono}
                    </div>
                    <div>
                      <h3 className="text-base font-black text-slate-900 leading-tight">
                        Estación: {config.nombre}
                      </h3>
                      <p className="text-[11px] text-slate-500 font-medium">
                        {modoConfigurarCombo 
                          ? "Configura los componentes que aplican por defecto a tu unidad" 
                          : config.subtitulo}
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-slate-900 text-amber-400 text-[10px] font-black border-0">
                    {modoConfigurarCombo
                      ? `${Object.values(comboUnidadChecks).filter(Boolean).length}/${comboUnidadItems.length} activos`
                      : `${totalSeleccionados}/${comboUnidadItems.length} marcados`}
                  </Badge>
                </div>

                {/* Tabs de Modo: Asentar Servicio vs Configurar Receta de Unidad */}
                <div className="flex p-1 bg-slate-100 rounded-xl gap-1">
                  <button
                    type="button"
                    onClick={() => setModoConfigurarCombo(false)}
                    className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-black transition-all cursor-pointer ${
                      !modoConfigurarCombo
                        ? "bg-white text-slate-900 shadow-xs"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    🛠️ Asentar Parada de Taller
                  </button>
                  <button
                    type="button"
                    onClick={() => setModoConfigurarCombo(true)}
                    className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-black transition-all cursor-pointer ${
                      modoConfigurarCombo
                        ? "bg-amber-400 text-slate-950 shadow-xs"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    ⚙️ Mi Receta Oficial (Socio)
                  </button>
                </div>
              </div>

              {/* Contenido con scroll táctil */}
              <div className="space-y-4 flex-1 overflow-y-auto pr-1">
                
                {/* VISTA 1: MODO CONFIGURADOR DE RECETA DE UNIDAD (SOCIO) */}
                {modoConfigurarCombo ? (
                  <div className="space-y-3.5 animate-in fade-in duration-150">
                    <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-xs text-amber-950">
                      <p className="font-extrabold flex items-center gap-1.5 text-amber-900">
                        <span>🚌</span> Receta Oficial para Unidad {currentBus.numeroDisco || currentBus.id}
                      </p>
                      <p className="text-[11px] text-amber-800 mt-1 leading-relaxed">
                        Marca los ítems que <strong>exiges</strong> que se hagan en tu autobús al parar en esta estación. Los que dejes marcados le aparecerán preseleccionados al chofer en su teléfono.
                      </p>
                    </div>

                    {/* Lista de Items con Checkbox editable para el socio */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between px-1">
                        <span className="text-[11px] font-black text-slate-800 uppercase tracking-wider">
                          Componentes de la Estación ({comboUnidadItems.length})
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const todosActivos = comboUnidadItems.every(it => comboUnidadChecks[it.codigo]);
                            const nuevoMap: Record<string, boolean> = {};
                            comboUnidadItems.forEach(it => {
                              nuevoMap[it.codigo] = !todosActivos;
                            });
                            setComboUnidadChecks(nuevoMap);
                          }}
                          className="text-[10px] font-bold text-amber-700 hover:text-amber-900 cursor-pointer"
                        >
                          {comboUnidadItems.every(it => comboUnidadChecks[it.codigo]) ? "Desmarcar todos" : "Marcar todos"}
                        </button>
                      </div>

                      <div className="flex flex-col gap-1.5 max-h-60 overflow-y-auto p-1 bg-slate-50 rounded-2xl border border-slate-200">
                        {comboUnidadItems.map(it => {
                          const estaActivo = !!comboUnidadChecks[it.codigo];
                          const esExtra = comboUnidadExtras.includes(it.codigo);
                          const esProtegido = estacionSeleccionada ? isItemProtegidoReceta(estacionSeleccionada, it.codigo) : false;
                          return (
                            <div
                              key={it.codigo}
                              className={`flex items-center gap-2 p-2 rounded-xl text-left transition-all border ${
                                estaActivo
                                  ? "bg-white border-amber-500/80 shadow-xs"
                                  : "bg-slate-100/50 border-slate-200 opacity-60 hover:opacity-100"
                              }`}
                            >
                              <div
                                onClick={() => {
                                  setComboUnidadChecks(prev => ({
                                    ...prev,
                                    [it.codigo]: !prev[it.codigo],
                                  }));
                                }}
                                className="flex items-start gap-2.5 flex-1 min-w-0 cursor-pointer"
                              >
                                <div
                                  className={`w-4 h-4 rounded-md mt-0.5 flex items-center justify-center shrink-0 border ${
                                    estaActivo
                                      ? "bg-amber-500 border-amber-500 text-slate-950 font-black"
                                      : "border-slate-300 bg-white"
                                  }`}
                                >
                                  {estaActivo && <Check className="w-3 h-3 stroke-[3]" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-1">
                                    <span className={`text-xs font-bold truncate ${estaActivo ? "text-slate-900" : "text-slate-500"}`}>
                                      {it.nombre}
                                    </span>
                                    <div className="flex items-center gap-1 shrink-0">
                                      {esExtra ? (
                                        <Badge className="bg-purple-100 text-purple-900 border-0 text-[8px] py-0 px-1 font-black shrink-0">
                                          Añadido por Socio
                                        </Badge>
                                      ) : esProtegido ? (
                                        <Badge className="bg-emerald-100 text-emerald-900 border border-emerald-300 text-[8px] py-0 px-1 font-black shrink-0">
                                          Vital Motor
                                        </Badge>
                                      ) : it.preMarcado ? (
                                        <Badge className="bg-slate-200 text-slate-800 border-0 text-[8px] py-0 px-1 font-bold shrink-0">
                                          Base Taller
                                        </Badge>
                                      ) : (
                                        <Badge className="bg-slate-100 text-slate-500 border-0 text-[8px] py-0 px-1 font-medium shrink-0">
                                          Opcional
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                                    <span>Ciclo: {(it.intervaloKm || 0).toLocaleString()} km</span>
                                    {it.opcionalTexto && (
                                      <span className="text-slate-400 italic truncate">• {it.opcionalTexto}</span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Botón Quitar de la Receta (con protección para filtros vitales de motor) */}
                              {esProtegido ? (
                                <div
                                  title="Filtro vital para la vida del motor Hino AK (Protegido)"
                                  className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 shrink-0 cursor-not-allowed"
                                >
                                  <ShieldCheck className="w-4 h-4 text-emerald-600/70" />
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  title={`Quitar ${it.nombre} de la receta de esta unidad`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleQuitarItemReceta(it.codigo, it.nombre);
                                  }}
                                  className="w-8 h-8 rounded-lg flex items-center justify-center text-rose-500 hover:text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors shrink-0 cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Añadir Ítem Adicional del Catálogo Maestro al Combo */}
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-[11px] font-black text-slate-800 flex items-center gap-1">
                          <Plus className="w-3 h-3 text-amber-600" />
                          ¿Deseas agregar otro ítem del catálogo a este combo?
                        </Label>
                      </div>
                      <div className="flex gap-1.5">
                        <Input
                          placeholder="Buscar repuesto o trabajo en catálogo..."
                          value={busquedaExtraModal}
                          onChange={e => setBusquedaExtraModal(e.target.value)}
                          className="h-8 rounded-xl text-xs bg-white border-slate-300"
                        />
                      </div>

                      {busquedaExtraModal.trim().length > 1 && (() => {
                        const catalogo = getCatalogoMaestroGlobal();
                        const q = busquedaExtraModal.toLowerCase().trim();
                        const resultados = catalogo
                          .filter(c => c.nombre.toLowerCase().includes(q) || c.codigo.toLowerCase().includes(q))
                          .slice(0, 5);

                        if (resultados.length === 0) {
                          return (
                            <p className="text-[10px] text-slate-400 italic px-1">
                              No hay coincidencias en el catálogo maestro.
                            </p>
                          );
                        }

                        return (
                          <div className="flex flex-col gap-1 max-h-36 overflow-y-auto pt-1">
                            {resultados.map(cat => {
                              const yaEsta = comboUnidadItems.some(it => it.codigo === cat.codigo);
                              return (
                                <div
                                  key={cat.codigo}
                                  className="flex items-center justify-between p-1.5 bg-white rounded-lg border border-slate-200 text-xs"
                                >
                                  <div className="min-w-0 pr-2">
                                    <span className="font-bold text-slate-900 block truncate text-[11px]">
                                      {cat.nombre}
                                    </span>
                                    <span className="text-[9px] text-slate-400">
                                      {(cat.intervaloKmOficial || 5000).toLocaleString()} km • {cat.categoria}
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    disabled={yaEsta}
                                    onClick={() => handleAgregarItemExtraACombo(cat.codigo)}
                                    className={`py-1 px-2 rounded-md text-[10px] font-bold shrink-0 cursor-pointer ${
                                      yaEsta
                                        ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                                        : "bg-amber-400 hover:bg-amber-500 text-slate-950 shadow-xs"
                                    }`}
                                  >
                                    {yaEsta ? "Agregado" : "+ Agregar"}
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                ) : (
                  /* VISTA 2: ASENTAMIENTO REGULAR DE PARADA DE TALLER */
                  <>
                    {/* Selector de Ítems / Checklist */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-black text-slate-900 uppercase tracking-wider">
                          Componentes Atendidos en esta Parada
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            if (totalSeleccionados === comboUnidadItems.length) {
                              setEstacionCodigosSeleccionados([]);
                            } else {
                              setEstacionCodigosSeleccionados(comboUnidadItems.map(it => it.codigo));
                            }
                          }}
                          className="text-[10px] font-bold text-blue-600 hover:text-blue-800 cursor-pointer"
                        >
                          {totalSeleccionados === comboUnidadItems.length ? "Desmarcar todos" : "Marcar todos"}
                        </button>
                      </div>

                      <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto p-1 bg-slate-50 rounded-2xl border border-slate-200">
                        {comboUnidadItems.map(it => {
                          const estaMarcado = estacionCodigosSeleccionados.includes(it.codigo);
                          return (
                            <button
                              key={it.codigo}
                              type="button"
                              onClick={() => handleToggleItemEstacion(it.codigo)}
                              className={`flex items-start gap-2.5 p-2 rounded-xl text-left transition-all cursor-pointer border ${
                                estaMarcado
                                  ? "bg-white border-emerald-500/80 shadow-xs"
                                  : "bg-transparent border-transparent hover:bg-slate-100/80 opacity-75"
                              }`}
                            >
                              <div
                                className={`w-4 h-4 rounded-md mt-0.5 flex items-center justify-center shrink-0 border ${
                                  estaMarcado
                                    ? "bg-emerald-600 border-emerald-600 text-white"
                                    : "border-slate-300 bg-white"
                                }`}
                              >
                                {estaMarcado && <Check className="w-3 h-3 stroke-[3]" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1">
                                  <span className={`text-xs font-bold truncate ${estaMarcado ? "text-slate-900" : "text-slate-600"}`}>
                                    {it.nombre}
                                  </span>
                                  {it.preMarcado && (
                                    <Badge className="bg-amber-100 text-amber-900 border-0 text-[9px] py-0 px-1 font-black shrink-0">
                                      Vital
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                                  <span>Ciclo: {(it.intervaloKm || 0).toLocaleString()} km</span>
                                  {it.opcionalTexto && (
                                    <span className="text-slate-400 italic truncate">• {it.opcionalTexto}</span>
                                  )}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Formulario de Factura, Odómetro y Taller */}
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <Label className="text-[11px] font-bold text-slate-700 block mb-1">
                          Odómetro Actual del Bus (Km)
                        </Label>
                        <Input
                          type="number"
                          value={estacionKm}
                          onChange={e => setEstacionKm(e.target.value)}
                          placeholder={kmActual.toString()}
                          className="h-10 rounded-xl text-xs bg-slate-50 border-slate-300 font-bold"
                        />
                      </div>
                      <div>
                        <Label className="text-[11px] font-bold text-slate-700 block mb-1">
                          Costo Total Parada ($)
                        </Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={estacionCosto}
                          onChange={e => setEstacionCosto(e.target.value)}
                          placeholder="0.00"
                          className="h-10 rounded-xl text-xs bg-slate-50 border-slate-300 font-bold text-emerald-800"
                        />
                      </div>
                    </div>

                    {/* Enlace sutil de regularización retroactiva (Socio) */}
                    <div className="bg-amber-50/60 border border-amber-200/70 rounded-2xl p-2.5">
                      <div className="flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => {
                            const nuevo = !estacionModoRetroactivo;
                            setEstacionModoRetroactivo(nuevo);
                            if (nuevo && (!estacionKmServicio || estacionKmServicio === estacionKm)) {
                              setEstacionKmServicio(estacionKm || kmActual.toString());
                            }
                          }}
                          className="text-[11px] font-bold text-amber-900 hover:text-amber-950 flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <span>⏱️ ¿Se realizó antes?</span>
                          <span className="underline decoration-amber-600 underline-offset-2">
                            {estacionModoRetroactivo ? "Ocultar regularización (Hoy)" : "Toca aquí para regularizar fecha o km"}
                          </span>
                        </button>
                      </div>

                      {estacionModoRetroactivo && (() => {
                        const odoBus = parseInt(estacionKm || "", 10) || kmActual;
                        const odoServicio = parseInt(estacionKmServicio || "", 10) || 0;
                        const primerItem = comboUnidadItems[0];
                        const intervaloRef = primerItem?.intervaloKm || 5000;
                        const calculo = calcularDesgasteRegularizacion(odoBus, odoServicio, intervaloRef);

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
                                  value={estacionKmServicio}
                                  onChange={e => setEstacionKmServicio(e.target.value)}
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
                                  value={estacionFechaServicio}
                                  onChange={e => setEstacionFechaServicio(e.target.value)}
                                  className="h-9 rounded-xl text-xs font-bold bg-white border-amber-300"
                                />
                              </div>
                            </div>

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

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <Label className="text-[11px] font-bold text-slate-700 block mb-1">
                          Taller / Proveedor
                        </Label>
                        <Input
                          value={estacionTaller}
                          onChange={e => setEstacionTaller(e.target.value)}
                          placeholder="Nombre del taller o lubricadora"
                          className="h-9 rounded-xl text-xs bg-slate-50 border-slate-300"
                        />
                      </div>
                      <div>
                        <Label className="text-[11px] font-bold text-slate-700 block mb-1">
                          Nº Factura / Nota Venta
                        </Label>
                        <Input
                          value={estacionFactura}
                          onChange={e => setEstacionFactura(e.target.value)}
                          placeholder="ej. 001-002-9842"
                          className="h-9 rounded-xl text-xs bg-slate-50 border-slate-300"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[11px] font-bold text-slate-700 block">
                        Modalidad Contable de Pago (Socio)
                      </Label>
                      <div className="grid grid-cols-3 gap-1.5">
                        <button
                          type="button"
                          onClick={() => setEstacionModalidadPago('PAGO_TOTAL')}
                          className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                            estacionModalidadPago === 'PAGO_TOTAL'
                              ? 'bg-emerald-50 border-emerald-500 text-emerald-950 ring-1 ring-emerald-500'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-1 font-bold text-xs">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            Pago Total
                          </div>
                          <span className="text-[10px] text-slate-500 leading-tight block mt-0.5">
                            100% Pagado
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setEstacionModalidadPago('PAGO_PARCIAL')}
                          className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                            estacionModalidadPago === 'PAGO_PARCIAL'
                              ? 'bg-amber-50 border-amber-500 text-amber-950 ring-1 ring-amber-500'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-1 font-bold text-xs">
                            <span className="w-2 h-2 rounded-full bg-amber-500" />
                            Anticipo
                          </div>
                          <span className="text-[10px] text-slate-500 leading-tight block mt-0.5">
                            Parte Fiada
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setEstacionModalidadPago('CREDITO_FIADO')}
                          className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                            estacionModalidadPago === 'CREDITO_FIADO'
                              ? 'bg-rose-50 border-rose-500 text-rose-950 ring-1 ring-rose-500'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-1 font-bold text-xs">
                            <span className="w-2 h-2 rounded-full bg-rose-500" />
                            Saco Fiado
                          </div>
                          <span className="text-[10px] text-slate-500 leading-tight block mt-0.5">
                            100% Crédito
                          </span>
                        </button>
                      </div>

                      {estacionModalidadPago === 'PAGO_PARCIAL' && (
                        <div className="p-2.5 bg-amber-50/70 border border-amber-200 rounded-xl space-y-1.5">
                          <Label className="text-[11px] font-bold text-amber-900 block">
                            Monto que Transfieres / Pagas Hoy ($)
                          </Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={estacionMontoAbono}
                            onChange={e => setEstacionMontoAbono(e.target.value)}
                            placeholder="ej. 50.00"
                            className="h-8 rounded-xl text-xs bg-white border-amber-300 font-bold"
                          />
                          <p className="text-[10px] text-amber-800">
                            Saldo restante de ${(Math.max(0, (parseFloat(estacionCosto || '0') || 0) - (parseFloat(estacionMontoAbono || '0') || 0))).toFixed(2)} irá a tu Cartera de Deudas por Pagar con sello ámbar.
                          </p>
                        </div>
                      )}

                      {estacionModalidadPago !== 'CREDITO_FIADO' && (
                        <div>
                          <Label className="text-[11px] font-bold text-slate-700 block mb-1">
                            Vía de Pago del Desembolso
                          </Label>
                          <div className="flex gap-2">
                            {(["EFECTIVO", "TRANSFERENCIA"] as const).map(m => (
                              <button
                                key={m}
                                type="button"
                                onClick={() => setEstacionMetodoPago(m)}
                                className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                                  estacionMetodoPago === m
                                    ? "bg-slate-900 text-white border-slate-900"
                                    : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                                }`}
                              >
                                {m === "EFECTIVO" ? "💵 Efectivo" : "🏦 Transferencia Bancaria"}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Resumen Contable y Cascada */}
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] text-slate-600 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-slate-900">
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        Asentamiento de Datos:
                      </div>
                      <p>• Resetea {totalSeleccionados} componentes con el kilometraje ingresado.</p>
                      <p>
                        • Se asienta contablemente en <strong>{getCategoriaContablePorEstacion(estacionSeleccionada)}</strong> y se sincroniza en tu <strong>Cartera de Deudas con Talleres</strong>.
                      </p>
                    </div>
                  </>
                )}
              </div>

              {/* Botones de Acción Adaptables por Modo */}
              <div className="flex items-center gap-2 pt-2 border-t shrink-0">
                {modoConfigurarCombo ? (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleRestablecerComboBase}
                      className="h-10 rounded-xl text-xs font-bold text-slate-600 border-slate-300 hover:bg-slate-100 flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Por Defecto
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setEstacionSeleccionada(null)}
                      className="flex-1 h-10 rounded-xl text-xs font-bold text-gray-600 cursor-pointer"
                    >
                      Cerrar
                    </Button>
                    <Button
                      type="button"
                      onClick={handleGuardarRecetaCombo}
                      className="flex-1 h-10 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Save className="w-4 h-4" />
                      Guardar Receta
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setEstacionSeleccionada(null)}
                      className="flex-1 h-10 rounded-xl text-xs font-bold text-gray-600 cursor-pointer"
                    >
                      Cancelar
                    </Button>
                    {(() => {
                      const odoBus = parseInt(estacionKm || "", 10) || kmActual;
                      const odoServicio = parseInt(estacionKmServicio || "", 10) || 0;
                      const esInvalido = estacionModoRetroactivo && (odoServicio > odoBus || odoServicio <= 0);
                      const primerItem = comboUnidadItems[0];
                      const intervaloRef = primerItem?.intervaloKm || 5000;
                      const calculo = estacionModoRetroactivo ? calcularDesgasteRegularizacion(odoBus, odoServicio, intervaloRef) : null;

                      return (
                        <Button
                          type="button"
                          disabled={esInvalido}
                          onClick={handleGuardarEstacionServicio}
                          className={
                            "flex-1 h-10 rounded-xl font-black text-xs shadow-md flex items-center justify-center gap-1.5 cursor-pointer transition-all " +
                            (esInvalido
                              ? "bg-rose-300 text-rose-800 cursor-not-allowed"
                              : "bg-slate-900 hover:bg-slate-800 text-white")
                          }
                        >
                          {esInvalido ? (
                            <>
                              <AlertTriangle className="w-4 h-4 text-rose-700" />
                              Km Mayor al Tablero (Bloqueado)
                            </>
                          ) : estacionModoRetroactivo && calculo && !calculo.esInvalido ? (
                            <>
                              <Save className="w-4 h-4 text-amber-400" />
                              Calibrar a {calculo.kmRestantes.toLocaleString()} km Restantes
                            </>
                          ) : (
                            <>
                              <Save className="w-4 h-4 text-amber-400" />
                              Asentar en {config.nombre.split(" ")[0]}
                            </>
                          )}
                        </Button>
                      );
                    })()}
                  </>
                )}
              </div>

            </div>
          </div>
        );
      })()}

      {/* Modal Registrar Mantenimiento Realizado */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl space-y-4">
            <div>
              <h3 className="font-black text-base text-gray-900 mb-0.5">Registrar Servicio Mecánico</h3>
              <p className="text-xs text-gray-500">{editingItem.nombre}</p>
              {editingItem.codigo && EFECTO_CASCADA_TRANSMISION[editingItem.codigo] && (
                <div className="mt-2 p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-start gap-2">
                  <span className="text-base leading-none">⚙️</span>
                  <div>
                    <strong className="font-extrabold block">Efecto Cascada Automático:</strong>
                    Este mantenimiento mayor reiniciará automáticamente los contadores de los componentes asociados en esta unidad.
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-bold text-gray-700 block mb-1">
                    Tacómetro del Cambio *
                  </Label>
                  <Input
                    type="number"
                    value={newUltimoKm}
                    onChange={e => setNewUltimoKm(e.target.value)}
                    className="h-10 rounded-xl text-sm font-black bg-slate-50"
                  />
                </div>
                <div>
                  <Label className="text-xs font-bold text-gray-700 block mb-1">
                    Fecha del Servicio
                  </Label>
                  <Input
                    type="date"
                    value={fechaRegistro}
                    onChange={e => setFechaRegistro(e.target.value)}
                    className="h-10 rounded-xl text-xs font-bold bg-slate-50"
                  />
                </div>
              </div>

              {/* Cálculo en vivo para regularización histórica si aplica */}
              {(() => {
                const kmNum = parseInt(newUltimoKm, 10);
                if (!kmNum || kmNum <= 0) return null;
                const rodados = kmActual - kmNum;
                const intervalo = editingItem.intervaloKm || 5000;
                const calculo = calcularDesgasteRegularizacion(kmActual, kmNum, intervalo);

                if (kmNum > kmActual) {
                  return (
                    <div className="p-2 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-[11px] font-bold flex items-center gap-1.5">
                      <Gauge className="w-3.5 h-3.5 text-blue-600" />
                      Este kilometraje actualizará el tacómetro oficial del bus a {kmNum.toLocaleString()} km.
                    </div>
                  );
                }

                if (rodados > 0) {
                  return (
                    <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 text-xs leading-relaxed space-y-1">
                      <div className="flex items-center justify-between font-black text-[11px]">
                        <span className="flex items-center gap-1 text-amber-900">
                          ⏱️ Regularización Histórica (hace {rodados.toLocaleString()} km)
                        </span>
                        <span className="bg-amber-200/80 text-amber-950 px-2 py-0.5 rounded-full text-[10px]">
                          Restan {calculo.kmRestantes.toLocaleString()} km ({calculo.porcentajeRestante}%)
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-600 font-medium">
                        • El tacómetro del autobús se mantendrá en <strong>{kmActual.toLocaleString()} km</strong>
                      </p>
                    </div>
                  );
                }

                return null;
              })()}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-bold text-gray-700 block mb-1">
                    Costo Total ($ USD)
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs text-gray-400 font-bold">$</span>
                    <Input
                      type="number"
                      step="0.5"
                      value={costoRegistro}
                      onChange={e => setCostoRegistro(e.target.value)}
                      placeholder="0.00"
                      className="h-10 pl-7 rounded-xl text-sm font-bold bg-slate-50"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-bold text-gray-700 block mb-1">
                    Taller o Mecánico
                  </Label>
                  <Input
                    value={tallerRegistro}
                    onChange={e => setTallerRegistro(e.target.value)}
                    placeholder="ej. Taller Loja"
                    className="h-10 rounded-xl text-xs bg-slate-50"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Button
                onClick={() => setEditingItem(null)}
                variant="ghost"
                className="flex-1 h-11 rounded-xl text-gray-600 font-semibold text-xs"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleUpdateMantenimiento}
                className="flex-1 h-11 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs shadow-sm"
              >
                <Save className="w-4 h-4 mr-1.5" />
                Guardar Servicio
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Biblioteca Oficial Hino AK (Importar para este Bus) */}
      {isCatalogoModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-5 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b pb-3 shrink-0">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Biblioteca Institucional Hino AK
                </h3>
                <p className="text-xs text-gray-500">
                  Selecciona tareas recomendadas para activar en tu unidad.
                </p>
              </div>
              <Badge className="bg-amber-100 text-amber-900 text-xs font-bold">
                19 Mantenimientos
              </Badge>
            </div>

            {/* Búsqueda y categorías dentro del catálogo */}
            <div className="space-y-2 shrink-0">
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                <Input
                  placeholder="Buscar por filtro, aceite o repuesto..."
                  value={catalogoBusqueda}
                  onChange={e => setCatalogoBusqueda(e.target.value)}
                  className="h-9 pl-9 pr-3 rounded-xl text-xs bg-slate-50 border-gray-200"
                />
              </div>

              <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs no-scrollbar">
                {['TODAS', 'MOTOR', 'TRANSMISION', 'FRENOS', 'SUSPENSION', 'SISTEMA_AIRE', 'RODAJE', 'SISTEMA_COMBUSTIBLE'].map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCatalogoFiltroCat(cat)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all ${
                      catalogoFiltroCat === cat
                        ? 'bg-slate-900 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {cat === 'TODAS' ? 'Todas' : cat.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Lista con scroll */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 divide-y divide-gray-100">
              {catalogoOficial
                .filter(catItem => {
                  const matchCat = catalogoFiltroCat === 'TODAS' || catItem.categoria === catalogoFiltroCat;
                  const matchSearch =
                    !catalogoBusqueda ||
                    catItem.nombre.toLowerCase().includes(catalogoBusqueda.toLowerCase()) ||
                    catItem.codigoRepuestoReferencia.toLowerCase().includes(catalogoBusqueda.toLowerCase()) ||
                    catItem.especificacionLubricanteRepuesto.toLowerCase().includes(catalogoBusqueda.toLowerCase());
                  return matchCat && matchSearch;
                })
                .map(catItem => {
                  const yaAsignado = items.some(
                    it => it.catalogoId === catItem.id || it.nombre.toLowerCase() === catItem.nombre.toLowerCase()
                  );

                  return (
                    <div key={catItem.id} className="pt-2.5 first:pt-0 flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                            {catItem.codigo}
                          </span>
                          <span className="text-[9px] font-bold text-gray-500">
                            {catItem.categoria.replace('_', ' ')}
                          </span>
                          <span className="text-[9px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                            Cada {catItem.intervaloKmOficial.toLocaleString()} km
                          </span>
                        </div>
                        <h5 className="text-xs font-bold text-gray-900 truncate">
                          {catItem.nombre}
                        </h5>
                        <p className="text-[11px] text-gray-600 mt-0.5 line-clamp-1">
                          {catItem.especificacionLubricanteRepuesto}
                        </p>
                      </div>

                      <Button
                        size="sm"
                        disabled={yaAsignado}
                        onClick={() => handleImportarDeCatalogo(catItem)}
                        className={`h-8 px-3 rounded-xl text-xs font-bold shrink-0 ${
                          yaAsignado
                            ? 'bg-gray-100 text-gray-400 border border-gray-200'
                            : 'bg-slate-900 hover:bg-slate-800 text-white active:scale-95'
                        }`}
                      >
                        {yaAsignado ? (
                          <span className="flex items-center gap-1">
                            <Check className="w-3 h-3" /> Asignado
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <Plus className="w-3 h-3" /> Activar
                          </span>
                        )}
                      </Button>
                    </div>
                  );
                })}
            </div>

            <div className="pt-3 border-t flex justify-end shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCatalogoModalOpen(false)}
                className="rounded-xl text-xs font-bold"
              >
                Cerrar Biblioteca
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* Modal Ergonómico: Combo 4 Ruedas */}
      {isComboRuedasModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b pb-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-900">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Combo 4 Ruedas (Delanteras + Posteriores)
                  </h3>
                  <p className="text-xs text-gray-500">
                    Servicio integral de engrase de bocinas y rodamientos en taller.
                  </p>
                </div>
              </div>
              <Badge className="bg-amber-100 text-amber-900 text-[11px] font-black border-0">
                Hino AK
              </Badge>
            </div>

            <div className="space-y-3.5 flex-1 overflow-y-auto pr-1">
              {/* Resumen de las ruedas que se resetearán */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-2xl">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-amber-950">Bocinas Delanteras</span>
                    <Badge className="bg-amber-200/70 text-amber-900 text-[9px] font-black border-0">2 Ruedas</Badge>
                  </div>
                  <p className="text-xs font-black text-amber-900 mt-1">60,000 km</p>
                  <p className="text-[10px] text-amber-700/90 leading-tight mt-0.5">
                    1.5 kg grasa alta temp + 2 retenes. Desmontaje rápido (1.5h).
                  </p>
                </div>
                <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-2xl">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-amber-950">Bocinas Posteriores</span>
                    <Badge className="bg-amber-200/70 text-amber-900 text-[9px] font-black border-0">2 Ruedas</Badge>
                  </div>
                  <p className="text-xs font-black text-amber-900 mt-1">50,000 km</p>
                  <p className="text-[10px] text-amber-700/90 leading-tight mt-0.5">
                    3.5 kg grasa alta temp + 4 retenes (70% peso bus y calor tambores).
                  </p>
                </div>
              </div>

              {/* Formulario rápido */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Odómetro Actual del Bus (Km)
                  </Label>
                  <Input
                    type="number"
                    value={comboRuedasKm}
                    onChange={e => setComboRuedasKm(e.target.value)}
                    placeholder={kmActual.toString()}
                    className="h-10 rounded-xl text-xs bg-slate-50 border-slate-300 font-bold"
                  />
                </div>
                <div>
                  <Label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Costo Total Factura / Taller ($)
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={comboRuedasCosto}
                    onChange={e => setComboRuedasCosto(e.target.value)}
                    placeholder="ej. 220.00"
                    className="h-10 rounded-xl text-xs bg-slate-50 border-slate-300 font-bold text-emerald-800"
                  />
                </div>
              </div>

              {/* Enlace sutil de regularización retroactiva (Combo 4 Ruedas) */}
              <div className="bg-amber-50/60 border border-amber-200/70 rounded-2xl p-2.5">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      const nuevo = !comboRuedasModoRetroactivo;
                      setComboRuedasModoRetroactivo(nuevo);
                      if (nuevo && (!comboRuedasKmServicio || comboRuedasKmServicio === comboRuedasKm)) {
                        setComboRuedasKmServicio(comboRuedasKm || kmActual.toString());
                      }
                    }}
                    className="text-[11px] font-bold text-amber-900 hover:text-amber-950 flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <span>⏱️ ¿Se realizó antes?</span>
                    <span className="underline decoration-amber-600 underline-offset-2">
                      {comboRuedasModoRetroactivo ? "Ocultar regularización (Hoy)" : "Toca aquí para regularizar fecha o km"}
                    </span>
                  </button>
                </div>

                {comboRuedasModoRetroactivo && (() => {
                  const odoBus = parseInt(comboRuedasKm, 10) || kmActual;
                  const odoServicio = parseInt(comboRuedasKmServicio, 10) || 0;
                  const calculo = calcularDesgasteRegularizacion(odoBus, odoServicio, 50000);

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
                            value={comboRuedasKmServicio}
                            onChange={e => setComboRuedasKmServicio(e.target.value)}
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
                            value={comboRuedasFechaServicio}
                            onChange={e => setComboRuedasFechaServicio(e.target.value)}
                            className="h-9 rounded-xl text-xs font-bold bg-white border-amber-300"
                          />
                        </div>
                      </div>

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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Taller Mecánico / Lugar
                  </Label>
                  <Input
                    value={comboRuedasTaller}
                    onChange={e => setComboRuedasTaller(e.target.value)}
                    placeholder="ej. Taller Rodamientos Don Fausto - Loja"
                    className="h-9 rounded-xl text-xs bg-slate-50 border-slate-300"
                  />
                </div>
                <div>
                  <Label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Nº Factura / Nota Venta
                  </Label>
                  <Input
                    value={comboRuedasFactura}
                    onChange={e => setComboRuedasFactura(e.target.value)}
                    placeholder="ej. 001-002-8491"
                    className="h-9 rounded-xl text-xs bg-slate-50 border-slate-300"
                  />
                </div>
              </div>

              <div>
                <Label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Método de Pago
                </Label>
                <div className="flex gap-2">
                  {(['EFECTIVO', 'TRANSFERENCIA'] as const).map(metodo => (
                    <button
                      key={metodo}
                      type="button"
                      onClick={() => setComboRuedasMetodo(metodo)}
                      className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all border ${
                        comboRuedasMetodo === metodo
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {metodo === 'EFECTIVO' ? '💵 Efectivo' : '🏦 Transferencia Bancaria'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] text-slate-600 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-slate-900">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  Impacto Automático:
                </div>
                <p>• Resetea <strong>Bocinas Delanteras</strong> con 60,000 km de vida útil oficial.</p>
                <p>• Resetea <strong>Bocinas Posteriores</strong> con 50,000 km de vida útil oficial.</p>
                <p>• Guarda el desembolso en <strong>Frenos y Rodaje</strong> de la contabilidad del socio.</p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t shrink-0">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsComboRuedasModalOpen(false)}
                className="flex-1 h-10 rounded-xl text-xs font-bold text-gray-600 cursor-pointer"
              >
                Cancelar
              </Button>
              {(() => {
                const odoBus = parseInt(comboRuedasKm, 10) || kmActual;
                const odoServicio = parseInt(comboRuedasKmServicio, 10) || 0;
                const esInvalido = comboRuedasModoRetroactivo && (odoServicio > odoBus || odoServicio <= 0);
                const calculo = comboRuedasModoRetroactivo ? calcularDesgasteRegularizacion(odoBus, odoServicio, 50000) : null;

                return (
                  <Button
                    type="button"
                    disabled={esInvalido}
                    onClick={handleGuardarCombo4Ruedas}
                    className={
                      "flex-1 h-10 rounded-xl font-black text-xs shadow-md flex items-center justify-center gap-1.5 cursor-pointer transition-all " +
                      (esInvalido
                        ? "bg-rose-300 text-rose-800 cursor-not-allowed"
                        : "bg-amber-600 hover:bg-amber-700 text-white")
                    }
                  >
                    {esInvalido ? (
                      <>
                        <AlertTriangle className="w-4 h-4 text-rose-700" />
                        Km Mayor al Tablero (Bloqueado)
                      </>
                    ) : comboRuedasModoRetroactivo && calculo && !calculo.esInvalido ? (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Calibrar a {calculo.kmRestantes.toLocaleString()} km Restantes
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Asentar Combo 4 Ruedas
                      </>
                    )}
                  </Button>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    
      {/* MODAL DE CONFIRMACIÓN: PAUSAR MÓDULO DE MANTENIMIENTO */}
      {modalConfirmPausarOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-600 flex items-center justify-center shrink-0">
                <PauseCircle className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 leading-tight">
                  ¿Deseas pausar el mantenimiento para la Unidad {activeBusDisco}?
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Esta decisión se sincronizará automáticamente entre tu celular y tu computadora.
                </p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/70 space-y-2 text-xs text-slate-600">
              <p className="font-bold text-slate-800 text-[11px] uppercase tracking-wide">
                Al pausar la supervisión:
              </p>
              <div className="flex items-start gap-2">
                <span className="text-slate-400">•</span>
                <span>Se ocultará el semáforo y las alertas ejecutivas en tu pantalla de inicio.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-slate-400">•</span>
                <span>Tu chofer no recibirá alertas de lubricadora ni tendrá que asentar servicios en su turno.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-slate-400">•</span>
                <span><strong>Tus datos están protegidos:</strong> Los kilometrajes y fechas no se borran; permanecerán listos para cuando decidas reactivar.</span>
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalConfirmPausarOpen(false)}
                className="w-full sm:w-auto h-10 text-xs font-bold text-slate-700 rounded-xl"
              >
                Cancelar (Mantener Activo)
              </Button>
              <Button
                type="button"
                onClick={ejecutarPausaModulo}
                className="w-full sm:w-auto h-10 text-xs font-black bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-xs"
              >
                Confirmar y Pausar Módulo
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN: ACTIVAR O CAMBIAR PLAN DE MANTENIMIENTO */}
      {modalConfirmNivel && (() => {
        const plantilla = PLANTILLAS_NIVEL_CONTROL[modalConfirmNivel.nivel];
        const cantidadItems = modalConfirmNivel.nivel === 'TOTAL'
          ? 27
          : modalConfirmNivel.nivel === 'MEDIO'
          ? 15
          : 7;

        return (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4">
              <div className="flex items-start gap-3">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                  modalConfirmNivel.nivel === 'TOTAL'
                    ? 'bg-blue-500/15 text-blue-600'
                    : modalConfirmNivel.nivel === 'MEDIO'
                    ? 'bg-amber-500/15 text-amber-600'
                    : 'bg-emerald-500/15 text-emerald-600'
                }`}>
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-slate-900 leading-tight">
                      Confirmar {plantilla.nombre}
                    </h3>
                    <Badge className="text-[9px] font-black uppercase">
                      {plantilla.badge}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Para la Unidad <strong>{activeBusDisco}</strong> ({activeBusPlaca})
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/70 space-y-2 text-xs text-slate-600">
                <p className="font-bold text-slate-800 text-[11px] uppercase tracking-wide">
                  Alcance del Plan Seleccionado:
                </p>
                <div className="flex items-center justify-between py-1 border-b border-slate-200/60 font-semibold text-slate-800">
                  <span>Componentes auditados:</span>
                  <span className="text-sm font-black text-slate-900">{cantidadItems} ítems oficiales</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed pt-1">
                  {plantilla.descripcion}
                </p>
              </div>

              <div className="rounded-2xl p-3 bg-blue-50/70 border border-blue-200/80 text-[11px] text-blue-900 flex items-start gap-2.5">
                <Cloud className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <p className="leading-snug">
                  <strong>Sincronización en la nube:</strong> Recordaremos permanentemente esta decisión para que no tengas que volver a configurarla al abrir RutaGo desde tu celular o computadora. Podrás ajustar ítems individuales con sus interruptores en cualquier momento.
                </p>
              </div>

              <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setModalConfirmNivel(null)}
                  className="w-full sm:w-auto h-10 text-xs font-bold text-slate-700 rounded-xl"
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={ejecutarCambioNivelConfirmado}
                  className={`w-full sm:w-auto h-10 text-xs font-black text-white rounded-xl shadow-xs ${
                    modalConfirmNivel.nivel === 'TOTAL'
                      ? 'bg-blue-700 hover:bg-blue-800'
                      : modalConfirmNivel.nivel === 'MEDIO'
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  Confirmar y Guardar Decisión
                </Button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL DE CONFIRMACIÓN: REACTIVAR MÓDULO */}
      {modalConfirmReactivarOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 leading-tight">
                  ¿Reactivar supervisión de mantenimiento?
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Para la Unidad <strong>{activeBusDisco}</strong> con plan guardado ({PLANTILLAS_NIVEL_CONTROL[nivelControl]?.nombre || 'Control Total'}).
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-2xl border border-slate-200/70">
              Se volverá a mostrar el semáforo y diagnósticos de desgaste en tu pantalla principal, y tu chofer tendrá activas las alertas para reportar lubricadoras y talleres. Esta decisión se sincronizará entre todos tus dispositivos.
            </p>

            <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalConfirmReactivarOpen(false)}
                className="w-full sm:w-auto h-10 text-xs font-bold text-slate-700 rounded-xl"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={ejecutarReactivacionModulo}
                className="w-full sm:w-auto h-10 text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs"
              >
                Confirmar y Reactivar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE POLÍTICAS DE FLOTA / PARÁMETROS DEL SOCIO */}
      {isPoliticasModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                  <Settings2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Políticas de Servicio de Unidad
                  </h3>
                  <p className="text-xs text-slate-500">
                    Define los intervalos oficiales según las marcas y lubricantes que compras
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsPoliticasModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto pr-1 flex-1 text-xs">
              <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 leading-relaxed">
                💡 <strong>Autonomía del Socio:</strong> Si utilizas aceite sintético de larga duración (ej. 7,000 km) o lubricas zapatas con mayor frecuencia, ajusta los parámetros aquí para que el odómetro del chofer calcule con exactitud la vida útil.
              </div>

              <div className="space-y-3">
                {items
                  .filter(it => it.codigo && ["HINO-01", "HINO-04", "HINO-09", "HINO-10", "HINO-11", "HINO-13"].includes(it.codigo))
                  .map(it => (
                    <div key={it.id} className="p-3 rounded-2xl border border-slate-200 bg-slate-50/60 flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-[9px] font-mono font-bold bg-white text-slate-700 px-1.5 py-0.2 rounded border">
                            {it.codigo}
                          </span>
                          <span className="text-xs font-black text-slate-900 truncate">
                            {it.nombre}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500">
                          {it.repuestoDetalle || "Parámetro crítico de flota"}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <Input
                          type="number"
                          defaultValue={it.intervaloKm}
                          onBlur={e => {
                            const val = parseInt(e.target.value, 10);
                            if (!isNaN(val) && val > 0) {
                              const updated = items.map(x => x.id === it.id ? { ...x, intervaloKm: val } : x);
                              saveItems(updated);
                              toast({
                                title: "Intervalo Actualizado",
                                description: `${it.nombre} configurado para cambiarse cada ${val.toLocaleString()} km.`,
                              });
                            }
                          }}
                          className="w-24 h-8 text-xs font-black text-right rounded-xl bg-white border-slate-300"
                        />
                        <span className="text-slate-500 font-bold text-[11px]">km</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            <div className="pt-3 border-t flex items-center justify-between shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  handleSincronizarBloqueMotor();
                  toast({
                    title: "Intervalos Restablecidos",
                    description: "Se restauraron los parámetros oficiales de fábrica Hino AK.",
                  });
                }}
                className="h-9 text-xs font-bold text-slate-600 rounded-xl"
              >
                Restablecer Fábrica
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => setIsPoliticasModalOpen(false)}
                className="h-9 px-5 text-xs font-black rounded-xl bg-slate-900 text-white hover:bg-slate-800"
              >
                Listo y Aplicar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL DE REGISTRO DE ABONO A TALLER (FASE 4)              */}
      {/* ========================================================= */}
      {isAbonoModalOpen && abonoTargetExpense && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-3xl p-5 shadow-2xl border border-slate-200 flex flex-col gap-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900">
                    Registrar Abono a Taller
                  </h3>
                  <p className="text-[10px] text-slate-500 truncate max-w-[240px]">
                    {abonoTargetExpense.provider || 'Taller Mecánico'} • {abonoTargetExpense.category}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAbonoModalOpen(false);
                  setAbonoTargetExpense(null);
                }}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Ficha Resumen de Deuda */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Total Deuda
                </span>
                <span className="text-xs font-bold text-slate-700">
                  ${abonoTargetExpense.totalAmount.toFixed(2)}
                </span>
                <span className="text-[10px] text-emerald-700 block">
                  Abonado: ${abonoTargetExpense.paidAmount.toFixed(2)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 block">
                  Saldo Actual
                </span>
                <span className="text-base font-black text-rose-600">
                  ${abonoTargetExpense.pendingBalance.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Inputs del Abono */}
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label className="text-[11px] font-bold text-slate-700">
                    Monto a Abonar Hoy ($)
                  </Label>
                  <button
                    type="button"
                    onClick={() => setAbonoAmount(abonoTargetExpense.pendingBalance.toString())}
                    className="text-[10px] font-extrabold text-blue-600 hover:text-blue-800 cursor-pointer"
                  >
                    Pagar Totalidad (${abonoTargetExpense.pendingBalance.toFixed(2)})
                  </button>
                </div>
                <Input
                  type="number"
                  step="0.01"
                  value={abonoAmount}
                  onChange={e => setAbonoAmount(e.target.value)}
                  placeholder="0.00"
                  className="h-10 rounded-xl text-sm font-black text-emerald-800 bg-white border-slate-300"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Fecha del Abono
                  </Label>
                  <Input
                    type="date"
                    value={abonoDate}
                    onChange={e => setAbonoDate(e.target.value)}
                    className="h-9 rounded-xl text-xs bg-slate-50 border-slate-300"
                  />
                </div>
                <div>
                  <Label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Método de Pago
                  </Label>
                  <select
                    value={abonoMethod}
                    onChange={e => setAbonoMethod(e.target.value as any)}
                    className="w-full h-9 rounded-xl text-xs bg-slate-50 border border-slate-300 px-2 font-medium"
                  >
                    <option value="TRANSFERENCIA">🏦 Transferencia</option>
                    <option value="EFECTIVO">💵 Efectivo</option>
                  </select>
                </div>
              </div>

              <div>
                <Label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Nº Comprobante / Referencia Bancaria
                </Label>
                <Input
                  value={abonoRef}
                  onChange={e => setAbonoRef(e.target.value)}
                  placeholder="ej. Transf. #94821 Banco Loja"
                  className="h-9 rounded-xl text-xs bg-slate-50 border-slate-300"
                />
              </div>

              <div>
                <Label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Notas / Observación
                </Label>
                <Input
                  value={abonoNotes}
                  onChange={e => setAbonoNotes(e.target.value)}
                  placeholder="ej. Saldo cancelado en taller por cambio de repuesto"
                  className="h-9 rounded-xl text-xs bg-slate-50 border-slate-300"
                />
              </div>
            </div>

            {/* Acciones */}
            <div className="flex items-center gap-2 pt-2 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAbonoModalOpen(false);
                  setAbonoTargetExpense(null);
                }}
                className="flex-1 h-10 rounded-xl text-xs font-bold text-slate-600 border-slate-300 hover:bg-slate-100 cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                disabled={isSubmittingAbono}
                onClick={handleConfirmarAbono}
                className="flex-1 h-10 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-md"
              >
                {isSubmittingAbono ? 'Asentando...' : 'Confirmar Abono'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CARTERA COMPLETA Y REPORTE PDF */}
      <OwnerDebtsReportModal
        isOpen={isDebtsReportModalOpen}
        onClose={() => setIsDebtsReportModalOpen(false)}
        busId={activeBusId}
        allExpenses={allOwnerExpenses}
        onOpenAbonoModal={(debt) => {
          setIsDebtsReportModalOpen(false);
          handleAbrirAbonoModal(debt);
        }}
      />

      {/* ========================================================= */}
      {/* FASE B: MODAL DE CONFIRMACIÓN: ANULAR PARADA EN CASCADA    */}
      {/* ========================================================= */}
      {paradaParaEliminar && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-sm w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-sm text-slate-900">
                  ¿Anular este Mantenimiento?
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  {paradaParaEliminar.estacionNombre}
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1.5 text-xs text-slate-700">
              <div className="flex justify-between">
                <span className="text-slate-500">Taller:</span>
                <span className="font-bold">{paradaParaEliminar.taller}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Odómetro:</span>
                <span className="font-mono font-bold">{paradaParaEliminar.odometroKm?.toLocaleString()} km</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Costo:</span>
                <span className="font-black text-slate-900">${paradaParaEliminar.costoTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Modalidad:</span>
                <span className="font-bold text-amber-800">
                  {paradaParaEliminar.pagador === 'AYUDANTE' ? 'Ruta Ayudante' : 'Socio Propietario'}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              ⚠️ <strong>Efecto en cascada:</strong> Se cancelará la deuda o egreso registrado, se saneará la cartera y se retirará del historial de la unidad.
            </p>

            <div className="flex items-center gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => setParadaParaEliminar(null)}
                className="flex-1 h-10 rounded-xl text-xs font-bold text-slate-600 border-slate-300 hover:bg-slate-100 cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleConfirmarEliminarParada}
                className="flex-1 h-10 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-700 text-white cursor-pointer shadow-md"
              >
                Sí, Anular Registro
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* FASE B: MODAL DE CONFIRMACIÓN: LIMPIAR PRUEBAS DE LA UNIDAD */}
      {/* ========================================================= */}
      {modalConfirmLimpiarPruebasOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-sm w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-sm text-slate-900">
                  Limpiar Registros de Prueba
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Unidad {activeBusDisco}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              ¿Deseas eliminar <strong>todos los {paradasTallerHistorial.length} registros</strong> de paradas y lubricadoras de prueba de este autobús?
            </p>

            <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-[11px] text-amber-900 space-y-1">
              <p className="font-bold">✓ Se limpiarán automáticamente:</p>
              <ul className="list-disc pl-4 space-y-0.5 text-[10px]">
                <li>El historial de paradas de taller del autobús.</li>
                <li>Las deudas y egresos generados en cartera.</li>
                <li>El saldo arrastrado en caja de ruta.</li>
              </ul>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalConfirmLimpiarPruebasOpen(false)}
                className="flex-1 h-10 rounded-xl text-xs font-bold text-slate-600 border-slate-300 hover:bg-slate-100 cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleConfirmarLimpiarPruebas}
                className="flex-1 h-10 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-700 text-white cursor-pointer shadow-md"
              >
                Limpiar Todo
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}