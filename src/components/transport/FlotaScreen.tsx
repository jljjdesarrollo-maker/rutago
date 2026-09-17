'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ArrowLeft,
  Bus,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  Search,
  SlidersHorizontal,
  Info,
  ShieldCheck,
  AlertTriangle,
  RotateCw,
  Sparkles,
  Layers,
  Route,
  User,
  Hash,
  Award,
  Lock,
  Gauge,
  Calendar,
  Ticket,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { BusItem, BusFormData, TipoOperacionBus } from '@/types/fleet';
import { type PromoViajeGratisConfig, loadPromoConfig, savePromoConfig, DEFAULT_PROMO_CONFIG } from './types-boletos';
import {
  getAllBuses,
  saveBus,
  deleteBus,
  fetchBusesFromApi,
  saveBusToApi,
  updateBusInApi,
  deleteBusFromApi,
  seedBenchmarkFleet,
  INITIAL_PILOT_BUS,
  getActiveBusId,
} from '@/lib/fleet-storage';

interface FlotaScreenProps {
  currentUser?: { id: string; nombre: string; rol: string } | null;
  onBack: () => void;
}

const EMPTY_FORM: BusFormData = {
  numeroDisco: '',
  placa: '',
  marca: 'Hino AK',
  modelo: 'AK',
  anio: new Date().getFullYear(),
  capacidadAsientos: 45,
  propietario: '',
  tipoOperacion: 'TRONCAL_VT',
  activo: true,
  notas: '',
  promoConfig: { ...DEFAULT_PROMO_CONFIG },
};

export function FlotaScreen({ currentUser, onBack }: FlotaScreenProps) {
  // Detección estricta de Rol: SuperAdmin SaaS (9999) vs Socio Propietario (0101 / 2107)
  const isSuperAdmin = currentUser?.rol === 'SUPERADMIN_SAAS' || currentUser?.id === 'saas-superadmin';
  const activeBusId = getActiveBusId() || 'BUS-01';

  const [buses, setBuses] = useState<BusItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTipo, setFilterTipo] = useState<'TODOS' | 'TRONCAL_VT' | 'ALIMENTADOR_P'>('TODOS');

  // Estado del formulario modal / bottom sheet
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<BusFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Modal de confirmación de eliminación
  const [busToDelete, setBusToDelete] = useState<BusItem | null>(null);

  const { toast } = useToast();

  // Carga inicial (offline-first con refresh en segundo plano)
  const loadFleet = useCallback(async () => {
    // 1. Carga inmediata desde almacenamiento local
    const local = getAllBuses();
    setBuses(local);
    setLoading(false);

    // 2. Consulta asíncrona a la API central si hay conexión
    if (typeof window !== 'undefined' && navigator.onLine) {
      setSyncing(true);
      try {
        const remote = await fetchBusesFromApi();
        if (remote && remote.length > 0) {
          setBuses(remote);
        }
      } catch {
        /* fallback silencioso a local */
      } finally {
        setSyncing(false);
      }
    }
  }, []);

  useEffect(() => {
    loadFleet();
  }, [loadFleet]);

  // Lista de buses accesible según rol
  // Si es SOCIO: Se filtra EXCLUSIVAMENTE a su unidad propia activa para garantizar confidencialidad
  const accessibleBuses = useMemo(() => {
    if (isSuperAdmin) {
      return buses;
    }
    // Para el socio, buscar su bus activo (por id o por numeroDisco)
    const myBus = buses.find((b) => b.id === activeBusId || b.numeroDisco === activeBusId.replace('BUS-', ''))
      || buses.find((b) => b.id === 'BUS-01')
      || INITIAL_PILOT_BUS;

    return myBus ? [myBus] : [];
  }, [buses, isSuperAdmin, activeBusId]);

  // Filtrado reactivo en memoria (búsqueda de texto)
  const filteredBuses = useMemo(() => {
    return accessibleBuses.filter((bus) => {
      // Filtro de tipo
      if (filterTipo !== 'TODOS' && bus.tipoOperacion !== filterTipo) {
        return false;
      }
      // Búsqueda por disco, placa, propietario o marca
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        bus.numeroDisco.toLowerCase().includes(q) ||
        bus.placa.toLowerCase().includes(q) ||
        bus.propietario.toLowerCase().includes(q) ||
        bus.marca.toLowerCase().includes(q) ||
        (bus.modelo && bus.modelo.toLowerCase().includes(q))
      );
    });
  }, [accessibleBuses, filterTipo, searchQuery]);

  // Contadores analíticos
  const stats = useMemo(() => {
    const total = buses.length;
    const troncal = buses.filter((b) => b.tipoOperacion === 'TRONCAL_VT').length;
    const alimentador = buses.filter((b) => b.tipoOperacion === 'ALIMENTADOR_P').length;
    const activos = buses.filter((b) => b.activo).length;
    return { total, troncal, alimentador, activos };
  }, [buses]);

  // Abrir formulario para crear nueva unidad (SOLO SuperAdmin)
  const handleOpenCreate = () => {
    if (!isSuperAdmin) {
      toast({
        title: 'Acción Restringida',
        description: 'Solo la administración de la cooperativa o soporte SaaS puede dar de alta nuevos buses.',
        variant: 'destructive',
      });
      return;
    }
    setEditingId(null);
    setFormData({
      ...EMPTY_FORM,
      anio: new Date().getFullYear(),
      promoConfig: { ...DEFAULT_PROMO_CONFIG },
    });
    setSheetOpen(true);
  };

  // Abrir formulario para editar (SuperAdmin edita todo; Socio edita solo su unidad)
  const handleOpenEdit = (bus: BusItem) => {
    const bId = bus.id || `BUS-${bus.numeroDisco}`;
    const busPromo = bus.promoConfig || loadPromoConfig(bId);
    setEditingId(bId);
    setFormData({
      numeroDisco: bus.numeroDisco,
      placa: bus.placa,
      marca: bus.marca,
      modelo: bus.modelo || '',
      anio: bus.anio || '',
      capacidadAsientos: bus.capacidadAsientos || 45,
      propietario: bus.propietario,
      tipoOperacion: bus.tipoOperacion,
      activo: bus.activo !== false,
      notas: bus.notas || '',
      promoConfig: busPromo,
    });
    setSheetOpen(true);
  };

  // Toggle rápido de promoción en tarjeta
  const handleTogglePromo = (bus: BusItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const bId = bus.id || `BUS-${bus.numeroDisco}`;
    const currentPromo = bus.promoConfig || loadPromoConfig(bId);
    const updatedPromo: PromoViajeGratisConfig = {
      ...currentPromo,
      activa: !currentPromo.activa,
    };
    savePromoConfig(updatedPromo, bId);
    const updatedBus: BusItem = {
      ...bus,
      promoConfig: updatedPromo,
    };
    const updatedLocal = saveBus(updatedBus);
    setBuses(updatedLocal);
    toast({
      title: updatedPromo.activa ? 'Promoción activada' : 'Promoción pausada',
      description: `Viaje Gratis en Disco ${bus.numeroDisco} ahora está ${updatedPromo.activa ? 'ACTIVO' : 'INACTIVO'}.`,
    });
  };

  // Guardar unidad (creación o actualización)
  const handleSave = async () => {
    if (!formData.numeroDisco.trim()) {
      toast({
        title: 'Falta el número de disco',
        description: 'Ingresa el número de unidad (ej. 01, 16, 19).',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.placa.trim()) {
      toast({
        title: 'Falta la placa',
        description: 'Ingresa la placa vehicular (ej. TAA-5152).',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.propietario.trim()) {
      toast({
        title: 'Falta el propietario',
        description: 'Ingresa el nombre del socio o cooperativa propietaria.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    const cleanDisco = formData.numeroDisco.trim().padStart(2, '0');
    const cleanPlaca = formData.placa.trim().toUpperCase();

    // Si es socio, preservar el circuito original que dictaminó la cooperativa
    let tipoFinal = formData.tipoOperacion;
    if (!isSuperAdmin && editingId) {
      const existing = buses.find((b) => b.id === editingId || b.numeroDisco === cleanDisco);
      if (existing) {
        tipoFinal = existing.tipoOperacion;
      }
    }

    const busPayload: BusItem = {
      id: editingId || `BUS-${cleanDisco}`,
      numeroDisco: cleanDisco,
      placa: cleanPlaca,
      marca: formData.marca.trim() || 'Hino AK',
      modelo: formData.modelo?.trim() || 'AK',
      anio: formData.anio ? Number(formData.anio) : undefined,
      capacidadAsientos: Number(formData.capacidadAsientos) || 45,
      propietario: formData.propietario.trim(),
      tipoOperacion: tipoFinal,
      activo: formData.activo,
      notas: formData.notas?.trim() || undefined,
      promoConfig: formData.promoConfig || DEFAULT_PROMO_CONFIG,
    };
    if (formData.promoConfig) {
      savePromoConfig(formData.promoConfig, `BUS-${cleanDisco}`);
    }

    try {
      // 1. Guardado local inmediato (offline-first)
      const updatedLocal = saveBus(busPayload);
      setBuses(updatedLocal);

      // 2. Sincronización con backend si hay red
      if (typeof window !== 'undefined' && navigator.onLine) {
        if (editingId) {
          await updateBusInApi(busPayload);
        } else {
          await saveBusToApi(busPayload);
        }
      }

      toast({
        title: editingId ? 'Ficha actualizada' : 'Unidad registrada',
        description: `Se guardaron correctamente los datos del Disco ${cleanDisco} (${cleanPlaca}).`,
      });

      setSheetOpen(false);
    } catch {
      toast({
        title: 'Guardado local completado',
        description: 'Los cambios se aplicaron en tu dispositivo y se sincronizarán al detectar conexión.',
      });
      setSheetOpen(false);
    } finally {
      setSaving(false);
    }
  };

  // Eliminar unidad (SOLO SuperAdmin)
  const handleConfirmDelete = async () => {
    if (!busToDelete) return;
    if (!isSuperAdmin) {
      toast({
        title: 'Operación denegada',
        description: 'Los socios no tienen autorización para retirar buses de la cooperativa.',
        variant: 'destructive',
      });
      setBusToDelete(null);
      return;
    }

    const disco = busToDelete.numeroDisco;
    try {
      // 1. Eliminación local
      const updatedLocal = deleteBus(busToDelete.id || `BUS-${disco}`);
      setBuses(updatedLocal);

      // 2. Eliminación remota
      if (typeof window !== 'undefined' && navigator.onLine) {
        await deleteBusFromApi(busToDelete.id || `BUS-${disco}`);
      }

      toast({
        title: 'Unidad eliminada',
        description: `Se retiró el Disco ${disco} de la flota activa.`,
      });
    } catch {
      toast({
        title: 'Error al eliminar',
        description: 'No se pudo eliminar la unidad.',
        variant: 'destructive',
      });
    } finally {
      setBusToDelete(null);
    }
  };

  // Cargar Benchmark de 19 unidades de la Cooperativa (SuperAdmin)
  const handleLoadBenchmark = () => {
    const updated = seedBenchmarkFleet();
    setBuses(updated);
    toast({
      title: 'Flota Benchmark cargada',
      description: `Se sincronizaron ${updated.length} unidades de referencia de la cooperativa.`,
    });
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7] pb-28">
      {/* ─── ENCABEZADO SUPERIOR FIJO ─── */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-gray-200 px-4 py-3 shadow-xs">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="w-10 h-10 rounded-xl bg-gray-100 active:bg-gray-200 text-gray-700 flex items-center justify-center transition-colors"
              aria-label="Volver"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-lg font-black text-[#3A3A3A] leading-tight flex items-center gap-1.5">
                <Bus className="w-5 h-5 text-[#912D26]" />
                {isSuperAdmin ? 'Gestión de Flota' : 'Ficha de Mi Unidad'}
              </h1>
              <p className="text-xs text-gray-500 font-medium">
                {isSuperAdmin
                  ? 'Catálogo maestro de 19 unidades físicas y circuitos'
                  : 'Ficha técnica, placas y especificaciones de tu vehículo'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadFleet}
              disabled={syncing}
              className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition-colors"
              title="Refrescar datos"
            >
              <RotateCw className={`w-4 h-4 ${syncing ? 'animate-spin text-[#912D26]' : ''}`} />
            </button>
            {isSuperAdmin ? (
              <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200 font-bold text-xs">
                {stats.activos} / {stats.total} Activos
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-200 font-bold text-xs">
                Socio Titular
              </Badge>
            )}
          </div>
        </div>
      </header>

      {/* ─── CONTENIDO PRINCIPAL ─── */}
      <main className="max-w-2xl mx-auto px-4 pt-4 space-y-4">
        {/* ─── BANNER EXPLICATIVO SEGÚN ROL ─── */}
        {isSuperAdmin ? (
          <div className="bg-gradient-to-r from-[#912D26]/10 via-amber-50 to-emerald-50/70 border border-[#912D26]/20 rounded-2xl p-3.5 shadow-xs">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#912D26] text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="flex-1 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-black text-[#912D26] uppercase tracking-wider text-[11px]">
                    Directiva Operativa: Política Zero-Locking
                  </span>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded-full">
                    Sin Bloqueos
                  </span>
                </div>
                <p className="text-gray-700 leading-relaxed text-[11px]">
                  <strong>Unidad Física ≠ Vuelta Turno (VT):</strong> Un bus Hino AK puede operar cualquier VT del día. Cambiar el autobús no bloquea la frecuencia ni interrumpe el despacho en carretera.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-3.5 shadow-xs">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-700 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="flex-1 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-black text-blue-900 uppercase tracking-wider text-[11px]">
                    Privacidad y Control de tu Patrimonio
                  </span>
                  <span className="text-[10px] font-bold text-blue-800 bg-blue-100 px-2 py-0.5 rounded-full">
                    Tu Unidad Aislada
                  </span>
                </div>
                <p className="text-blue-900/90 leading-relaxed text-[11px]">
                  Como socio propietario, puedes mantener actualizados los datos de tu autobús (placa, modelo, notas mecánicas). La asignación de circuito general y los datos de otros 18 socios se mantienen protegidos bajo el protocolo de confidencialidad gremial.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ─── RESUMEN DE LA FLOTA (SOLO SUPERADMIN) ─── */}
        {isSuperAdmin && (
          <div className="grid grid-cols-3 gap-2.5">
            <Card className="rounded-2xl border border-gray-200 bg-white shadow-xs">
              <CardContent className="p-3 text-center">
                <span className="text-[10px] uppercase font-bold text-gray-400 block">Total Flota</span>
                <span className="text-xl font-black text-[#3A3A3A]">{stats.total}</span>
                <span className="text-[10px] text-gray-500 block">Autobuses</span>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border border-emerald-200 bg-emerald-50/50 shadow-xs">
              <CardContent className="p-3 text-center">
                <span className="text-[10px] uppercase font-bold text-emerald-800 block">Troncal VT</span>
                <span className="text-xl font-black text-emerald-900">{stats.troncal}</span>
                <span className="text-[10px] text-emerald-700 block">45 Asientos</span>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border border-blue-200 bg-blue-50/50 shadow-xs">
              <CardContent className="p-3 text-center">
                <span className="text-[10px] uppercase font-bold text-blue-800 block">Alimentadores</span>
                <span className="text-xl font-black text-blue-900">{stats.alimentador}</span>
                <span className="text-[10px] text-blue-700 block">28 Asientos</span>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ─── BUSCADOR Y FILTROS DE CIRCUITO (SOLO SUPERADMIN CON MÁS DE 1 BUS) ─── */}
        {isSuperAdmin && (
          <div className="space-y-2.5">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                type="text"
                placeholder="Buscar por disco (ej. 01), placa (TAA-5152) o socio..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-9 h-11 rounded-2xl bg-white border-gray-200 text-xs shadow-xs focus-visible:ring-[#912D26]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1 bg-gray-200/70 p-1 rounded-2xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setFilterTipo('TODOS')}
                className={`flex-1 py-1.5 rounded-xl transition-all ${
                  filterTipo === 'TODOS'
                    ? 'bg-white text-[#912D26] shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Todos ({stats.total})
              </button>
              <button
                type="button"
                onClick={() => setFilterTipo('TRONCAL_VT')}
                className={`flex-1 py-1.5 rounded-xl transition-all ${
                  filterTipo === 'TRONCAL_VT'
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Troncal ({stats.troncal})
              </button>
              <button
                type="button"
                onClick={() => setFilterTipo('ALIMENTADOR_P')}
                className={`flex-1 py-1.5 rounded-xl transition-all ${
                  filterTipo === 'ALIMENTADOR_P'
                    ? 'bg-white text-blue-800 shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Alimentador ({stats.alimentador})
              </button>
            </div>
          </div>
        )}

        {/* ─── LISTADO DE AUTOBUSES / FICHA DE LA UNIDAD ─── */}
        <div className="space-y-2.5">
          {loading ? (
            <div className="text-center py-12 text-gray-400 text-xs space-y-2">
              <RotateCw className="w-6 h-6 animate-spin mx-auto text-[#912D26]" />
              <p>Cargando información del autobús...</p>
            </div>
          ) : filteredBuses.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-3xl p-8 text-center space-y-3 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto text-gray-400">
                <Bus className="w-6 h-6" />
              </div>
              <div>
                <p className="font-black text-sm text-gray-800">No se encontraron unidades</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {searchQuery ? 'Prueba con otro término de búsqueda.' : 'No hay autobuses configurados aún.'}
                </p>
              </div>
              {isSuperAdmin && (
                <Button
                  onClick={handleLoadBenchmark}
                  variant="outline"
                  className="rounded-2xl text-xs font-bold gap-1.5"
                >
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  Cargar 19 Buses de Vilcabambaturis
                </Button>
              )}
            </div>
          ) : (
            filteredBuses.map((bus) => {
              const isTroncal = bus.tipoOperacion === 'TRONCAL_VT';
              const isPilot = bus.numeroDisco === '01';

              return (
                <Card
                  key={bus.id || bus.numeroDisco}
                  className={`rounded-2xl border transition-all overflow-hidden ${
                    isPilot
                      ? 'border-blue-400/80 bg-white shadow-xs ring-2 ring-blue-400/20'
                      : 'border-gray-200 bg-white shadow-xs hover:border-gray-300'
                  }`}
                >
                  <CardContent className="p-4 space-y-3">
                    {/* Fila Superior: Disco, Placa y Acciones */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center font-black ${
                            isTroncal
                              ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                              : 'bg-blue-100 text-blue-900 border border-blue-200'
                          }`}
                        >
                          <span className="text-[9px] uppercase tracking-wider font-bold opacity-75">Disco</span>
                          <span className="text-base leading-none font-black">{bus.numeroDisco}</span>
                        </div>

                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-black text-sm text-gray-900 tracking-wider">
                              {bus.placa}
                            </span>
                            {isPilot && (
                              <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 flex items-center gap-0.5">
                                <Award className="w-3 h-3 text-blue-600" />
                                {isSuperAdmin ? 'Piloto Líder' : 'Tu Unidad'}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-600 font-medium">
                            {bus.marca} {bus.modelo || ''} {bus.anio ? `(${bus.anio})` : ''}
                          </p>
                        </div>
                      </div>

                      {/* Botón de edición adaptado por Rol */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleOpenEdit(bus)}
                          className="px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-700 flex items-center gap-1.5 text-xs font-bold transition-colors"
                          title="Actualizar datos de la unidad"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span>Editar Ficha</span>
                        </button>
                        {isSuperAdmin && !isPilot && (
                          <button
                            onClick={() => setBusToDelete(bus)}
                            className="w-9 h-9 rounded-xl bg-red-50 hover:bg-red-100 active:bg-red-200 text-red-600 flex items-center justify-center transition-colors"
                            title="Eliminar unidad"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Fila Media: Propietario y Capacidad */}
                    <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-gray-100">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-gray-400 block">Socio Propietario</span>
                        <span className="font-semibold text-gray-800 truncate block">
                          {bus.propietario || 'No asignado'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-gray-400 block">Capacidad Homologada</span>
                        <span className="font-semibold text-gray-800 block">
                          {bus.capacidadAsientos} Asientos
                        </span>
                      </div>
                    </div>

                    {/* Fila Inferior: Circuito Operativo Asignado */}
                    <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs">
                      <div className="flex items-center gap-1.5">
                        {isTroncal ? (
                          <Badge className="bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 font-bold text-[11px] gap-1 py-0.5">
                            <Route className="w-3 h-3 text-emerald-600" />
                            Ruta General Troncal (45 Pax)
                          </Badge>
                        ) : (
                          <Badge className="bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100 font-bold text-[11px] gap-1 py-0.5">
                            <Layers className="w-3 h-3 text-blue-600" />
                            Ruta Exclusiva Alimentador (28 Pax)
                          </Badge>
                        )}
                        {!isSuperAdmin && (
                          <span className="text-[10px] text-gray-400 flex items-center gap-0.5" title="Asignado por la Cooperativa">
                            <Lock className="w-2.5 h-2.5" />
                            Circuito Oficial
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-medium text-gray-500">
                        {bus.activo ? '● En Servicio' : '○ Taller / Reposo'}
                      </span>
                    </div>

                    {/* Bloque Promoción Viaje Gratis Desacoplada */}
                    {(() => {
                      const busPromo = bus.promoConfig || loadPromoConfig(bus.id || `BUS-${bus.numeroDisco}`);
                      return (
                        <div className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition-colors ${
                          busPromo.activa 
                            ? 'bg-amber-50/70 border-amber-200 text-amber-900' 
                            : 'bg-gray-50 border-gray-100 text-gray-500'
                        }`}>
                          <div className="flex items-center gap-2">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                              busPromo.activa ? 'bg-amber-100 text-amber-700' : 'bg-gray-200 text-gray-400'
                            }`}>
                              <Ticket className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-[11px]">Boleto Premiado (Viaje Gratis)</span>
                                <Badge className={busPromo.activa ? 'bg-amber-200 text-amber-900 text-[9px] py-0 px-1' : 'bg-gray-200 text-gray-600 text-[9px] py-0 px-1'}>
                                  {busPromo.activa ? 'ACTIVO' : 'PAUSADO'}
                                </Badge>
                              </div>
                              <span className="text-[10px] text-gray-500 block">
                                {busPromo.activa 
                                  ? `Rango: pasajero ${busPromo.rangoMin} al ${busPromo.rangoMax} • Pie: "${busPromo.textoPublicidad || 'RutaGo'}"`
                                  : 'Promoción inactiva en este autobús'}
                              </span>
                            </div>
                          </div>
                          <Switch
                            checked={busPromo.activa}
                            onClick={(e) => handleTogglePromo(bus, e)}
                          />
                        </div>
                      );
                    })()}

                    {bus.notas && (
                      <p className="text-[11px] text-gray-600 bg-gray-50 p-2 rounded-xl italic border border-gray-100">
                        <strong>Observaciones:</strong> {bus.notas}
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* ─── BOTÓN SECUNDARIO: CARGAR BENCHMARK DE FLOTA (SOLO SUPERADMIN) ─── */}
        {isSuperAdmin && buses.length < 5 && (
          <div className="pt-2">
            <button
              onClick={handleLoadBenchmark}
              className="w-full py-3 px-4 rounded-2xl bg-white border border-dashed border-gray-300 hover:border-gray-400 text-gray-700 text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-2xs"
            >
              <Sparkles className="w-4 h-4 text-amber-600" />
              Cargar Flota Benchmark de Referencia (19 Unidades de la Cooperativa)
            </button>
          </div>
        )}
      </main>

      {/* ─── BARRA INFERIOR FIJA CON BOTÓN PRINCIPAL (SOLO SUPERADMIN PARA ALTA DE BUSES) ─── */}
      {isSuperAdmin && (
        <div className="fixed bottom-0 left-0 right-0 z-20 bg-white/95 backdrop-blur border-t border-gray-200 p-3 shadow-lg">
          <div className="max-w-2xl mx-auto">
            <Button
              onClick={handleOpenCreate}
              className="w-full h-12 rounded-2xl bg-[#912D26] hover:bg-[#7A2520] active:scale-[0.99] text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-transform"
            >
              <Plus className="w-5 h-5" />
              Registrar Nueva Unidad Física
            </Button>
          </div>
        </div>
      )}

      {/* ─── MODAL / BOTTOM SHEET DE FORMULARIO DE EDICIÓN O CREACIÓN ─── */}
      {sheetOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom-6 sm:slide-in-from-bottom-2 duration-200">
            {/* Cabecera del modal */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-[#F5F5F7]">
              <div>
                <h3 className="font-black text-sm text-gray-900 flex items-center gap-2">
                  <Bus className="w-4 h-4 text-[#912D26]" />
                  {editingId
                    ? isSuperAdmin
                      ? `Editar Bus Disco ${formData.numeroDisco}`
                      : `Ficha Técnica: Bus ${formData.numeroDisco}`
                    : 'Registrar Nueva Unidad'}
                </h3>
                <p className="text-[11px] text-gray-500">
                  {editingId
                    ? isSuperAdmin
                      ? 'Actualiza los parámetros mecánicos y operativos'
                      : 'Actualiza los datos técnicos de tu propio autobús'
                    : 'Da de alta un autobús en el padrón de la cooperativa'}
                </p>
              </div>
              <button
                onClick={() => setSheetOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-200/80 hover:bg-gray-300 text-gray-600 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Contenido del formulario con scroll */}
            <div className="p-4 overflow-y-auto space-y-3.5 flex-1 text-xs">
              {/* Asignación de Circuito Operativo (SUPERADMIN: Seleccionable | SOCIO: Solo Lectura Bloqueado) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-gray-700">Circuito Operativo Asignado</Label>
                  {!isSuperAdmin && (
                    <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                      <Lock className="w-2.5 h-2.5" /> Oficial Cooperativa
                    </span>
                  )}
                </div>

                {isSuperAdmin ? (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, tipoOperacion: 'TRONCAL_VT', capacidadAsientos: 45 }))}
                      className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                        formData.tipoOperacion === 'TRONCAL_VT'
                          ? 'border-emerald-500 bg-emerald-50/80 shadow-xs ring-2 ring-emerald-500/20'
                          : 'border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-600'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <Route className="w-4 h-4 text-emerald-700" />
                        {formData.tipoOperacion === 'TRONCAL_VT' && <Check className="w-4 h-4 text-emerald-700" />}
                      </div>
                      <span className="font-bold text-xs text-gray-900 block">Ruta General</span>
                      <span className="text-[10px] text-gray-500 block">Troncal VT (45 Pax)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, tipoOperacion: 'ALIMENTADOR_P', capacidadAsientos: 28 }))}
                      className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                        formData.tipoOperacion === 'ALIMENTADOR_P'
                          ? 'border-blue-500 bg-blue-50/80 shadow-xs ring-2 ring-blue-500/20'
                          : 'border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-600'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <Layers className="w-4 h-4 text-blue-700" />
                        {formData.tipoOperacion === 'ALIMENTADOR_P' && <Check className="w-4 h-4 text-blue-700" />}
                      </div>
                      <span className="font-bold text-xs text-gray-900 block">Ruta Exclusiva</span>
                      <span className="text-[10px] text-gray-500 block">Alimentadores (28 Pax)</span>
                    </button>
                  </div>
                ) : (
                  <div className="p-3 bg-gray-100 rounded-2xl border border-gray-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {formData.tipoOperacion === 'TRONCAL_VT' ? (
                        <Route className="w-4 h-4 text-emerald-700" />
                      ) : (
                        <Layers className="w-4 h-4 text-blue-700" />
                      )}
                      <div>
                        <span className="font-bold text-xs text-gray-800 block">
                          {formData.tipoOperacion === 'TRONCAL_VT'
                            ? 'Ruta General (Troncal VT - 45 Pax)'
                            : 'Ruta Exclusiva (Alimentador P - 28 Pax)'}
                        </span>
                        <span className="text-[10px] text-gray-500">
                          Dictaminado por la cooperativa para el cálculo equitativo de IPF.
                        </span>
                      </div>
                    </div>
                    <Lock className="w-4 h-4 text-gray-400" />
                  </div>
                )}
              </div>

              {/* Número de Disco y Placa Vehicular */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-gray-700">Número de Disco *</Label>
                  <Input
                    type="text"
                    maxLength={3}
                    placeholder="ej. 01, 16, 19"
                    value={formData.numeroDisco}
                    disabled={!isSuperAdmin}
                    onChange={(e) => setFormData((prev) => ({ ...prev, numeroDisco: e.target.value.replace(/\D/g, '') }))}
                    className={`h-11 rounded-xl text-base font-black text-center ${
                      !isSuperAdmin ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : ''
                    }`}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold text-gray-700">Placa Vehicular *</Label>
                  <Input
                    type="text"
                    maxLength={8}
                    placeholder="TAA-5152"
                    value={formData.placa}
                    onChange={(e) => setFormData((prev) => ({ ...prev, placa: e.target.value.toUpperCase() }))}
                    className="h-11 rounded-xl text-base font-mono font-bold text-center tracking-wider"
                  />
                </div>
              </div>

              {/* Marca y Modelo */}
              <div className="space-y-1">
                <Label className="text-xs font-bold text-gray-700">Marca del Chasis</Label>
                <div className="flex items-center gap-1.5 mb-1.5 overflow-x-auto pb-0.5">
                  {['Hino AK', 'Hino FC', 'Mercedes-Benz', 'Volkswagen'].map((marcaChip) => (
                    <button
                      key={marcaChip}
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, marca: marcaChip }))}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                        formData.marca === marcaChip
                          ? 'bg-[#912D26] text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {marcaChip}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    type="text"
                    placeholder="Marca (ej. Hino AK)"
                    value={formData.marca}
                    onChange={(e) => setFormData((prev) => ({ ...prev, marca: e.target.value }))}
                    className="h-11 rounded-xl text-sm"
                  />
                  <Input
                    type="text"
                    placeholder="Modelo (ej. AK, FC)"
                    value={formData.modelo}
                    onChange={(e) => setFormData((prev) => ({ ...prev, modelo: e.target.value }))}
                    className="h-11 rounded-xl text-sm"
                  />
                </div>
              </div>

              {/* Capacidad y Año de Fabricación */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-gray-700">Capacidad Asientos</Label>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      min={10}
                      max={70}
                      value={formData.capacidadAsientos}
                      disabled={!isSuperAdmin}
                      onChange={(e) => setFormData((prev) => ({ ...prev, capacidadAsientos: Number(e.target.value) }))}
                      className={`h-11 rounded-xl text-sm font-bold text-center ${
                        !isSuperAdmin ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : ''
                      }`}
                    />
                    {isSuperAdmin && (
                      <div className="flex flex-col gap-1">
                        <button
                          type="button"
                          onClick={() => setFormData((prev) => ({ ...prev, capacidadAsientos: 45 }))}
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100 hover:bg-gray-200"
                        >
                          45p
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData((prev) => ({ ...prev, capacidadAsientos: 28 }))}
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100 hover:bg-gray-200"
                        >
                          28p
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold text-gray-700">Año Fabricación</Label>
                  <Input
                    type="number"
                    min={1990}
                    max={2030}
                    placeholder="2022"
                    value={formData.anio}
                    onChange={(e) => setFormData((prev) => ({ ...prev, anio: e.target.value ? Number(e.target.value) : '' }))}
                    className="h-11 rounded-xl text-sm text-center"
                  />
                </div>
              </div>

              {/* Propietario / Socio */}
              <div className="space-y-1">
                <Label className="text-xs font-bold text-gray-700">Socio Titular *</Label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="ej. José Leonardo Jaya Jaramillo"
                    value={formData.propietario}
                    disabled={!isSuperAdmin}
                    onChange={(e) => setFormData((prev) => ({ ...prev, propietario: e.target.value }))}
                    className={`pl-9 h-11 rounded-xl text-sm font-semibold ${
                      !isSuperAdmin ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : ''
                    }`}
                  />
                </div>
              </div>

              {/* Switch de Unidad Activa */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 border border-gray-200">
                <div>
                  <span className="font-bold text-xs text-gray-800 block">Unidad Activa en Servicio</span>
                  <span className="text-[11px] text-gray-500 block">
                    {formData.activo ? 'Habilitada para despachos y turnos' : 'En mantenimiento / taller'}
                  </span>
                </div>
                <Switch
                  checked={formData.activo}
                  onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, activo: checked }))}
                />
              </div>

              {/* ─── CONFIGURACIÓN DE PROMOCIÓN VIAJE GRATIS DESACOPLADA ─── */}
              <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700">
                      <Ticket className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-xs text-amber-950 block">Promoción Pasajero Ganador (Viaje Gratis)</span>
                      <span className="text-[10px] text-amber-800/80 block">Exclusivo para la venta de boletos de esta unidad</span>
                    </div>
                  </div>
                  <Switch
                    checked={formData.promoConfig?.activa ?? true}
                    onCheckedChange={(checked) => setFormData((prev) => ({
                      ...prev,
                      promoConfig: { ...(prev.promoConfig || DEFAULT_PROMO_CONFIG), activa: checked }
                    }))}
                  />
                </div>

                {(formData.promoConfig?.activa ?? true) && (
                  <div className="space-y-2.5 pt-2 border-t border-amber-200/60">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[11px] font-bold text-amber-900">Pasajero Mínimo</Label>
                        <Input
                          type="number"
                          min={3}
                          max={15}
                          value={formData.promoConfig?.rangoMin ?? 3}
                          onChange={(e) => setFormData((prev) => ({
                            ...prev,
                            promoConfig: {
                              ...(prev.promoConfig || DEFAULT_PROMO_CONFIG),
                              rangoMin: Math.max(3, parseInt(e.target.value) || 3)
                            }
                          }))}
                          className="h-10 rounded-xl text-xs font-bold text-center bg-white"
                        />
                        <span className="text-[9px] text-gray-500 block text-center">Nunca los 2 primeros</span>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] font-bold text-amber-900">Pasajero Máximo</Label>
                        <Input
                          type="number"
                          min={10}
                          max={50}
                          value={formData.promoConfig?.rangoMax ?? 30}
                          onChange={(e) => setFormData((prev) => ({
                            ...prev,
                            promoConfig: {
                              ...(prev.promoConfig || DEFAULT_PROMO_CONFIG),
                              rangoMax: Math.max(10, parseInt(e.target.value) || 30)
                            }
                          }))}
                          className="h-10 rounded-xl text-xs font-bold text-center bg-white"
                        />
                        <span className="text-[9px] text-gray-500 block text-center">Límite de sorteo</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[11px] font-bold text-amber-900">Texto Publicitario en Pie de Boleto</Label>
                      <Input
                        type="text"
                        placeholder="ej. Quieres RutaGo? 0997149000"
                        value={formData.promoConfig?.textoPublicidad ?? ''}
                        onChange={(e) => setFormData((prev) => ({
                          ...prev,
                          promoConfig: {
                            ...(prev.promoConfig || DEFAULT_PROMO_CONFIG),
                            textoPublicidad: e.target.value
                          }
                        }))}
                        className="h-10 rounded-xl text-xs bg-white"
                      />
                    </div>

                    <div className="flex items-center justify-between p-2 rounded-xl bg-white/80 border border-amber-200/50">
                      <span className="text-[11px] font-medium text-amber-900">Bip Sonoro Especial para Pasajero Ganador</span>
                      <Switch
                        checked={formData.promoConfig?.sonidoGanador ?? true}
                        onCheckedChange={(checked) => setFormData((prev) => ({
                          ...prev,
                          promoConfig: { ...(prev.promoConfig || DEFAULT_PROMO_CONFIG), sonidoGanador: checked }
                        }))}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Notas u Observaciones */}
              <div className="space-y-1">
                <Label className="text-xs font-bold text-gray-700">Notas u Observaciones Mecánicas</Label>
                <Input
                  type="text"
                  placeholder="Detalles sobre recorridos, mantenimientos, neumáticos, etc."
                  value={formData.notas}
                  onChange={(e) => setFormData((prev) => ({ ...prev, notas: e.target.value }))}
                  className="h-11 rounded-xl text-xs"
                />
              </div>
            </div>

            {/* Pie del modal con acciones */}
            <div className="p-4 border-t border-gray-200 bg-[#F5F5F7] flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSheetOpen(false)}
                className="flex-1 h-12 rounded-2xl font-bold text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                disabled={saving}
                onClick={handleSave}
                className="flex-1 h-12 rounded-2xl bg-[#912D26] hover:bg-[#7A2520] text-white font-bold text-xs shadow-md"
              >
                {saving ? 'Guardando...' : editingId ? 'Actualizar Ficha' : 'Registrar Unidad'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL DE CONFIRMACIÓN DE ELIMINACIÓN (SOLO SUPERADMIN) ─── */}
      {busToDelete && isSuperAdmin && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h4 className="font-black text-base text-gray-900">¿Retirar Unidad de la Flota?</h4>
              <p className="text-xs text-gray-600">
                Se desvinculará el <strong>Disco {busToDelete.numeroDisco} ({busToDelete.placa})</strong>. Los registros históricos de vueltas anteriores se conservarán para auditoría.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setBusToDelete(null)}
                className="flex-1 rounded-2xl font-bold text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs"
              >
                Sí, Retirar Bus
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FlotaScreen;
