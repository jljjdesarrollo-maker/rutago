/**
 * @file SocioMantenimientoWidget.tsx
 * @description Alerta ejecutiva 1x2 y Pantalla Dedicada Coherente para el Socio Propietario.
 *
 * Características principales:
 * 1. En el Dashboard (debajo de la cuadrícula 2x2):
 *    - Layout 1x2 de alto contraste y balance visual:
 *      * Card 1: Disponibilidad y Tiempos en Loja (Ventana de Hoy con horas exactas + Parada Mayor de Retén).
 *      * Card 2: Semáforo y Alertas de Mantenimiento (🔴 Vencidos | 🟡 Próximos) con colores de contraste.
 *
 * 2. Al ingresar (Pantalla Dedicada Ejecutiva):
 *    - Arquitectura libre de bloqueo de scroll (h-[100dvh] en móvil y h-[90vh] en desktop con scroll nativo fluido).
 *    - Cabecera fija superior y pie fijo inferior siempre visibles.
 *    - Presenta EXCLUSIVAMENTE 2 cosas con diseño compacto y coherente:
 *      - COSA 1: ¿Cuándo tiene tiempo para hacer mantenimiento?
 *        * Fila principal de HOY resaltada con horarios exactos de Loja.
 *        * Franja ejecutiva de Parada Mayor (Día de Retén - 24h libres).
 *        * Cronología compacta tipo tabla de los siguientes días en ruta.
 *      - COSA 2: ¿Qué mantenimientos debe o puede realizar?
 *        * Lista ÚNICAMENTE los componentes vencidos o próximos a vencer, en tarjetas horizontales compactas
 *          cruzadas con la recomendación táctica del tiempo disponible.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Wrench,
  AlertTriangle,
  Clock,
  CheckCircle2,
  ShieldCheck,
  ChevronRight,
  ArrowLeft,
  Gauge,
  Sparkles,
  Info,
  Calendar,
  X,
} from 'lucide-react';
import {
  getAllBuses,
  getActiveBusId,
  subscribeToActiveBus,
  getLatestBusOdometer,
  subscribeToBusOdometer,
  type BusItem,
} from '@/lib/fleet-storage';
import { getCatalogoMaestroGlobal } from '@/lib/mantenimiento-catalogo';
import {
  PLANTILLAS_NIVEL_CONTROL,
  getBusNivelControl,
  getBusModuloMantenimientoActivo,
  resolveMantenimientoItemsParaBus,
  syncMantenimientoConfigConServidor,
  getBusItemsActivosConfig,
  type MantenimientoBusItem,
} from '@/lib/mantenimiento-estaciones';
import {
  getVentanaMayorParaVT,
  getVentanasOperativasParaVT,
  subscribeToVTConfig,
} from '@/lib/vt-ventanas-storage';
import { formatearMinutosLegible } from '@/lib/vt-ventanas-catalogo';

interface SocioMantenimientoWidgetProps {
  propBusId?: string;
  onGoToMantenimiento?: () => void;
}

interface MantenimientoCalculadoItem extends MantenimientoBusItem {
  kmRecorridos: number;
  kmRestantes: number;
  porcentaje: number;
  esVencido: boolean;
  esProximo: boolean;
  esAlDia: boolean;
  impactoOperativo: string;
}

interface TiempoDisponibleItem {
  offset: number;
  esHoy: boolean;
  esManana: boolean;
  esDiaReten: boolean;
  etiquetaFecha: string;
  nombreDia: string;
  fechaCorta: string;
  vtCodigo: string;
  horaInicio: string;
  horaFin: string;
  duracionMinutos: number;
  duracionTexto: string;
  descripcionDisponible: string;
  sugerenciaTaller: string;
}

const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MESES_ABR = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const MESES_COMPLETOS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export function SocioMantenimientoWidget({
  propBusId,
  onGoToMantenimiento,
}: SocioMantenimientoWidgetProps) {
  const [activeBusId, setActiveBusId] = useState<string>(() => propBusId || getActiveBusId());
  const [isViewOpen, setIsViewOpen] = useState(false);

  // Tacómetro auditado en tiempo real
  const resolverKmActual = useCallback((bId: string): number => {
    if (typeof window === 'undefined') return 893485;
    const busesList = getAllBuses();
    const current = busesList.find((b) => b.id === bId);
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
    if (typeof window === 'undefined') return [];
    const baseKm = resolverKmActual(bId) || 893485;
    const resueltos = resolveMantenimientoItemsParaBus(bId, baseKm);
    const nivel = getBusNivelControl(bId);
    const catalogo = getCatalogoMaestroGlobal();
    const itemsConfig = getBusItemsActivosConfig(bId, catalogo.map((c) => c.codigo));

    return resueltos.filter((it) => {
      if (!it.activo) return false;
      if (nivel === 'TOTAL') return true;
      return it.codigo ? (itemsConfig[it.codigo] ?? true) : true;
    });
  }, [resolverKmActual]);

  const [items, setItems] = useState<MantenimientoBusItem[]>(() => cargarItems(activeBusId));

  // Suscripción a cambios de bus y odómetro
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

    const unsubVT = subscribeToVTConfig(() => {});

    return () => {
      unsubBus();
      unsubOdo();
      unsubVT();
      window.removeEventListener('rg_mantenimiento_config_sync', handleSync);
      window.removeEventListener('rg_paradas_pago_updated', handleSync);
      window.removeEventListener('rg_owner_expenses_sync', handleSync);
      window.removeEventListener('rg_mantenimientos_auto_reconciliados', handleSync);
    };
  }, [activeBusId, resolverKmActual, cargarItems]);

  const buses = getAllBuses();
  const currentBus = buses.find((b) => b.id === activeBusId);
  const disco = currentBus?.numeroDisco || '01';
  const nivelControl = getBusNivelControl(activeBusId);
  const plantillaNivel = PLANTILLAS_NIVEL_CONTROL[nivelControl] || PLANTILLAS_NIVEL_CONTROL.BASICO;
  const placa = currentBus?.placa || 'TAA-5152';

  // Cálculos de desgaste y semaforización ejecutiva
  const itemsCalculados: MantenimientoCalculadoItem[] = useMemo(() => {
    return items.map((item) => {
      const kmRecorridos = Math.max(0, kmActual - (item.ultimoKm || 0));
      const intervalo = item.intervaloKm || 5000;
      const kmRestantes = intervalo - kmRecorridos;
      const esVencido = kmRestantes <= 0;
      const margenAlerta = Math.min(800, Math.max(250, Math.floor(intervalo * 0.15)));
      const esProximo = !esVencido && kmRestantes <= margenAlerta;
      const esAlDia = !esVencido && !esProximo;
      const porcentaje = Math.min(100, Math.max(0, (kmRecorridos / intervalo) * 100));

      let impacto = 'Inspección periódica según pauta de fábrica.';
      const n = (item.nombre || '').toLowerCase();
      if (n.includes('aceite') && n.includes('motor')) {
        impacto = 'Riesgo de pérdida de viscosidad y daño en camisas del motor Hino AK.';
      } else if (n.includes('filtro') && n.includes('di')) {
        impacto = 'Pérdida de potencia en cuestas hacia Loja y obstrucción de inyectores.';
      } else if (n.includes('caja') || n.includes('transmisi')) {
        impacto = 'Fricción pesada en piñonería de caja y sincronizados.';
      } else if (n.includes('corona') || n.includes('diferencial')) {
        impacto = 'Desgaste severo en corona y piñón de ataque con riesgo en carretera.';
      } else if (n.includes('freno') || n.includes('zapata')) {
        impacto = 'Pérdida de adherencia y calentamiento de tambores en bajadas.';
      } else if (n.includes('embrague')) {
        impacto = 'Patinamiento del disco bajo carga de pasajeros en pendientes.';
      } else if (n.includes('engrase') || n.includes('chasis')) {
        impacto = 'Holgura en crucetas de cardán y terminales de dirección.';
      }

      return {
        ...item,
        kmRecorridos,
        kmRestantes,
        porcentaje,
        esVencido,
        esProximo,
        esAlDia,
        impactoOperativo: impacto,
      };
    });
  }, [items, kmActual]);

  const vencidos = useMemo(() => itemsCalculados.filter((i) => i.esVencido), [itemsCalculados]);
  const proximos = useMemo(() => itemsCalculados.filter((i) => i.esProximo), [itemsCalculados]);
  const alDia = useMemo(() => itemsCalculados.filter((i) => i.esAlDia), [itemsCalculados]);

  const criticosCount = vencidos.length;
  const proximosCount = proximos.length;
  const alDiaCount = alDia.length;

  // Turno base asignado hoy para este bus
  const turnoBaseCodigo = useMemo(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`rg_chofer_selected_vt_${activeBusId}`);
      if (saved) return saved;
    }
    const num = parseInt(disco.replace(/\D/g, '') || '1', 10);
    const numVT = ((num * 7) % 15) + 1;
    return num === 1 ? 'VT08' : `VT${String(numVT).padStart(2, '0')}`;
  }, [activeBusId, disco]);

  // Cálculo de los Próximos 5 Tiempos Disponibles y Día de Retén
  const { proximosTiempos, diaRetenInfo } = useMemo(() => {
    const hoy = new Date();
    const match = turnoBaseCodigo.match(/\d+/);
    const vtNumBase = match ? parseInt(match[0], 10) : 8;

    const discoNum = parseInt(disco.replace(/\D/g, '') || '1', 10);
    const diasParaReten = Math.max(1, ((16 - ((discoNum + vtNumBase) % 16)) % 16) || 2);

    const fechaReten = new Date(hoy);
    fechaReten.setDate(hoy.getDate() + diasParaReten);
    const diaSemanaReten = DIAS_SEMANA[fechaReten.getDay()];
    const diaNumReten = fechaReten.getDate();
    const mesReten = MESES_COMPLETOS[fechaReten.getMonth()];

    const listaTiempos: TiempoDisponibleItem[] = [];

    for (let i = 0; i < 5; i++) {
      const d = new Date(hoy);
      d.setDate(hoy.getDate() + i);

      const esHoy = i === 0;
      const esManana = i === 1;
      const esDiaReten = i === diasParaReten;

      const diaNombre = DIAS_SEMANA[d.getDay()];
      const diaNum = d.getDate();
      const mesAbr = MESES_ABR[d.getMonth()];
      const fechaCorta = `${diaNombre.slice(0, 3)} ${diaNum} ${mesAbr}`;

      let etiquetaFecha = '';
      if (esHoy) {
        etiquetaFecha = `HOY (${diaNombre} ${diaNum} ${mesAbr})`;
      } else if (esManana) {
        etiquetaFecha = `Mañana (${diaNombre} ${diaNum} ${mesAbr})`;
      } else {
        etiquetaFecha = `${diaNombre} ${diaNum} ${mesAbr} (en ${i} días)`;
      }

      const vtNumDia = ((vtNumBase - 1 + i) % 15) + 1;
      const vtCodigo = `VT${String(vtNumDia).padStart(2, '0')}`;

      let horaInicio = '10:30';
      let horaFin = '13:40';
      let duracionMinutos = 190;
      let duracionTexto = '3h 10m';
      let descripcionDisponible = `Tiene 3h 10m disponible desde 10:30 a 13:40 en Loja`;
      let sugerenciaTaller = 'Lubricadora: cambio de aceite, filtros y engrase general.';

      if (esDiaReten) {
        horaInicio = '00:00';
        horaFin = '23:59';
        duracionMinutos = 1440;
        duracionTexto = '24h';
        descripcionDisponible = `Tiene 24h disponibles el ${diaNombre} ${diaNum} de ${MESES_COMPLETOS[d.getMonth()]}`;
        sugerenciaTaller = 'Parada Mayor: fosa completa para caja, embrague o zapatas sin perder carreras.';
      } else {
        const ventanaMayor = getVentanaMayorParaVT(vtCodigo);
        if (ventanaMayor && ventanaMayor.horaInicio && ventanaMayor.horaFin) {
          horaInicio = ventanaMayor.horaInicio;
          horaFin = ventanaMayor.horaFin;
          duracionMinutos = ventanaMayor.duracionMinutos;
          duracionTexto = formatearMinutosLegible(duracionMinutos);
          descripcionDisponible = `Tiene ${duracionTexto} disponible desde ${horaInicio} a ${horaFin} en Loja`;
          if (duracionMinutos >= 150) {
            sugerenciaTaller = 'Lubricadora, cambio de aceite de motor, filtros y engrase de chasis.';
          } else if (duracionMinutos >= 90) {
            sugerenciaTaller = 'Cambio rápido de aceite o revisión de zapatas y frenos.';
          } else {
            sugerenciaTaller = 'Escala técnica: calibración de llantas, diésel y niveles.';
          }
        } else {
          const ventanasTurno = getVentanasOperativasParaVT(vtCodigo);
          if (ventanasTurno.length > 0 && ventanasTurno[0].horaInicio) {
            const v = ventanasTurno[0];
            horaInicio = v.horaInicio;
            horaFin = v.horaFin;
            duracionMinutos = v.duracionMinutos;
            duracionTexto = formatearMinutosLegible(duracionMinutos);
            descripcionDisponible = `Tiene ${duracionTexto} disponible desde ${horaInicio} a ${horaFin} en Loja`;
          } else {
            horaInicio = '11:15';
            horaFin = '13:00';
            duracionMinutos = 105;
            duracionTexto = '1h 45m';
            descripcionDisponible = `Tiene 1h 45m disponible desde 11:15 a 13:00 en Loja`;
            sugerenciaTaller = 'Revisión rápida en lubricadora o ajuste de bandas.';
          }
        }
      }

      listaTiempos.push({
        offset: i,
        esHoy,
        esManana,
        esDiaReten,
        etiquetaFecha,
        nombreDia: diaNombre,
        fechaCorta,
        vtCodigo,
        horaInicio,
        horaFin,
        duracionMinutos,
        duracionTexto,
        descripcionDisponible,
        sugerenciaTaller,
      });
    }

    const diaRetenInfo = {
      diasFaltantes: diasParaReten,
      textoExacto: `Tiene 24h disponibles el ${diaSemanaReten} ${diaNumReten} de ${mesReten} (en ${diasParaReten} ${diasParaReten === 1 ? 'día' : 'días'})`,
      fechaCompleta: `${diaSemanaReten} ${diaNumReten} de ${mesReten}`,
      sugerencia: 'Día completo en fosa (24h) para trabajos pesados (caja, embrague, muelles o zapatas) con 0 carreras perdidas.',
    };

    return { proximosTiempos: listaTiempos, diaRetenInfo };
  }, [turnoBaseCodigo, disco]);

  const tiempoHoy = proximosTiempos[0] || {
    descripcionDisponible: 'Tiene 3h 10m disponible desde 10:30 a 13:40 en Loja',
    vtCodigo: 'VT08',
    duracionTexto: '3h 10m',
    horaInicio: '10:30',
    horaFin: '13:40',
    sugerenciaTaller: 'Cambio de aceite, filtros y engrase de chasis.',
  };

  if (!getBusModuloMantenimientoActivo(activeBusId) || items.length === 0) {
    return null;
  }

  return (
    <>
      {/* ─── ALERTA EJECUTIVA 1x2 (DEBAJO DE LA CUADRÍCULA 2x2 EN EL DASHBOARD) ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mt-3">
        {/* Card 1: Disponibilidad y Tiempo (Formato Claro y Exacto) */}
        <div
          onClick={() => setIsViewOpen(true)}
          className="group cursor-pointer rounded-3xl p-4 sm:p-5 bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950 text-white border border-blue-500/40 hover:border-blue-400 shadow-md transition-all hover:scale-[1.01] active:scale-[0.99] flex flex-col justify-between"
          role="button"
          tabIndex={0}
          aria-label="Ver Disponibilidad y Tiempos de Taller"
        >
          {/* Cabecera Card 1 */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-400/40 flex items-center justify-center text-blue-300">
                <Clock className="w-4 h-4 text-cyan-400" />
              </div>
              <span className="text-[11px] font-black uppercase tracking-wider text-cyan-300">
                Disponibilidad Operativa
              </span>
            </div>
            <span className="text-[10px] font-mono bg-emerald-950/80 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
              0 carreras perdidas
            </span>
          </div>

          {/* Mensaje Principal: Texto Claro y Exacto */}
          <div className="my-1.5 space-y-1">
            <p className="text-xs text-slate-300 font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              Hoy en ruta ({tiempoHoy.vtCodigo}):
            </p>
            <h4 className="text-sm sm:text-base font-black text-white leading-tight">
              &quot;{tiempoHoy.descripcionDisponible}&quot;
            </h4>
          </div>

          {/* Footer Card 1: Parada Mayor (Retén) */}
          <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-amber-300/90 font-bold">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>
                Retén en {diaRetenInfo.diasFaltantes} {diaRetenInfo.diasFaltantes === 1 ? 'día' : 'días'} (24h libres)
              </span>
            </span>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
          </div>
        </div>

        {/* Card 2: Mantenimientos y Estados (Alto Contraste Semafórico) */}
        <div
          onClick={() => setIsViewOpen(true)}
          className={`group cursor-pointer rounded-3xl p-4 sm:p-5 text-left border shadow-md transition-all hover:scale-[1.01] active:scale-[0.99] flex flex-col justify-between ${
            criticosCount > 0
              ? 'bg-gradient-to-br from-rose-950/90 via-slate-900 to-slate-900 text-white border-rose-500/80 ring-1 ring-rose-500/30 shadow-rose-950/20'
              : proximosCount > 0
              ? 'bg-gradient-to-br from-amber-950/90 via-slate-900 to-slate-900 text-white border-amber-500/80 ring-1 ring-amber-500/30 shadow-amber-950/20'
              : 'bg-gradient-to-br from-emerald-950/90 via-slate-900 to-slate-900 text-white border-emerald-500/80 ring-1 ring-emerald-500/30 shadow-emerald-950/20'
          }`}
          role="button"
          tabIndex={0}
          aria-label="Ver Diagnóstico de Mantenimientos Pendientes"
        >
          {/* Cabecera Card 2 */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                  criticosCount > 0
                    ? 'bg-rose-500/20 border border-rose-400/50 text-rose-300'
                    : proximosCount > 0
                    ? 'bg-amber-500/20 border border-amber-400/50 text-amber-300'
                    : 'bg-emerald-500/20 border border-emerald-400/50 text-emerald-300'
                }`}
              >
                {criticosCount > 0 ? (
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                ) : proximosCount > 0 ? (
                  <Clock className="w-4 h-4 text-amber-400" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                )}
              </div>
              <span
                className={`text-[11px] font-black uppercase tracking-wider ${
                  criticosCount > 0
                    ? 'text-rose-300'
                    : proximosCount > 0
                    ? 'text-amber-300'
                    : 'text-emerald-300'
                }`}
              >
                {criticosCount > 0
                  ? 'Atención Mecánica Requerida'
                  : proximosCount > 0
                  ? 'Planificación de Taller'
                  : 'Unidad 100% al Día'}
              </span>
            </div>
            <Badge className="bg-white/10 text-white text-[10px] font-black border-white/20">
              Bus {disco}
            </Badge>
          </div>

          {/* Pastillas de Alto Contraste */}
          <div className="my-1.5 flex items-center gap-2">
            <span
              className={`text-xs font-black px-2.5 py-1 rounded-xl flex items-center gap-1.5 ${
                criticosCount > 0
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-white/10 text-slate-400'
              }`}
            >
              🔴 {criticosCount} {criticosCount === 1 ? 'Vencido' : 'Vencidos'}
            </span>
            <span
              className={`text-xs font-black px-2.5 py-1 rounded-xl flex items-center gap-1.5 ${
                proximosCount > 0
                  ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                  : 'bg-white/10 text-slate-400'
              }`}
            >
              🟡 {proximosCount} {proximosCount === 1 ? 'Próximo' : 'Próximos'}
            </span>
            {criticosCount === 0 && proximosCount === 0 && (
              <span className="text-xs font-black px-2.5 py-1 rounded-xl bg-emerald-600 text-white">
                🟢 Al Día ({alDiaCount})
              </span>
            )}
          </div>

          {/* Footer Card 2: CTA */}
          <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between text-[11px]">
            <span className="text-slate-300 font-medium">
              {criticosCount > 0
                ? `${criticosCount} ${criticosCount === 1 ? 'componente requiere' : 'componentes requieren'} fosa prioritaria`
                : proximosCount > 0
                ? `${proximosCount} ${proximosCount === 1 ? 'servicio por vencer' : 'servicios por vencer'} esta semana`
                : 'Tacómetro auditado sin alertas'}
            </span>
            <span className="font-black text-white flex items-center gap-1 group-hover:text-amber-300 transition-colors">
              Ver Detalle
              <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </div>
        </div>
      </div>

      {/* ─── PANTALLA DEDICADA: ARQUITECTURA LIMPIA SIN BLOQUEO DE SCROLL (h-[100dvh]) ─── */}
      {isViewOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-0 sm:p-4 overflow-hidden animate-in fade-in duration-150">
          <div className="w-full max-w-2xl h-[100dvh] sm:h-[88vh] bg-slate-50 sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
            {/* 1. Barra de Navegación Ejecutiva Superior (Fija) */}
            <header className="p-3.5 sm:p-4 border-b border-slate-200 bg-white flex items-center justify-between shrink-0 shadow-xs z-10">
              <div className="flex items-center gap-2.5 min-w-0">
                <button
                  type="button"
                  onClick={() => setIsViewOpen(false)}
                  className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                  title="Volver al Panel"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-black text-sm sm:text-base text-slate-900 truncate">
                      Disponibilidad y Mantenimientos
                    </h3>
                    <Badge className="bg-slate-900 text-white text-[10px] font-black shrink-0">
                      Bus {disco}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium truncate flex items-center gap-1.5">
                    <Gauge className="w-3 h-3 text-slate-400 shrink-0" />
                    Tacómetro Auditado: <strong className="text-slate-800">{kmActual.toLocaleString()} km</strong>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsViewOpen(false)}
                className="w-8 h-8 rounded-xl hover:bg-slate-100 text-slate-500 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                title="Cerrar"
              >
                <X className="w-4 h-4" />
              </button>
            </header>

            {/* 2. Cuerpo Desplazable con UN SOLO SCROLL FLUIDO */}
            <main className="flex-1 overflow-y-auto overscroll-contain p-3.5 sm:p-5 space-y-5">
              {/* ═══════════════════════════════════════════════════════════════
                  COSA 1: ¿CUÁNDO TIENE TIEMPO PARA HACER MANTENIMIENTO?
                  ═══════════════════════════════════════════════════════════════ */}
              <section className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
                      <Clock className="w-3.5 h-3.5" />
                    </div>
                    <h4 className="font-black text-xs sm:text-sm text-slate-900 uppercase tracking-tight">
                      1. ¿Cuándo tiene tiempo para hacer mantenimiento?
                    </h4>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 shrink-0">
                    0 Carreras Perdidas
                  </span>
                </div>

                {/* Tarjeta de Alto Impacto: HOY EN RUTA */}
                <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-br from-blue-50 via-white to-white border-2 border-blue-500/80 shadow-xs space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-black uppercase px-2 py-0.5 rounded-full bg-blue-600 text-white flex items-center gap-1 text-[10px]">
                      <Sparkles className="w-3 h-3 text-amber-300" />
                      Disponible Hoy Mismo
                    </span>
                    <span className="font-bold text-blue-900 font-mono text-[11px]">
                      Turno {tiempoHoy.vtCodigo} • {tiempoHoy.duracionTexto} libres
                    </span>
                  </div>

                  <h5 className="text-sm sm:text-base font-black text-slate-900 leading-snug">
                    &quot;{tiempoHoy.descripcionDisponible}&quot;
                  </h5>

                  <p className="text-xs text-slate-600 font-medium">
                    💡 <strong>Da tiempo para:</strong> {tiempoHoy.sugerenciaTaller}
                  </p>
                </div>

                {/* Franja Ejecutiva de Parada Mayor (Día de Retén) */}
                <div className="p-3 sm:p-3.5 rounded-2xl bg-gradient-to-r from-amber-950 via-slate-900 to-slate-900 text-white border border-amber-500/50 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                      <span className="text-[11px] font-black text-amber-300 uppercase tracking-wide">
                        Parada Mayor (Día de Retén)
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm font-black text-white">
                      &quot;{diaRetenInfo.textoExacto}&quot;
                    </p>
                    <p className="text-[11px] text-amber-200/90 font-medium">
                      💡 Fosa completa (24h) para caja, embrague o zapatas con 0 carreras perdidas.
                    </p>
                  </div>
                  <span className="self-start sm:self-center text-[10px] font-mono bg-amber-400 text-slate-950 px-2.5 py-1 rounded-full font-black shrink-0">
                    24h Libres
                  </span>
                </div>

                {/* Cronología Compacta de los Próximos Días */}
                <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
                  <div className="p-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      Cronología Táctica de los Próximos 5 Días
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">Horarios en Loja</span>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {proximosTiempos.map((t) => (
                      <div
                        key={t.offset}
                        className={`p-2.5 sm:px-3 flex items-center justify-between gap-2 text-xs transition-colors ${
                          t.esHoy
                            ? 'bg-blue-50/70 font-semibold'
                            : t.esDiaReten
                            ? 'bg-amber-50/70'
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {t.esHoy ? (
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />
                          ) : t.esDiaReten ? (
                            <ShieldCheck className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          ) : (
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0" />
                          )}
                          <span className={`font-bold truncate ${t.esHoy ? 'text-blue-950' : 'text-slate-800'}`}>
                            {t.esHoy ? 'Hoy' : t.fechaCorta}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono shrink-0">
                            {t.esDiaReten ? 'Retén' : t.vtCodigo}
                          </span>
                        </div>

                        <div className="text-right shrink-0">
                          <span className={`font-mono font-bold ${t.esDiaReten ? 'text-amber-800' : 'text-slate-700'}`}>
                            {t.esDiaReten ? '24h libres en fosa' : `${t.horaInicio} a ${t.horaFin}`}
                          </span>
                          {!t.esDiaReten && (
                            <span className="text-[10px] text-slate-400 ml-1.5 font-medium">
                              ({t.duracionTexto})
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* ═══════════════════════════════════════════════════════════════
                  COSA 2: ¿QUÉ MANTENIMIENTOS PUEDE O DEBE REALIZAR?
                  ═══════════════════════════════════════════════════════════════ */}
              <section className="space-y-2.5 pt-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-6 h-6 rounded-lg flex items-center justify-center text-white shrink-0 ${
                        criticosCount > 0
                          ? 'bg-rose-600'
                          : proximosCount > 0
                          ? 'bg-amber-500'
                          : 'bg-emerald-600'
                      }`}
                    >
                      <Wrench className="w-3.5 h-3.5" />
                    </div>
                    <h4 className="font-black text-xs sm:text-sm text-slate-900 uppercase tracking-tight">
                      2. ¿Qué mantenimientos debe o puede realizar?
                    </h4>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {criticosCount > 0 && (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-600 text-white">
                        🔴 {criticosCount} Vencidos
                      </span>
                    )}
                    {proximosCount > 0 && (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-bold">
                        🟡 {proximosCount} Próximos
                      </span>
                    )}
                  </div>
                </div>

                {/* Si no hay vencidos ni próximos: Pantalla Tranquilizadora */}
                {criticosCount === 0 && proximosCount === 0 ? (
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-1.5">
                    <CheckCircle2 className="w-7 h-7 mx-auto text-emerald-600" />
                    <h5 className="text-sm font-black text-emerald-950">
                      🟢 Unidad 100% al Día y en Rango Óptimo
                    </h5>
                    <p className="text-xs text-emerald-800 font-medium">
                      Todos los componentes monitoreados están al día. No tienes intervenciones pendientes para hoy ni esta semana.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {[...vencidos, ...proximos].map((item) => {
                      let accionRecomendada = '';
                      const nombreLow = item.nombre.toLowerCase();

                      if (
                        nombreLow.includes('aceite') ||
                        nombreLow.includes('filtro') ||
                        nombreLow.includes('engrase')
                      ) {
                        accionRecomendada = `Hacer HOY en la ventana de Loja (${tiempoHoy.horaInicio} a ${tiempoHoy.horaFin}) sin perder carreras.`;
                      } else {
                        accionRecomendada = `Programar para la Parada Mayor (${diaRetenInfo.textoExacto}) para tener 24h libres en fosa.`;
                      }

                      return (
                        <div
                          key={item.id}
                          className={`p-3.5 rounded-2xl border transition-all ${
                            item.esVencido
                              ? 'border-rose-400 bg-rose-50/70 shadow-xs'
                              : 'border-amber-400 bg-amber-50/70 shadow-xs'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <div className="min-w-0">
                              <span className="text-xs sm:text-sm font-black text-slate-900 leading-tight block truncate">
                                {item.nombre}
                              </span>
                              <span className="text-[10px] text-slate-500 font-medium">
                                Pauta: cada {(item.intervaloKm || 0).toLocaleString()} km
                              </span>
                            </div>

                            {item.esVencido ? (
                              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-600 text-white shrink-0 shadow-xs flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                Excedido por {Math.abs(item.kmRestantes).toLocaleString()} km
                              </span>
                            ) : (
                              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 shrink-0 shadow-xs flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Restan {item.kmRestantes.toLocaleString()} km
                              </span>
                            )}
                          </div>

                          {/* Barra de Desgaste Sutil */}
                          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mb-2">
                            <div
                              className={`h-full rounded-full ${
                                item.esVencido ? 'bg-rose-600' : 'bg-amber-500'
                              }`}
                              style={{ width: `${Math.min(100, item.porcentaje)}%` }}
                            />
                          </div>

                          {/* Recomendación Operativa Directa */}
                          <div className="p-2.5 rounded-xl bg-white/95 border border-slate-200 space-y-0.5">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                              Acción Recomendada:
                            </span>
                            <p className="text-xs text-slate-800 font-bold leading-snug">
                              🎯 {accionRecomendada}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </main>

            {/* 3. Barra de Acciones Inferior (Fija al Pie) */}
            <footer className="p-3 sm:p-4 border-t border-slate-200 bg-white flex items-center justify-between gap-2 shrink-0 z-10 shadow-sm">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsViewOpen(false)}
                className="flex-1 sm:flex-initial h-9 rounded-xl text-xs font-bold cursor-pointer"
              >
                Volver al Panel
              </Button>
              {onGoToMantenimiento && (
                <Button
                  size="sm"
                  onClick={() => {
                    setIsViewOpen(false);
                    onGoToMantenimiento();
                  }}
                  className="flex-1 sm:flex-initial h-9 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black shadow-xs cursor-pointer"
                >
                  <Wrench className="w-3.5 h-3.5 mr-1 text-amber-400" />
                  Abrir Taller Integral
                </Button>
              )}
            </footer>
          </div>
        </div>
      )}
    </>
  );
}
