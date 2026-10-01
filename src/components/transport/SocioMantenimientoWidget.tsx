/**
 * @file SocioMantenimientoWidget.tsx
 * @description Alerta ejecutiva y Pantalla Dedicada Rediseñada para el Socio Propietario.
 *
 * Características del Rediseño Empresarial de Flota:
 * 1. Cronología Táctica Integral:
 *    - Desglose cronológico de todos los períodos con tiempo disponible (≥ 45 min y pernoctas) del turno activo.
 *    - Clasificación técnica: Taller Mayor (≥ 90 min en Loja), Mantenimiento Exprés (45 a 89 min en Loja), Pausas en Cabecera (≥ 45 min) y Pernoctas.
 * 2. Consulta Manual Accesible de Cualquier Turno:
 *    - Selector táctico horizontal para consultar los tiempos disponibles de cualquier VT (VT01 al VT15, P1, P2, P3).
 * 3. Cruce Inteligente de Tareas vs Ventanas Disponibles:
 *    - Lista de tareas vencidas y próximas a vencer clasificadas en:
 *      a) Viables en tus ventanas de hoy (con sugerencia de ventana exacta).
 *      b) Requieren ventana mayor (con recomendación del próximo turno adecuado en la rotación).
 * 4. Eliminación de Ruido Visual:
 *    - Eliminado el bloque de auditoría "Origen del turno".
 *    - Régimen de operación reemplazado por un beacon luminoso intermitente ("Sin retén" / "Retén").
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
  Calendar,
  X,
  Repeat,
  RotateCcw,
  Zap,
  MapPin,
  Check,
  Flame,
  ChevronDown,
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
  getVTConfiguracion,
  subscribeToVTConfig,
  isModoRetenActivo,
} from '@/lib/vt-ventanas-storage';
import { formatearMinutosLegible } from '@/lib/vt-ventanas-catalogo';
import {
  obtenerUltimosArqueosBus,
  calcularProyeccionSecuencia,
  extraerNumeroVT,
  formatearCodigoVT,
  type ResultadoProyeccionTurno,
  type ArqueoResumenTurno,
} from '@/lib/turno-secuencia-tracker';

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

interface EstimacionMantenimiento {
  minutosFosa: number;
  duracionTexto: string;
  minimoVentanaMinutos: number;
  tipoRequerido: 'EXPRES' | 'MAYOR' | 'PARADA_LARGA';
}

function estimarTiempoMantenimiento(codigo?: string, nombre?: string): EstimacionMantenimiento {
  const c = (codigo || '').toUpperCase();
  const n = (nombre || '').toLowerCase();

  // Engrase y chequeos rápidos (15-20 min fosa -> ventana >= 45m)
  if (c.includes('ENGRASE') || n.includes('engrase') || n.includes('chasis')) {
    return { minutosFosa: 20, duracionTexto: '~20 min en fosa', minimoVentanaMinutos: 45, tipoRequerido: 'EXPRES' };
  }
  if (n.includes('filtro') && n.includes('aire') || c.includes('SOPLADO')) {
    return { minutosFosa: 15, duracionTexto: '~15 min', minimoVentanaMinutos: 45, tipoRequerido: 'EXPRES' };
  }
  if (n.includes('llanta') || n.includes('calibraci') || n.includes('presion') || n.includes('rotacion')) {
    return { minutosFosa: 25, duracionTexto: '~25 min', minimoVentanaMinutos: 45, tipoRequerido: 'EXPRES' };
  }
  if (n.includes('freno') && (n.includes('regular') || n.includes('matraca') || n.includes('aire') || n.includes('calibrar'))) {
    return { minutosFosa: 25, duracionTexto: '~25 min', minimoVentanaMinutos: 45, tipoRequerido: 'EXPRES' };
  }

  // Caja y Corona / Valvulinas (30-40 min fosa -> ventana >= 60m)
  if ((n.includes('caja') && n.includes('aceite')) || n.includes('valvulina') || n.includes('corona')) {
    return { minutosFosa: 40, duracionTexto: '~40 min en fosa', minimoVentanaMinutos: 60, tipoRequerido: 'EXPRES' };
  }

  // Aceite motor + filtros (50-60 min fosa -> ventana >= 90m)
  if ((n.includes('aceite') && n.includes('motor')) || c.includes('ACEITE-MOT')) {
    return { minutosFosa: 55, duracionTexto: '~55 min en fosa', minimoVentanaMinutos: 90, tipoRequerido: 'MAYOR' };
  }
  if (n.includes('filtro') && (n.includes('di') || n.includes('combustible') || n.includes('racor') || n.includes('trampa'))) {
    return { minutosFosa: 35, duracionTexto: '~35 min en fosa', minimoVentanaMinutos: 60, tipoRequerido: 'EXPRES' };
  }

  // Zapatas / Frenos mayores (60-80 min -> ventana >= 90m)
  if (n.includes('zapata') || n.includes('tambor') || n.includes('pastilla')) {
    return { minutosFosa: 75, duracionTexto: '~1h 15m de taller', minimoVentanaMinutos: 90, tipoRequerido: 'MAYOR' };
  }

  // Mantenimiento pesado (embrague, muelles, bujes)
  if (n.includes('embrague') || n.includes('muelle') || n.includes('bujen') || n.includes('kit')) {
    return { minutosFosa: 180, duracionTexto: '~3h a 5h de taller', minimoVentanaMinutos: 240, tipoRequerido: 'PARADA_LARGA' };
  }

  return { minutosFosa: 30, duracionTexto: '~30 min en fosa', minimoVentanaMinutos: 45, tipoRequerido: 'EXPRES' };
}

const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MESES_ABR = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const MESES_COMPLETOS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
const LISTA_VTS_OFICIALES = [
  ...Array.from({ length: 15 }, (_, i) => `VT${String(i + 1).padStart(2, '0')}`),
  'P1', 'P2', 'P3'
];

export function SocioMantenimientoWidget({
  propBusId,
  onGoToMantenimiento,
}: SocioMantenimientoWidgetProps) {
  const [activeBusId, setActiveBusId] = useState<string>(() => propBusId || getActiveBusId());
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [modoRetenActivo, setModoRetenActivo] = useState<boolean>(() => isModoRetenActivo());
  const [mostrarProyeccion5Dias, setMostrarProyeccion5Dias] = useState(false);

  // Turno seleccionado para visualización táctica
  const [manualVT, setManualVT] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(`rg_socio_manual_vt_${activeBusId}`) || null;
    }
    return null;
  });

  // Historial de arqueos
  const [arqueosHistorial, setArqueosHistorial] = useState<ArqueoResumenTurno[]>([]);
  const [cargandoArqueos, setCargandoArqueos] = useState<boolean>(true);

  // Tacómetro auditado
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

  // Cargar items de mantenimiento
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

  // Cargar arqueos
  const refrescarArqueos = useCallback(async (bId: string) => {
    setCargandoArqueos(true);
    const busesList = getAllBuses();
    const current = busesList.find((b) => b.id === bId);
    const disco = current?.numeroDisco || '01';
    try {
      const data = await obtenerUltimosArqueosBus(disco, bId);
      setArqueosHistorial(data);
    } catch {
      setArqueosHistorial([]);
    } finally {
      setCargandoArqueos(false);
    }
  }, []);

  // Sincronizaciones
  useEffect(() => {
    if (propBusId && propBusId !== activeBusId) {
      setActiveBusId(propBusId);
      setKmActual(resolverKmActual(propBusId));
      setItems(cargarItems(propBusId));
      if (typeof window !== 'undefined') {
        setManualVT(localStorage.getItem(`rg_socio_manual_vt_${propBusId}`) || null);
      }
      refrescarArqueos(propBusId);
    }
  }, [propBusId, activeBusId, resolverKmActual, cargarItems, refrescarArqueos]);

  useEffect(() => {
    refrescarArqueos(activeBusId);

    const unsubBus = subscribeToActiveBus((bus: BusItem) => {
      setActiveBusId(bus.id);
      setKmActual(resolverKmActual(bus.id));
      setItems(cargarItems(bus.id));
      if (typeof window !== 'undefined') {
        setManualVT(localStorage.getItem(`rg_socio_manual_vt_${bus.id}`) || null);
      }
      refrescarArqueos(bus.id);
    });

    syncMantenimientoConfigConServidor(activeBusId).then(() => {
      setItems(cargarItems(activeBusId));
    });

    const handleSync = () => {
      setItems(cargarItems(activeBusId));
      setModoRetenActivo(isModoRetenActivo());
      refrescarArqueos(activeBusId);
    };

    window.addEventListener('rg_mantenimiento_config_sync', handleSync);
    window.addEventListener('rg_paradas_pago_updated', handleSync);
    window.addEventListener('rg_owner_expenses_sync', handleSync);
    window.addEventListener('rg_mantenimientos_auto_reconciliados', handleSync);

    const unsubOdo = subscribeToBusOdometer(() => {
      setKmActual(resolverKmActual(activeBusId));
      setItems(cargarItems(activeBusId));
    });

    const unsubVT = subscribeToVTConfig((cfg) => {
      setModoRetenActivo(Boolean(cfg.modoRetenActivo));
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
  }, [activeBusId, resolverKmActual, cargarItems, refrescarArqueos]);

  const buses = getAllBuses();
  const currentBus = buses.find((b) => b.id === activeBusId);
  const disco = currentBus?.numeroDisco || '01';

  // Proyección de turno inferido
  const proyeccionTurno: ResultadoProyeccionTurno = useMemo(() => {
    return calcularProyeccionSecuencia(arqueosHistorial, manualVT);
  }, [arqueosHistorial, manualVT]);

  const turnoBaseCodigo = proyeccionTurno.turnoProyectado;
  const vtNumBase = proyeccionTurno.turnoBaseNumero;

  // Turno actualmente bajo inspección (manual o inferido)
  const vtInspeccionCodigo = manualVT || turnoBaseCodigo;

  const handleSeleccionarManualVT = (codigo: string) => {
    setManualVT(codigo);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`rg_socio_manual_vt_${activeBusId}`, codigo);
      } catch {}
    }
  };

  const handleRestaurarAutomatico = () => {
    setManualVT(null);
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(`rg_socio_manual_vt_${activeBusId}`);
      } catch {}
    }
  };

  // Cálculos de desgaste y semaforización de items
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
        impacto = 'Riesgo de pérdida de viscosidad y daño en camisas del motor.';
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

  // ─── CRONOLOGÍA TÁCTICA DEL TURNO ACTIVO (>= 45m y Pernoctas) ───
  const periodosDisponiblesTurno = useMemo(() => {
    const vtCfg = getVTConfiguracion(vtInspeccionCodigo);
    if (!vtCfg || !vtCfg.ventanas || vtCfg.ventanas.length === 0) {
      return [];
    }

    return vtCfg.ventanas
      .filter((v) => v.duracionMinutos >= 45 || v.tipo === 'PERNOCTA_EXTERNA')
      .map((v) => {
        const ubi = (v.ubicacion || v.ciudad || '').toLowerCase();
        const esLoja = ubi.includes('loja');
        const esPernocta = v.tipo === 'PERNOCTA_EXTERNA';

        let categoria: 'TALLER_MAYOR' | 'MANTENIMIENTO_EXPRES' | 'PAUSA_CABECERA' | 'PERNOCTA' = 'PAUSA_CABECERA';
        let badgeColor = 'bg-slate-100 text-slate-700 border-slate-300';
        let etiquetaCategoria = 'Pausa Operativa';
        let sugerencia = 'Revisión visual y descanso.';

        if (esPernocta) {
          categoria = 'PERNOCTA';
          badgeColor = 'bg-indigo-100 text-indigo-800 border-indigo-200';
          etiquetaCategoria = 'Pernocta';
          sugerencia = 'Enfriamiento de motor y parada nocturna.';
        } else if (esLoja) {
          if (v.duracionMinutos >= 90) {
            categoria = 'TALLER_MAYOR';
            badgeColor = 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold';
            etiquetaCategoria = '🛠️ Taller Mayor';
            sugerencia = 'Cambio completo de aceite, filtros de diésel y frenos.';
          } else {
            categoria = 'MANTENIMIENTO_EXPRES';
            badgeColor = 'bg-cyan-100 text-cyan-800 border-cyan-300 font-bold';
            etiquetaCategoria = '⚡ Mantenimiento Exprés';
            sugerencia = 'Engrase de cardán, regulación de frenos/matracas, sopleteo de filtros y llantas.';
          }
        } else {
          categoria = 'PAUSA_CABECERA';
          badgeColor = 'bg-amber-100 text-amber-800 border-amber-300';
          etiquetaCategoria = 'Pausa en Cabecera';
          sugerencia = `Pausa amplia en ${v.ubicacion || v.ciudad} para inspección rápida y aseo.`;
        }

        return {
          ...v,
          esLoja,
          esPernocta,
          categoria,
          badgeColor,
          etiquetaCategoria,
          sugerencia,
          duracionTexto: formatearMinutosLegible(v.duracionMinutos),
        };
      });
  }, [vtInspeccionCodigo]);

  // Totales de tiempo diurno disponible hoy
  const periodosDiurnos = useMemo(
    () => periodosDisponiblesTurno.filter((p) => !p.esPernocta),
    [periodosDisponiblesTurno]
  );
  const minutosDiurnosTotales = useMemo(
    () => periodosDiurnos.reduce((acc, p) => acc + p.duracionMinutos, 0),
    [periodosDiurnos]
  );
  const tiempoTotalDiurnoTexto = formatearMinutosLegible(minutosDiurnosTotales);
  const ventanaMayorLoja = useMemo(
    () => periodosDiurnos.find((p) => p.categoria === 'TALLER_MAYOR') || periodosDiurnos.find((p) => p.esLoja),
    [periodosDiurnos]
  );

  // Proyección de los próximos 5 días de la rotación
  const { proximosTiempos, diaRetenInfo } = useMemo(() => {
    const hoy = new Date();
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
      const esDiaReten = modoRetenActivo && (i === diasParaReten);

      const diaNombre = DIAS_SEMANA[d.getDay()];
      const diaNum = d.getDate();
      const mesAbr = MESES_ABR[d.getMonth()];
      const fechaCorta = `${diaNombre.slice(0, 3)} ${diaNum} ${mesAbr}`;

      let etiquetaFecha = esHoy
        ? `HOY (${diaNombre} ${diaNum} ${mesAbr})`
        : esManana
        ? `Mañana (${diaNombre} ${diaNum} ${mesAbr})`
        : `${diaNombre} ${diaNum} ${mesAbr} (en ${i} días)`;

      const vtNumDia = ((vtNumBase - 1 + i) % 15) + 1;
      const vtCodigo = formatearCodigoVT(vtNumDia);

      let horaInicio = '10:30';
      let horaFin = '13:40';
      let duracionMinutos = 190;
      let duracionTexto = '3h 10m';
      let descripcionDisponible = `Tiene 3h 10m disponible en Loja`;
      let sugerenciaTaller = 'Lubricadora y taller general.';

      if (esDiaReten) {
        horaInicio = '00:00';
        horaFin = '23:59';
        duracionMinutos = 1440;
        duracionTexto = '24h';
        descripcionDisponible = `Tiene 24h libres en fosa`;
        sugerenciaTaller = 'Parada Mayor: fosa completa para caja, embrague o zapatas sin perder carreras.';
      } else {
        const vm = getVentanaMayorParaVT(vtCodigo);
        if (vm && vm.horaInicio && vm.horaFin) {
          horaInicio = vm.horaInicio;
          horaFin = vm.horaFin;
          duracionMinutos = vm.duracionMinutos;
          duracionTexto = formatearMinutosLegible(duracionMinutos);
          descripcionDisponible = `Tiene ${duracionTexto} libres (${horaInicio} a ${horaFin}) en Loja`;
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
      activo: modoRetenActivo,
      diasFaltantes: diasParaReten,
      textoExacto: `Tiene 24h disponibles el ${diaSemanaReten} ${diaNumReten} de ${mesReten} (en ${diasParaReten} días)`,
    };

    return { proximosTiempos: listaTiempos, diaRetenInfo };
  }, [disco, vtNumBase, modoRetenActivo]);

  // ─── CRUCE INTELIGENTE: TAREAS VS VENTANAS DISPONIBLES DE HOY ───
  const { tareasViablesHoy, tareasRequierenMayor } = useMemo(() => {
    const viables: Array<{
      item: MantenimientoCalculadoItem;
      estimacion: EstimacionMantenimiento;
      ventanaSugerida?: (typeof periodosDiurnos)[0];
    }> = [];

    const requierenMayor: Array<{
      item: MantenimientoCalculadoItem;
      estimacion: EstimacionMantenimiento;
      proximoTurnoRecomendado?: string;
    }> = [];

    const todasPendientes = [...vencidos, ...proximos];

    for (const item of todasPendientes) {
      const est = estimarTiempoMantenimiento(item.codigo, item.nombre);
      // Buscar si alguna ventana diurna (preferentemente en Loja) cubre el tiempo necesario
      const ventanaApta = periodosDiurnos.find(
        (p) => p.esLoja && p.duracionMinutos >= est.minimoVentanaMinutos
      ) || periodosDiurnos.find(
        (p) => p.duracionMinutos >= est.minimoVentanaMinutos
      );

      if (ventanaApta) {
        viables.push({ item, estimacion: est, ventanaSugerida: ventanaApta });
      } else {
        // Buscar en los próximos días cuándo hay una ventana >= 90m
        const proximoConMayor = proximosTiempos.slice(1).find((t) => t.duracionMinutos >= est.minimoVentanaMinutos);
        requierenMayor.push({
          item,
          estimacion: est,
          proximoTurnoRecomendado: proximoConMayor
            ? `${proximoConMayor.fechaCorta} en ${proximoConMayor.vtCodigo} (${proximoConMayor.duracionTexto} libres)`
            : 'Turno con ventana mayor de 90m',
        });
      }
    }

    return { tareasViablesHoy: viables, tareasRequierenMayor: requierenMayor };
  }, [vencidos, proximos, periodosDiurnos, proximosTiempos]);

  if (!getBusModuloMantenimientoActivo(activeBusId) || items.length === 0) {
    return null;
  }

  return (
    <>
      {/* ─── ALERTA EJECUTIVA 1x2 (EN EL DASHBOARD) ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mt-3">
        {/* Card 1: Disponibilidad y Tiempo Disponible Hoy */}
        <div
          onClick={() => setIsViewOpen(true)}
          className="group cursor-pointer rounded-3xl p-4 sm:p-5 bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950 text-white border border-blue-500/40 hover:border-blue-400 shadow-md transition-all hover:scale-[1.01] active:scale-[0.99] flex flex-col justify-between"
          role="button"
          tabIndex={0}
          aria-label="Ver Cronología Táctica de Tiempos Disponibles"
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

            {/* Luz Intermitente / Régimen Operativo Compacto */}
            {modoRetenActivo ? (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-[10px] font-bold">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                Retén en {diaRetenInfo.diasFaltantes}d
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[10px] font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Sin retén
              </span>
            )}
          </div>

          {/* Mensaje Principal: Cronología Táctica del Día */}
          <div className="my-1.5 space-y-1">
            <p className="text-xs text-slate-300 font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              Hoy en ruta ({vtInspeccionCodigo}):
              {manualVT && (
                <span className="text-[10px] text-indigo-300 font-bold ml-1 bg-indigo-950/70 px-1.5 py-0.2 rounded border border-indigo-400/30">
                  Manual
                </span>
              )}
            </p>
            <h4 className="text-sm sm:text-base font-black text-white leading-tight">
              {periodosDiurnos.length > 0
                ? `${periodosDiurnos.length} ${periodosDiurnos.length === 1 ? 'período disponible' : 'períodos disponibles'} (${tiempoTotalDiurnoTexto} en total)`
                : `Sin períodos diurnos mayores a 45 min`}
            </h4>
            {ventanaMayorLoja && (
              <p className="text-[11px] text-cyan-200/90 font-medium">
                Ventana mayor en Loja: <strong>{ventanaMayorLoja.horaInicio} a {ventanaMayorLoja.horaFin}</strong> ({ventanaMayorLoja.duracionTexto})
              </p>
            )}
          </div>

          {/* Footer Card 1 */}
          <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
            <span className="text-slate-300 font-medium flex items-center gap-1">
              <span>Toca para ver cronología táctica</span>
            </span>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
          </div>
        </div>

        {/* Card 2: Mantenimientos y Estados Semafóricos */}
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

          {/* Footer Card 2: Viabilidad Cruzada */}
          <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between text-[11px]">
            <span className="text-slate-300 font-medium">
              {tareasViablesHoy.length > 0
                ? `${tareasViablesHoy.length} ${tareasViablesHoy.length === 1 ? 'tarea viable' : 'tareas viables'} en tus ventanas de hoy`
                : criticosCount > 0
                ? `${criticosCount} componentes requieren fosa mayor`
                : 'Pautas al día'}
            </span>
            <span className="font-black text-white flex items-center gap-1 group-hover:text-amber-300 transition-colors">
              Ver Detalle
              <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </div>
        </div>
      </div>

      {/* ─── PANTALLA DEDICADA REDISEÑADA (h-[100dvh] en móvil / sm:h-[88vh]) ─── */}
      {isViewOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-0 sm:p-4 overflow-hidden animate-in fade-in duration-150">
          <div className="w-full max-w-2xl h-[100dvh] sm:h-[88vh] bg-slate-50 sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
            {/* 1. Barra de Navegación Ejecutiva Superior */}
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
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3 className="font-black text-sm sm:text-base text-slate-900 truncate">
                      Cronología Táctica y Mantenimientos
                    </h3>
                    <Badge className="bg-slate-900 text-white text-[10px] font-black shrink-0">
                      Bus {disco}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
                    <span className="flex items-center gap-1">
                      <Gauge className="w-3 h-3 text-slate-400 shrink-0" />
                      Tacómetro: <strong className="text-slate-800">{kmActual.toLocaleString()} km</strong>
                    </span>
                    <span>•</span>
                    {/* Luz intermitente sutil del régimen */}
                    {modoRetenActivo ? (
                      <span className="inline-flex items-center gap-1 text-amber-700 font-semibold text-[10px]">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                        Retén en {diaRetenInfo.diasFaltantes}d
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-[10px]">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Sin retén
                      </span>
                    )}
                  </div>
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

            {/* 2. Selector Táctico Manual de Turnos (Exploración Rápida) */}
            <div className="bg-slate-100 px-3.5 py-2 border-b border-slate-200 shrink-0 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Turno:
                </span>
                <div className="flex items-center gap-1">
                  {LISTA_VTS_OFICIALES.map((codigo) => {
                    const esActivo = codigo.toUpperCase() === vtInspeccionCodigo.toUpperCase();
                    return (
                      <button
                        key={codigo}
                        type="button"
                        onClick={() => handleSeleccionarManualVT(codigo)}
                        className={`px-2 py-0.5 text-xs font-mono font-black rounded-lg transition-all cursor-pointer shrink-0 ${
                          esActivo
                            ? 'bg-blue-600 text-white shadow-xs scale-105'
                            : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
                        }`}
                      >
                        {codigo}
                      </button>
                    );
                  })}
                </div>
              </div>
              {manualVT && (
                <button
                  type="button"
                  onClick={handleRestaurarAutomatico}
                  className="text-[10px] font-bold text-slate-500 hover:text-blue-700 flex items-center gap-1 underline underline-offset-2 shrink-0 cursor-pointer"
                  title="Volver al turno asignado automáticamente por arqueos"
                >
                  <RotateCcw className="w-3 h-3" />
                  Auto
                </button>
              )}
            </div>

            {/* 3. Cuerpo Desplazable con UN SOLO SCROLL FLUIDO */}
            <main className="flex-1 overflow-y-auto overscroll-contain p-3.5 sm:p-5 space-y-4">
              {/* ═══════════════════════════════════════════════════════════════
                  SECCIÓN 1: CRONOLOGÍA TÁCTICA DE TIEMPOS DISPONIBLES
                  ═══════════════════════════════════════════════════════════════ */}
              <section className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
                      <Clock className="w-3.5 h-3.5" />
                    </div>
                    <h4 className="font-black text-xs sm:text-sm text-slate-900 uppercase tracking-tight">
                      1. Cronología Táctica de Tiempos Disponibles ({vtInspeccionCodigo})
                    </h4>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 shrink-0">
                    {periodosDiurnos.length} {periodosDiurnos.length === 1 ? 'período' : 'períodos'} ({tiempoTotalDiurnoTexto})
                  </span>
                </div>

                {/* Línea de Tiempo Táctica de los Tiempos Disponibles */}
                <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 shadow-xs space-y-2">
                  <p className="text-[11px] text-slate-500 font-medium">
                    Períodos con <strong>45 minutos o más de holgura</strong> durante la jornada del {vtInspeccionCodigo}:
                  </p>

                  {periodosDisponiblesTurno.length === 0 ? (
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500 italic">
                      Este turno no registra ventanas de espera mayores a 45 minutos.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {periodosDisponiblesTurno.map((p, idx) => (
                        <div
                          key={idx}
                          className={`p-2.5 sm:p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-all ${
                            p.categoria === 'TALLER_MAYOR'
                              ? 'bg-emerald-50/70 border-emerald-300'
                              : p.categoria === 'MANTENIMIENTO_EXPRES'
                              ? 'bg-cyan-50/70 border-cyan-300'
                              : p.categoria === 'PERNOCTA'
                              ? 'bg-indigo-50/60 border-indigo-200'
                              : 'bg-amber-50/60 border-amber-200'
                          }`}
                        >
                          <div className="space-y-0.5 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-mono font-black text-xs sm:text-sm text-slate-900">
                                {p.horaInicio} a {p.horaFin}
                              </span>
                              <span className="text-[10px] font-bold text-slate-500">
                                • {p.ubicacion || p.ciudad}
                              </span>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${p.badgeColor}`}
                              >
                                {p.etiquetaCategoria}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-600 font-medium">
                              💡 <strong>Apto para:</strong> {p.sugerencia}
                            </p>
                          </div>

                          <div className="shrink-0 text-right">
                            <span className="text-xs font-mono font-black px-2 py-1 rounded-lg bg-white border border-slate-300 text-slate-900 shadow-2xs">
                              {p.duracionTexto} libres
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Botón para Desplegar Proyección de los Próximos 5 Días */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setMostrarProyeccion5Dias(!mostrarProyeccion5Dias)}
                      className="text-[11px] font-bold text-blue-700 hover:text-blue-900 flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{mostrarProyeccion5Dias ? 'Ocultar proyección de 5 días' : 'Ver proyección táctica de los próximos 5 días'}</span>
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${mostrarProyeccion5Dias ? 'rotate-180' : ''}`} />
                    </button>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Ciclo de rotación (+1/día)
                    </span>
                  </div>

                  {mostrarProyeccion5Dias && (
                    <div className="pt-1 space-y-1 animate-in fade-in duration-100">
                      <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 overflow-hidden">
                        {proximosTiempos.map((t) => (
                          <div
                            key={t.offset}
                            className={`p-2 sm:px-2.5 flex items-center justify-between gap-2 text-xs ${
                              t.esHoy ? 'bg-blue-50/70 font-semibold' : 'bg-white hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-bold truncate text-slate-800">
                                {t.esHoy ? 'Hoy' : t.fechaCorta}
                              </span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono font-bold shrink-0">
                                {t.vtCodigo}
                              </span>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="font-mono font-bold text-slate-700">
                                {t.horaInicio} a {t.horaFin}
                              </span>
                              <span className="text-[10px] text-slate-500 ml-1.5 font-medium">
                                ({t.duracionTexto})
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {/* ═══════════════════════════════════════════════════════════════
                  SECCIÓN 2: ¿QUÉ MANTENIMIENTO PUEDE REALIZAR HOY?
                  (Cruce Inteligente con los Tiempos Disponibles)
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
                      2. ¿Qué mantenimiento puede realizar hoy?
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
                  <div className="space-y-3">
                    {/* Subgrupo 1: Tareas Viables en tus Ventanas de Hoy */}
                    {tareasViablesHoy.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-black text-emerald-800 uppercase tracking-wider flex items-center gap-1">
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            Viables en tus Ventanas de Hoy ({tareasViablesHoy.length})
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium">
                            Tiempo suficiente sin perder frecuencias
                          </span>
                        </div>

                        <div className="space-y-2">
                          {tareasViablesHoy.map(({ item, estimacion, ventanaSugerida }) => (
                            <div
                              key={item.id}
                              className={`p-3 sm:p-3.5 rounded-2xl border transition-all ${
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
                                    Pauta: cada {(item.intervaloKm || 0).toLocaleString()} km • {estimacion.duracionTexto}
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

                              {/* Barra de Desgaste */}
                              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mb-2">
                                <div
                                  className={`h-full rounded-full ${
                                    item.esVencido ? 'bg-rose-600' : 'bg-amber-500'
                                  }`}
                                  style={{ width: `${Math.min(100, item.porcentaje)}%` }}
                                />
                              </div>

                              {/* Asignación a la Ventana Específica */}
                              <div className="p-2.5 rounded-xl bg-white/95 border border-slate-200 space-y-0.5 text-xs">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                                  Ventana Asignada:
                                </span>
                                <p className="text-slate-800 font-bold leading-snug">
                                  👉 {ventanaSugerida ? (
                                    <>
                                      Hacer hoy de <strong>{ventanaSugerida.horaInicio} a {ventanaSugerida.horaFin}</strong> ({ventanaSugerida.duracionTexto} en {ventanaSugerida.ubicacion || ventanaSugerida.ciudad}).
                                    </>
                                  ) : (
                                    `Aprovechar ventana diurna libre en Base Loja.`
                                  )}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Subgrupo 2: Tareas que Requieren Ventana Mayor */}
                    {tareasRequierenMayor.length > 0 && (
                      <div className="space-y-2 pt-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-500" />
                            Requieren Ventana Mayor de Taller ({tareasRequierenMayor.length})
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium">
                            Requieren fosa de 90+ min
                          </span>
                        </div>

                        <div className="space-y-2">
                          {tareasRequierenMayor.map(({ item, estimacion, proximoTurnoRecomendado }) => (
                            <div
                              key={item.id}
                              className="p-3 sm:p-3.5 rounded-2xl border border-slate-300 bg-slate-100/80 shadow-xs"
                            >
                              <div className="flex items-start justify-between gap-2 mb-1.5">
                                <div className="min-w-0">
                                  <span className="text-xs sm:text-sm font-black text-slate-900 leading-tight block truncate">
                                    {item.nombre}
                                  </span>
                                  <span className="text-[10px] text-slate-500 font-medium">
                                    Pauta: cada {(item.intervaloKm || 0).toLocaleString()} km • {estimacion.duracionTexto}
                                  </span>
                                </div>
                                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-800 shrink-0">
                                  Requiere {estimacion.minimoVentanaMinutos}m libres
                                </span>
                              </div>

                              <div className="p-2.5 rounded-xl bg-white border border-slate-200 space-y-0.5 text-xs">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                                  Planificación Recomendada:
                                </span>
                                <p className="text-slate-800 font-bold leading-snug">
                                  💡 Tu ventana de hoy no es suficiente para este trabajo sin correr riesgos. Se recomienda programar para: <strong>{proximoTurnoRecomendado}</strong>.
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </section>
            </main>
          </div>
        </div>
      )}
    </>
  );
}
