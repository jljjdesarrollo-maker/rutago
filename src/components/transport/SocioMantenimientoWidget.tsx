/**
 * @file SocioMantenimientoWidget.tsx
 * @description Alerta ejecutiva 1x2 y Pantalla Dedicada para el Socio Propietario.
 *
 * Características principales:
 * 1. En el Dashboard (debajo de la cuadrícula 2x2):
 *    - Layout 1x2 de alto contraste:
 *      * Card 1: Disponibilidad y Tiempos en Loja (Ventana de Hoy con horas exactas + Parada Mayor de Retén).
 *      * Card 2: Semáforo y Alertas de Mantenimiento (🔴 Vencidos | 🟡 Próximos) con colores de contraste.
 *
 * 2. Al ingresar (Pantalla Dedicada Ejecutiva):
 *    Presenta EXCLUSIVAMENTE 2 cosas:
 *    - COSA 1: ¿Cuándo tiene tiempo para hacer mantenimiento?
 *      * Agenda de los próximos 5 tiempos disponibles (con HOY resaltado en primer lugar y horarios exactos).
 *      * Parada Mayor (Día de Retén) destacada con 24h libres sin perder carreras.
 *    - COSA 2: ¿Qué mantenimientos debe o puede realizar?
 *      * Lista ÚNICAMENTE los componentes vencidos o próximos a vencer, cruzados con la recomendación táctica de la ventana.
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

    const unsubVT = subscribeToVTConfig(() => {
      // Re-render si se actualizan turnos
    });

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

      let impacto = 'Inspección periódica recomendada según pauta técnica de fábrica.';
      const n = (item.nombre || '').toLowerCase();
      if (n.includes('aceite') && n.includes('motor')) {
        impacto = 'Riesgo crítico de pérdida de viscosidad, sobrecalentamiento y daño mayor en camisas o árbol de levas.';
      } else if (n.includes('filtro') && n.includes('di')) {
        impacto = 'Obstrucción de inyectores, merma de potencia en cuestas hacia Loja y exceso de humo negro.';
      } else if (n.includes('caja') || n.includes('transmisi')) {
        impacto = 'Fricción en sincronizados y piñonería pesada. Reparación de alto costo si trabaja en seco.';
      } else if (n.includes('corona') || n.includes('diferencial')) {
        impacto = 'Desgaste en piñón de ataque y corona. Riesgo inminente de amarre en ruta.';
      } else if (n.includes('freno') || n.includes('zapata')) {
        impacto = 'Cristalización y pérdida de adherencia en bajadas pronunciadas desde Malacatos.';
      } else if (n.includes('embrague')) {
        impacto = 'Patinamiento de disco bajo carga de pasajeros, olor a quemado y fallo al subir cuestas.';
      } else if (n.includes('engrase') || n.includes('chasis')) {
        impacto = 'Desgaste acelerado en crucetas, pasadores de muelles y terminales de dirección.';
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
    // Asignación de demostración oficial: Bus 01 -> VT08
    const num = parseInt(disco.replace(/\D/g, '') || '1', 10);
    const numVT = ((num * 7) % 15) + 1;
    return num === 1 ? 'VT08' : `VT${String(numVT).padStart(2, '0')}`;
  }, [activeBusId, disco]);

  // Cálculo de los Próximos 5 Tiempos Disponibles y Día de Retén
  const { proximosTiempos, diaRetenInfo } = useMemo(() => {
    const hoy = new Date();
    const match = turnoBaseCodigo.match(/\d+/);
    const vtNumBase = match ? parseInt(match[0], 10) : 8;

    // En el ciclo de 16 días de la cooperativa:
    // Calculamos cuántos días faltan para que a este bus le toque su Día de Retén (24h)
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

      let etiquetaFecha = '';
      if (esHoy) {
        etiquetaFecha = `HOY (${diaNombre} ${diaNum} ${mesAbr})`;
      } else if (esManana) {
        etiquetaFecha = `Mañana (${diaNombre} ${diaNum} ${mesAbr})`;
      } else {
        etiquetaFecha = `${diaNombre} ${diaNum} ${mesAbr} (en ${i} días)`;
      }

      // Turno para este día
      const vtNumDia = ((vtNumBase - 1 + i) % 15) + 1;
      const vtCodigo = `VT${String(vtNumDia).padStart(2, '0')}`;

      let horaInicio = '10:30';
      let horaFin = '13:40';
      let duracionMinutos = 190;
      let duracionTexto = '3h 10m';
      let descripcionDisponible = `Tiene 3h 10m disponible desde 10:30 a 13:40 en Loja`;
      let sugerenciaTaller = 'Tiempo óptimo para lubricadora: cambio de aceite, filtros y engrase general.';

      if (esDiaReten) {
        horaInicio = '00:00';
        horaFin = '23:59';
        duracionMinutos = 1440;
        duracionTexto = '24h';
        descripcionDisponible = `Tiene 24h disponibles el ${diaNombre} ${diaNum} de ${MESES_COMPLETOS[d.getMonth()]} (Día de Retén)`;
        sugerenciaTaller = 'Parada Mayor: fosa completa para caja, embrague, muelles y zapatas con 0 carreras perdidas.';
      } else {
        // Consultar ventana mayor del catálogo oficial para este VT
        const ventanaMayor = getVentanaMayorParaVT(vtCodigo);
        if (ventanaMayor && ventanaMayor.horaInicio && ventanaMayor.horaFin) {
          horaInicio = ventanaMayor.horaInicio;
          horaFin = ventanaMayor.horaFin;
          duracionMinutos = ventanaMayor.duracionMinutos;
          duracionTexto = formatearMinutosLegible(duracionMinutos);
          descripcionDisponible = `Tiene ${duracionTexto} disponible desde ${horaInicio} a ${horaFin} en Loja`;
          if (duracionMinutos >= 150) {
            sugerenciaTaller = 'Tiempo amplio para lubricadora, cambio de aceite de motor, filtros y engrase de chasis.';
          } else if (duracionMinutos >= 90) {
            sugerenciaTaller = 'Tiempo adecuado para cambio rápido de aceite o revisión de zapatas y frenos.';
          } else {
            sugerenciaTaller = 'Escala técnica corta: calibración de llantas, diésel y revisión de niveles.';
          }
        } else {
          // Ventanas predeterminadas según el turno
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
            sugerenciaTaller = 'Ventana intermedia para chequeo de lubricadora o ajuste de bandas.';
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
      sugerencia: 'Día completo en fosa (24 horas) para trabajos mayores (caja, embrague, muelles o zapatas) con 0 carreras perdidas.',
    };

    return { proximosTiempos: listaTiempos, diaRetenInfo };
  }, [turnoBaseCodigo, disco]);

  const tiempoHoy = proximosTiempos[0] || {
    descripcionDisponible: 'Tiene 3h 10m disponible desde 10:30 a 13:40 en Loja',
    vtCodigo: 'VT08',
    duracionTexto: '3h 10m',
    horaInicio: '10:30',
    horaFin: '13:40',
  };

  // Si el módulo no está activo para este bus, no renderizar nada
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

          {/* Mensaje Principal: Texto Claro y Exacto Solicitado */}
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

      {/* ─── PANTALLA DEDICADA: SÓLO LAS 2 COSAS SOLICITADAS ─── */}
      {isViewOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-0 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="w-full max-w-3xl bg-slate-50 min-h-screen sm:min-h-0 sm:rounded-3xl shadow-2xl flex flex-col sm:max-h-[92vh] overflow-hidden border border-slate-200">
            {/* Barra de Navegación Ejecutiva Superior */}
            <div className="p-4 sm:p-5 border-b border-slate-200 bg-white flex items-center justify-between shrink-0 sticky top-0 z-10 shadow-xs">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsViewOpen(false)}
                  className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
                  title="Volver al Panel"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-base sm:text-lg text-slate-900 leading-tight">
                      Supervisión Ejecutiva de Mantenimiento
                    </h3>
                    <Badge className="bg-slate-900 text-white text-[10px] font-black">
                      Bus {disco}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5 mt-0.5">
                    <Gauge className="w-3.5 h-3.5 text-slate-400" />
                    Tacómetro Auditado: <strong className="text-slate-800">{kmActual.toLocaleString()} km</strong>
                    <span className="text-slate-300">•</span>
                    <span className="text-blue-700 font-semibold">{plantillaNivel.nombre}</span>
                  </p>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsViewOpen(false)}
                className="hidden sm:inline-flex h-9 rounded-xl text-xs font-bold"
              >
                Cerrar
              </Button>
            </div>

            {/* Contenido con EXCLUSIVAMENTE las 2 cosas requeridas */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
              {/* ═══════════════════════════════════════════════════════════════
                  COSA 1: ¿CUÁNDO TIENE TIEMPO PARA HACER MANTENIMIENTO?
                  ═══════════════════════════════════════════════════════════════ */}
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-black text-sm text-slate-900 uppercase tracking-tight">
                        1. ¿Cuándo tiene tiempo para hacer mantenimiento?
                      </h4>
                      <p className="text-[11px] text-slate-500 font-medium">
                        Ventanas operativas en Loja y parada de retén para no perder carreras.
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    0 Carreras Perdidas
                  </span>
                </div>

                {/* Tarjeta Especial de Parada Mayor (Día de Retén) */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950 via-slate-900 to-slate-900 text-white border border-amber-500/50 shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-amber-300 flex items-center gap-1.5 uppercase tracking-wide">
                      <ShieldCheck className="w-4 h-4 text-amber-400" />
                      Parada Mayor (Día de Retén)
                    </span>
                    <span className="text-[10px] font-mono bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full font-black">
                      24h Libres
                    </span>
                  </div>
                  <h5 className="text-sm sm:text-base font-black text-white leading-tight">
                    &quot;{diaRetenInfo.textoExacto}&quot;
                  </h5>
                  <p className="text-xs text-amber-200/90 leading-relaxed font-medium">
                    💡 <strong>Diagnóstico:</strong> {diaRetenInfo.sugerencia}
                  </p>
                </div>

                {/* Agenda de los Próximos 5 Tiempos Disponibles con HOY Resaltado */}
                <div className="space-y-2">
                  <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider block">
                    Próximos 5 Tiempos Disponibles en Ruta:
                  </span>

                  <div className="space-y-2.5">
                    {proximosTiempos.map((t) => {
                      return (
                        <div
                          key={t.offset}
                          className={`p-3.5 sm:p-4 rounded-2xl border transition-all ${
                            t.esHoy
                              ? 'border-blue-500 bg-gradient-to-r from-blue-50 via-white to-white shadow-xs ring-2 ring-blue-300/80'
                              : t.esDiaReten
                              ? 'border-amber-400 bg-amber-50/50'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-1.5">
                            <div className="flex items-center gap-2">
                              {t.esHoy && (
                                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-600 text-white flex items-center gap-1">
                                  <Sparkles className="w-3 h-3 text-amber-300" />
                                  Disponible Hoy Mismo
                                </span>
                              )}
                              {t.esDiaReten && !t.esHoy && (
                                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 flex items-center gap-1">
                                  <ShieldCheck className="w-3 h-3" />
                                  Día de Retén
                                </span>
                              )}
                              <span className="text-xs font-black text-slate-900">
                                {t.etiquetaFecha}
                              </span>
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                                Turno {t.vtCodigo}
                              </span>
                            </div>

                            <span className="text-xs font-black text-slate-800 font-mono">
                              {t.duracionTexto} libres
                            </span>
                          </div>

                          {/* Frase clara con horario de inicio y fin */}
                          <p className="text-sm font-black text-slate-900 mb-1">
                            &quot;{t.descripcionDisponible}&quot;
                          </p>

                          {/* Qué puede hacer */}
                          <p className="text-xs text-slate-600 font-medium flex items-center gap-1.5">
                            <span>💡 <strong>Da tiempo para:</strong> {t.sugerenciaTaller}</span>
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>

              {/* ═══════════════════════════════════════════════════════════════
                  COSA 2: ¿QUÉ MANTENIMIENTOS PUEDE O DEBE REALIZAR?
                  ═══════════════════════════════════════════════════════════════ */}
              <section className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center text-white ${
                        criticosCount > 0
                          ? 'bg-rose-600'
                          : proximosCount > 0
                          ? 'bg-amber-500'
                          : 'bg-emerald-600'
                      }`}
                    >
                      <Wrench className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-black text-sm text-slate-900 uppercase tracking-tight">
                        2. ¿Qué mantenimientos debe o puede realizar?
                      </h4>
                      <p className="text-[11px] text-slate-500 font-medium">
                        Solo componentes que están vencidos o próximos a su límite preventivo.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
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
                  <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-2">
                    <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-600" />
                    <h5 className="text-base font-black text-emerald-950">
                      🟢 Unidad 100% al Día y en Rango Óptimo
                    </h5>
                    <p className="text-xs text-emerald-800 font-medium max-w-md mx-auto">
                      Ningún componente de la pauta ({plantillaNivel.nombre}) se encuentra vencido ni próximo a vencer. Tu unidad puede continuar operando con normalidad.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Lista de Vencidos y Próximos */}
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
                        accionRecomendada = `Programar para la Parada Mayor (${diaRetenInfo.textoExacto}) para tener 24h completas de fosa.`;
                      }

                      return (
                        <div
                          key={item.id}
                          className={`p-4 rounded-2xl border transition-all ${
                            item.esVencido
                              ? 'border-rose-400 bg-rose-50/60 shadow-xs'
                              : 'border-amber-400 bg-amber-50/60 shadow-xs'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-black text-slate-900 leading-snug">
                                  {item.nombre}
                                </span>
                                {item.categoria && (
                                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                                    {item.categoria}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                                Pauta oficial: cada {(item.intervaloKm || 0).toLocaleString()} km
                              </p>
                            </div>

                            {/* Badge Semafórico de Kilometraje */}
                            {item.esVencido ? (
                              <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-rose-600 text-white shrink-0 flex items-center gap-1 shadow-xs">
                                <AlertTriangle className="w-3 h-3" />
                                Excedido por {Math.abs(item.kmRestantes).toLocaleString()} km
                              </span>
                            ) : (
                              <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-amber-500 text-slate-950 shrink-0 flex items-center gap-1 shadow-xs">
                                <Clock className="w-3 h-3" />
                                Restan {item.kmRestantes.toLocaleString()} km
                              </span>
                            )}
                          </div>

                          {/* Barra de Desgaste Porcentual */}
                          <div className="space-y-1 mb-2.5">
                            <div className="flex justify-between text-[10px] font-bold">
                              <span className="text-slate-500">Desgaste del Ciclo</span>
                              <span
                                className={
                                  item.esVencido ? 'text-rose-700 font-black' : 'text-amber-800 font-black'
                                }
                              >
                                {(item.porcentaje || 0).toFixed(0)}%
                              </span>
                            </div>
                            <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  item.esVencido ? 'bg-rose-600' : 'bg-amber-500'
                                }`}
                                style={{ width: `${Math.min(100, item.porcentaje)}%` }}
                              />
                            </div>
                          </div>

                          {/* Recomendación Táctica Directa */}
                          <div className="p-3 rounded-xl bg-white/90 border border-slate-200 space-y-1">
                            <div className="flex items-center gap-1.5 text-xs font-black text-slate-900">
                              <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                              <span>Recomendación Operativa:</span>
                            </div>
                            <p className="text-xs text-slate-700 font-semibold leading-relaxed">
                              🎯 {accionRecomendada}
                            </p>
                          </div>

                          {/* Impacto Operativo Breve */}
                          <p className="text-[11px] text-slate-500 mt-2 font-medium flex items-center gap-1">
                            <Info className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{item.impactoOperativo}</span>
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>

            {/* Pie de Acciones */}
            <div className="p-4 border-t border-slate-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <span className="text-[11px] text-slate-500 text-center sm:text-left">
                El tacómetro se alimenta automáticamente de los arqueos auditados de llegada.
              </span>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsViewOpen(false)}
                  className="flex-1 sm:flex-initial h-10 rounded-xl text-xs font-bold cursor-pointer"
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
