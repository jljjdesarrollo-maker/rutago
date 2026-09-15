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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { BusItem, BusFormData, TipoOperacionBus } from '@/types/fleet';
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
} from '@/lib/fleet-storage';

interface FlotaScreenProps {
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
};

export function FlotaScreen({ onBack }: FlotaScreenProps) {
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

  // Filtrado reactivo en memoria
  const filteredBuses = useMemo(() => {
    return buses.filter((bus) => {
      // Filtro de tipo
      if (filterTipo !== 'TODOS' && bus.tipoOperacion !== filterTipo) {
        return false;
      }
      // Filtro de texto
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
  }, [buses, filterTipo, searchQuery]);

  // Contadores analíticos
  const stats = useMemo(() => {
    const total = buses.length;
    const troncal = buses.filter((b) => b.tipoOperacion === 'TRONCAL_VT').length;
    const alimentador = buses.filter((b) => b.tipoOperacion === 'ALIMENTADOR_P').length;
    const activos = buses.filter((b) => b.activo).length;
    return { total, troncal, alimentador, activos };
  }, [buses]);

  // Abrir formulario para crear nueva unidad
  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData({
      ...EMPTY_FORM,
      anio: new Date().getFullYear(),
    });
    setSheetOpen(true);
  };

  // Abrir formulario para editar
  const handleOpenEdit = (bus: BusItem) => {
    setEditingId(bus.id || `BUS-${bus.numeroDisco}`);
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
    });
    setSheetOpen(true);
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

    const busPayload: BusItem = {
      id: editingId || `BUS-${cleanDisco}`,
      numeroDisco: cleanDisco,
      placa: cleanPlaca,
      marca: formData.marca.trim() || 'Hino AK',
      modelo: formData.modelo?.trim() || 'AK',
      anio: formData.anio ? Number(formData.anio) : undefined,
      capacidadAsientos: Number(formData.capacidadAsientos) || 45,
      propietario: formData.propietario.trim(),
      tipoOperacion: formData.tipoOperacion,
      activo: formData.activo,
      notas: formData.notas?.trim() || undefined,
    };

    try {
      // 1. Guardar de inmediato en local (Zero Latency)
      saveBus(busPayload);

      // Actualizar estado reactivo
      setBuses((prev) => {
        const idx = prev.findIndex(
          (b) => b.id === busPayload.id || b.numeroDisco === busPayload.numeroDisco
        );
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = busPayload;
          return updated;
        }
        return [...prev, busPayload].sort((a, b) =>
          a.numeroDisco.localeCompare(b.numeroDisco, undefined, { numeric: true })
        );
      });

      // 2. Sincronizar en segundo plano con la API
      if (typeof window !== 'undefined' && navigator.onLine) {
        if (editingId) {
          updateBusInApi(editingId, busPayload).catch(() => {});
        } else {
          saveBusToApi(busPayload).catch(() => {});
        }
      }

      toast({
        title: editingId ? 'Unidad actualizada' : 'Unidad registrada',
        description: `Disco ${cleanDisco} (${cleanPlaca}) guardado correctamente.`,
      });

      setSheetOpen(false);
      setEditingId(null);
    } catch (err) {
      console.error('Error guardando unidad:', err);
      toast({
        title: 'Error al guardar',
        description: 'No se pudo guardar la unidad.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // Confirmar eliminación
  const handleConfirmDelete = async () => {
    if (!busToDelete) return;
    const id = busToDelete.id || `BUS-${busToDelete.numeroDisco}`;
    const disco = busToDelete.numeroDisco;

    // Protección para la unidad piloto 01
    if (disco === '01') {
      toast({
        title: 'Unidad protegida',
        description: 'El Bus 01 es la unidad piloto del Socio Líder y no debe eliminarse.',
        variant: 'destructive',
      });
      setBusToDelete(null);
      return;
    }

    try {
      deleteBus(id);
      setBuses((prev) => prev.filter((b) => b.id !== id && b.numeroDisco !== disco));

      if (typeof window !== 'undefined' && navigator.onLine) {
        deleteBusFromApi(id).catch(() => {});
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

  // Cargar Benchmark de 19 unidades de la Cooperativa
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
                Gestión de Flota
              </h1>
              <p className="text-xs text-gray-500 font-medium">
                Catálogo de unidades físicas y asignación de circuito
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadFleet}
              disabled={syncing}
              className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition-colors"
              title="Refrescar flota"
            >
              <RotateCw className={`w-4 h-4 ${syncing ? 'animate-spin text-[#912D26]' : ''}`} />
            </button>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200 font-bold text-xs">
              {stats.activos} / {stats.total} Activos
            </Badge>
          </div>
        </div>
      </header>

      {/* ─── CONTENIDO PRINCIPAL ─── */}
      <main className="max-w-2xl mx-auto px-4 pt-4 space-y-4">
        {/* ─── BANNER POLÍTICA ZERO-LOCKING & CLARIDAD CONCEPTUAL ─── */}
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
              <p className="text-[#3A3A3A] leading-relaxed">
                <strong>Unidad Física (Bus):</strong> Máquina que acumula odómetro, mantenimiento de aceite y diésel.{' '}
                <strong>VT (Vuelta Turno):</strong> Itinerario diario de frecuencias que rotan libremente entre buses.
              </p>
            </div>
          </div>
        </div>

        {/* ─── TARJETA DE RESUMEN RÁPIDO DE FLOTA ─── */}
        <div className="grid grid-cols-3 gap-2.5">
          <div className="bg-white rounded-2xl p-3 border border-gray-200 shadow-2xs flex flex-col items-center text-center">
            <span className="text-2xl font-black text-[#3A3A3A]">{stats.total}</span>
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-tight">Total Flota</span>
          </div>
          <div className="bg-white rounded-2xl p-3 border border-gray-200 shadow-2xs flex flex-col items-center text-center">
            <span className="text-2xl font-black text-emerald-700">{stats.troncal}</span>
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-tight">Troncal (VT)</span>
          </div>
          <div className="bg-white rounded-2xl p-3 border border-gray-200 shadow-2xs flex flex-col items-center text-center">
            <span className="text-2xl font-black text-blue-700">{stats.alimentador}</span>
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-tight">Alimentador (P)</span>
          </div>
        </div>

        {/* ─── FILTROS Y BUSCADOR (THUMB ZONE) ─── */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              type="text"
              placeholder="Buscar por disco (ej. 01, 16), placa o socio..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-9 h-11 rounded-xl bg-white border-gray-200 text-sm focus-visible:ring-[#912D26]"
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

          {/* Chips táctiles de categoría de operación */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            <button
              onClick={() => setFilterTipo('TODOS')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                filterTipo === 'TODOS'
                  ? 'bg-gray-900 text-white shadow-xs'
                  : 'bg-white text-gray-600 border border-gray-200'
              }`}
            >
              Todos ({stats.total})
            </button>
            <button
              onClick={() => setFilterTipo('TRONCAL_VT')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition-colors ${
                filterTipo === 'TRONCAL_VT'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-white text-emerald-800 border border-emerald-200'
              }`}
            >
              <Route className="w-3 h-3" />
              Troncal VT ({stats.troncal})
            </button>
            <button
              onClick={() => setFilterTipo('ALIMENTADOR_P')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition-colors ${
                filterTipo === 'ALIMENTADOR_P'
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'bg-white text-blue-800 border border-blue-200'
              }`}
            >
              <Layers className="w-3 h-3" />
              Alimentadores P ({stats.alimentador})
            </button>
          </div>
        </div>

        {/* ─── LISTA DE UNIDADES REGISTRADAS ─── */}
        <div className="space-y-3">
          {loading ? (
            <div className="bg-white rounded-2xl p-8 text-center text-gray-400 font-medium border border-gray-200">
              Cargando flota de autobuses...
            </div>
          ) : filteredBuses.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-gray-200 space-y-3">
              <Bus className="w-10 h-10 text-gray-300 mx-auto" />
              <div>
                <p className="font-bold text-gray-700">No se encontraron unidades</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {searchQuery ? 'Prueba con otro término de búsqueda' : 'Registra tu primera unidad de flota'}
                </p>
              </div>
              <Button
                onClick={handleOpenCreate}
                size="sm"
                className="rounded-xl bg-[#912D26] hover:bg-[#7A2520] text-white"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Registrar Unidad
              </Button>
            </div>
          ) : (
            filteredBuses.map((bus) => {
              const isPilot = bus.numeroDisco === '01';
              const isTroncal = bus.tipoOperacion === 'TRONCAL_VT';

              return (
                <Card
                  key={bus.id || bus.numeroDisco}
                  className={`rounded-2xl border transition-shadow shadow-2xs overflow-hidden bg-white ${
                    isPilot
                      ? 'border-amber-300 ring-1 ring-amber-300/60'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <CardContent className="p-3.5 space-y-2.5">
                    {/* Fila Superior: Disco, Placa y Tipo */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {/* Insignia de Disco */}
                        <div
                          className={`w-12 h-12 rounded-xl font-black flex flex-col items-center justify-center shrink-0 shadow-2xs ${
                            isPilot
                              ? 'bg-amber-500 text-white'
                              : isTroncal
                              ? 'bg-[#912D26] text-white'
                              : 'bg-blue-700 text-white'
                          }`}
                        >
                          <span className="text-[9px] uppercase tracking-tighter opacity-80 leading-none">Disco</span>
                          <span className="text-lg leading-none font-black">{bus.numeroDisco}</span>
                        </div>

                        {/* Placa y Marca */}
                        <div>
                          <div className="flex items-center gap-1.5">
                            {/* Placa Vehicular */}
                            <span className="font-mono font-bold text-xs bg-gray-100 text-gray-800 border border-gray-300 px-2 py-0.5 rounded shadow-2xs tracking-wider">
                              {bus.placa}
                            </span>

                            {isPilot && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-tight bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.5 rounded-md">
                                <Award className="w-3 h-3 text-amber-600" />
                                Socio Líder
                              </span>
                            )}

                            {!bus.activo && (
                              <span className="text-[10px] font-bold uppercase bg-red-100 text-red-700 px-1.5 py-0.5 rounded">
                                En Taller
                              </span>
                            )}
                          </div>

                          <p className="text-xs font-bold text-[#3A3A3A] mt-0.5">
                            {bus.marca} {bus.modelo ? `• ${bus.modelo}` : ''} {bus.anio ? `(${bus.anio})` : ''}
                          </p>
                        </div>
                      </div>

                      {/* Botones de acción ergonómicos */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleOpenEdit(bus)}
                          className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-700 flex items-center justify-center transition-colors"
                          title="Editar unidad"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        {!isPilot && (
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
                    <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-gray-100">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-gray-400 block">Propietario</span>
                        <span className="font-semibold text-gray-800 truncate block">
                          {bus.propietario || 'No asignado'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-gray-400 block">Capacidad</span>
                        <span className="font-semibold text-gray-800 block">
                          {bus.capacidadAsientos} Asientos
                        </span>
                      </div>
                    </div>

                    {/* Fila Inferior: Circuito Operativo Asignado */}
                    <div className="flex items-center justify-between pt-1 border-t border-gray-100 text-xs">
                      <div className="flex items-center gap-1.5">
                        {isTroncal ? (
                          <Badge className="bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 font-bold text-[11px] gap-1 py-0.5">
                            <Route className="w-3 h-3 text-emerald-600" />
                            Rueda Troncal General (VT01 - VT15)
                          </Badge>
                        ) : (
                          <Badge className="bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100 font-bold text-[11px] gap-1 py-0.5">
                            <Layers className="w-3 h-3 text-blue-600" />
                            Circuito Especial Alimentador (P1 - P3)
                          </Badge>
                        )}
                      </div>

                      <span className="text-[11px] font-medium text-gray-400">
                        {bus.activo ? 'En Servicio' : 'Inactivo'}
                      </span>
                    </div>

                    {bus.notas && (
                      <p className="text-[11px] text-gray-500 bg-gray-50 p-2 rounded-xl italic">
                        {bus.notas}
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* ─── BOTÓN SECUNDARIO: CARGAR BENCHMARK DE FLOTA ─── */}
        {buses.length < 5 && (
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

      {/* ─── BARRA INFERIOR FIJA CON BOTÓN PRINCIPAL (THUMB ZONE) ─── */}
      <div className="fixed bottom-0 left-0 right-0 z-20 bg-white/95 backdrop-blur border-t border-gray-200 p-3 shadow-lg">
        <div className="max-w-2xl mx-auto">
          <Button
            onClick={handleOpenCreate}
            className="w-full h-12 rounded-2xl bg-[#912D26] hover:bg-[#7A2520] active:scale-[0.99] text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-transform"
          >
            <Plus className="w-5 h-5" />
            Registrar Nueva Unidad de Flota
          </Button>
        </div>
      </div>

      {/* ─── MODAL / BOTTOM SHEET DE REGISTRO & EDICIÓN (THUMB-FRIENDLY) ─── */}
      {sheetOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-200">
            {/* Cabecera del formulario */}
            <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between bg-[#F5F5F7]">
              <div>
                <h2 className="text-base font-black text-[#3A3A3A] flex items-center gap-2">
                  <Bus className="w-5 h-5 text-[#912D26]" />
                  {editingId ? `Editar Unidad Disco ${formData.numeroDisco}` : 'Registrar Nueva Unidad de Flota'}
                </h2>
                <p className="text-xs text-gray-500">
                  {editingId ? 'Actualiza los datos del autobús' : 'Ingresa los datos del vehículo físico'}
                </p>
              </div>
              <button
                onClick={() => setSheetOpen(false)}
                className="w-9 h-9 rounded-xl bg-white border border-gray-200 text-gray-500 hover:text-gray-700 flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cuerpo del formulario scrollable */}
            <div className="p-5 overflow-y-auto space-y-4">
              {/* Selector de Circuito de Operación (Botones Grandes) */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-gray-700 uppercase tracking-tight">
                  Tipo de Circuito y Operación
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, tipoOperacion: 'TRONCAL_VT', capacidadAsientos: 45 }))}
                    className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                      formData.tipoOperacion === 'TRONCAL_VT'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-500/20'
                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <Route className="w-4 h-4 text-emerald-700" />
                      {formData.tipoOperacion === 'TRONCAL_VT' && <Check className="w-4 h-4 text-emerald-700" />}
                    </div>
                    <span className="font-black text-xs">TRONCAL GENERAL (VT)</span>
                    <span className="text-[10px] text-gray-500 leading-tight mt-0.5">
                      Buses grandes (45 asientos) • Itinerario VT01 al VT15
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, tipoOperacion: 'ALIMENTADOR_P', capacidadAsientos: 28 }))}
                    className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                      formData.tipoOperacion === 'ALIMENTADOR_P'
                        ? 'border-blue-600 bg-blue-50 text-blue-950 ring-2 ring-blue-500/20'
                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <Layers className="w-4 h-4 text-blue-700" />
                      {formData.tipoOperacion === 'ALIMENTADOR_P' && <Check className="w-4 h-4 text-blue-700" />}
                    </div>
                    <span className="font-black text-xs">ALIMENTADOR (P)</span>
                    <span className="text-[10px] text-gray-500 leading-tight mt-0.5">
                      Microbuses (25-30 asientos) • Circuitos especiales P1-P3
                    </span>
                  </button>
                </div>
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
                    onChange={(e) => setFormData((prev) => ({ ...prev, numeroDisco: e.target.value.replace(/\D/g, '') }))}
                    className="h-11 rounded-xl text-base font-black text-center"
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
                {/* Chips rápidos de marca */}
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
                      onChange={(e) => setFormData((prev) => ({ ...prev, capacidadAsientos: Number(e.target.value) }))}
                      className="h-11 rounded-xl text-sm font-bold text-center"
                    />
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
                <Label className="text-xs font-bold text-gray-700">Socio Propietario *</Label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="ej. José Leonardo Jaya Jaramillo"
                    value={formData.propietario}
                    onChange={(e) => setFormData((prev) => ({ ...prev, propietario: e.target.value }))}
                    className="pl-9 h-11 rounded-xl text-sm font-semibold"
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

              {/* Notas u Observaciones */}
              <div className="space-y-1">
                <Label className="text-xs font-bold text-gray-700">Notas u Observaciones</Label>
                <Input
                  type="text"
                  placeholder="Detalles sobre recorridos, mantenimientos, etc."
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
                {saving ? 'Guardando...' : editingId ? 'Actualizar Unidad' : 'Registrar Unidad'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL DE CONFIRMACIÓN DE ELIMINACIÓN ─── */}
      {busToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-black text-base text-gray-900">¿Eliminar Disco {busToDelete.numeroDisco}?</h3>
              <p className="text-xs text-gray-500">
                Se retirará la unidad <strong>{busToDelete.placa}</strong> ({busToDelete.propietario}) del catálogo de flota.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setBusToDelete(null)}
                className="flex-1 h-11 rounded-xl font-bold text-xs"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleConfirmDelete}
                className="flex-1 h-11 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs"
              >
                Sí, Eliminar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
