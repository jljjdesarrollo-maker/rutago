'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import {
  ArrowLeft,
  Calendar,
  Bus,
  Save,
  RotateCcw,
  Camera,
  Upload,
  X,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Trash2,
  DollarSign,
  Ticket,
  ChevronDown,
  User,
  Users,
  BookOpen,
  Info,
  Clock,
  Sparkles,
  Truck,
  Wrench,
  Droplets,
  UserX,
  Ban,
  FileText,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { num, type UserSession } from './types';
import { isSuperAdmin as checkIsSuperAdmin } from '@/lib/roles';
import { getActiveBus, setActiveBus, saveBusOdometer, getLatestBusOdometer } from '@/lib/fleet-storage';
import { obtenerUltimosArqueosBus } from '@/lib/turno-secuencia-tracker';
import { VT_DATA } from '@/lib/seed-vts';
import { buildCanonicalRecordPayload } from '@/lib/canonical-record-payload';

const MOTIVOS_NO_REALIZADA = [
  { id: 'daño_unidad', label: 'Daño en la unidad', icon: <Truck className="w-4 h-4" />, color: 'text-red-500' },
  { id: 'mantenimiento', label: 'Mantenimiento', icon: <Wrench className="w-4 h-4" />, color: 'text-blue-500' },
  { id: 'clima', label: 'Clima / Lluvia', icon: <Droplets className="w-4 h-4" />, color: 'text-cyan-500' },
  { id: 'sin_pasajeros', label: 'Sin pasajeros', icon: <UserX className="w-4 h-4" />, color: 'text-purple-500' },
  { id: 'problema_ruta', label: 'Problema en la ruta', icon: <AlertTriangle className="w-4 h-4" />, color: 'text-yellow-500' },
  { id: 'orden_superior', label: 'Orden superior', icon: <Ban className="w-4 h-4" />, color: 'text-gray-600' },
  { id: 'ingreso_especial', label: 'Ingreso especial', icon: <Sparkles className="w-4 h-4" />, color: 'text-amber-500' },
  { id: 'otro', label: 'Otro motivo', icon: <FileText className="w-4 h-4" />, color: 'text-gray-500' },
];

interface FrecuenciaItem {
  order: number;
  routeFrom: string;
  routeTo: string;
  time: string;
  efectivoReal: string;
  cajaComunMonto: string;
  cajaComunPasajeros: string;
  noRealizada: boolean;
  motivoNoRealizada?: string;
  isIngresoEspecial?: boolean;
  ingresoEspecialNota?: string;
  ingresoEspecialMonto?: string;
}

interface ExpenseItem {
  description: string;
  amount: string;
}

interface BusVTItem {
  id: string;
  codigo: string;
  nombre: string;
  frecuencias: Array<{
    id?: string;
    routeFrom: string;
    routeTo: string;
    time: string;
    order?: number;
  }>;
}

function sortVtsNatural(list: BusVTItem[]): BusVTItem[] {
  return [...list].sort((a, b) => {
    const isAVt = a.codigo.toUpperCase().startsWith('VT');
    const isBVt = b.codigo.toUpperCase().startsWith('VT');
    if (isAVt && !isBVt) return -1;
    if (!isAVt && isBVt) return 1;
    const numA = parseInt(a.codigo.replace(/\D/g, ''), 10) || 0;
    const numB = parseInt(b.codigo.replace(/\D/g, ''), 10) || 0;
    if (numA !== numB) return numA - numB;
    return a.codigo.localeCompare(b.codigo);
  });
}

/**
 * Garantiza que las frecuencias de un VT conserven estrictamente el orden programado de la jornada
 * (1ra salida desde Loja primero y el retorno de pernocta/"duerme afuera" al final),
 * sin desordenarlas alfabéticamente por hora.
 */
function getOrderedVtFrecuencias(
  vtCodigo: string,
  rawFrecuencias: BusVTItem['frecuencias']
): BusVTItem['frecuencias'] {
  if (!Array.isArray(rawFrecuencias) || rawFrecuencias.length === 0) return [];
  const list = [...rawFrecuencias];

  // Si por algún dato antiguo en BD la primera frecuencia no sale de Loja (ej. retorno de madrugada puesto primero),
  // verificar contra el catálogo oficial VT_DATA o rotar el retorno de madrugada al final.
  const firstFrom = (list[0]?.routeFrom || '').trim().toLowerCase();
  if (list.length > 1 && firstFrom !== 'loja') {
    const canonicalVt = VT_DATA.find(
      v => v.codigo.toUpperCase() === vtCodigo.trim().toUpperCase()
    );
    if (canonicalVt && canonicalVt.frecuencias.length === list.length) {
      return canonicalVt.frecuencias.map((f, idx) => ({
        ...f,
        order: idx + 1,
      }));
    }
    const firstLojaIdx = list.findIndex(
      f => (f.routeFrom || '').trim().toLowerCase() === 'loja'
    );
    if (firstLojaIdx > 0) {
      const rotated = [...list.slice(firstLojaIdx), ...list.slice(0, firstLojaIdx)];
      return rotated.map((f, idx) => ({ ...f, order: idx + 1 }));
    }
  }

  return list.map((f, idx) => ({
    ...f,
    order: idx + 1,
  }));
}

function formatVtOptionLabel(v: BusVTItem): string {
  const frecs = getOrderedVtFrecuencias(v.codigo, v.frecuencias);
  if (frecs.length === 0) return `${v.codigo} (${v.nombre})`;

  const primera = frecs[0];
  const horaInicio = primera?.time || '';

  const destinos = frecs.flatMap(f => [f.routeTo || '', f.routeFrom || '']);
  const parroquiasEspeciales = ['Yangana', 'La Elvira', 'El Tambo', 'Zahuayco'];
  const destinoDistintivo =
    parroquiasEspeciales.find(p =>
      destinos.some(d => d.trim().toLowerCase() === p.toLowerCase())
    ) ||
    primera?.routeTo ||
    'Vilcabamba';

  return horaInicio
    ? `${v.codigo} — ${horaInicio} (${destinoDistintivo})`
    : `${v.codigo} (${destinoDistintivo})`;
}

interface SystemFrecuencia {
  id: string;
  nombre: string;
  ruta: string;
  hora: string;
  direccion: string;
}

interface PersonaItem {
  id: string;
  socioId?: string | null;
  nombre: string;
  rol: 'CONDUCTOR' | 'AYUDANTE' | string;
  esActual: boolean;
  activo?: boolean;
}

interface AvailableBusOption {
  id: string;
  numeroDisco: string;
  placa: string;
  propietario?: string;
  socioId?: string | null;
}

interface CargaHistoricaScreenProps {
  currentUser?: UserSession | null;
  onBack: () => void;
  onSuccess: () => void;
}

export function CargaHistoricaScreen({ currentUser, onBack, onSuccess }: CargaHistoricaScreenProps) {
  const effectiveUser = useMemo<UserSession | null>(() => {
    if (currentUser) return currentUser;
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('ct_session');
        if (raw) return JSON.parse(raw) as UserSession;
      } catch {}
    }
    return null;
  }, [currentUser]);

  const isSuperAdmin = checkIsSuperAdmin(effectiveUser);
  const isSocio = !isSuperAdmin;
  const socioIdSesion = effectiveUser?.socioId || (isSocio ? effectiveUser?.id : null);

  const [availableBuses, setAvailableBuses] = useState<AvailableBusOption[]>([]);
  const [selectedBusDisco, setSelectedBusDisco] = useState<string>(() => {
    const active = getActiveBus();
    return String(active?.numeroDisco || '01').padStart(2, '0');
  });

  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);
  const [kmInicial, setKmInicial] = useState('');
  const [km, setKm] = useState('');
  const [kmInicialOrigen, setKmInicialOrigen] = useState<string | null>(null);

  // Cálculo en vivo del recorrido del día (idéntico a ArqueoGeneralScreen)
  const kmRecorridos = useMemo(() => {
    if (!km.trim() || !kmInicial.trim()) return null;
    const fin = parseFloat(km.replace(/,/g, ''));
    const ini = parseFloat(kmInicial.replace(/,/g, ''));
    if (isNaN(fin) || isNaN(ini)) return null;
    return Math.round((fin - ini) * 10) / 10;
  }, [kmInicial, km]);

  // Precarga automática del tacómetro inicial según la fecha seleccionada y la unidad física activa
  useEffect(() => {
    let cancelled = false;
    async function fetchPrevOdometro() {
      try {
        const targetDisco = String(selectedBusDisco || getActiveBus()?.numeroDisco || '01').padStart(2, '0');
        const targetBusId = `BUS-${targetDisco}`;

        const dedicated = getLatestBusOdometer(targetDisco);
        let dedicatedCandidate: any = null;
        if (dedicated && dedicated.date && dedicated.date < date && dedicated.kmFinal) {
          dedicatedCandidate = {
            date: dedicated.date,
            kmFinal: dedicated.kmFinal,
            busId: targetBusId,
            numeroDisco: targetDisco,
          };
        }

        let serverRecords: any[] = [];
        try {
          const res = await fetch('/api/records?limit=90');
          if (res.ok) {
            serverRecords = await res.json();
          }
        } catch {}

        const allCandidates = [
          ...(dedicatedCandidate ? [dedicatedCandidate] : []),
          ...serverRecords,
        ];

        const prevCandidates = allCandidates
          .filter((r) => {
            if (!r.date || r.date >= date || (!r.kmFinal && !r.km)) return false;
            const rBusId = String(r.busId || '').toUpperCase();
            const rDisco = String(r.numeroDisco || '').padStart(2, '0');
            const rConductor = String(r.conductor || '').toUpperCase();
            if (rBusId === targetBusId || rBusId === `BUS-${targetDisco}` || rDisco === targetDisco) {
              return true;
            }
            if (rConductor.startsWith(`BUS-${targetDisco}`) || rConductor === targetDisco) {
              return true;
            }
            if (!r.busId && !r.numeroDisco && (!r.conductor || !r.conductor.startsWith('BUS-'))) {
              return targetDisco === '01';
            }
            return false;
          })
          .sort((a, b) => b.date.localeCompare(a.date));

        const prev = prevCandidates[0];
        if (prev && !cancelled) {
          const valor = prev.kmFinal ? prev.kmFinal : prev.km;
          setKmInicial(String(valor));
          setKmInicialOrigen(`Cierre del ${prev.date}`);
        } else if (!cancelled) {
          setKmInicial('');
          setKmInicialOrigen(null);
        }
      } catch {}
    }
    fetchPrevOdometro();
    return () => {
      cancelled = true;
    };
  }, [date, selectedBusDisco]);
  
  // Personas (Todos los registros activos y listas filtradas por la tripulación de la unidad)
  const [allPersonas, setAllPersonas] = useState<PersonaItem[]>([]);
  const [conductoresList, setConductoresList] = useState<PersonaItem[]>([]);
  const [ayudantesList, setAyudantesList] = useState<PersonaItem[]>([]);
  const [selectedConductor, setSelectedConductor] = useState('');
  const [selectedAyudante, setSelectedAyudante] = useState('');

  // VTs (precargados con catálogo base oficial y sincronizados con la API)
  const [selectedVtCode, setSelectedVtCode] = useState('');
  const [vts, setVts] = useState<BusVTItem[]>(() =>
    sortVtsNatural(
      VT_DATA.map(vt => ({
        id: vt.codigo,
        codigo: vt.codigo,
        nombre: vt.nombre,
        frecuencias: getOrderedVtFrecuencias(vt.codigo, vt.frecuencias),
      }))
    )
  );
  const [vtsLoading, setVtsLoading] = useState(true);

  // Frecuencias del día cargadas para el VT seleccionado
  const [frecuencias, setFrecuencias] = useState<FrecuenciaItem[]>([]);

  // Todas las frecuencias del sistema (para reasignar)
  const [allSystemFrecuencias, setAllSystemFrecuencias] = useState<SystemFrecuencia[]>([]);
  const [reassigningOrder, setReassigningOrder] = useState<number | null>(null);

  // Modal de No Realizada / Ingreso Especial
  const [noRealizadaModalOrder, setNoRealizadaModalOrder] = useState<number | null>(null);
  const [motivoSeleccionado, setMotivoSeleccionado] = useState<string>('');
  const [motivoPersonalizado, setMotivoPersonalizado] = useState<string>('');
  const [ingresoEspecialNota, setIngresoEspecialNota] = useState<string>('');
  const [ingresoEspecialMonto, setIngresoEspecialMonto] = useState<string>('');

  // Gastos
  const [expenses, setExpenses] = useState<ExpenseItem[]>([
    { description: 'Chofer', amount: '30' },
    { description: 'Ayudante', amount: '20' },
    { description: 'Diesel', amount: '0' },
    { description: 'Plan Renova', amount: '68' },
  ]);

  // Otros valores
  const [tickets, setTickets] = useState('');
  const [sobrante, setSobrante] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoSizeKB, setPhotoSizeKB] = useState<number>(0);

  // Estado de envío
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [successDayInfo, setSuccessDayInfo] = useState<string>('¡Registro Guardado Exitosamente!');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Cargar VTs, Buses y Personal al montar
  useEffect(() => {
    (async () => {
      try {
        const busesUrl =
          isSocio && socioIdSesion
            ? `/api/buses?socioId=${encodeURIComponent(socioIdSesion)}`
            : '/api/buses';
        const personasUrl =
          isSocio && socioIdSesion
            ? `/api/personas?socioId=${encodeURIComponent(socioIdSesion)}`
            : '/api/personas';

        const [resVts, resBuses, resPersonas] = await Promise.all([
          fetch('/api/bus-vts'),
          fetch(busesUrl),
          fetch(personasUrl),
        ]);

        if (resVts.ok) {
          const dataVts = await resVts.json();
          if (Array.isArray(dataVts) && dataVts.length > 0) {
            const normalizedVts = dataVts.map((v: BusVTItem) => ({
              ...v,
              frecuencias: getOrderedVtFrecuencias(v.codigo, v.frecuencias || []),
            }));
            setVts(sortVtsNatural(normalizedVts));
          }
        }

        if (resBuses.ok) {
          const jsonBuses = await resBuses.json();
          const listBuses: AvailableBusOption[] = Array.isArray(jsonBuses?.data)
            ? jsonBuses.data
            : Array.isArray(jsonBuses)
            ? jsonBuses
            : [];
          if (listBuses.length > 0) {
            setAvailableBuses(listBuses);
            const activeDisco = String(getActiveBus()?.numeroDisco || '01').padStart(2, '0');
            const existsInList = listBuses.some(
              b => String(b.numeroDisco).padStart(2, '0') === activeDisco
            );
            if (!existsInList) {
              const firstDisco = String(listBuses[0].numeroDisco).padStart(2, '0');
              setSelectedBusDisco(firstDisco);
              setActiveBus(`BUS-${firstDisco}`);
            } else {
              setSelectedBusDisco(activeDisco);
            }
          }
        }

        if (resPersonas.ok) {
          const dataPersonas: PersonaItem[] = await resPersonas.json();
          if (Array.isArray(dataPersonas)) {
            setAllPersonas(dataPersonas);
          }
        }
      } catch (err) {
        console.error('Error cargando datos iniciales:', err);
      } finally {
        setVtsLoading(false);
      }
    })();
  }, [isSocio, socioIdSesion]);

  // Filtrar Choferes y Ayudantes exclusivamente para la tripulación de la unidad activa
  useEffect(() => {
    const cleanDisco = String(selectedBusDisco || '01').padStart(2, '0');
    const busObj = availableBuses.find(
      b => String(b.numeroDisco).padStart(2, '0') === cleanDisco
    );
    const targetSocioId = busObj?.socioId || (isSocio ? socioIdSesion : null);

    // Solo roles operativos de tripulación (CONDUCTOR y AYUDANTE), excluyendo socios/admins
    const soloTripulacion = allPersonas.filter(
      p => (p.rol === 'CONDUCTOR' || p.rol === 'AYUDANTE') && p.activo !== false
    );

    let scopedPersonas = soloTripulacion;
    if (targetSocioId) {
      const DelSocio = soloTripulacion.filter(p => p.socioId === targetSocioId);
      // Si el socio/bus tiene su tripulación asignada, aislar estrictamente a esa tripulación
      if (DelSocio.length > 0 || isSocio) {
        scopedPersonas = DelSocio;
      }
    }

    const conds = scopedPersonas.filter(p => p.rol === 'CONDUCTOR');
    const ayuds = scopedPersonas.filter(p => p.rol === 'AYUDANTE');

    setConductoresList(conds);
    setAyudantesList(ayuds);

    // Preseleccionar el chofer activo en turno de esa unidad
    const activeCond = conds.find(p => p.esActual) || conds[0];
    setSelectedConductor(activeCond ? activeCond.nombre : '');

    // Preseleccionar el ayudante activo en turno de esa unidad
    const activeAyud = ayuds.find(p => p.esActual) || ayuds[0];
    setSelectedAyudante(activeAyud ? activeAyud.nombre : '');
  }, [allPersonas, availableBuses, selectedBusDisco, isSocio, socioIdSesion]);

  // Cargar todas las frecuencias del sistema para reasignación
  const loadSystemFrecuencias = async () => {
    if (allSystemFrecuencias.length > 0) return;
    try {
      const res = await fetch('/api/frecuencias?all=true');
      if (res.ok) {
        const data = await res.json();
        setAllSystemFrecuencias(data);
      }
    } catch (err) {
      console.error('Error cargando frecuencias maestras:', err);
    }
  };

  // Al seleccionar un VT, precargar sus frecuencias respetando el orden programado de turno (sin ordenar por hora)
  const handleSelectVT = (code: string) => {
    setSelectedVtCode(code);
    const vt = vts.find(v => v.codigo === code);
    if (vt && Array.isArray(vt.frecuencias) && vt.frecuencias.length > 0) {
      const ordered = getOrderedVtFrecuencias(vt.codigo, vt.frecuencias);
      const items: FrecuenciaItem[] = ordered.map((f, idx) => ({
        order: idx + 1,
        routeFrom: f.routeFrom || 'Loja',
        routeTo: f.routeTo || 'Vilcabamba',
        time: f.time || '',
        efectivoReal: '',
        cajaComunMonto: '',
        cajaComunPasajeros: '',
        noRealizada: false,
      }));
      setFrecuencias(items);
    } else {
      setFrecuencias([]);
    }
  };

  // Actualizar una frecuencia
  const updateFrecuencia = (order: number, patch: Partial<FrecuenciaItem>) => {
    setFrecuencias(prev =>
      prev.map(f => (f.order === order ? { ...f, ...patch } : f))
    );
  };

  // Abrir modal de reasignación
  const handleOpenReassign = async (order: number) => {
    await loadSystemFrecuencias();
    setReassigningOrder(order);
  };

  // Frecuencias filtradas por el mismo origen de salida
  const targetReassignFrecuencias = useMemo(() => {
    if (reassigningOrder === null) return [];
    const current = frecuencias.find(f => f.order === reassigningOrder);
    if (!current) return allSystemFrecuencias;
    const origen = current.routeFrom.trim().toLowerCase();
    return allSystemFrecuencias
      .filter(f => {
        const fPartes = f.ruta.split(' - ');
        const fOrigen = fPartes[0]?.trim().toLowerCase() || '';
        return fOrigen === origen;
      })
      .sort((a, b) => a.hora.localeCompare(b.hora));
  }, [reassigningOrder, frecuencias, allSystemFrecuencias]);

  // Aplicar reasignación seleccionada
  const applyReassignment = (target: SystemFrecuencia) => {
    if (reassigningOrder === null) return;
    const partes = target.ruta.split(' - ');
    const routeFrom = partes[0]?.trim() || 'Loja';
    const routeTo = partes[1]?.trim() || 'Vilcabamba';
    updateFrecuencia(reassigningOrder, {
      routeFrom,
      routeTo,
      time: target.hora,
    });
    setReassigningOrder(null);
  };

  // Helper para etiqueta de motivo
  const getMotivoLabel = (motivo?: string) => {
    if (!motivo) return 'No realizada';
    const found = MOTIVOS_NO_REALIZADA.find(m => m.id === motivo);
    if (found) return found.label;
    return motivo;
  };

  // Abrir modal de No Realizada / Ingreso Especial
  const handleOpenNoRealizadaModal = (f: FrecuenciaItem) => {
    setNoRealizadaModalOrder(f.order);
    if (f.noRealizada) {
      if (f.isIngresoEspecial) {
        setMotivoSeleccionado('ingreso_especial');
        setIngresoEspecialNota(f.ingresoEspecialNota || '');
        setIngresoEspecialMonto(f.ingresoEspecialMonto || f.efectivoReal || '');
        setMotivoPersonalizado('');
      } else {
        const known = MOTIVOS_NO_REALIZADA.find(m => m.id === f.motivoNoRealizada);
        if (known && known.id !== 'otro') {
          setMotivoSeleccionado(known.id);
          setMotivoPersonalizado('');
        } else {
          setMotivoSeleccionado('otro');
          setMotivoPersonalizado(f.motivoNoRealizada || '');
        }
        setIngresoEspecialNota('');
        setIngresoEspecialMonto('');
      }
    } else {
      setMotivoSeleccionado('');
      setMotivoPersonalizado('');
      setIngresoEspecialNota('');
      setIngresoEspecialMonto('');
    }
  };

  // Confirmar acción del modal No Realizada / Ingreso Especial
  const handleConfirmNoRealizada = () => {
    if (noRealizadaModalOrder === null) return;
    const isEspecial = motivoSeleccionado === 'ingreso_especial';
    const finalMotivo = isEspecial
      ? 'ingreso_especial'
      : (motivoSeleccionado === 'otro' ? (motivoPersonalizado.trim() || 'otro') : motivoSeleccionado);

    updateFrecuencia(noRealizadaModalOrder, {
      noRealizada: true,
      motivoNoRealizada: finalMotivo,
      isIngresoEspecial: isEspecial,
      ingresoEspecialNota: isEspecial ? ingresoEspecialNota.trim() : undefined,
      ingresoEspecialMonto: isEspecial ? ingresoEspecialMonto.trim() : undefined,
      efectivoReal: isEspecial ? (ingresoEspecialMonto.trim() || '0') : '',
      cajaComunMonto: '',
      cajaComunPasajeros: '',
    });
    setNoRealizadaModalOrder(null);
  };

  // Reactivar frecuencia anulada o especial como frecuencia regular
  const handleReactivarFrecuencia = (order: number) => {
    updateFrecuencia(order, {
      noRealizada: false,
      motivoNoRealizada: undefined,
      isIngresoEspecial: false,
      ingresoEspecialNota: undefined,
      ingresoEspecialMonto: undefined,
    });
  };

  // Manejo de gastos
  const addExpense = () => {
    setExpenses(prev => [...prev, { description: '', amount: '' }]);
  };

  const updateExpense = (idx: number, patch: Partial<ExpenseItem>) => {
    setExpenses(prev => prev.map((e, i) => (i === idx ? { ...e, ...patch } : e)));
  };

  const removeExpense = (idx: number) => {
    setExpenses(prev => prev.filter((_, i) => i !== idx));
  };

  // Compresión y carga inteligente de foto para asegurar que no exceda límites
  const processImageFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Redimensionar si es muy grande (max 1600px)
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDimension = 1600;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.82);
          setPhotoPreview(compressedBase64);
          setPhotoSizeKB(Math.round(compressedBase64.length / 1024));
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Manejo de selección de archivo o toma de cámara
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    processImageFile(file);
    e.target.value = '';
  };

  // Cálculos de totales (idénticos a la regla de negocio y /api/records)
  const totals = useMemo(() => {
    const totalEfectivoReal = frecuencias.reduce(
      (sum, f) => {
        if (!f.noRealizada) return sum + num(f.efectivoReal);
        if (f.isIngresoEspecial) return sum + num(f.ingresoEspecialMonto || f.efectivoReal);
        return sum;
      },
      0
    );
    const totalCajaComun = frecuencias.reduce(
      (sum, f) => (f.noRealizada ? sum : sum + num(f.cajaComunMonto)),
      0
    );
    const sobranteNum = num(sobrante);
    const production = totalEfectivoReal + totalCajaComun + sobranteNum;
    const totalGastos = expenses.reduce((sum, e) => sum + num(e.amount), 0);
    const ticketsNum = num(tickets);

    let entregaAyudante: number;
    if (totalCajaComun > 0) {
      entregaAyudante = totalEfectivoReal + sobranteNum - totalGastos;
    } else {
      entregaAyudante = totalEfectivoReal + sobranteNum - (totalGastos + ticketsNum);
    }
    const entregaCompania = totalCajaComun > 0 ? totalCajaComun - ticketsNum : 0;

    return {
      totalEfectivoReal,
      totalCajaComun,
      sobranteNum,
      production,
      totalGastos,
      ticketsNum,
      entregaAyudante,
      entregaCompania,
    };
  }, [frecuencias, expenses, sobrante, tickets]);

  // Guardar en la Base de Datos Central (Tabla DailyRecord y Trip, flujo estándar)
  const handleSave = async () => {
    setError(null);
    if (!date) {
      setError('Por favor selecciona la fecha del registro.');
      return;
    }
    if (!selectedVtCode) {
      setError('Por favor selecciona el grupo VT de la unidad.');
      return;
    }
    if (frecuencias.length === 0) {
      setError('No hay frecuencias cargadas para este VT.');
      return;
    }

    setSaving(true);
    try {
      const activeBus = getActiveBus();
      const discoUnidad = String(selectedBusDisco || activeBus?.numeroDisco || '01').padStart(2, '0');
      const busObj = availableBuses.find(
        b => String(b.numeroDisco).padStart(2, '0') === discoUnidad
      );
      const idUnidad = `BUS-${discoUnidad}`;
      const placaUnidad = busObj?.placa || activeBus?.placa;
      const recorridoCalculado =
        kmRecorridos !== null && kmRecorridos >= 0 ? kmRecorridos.toString() : null;

      const canonicalBody = buildCanonicalRecordPayload({
        date,
        kmInicial: kmInicial.trim() || null,
        kmFinal: km.trim() || null,
        km: recorridoCalculado,
        busId: idUnidad,
        numeroDisco: discoUnidad,
        placaBus: placaUnidad,
        conductorNombre: selectedConductor.trim() || null,
        ayudanteNombre: selectedAyudante.trim() || null,
        vtCode: selectedVtCode,
        trips: frecuencias.map(f => {
          const isEsp = Boolean(f.isIngresoEspecial);
          const isNoReal = Boolean(f.noRealizada) && !isEsp;
          const montoEspecial = isEsp ? num(f.ingresoEspecialMonto || f.efectivoReal) : 0;
          return {
            routeFrom: isNoReal ? '-' : f.routeFrom,
            routeTo: isNoReal ? '-' : f.routeTo,
            time: f.time || null,
            income: isEsp ? montoEspecial : (isNoReal ? 0 : num(f.efectivoReal)),
            efectivoReal: isEsp ? montoEspecial : (isNoReal ? 0 : num(f.efectivoReal)),
            boletos: 0,
            cajaComunPasajeros: isNoReal || isEsp ? 0 : parseInt(f.cajaComunPasajeros, 10) || 0,
            cajaComunMonto: isNoReal || isEsp ? 0 : num(f.cajaComunMonto),
            tipo: isEsp ? 'ingreso_especial' : (isNoReal ? 'no_realizada' : 'frecuencia'),
            motivo: isEsp ? 'ingreso_especial' : (isNoReal ? f.motivoNoRealizada || 'otro' : null),
            notaEspecial: isEsp ? f.ingresoEspecialNota || 'Viaje especial' : null,
            isNoRealizada: isNoReal,
            isIngresoEspecial: isEsp,
          };
        }),
        expenses: expenses
          .filter(e => e.description.trim() !== '')
          .map(e => ({
            description: e.description.trim(),
            amount: num(e.amount),
          })),
        tickets: num(tickets),
        cajaComun: totals.totalCajaComun,
        sobrante: num(sobrante),
        photoUrl: photoPreview || null,
      });

      const res = await fetch('/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(canonicalBody),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'Error del servidor' }));
        throw new Error(errData.error || 'Error al guardar el registro histórico');
      }

      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(
            `arqueo_general_${discoUnidad}_${selectedVtCode}_${date}`,
            JSON.stringify(canonicalBody)
          );
          if (km && km.trim()) {
            saveBusOdometer(discoUnidad, km.trim(), date);
          }
          obtenerUltimosArqueosBus(discoUnidad, idUnidad).catch(() => {});
        } catch {}
      }

      setSavedSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Error de conexión al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#F5F5F5]">
      {/* Header fijo */}
      <header className="sticky top-0 z-30 bg-[#912D26] text-white px-4 py-3 shadow-md flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="text-white hover:bg-white/20 h-10 w-10 rounded-xl"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-base font-bold leading-tight">Carga Histórica de Cuadernos</h1>
            <p className="text-[11px] text-red-200">Regularización de días y vueltas pasadas</p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-[10px] bg-amber-400 text-amber-950 px-2 py-0.5 rounded-full font-bold">
            Regularización
          </span>
        </div>
      </header>

      {/* Contenido scrolleable con zona del pulgar respetada */}
      <main className="flex-1 px-4 py-4 pb-32 max-w-lg mx-auto w-full space-y-4">
        {/* Banner Pedagógico de Regularización para el Transportista */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 flex items-start gap-3 text-amber-900 shadow-2xs">
          <div className="w-9 h-9 rounded-xl bg-amber-200/80 text-amber-900 flex items-center justify-center shrink-0 mt-0.5">
            <BookOpen className="w-5 h-5" />
          </div>
          <div className="text-xs leading-relaxed">
            <p className="font-bold text-amber-950">¿Para qué sirve esta opción?</p>
            <p className="text-amber-800/90 mt-0.5">
              Aquí puedes transcribir las hojas de tus <strong>cuadernos de apuntes anteriores</strong>. Elige la fecha que trabajaste en el pasado para que esos ingresos, diésel y vueltas se sumen al historial sin afectar la caja de hoy.
            </p>
          </div>
        </div>
        {/* Notificación de éxito */}
        {savedSuccess && (
          <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 p-4 rounded-2xl flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
            <div>
              <p className="font-bold text-sm">¡Registro Guardado Exitosamente!</p>
              <p className="text-xs text-emerald-700">La producción por frecuencia ya está en el sistema.</p>
            </div>
          </div>
        )}

        {/* Notificación de error */}
        {error && (
          <div className="bg-red-50 border border-red-300 text-red-800 p-3.5 rounded-2xl flex items-center gap-2 text-xs">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
            <p className="flex-1 font-medium">{error}</p>
          </div>
        )}

        {/* 1. Datos Generales de la Hoja */}
        <Card className="rounded-2xl border border-gray-200 shadow-sm bg-white overflow-hidden">
          <CardHeader className="py-3 px-4 bg-gray-50 border-b border-gray-100 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-[#912D26]" />
              1. Identificación del Día y Unidad
            </CardTitle>
            <span className="text-[11px] font-bold text-[#912D26] bg-[#912D26]/10 px-2.5 py-0.5 rounded-full">
              Unidad #{String(selectedBusDisco || '01').padStart(2, '0')}
            </span>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {availableBuses.length > 1 && (
              <div>
                <Label className="text-xs font-semibold text-gray-700 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Bus className="w-3.5 h-3.5 text-[#912D26]" />
                    Autobús / Unidad a Igualar
                  </span>
                  <span className="text-[10px] text-gray-400 font-normal">
                    Filtra su tripulación automáticamente
                  </span>
                </Label>
                <div className="relative mt-1">
                  <select
                    value={String(selectedBusDisco || '01').padStart(2, '0')}
                    onChange={e => {
                      const disco = String(e.target.value).padStart(2, '0');
                      setSelectedBusDisco(disco);
                      setActiveBus(`BUS-${disco}`);
                    }}
                    className="w-full h-11 px-3 pr-8 rounded-xl border border-gray-300 bg-white text-sm font-bold text-[#3A3A3A] focus:ring-2 focus:ring-[#912D26] outline-none appearance-none"
                  >
                    {availableBuses.map(b => {
                      const disco = String(b.numeroDisco).padStart(2, '0');
                      return (
                        <option key={b.id || disco} value={disco}>
                          Bus #{disco} — {b.placa} {b.propietario ? `(${b.propietario})` : ''}
                        </option>
                      );
                    })}
                  </select>
                  <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-3.5 pointer-events-none" />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-gray-700">Fecha del Cuaderno</Label>
                <Input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="mt-1 h-11 rounded-xl text-sm font-medium"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-gray-700">Grupo VT</Label>
                <div className="relative mt-1">
                  <select
                    value={selectedVtCode}
                    onChange={e => handleSelectVT(e.target.value)}
                    className="w-full h-11 px-3 pr-8 rounded-xl border border-gray-300 bg-white text-sm font-bold text-[#912D26] focus:ring-2 focus:ring-[#912D26] outline-none appearance-none"
                  >
                    <option value="">-- Seleccionar VT --</option>
                    {vts.map(v => (
                      <option key={v.id} value={v.codigo}>
                        {formatVtOptionLabel(v)}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-3.5 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Selector de Chofer (Conductor) con preselección del activo de la unidad */}
            <div>
              <Label className="text-xs font-semibold text-gray-700 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-[#912D26]" />
                  Chofer / Conductor (Bus #{String(selectedBusDisco || '01').padStart(2, '0')})
                </span>
                <span className="text-[10px] text-gray-400 font-normal">
                  {conductoresList.length} en esta tripulación
                </span>
              </Label>
              <div className="relative mt-1">
                <select
                  value={selectedConductor}
                  onChange={e => setSelectedConductor(e.target.value)}
                  className="w-full h-11 px-3 pr-8 rounded-xl border border-gray-300 bg-white text-sm font-semibold text-[#3A3A3A] focus:ring-2 focus:ring-[#912D26] outline-none appearance-none"
                >
                  <option value="">-- Seleccionar Chofer --</option>
                  {conductoresList.map(c => (
                    <option key={c.id} value={c.nombre}>
                      {c.nombre} {c.esActual ? "(En Turno)" : ""}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-3.5 pointer-events-none" />
              </div>
            </div>

            {/* Selector de Ayudante con preselección del activo de la unidad */}
            <div>
              <Label className="text-xs font-semibold text-gray-700 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-[#912D26]" />
                  Ayudante (Bus #{String(selectedBusDisco || '01').padStart(2, '0')})
                </span>
                <span className="text-[10px] text-gray-400 font-normal">
                  {ayudantesList.length} en esta tripulación
                </span>
              </Label>
              <div className="relative mt-1">
                <select
                  value={selectedAyudante}
                  onChange={e => setSelectedAyudante(e.target.value)}
                  className="w-full h-11 px-3 pr-8 rounded-xl border border-gray-300 bg-white text-sm font-semibold text-[#3A3A3A] focus:ring-2 focus:ring-[#912D26] outline-none appearance-none"
                >
                  <option value="">-- Seleccionar Ayudante --</option>
                  {ayudantesList.map(a => (
                    <option key={a.id} value={a.nombre}>
                      {a.nombre} {a.esActual ? "(En Turno)" : ""}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-3.5 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-2 pt-1 border-t border-gray-100">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-medium text-gray-600 flex items-center justify-between">
                    <span>Km Inicial (Salida)</span>
                    {kmInicialOrigen && (
                      <span className="text-[10px] text-emerald-700 font-semibold">
                        {kmInicialOrigen}
                      </span>
                    )}
                  </Label>
                  <Input
                    placeholder="Ej: 897300"
                    value={kmInicial}
                    onChange={e => setKmInicial(e.target.value)}
                    className="mt-1 h-10 rounded-xl text-xs font-mono"
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium text-gray-600">
                    Km Final (Llegada)
                  </Label>
                  <Input
                    placeholder="Ej: 897818"
                    value={km}
                    onChange={e => setKm(e.target.value)}
                    className="mt-1 h-10 rounded-xl text-xs font-mono font-bold"
                  />
                </div>
              </div>
              {kmRecorridos !== null && (
                <div
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center justify-between ${
                    kmRecorridos >= 0
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}
                >
                  <span>Recorrido calculado del día:</span>
                  <span className="font-mono">
                    {kmRecorridos >= 0 ? `+${kmRecorridos} km` : `${kmRecorridos} km (revisar)`}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 2. Lista de Frecuencias Precargadas */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <p className="text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center gap-1.5">
              <Bus className="w-4 h-4 text-[#912D26]" />
              2. Frecuencias del Cuaderno ({frecuencias.length})
            </p>
            {selectedVtCode && (
              <span className="text-[11px] font-bold text-[#912D26] bg-[#912D26]/10 px-2 py-0.5 rounded-md">
                {selectedVtCode}
              </span>
            )}
          </div>

          {!selectedVtCode && (
            <div className="p-6 text-center bg-white rounded-2xl border border-dashed border-gray-300">
              <Bus className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-xs font-semibold text-gray-600">Selecciona un Grupo VT arriba</p>
              <p className="text-[11px] text-gray-400">
                Se precargarán automáticamente las horas y rutas programadas.
              </p>
            </div>
          )}

          {frecuencias.map(f => (
            <Card
              key={f.order}
              className={`rounded-2xl border transition-all ${
                !f.noRealizada
                  ? "bg-white border-gray-200 shadow-sm"
                  : f.isIngresoEspecial
                  ? "bg-amber-50/40 border-amber-300 shadow-sm"
                  : "bg-gray-100 border-gray-300 opacity-75"
              }`}
            >
              <CardContent className="p-3.5 space-y-2.5">
                {/* Cabecera de la vuelta con botón de reasignar */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-[#912D26] text-white text-xs font-bold flex items-center justify-center">
                      {f.order}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-[#3A3A3A] font-mono">
                          {f.time || "--:--"}
                        </span>
                        <span className="text-xs font-semibold text-gray-600">
                          {f.routeFrom} → {f.routeTo}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Acciones de la frecuencia: Reasignar & No Realizada */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleOpenReassign(f.order)}
                      title="Cambiar/Reasignar Horario"
                      className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-bold flex items-center gap-1 active:scale-95 transition-transform"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-[#912D26]" />
                      <span>Cambiar</span>
                    </button>
                    {f.noRealizada ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleOpenNoRealizadaModal(f)}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 ${
                            f.isIngresoEspecial
                              ? "bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300"
                              : "bg-orange-100 hover:bg-orange-200 text-orange-900 border border-orange-300"
                          }`}
                          title="Editar motivo o detalle especial"
                        >
                          <span>{f.isIngresoEspecial ? "Editar Especial" : "Editar Motivo"}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReactivarFrecuencia(f.order)}
                          className="px-2 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-xs font-bold transition-colors"
                          title="Reactivar frecuencia normal"
                        >
                          Reactivar
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleOpenNoRealizadaModal(f)}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-gray-100 hover:bg-red-50 text-gray-500 hover:text-red-600 transition-colors"
                        title="Anular vuelta o registrar ingreso especial"
                      >
                        Anular
                      </button>
                    )}
                  </div>
                </div>

                {/* Campos de captura rápida: Efectivo y Caja Común / Ingreso Especial / No Realizada */}
                {!f.noRealizada ? (
                  <div className="grid grid-cols-2 gap-2.5 pt-1">
                    <div className="bg-emerald-50/60 p-2 rounded-xl border border-emerald-200/60">
                      <Label className="text-[11px] font-bold text-emerald-800 flex items-center gap-1">
                        <DollarSign className="w-3 h-3 text-emerald-600" />
                        Efectivo Contado
                      </Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={f.efectivoReal}
                        onChange={e => updateFrecuencia(f.order, { efectivoReal: e.target.value })}
                        className="mt-1 h-10 bg-white rounded-lg text-base font-bold text-emerald-700"
                      />
                    </div>
                    <div className="bg-blue-50/60 p-2 rounded-xl border border-blue-200/60">
                      <Label className="text-[11px] font-bold text-blue-800 flex items-center gap-1">
                        <Ticket className="w-3 h-3 text-blue-600" />
                        Caja Común ($)
                      </Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={f.cajaComunMonto}
                        onChange={e => updateFrecuencia(f.order, { cajaComunMonto: e.target.value })}
                        className="mt-1 h-10 bg-white rounded-lg text-base font-bold text-blue-700"
                      />
                    </div>
                  </div>
                ) : f.isIngresoEspecial ? (
                  <div className="bg-amber-50/90 p-3 rounded-xl border border-amber-300 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                        <Sparkles className="w-4 h-4 text-amber-600" />
                        <span>Ingreso Especial / Contratación</span>
                      </div>
                      <span className="text-xs font-black text-amber-950 bg-amber-200/80 px-2.5 py-0.5 rounded-full border border-amber-300">
                        +${num(f.ingresoEspecialMonto || f.efectivoReal).toFixed(2)}
                      </span>
                    </div>
                    {f.ingresoEspecialNota && (
                      <p className="text-xs text-amber-900 font-semibold italic">
                        &ldquo;{f.ingresoEspecialNota}&rdquo;
                      </p>
                    )}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div>
                        <Label className="text-[10px] font-bold text-amber-900">Nota / Motivo</Label>
                        <Input
                          type="text"
                          value={f.ingresoEspecialNota || ''}
                          onChange={e => updateFrecuencia(f.order, { ingresoEspecialNota: e.target.value })}
                          placeholder="Ej: Viaje al Cisne"
                          className="mt-0.5 h-8 text-xs bg-white border-amber-300"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] font-bold text-amber-900">Monto Cobrado ($)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={f.ingresoEspecialMonto || f.efectivoReal || ''}
                          onChange={e => updateFrecuencia(f.order, {
                            ingresoEspecialMonto: e.target.value,
                            efectivoReal: e.target.value,
                          })}
                          placeholder="0.00"
                          className="mt-0.5 h-8 text-xs font-black text-amber-950 bg-white border-amber-300"
                        />
                      </div>
                    </div>
                    <p className="text-[10px] text-amber-800 italic">
                      * Este valor suma al total de Producción y al Efectivo Contado del cuaderno.
                    </p>
                  </div>
                ) : (
                  <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-200 text-xs text-gray-600 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-orange-800">🚫 No realizada:</span>{' '}
                      <span className="font-semibold text-gray-800">{getMotivoLabel(f.motivoNoRealizada)}</span>
                      <p className="text-[11px] text-gray-500 italic mt-0.5">
                        Esta frecuencia fue marcada como no realizada. No sumará ingresos ($0.00).
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 3. Desglose de Gastos */}
        <Card className="rounded-2xl border border-gray-200 shadow-sm bg-white">
          <CardHeader className="py-3 px-4 bg-gray-50 border-b border-gray-100 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-bold text-gray-700 uppercase tracking-wide">
              3. Gastos del Cuaderno
            </CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addExpense}
              className="h-8 text-xs font-bold text-[#912D26] border-[#912D26]/30 hover:bg-[#912D26]/5 rounded-lg"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Agregar Gasto
            </Button>
          </CardHeader>
          <CardContent className="p-4 space-y-2.5">
            {expenses.map((e, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Input
                  placeholder="Descripción"
                  value={e.description}
                  onChange={ev => updateExpense(idx, { description: ev.target.value })}
                  className="flex-1 h-10 rounded-xl text-xs font-medium"
                />
                <div className="w-28 relative">
                  <span className="absolute left-2.5 top-2.5 text-xs text-gray-400 font-bold">$</span>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={e.amount}
                    onChange={ev => updateExpense(idx, { amount: ev.target.value })}
                    className="h-10 pl-6 rounded-xl text-xs font-bold text-right text-red-600"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeExpense(idx)}
                  className="p-2 text-gray-400 hover:text-red-500 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* 4. Tickets, Sobrante y Foto del Cuaderno (Cámara o Archivo) */}
        <Card className="rounded-2xl border border-gray-200 shadow-sm bg-white">
          <CardHeader className="py-3 px-4 bg-gray-50 border-b border-gray-100">
            <CardTitle className="text-xs font-bold text-gray-700 uppercase tracking-wide">
              4. Ajustes y Foto de Respaldo
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-gray-700">Tickets ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={tickets}
                  onChange={e => setTickets(e.target.value)}
                  className="mt-1 h-10 rounded-xl text-xs font-bold"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-gray-700">Sobrante ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={sobrante}
                  onChange={e => setSobrante(e.target.value)}
                  className="mt-1 h-10 rounded-xl text-xs font-bold"
                />
              </div>
            </div>

            {/* Foto del cuaderno: Tomar con Cámara O Subir desde Galería/Archivo */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label className="text-xs font-semibold text-gray-700">
                  Foto de la Hoja de Cuaderno
                </Label>
                {photoPreview && (
                  <span className="text-[10px] text-gray-500 font-mono">
                    {photoSizeKB} KB (optimizado)
                  </span>
                )}
              </div>

              {/* Input oculto para cámara directa */}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                ref={cameraInputRef}
                onChange={handlePhotoUpload}
                className="hidden"
              />

              {/* Input oculto para subir archivo/galería */}
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handlePhotoUpload}
                className="hidden"
              />

              {photoPreview ? (
                <div className="relative rounded-2xl overflow-hidden border-2 border-[#912D26] shadow-sm">
                  <img src={photoPreview} alt="Cuaderno" className="w-full h-52 object-contain bg-black/5" />
                  <div className="absolute bottom-2 left-2 right-2 bg-black/60 backdrop-blur-sm text-white px-3 py-1.5 rounded-xl flex items-center justify-between text-xs">
                    <span className="truncate">Foto lista para respaldo</span>
                    <button
                      type="button"
                      onClick={() => {
                        setPhotoPreview(null);
                        setPhotoSizeKB(0);
                      }}
                      className="text-red-300 hover:text-white font-bold text-xs underline ml-2"
                    >
                      Eliminar / Tomar otra
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoPreview(null);
                      setPhotoSizeKB(0);
                    }}
                    className="absolute top-2 right-2 bg-black/70 text-white p-2 rounded-full hover:bg-black transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => cameraInputRef.current?.click()}
                    className="h-14 rounded-xl border-2 border-dashed border-gray-300 hover:border-[#912D26] hover:bg-[#912D26]/5 text-[#3A3A3A] font-semibold text-xs flex flex-col items-center justify-center gap-1"
                  >
                    <Camera className="w-5 h-5 text-[#912D26]" />
                    <span>Tomar Foto</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="h-14 rounded-xl border-2 border-dashed border-gray-300 hover:border-[#912D26] hover:bg-[#912D26]/5 text-[#3A3A3A] font-semibold text-xs flex flex-col items-center justify-center gap-1"
                  >
                    <Upload className="w-5 h-5 text-gray-600" />
                    <span>Subir de Galería</span>
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 5. Resumen Financiero en Vivo */}
        <Card className="rounded-2xl border-2 border-[#912D26]/30 bg-gradient-to-br from-[#912D26]/5 via-white to-white shadow-md">
          <CardContent className="p-4 space-y-2">
            <div className="flex justify-between text-xs text-gray-600">
              <span>Efectivo Total Contado:</span>
              <span className="font-bold text-gray-800">${totals.totalEfectivoReal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs text-gray-600">
              <span>Caja Común Total:</span>
              <span className="font-bold text-blue-700">${totals.totalCajaComun.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs text-gray-600">
              <span>Total Gastos:</span>
              <span className="font-bold text-red-600">-${totals.totalGastos.toFixed(2)}</span>
            </div>
            <Separator className="my-1" />
            <div className="flex justify-between text-sm font-extrabold text-[#912D26]">
              <span>PRODUCCIÓN TOTAL:</span>
              <span>${totals.production.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs font-bold text-gray-700 pt-1">
              <span>Entrega Ayudante:</span>
              <span className="text-emerald-700 font-extrabold">${totals.entregaAyudante.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs font-bold text-gray-700">
              <span>Entrega Compañía:</span>
              <span className="text-blue-800 font-extrabold">${totals.entregaCompania.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Barra Inferior Fija para Acción Ergonómica con el Pulgar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-sm border-t border-gray-200 shadow-2xl z-40 max-w-lg mx-auto">
        <Button
          onClick={handleSave}
          disabled={saving || savedSuccess}
          className="w-full h-14 text-base font-bold rounded-2xl bg-[#912D26] hover:bg-[#7A2520] text-white shadow-lg shadow-[#912D26]/30 active:scale-[0.98] transition-transform"
        >
          {saving ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Guardando en Base de Datos...
            </>
          ) : (
            <>
              <Save className="w-5 h-5 mr-2" />
              GUARDAR HOJA DE CUADERNO
            </>
          )}
        </Button>
      </div>

      {/* Modal Bottom-Sheet de No Realizada / Ingreso Especial */}
      {noRealizadaModalOrder !== null && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-3">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-md p-5 max-h-[85vh] overflow-y-auto shadow-2xl animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 bg-orange-100 rounded-xl flex items-center justify-center">
                  <XCircle className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#3A3A3A]">
                    Anular Vuelta / Ingreso Especial
                  </h3>
                  <p className="text-xs text-gray-500">
                    Vuelta #{noRealizadaModalOrder} — {frecuencias.find(f => f.order === noRealizadaModalOrder)?.time || '--:--'} (
                    {frecuencias.find(f => f.order === noRealizadaModalOrder)?.routeFrom} → {frecuencias.find(f => f.order === noRealizadaModalOrder)?.routeTo})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setNoRealizadaModalOrder(null)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-600 mb-3 font-medium">
              Selecciona el motivo por el cual no se cubrió el turno normal o si se realizó un ingreso especial:
            </p>

            <div className="space-y-1.5">
              {MOTIVOS_NO_REALIZADA.map(m => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    setMotivoSeleccionado(m.id);
                    if (m.id !== 'otro') setMotivoPersonalizado('');
                  }}
                  className={`w-full p-2.5 rounded-xl border-2 text-left flex items-center gap-3 transition-all active:scale-[0.98] ${
                    motivoSeleccionado === m.id
                      ? m.id === 'ingreso_especial'
                        ? 'border-amber-500 bg-amber-50'
                        : 'border-orange-500 bg-orange-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className={m.color}>{m.icon}</span>
                  <span className="text-xs font-bold text-[#3A3A3A]">{m.label}</span>
                  {motivoSeleccionado === m.id && (
                    <span className={`ml-auto font-bold text-xs ${m.id === 'ingreso_especial' ? 'text-amber-600' : 'text-orange-600'}`}>✓</span>
                  )}
                </button>
              ))}
            </div>

            {/* Campo personalizado (Otro) */}
            {motivoSeleccionado === 'otro' && (
              <div className="mt-3">
                <Input
                  type="text"
                  placeholder="Escribe el motivo exacto..."
                  value={motivoPersonalizado}
                  onChange={e => setMotivoPersonalizado(e.target.value)}
                  className="w-full text-xs"
                  autoFocus
                />
              </div>
            )}

            {/* Campos Ingreso Especial */}
            {motivoSeleccionado === 'ingreso_especial' && (
              <div className="mt-3 space-y-2.5 p-3 bg-amber-50 rounded-xl border border-amber-300">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span>Registrar detalle del ingreso especial</span>
                </div>
                <div>
                  <Label className="text-[11px] font-bold text-amber-900">Nota / Contrato</Label>
                  <Input
                    type="text"
                    placeholder="Ej: Viaje al Cisne, Contratación colegial..."
                    value={ingresoEspecialNota}
                    onChange={e => setIngresoEspecialNota(e.target.value)}
                    className="mt-1 h-9 bg-white text-xs border-amber-300"
                    autoFocus
                  />
                </div>
                <div>
                  <Label className="text-[11px] font-bold text-amber-900">Monto en Dólares ($)</Label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-black text-sm">$</span>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={ingresoEspecialMonto}
                      onChange={e => setIngresoEspecialMonto(e.target.value)}
                      className="pl-7 h-9 text-base font-black text-amber-950 bg-white border-amber-300"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-amber-700 italic">
                  * Este monto sumará a la Producción y al Efectivo Contado de la hoja de cuaderno.
                </p>
              </div>
            )}

            <div className="flex gap-2 mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setNoRealizadaModalOrder(null)}
                className="flex-1 h-10 rounded-xl border-gray-300 text-gray-600 font-semibold text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleConfirmNoRealizada}
                disabled={
                  !motivoSeleccionado ||
                  (motivoSeleccionado === 'otro' && !motivoPersonalizado.trim()) ||
                  (motivoSeleccionado === 'ingreso_especial' && !ingresoEspecialNota.trim())
                }
                className={`flex-1 h-10 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 ${
                  motivoSeleccionado &&
                  (motivoSeleccionado !== 'otro' || motivoPersonalizado.trim()) &&
                  (motivoSeleccionado !== 'ingreso_especial' || ingresoEspecialNota.trim())
                    ? motivoSeleccionado === 'ingreso_especial'
                      ? 'bg-amber-600 hover:bg-amber-700 text-white'
                      : 'bg-orange-600 hover:bg-orange-700 text-white'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                Confirmar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Bottom-Sheet de Reasignación de Frecuencia */}
      {reassigningOrder !== null && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-3">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-md p-5 max-h-[85vh] overflow-y-auto shadow-2xl animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-bold text-[#3A3A3A] flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-[#912D26]" />
                Cambiar / Reasignar Horario
              </h3>
              <button
                type="button"
                onClick={() => setReassigningOrder(null)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              Selecciona la frecuencia real anotada en el cuaderno con salida desde{" "}
              <strong className="text-[#912D26]">
                {frecuencias.find(f => f.order === reassigningOrder)?.routeFrom}
              </strong>
              :
            </p>

            <div className="space-y-2">
              {targetReassignFrecuencias.length === 0 ? (
                <p className="text-xs text-center text-gray-400 py-6">
                  Cargando catálogo de frecuencias maestras...
                </p>
              ) : (
                targetReassignFrecuencias.map(target => (
                  <button
                    key={target.id}
                    type="button"
                    onClick={() => applyReassignment(target)}
                    className="w-full p-3 rounded-xl border border-gray-200 hover:border-[#912D26] hover:bg-[#912D26]/5 text-left transition-all flex items-center justify-between active:scale-[0.98]"
                  >
                    <div>
                      <div className="font-bold text-xs text-[#3A3A3A]">{target.nombre}</div>
                      <div className="text-[11px] text-gray-500">{target.ruta}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-[#912D26] font-mono">{target.hora}</div>
                      <div className="text-[10px] text-gray-400">{target.direccion}</div>
                    </div>
                  </button>
                ))
              )}
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={() => setReassigningOrder(null)}
              className="w-full mt-4 h-11 rounded-xl border-gray-300 text-gray-600 font-semibold"
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
