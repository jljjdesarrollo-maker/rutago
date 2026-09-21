'use client';

import { useState, useEffect, useCallback, useMemo, useRef, type ChangeEvent } from 'react';
import { type VTSession, type FrecuenciaEstado } from './types-boletos';
import { getVentasByFrecuencia } from '@/lib/indexeddb';
import { type ConnectionInfo } from '@/hooks/use-connection';
import { BusSelector } from './BusSelector';
import {
  getActiveBus,
  getBusByDisco,
  subscribeToActiveBus,
  saveBusOdometer,
  getLatestBusOdometer,
} from '@/lib/fleet-storage';
import { type BusItem } from '../types/fleet';
import {
  ChevronLeft, DollarSign, Camera, X, Save, Loader2,
  CheckCircle2, Send, AlertTriangle, Plus, Trash2, ImagePlus, Sparkles, Pencil, XCircle, Gauge,
  CalendarDays, Bus, Zap, Info
} from 'lucide-react';
import { getLocalRutasKmConfig, syncRutasKmConfig } from '@/lib/rutas-km-storage';
import {
  getParadasAyudantePendientesArqueo,
  markParadasComoDescontadas,
  getDeficitArrastradoVT,
  saveDeficitArrastradoVT,
  clearDeficitArrastradoVT,
  type DeficitArrastradoVT,
} from '@/lib/paradas-vt-storage';
import {
  validarLecturaOdometro,
  calcularKmTeoricoJornada,
  type ResultadoValidacionOdometro,
  MOTIVOS_DESFASE_ODOMETRO
} from '@/lib/odometer-validator';

interface Props {
  session: VTSession;
  connection: ConnectionInfo;
  onClose: () => void;
  onGoToSync: () => void;
  onSaved: () => void;
}

interface FrecuenciaResumen {
  estadoId: string;
  nombre: string;
  ruta: string;
  hora: string;
  direccion: string;
  ventasCount: number;
  totalRecaudado: number;        // What the system says
  efectivoContado: number;        // What the helper actually counted
  diferencia: number;             // efectivoContado - totalRecaudado
  boletosCaja: number;
  cajaComunMonto?: number;
  isIngresoEspecial?: boolean;
  ingresoEspecialNota?: string;
  isNoRealizada?: boolean;
  motivoNoRealizada?: string;
}

interface GastoItem {
  description: string;
  amount: string;
}

const today = () => new Date().toISOString().split('T')[0];

// Work date: use session.fecha (date when shift started, not necessarily today)
function workDate(session: VTSession): string {
  return session.fecha || today();
}

function formatFechaOperacion(isoDate: string): string {
  if (!isoDate) return '';
  const parts = isoDate.split('-');
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    const dateObj = new Date(y, m, d);
    return dateObj.toLocaleDateString('es-EC', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }
  return isoDate;
}

const GASTOS_DEFAULT: GastoItem[] = [
  { description: 'Chofer', amount: '30' },
  { description: 'Ayudante', amount: '20' },
  { description: 'Diesel', amount: '0' },
  { description: 'Plan Renova', amount: '68' },
];

// Helper para resolver origen y destino exactos de cada frecuencia
function resolverRutaTrip(f: FrecuenciaResumen): { routeFrom: string; routeTo: string } {
  if (f.isNoRealizada && !f.isIngresoEspecial) {
    return { routeFrom: '-', routeTo: '-' };
  }
  const partes = (f.ruta || '').split(' - ').map(s => s.trim());
  if (partes.length >= 2 && partes[0] && partes[1]) {
    return { routeFrom: partes[0], routeTo: partes[1] };
  }
  if (f.direccion === 'ida') {
    return { routeFrom: 'Loja', routeTo: 'Vilcabamba' };
  }
  return { routeFrom: 'Vilcabamba', routeTo: 'Loja' };
}

export function ArqueoGeneralScreen({ session, connection, onClose, onGoToSync, onSaved }: Props) {
  const fechaTrabajo = workDate(session);

  // Unidad física activa (Fase 3.2: Desacople de Odómetro y persistencia por Bus)
  const [currentBus, setCurrentBus] = useState<BusItem>(() => {
    if (session.busId) {
      const b = getBusByDisco(session.busId);
      if (b) return b;
    }
    return getActiveBus();
  });

  // Suscribirse a cambios reactivos de la unidad física
  useEffect(() => {
    const unsub = subscribeToActiveBus((bus) => {
      setCurrentBus(bus);
    });
    return () => unsub();
  }, []);

  const [frecuencias, setFrecuencias] = useState<FrecuenciaResumen[]>([]);
  const [loading, setLoading] = useState(true);
  const [kmInicial, setKmInicial] = useState('');
  const [kmFinal, setKmFinal] = useState('');
  const [kmInicialOrigen, setKmInicialOrigen] = useState<string | null>(null);
  const [buscandoKmPrevio, setBuscandoKmPrevio] = useState(false);
  const [motivoDesfaseKm, setMotivoDesfaseKm] = useState<string>('');
  const [rutasKmConfig, setRutasKmConfig] = useState(getLocalRutasKmConfig());

  useEffect(() => {
    setRutasKmConfig(getLocalRutasKmConfig());
    syncRutasKmConfig().then(cfg => {
      if (cfg) setRutasKmConfig(cfg);
    });
  }, []);

  const [gastos, setGastos] = useState<GastoItem[]>(GASTOS_DEFAULT);
  const [tickets, setTickets] = useState('');
  const [sobrante, setSobrante] = useState('');
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmSave, setConfirmSave] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [guardadoOffline, setGuardadoOffline] = useState(false);

  // Sub-fase 3.2: Paradas de Taller cubiertas por Ayudante y Arrastre de Déficit de VT
  const [paradasTallerCargadas, setParadasTallerCargadas] = useState<string[]>([]);
  const [deficitPrevio, setDeficitPrevio] = useState<DeficitArrastradoVT | null>(null);
  const [deficitIncluidoEnGastos, setDeficitIncluidoEnGastos] = useState(false);

  // Sub-fase 3.2: Carga automática de paradas pagadas por el ayudante y arrastre de déficit de VT
  useEffect(() => {
    const fechaTrabajo = workDate(session);
    // 1. Paradas de taller que el ayudante pagó en ruta hoy
    const paradas = getParadasAyudantePendientesArqueo(currentBus.id, fechaTrabajo);
    if (paradas.length > 0) {
      setGastos(prev => {
        const next = [...prev];
        paradas.forEach(p => {
          const desc = 'Taller: ' + p.taller + ' (' + p.estacionNombre + ')';
          const yaExiste = next.some(g => g.description.toLowerCase().includes(p.taller.toLowerCase()));
          if (!yaExiste) {
            next.push({
              description: desc,
              amount: p.costoTotal.toString(),
            });
          }
        });
        return next;
      });
      setParadasTallerCargadas(paradas.map(p => p.id));
    }

    // 2. Saldo de déficit arrastrado de una jornada / VT anterior
    const def = getDeficitArrastradoVT(currentBus.id);
    if (def && def.amount > 0) {
      setDeficitPrevio(def);
    }
  }, [currentBus.id, session]);

  // Inline edit caja común
  const [editingCajaComun, setEditingCajaComun] = useState<string | null>(null);
  const [editCajaComunValue, setEditCajaComunValue] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const saveCajaComunToLS = useCallback((estadoId: string, newMonto: number) => {
    const fecha = workDate(session);
    const lsKey = `rg_estados_${session.vtCode}_${fecha}`;
    try {
      const raw = localStorage.getItem(lsKey);
      if (raw) {
        const all = JSON.parse(raw);
        const idx = all.findIndex((e: any) => e.estadoId === estadoId);
        if (idx >= 0) {
          all[idx].cajaComunMonto = newMonto;
          localStorage.setItem(lsKey, JSON.stringify(all));
        }
      }
    } catch (e) { console.error('LS error:', e); }
    setFrecuencias(prev => prev.map(f =>
      f.estadoId === estadoId
        ? { ...f, cajaComunMonto: newMonto }
        : f
    ));
    setEditingCajaComun(null);
  }, [session]);

  const startEditCajaComun = (estadoId: string, currentMonto: number) => {
    setEditingCajaComun(estadoId);
    setEditCajaComunValue(currentMonto > 0 ? currentMonto.toFixed(2) : '');
  };

  const loadData = useCallback(async () => {
    try {
      const fecha = workDate(session);
      // Load estados from localStorage (synchronous, reliable)
      const lsKey = `rg_estados_${session.vtCode}_${fecha}`;
      const raw = localStorage.getItem(lsKey);
      if (!raw) { setLoading(false); return; }
      const estadosLS = JSON.parse(raw) as FrecuenciaEstado[];
      // Preservar el orden original de estadosLS (orden cronologico configurado para el VT,
      // que incluye frecuencias que cruzan medianoche ej: 23:30 -> 05:10)
      const resumenes: FrecuenciaResumen[] = [];
      for (const e of estadosLS) {
        if (e.estado === 'cerrada') {
          const ventas = await getVentasByFrecuencia(e.estadoId);
          const sistemaTotal = ventas.reduce((s, v) => s + v.cobrado, 0);
          const efectivo = (e as any).arqueoEfectivo ?? sistemaTotal;
          const diff = efectivo - sistemaTotal;
          const ccCount = (e as any).cajaComunCount || 0;
          const ccMonto = (e as any).cajaComunMonto || 0;
          resumenes.push({
            estadoId: e.estadoId,
            nombre: e.nombre,
            ruta: e.ruta,
            hora: e.hora,
            direccion: e.direccion,
            ventasCount: ventas.length,
            totalRecaudado: sistemaTotal,
            efectivoContado: efectivo,
            diferencia: diff,
            boletosCaja: ccCount,
            cajaComunMonto: ccMonto,
          });
        } else if (e.estado === 'no_realizada' && (e.ingresoEspecialMonto || 0) > 0) {
          resumenes.push({
            estadoId: e.estadoId,
            nombre: e.nombre,
            ruta: e.ruta,
            hora: e.hora,
            direccion: e.direccion,
            ventasCount: 0,
            totalRecaudado: e.ingresoEspecialMonto || 0,
            efectivoContado: e.ingresoEspecialMonto || 0,
            diferencia: 0,
            boletosCaja: 0,
            cajaComunMonto: 0,
            isIngresoEspecial: true,
            ingresoEspecialNota: e.ingresoEspecialNota,
            isNoRealizada: true,
            motivoNoRealizada: e.motivoNoRealizada,
          });
        } else if (e.estado === 'no_realizada') {
          resumenes.push({
            estadoId: e.estadoId,
            nombre: e.nombre,
            ruta: e.ruta,
            hora: e.hora,
            direccion: e.direccion,
            ventasCount: 0,
            totalRecaudado: 0,
            efectivoContado: 0,
            diferencia: 0,
            boletosCaja: 0,
            cajaComunMonto: 0,
            isNoRealizada: true,
            motivoNoRealizada: e.motivoNoRealizada,
          });
        }
      }
      setFrecuencias(resumenes);
    } catch (err) {
      console.error('Error cargando resumen:', err);
    } finally {
      setLoading(false);
    }
  }, [session.vtCode]);

  useEffect(() => { loadData(); }, [loadData]);

  // Cálculo automático del recorrido del día
  const kmRecorridos = useMemo(() => {
    if (!kmFinal.trim()) return null;
    const fin = parseFloat(kmFinal.replace(/,/g, ''));
    if (isNaN(fin)) return null;
    if (!kmInicial.trim()) return null;
    const ini = parseFloat(kmInicial.replace(/,/g, ''));
    if (isNaN(ini)) return null;
    return Math.round((fin - ini) * 10) / 10;
  }, [kmInicial, kmFinal]);

  // Validación Semafórica de Odómetro (Fase B - v3.58.0)
  const validacionOdometro: ResultadoValidacionOdometro = useMemo(() => {
    return validarLecturaOdometro(kmInicial, kmFinal, frecuencias, rutasKmConfig);
  }, [kmInicial, kmFinal, frecuencias, rutasKmConfig]);

  // Función para proyectar automáticamente el teórico
  const handleProyectarTeorico = () => {
    const ini = parseFloat(kmInicial.replace(/,/g, '')) || 0;
    const teorico = validacionOdometro.kmTeorico;
    if (teorico > 0) {
      const estimado = Math.round(ini + teorico);
      setKmFinal(estimado.toString());
    }
  };

  // Precarga inteligente del último tacómetro registrado POR UNIDAD FÍSICA
  // Regla de Oro: El odómetro pertenece a la máquina física (Bus), NO al cuaderno VT ni a la ruta.
  useEffect(() => {
    let cancelled = false;
    async function fetchPrevOdometro() {
      try {
        setBuscandoKmPrevio(true);
        const fechaActual = workDate(session);
        const targetDisco = currentBus.numeroDisco.padStart(2, '0');
        const targetBusId = currentBus.id.toUpperCase();

        // 0. Consultar almacenamiento dedicado de odómetro por bus (Fase 3.2)
        const dedicated = getLatestBusOdometer(targetDisco);
        let dedicatedCandidate: any = null;
        if (dedicated && dedicated.date && dedicated.date < fechaActual && dedicated.kmFinal) {
          dedicatedCandidate = {
            date: dedicated.date,
            kmFinal: dedicated.kmFinal,
            busId: targetBusId,
            numeroDisco: targetDisco,
          };
        }

        // 1. Consultar registros del servidor (hasta 90 para tener amplia cobertura histórica)
        let serverRecords: any[] = [];
        try {
          const res = await fetch('/api/records?limit=90');
          if (res.ok) {
            serverRecords = await res.json();
          }
        } catch (e) {
          console.warn('Error consultando /api/records para odómetro:', e);
        }

        // 2. Consultar registros guardados localmente (offline o pendientes de sync)
        const localRecords: any[] = [];
        try {
          if (typeof window !== 'undefined' && window.localStorage) {
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              if (key && (key.startsWith('arqueo_general_') || key.startsWith('rutago_odometro_bus_'))) {
                const item = localStorage.getItem(key);
                if (item) {
                  try {
                    const parsed = JSON.parse(item);
                    if (parsed && parsed.date && (parsed.kmFinal || parsed.km)) {
                      localRecords.push(parsed);
                    }
                  } catch { /* ignorar */ }
                }
              }
            }
          }
        } catch (e) {
          console.warn('Error leyendo registros locales:', e);
        }

        // 3. Unificar todos los registros candidatos
        const allCandidates = [
          ...(dedicatedCandidate ? [dedicatedCandidate] : []),
          ...serverRecords,
          ...localRecords,
        ];

        // 4. Filtrar días estrictamente anteriores a la fecha actual (< fechaActual)
        // y que pertenezcan con certeza al autobús físico actualmente seleccionado
        const prevCandidates = allCandidates
          .filter((r) => {
            if (!r.date || r.date >= fechaActual || (!r.kmFinal && !r.km)) return false;

            const rBusId = String(r.busId || '').toUpperCase();
            const rDisco = String(r.numeroDisco || '').padStart(2, '0');
            const rConductor = String(r.conductor || '').toUpperCase();

            // Coincidencia directa por busId o numeroDisco
            if (rBusId === targetBusId || rBusId === `BUS-${targetDisco}` || rDisco === targetDisco) {
              return true;
            }

            // Coincidencia por campo conductor estructurado ("BUS-XX")
            if (rConductor === `BUS-${targetDisco}` || rConductor === targetDisco) {
              return true;
            }

            // Registros históricos antiguos sin bus asignado pertenecen a la Unidad Piloto 01
            if (!r.busId && !r.numeroDisco && (!r.conductor || !r.conductor.startsWith('BUS-'))) {
              return targetDisco === '01';
            }

            return false;
          })
          .sort((a, b) => b.date.localeCompare(a.date));

        const prev = prevCandidates[0];
        if (prev && !cancelled) {
          // Priorizar siempre kmFinal (tacómetro acumulado del odómetro de llegada)
          const valor = prev.kmFinal ? prev.kmFinal : prev.km;
          setKmInicial(valor.toString());
          setKmInicialOrigen(`Sugerido del ${prev.date} (Bus ${currentBus.numeroDisco})`);
          return;
        } else if (dedicated && dedicated.kmFinal && !cancelled) {
          // Si no hay arqueos anteriores pero el odómetro fue calibrado en Ficha de Unidad o Mantenimiento
          setKmInicial(dedicated.kmFinal.toString());
          setKmInicialOrigen(`Calibrado en Ficha de Unidad (Bus ${currentBus.numeroDisco})`);
          return;
        } else if (!cancelled) {
          // Si este bus es nuevo o no tiene historial previo (ej. Bus 10 en su primer arqueo)
          setKmInicial('');
          setKmInicialOrigen(null);
        }
      } catch (err) {
        console.warn('No se pudo precargar odómetro previo:', err);
      } finally {
        if (!cancelled) setBuscandoKmPrevio(false);
      }
    }
    fetchPrevOdometro();
    return () => { cancelled = true; };
  }, [session.fecha, session.vtCode, currentBus.id, currentBus.numeroDisco]);

  const totalIngresosAuto = useMemo(() =>
    frecuencias.reduce((s, f) => s + f.totalRecaudado, 0),
    [frecuencias]
  );
  const totalEfectivoReal = useMemo(() =>
    frecuencias.reduce((s, f) => s + f.efectivoContado, 0),
    [frecuencias]
  );
  const totalDiferencia = useMemo(() =>
    frecuencias.reduce((s, f) => s + f.diferencia, 0),
    [frecuencias]
  );
  const totalVentas = useMemo(() =>
    frecuencias.reduce((s, f) => s + f.ventasCount, 0),
    [frecuencias]
  );
  const totalCajaComunPasajeros = useMemo(() =>
    frecuencias.reduce((s, f) => s + f.boletosCaja, 0),
    [frecuencias]
  );
  const totalCajaComunMonto = useMemo(() =>
    frecuencias.reduce((s, f) => s + (f.cajaComunMonto || 0), 0),
    [frecuencias]
  );
  const totalGastos = useMemo(() =>
    gastos.reduce((s, g) => s + (parseFloat(g.amount) || 0), 0),
    [gastos]
  );
  const ticketsNum = parseFloat(tickets) || 0;
  const sobranteNum = parseFloat(sobrante) || 0;
  // PRODUCCION = efectivo real contado por el ayudante + caja comun + sobrante ajuste manual
  const production = totalEfectivoReal + totalCajaComunMonto + sobranteNum;
  // ENTREGA AYUDANTE Y COMPAÑÍA (Regla Dual por Caja Común):
  // Si hay Caja Común (totalCajaComunMonto > 0): La compañía descuenta los tickets de su caja. El ayudante no paga tickets.
  // Si no hay Caja Común (totalCajaComunMonto === 0): La entrega de la compañía es 0, y el ayudante paga los tickets.
  let entregaAyudante: number;
  if (totalCajaComunMonto > 0) {
    entregaAyudante = totalEfectivoReal + sobranteNum - totalGastos;
  } else {
    entregaAyudante = (totalEfectivoReal + sobranteNum) - (totalGastos + ticketsNum);
  }
  const entregaCompania = totalCajaComunMonto > 0 ? totalCajaComunMonto - ticketsNum : 0;

  const addGasto = () => setGastos(prev => [...prev, { description: '', amount: '0' }]);
  const removeGasto = (i: number) => setGastos(prev => prev.filter((_, idx) => idx !== i));
  const updateGasto = (i: number, field: keyof GastoItem, value: string) => {
    setGastos(prev => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: value };
      return next;
    });
  };

  const handlePhotoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    e.target.value = '';
    // Comprimir imagen antes de almacenar (max ~200KB base64)
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const MAX_DIM = 1200;
      const QUALITY = 0.6;
      let w = img.width, h = img.height;
      if (w > MAX_DIM || h > MAX_DIM) {
        if (w > h) { h = Math.round(h * MAX_DIM / w); w = MAX_DIM; }
        else { w = Math.round(w * MAX_DIM / h); h = MAX_DIM; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d')?.drawImage(img, 0, 0, w, h);
      setFotoPreview(canvas.toDataURL('image/jpeg', QUALITY));
    };
    img.onerror = () => URL.revokeObjectURL(url);
    img.src = url;
  };

  const handleSaveOffline = () => {
    const errs: string[] = [];
    if (!kmFinal.trim()) {
      errs.push('Tacómetro final (llegada) es obligatorio');
    } else if (validacionOdometro.esBloqueante) {
      errs.push(validacionOdometro.mensaje);
    }

    if (!fotoPreview) errs.push('Foto del cuaderno es obligatoria');
    if (frecuencias.length === 0) errs.push('No hay frecuencias cerradas');
    // Gastos pueden ser $0 si no hubo (ej. unidad parada)
    if (errs.length > 0) {
      setErrors(errs);
      return;
    }
    setErrors([]);
    setConfirmSave(true);
  };

  const handleConfirmSave = async () => {
    setConfirmSave(false);
    setSaving(true);

    const fechaTrabajo = workDate(session);
    const recorridoCalculado = kmRecorridos !== null && kmRecorridos >= 0 ? kmRecorridos.toString() : kmFinal.trim();
    try {
      // Build trips from frecuencias (all: cerradas, ingresos especiales, no realizadas)
      const trips = frecuencias.map((f, idx) => {
        const { routeFrom, routeTo } = resolverRutaTrip(f);
        return {
          routeFrom,
          routeTo,
          time: f.hora,
          income: f.totalRecaudado.toString(),
          efectivoReal: f.efectivoContado.toString(),
          boletos: '0',
          cajaComunPasajeros: f.boletosCaja.toString(),
          cajaComunMonto: (f.cajaComunMonto || 0).toString(),
          tipo: f.isIngresoEspecial ? 'ingreso_especial' : f.isNoRealizada ? 'no_realizada' : 'frecuencia',
          motivo: f.motivoNoRealizada || undefined,
          notaEspecial: f.ingresoEspecialNota || undefined,
        };
      });
      const body = {
        date: workDate(session),
        km: recorridoCalculado,
        kmInicial: kmInicial.trim() || undefined,
        kmFinal: kmFinal.trim(),
        conductor: `BUS-${currentBus.numeroDisco}`,
        ayudanteNombre: session.ayudanteNombre,
        vtCode: session.vtCode,
        busId: currentBus.id,
        numeroDisco: currentBus.numeroDisco,
        placaBus: currentBus.placa,
        trips,
        expenses: gastos,
        tickets: tickets || '0',
        cajaComun: totalCajaComunMonto,
        sobrante: sobrante || '0',
        photoUrl: fotoPreview,
        odometroEstado: validacionOdometro.estado,
        odometroKmTeorico: validacionOdometro.kmTeorico,
        odometroDesfaseKm: validacionOdometro.desfaseKm,
        odometroMotivoDesfase: motivoDesfaseKm || undefined,
      };

      // Guardar odómetro dedicado de la unidad física (Fase 3.2)
      saveBusOdometer(currentBus.numeroDisco, kmFinal.trim(), fechaTrabajo);

      // Sub-fase 3.2: Tratamiento financiero de Déficit Operativo o Cancelación de Saldo Arrastrado
      if (entregaAyudante < 0) {
        saveDeficitArrastradoVT(
          currentBus.id,
          Math.abs(entregaAyudante),
          fechaTrabajo,
          'Déficit por parada de taller / gastos en VT ' + (session.vtCode || '')
        );
      } else {
        if (deficitPrevio) {
          clearDeficitArrastradoVT(currentBus.id);
        }
      }

      // Marcar paradas de taller del ayudante como formalmente procesadas en el arqueo
      if (paradasTallerCargadas.length > 0) {
        markParadasComoDescontadas(paradasTallerCargadas);
      }

      const isOnline = navigator.onLine;

      if (isOnline) {
        const res = await fetch('/api/records', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (res.ok) {
          setSaved(true);
        } else {
          const result = await res.json().catch(() => ({ error: 'Error desconocido' }));
          console.error('Error guardando arqueo en servidor:', result.error);
          // Save offline if server fails
          localStorage.setItem(`arqueo_general_${session.vtCode}_${fechaTrabajo}`, JSON.stringify(body));
          setGuardadoOffline(true);
          setSaved(true);
        }
      } else {
        // Save to localStorage for later sync
        localStorage.setItem(`arqueo_general_${session.vtCode}_${fechaTrabajo}`, JSON.stringify(body));
        setGuardadoOffline(true);
        setSaved(true);
      }
    } catch (err) {
      console.error('Error guardando arqueo:', err);
      // Guardar odómetro dedicado de la unidad física ante fallback
      saveBusOdometer(currentBus.numeroDisco, kmFinal.trim(), fechaTrabajo);
      localStorage.setItem(`arqueo_general_${session.vtCode}_${fechaTrabajo}`, JSON.stringify({
        date: fechaTrabajo,
        km: recorridoCalculado,
        kmInicial: kmInicial.trim() || undefined,
        kmFinal: kmFinal.trim(),
        conductor: `BUS-${currentBus.numeroDisco}`,
        vtCode: session.vtCode,
        ayudanteNombre: session.ayudanteNombre,
        busId: currentBus.id,
        numeroDisco: currentBus.numeroDisco,
        placaBus: currentBus.placa,
        trips: frecuencias.map(f => {
          const { routeFrom, routeTo } = resolverRutaTrip(f);
          return {
            routeFrom,
            routeTo,
            time: f.hora,
            income: f.totalRecaudado.toString(),
            efectivoReal: f.efectivoContado.toString(),
            boletos: '0',
            cajaComunPasajeros: f.boletosCaja.toString(),
            cajaComunMonto: (f.cajaComunMonto || 0).toString(),
            tipo: f.isIngresoEspecial ? 'ingreso_especial' : f.isNoRealizada ? 'no_realizada' : 'frecuencia',
            motivo: f.motivoNoRealizada || undefined,
            notaEspecial: f.ingresoEspecialNota || undefined,
          };
        }),
        expenses: gastos, tickets: tickets || '0', sobrante: sobrante || '0', photoUrl: fotoPreview,
      }));
      setGuardadoOffline(true);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-[100dvh] bg-gray-50 items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#912D26] animate-spin mb-3" />
        <p className="text-[#3A3A3A]">Cargando arqueo general...</p>
      </div>
    );
  }

  // Saved confirmation screen
  if (saved) {
    return (
      <div className="flex flex-col min-h-[100dvh] bg-[#912D26] text-white">
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <CheckCircle2 className="w-20 h-20 mb-4" />
          <h1 className="text-2xl font-black mb-2">ARQUEO GENERAL GUARDADO</h1>
          <p className="text-white/80 text-sm mb-1">{session.nombre} — {workDate(session)}</p>
          <p className="text-white/80 text-sm mb-6">{totalVentas} ventas · ${totalIngresosAuto.toFixed(2)} ingresos</p>

          {guardadoOffline && (
            <div className="bg-yellow-500/20 border border-yellow-400/30 rounded-2xl px-5 py-3 mb-6 text-center">
              <p className="text-yellow-200 text-sm font-bold">Guardado local (sin internet)</p>
              <p className="text-yellow-200/70 text-xs mt-1">Se sincronizará cuando haya conexión</p>
            </div>
          )}

          <div className="w-full max-w-xs space-y-3">
            {connection.pendingCount > 0 && connection.status !== 'offline' && (
              <button onClick={onGoToSync}
                className="w-full py-4 rounded-2xl bg-white text-[#912D26] font-black text-lg flex items-center justify-center gap-2 active:scale-95">
                <Send className="w-5 h-5" /> SINCRONIZAR {connection.pendingCount} VENTAS
              </button>
            )}
            <button onClick={onSaved}
              className="w-full py-4 rounded-2xl bg-white/20 text-white font-bold text-lg flex items-center justify-center gap-2 active:scale-95">
              FINALIZAR
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Confirm save dialog
  if (confirmSave) {
    return (
      <div className="flex flex-col min-h-[100dvh] bg-gray-50">
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 max-w-md w-full shadow-lg">
            <h2 className="text-lg font-bold text-[#3A3A3A] mb-4">Confirmar Arqueo General</h2>
            <div className="bg-gray-50 rounded-xl p-4 space-y-2 mb-4">
              <div className="flex justify-between text-sm pb-1 border-b border-gray-200">
                <span className="text-gray-500 flex items-center gap-1.5 font-medium">
                  <CalendarDays className="w-3.5 h-3.5 text-[#912D26]" /> Fecha de Operación
                </span>
                <span className="font-bold text-[#3A3A3A] capitalize">
                  {formatFechaOperacion(fechaTrabajo)} ({fechaTrabajo})
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Producción</span>
                <span className="font-bold text-[#3A3A3A]">${production.toFixed(2)}</span>
              </div>
              {totalCajaComunPasajeros > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-purple-700">Caja Comun (Ofi.Loja): {totalCajaComunPasajeros} boletos</span>
                  <span className="font-bold text-purple-700">${totalCajaComunMonto.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Total Gastos</span>
                <span className="font-bold text-red-600">${totalGastos.toFixed(2)}</span>
              </div>
              <hr className="border-gray-200" />
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">
                  Entrega Ayudante
                  {totalCajaComunMonto === 0 && ticketsNum > 0 && <span className="text-xs text-amber-600 ml-1">(sin caja común)</span>}
                </span>
                <span className={`font-bold ${entregaAyudante >= 0 ? 'text-green-600' : 'text-amber-600'}`}>
                  {entregaAyudante >= 0 ? '$' + entregaAyudante.toFixed(2) : '$0.00 (Efectivo en mano)'}
                </span>
              </div>
              {entregaAyudante < 0 && (
                <div className="flex justify-between text-xs text-amber-800 bg-amber-50 p-2 rounded-xl border border-amber-200">
                  <span className="font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    Déficit arrastrado a prox. VT:
                  </span>
                  <span className="font-black">
                    {'-$' + Math.abs(entregaAyudante).toFixed(2)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Entrega Compañía</span>
                <span className={`font-bold ${entregaCompania >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${entregaCompania.toFixed(2)}
                </span>
              </div>
            </div>
            <p className="text-sm text-[#912D26] mb-4">
              Entrega Ayudante: <strong>${entregaAyudante.toFixed(2)}</strong>
              {totalCajaComunMonto === 0 && ticketsNum > 0 && <span className="text-xs text-amber-600"> (fórmula: (EfectivoReal+Ajuste) - (Gastos+Tickets))</span>}
              {' — '}
              Entrega Compañía: <strong>${entregaCompania.toFixed(2)}</strong>
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmSave(false)}
                className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-500 font-bold active:scale-95">
                Cancelar
              </button>
              <button onClick={handleConfirmSave} disabled={saving}
                className={`flex-1 py-3 rounded-xl font-black active:scale-95 ${saving ? 'bg-[#D6D6D6] text-gray-400 cursor-not-allowed' : 'bg-[#912D26] text-white'}`}>
                {saving ? 'Guardando...' : 'CONFIRMAR'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[100dvh] bg-gray-50">
      {/* Barra conexion */}
      <div className={`${connection.bgColor} px-4 py-1.5 flex items-center justify-center gap-2 text-xs font-medium ${connection.color}`}>
        <span>{connection.icon}</span>
        <span>{connection.label}</span>
      </div>

      {/* Header */}
      <div className="bg-[#912D26] text-white px-4 py-3 shadow-md">
        <div className="flex items-center justify-between">
          <button onClick={onClose} className="text-red-100 p-1 -ml-1 rounded-lg active:bg-white/10" aria-label="Volver">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="text-center">
            <h2 className="text-lg font-bold leading-tight">Arqueo General</h2>
            <div className="flex items-center justify-center gap-1.5 text-xs text-red-100 mt-0.5">
              <span>{session.nombre}</span>
              <span>•</span>
              <span className="font-bold bg-white/20 px-2 py-0.5 rounded flex items-center gap-1">
                <CalendarDays className="w-3 h-3 text-white" />
                {fechaTrabajo}
              </span>
            </div>
          </div>
          <div className="w-6" />
        </div>
      </div>

      <div className="flex-1 px-4 py-4 space-y-4 overflow-y-auto pb-8">
        {/* Banner Operativo Destacado: Fecha de Operación y Cuaderno VT */}
        <div className="bg-white rounded-2xl border border-gray-200 p-3.5 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#912D26]/10 text-[#912D26] flex items-center justify-center flex-shrink-0">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Fecha de Operación</div>
              <div className="text-sm font-black text-[#3A3A3A] flex items-center gap-1.5 flex-wrap">
                <span className="capitalize">{formatFechaOperacion(fechaTrabajo)}</span>
                <span className="text-[11px] font-bold px-2 py-0.5 bg-gray-100 text-gray-700 rounded-md">
                  {fechaTrabajo}
                </span>
              </div>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-[10px] font-bold text-gray-400 uppercase">Cuaderno</div>
            <div className="text-xs font-black text-[#912D26] bg-[#912D26]/10 px-2.5 py-1 rounded-lg inline-block">
              {session.vtCode}
            </div>
          </div>
        </div>

        {/* Banner de Unidad Física Asignada (Fase 3.2: Desacople por Bus) */}
        <div className="bg-white rounded-2xl border border-blue-100 p-3.5 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-800 flex items-center justify-center flex-shrink-0 font-black text-sm border border-blue-200">
              {currentBus.numeroDisco}
            </div>
            <div>
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Unidad Física Asignada</div>
              <div className="text-sm font-black text-[#3A3A3A] flex items-center gap-1.5 flex-wrap">
                <span>Bus {currentBus.numeroDisco}</span>
                <span className="text-[11px] font-mono font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                  {currentBus.placa}
                </span>
                {currentBus.numeroDisco === '01' && (
                  <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                    Socio Líder
                  </span>
                )}
              </div>
              <p className="text-[10px] text-gray-400 mt-0.5">
                {currentBus.marca} {currentBus.modelo || ''} • {currentBus.tipoOperacion === 'ALIMENTADOR_P' ? 'Alimentador P' : 'Troncal VT'}
              </p>
            </div>
          </div>
          <div className="flex-shrink-0">
            <BusSelector compact />
          </div>
        </div>
        {/* Errores */}
        {errors.length > 0 && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm space-y-1">
            <p className="font-semibold flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" /> Campos obligatorios:</p>
            {errors.map((e, i) => <p key={i}>- {e}</p>)}
          </div>
        )}

        {/* 1. INGRESOS POR FRECUENCIA — Sistema vs Efectivo Real */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <h3 className="font-bold text-[#3A3A3A] mb-3 text-sm uppercase flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-green-600" /> Ingresos por Frecuencia
          </h3>
          {frecuencias.length === 0 ? (
            <p className="text-gray-400 text-xs text-center py-4">No hay frecuencias cerradas</p>
          ) : (
            <div className="space-y-2">
              {/* Header row */}
              <div className="flex items-center justify-between px-3 py-1 text-[10px] font-bold text-gray-400 uppercase">
                <div className="flex-1">Frecuencia</div>
                <div className="w-20 text-right">Sistema</div>
                <div className="w-20 text-right">Real</div>
                <div className="w-16 text-right">Dif.</div>
              </div>
              {frecuencias.map((f, i) => {
                const hasDiff = Math.abs(f.diferencia) >= 0.01;
                if (f.isNoRealizada && !f.isIngresoEspecial) {
                  return (
                    <div key={f.estadoId} className="flex items-center justify-between py-2 px-3 rounded-xl bg-orange-50 border border-orange-200">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <XCircle className="w-4 h-4 text-orange-500 flex-shrink-0" />
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-orange-800 truncate">{f.hora} — {f.nombre}</div>
                          <div className="text-[10px] text-orange-500">No realizada: {f.motivoNoRealizada || 'Sin motivo'}</div>
                        </div>
                      </div>
                      <div className="w-20 text-right">
                        <span className="text-xs text-gray-400">—</span>
                      </div>
                      <div className="w-20 text-right">
                        <span className="text-xs text-gray-400">—</span>
                      </div>
                      <div className="w-16 text-right">
                        <span className="text-xs text-gray-400">—</span>
                      </div>
                    </div>
                  );
                }
                if (f.isIngresoEspecial) {
                  return (
                    <div key={f.estadoId} className="flex items-center justify-between py-2 px-3 rounded-xl bg-amber-50 border border-amber-200">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Sparkles className="w-4 h-4 text-amber-500 flex-shrink-0" />
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-amber-800 truncate">{f.hora} — {f.ingresoEspecialNota || 'Ingreso especial'}</div>
                          <div className="text-[10px] text-amber-500">Viaje especial</div>
                        </div>
                      </div>
                      <div className="w-20 text-right">
                        <div className="font-black text-amber-700">${f.totalRecaudado.toFixed(2)}</div>
                      </div>
                      <div className="w-20 text-right">
                        <div className="font-black text-amber-700">${f.efectivoContado.toFixed(2)}</div>
                      </div>
                      <div className="w-16 text-right">
                        <span className="text-xs text-gray-400">—</span>
                      </div>
                    </div>
                  );
                }
                return (
                  <div key={f.estadoId}>
                  <div className={`flex items-center justify-between py-2 px-3 rounded-xl ${i % 2 === 0 ? 'bg-[#912D26]/5' : 'bg-gray-50'}`}>
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${i % 2 === 0 ? 'bg-[#912D26] text-white' : 'bg-[#3A3A3A] text-white'}`}>
                        {i + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-[#3A3A3A] truncate">{f.hora} — {f.nombre}</div>
                        <div className="text-[10px] text-gray-400">{f.ventasCount} ventas{f.boletosCaja > 0 ? ` + ${f.boletosCaja} c.comun` : ''}</div>
                      </div>
                    </div>
                    <div className="w-20 text-right">
                      <div className="font-bold text-[#3A3A3A]">${f.totalRecaudado.toFixed(2)}</div>
                    </div>
                    <div className="w-20 text-right">
                      <div className="font-black text-green-700">${f.efectivoContado.toFixed(2)}</div>
                    </div>
                    <div className="w-16 text-right">
                      {hasDiff ? (
                        <span className={`text-xs font-bold ${f.diferencia > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                          {f.diferencia > 0 ? '+' : ''}{f.diferencia.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </div>
                  </div>
                  {/* Caja Común editable sub-row */}
                  {f.boletosCaja > 0 && (
                    <div className="ml-7 mr-3 mb-1 flex items-center gap-2">
                      <span className="text-[10px] text-purple-600 font-medium">C.Común: {f.boletosCaja} boletos</span>
                      <span className="text-[10px] text-purple-400">·</span>
                      {editingCajaComun === f.estadoId ? (
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-purple-600">$</span>
                          <input
                            type="number"
                            inputMode="decimal"
                            step="0.05"
                            value={editCajaComunValue}
                            onChange={e => setEditCajaComunValue(e.target.value)}
                            onBlur={() => saveCajaComunToLS(f.estadoId, parseFloat(editCajaComunValue) || 0)}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); saveCajaComunToLS(f.estadoId, parseFloat(editCajaComunValue) || 0); } }}
                            className="w-16 h-6 text-xs font-bold text-purple-800 bg-purple-100 border border-purple-300 rounded px-1 text-center focus:outline-none focus:ring-1 focus:ring-purple-400"
                            autoFocus
                          />
                        </div>
                      ) : (
                        <button
                          onClick={() => startEditCajaComun(f.estadoId, f.cajaComunMonto || 0)}
                          className="text-[11px] font-bold text-purple-800 flex items-center gap-0.5 active:opacity-70"
                        >
                          ${(f.cajaComunMonto || 0).toFixed(2)}
                          <Pencil className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </div>
                  )}
                  </div>
                );
              })}
              {/* Totals row */}
              <div className="border-t-2 border-green-200 pt-2 mt-2 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-[#3A3A3A] text-xs">Total Sistema</span>
                  <span className="font-bold text-sm text-[#3A3A3A]">${totalIngresosAuto.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-bold text-green-700 text-xs">Total Efectivo Real</span>
                  <span className="font-black text-lg text-green-700">${totalEfectivoReal.toFixed(2)}</span>
                </div>
                {Math.abs(totalDiferencia) >= 0.01 && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">Diferencia global</span>
                    <span className={`text-xs font-bold ${totalDiferencia > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                      {totalDiferencia > 0 ? '+' : ''}{totalDiferencia.toFixed(2)}
                    </span>
                  </div>
                )}
                {totalCajaComunPasajeros > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-purple-700">Caja Comun (Ofi.Loja): {totalCajaComunPasajeros} boletos</span>
                    <span className="font-bold text-sm text-purple-700">${totalCajaComunMonto.toFixed(2)}</span>
                  </div>
                )}
                <div className="text-right text-[10px] text-gray-400">{totalVentas} boletos vendidos</div>
              </div>
            </div>
          )}
        </div>

        {/* 2. ODÓMETRO / TACÓMETRO + FOTO */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Gauge className="w-4 h-4 text-[#912D26]" />
              <h3 className="font-bold text-[#3A3A3A] text-sm uppercase">
                Odómetro: Bus {currentBus.numeroDisco} ({currentBus.placa})
              </h3>
            </div>
            {buscandoKmPrevio ? (
              <span className="text-[10px] text-gray-400 flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" /> Buscando anterior...
              </span>
            ) : (
              <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                Unidad {currentBus.numeroDisco}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Tacómetro Inicial */}
            <div>
              <label className="text-xs font-medium text-gray-500 flex items-center justify-between">
                <span>Tacómetro Inicial (Salida)</span>
                {kmInicialOrigen ? (
                  <span className="text-[10px] text-emerald-700 font-semibold truncate max-w-[200px]">
                    {kmInicialOrigen}
                  </span>
                ) : (
                  <span className="text-[10px] text-amber-600 font-medium">
                    Sin lectura previa (Bus {currentBus.numeroDisco})
                  </span>
                )}
              </label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="Ej: 877344"
                value={kmInicial}
                onChange={e => {
                  setKmInicial(e.target.value);
                  setKmInicialOrigen('Ingreso manual');
                }}
                className="w-full mt-1 h-11 rounded-xl border border-[#D6D6D6] px-3 text-sm font-semibold text-[#3A3A3A] bg-gray-50/60"
              />
              <p className="text-[10px] text-gray-400 mt-1">
                Lectura al salir (editable o vacía si se desconoce)
              </p>
            </div>

            {/* Tacómetro Final */}
            <div>
              <label className="text-xs font-medium text-gray-500 flex items-center gap-1">
                Tacómetro Final (Llegada) <span className="text-[#912D26]">*</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="Ej: 877604"
                value={kmFinal}
                onChange={e => setKmFinal(e.target.value)}
                className="w-full mt-1 h-11 rounded-xl border border-[#D6D6D6] px-3 text-sm font-semibold text-[#3A3A3A]"
              />
              <p className="text-[10px] text-gray-400 mt-1">
                Lectura actual del tablero al cerrar la jornada de la Unidad {currentBus.numeroDisco}
              </p>
            </div>
          </div>

          {/* Recorrido Calculado de la Jornada con Semáforo v3.58.0 */}
          {kmRecorridos !== null ? (
            <div className="space-y-2">
              {/* Badge Semafórico */}
              {validacionOdometro.estado === 'VERDE' && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      <p className="text-xs font-bold text-emerald-900">
                        Odómetro Válido: {kmRecorridos.toLocaleString()} km
                      </p>
                    </div>
                    <p className="text-[10px] text-emerald-700 mt-0.5">
                      {validacionOdometro.mensaje}
                    </p>
                  </div>
                  <span className="text-xs font-black text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-lg shrink-0">
                    {kmRecorridos} km
                  </span>
                </div>
              )}

              {validacionOdometro.estado === 'AMBAR' && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold text-amber-900">
                          Desfase Detectado: {kmRecorridos} km (Teórico: ~{validacionOdometro.kmTeorico} km)
                        </p>
                        <p className="text-[11px] text-amber-800 mt-0.5">
                          {validacionOdometro.mensaje}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-black text-amber-800 bg-amber-200/80 px-2 py-0.5 rounded-lg shrink-0">
                      {validacionOdometro.desfaseKm > 0 ? `+${validacionOdometro.desfaseKm}` : validacionOdometro.desfaseKm} km
                    </span>
                  </div>

                  {/* Selector de Justificación (Zero-Locking) */}
                  <div className="bg-white/80 rounded-lg p-2 border border-amber-200 space-y-1.5">
                    <label className="text-[11px] font-bold text-amber-900 flex items-center justify-between">
                      <span>Motivo del desfase (Obligatorio para guardar)</span>
                      {motivoDesfaseKm && (
                        <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-0.5">
                          <CheckCircle2 className="w-3 h-3" /> Justificado
                        </span>
                      )}
                    </label>
                    <select
                      value={motivoDesfaseKm}
                      onChange={e => setMotivoDesfaseKm(e.target.value)}
                      className="w-full h-9 text-xs rounded-md border border-amber-300 bg-white font-medium text-gray-800 px-2"
                    >
                      <option value="">-- Seleccione una justificación --</option>
                      {MOTIVOS_DESFASE_ODOMETRO.map((motivo, idx) => (
                        <option key={idx} value={motivo}>{motivo}</option>
                      ))}
                    </select>
                    <p className="text-[10px] text-amber-700">
                      Zero-Locking: Puedes continuar el arqueo seleccionando la razón del desfase.
                    </p>
                  </div>
                </div>
              )}

              {validacionOdometro.estado === 'ROJO' && (
                <div className="p-3 rounded-xl bg-red-50 border-2 border-red-300 space-y-2">
                  <div className="flex items-start gap-2">
                    <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-black text-red-900 uppercase">
                        Bloqueo de Odómetro — Error Crítico
                      </p>
                      <p className="text-[11px] text-red-800 font-medium mt-0.5">
                        {validacionOdometro.mensaje}
                      </p>
                    </div>
                  </div>
                  {validacionOdometro.kmTeorico > 0 && (
                    <button
                      type="button"
                      onClick={handleProyectarTeorico}
                      className="w-full py-1.5 px-3 bg-red-100 hover:bg-red-200 border border-red-300 rounded-lg text-xs font-bold text-red-800 flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                    >
                      <Zap className="w-3.5 h-3.5 text-red-600" />
                      Proyectar llegada teórica (~{Math.round((parseFloat(kmInicial) || 0) + validacionOdometro.kmTeorico)} km)
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : kmFinal.trim() ? (
            <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-600 flex items-center justify-between">
              <div>
                <span className="font-semibold text-[#3A3A3A]">Odómetro registrado: {kmFinal} km</span>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  Sin tacómetro inicial de salida. Se utilizará para el odómetro acumulado.
                </p>
              </div>
              {validacionOdometro.kmTeorico > 0 && (
                <span className="text-[10px] text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  Teórico: ~{validacionOdometro.kmTeorico} km
                </span>
              )}
            </div>
          ) : null}

          <div>
            <label className="text-xs font-medium text-gray-500 flex items-center gap-1">
              Foto del Cuaderno <span className="text-[#912D26]">*</span>
            </label>
            <div className="mt-1">
              {fotoPreview ? (
                <div className="relative w-20 h-20 rounded-xl overflow-hidden border-2 border-[#912D26]">
                  <img src={fotoPreview} alt="Foto" className="w-full h-full object-cover" />
                  <button
                    onClick={() => setFotoPreview(null)}
                    className="absolute top-0 right-0 w-5 h-5 bg-[#912D26] text-white rounded-bl-lg flex items-center justify-center"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="h-10 px-4 rounded-xl text-xs border border-[#D6D6D6] text-[#3A3A3A] flex items-center gap-1 active:scale-95"
                >
                  <Camera className="w-4 h-4" /> Tomar/Adjuntar Foto
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 3. GASTOS */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          {/* Sub-fase 3.2: Banner de Déficit Arrastrado de VT Anterior */}
          {deficitPrevio && (
            <div className="mb-3 p-3 bg-amber-50 border border-amber-300 rounded-xl flex items-center justify-between gap-2">
              <div>
                <span className="text-xs font-black text-amber-900 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                  {'Déficit Arrastrado de VT Anterior: $' + deficitPrevio.amount.toFixed(2)}
                </span>
                <p className="text-[10px] text-amber-700 mt-0.5">
                  {'Origen: ' + deficitPrevio.fechaOrigen + ' — ' + deficitPrevio.descripcion}
                </p>
              </div>
              {!deficitIncluidoEnGastos ? (
                <button
                  type="button"
                  onClick={() => {
                    const desc = 'Arrastre Déficit (' + deficitPrevio.fechaOrigen + ')';
                    setGastos(prev => [...prev, { description: desc, amount: deficitPrevio.amount.toString() }]);
                    setDeficitIncluidoEnGastos(true);
                  }}
                  className="text-[10px] bg-amber-600 hover:bg-amber-700 text-white font-black px-2.5 py-1.5 rounded-lg shrink-0 cursor-pointer shadow-xs"
                >
                  + Aplicar en Gastos
                </button>
              ) : (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-1 rounded-md">
                  ✓ Aplicado
                </span>
              )}
            </div>
          )}

          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-red-600 text-sm uppercase">Gastos</h3>
            <button onClick={addGasto} className="text-xs text-[#912D26] font-bold flex items-center gap-1">
              <Plus className="w-3 h-3" /> Agregar
            </button>
          </div>
          <div className="space-y-2">
            {gastos.map((g, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  placeholder="Descripcion"
                  value={g.description}
                  onChange={e => updateGasto(i, 'description', e.target.value)}
                  className="h-10 text-sm rounded-xl flex-1 border border-[#D6D6D6] px-3 text-[#3A3A3A]"
                />
                <div className="relative w-24">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={g.amount}
                    onChange={e => updateGasto(i, 'amount', e.target.value)}
                    className="h-10 text-sm rounded-xl w-full border border-[#D6D6D6] pl-6 pr-2 text-[#3A3A3A] font-semibold"
                  />
                </div>
                {i >= 4 && (
                  <button onClick={() => removeGasto(i)} className="text-gray-400 hover:text-red-500">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="border-t border-gray-100 pt-2 mt-3 flex justify-between text-sm font-bold text-red-600">
            <span>Total Gastos</span>
            <span>${totalGastos.toFixed(2)}</span>
          </div>
        </div>

        {/* 4. TICKETS + SOBRANTE */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm space-y-3">
          <h3 className="font-bold text-[#3A3A3A] text-sm uppercase">Ajustes</h3>
          <div>
            <label className="text-xs font-medium text-gray-500">Tickets</label>
            <div className="grid grid-cols-3 gap-2 mt-1">
              <button onClick={() => setTickets('4.50')}
                className={`h-11 rounded-xl text-sm font-bold border-2 transition-all active:scale-95 ${tickets === '4.50' ? 'bg-[#912D26] border-[#912D26] text-white' : 'bg-white border-[#D6D6D6] text-[#3A3A3A]'}`}>
                $4.50
              </button>
              <button onClick={() => setTickets('6.00')}
                className={`h-11 rounded-xl text-sm font-bold border-2 transition-all active:scale-95 ${tickets === '6.00' ? 'bg-[#912D26] border-[#912D26] text-white' : 'bg-white border-[#D6D6D6] text-[#3A3A3A]'}`}>
                $6.00
              </button>
              <button onClick={() => setTickets('')}
                className={`h-11 rounded-xl text-sm font-bold border-2 transition-all active:scale-95 ${tickets === '' ? 'bg-[#3A3A3A] border-[#3A3A3A] text-white' : 'bg-white border-[#D6D6D6] text-gray-400'}`}>
                Ninguno
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500">Sobrante / Ajuste</label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
              <input
                type="number"
                inputMode="decimal"
                placeholder="0.00"
                value={sobrante}
                onChange={e => setSobrante(e.target.value)}
                className="w-full h-11 rounded-xl border border-[#D6D6D6] pl-7 pr-3 text-sm font-semibold text-[#3A3A3A]"
              />
            </div>
            <p className="text-[10px] text-gray-400 mt-0.5">Dinero sobrante al contar (positivo o negativo)</p>
          </div>
        </div>

        {/* 5. RESUMEN */}
        <div className="bg-[#3A3A3A] text-white rounded-2xl p-4 space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-white/50">Liquidación del Día</p>
          <div className="flex justify-between text-sm">
            <span className="text-white/60">Efectivo Real (Contado)</span>
            <span className="font-semibold text-green-400">${totalEfectivoReal.toFixed(2)}</span>
          </div>
          {Math.abs(totalDiferencia) >= 0.01 && (
            <div className="flex justify-between text-sm">
              <span className="text-white/60">Diferencia vs Sistema</span>
              <span className={`font-semibold ${totalDiferencia > 0 ? 'text-blue-400' : 'text-red-400'}`}>
                {totalDiferencia > 0 ? '+' : ''}{totalDiferencia.toFixed(2)}
              </span>
            </div>
          )}
          {sobranteNum !== 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-white/60">Ajuste Manual</span>
              <span className={`font-semibold ${sobranteNum >= 0 ? 'text-green-400' : 'text-red-400'}`}>${sobranteNum.toFixed(2)}</span>
            </div>
          )}
          <hr className="border-white/10" />
          <div className="flex justify-between text-sm">
            <span className="text-white/80">Producción</span>
            <span className="font-black text-lg">${production.toFixed(2)}</span>
          </div>
          <p className="text-[10px] text-white/30">Efectivo Real + Caja Común + Ajuste Manual</p>
          {totalCajaComunPasajeros > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-purple-300">Caja Comun (Ofi.Loja): {totalCajaComunPasajeros} boletos</span>
              <span className="font-semibold text-purple-300">${totalCajaComunMonto.toFixed(2)}</span>
            </div>
          )}
          <hr className="border-white/10" />
          <div className="flex justify-between text-sm">
            <span className="text-white/60">Total Gastos</span>
            <span className="font-semibold text-red-400">-${totalGastos.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-white/60">Tickets</span>
            <span className="font-semibold">-${ticketsNum.toFixed(2)}</span>
          </div>
          <hr className="border-white/10" />
          <div className="flex justify-between">
            <span className="text-sm text-white/80">
              Entrega Ayudante
              {totalCajaComunMonto === 0 && ticketsNum > 0 && <span className="text-[10px] text-amber-400 ml-1">(sin caja común)</span>}
            </span>
            <span className={`font-bold ${entregaAyudante >= 0 ? 'text-green-400' : 'text-amber-400'}`}>
              {entregaAyudante >= 0 ? '$' + entregaAyudante.toFixed(2) : '$0.00 (Déficit)'}
            </span>
          </div>
          {entregaAyudante < 0 && (
            <div className="bg-amber-950/70 border border-amber-400/40 rounded-xl p-2.5 my-1 text-left">
              <div className="flex items-center justify-between text-xs font-black text-amber-300">
                <span className="flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  Déficit a arrastrar a siguiente VT:
                </span>
                <span className="text-amber-300 text-sm">
                  {'-$' + Math.abs(entregaAyudante).toFixed(2)}
                </span>
              </div>
              <p className="text-[10px] text-amber-200/80 mt-0.5 leading-tight">
                El taller/gastos superó la recaudación de hoy. Entrega al socio hoy: $0.00. El saldo se arrastra automáticamente.
              </p>
            </div>
          )}
          <p className="text-[10px] text-white/30">
            {totalCajaComunMonto === 0 ? '(EfectivoReal+Ajuste) - (Gastos+Tickets)' : 'Efectivo Real - Total Gastos'}
          </p>
          <div className="flex justify-between">
            <span className="text-sm text-white/80">Entrega Compañía</span>
            <span className={`font-bold ${entregaCompania >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              ${entregaCompania.toFixed(2)}
            </span>
          </div>
          <p className="text-[10px] text-white/30">{totalCajaComunMonto > 0 ? 'Caja Común - Tickets' : 'Sin Caja Común (antes de Jun 2026)'}</p>
        </div>

        {/* BOTON GUARDAR */}
        <button
          onClick={handleSaveOffline}
          disabled={saving}
          className={`w-full py-5 rounded-2xl font-black text-xl flex items-center justify-center gap-2 shadow-lg ${
            saving ? 'bg-[#D6D6D6] text-gray-400 cursor-not-allowed' : 'bg-[#912D26] text-white shadow-red-200 active:scale-95 transition-all'
          }`}>
          {saving ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
          {saving ? 'Guardando...' : 'GUARDAR ARQUEO GENERAL'}
        </button>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handlePhotoChange}
      />
    </div>
  );
}
