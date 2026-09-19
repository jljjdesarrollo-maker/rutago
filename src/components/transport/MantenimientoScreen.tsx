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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { getAllBuses, getActiveBusId, getLatestBusOdometer } from '@/lib/fleet-storage';
import {
  type MantenimientoCatalogoItem,
  getCatalogoMaestroGlobal,
} from '@/lib/mantenimiento-catalogo';

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
          costoEstimado: c.codigo === 'MNT-ACEITE-MOT' ? 120 : c.codigo.includes('FILT') ? 35 : 80,
          repuestoDetalle: c.especificacionLubricanteRepuesto,
          asignadoChofer: c.asignadoChoferPorDefecto,
          activo: true,
        });
      }
    });

    if (nuevos.length > 0) {
      const actualizados = [...items, ...nuevos];
      saveItems(actualizados);
      toast({
        title: 'Bloque de Motor Sincronizado',
        description: `Se activaron los ${nuevos.length} ítems oficiales de Motor en tu unidad.`,
      });
    } else {
      toast({
        title: 'Motor Completo',
        description: 'Todos los 9 ítems oficiales de Motor ya están activos en este autobús.',
      });
    }
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

    const updated = items.map(it =>
      it.id === editingItem.id
        ? {
            ...it,
            ultimoKm: km,
            fechaUltimo: today,
            costoEstimado: costoNum,
            tallerMecanico: tallerRegistro.trim() || it.tallerMecanico,
          }
        : it
    );
    saveItems(updated);
    toast({
      title: 'Mantenimiento Registrado',
      description: `${editingItem.nombre} asentado en ${km.toLocaleString()} km`,
    });
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

  // Cálculo de semáforos y filtrado
  const itemsFiltrados = useMemo(() => {
    return items.filter(it => {
      if (filtroCategoria !== 'TODAS' && it.categoria !== filtroCategoria) return false;
      if (filtroVista === 'CHOFER') return it.asignadoChofer;
      if (filtroVista === 'VENCIDOS') {
        const kmRecorridos = kmActual - it.ultimoKm;
        return kmRecorridos >= it.intervaloKm;
      }
      return true;
    });
  }, [items, kmActual, filtroVista, filtroCategoria]);

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
            { id: 'SUSPENSION', label: '🔩 Suspensión' },
            { id: 'SISTEMA_AIRE', label: '💨 Admisión / Aire' },
            { id: 'RODAJE', label: '🔄 Rodaje / Llantas' },
          ].map(cat => {
            const count = cat.id === 'TODAS'
              ? items.length
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
                Aceite, Filtros (Aceite, Trampa, Diésel Fino), Calibración Válvulas, Bandas, Termostato, Radiador y Metales.
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
                    esVencido
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

      {/* Modal Registrar Mantenimiento Realizado */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl space-y-4">
            <div>
              <h3 className="font-black text-base text-gray-900 mb-0.5">Registrar Servicio Mecánico</h3>
              <p className="text-xs text-gray-500">{editingItem.nombre}</p>
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
    </div>
  );
}
