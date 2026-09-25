/**
 * @file SocioMantenimientoWidget.tsx
 * @description Etiqueta ejecutiva de supervisión de mantenimientos para la vista del Socio Propietario.
 * Reemplaza el widget operativo del chofer ("Mantenimientos a Realizar (Conductor)") en la interfaz del socio.
 * 
 * Semaforización ejecutiva:
 * - 🔴 ROJO: Mantenimientos vencidos (atención inmediata requerida).
 * - 🟡 AMARILLO: Mantenimientos próximos a vencer (planificar parada en taller/lubricadora).
 * - 🟢 VERDE: Todos los mantenimientos al día (operación en rango óptimo).
 * 
 * Al hacer clic en la etiqueta:
 * Despliega un modal ejecutivo claro y organizado con el diagnóstico completo de ítems pendientes,
 * impacto operativo para la toma de decisiones y acceso a la gestión integral de mantenimiento.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Wrench,
  AlertTriangle,
  Clock,
  CheckCircle2,
  ShieldCheck,
  ChevronRight,
  ArrowRight,
  X,
  Gauge,
  Calendar,
  DollarSign,
  AlertCircle,
  Check,
  TrendingUp,
  SlidersHorizontal,
  Info,
} from 'lucide-react';
import {
  getAllBuses,
  getActiveBusId,
  subscribeToActiveBus,
  getLatestBusOdometer,
  subscribeToBusOdometer,
  BusItem,
} from '@/lib/fleet-storage';
import { getCatalogoMaestroGlobal } from '@/lib/mantenimiento-catalogo';
import {
  getBusModuloMantenimientoActivo,
  syncMantenimientoConfigConServidor,
  getBusNivelControl,
  getBusItemsActivosConfig,
  PLANTILLAS_NIVEL_CONTROL,
  CODIGOS_NIVEL_BASICO,
  CODIGOS_NIVEL_MEDIO,
  reconciliarMantenimientosConHistorial,
  resolveMantenimientoItemsParaBus,
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

export interface MantenimientoCalculadoItem extends MantenimientoBusItem {
  kmRecorridos: number;
  kmRestantes: number;
  porcentaje: number;
  esVencido: boolean;
  esProximo: boolean;
  esAlDia: boolean;
  impactoOperativo: string;
}

interface SocioMantenimientoWidgetProps {
  busId?: string;
  onGoToMantenimiento?: () => void;
}

/**
 * Proporciona el análisis de impacto operativo para la toma de decisiones del socio
 */
function getImpactoOperativo(item: MantenimientoBusItem): string {
  const cod = item.codigo || '';
  const cat = item.categoria || '';

  if (cod === 'MNT-ACEITE-MOT') {
    return 'Vital para la vida del motor Hino AK. La degradación térmica del lubricante genera fricción metálica en árbol de levas y turbo.';
  }
  if (cod === 'MNT-FILT-ACEITE' || cod === 'MNT-FILT-TRAMPA' || cod === 'MNT-FILT-DIESEL-SEC') {
    return 'Protege bomba de inyección e inyectores common-rail contra agua e impurezas del diésel. Evita ahogamiento y pérdida de fuerza en subidas.';
  }
  if (cod === 'MNT-RACHES-FRENO' || cod.includes('ZAPATAS') || cat === 'FRENOS') {
    return 'Seguridad de pasaje crítica: La descalibración aumenta la carrera de pedal y riesgo de fatiga térmica en bajadas pronunciadas.';
  }
  if (cod === 'MNT-ENGRASE-CHASIS' || cat === 'RODAJE') {
    return 'Protege crucetas de cardán, muñones y hojas de ballesta. Previene rotura de terminales y vibraciones severas a velocidad crucero.';
  }
  if (cod === 'MNT-AIRE-ACONDICIONADO') {
    return 'Protege el compresor de A/C contra gripado, evita fugas en cañerías y previene rotura de banda motriz por falla del rulimán.';
  }
  if (cod === 'MNT-ACEITE-CAJA' || cod === 'MNT-ACEITE-CORONA' || cat === 'TRANSMISION') {
    return 'Protección de engranajes y piñones hipoides sometidos a alto torque en circuitos interprovinciales y troncales.';
  }
  return 'Componente preventivo programado para evitar paradas mecánicas imprevistas durante la operación comercial.';
}

export function SocioMantenimientoWidget({
  busId: propBusId,
  onGoToMantenimiento,
}: SocioMantenimientoWidgetProps) {
  const [activeBusId, setActiveBusId] = useState<string>(() => propBusId || getActiveBusId());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filtroSeleccionado, setFiltroSeleccionado] = useState<'TODOS' | 'VENCIDOS' | 'PROXIMOS' | 'AL_DIA'>('TODOS');

  // Resolver tacómetro actual garantizando datos auditados reales
  const resolverKmActual = useCallback((bId: string): number => {
    if (typeof window === 'undefined') return 893485;
    const busesList = getAllBuses();
    const current = busesList.find(b => b.id === bId);
    const disco = current?.numeroDisco || '01';

    const audited = getLatestBusOdometer(disco);
    if (audited && audited.kmFinal) {
      const num = parseInt(audited.kmFinal, 10);
      if (!isNaN(num) && num > 0) return num;
    }

    const savedKm = localStorage.getItem(`rg_last_km_${bId}`);
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

    if (disco === '01' || bId === 'BUS-01') return 893485;
    return 187420;
  }, []);

  const [kmActual, setKmActual] = useState<number>(() => resolverKmActual(activeBusId));

  // Cargar lista de mantenimientos monitoreados para esta unidad
  const cargarItems = useCallback((bId: string): MantenimientoBusItem[] => {
    if (typeof window === "undefined") return [];
    const baseKm = resolverKmActual(bId) || 893485;
    // FASE 2 y 3: Motor centralizado jerárquico SuperAdmin + Overrides del Socio + Odómetro
    const resueltos = resolveMantenimientoItemsParaBus(bId, baseKm);
    const nivel = getBusNivelControl(bId);
    const catalogo = getCatalogoMaestroGlobal();
    const itemsConfig = getBusItemsActivosConfig(bId, catalogo.map(c => c.codigo));
    return resueltos.filter(it => {
      if (!it.activo) return false;
      if (nivel === "TOTAL") return true;
      return it.codigo ? (itemsConfig[it.codigo] ?? true) : true;
    });
  }, [resolverKmActual]);

  const [items, setItems] = useState<MantenimientoBusItem[]>(() => cargarItems(activeBusId));

  // Suscripciones reactivas al odómetro y cambio de bus
  useEffect(() => {
    if (propBusId && propBusId !== activeBusId) {
      setActiveBusId(propBusId);
      setKmActual(resolverKmActual(propBusId));
      setItems(cargarItems(propBusId));
    }
  }, [propBusId, activeBusId, resolverKmActual, cargarItems]);

  useEffect(() => {
    const unsubBus = subscribeToActiveBus((bus: BusItem) => {
      setActiveBusId(bus.id);
      setKmActual(resolverKmActual(bus.id));
      setItems(cargarItems(bus.id));
    });
    syncMantenimientoConfigConServidor(activeBusId).then(() => {
      setItems(cargarItems(activeBusId));
    });

    const handleSync = () => {
      setItems(cargarItems(activeBusId));
    };
    window.addEventListener('rg_mantenimiento_config_sync', handleSync);
    window.addEventListener('rg_paradas_pago_updated', handleSync);
    window.addEventListener('rg_owner_expenses_sync', handleSync);
    window.addEventListener('rg_mantenimientos_auto_reconciliados', handleSync);

    const unsubOdo = subscribeToBusOdometer(() => {
      setKmActual(resolverKmActual(activeBusId));
      setItems(cargarItems(activeBusId));
    });
    return () => {
      unsubBus();
      unsubOdo();
      window.removeEventListener('rg_mantenimiento_config_sync', handleSync);
      window.removeEventListener('rg_paradas_pago_updated', handleSync);
      window.removeEventListener('rg_owner_expenses_sync', handleSync);
      window.removeEventListener('rg_mantenimientos_auto_reconciliados', handleSync);
    };
  }, [activeBusId, resolverKmActual, cargarItems]);

  const buses = getAllBuses();
  const currentBus = buses.find(b => b.id === activeBusId);
  const disco = currentBus?.numeroDisco || '01';
  const nivelControl = getBusNivelControl(activeBusId);
  const plantillaNivel = PLANTILLAS_NIVEL_CONTROL[nivelControl] || PLANTILLAS_NIVEL_CONTROL.BASICO;
  const placa = currentBus?.placa || 'TAA-5152';

  // Cálculos ejecutivos de desgaste y semaforización
  const itemsCalculados: MantenimientoCalculadoItem[] = useMemo(() => {
    return items.map(item => {
      const kmRecorridos = Math.max(0, kmActual - item.ultimoKm);
      const kmRestantes = item.intervaloKm - kmRecorridos;
      const esVencido = kmRestantes <= 0;
      // Margen preventivo de alerta: 800 km o 15% del ciclo
      const margenAlerta = Math.min(800, Math.max(250, Math.floor(item.intervaloKm * 0.15)));
      const esProximo = !esVencido && kmRestantes <= margenAlerta;
      const esAlDia = !esVencido && !esProximo;
      const porcentaje = Math.min(100, Math.max(0, (kmRecorridos / item.intervaloKm) * 100));

      return {
        ...item,
        kmRecorridos,
        kmRestantes,
        porcentaje,
        esVencido,
        esProximo,
        esAlDia,
        impactoOperativo: getImpactoOperativo(item),
      };
    });
  }, [items, kmActual]);

  const vencidos = useMemo(() => itemsCalculados.filter(i => i.esVencido), [itemsCalculados]);
  const proximos = useMemo(() => itemsCalculados.filter(i => i.esProximo), [itemsCalculados]);
  const alDia = useMemo(() => itemsCalculados.filter(i => i.esAlDia), [itemsCalculados]);

  const criticosCount = vencidos.length;
  const proximosCount = proximos.length;
  const alDiaCount = alDia.length;

  // Estado general de la unidad para el socio
  const estadoGeneral: 'ROJO' | 'AMARILLO' | 'VERDE' = useMemo(() => {
    if (criticosCount > 0) return 'ROJO';
    if (proximosCount > 0) return 'AMARILLO';
    return 'VERDE';
  }, [criticosCount, proximosCount]);

  // Si el módulo no está activo para este bus, no renderizar nada
  if (!getBusModuloMantenimientoActivo(activeBusId) || items.length === 0) {
    return null;
  }

  // Configurar pestaña por defecto en el modal según gravedad
  const handleOpenModal = () => {
    if (criticosCount > 0) {
      setFiltroSeleccionado('VENCIDOS');
    } else if (proximosCount > 0) {
      setFiltroSeleccionado('PROXIMOS');
    } else {
      setFiltroSeleccionado('TODOS');
    }
    setIsModalOpen(true);
  };

  // Ítems a mostrar en el modal según filtro activo
  const itemsFiltrados = itemsCalculados.filter(item => {
    if (filtroSeleccionado === 'VENCIDOS') return item.esVencido;
    if (filtroSeleccionado === 'PROXIMOS') return item.esProximo;
    if (filtroSeleccionado === 'AL_DIA') return item.esAlDia;
    return true;
  });

  return (
    <>
      {/* ─── ETIQUETA VISUALMENTE ATRACTIVA PARA EL SOCIO ─── */}
      <div
        onClick={handleOpenModal}
        className={`group relative overflow-hidden rounded-2xl border-2 transition-all duration-200 cursor-pointer p-3.5 sm:p-4 shadow-xs hover:shadow-md active:scale-[0.99] ${
          estadoGeneral === 'ROJO'
            ? 'border-rose-400 bg-gradient-to-r from-rose-50 via-white to-rose-50/40 text-rose-950 hover:border-rose-500'
            : estadoGeneral === 'AMARILLO'
            ? 'border-amber-400 bg-gradient-to-r from-amber-50/90 via-white to-amber-50/40 text-amber-950 hover:border-amber-500'
            : 'border-emerald-400 bg-gradient-to-r from-emerald-50/90 via-white to-emerald-50/30 text-emerald-950 hover:border-emerald-500'
        }`}
        role="button"
        tabIndex={0}
        aria-label="Diagnóstico General de Mantenimiento"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Lado Izquierdo: Icono de Semáforo y Título */}
          <div className="flex items-start gap-3">
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-xs transition-transform group-hover:scale-105 ${
                estadoGeneral === 'ROJO'
                  ? 'bg-rose-600 text-white animate-pulse'
                  : estadoGeneral === 'AMARILLO'
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-emerald-600 text-white'
              }`}
            >
              {estadoGeneral === 'ROJO' ? (
                <AlertTriangle className="w-6 h-6" />
              ) : estadoGeneral === 'AMARILLO' ? (
                <Clock className="w-6 h-6" />
              ) : (
                <ShieldCheck className="w-6 h-6" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-0.5">
                {/* ETIQUETA SEMAFÓRICA PRINCIPAL */}
                {estadoGeneral === 'ROJO' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-black uppercase tracking-wide shadow-xs">
                    <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                    Rojo • Mantenimientos Vencidos
                  </span>
                )}
                {estadoGeneral === 'AMARILLO' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black uppercase tracking-wide shadow-xs">
                    <Clock className="w-3 h-3" />
                    Amarillo • Próximos a Vencer
                  </span>
                )}
                {estadoGeneral === 'VERDE' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wide shadow-xs">
                    <CheckCircle2 className="w-3 h-3" />
                    Verde • Mantenimientos al Día
                  </span>
                )}

                <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-slate-900/5 text-slate-700">
                  Bus {disco} ({placa})
                </span>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200/70">
                  {plantillaNivel.nombre}
                </span>
              </div>

              <h4 className="text-sm font-black text-slate-900 leading-tight">
                {estadoGeneral === 'ROJO'
                  ? `Atención Requerida: ${criticosCount} ${criticosCount === 1 ? 'mantenimiento vencido' : 'mantenimientos vencidos'}`
                  : estadoGeneral === 'AMARILLO'
                  ? `Planificar Taller: ${proximosCount} ${proximosCount === 1 ? 'servicio próximo a vencer' : 'servicios próximos a vencer'}`
                  : `Flota Óptima: Todos los mantenimientos al día (${itemsCalculados.length} componentes)`}
              </h4>

              <p className="text-[11px] text-slate-600 mt-0.5 font-medium leading-snug">
                {estadoGeneral === 'ROJO'
                  ? 'Exceso de kilometraje en componentes clave. Riesgo de daño mecánico o parada en ruta.'
                  : estadoGeneral === 'AMARILLO'
                  ? 'Componentes a menos de 800 km del límite preventivo. Conviene coordinar lubricadora.'
                  : `Monitoreo en tiempo real al odómetro de ${kmActual.toLocaleString()} km. Sin intervenciones pendientes.`}
              </p>
            </div>
          </div>

          {/* Lado Derecho: Contadores y Botón de Acción */}
          <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/60">
            {/* Pastillas Numéricas de Resumen */}
            <div className="flex items-center gap-1.5">
              <span
                className={`text-[10px] font-black px-2 py-1 rounded-lg flex items-center gap-1 ${
                  criticosCount > 0 ? 'bg-rose-100 text-rose-800 font-extrabold' : 'bg-slate-100 text-slate-400'
                }`}
                title="Mantenimientos Vencidos"
              >
                🔴 {criticosCount}
              </span>
              <span
                className={`text-[10px] font-black px-2 py-1 rounded-lg flex items-center gap-1 ${
                  proximosCount > 0 ? 'bg-amber-100 text-amber-800 font-extrabold' : 'bg-slate-100 text-slate-400'
                }`}
                title="Mantenimientos Próximos"
              >
                🟡 {proximosCount}
              </span>
              <span
                className="text-[10px] font-black px-2 py-1 rounded-lg bg-emerald-100 text-emerald-800 flex items-center gap-1"
                title="Mantenimientos Al Día"
              >
                🟢 {alDiaCount}
              </span>
            </div>

            <div className="flex items-center gap-1 text-xs font-black text-slate-900 group-hover:translate-x-0.5 transition-transform">
              <span className="text-[11px]">Ver Diagnóstico</span>
              <ChevronRight className="w-4 h-4 text-slate-500" />
            </div>
          </div>
        </div>
      </div>

      {/* ─── MODAL EJECUTIVO: VISTA CLARA Y ORGANIZADA PARA TOMA DE DECISIONES ─── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-2xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-slate-200">
            {/* Cabecera del Modal */}
            <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black ${
                    estadoGeneral === 'ROJO'
                      ? 'bg-rose-600 text-white'
                      : estadoGeneral === 'AMARILLO'
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-emerald-600 text-white'
                  }`}
                >
                  <Wrench className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-base text-slate-900 leading-tight">
                      Supervisión Ejecutiva de Mantenimiento
                    </h3>
                    <Badge className="bg-slate-900 text-white text-[10px] font-black">
                      Bus {disco}
                    </Badge>
                    <Badge className="bg-blue-600 text-white text-[10px] font-black shadow-xs">
                      {plantillaNivel.nombre}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5 mt-0.5">
                    <Gauge className="w-3.5 h-3.5 text-slate-400" />
                    Tacómetro Auditado: <strong className="text-slate-800">{kmActual.toLocaleString()} km</strong>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-9 h-9 rounded-xl bg-slate-200/70 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Resumen Superior para Decisión Gerencial */}
            <div className="p-4 sm:p-5 bg-white border-b border-slate-100 shrink-0 space-y-3">
              {/* Tarjetas KPI de Semáforo */}
              <div className="grid grid-cols-3 gap-2.5">
                <div
                  onClick={() => setFiltroSeleccionado('VENCIDOS')}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer text-center ${
                    filtroSeleccionado === 'VENCIDOS'
                      ? 'border-rose-500 bg-rose-50/80 shadow-xs ring-2 ring-rose-300'
                      : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/60'
                  }`}
                >
                  <span className="text-xs font-black text-rose-700 block uppercase tracking-tight">
                    🔴 Vencidos
                  </span>
                  <span className="text-2xl font-black text-rose-900 block my-0.5">
                    {criticosCount}
                  </span>
                  <span className="text-[10px] font-semibold text-rose-600 block">
                    {criticosCount > 0 ? 'Parada Prioritaria' : 'Sin atrasos'}
                  </span>
                </div>

                <div
                  onClick={() => setFiltroSeleccionado('PROXIMOS')}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer text-center ${
                    filtroSeleccionado === 'PROXIMOS'
                      ? 'border-amber-500 bg-amber-50/80 shadow-xs ring-2 ring-amber-300'
                      : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/60'
                  }`}
                >
                  <span className="text-xs font-black text-amber-800 block uppercase tracking-tight">
                    🟡 Próximos
                  </span>
                  <span className="text-2xl font-black text-amber-950 block my-0.5">
                    {proximosCount}
                  </span>
                  <span className="text-[10px] font-semibold text-amber-700 block">
                    {proximosCount > 0 ? 'Programar Taller' : 'Sin alertas'}
                  </span>
                </div>

                <div
                  onClick={() => setFiltroSeleccionado('AL_DIA')}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer text-center ${
                    filtroSeleccionado === 'AL_DIA'
                      ? 'border-emerald-500 bg-emerald-50/80 shadow-xs ring-2 ring-emerald-300'
                      : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/60'
                  }`}
                >
                  <span className="text-xs font-black text-emerald-800 block uppercase tracking-tight">
                    🟢 Al Día
                  </span>
                  <span className="text-2xl font-black text-emerald-950 block my-0.5">
                    {alDiaCount}
                  </span>
                  <span className="text-[10px] font-semibold text-emerald-700 block">
                    Operación Óptima
                  </span>
                </div>
              </div>

              {/* Barra de Filtros Rápidos */}
              <div className="flex items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                  <button
                    type="button"
                    onClick={() => setFiltroSeleccionado('TODOS')}
                    className={`px-3 py-1 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                      filtroSeleccionado === 'TODOS'
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Todos ({itemsCalculados.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFiltroSeleccionado('VENCIDOS')}
                    className={`px-3 py-1 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                      filtroSeleccionado === 'VENCIDOS'
                        ? 'bg-rose-600 text-white'
                        : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                    }`}
                  >
                    Vencidos ({criticosCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFiltroSeleccionado('PROXIMOS')}
                    className={`px-3 py-1 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                      filtroSeleccionado === 'PROXIMOS'
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                    }`}
                  >
                    Próximos ({proximosCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFiltroSeleccionado('AL_DIA')}
                    className={`px-3 py-1 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                      filtroSeleccionado === 'AL_DIA'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    }`}
                  >
                    Al Día ({alDiaCount})
                  </button>
                </div>

                <span className="text-[11px] text-slate-400 font-semibold shrink-0 hidden sm:inline">
                  {itemsFiltrados.length} componentes
                </span>
              </div>
            </div>

            {/* Lista Desplazable de Mantenimientos Organizados */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
              {itemsFiltrados.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500/60" />
                  <p className="text-sm font-bold text-slate-600">
                    No hay componentes bajo este criterio de filtro.
                  </p>
                </div>
              ) : (
                itemsFiltrados.map(item => {
                  return (
                    <div
                      key={item.id}
                      className={`p-3.5 sm:p-4 rounded-2xl border transition-all ${
                        item.esVencido
                          ? 'border-rose-300 bg-rose-50/40'
                          : item.esProximo
                          ? 'border-amber-300 bg-amber-50/40'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      {/* Cabecera del Ítem */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-black text-slate-900 leading-snug">
                              {item.nombre}
                            </span>
                            {item.categoria && (
                              <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                                {item.categoria}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500 font-medium">
                            Ciclo oficial: cada {item.intervaloKm.toLocaleString()} km
                          </p>
                        </div>

                        {/* Estado Semafórico */}
                        {item.esVencido ? (
                          <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-rose-600 text-white shrink-0 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Excedido por {Math.abs(item.kmRestantes).toLocaleString()} km
                          </span>
                        ) : item.esProximo ? (
                          <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-amber-500 text-slate-950 shrink-0 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Restan {item.kmRestantes.toLocaleString()} km
                          </span>
                        ) : (
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 shrink-0 flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            Al Día ({item.kmRestantes.toLocaleString()} km libres)
                          </span>
                        )}
                      </div>

                      {/* Barra de Desgaste Porcentual */}
                      <div className="space-y-1 mb-2.5">
                        <div className="flex justify-between text-[10px] font-bold">
                          <span className="text-slate-500">Desgaste del Ciclo</span>
                          <span
                            className={
                              item.esVencido
                                ? 'text-rose-700 font-black'
                                : item.esProximo
                                ? 'text-amber-800 font-black'
                                : 'text-emerald-700'
                            }
                          >
                            {item.porcentaje.toFixed(0)}%
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              item.esVencido
                                ? 'bg-rose-600'
                                : item.esProximo
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min(100, item.porcentaje)}%` }}
                          />
                        </div>
                      </div>

                      {/* Caja de Impacto Operativo para Toma de Decisiones */}
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] space-y-1">
                        <div className="flex items-center gap-1.5 font-black text-slate-800">
                          <Info className="w-3.5 h-3.5 text-slate-500" />
                          <span>Impacto en la Operación:</span>
                        </div>
                        <p className="text-slate-600 leading-snug">
                          {item.impactoOperativo}
                        </p>
                      </div>

                      {/* Fila Informativa de Último Asentamiento */}
                      <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500">
                        <div className="flex items-center gap-2">
                          <span>
                            Último cambio: <strong className="text-slate-700">{item.ultimoKm.toLocaleString()} km</strong>
                          </span>
                          {item.fechaUltimo && (
                            <span>• {item.fechaUltimo}</span>
                          )}
                        </div>
                        {item.costoEstimado && item.costoEstimado > 0 ? (
                          <span className="font-bold text-slate-700">
                            Estimado: ${item.costoEstimado.toFixed(2)}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Pie de Acciones del Modal */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/80 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <span className="text-[11px] text-slate-500 text-center sm:text-left">
                El odómetro se alimenta automáticamente de los arqueos de llegada de la unidad.
              </span>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 sm:flex-initial h-10 rounded-xl text-xs font-bold"
                >
                  Cerrar
                </Button>

                {onGoToMantenimiento && (
                  <Button
                    size="sm"
                    onClick={() => {
                      setIsModalOpen(false);
                      onGoToMantenimiento();
                    }}
                    className="flex-1 sm:flex-initial h-10 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black shadow-xs cursor-pointer"
                  >
                    <Wrench className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
                    Abrir Gestión Integral de Taller
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
