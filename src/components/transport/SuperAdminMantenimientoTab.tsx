'use client';

import { useState } from 'react';
import {
  Wrench,
  Save,
  RotateCcw,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertTriangle,
  Info,
  Shield,
  Search,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  type MantenimientoCatalogoItem,
  getCatalogoMaestroGlobal,
  saveCatalogoMaestroGlobal,
  restablecerCatalogoMaestroFabrica,
} from '@/lib/mantenimiento-catalogo';

export function SuperAdminMantenimientoTab() {
  const { toast } = useToast();
  // Zero-loops: Carga inicial perezosa en memoria sin bucles
  const [catalogo, setCatalogo] = useState<MantenimientoCatalogoItem[]>(() => getCatalogoMaestroGlobal());
  const [filtroCategoria, setFiltroCategoria] = useState<string>('TODAS');
  const [busqueda, setBusqueda] = useState<string>('');
  const [editingModalItem, setEditingModalItem] = useState<MantenimientoCatalogoItem | null>(null);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);

  // Formulario nuevo ítem
  const [nuevoItem, setNuevoItem] = useState<Partial<MantenimientoCatalogoItem>>({
    nombre: '',
    categoria: 'MOTOR',
    intervaloKmOficial: 5000,
    especificacionLubricanteRepuesto: '',
    codigoRepuestoReferencia: '',
    asignadoChoferPorDefecto: false,
    activoBiblioteca: true,
    prioridad: 'ALTA',
    observacionesMecanica: '',
  });

  const handleUpdateItemDirecto = (
    id: string,
    campo: keyof MantenimientoCatalogoItem,
    valor: any
  ) => {
    setCatalogo(prev => {
      const updated = prev.map(item =>
        item.id === id ? { ...item, [campo]: valor } : item
      );
      saveCatalogoMaestroGlobal(updated);
      return updated;
    });
  };

  const handleRestablecerFabrica = () => {
    const defaultData = restablecerCatalogoMaestroFabrica();
    setCatalogo(defaultData);
    toast({
      title: 'Restablecido a Fábrica',
      description: 'Se restablecieron los 19 mantenimientos oficiales de fábrica Hino AK.',
    });
  };

  const handleEliminarItem = (id: string, nombre: string) => {
    setCatalogo(prev => {
      const updated = prev.filter(item => item.id !== id);
      saveCatalogoMaestroGlobal(updated);
      return updated;
    });
    toast({
      title: 'Mantenimiento eliminado',
      description: `"${nombre}" fue removido de la biblioteca institucional.`,
    });
  };

  const handleGuardarModalEdicion = () => {
    if (!editingModalItem) return;
    setCatalogo(prev => {
      const updated = prev.map(item =>
        item.id === editingModalItem.id ? editingModalItem : item
      );
      saveCatalogoMaestroGlobal(updated);
      return updated;
    });
    setEditingModalItem(null);
    toast({
      title: 'Especificaciones Guardadas',
      description: 'Se actualizaron las especificaciones del mantenimiento.',
    });
  };

  const handleCrearNuevoItem = () => {
    if (!nuevoItem.nombre || !nuevoItem.nombre.trim()) {
      toast({
        title: 'Nombre requerido',
        description: 'Por favor ingresa el nombre del nuevo mantenimiento.',
        variant: 'destructive',
      });
      return;
    }

    const newItemComplete: MantenimientoCatalogoItem = {
      id: `hino-custom-${Date.now()}`,
      codigo: `MNT-CUSTOM-${Math.floor(Math.random() * 1000)}`,
      nombre: nuevoItem.nombre.trim(),
      categoria: (nuevoItem.categoria as any) || 'MOTOR',
      intervaloKmOficial: Number(nuevoItem.intervaloKmOficial) || 5000,
      intervaloDiasAprox: Math.round((Number(nuevoItem.intervaloKmOficial) || 5000) / 160),
      especificacionLubricanteRepuesto: nuevoItem.especificacionLubricanteRepuesto || '',
      codigoRepuestoReferencia: nuevoItem.codigoRepuestoReferencia || '',
      asignadoChoferPorDefecto: Boolean(nuevoItem.asignadoChoferPorDefecto),
      activoBiblioteca: true,
      prioridad: (nuevoItem.prioridad as any) || 'ALTA',
      observacionesMecanica: nuevoItem.observacionesMecanica || '',
    };

    setCatalogo(prev => {
      const updated = [newItemComplete, ...prev];
      saveCatalogoMaestroGlobal(updated);
      return updated;
    });

    setIsNewModalOpen(false);
    setNuevoItem({
      nombre: '',
      categoria: 'MOTOR',
      intervaloKmOficial: 5000,
      especificacionLubricanteRepuesto: '',
      codigoRepuestoReferencia: '',
      asignadoChoferPorDefecto: false,
      activoBiblioteca: true,
      prioridad: 'ALTA',
      observacionesMecanica: '',
    });

    toast({
      title: 'Mantenimiento Creado',
      description: `"${newItemComplete.nombre}" se agregó al catálogo maestro.`,
    });
  };

  // Filtrado memoizado
  const itemsFiltrados = catalogo.filter(item => {
    const matchCat = filtroCategoria === 'TODAS' || item.categoria === filtroCategoria;
    const matchBusqueda =
      !busqueda ||
      item.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      item.codigoRepuestoReferencia.toLowerCase().includes(busqueda.toLowerCase()) ||
      item.especificacionLubricanteRepuesto.toLowerCase().includes(busqueda.toLowerCase());
    return matchCat && matchBusqueda;
  });

  const totalActivos = catalogo.filter(i => i.activoBiblioteca).length;
  const totalChofer = catalogo.filter(i => i.asignadoChoferPorDefecto).length;

  return (
    <Card className="rounded-2xl border border-[#D6D6D6] bg-white overflow-hidden shadow-sm">
      <CardContent className="p-0">
        {/* Header institucional */}
        <div className="p-4 bg-gradient-to-r from-[#912D26]/10 via-[#912D26]/5 to-transparent border-b border-[#D6D6D6]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#912D26] text-white flex items-center justify-center shrink-0 shadow-sm">
                <Wrench className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-[#3A3A3A]">
                    Mantenimientos Hino AK (Catálogo Institucional)
                  </h2>
                  <Badge className="bg-[#912D26] text-white text-[10px] font-bold px-2 py-0.5">
                    SuperAdmin 9999
                  </Badge>
                </div>
                <p className="text-xs text-[#3A3A3A]/70">
                  Molde maestro oficial para los 19 autobuses de la cooperativa.
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRestablecerFabrica}
              className="h-8 rounded-lg text-xs font-bold border-gray-300 text-gray-700 hover:bg-gray-100 flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5 text-gray-500" />
              Restablecer Fábrica
            </Button>
          </div>

          {/* Micro contadores */}
          <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-gray-200/60">
            <div className="bg-white/80 backdrop-blur rounded-xl p-2 border border-gray-200/60 text-center">
              <span className="text-[10px] uppercase font-bold text-gray-500 block">Total Ítems</span>
              <span className="text-sm font-extrabold text-gray-900">{catalogo.length}</span>
            </div>
            <div className="bg-white/80 backdrop-blur rounded-xl p-2 border border-purple-200 text-center">
              <span className="text-[10px] uppercase font-bold text-purple-700 block">En Biblioteca</span>
              <span className="text-sm font-extrabold text-purple-900">{totalActivos} activos</span>
            </div>
            <div className="bg-white/80 backdrop-blur rounded-xl p-2 border border-amber-200 text-center">
              <span className="text-[10px] uppercase font-bold text-amber-700 block">Pre-Asignados Chofer</span>
              <span className="text-sm font-extrabold text-amber-900">{totalChofer} tareas</span>
            </div>
          </div>
        </div>

        {/* Barra de herramientas: Búsqueda, Filtro y Botón Nuevo */}
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 space-y-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <Input
                placeholder="Buscar por nombre, lubricante o código de repuesto..."
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                className="h-9 pl-9 pr-3 rounded-xl text-xs bg-white border-gray-300"
              />
            </div>
            <Button
              type="button"
              onClick={() => setIsNewModalOpen(true)}
              className="h-9 px-3 rounded-xl bg-[#912D26] hover:bg-[#7A2520] text-white text-xs font-bold shrink-0 flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Nuevo Ítem
            </Button>
          </div>

          {/* Chips de filtro de categoría */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
            {['TODAS', 'MOTOR', 'TRANSMISION', 'FRENOS', 'SUSPENSION', 'SISTEMA_AIRE', 'RODAJE', 'SISTEMA_COMBUSTIBLE'].map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setFiltroCategoria(cat)}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] whitespace-nowrap transition-all ${
                  filtroCategoria === cat
                    ? 'bg-gray-800 text-white shadow-xs'
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'
                }`}
              >
                {cat === 'TODAS' ? 'Todas las Categorías' : cat.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Lista de mantenimientos configurables */}
        <div className="p-4 space-y-3 divide-y divide-gray-100">
          {itemsFiltrados.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-xs">
              No se encontraron mantenimientos para este criterio de búsqueda.
            </div>
          ) : (
            itemsFiltrados.map((item, idx) => (
              <div
                key={item.id}
                className={`pt-3 first:pt-0 pb-1 rounded-xl transition-all ${
                  !item.activoBiblioteca ? 'opacity-50 grayscale' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-[10px] font-extrabold text-gray-400">
                        #{idx + 1}
                      </span>
                      <span className="text-[10px] font-mono font-bold bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded">
                        {item.codigo}
                      </span>
                      <span
                        className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded ${
                          item.prioridad === 'CRITICA'
                            ? 'bg-red-100 text-red-800'
                            : item.prioridad === 'ALTA'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {item.prioridad}
                      </span>
                      <span className="text-[9px] font-semibold bg-gray-200/70 text-gray-600 px-1.5 py-0.5 rounded">
                        {item.categoria.replace('_', ' ')}
                      </span>
                    </div>

                    {/* Nombre editable en línea */}
                    <Input
                      defaultValue={item.nombre}
                      onBlur={e => {
                        const val = e.target.value.trim();
                        if (val && val !== item.nombre) {
                          handleUpdateItemDirecto(item.id, 'nombre', val);
                        }
                      }}
                      className="h-8 text-xs font-bold text-gray-900 border-transparent hover:border-gray-200 focus:border-gray-400 px-1.5 bg-transparent"
                    />

                    {/* Ficha técnica resumida */}
                    <div className="mt-1 pl-1.5 space-y-0.5 text-[11px] text-gray-600">
                      <p className="truncate font-medium text-gray-800">
                        📦 <span className="font-bold">Lubricante/Repuesto:</span> {item.especificacionLubricanteRepuesto}
                      </p>
                      {item.codigoRepuestoReferencia && (
                        <p className="truncate font-mono text-[10px] text-gray-500">
                          🏷️ <span className="font-semibold">Códigos:</span> {item.codigoRepuestoReferencia}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Kilometraje editable & acciones rápidas */}
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <div className="flex items-center gap-1">
                      <div className="relative">
                        <Input
                          type="number"
                          step="500"
                          defaultValue={item.intervaloKmOficial}
                          onBlur={e => {
                            const val = parseInt(e.target.value, 10);
                            if (!isNaN(val) && val > 0 && val !== item.intervaloKmOficial) {
                              handleUpdateItemDirecto(item.id, 'intervaloKmOficial', val);
                            }
                          }}
                          className="h-8 w-24 text-right pr-7 text-xs font-extrabold text-blue-800 bg-blue-50/50 border-blue-200 rounded-lg"
                        />
                        <span className="absolute right-2 top-2 text-[10px] font-bold text-blue-600">
                          km
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditingModalItem(item)}
                        className="h-8 w-8 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                        title="Editar especificaciones profundas"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEliminarItem(item.id, item.nombre)}
                        className="h-8 w-8 rounded-lg text-red-400 hover:text-red-700 hover:bg-red-50"
                        title="Eliminar de catálogo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>

                    {/* Switches: Activo Biblioteca + Preasignado Chofer */}
                    <div className="flex items-center gap-3 pt-1">
                      <div className="flex items-center gap-1.5" title="Pre-asignado a la vista rápida del chofer">
                        <span className="text-[10px] font-bold text-amber-900">Chofer</span>
                        <Switch
                          checked={item.asignadoChoferPorDefecto}
                          onCheckedChange={checked =>
                            handleUpdateItemDirecto(item.id, 'asignadoChoferPorDefecto', checked)
                          }
                          className="data-[state=checked]:bg-amber-600 scale-75"
                        />
                      </div>
                      <div className="flex items-center gap-1.5" title="Habilitado en la biblioteca del socio">
                        <span className="text-[10px] font-bold text-purple-900">Biblioteca</span>
                        <Switch
                          checked={item.activoBiblioteca}
                          onCheckedChange={checked =>
                            handleUpdateItemDirecto(item.id, 'activoBiblioteca', checked)
                          }
                          className="data-[state=checked]:bg-purple-600 scale-75"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>

      {/* Modal de edición técnica profunda */}
      {editingModalItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-sm font-bold text-gray-900">
                  Editar Especificación Oficial Hino AK
                </h3>
                <p className="text-[11px] text-gray-500 font-mono">
                  {editingModalItem.codigo}
                </p>
              </div>
              <Badge className="bg-gray-100 text-gray-800 text-[10px]">
                {editingModalItem.categoria}
              </Badge>
            </div>

            <div className="space-y-3">
              <div>
                <Label className="text-xs font-bold text-gray-700">Nombre del Mantenimiento</Label>
                <Input
                  value={editingModalItem.nombre}
                  onChange={e =>
                    setEditingModalItem({ ...editingModalItem, nombre: e.target.value })
                  }
                  className="h-9 text-xs rounded-lg mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-bold text-gray-700">Intervalo Oficial (km)</Label>
                  <Input
                    type="number"
                    value={editingModalItem.intervaloKmOficial}
                    onChange={e =>
                      setEditingModalItem({
                        ...editingModalItem,
                        intervaloKmOficial: parseInt(e.target.value, 10) || 5000,
                      })
                    }
                    className="h-9 text-xs rounded-lg mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs font-bold text-gray-700">Prioridad</Label>
                  <select
                    value={editingModalItem.prioridad}
                    onChange={e =>
                      setEditingModalItem({
                        ...editingModalItem,
                        prioridad: e.target.value as any,
                      })
                    }
                    className="h-9 w-full text-xs rounded-lg border border-gray-300 mt-1 px-2 bg-white"
                  >
                    <option value="CRITICA">CRÍTICA (Rojo)</option>
                    <option value="ALTA">ALTA (Ámbar)</option>
                    <option value="MEDIA">MEDIA (Azul)</option>
                  </select>
                </div>
              </div>

              <div>
                <Label className="text-xs font-bold text-gray-700">
                  Especificación de Lubricante / Repuesto
                </Label>
                <Input
                  value={editingModalItem.especificacionLubricanteRepuesto}
                  onChange={e =>
                    setEditingModalItem({
                      ...editingModalItem,
                      especificacionLubricanteRepuesto: e.target.value,
                    })
                  }
                  className="h-9 text-xs rounded-lg mt-1"
                  placeholder="ej. 1 Caneca Mobil Delvac 1300 15W-40"
                />
              </div>

              <div>
                <Label className="text-xs font-bold text-gray-700">
                  Códigos de Repuestos Referenciales (Mercado Local)
                </Label>
                <Input
                  value={editingModalItem.codigoRepuestoReferencia}
                  onChange={e =>
                    setEditingModalItem({
                      ...editingModalItem,
                      codigoRepuestoReferencia: e.target.value,
                    })
                  }
                  className="h-9 text-xs rounded-lg mt-1 font-mono"
                  placeholder="ej. C1314 / SF1307 / EF1802"
                />
              </div>

              <div>
                <Label className="text-xs font-bold text-gray-700">
                  Observaciones de Mecánica y Campo
                </Label>
                <textarea
                  value={editingModalItem.observacionesMecanica || ''}
                  onChange={e =>
                    setEditingModalItem({
                      ...editingModalItem,
                      observacionesMecanica: e.target.value,
                    })
                  }
                  rows={2}
                  className="w-full text-xs rounded-lg border border-gray-300 p-2 mt-1"
                  placeholder="Recomendaciones para el mecánico o chofer..."
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditingModalItem(null)}
                className="h-9 rounded-lg text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleGuardarModalEdicion}
                className="h-9 rounded-lg text-xs font-bold bg-[#912D26] hover:bg-[#7A2520] text-white"
              >
                <Save className="w-3.5 h-3.5 mr-1" />
                Guardar Cambios
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para crear nuevo ítem */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-sm font-bold text-gray-900">
                  Agregar Mantenimiento a la Biblioteca Oficial
                </h3>
                <p className="text-[11px] text-gray-500">
                  Quedará disponible para que los 19 socios lo utilicen en sus unidades.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <Label className="text-xs font-bold text-gray-700">Nombre de la Tarea / Mantenimiento *</Label>
                <Input
                  value={nuevoItem.nombre}
                  onChange={e => setNuevoItem({ ...nuevoItem, nombre: e.target.value })}
                  placeholder="ej. Cambio de Amortiguadores Delanteros"
                  className="h-9 text-xs rounded-lg mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-bold text-gray-700">Categoría</Label>
                  <select
                    value={nuevoItem.categoria}
                    onChange={e => setNuevoItem({ ...nuevoItem, categoria: e.target.value as any })}
                    className="h-9 w-full text-xs rounded-lg border border-gray-300 mt-1 px-2 bg-white"
                  >
                    <option value="MOTOR">MOTOR</option>
                    <option value="TRANSMISION">TRANSMISIÓN</option>
                    <option value="FRENOS">FRENOS</option>
                    <option value="SUSPENSION">SUSPENSIÓN</option>
                    <option value="SISTEMA_AIRE">SISTEMA DE AIRE</option>
                    <option value="RODAJE">RODAJE / LLANTAS</option>
                    <option value="SISTEMA_COMBUSTIBLE">COMBUSTIBLE</option>
                  </select>
                </div>
                <div>
                  <Label className="text-xs font-bold text-gray-700">Intervalo Oficial (km)</Label>
                  <Input
                    type="number"
                    step="500"
                    value={nuevoItem.intervaloKmOficial}
                    onChange={e => setNuevoItem({ ...nuevoItem, intervaloKmOficial: parseInt(e.target.value, 10) || 5000 })}
                    className="h-9 text-xs rounded-lg mt-1"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs font-bold text-gray-700">Especificación de Lubricante / Repuesto</Label>
                <Input
                  value={nuevoItem.especificacionLubricanteRepuesto}
                  onChange={e => setNuevoItem({ ...nuevoItem, especificacionLubricanteRepuesto: e.target.value })}
                  placeholder="ej. Grasa sintética alta temperatura / Aceite 85W-140"
                  className="h-9 text-xs rounded-lg mt-1"
                />
              </div>

              <div>
                <Label className="text-xs font-bold text-gray-700">Códigos de Repuestos</Label>
                <Input
                  value={nuevoItem.codigoRepuestoReferencia}
                  onChange={e => setNuevoItem({ ...nuevoItem, codigoRepuestoReferencia: e.target.value })}
                  placeholder="ej. Ref: 48500-1234"
                  className="h-9 text-xs rounded-lg mt-1"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <Switch
                  checked={Boolean(nuevoItem.asignadoChoferPorDefecto)}
                  onCheckedChange={checked => setNuevoItem({ ...nuevoItem, asignadoChoferPorDefecto: checked })}
                />
                <span className="text-xs font-bold text-gray-700">
                  Pre-asignar automáticamente a la vista rápida del chofer
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsNewModalOpen(false)}
                className="h-9 rounded-lg text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleCrearNuevoItem}
                className="h-9 rounded-lg text-xs font-bold bg-[#912D26] hover:bg-[#7A2520] text-white"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Agregar al Catálogo
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
