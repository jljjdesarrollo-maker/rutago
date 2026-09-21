'use client';

import { useState, useMemo } from 'react';
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
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { getAllBuses, getActiveBusId, getLatestBusOdometer } from '@/lib/fleet-storage';
import { saveOwnerExpense } from '@/lib/owner-expenses-storage';
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
  type EstacionServicioId,
  ESTACIONES_SERVICIO_CONFIG,
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
}

export function MantenimientoScreen({ onBack }: MantenimientoScreenProps) {
  const { toast } = useToast();

  const [activeBusId] = useState<string>(() => {
    if (typeof window === 'undefined') return 'BUS-01';
    return getActiveBusId();
  });

  // Odómetro actual del bus auditado
  const [kmActual, setKmActual] = useState<number>(() => {
    if (typeof window === 'undefined') return 187420;
    const busId = getActiveBusId();
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
    return 187420;
  });

  // Mantenimientos activos de esta unidad
  const [items, setItems] = useState<MantenimientoBusItem[]>(() => {
    if (typeof window === 'undefined') return [];
    const busId = getActiveBusId();
    const storageKey = `rg_mantenimientos_v2_${busId}`;
    const saved = localStorage.getItem(storageKey);

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error('Error parseando mantenimientos:', e);
      }
    }

    // Inicializar por defecto con los mantenimientos recomendados de la biblioteca Hino AK
    const catalogo = getCatalogoMaestroGlobal();
    const iniciales: MantenimientoBusItem[] = catalogo
      .filter(c => c.activoBiblioteca)
      .slice(0, 6)
      .map(c => ({
        id: `mbus-${c.id}-${Date.now()}`,
        catalogoId: c.id,
        codigo: c.codigo,
        nombre: c.nombre,
        categoria: c.categoria,
        intervaloKm: c.intervaloKmOficial,
        ultimoKm: Math.max(0, 187420 - Math.floor(c.intervaloKmOficial * 0.7)),
        fechaUltimo: new Date().toISOString().split('T')[0],
        costoEstimado: c.categoria === 'MOTOR' ? 120 : 45,
        repuestoDetalle: c.especificacionLubricanteRepuesto,
        asignadoChofer: c.asignadoChoferPorDefecto,
        activo: true,
      }));

    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, JSON.stringify(iniciales));
    }
    return iniciales;
  });

  // Modales
  const [editingItem, setEditingItem] = useState<MantenimientoBusItem | null>(null);
  const [newUltimoKm, setNewUltimoKm] = useState('');
  const [costoRegistro, setCostoRegistro] = useState('');
  const [tallerRegistro, setTallerRegistro] = useState('');

  const [isCatalogoModalOpen, setIsCatalogoModalOpen] = useState(false);
  const [catalogoBusqueda, setCatalogoBusqueda] = useState('');
  const [catalogoFiltroCat, setCatalogoFiltroCat] = useState('TODAS');

  // Modal de Estaciones de Servicio (Combos de Parada en Taller)
  const [estacionSeleccionada, setEstacionSeleccionada] = useState<EstacionServicioId | null>(null);
  const [estacionCodigosSeleccionados, setEstacionCodigosSeleccionados] = useState<string[]>([]);
  const [estacionKm, setEstacionKm] = useState<string>();
  const [estacionCosto, setEstacionCosto] = useState<string>();
  const [estacionTaller, setEstacionTaller] = useState<string>();
  const [estacionFactura, setEstacionFactura] = useState<string>();
  const [estacionMetodoPago, setEstacionMetodoPago] = useState<EFECTIVO | TRANSFERENCIA>(EFECTIVO);

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
    const odoNum = parseInt(comboRuedasKm, 10);
    const km = !isNaN(odoNum) && odoNum > 0 ? odoNum : kmActual;
    const today = new Date().toISOString().split('T')[0];
    const costoTotal = parseFloat(comboRuedasCosto) || 0;
    const tallerStr = comboRuedasTaller.trim() || 'Taller de Ruedas / Rulimanes';
    const facturaRef = comboRuedasFactura.trim();

    let encontradasDel = false;
    let encontradasPost = false;

    let listaActualizada = items.map(it => {
      if (it.codigo === 'MNT-BOCINAS-DEL') {
        encontradasDel = true;
        return {
          ...it,
          ultimoKm: km,
          fechaUltimo: today,
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
          fechaUltimo: today,
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
        fechaUltimo: today,
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
        fechaUltimo: today,
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
        saveOwnerExpense({
          id: `EXP-COMBO-4RUEDAS-${Date.now()}`,
          busId: activeBusId,
          expenseDate: today,
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
        });
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
    const costoNum = parseFloat(costoRegistro) || editingItem.costoEstimado || 0;

    // Detectar si el ítem tiene efecto cascada
    const cascadaCodigos = editingItem.codigo ? EFECTO_CASCADA_TRANSMISION[editingItem.codigo] : undefined;
    const itemsCascadaAfectados: string[] = [];

    const updated = items.map(it => {
      if (it.id === editingItem.id) {
        return {
          ...it,
          ultimoKm: km,
          fechaUltimo: today,
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
          fechaUltimo: today,
        };
      }
      return it;
    });

    saveItems(updated);
    if (itemsCascadaAfectados.length > 0) {
      toast({
        title: 'Mantenimiento Mayor Registrado',
        description: `${editingItem.nombre} asentado en ${km.toLocaleString()} km. Efecto cascada reseteó: ${itemsCascadaAfectados.join(', ')}.`,
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



  // Abrir Modal de Estación de Taller
  const handleAbrirEstacionModal = (estacionId: EstacionServicioId) => {
    const config = ESTACIONES_SERVICIO_CONFIG[estacionId];
    if (!config) return;

    // Pre-marcar los ítems obligatorios/por defecto
    const iniciales = config.items.filter(it => it.preMarcado).map(it => it.codigo);
    
    // Si la estación tiene cascade trigger o es MNT_MAYOR, resolver cascada
    const resueltos = resolverCascadaEstacion(iniciales);

    setEstacionSeleccionada(estacionId);
    setEstacionCodigosSeleccionados(resueltos);
    setEstacionKm(kmActual.toString());
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

    const odoNum = parseInt(estacionKm, 10);
    const kmServicio = !isNaN(odoNum) && odoNum > 0 ? odoNum : kmActual;
    const today = new Date().toISOString().split("T")[0];
    const costoTotal = parseFloat(estacionCosto) || 0;
    const tallerStr = estacionTaller.trim() || config.nombre;
    const facturaRef = estacionFactura.trim();

    const catalogo = getCatalogoMaestroGlobal();
    const mapCatalogo = new Map(catalogo.map(c => [c.codigo, c]));

    const codigosSet = new Set(estacionCodigosSeleccionados);
    const codigosExistentesEnBus = new Set(items.map(it => it.codigo));

    // 1. Actualizar ítems existentes que coincidan con los seleccionados
    const itemsActualizados = items.map(it => {
      if (it.codigo && codigosSet.has(it.codigo)) {
        return {
          ...it,
          ultimoKm: kmServicio,
          fechaUltimo: today,
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
            fechaUltimo: today,
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

    // 3. Registrar Egreso Contable Automático si se especificó costo > 0
    if (costoTotal > 0) {
      const categoriaContable = getCategoriaContablePorEstacion(estacionSeleccionada);
      const nombresRealizados = estacionCodigosSeleccionados
        .map(c => mapCatalogo.get(c)?.nombre || c)
        .slice(0, 3)
        .join(", ");

      const descripcionEgreso = `Parada en ${config.nombre}: ${nombresRealizados}${estacionCodigosSeleccionados.length > 3 ? " y más" : ""} (Km ${kmServicio.toLocaleString()})`;

      saveOwnerExpense({
        id: `exp-mnt-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        busId: activeBusId,
        expenseDate: today,
        createdAt: new Date().toISOString(),
        category: categoriaContable,
        description: descripcionEgreso,
        provider: tallerStr,
        totalAmount: costoTotal,
        paidAmount: costoTotal,
        pendingBalance: 0,
        paymentMethod: estacionMetodoPago,
        comprobanteRef: facturaRef || undefined,
        notes: `Servicio en ${config.nombre} con ${estacionCodigosSeleccionados.length} componentes atendidos. Odómetro: ${kmServicio} km.`,
      });
    }

    toast({
      title: `Servicio en ${config.nombre} Asentado`,
      description: `${estacionCodigosSeleccionados.length} componentes actualizados a ${kmServicio.toLocaleString()} km${costoTotal > 0 ? ` y $${costoTotal.toFixed(2)} registrado en egresos.` : "."}`,
    });

    setEstacionSeleccionada(null);
  };

  // Cambiar nivel de control rápido (BÁSICO 7, MEDIO 15, TOTAL 27)
  const handleCambiarNivelControl = (nuevoNivel: NivelControlMantenimiento) => {
    setNivelControl(nuevoNivel);
    saveBusNivelControl(activeBusId, nuevoNivel);

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
    saveBusItemsActivosConfig(activeBusId, nuevaConfig);

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
      const rest = it.intervaloKm - (kmActual - it.ultimoKm);
      return rest > 0 && rest <= 1000;
    }).length;
  }, [items, kmActual]);

  const buses = getAllBuses();
  const currentBus = buses.find(b => b.id === activeBusId);
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
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-amber-500 text-slate-950">
                  {currentBus ? `Bus ${currentBus.numeroDisco}` : 'Bus 01'}
                </span>
                <Badge className="bg-blue-900/80 text-blue-200 border-blue-700 text-[10px] py-0 px-2">
                  PIN 2107 Socio
                </Badge>
              </div>
              <p className="text-[11px] text-slate-300 font-medium">
                Gestión patrimonial, alertas y delegación a chofer
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => setIsCatalogoModalOpen(true)}
            className="h-9 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-sm active:scale-95"
          >
            <BookOpen className="w-4 h-4" />
            <span className="hidden sm:inline">Biblioteca</span> Hino AK
          </Button>
        </div>
      </header>

      <main className="flex-1 px-4 py-4 max-w-xl mx-auto w-full flex flex-col gap-4 pb-20">
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
                  {kmActual.toLocaleString()}
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

            <div className="flex items-center gap-2">
              <Input
                type="number"
                placeholder="Ajustar tacómetro actual..."
                defaultValue={kmActual}
                onBlur={e => handleUpdateKmActual(e.target.value)}
                className="h-9 rounded-xl bg-white/10 border-white/20 text-white text-xs placeholder:text-white/40 font-bold"
              />
              <span className="text-[11px] text-slate-300 shrink-0 font-medium">
                Calibrar lectura
              </span>
            </div>
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
              onClick={() => handleCambiarNivelControl('BASICO')}
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
              onClick={() => handleCambiarNivelControl('MEDIO')}
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
              onClick={() => handleCambiarNivelControl('TOTAL')}
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
                <button
                  key={estId}
                  type="button"
                  onClick={() => handleAbrirEstacionModal(estId)}
                  className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 active:scale-95 border border-white/10 transition-all cursor-pointer text-center group"
                >
                  <span className="text-xl mb-1 group-hover:scale-110 transition-transform">
                    {est.icono}
                  </span>
                  <span className="text-[11px] font-black text-slate-100 leading-tight">
                    {est.nombre.split(" ")[0]}
                  </span>
                  <span className="text-[9px] text-amber-400 font-semibold mt-0.5">
                    {est.items.length} ítems
                  </span>
                </button>
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


        {/* Barra de Filtros y Resumen */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setFiltroVista('TODOS')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filtroVista === 'TODOS'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              Todos ({items.length})
            </button>
            <button
              type="button"
              onClick={() => setFiltroVista('VENCIDOS')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filtroVista === 'VENCIDOS'
                  ? 'bg-rose-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              Urgentes ({totalVencidos})
            </button>
            <button
              type="button"
              onClick={() => setFiltroVista('CHOFER')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filtroVista === 'CHOFER'
                  ? 'bg-amber-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              Vista Chofer ({items.filter(i => i.asignadoChofer).length})
            </button>
          </div>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsCatalogoModalOpen(true)}
            className="h-8 text-xs font-bold text-slate-700 hover:text-slate-900 hover:bg-slate-200/60 flex items-center gap-1 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" /> Biblioteca Hino
          </Button>
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

              return (
                <Card
                  key={item.id}
                  className={`rounded-2xl border transition-all ${
                    item.codigo && itemsActivosConfig[item.codigo] === false
                      ? 'border-slate-200 bg-slate-50/70 opacity-60'
                      : esVencido
                      ? 'border-rose-300 bg-rose-50/40 shadow-xs'
                      : esUrgente
                      ? 'border-amber-300 bg-amber-50/40'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <CardContent className="p-3.5 space-y-2.5">
                    {/* Fila superior: Nombre, Categoría y Estado Semafórico */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                          {item.codigo && (
                            <span className="text-[9px] font-mono font-bold bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded">
                              {item.codigo}
                            </span>
                          )}
                          {item.categoria && (
                            <span className="text-[9px] font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                              {item.categoria.replace('_', ' ')}
                            </span>
                          )}
                          {item.asignadoChofer && (
                            <span className="text-[9px] font-extrabold bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                              <UserCheck className="w-2.5 h-2.5" /> Chofer
                            </span>
                          )}
                        </div>
                        <h4 className="font-extrabold text-sm text-gray-900 truncate">
                          {item.nombre}
                        </h4>
                        {item.repuestoDetalle && (
                          <p className="text-[11px] text-gray-500 truncate">
                            ⚙️ {item.repuestoDetalle}
                          </p>
                        )}
                      </div>

                      <span
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full shrink-0 ${
                          esVencido
                            ? 'bg-rose-600 text-white shadow-xs'
                            : esUrgente
                            ? 'bg-amber-500 text-slate-950 font-extrabold'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {esVencido ? '¡Cambio Urgente!' : esUrgente ? 'Próximo' : 'Normal'}
                      </span>
                    </div>

                    {/* Barra de Progreso de Odómetro */}
                    <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          esVencido ? 'bg-rose-600' : esUrgente ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${porcentaje}%` }}
                      />
                    </div>

                    {/* Kilometraje y Fechas */}
                    <div className="flex items-center justify-between text-xs pt-0.5">
                      <span className="font-medium text-gray-600">
                        {esVencido ? (
                          <span className="text-rose-700 font-extrabold">
                            Excedido por {Math.abs(kmRestantes).toLocaleString()} km
                          </span>
                        ) : (
                          <span>
                            Faltan <strong>{kmRestantes.toLocaleString()} km</strong>
                          </span>
                        )}
                        <span className="text-gray-400 text-[10px] ml-1.5">
                          (Último: {item.ultimoKm.toLocaleString()} km)
                        </span>
                      </span>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingItem(item);
                          setNewUltimoKm(kmActual.toString());
                          setCostoRegistro(item.costoEstimado ? item.costoEstimado.toString() : '');
                          setTallerRegistro(item.tallerMecanico || '');
                        }}
                        className="h-8 px-2.5 rounded-xl border-gray-300 text-xs font-bold text-gray-800 hover:bg-slate-100 active:scale-95"
                      >
                        <RotateCcw className="w-3 h-3 mr-1 text-gray-500" />
                        Registrar Cambio
                      </Button>
                    </div>

                    {/* Controles para el Socio: Ajustar Intervalo, Toggle Chofer y Eliminar */}
                    <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 font-medium">Cada:</span>
                        <div className="relative">
                          <Input
                            type="number"
                            step="500"
                            defaultValue={item.intervaloKm}
                            onBlur={e => {
                              const val = parseInt(e.target.value, 10);
                              if (!isNaN(val) && val > 0 && val !== item.intervaloKm) {
                                const upd = items.map(it =>
                                  it.id === item.id ? { ...it, intervaloKm: val } : it
                                );
                                saveItems(upd);
                                toast({
                                  title: 'Intervalo Personalizado',
                                  description: `Nuevo intervalo de ${val.toLocaleString()} km para ${item.nombre}`,
                                });
                              }
                            }}
                            className="h-7 w-20 text-right pr-6 text-xs font-bold border-gray-200 bg-gray-50 rounded"
                          />
                          <span className="absolute right-1.5 top-1.5 text-[9px] text-gray-400 font-bold">
                            km
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {/* Switch ON/OFF del ítem para el Socio */}
                        {item.codigo && (
                          <div className="flex items-center gap-1.5" title="Activar o pausar este mantenimiento para esta unidad">
                            <span className={`text-[10px] font-bold ${(itemsActivosConfig[item.codigo] ?? true) ? 'text-emerald-700' : 'text-slate-400'}`}>
                              {(itemsActivosConfig[item.codigo] ?? true) ? 'Activo' : 'Pausado'}
                            </span>
                            <Switch
                              checked={itemsActivosConfig[item.codigo] ?? true}
                              onCheckedChange={checked => handleToggleItemActivo(item.codigo!, checked, item.nombre)}
                              className="data-[state=checked]:bg-emerald-600 scale-75"
                            />
                          </div>
                        )}
                        <div className="flex items-center gap-1.5" title="Mostrar en la vista de cabina del chofer">
                          <span className="text-[10px] font-bold text-amber-900">Chofer</span>
                          <Switch
                            checked={item.asignadoChofer}
                            onCheckedChange={checked => handleToggleChofer(item.id, checked)}
                            className="data-[state=checked]:bg-amber-600 scale-75"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => handleEliminarDelBus(item.id, item.nombre)}
                          className="text-gray-400 hover:text-red-600 transition-colors p-1"
                          title="Remover de este bus"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
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
              
              {/* Header Modal Estación */}
              <div className="flex items-center justify-between border-b pb-3 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-slate-900 flex items-center justify-center text-xl shadow-xs">
                    {config.icono}
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 leading-tight">
                      Estación: {config.nombre}
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium">
                      {config.subtitulo}
                    </p>
                  </div>
                </div>
                <Badge className="bg-slate-900 text-amber-400 text-[10px] font-black border-0">
                  {totalSeleccionados}/{totalItemsEstacion} marcados
                </Badge>
              </div>

              {/* Contenido con scroll táctil */}
              <div className="space-y-4 flex-1 overflow-y-auto pr-1">
                
                {/* Selector de Ítems / Checklist */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-black text-slate-900 uppercase tracking-wider">
                      Componentes Atendidos en esta Parada
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (totalSeleccionados === totalItemsEstacion) {
                          setEstacionCodigosSeleccionados([]);
                        } else {
                          setEstacionCodigosSeleccionados(config.items.map(it => it.codigo));
                        }
                      }}
                      className="text-[10px] font-bold text-blue-600 hover:text-blue-800 cursor-pointer"
                    >
                      {totalSeleccionados === totalItemsEstacion ? "Desmarcar todos" : "Marcar todos"}
                    </button>
                  </div>

                  <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto p-1 bg-slate-50 rounded-2xl border border-slate-200">
                    {config.items.map(it => {
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
                              <span>Ciclo: {it.intervaloKm.toLocaleString()} km</span>
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
                      Odómetro / Tacómetro (Km)
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

                <div>
                  <Label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Método de Pago
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

                {/* Resumen Contable y Cascada */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] text-slate-600 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    Asentamiento de Datos:
                  </div>
                  <p>• Resetea {totalSeleccionados} componentes con el kilometraje ingresado.</p>
                  <p>
                    • Se asienta contablemente en <strong>{getCategoriaContablePorEstacion(estacionSeleccionada)}</strong> en tus egresos de socio.
                  </p>
                </div>
              </div>

              {/* Botones de Acción */}
              <div className="flex items-center gap-2 pt-2 border-t shrink-0">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setEstacionSeleccionada(null)}
                  className="flex-1 h-10 rounded-xl text-xs font-bold text-gray-600 cursor-pointer"
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={handleGuardarEstacionServicio}
                  className="flex-1 h-10 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-4 h-4 text-amber-400" />
                  Asentar en {config.nombre.split(" ")[0]}
                </Button>
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
              <div>
                <Label className="text-xs font-bold text-gray-700 block mb-1">
                  Kilometraje del Odómetro al Realizar el Cambio *
                </Label>
                <Input
                  type="number"
                  value={newUltimoKm}
                  onChange={e => setNewUltimoKm(e.target.value)}
                  className="h-10 rounded-xl text-sm font-black bg-slate-50"
                />
              </div>

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
                    Odómetro del Servicio (Km)
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
              <Button
                type="button"
                onClick={handleGuardarCombo4Ruedas}
                className="flex-1 h-10 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                Asentar Combo 4 Ruedas
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
