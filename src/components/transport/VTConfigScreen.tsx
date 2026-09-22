'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Bus, Ticket, Wrench, ShieldAlert, Save, Plus, Trash2, ChevronDown, ChevronUp, Settings, Gift, Clock, Gauge, RotateCcw, Smartphone, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { type PromoViajeGratisConfig, loadPromoConfig, savePromoConfig, DEFAULT_PROMO_CONFIG, type TiempoVentaConfig, loadTiempoVentaConfig, saveTiempoVentaConfig, DEFAULT_TIEMPO_VENTA_CONFIG } from './types-boletos';
import { type ConfiguracionKilometrajeRutas, DEFAULT_CONFIG_KILOMETRAJE_RUTAS } from '@/types/rutas-km';
import { getLocalRutasKmConfig, saveLocalRutasKmConfig, syncRutasKmConfig } from '@/lib/rutas-km-storage';
import { SuperAdminMantenimientoTab } from './SuperAdminMantenimientoTab';

interface VTItem {
  id: string;
  codigo: string;
  nombre: string;
  frecuencias: Array<{ routeFrom: string; routeTo: string; time: string }>;
  activo: boolean;
}

interface VTConfigScreenProps {
  onBack: () => void;
}

export function VTConfigScreen({ onBack }: VTConfigScreenProps) {
  const [vts, setVts] = useState<VTItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [expandedVt, setExpandedVt] = useState<string | null>(null);
  const [editFrecuencias, setEditFrecuencias] = useState<Record<string, Array<{ routeFrom: string; routeTo: string; time: string }>>>({});
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'TURNOS' | 'DESPACHO' | 'KILOMETRAJE' | 'MANTENIMIENTO'>('TURNOS');
  const [searchVt, setSearchVt] = useState('');

  // Viaje Gratis promo config
  const [promoConfig, setPromoConfig] = useState<PromoViajeGratisConfig>(DEFAULT_PROMO_CONFIG);
  useEffect(() => { setPromoConfig(loadPromoConfig()); }, []);

  // Tiempos límites de venta por frecuencia
  const [tiempoConfig, setTiempoConfig] = useState<TiempoVentaConfig>(DEFAULT_TIEMPO_VENTA_CONFIG);
  useEffect(() => { setTiempoConfig(loadTiempoVentaConfig()); }, []);

  // Calibración de Kilometraje por Ruta (Fase A - v3.58.0)
  const [rutasKmConfig, setRutasKmConfig] = useState<ConfiguracionKilometrajeRutas>(DEFAULT_CONFIG_KILOMETRAJE_RUTAS);
  const [savingRutasKm, setSavingRutasKm] = useState(false);

  // Switch Maestro de Vinculación Estricta de Dispositivo (Device Binding)
  const [deviceBindingEnabled, setDeviceBindingEnabled] = useState(false);
  const [savingDeviceBinding, setSavingDeviceBinding] = useState(false);

  useEffect(() => {
    fetch('/api/config/device-binding')
      .then(r => r.json())
      .then(d => {
        if (d?.config?.enabled !== undefined) {
          setDeviceBindingEnabled(Boolean(d.config.enabled));
        }
      })
      .catch(() => {});
  }, []);

  const handleToggleDeviceBinding = async (checked: boolean) => {
    setDeviceBindingEnabled(checked);
    setSavingDeviceBinding(true);
    try {
      const res = await fetch('/api/config/device-binding', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: checked }),
      });
      const data = await res.json();
      if (res.ok) {
        toast({
          title: checked ? 'Device Binding Activado' : 'Device Binding Desactivado',
          description: data.message || 'Configuración actualizada',
        });
      } else {
        setDeviceBindingEnabled(!checked);
        toast({ title: 'Error', description: 'No se pudo actualizar el estado', variant: 'destructive' });
      }
    } catch {
      setDeviceBindingEnabled(!checked);
      toast({ title: 'Error de Red', description: 'No se pudo conectar con el servidor', variant: 'destructive' });
    } finally {
      setSavingDeviceBinding(false);
    }
  };

  useEffect(() => {
    setRutasKmConfig(getLocalRutasKmConfig());
    syncRutasKmConfig().then(cfg => {
      if (cfg) setRutasKmConfig(cfg);
    });
  }, []);

  const handleUpdateTramoKm = (id: string, distanciaKm: number) => {
    setRutasKmConfig(prev => ({
      ...prev,
      tramos: prev.tramos.map(t => t.id === id ? { ...t, distanciaKm, updatedAt: new Date().toISOString() } : t)
    }));
  };

  const handleCopiarIdaARetorno = (origen: string, destino: string) => {
    setRutasKmConfig(prev => {
      const ida = prev.tramos.find(t => t.origen === origen && t.destino === destino && t.sentido === 'IDA');
      if (!ida) return prev;
      return {
        ...prev,
        tramos: prev.tramos.map(t => {
          if (t.origen === destino && t.destino === origen && t.sentido === 'RETORNO') {
            return { ...t, distanciaKm: ida.distanciaKm, updatedAt: new Date().toISOString() };
          }
          return t;
        })
      };
    });
    toast({ title: 'Copiado', description: `Retorno igualado a ${destino} ➔ ${origen}` });
  };

  const handleSaveRutasKm = async () => {
    setSavingRutasKm(true);
    try {
      saveLocalRutasKmConfig(rutasKmConfig);
      await fetch('/api/config/rutas-km', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rutasKmConfig),
      });
      toast({ title: 'Configuración Guardada', description: 'Calibración de kilometraje replicada a la flota con éxito' });
    } catch {
      toast({ title: 'Guardado Local', description: 'Guardado en dispositivo (se sincronizará al conectar)' });
    } finally {
      setSavingRutasKm(false);
    }
  };

  const handleRestablecerRutasKm = () => {
    setRutasKmConfig(DEFAULT_CONFIG_KILOMETRAJE_RUTAS);
    saveLocalRutasKmConfig(DEFAULT_CONFIG_KILOMETRAJE_RUTAS);
    toast({ title: 'Restablecido', description: 'Valores oficiales de fábrica restablecidos' });
  };

  useEffect(() => {
    // Seed + fetch VTs (seed runs here to ensure data is current)
    fetch('/api/seed-vts', { method: 'POST' })
      .then(() => fetch('/api/bus-vts'))
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setVts(data);
          const init: Record<string, Array<{ routeFrom: string; routeTo: string; time: string }>> = {};
          data.forEach((vt: VTItem) => {
            init[vt.id] = Array.isArray(vt.frecuencias) ? vt.frecuencias : [];
          });
          setEditFrecuencias(init);
        }
      })
      .catch(() => toast({ title: 'Error', description: 'No se pudieron cargar los VTs', variant: 'destructive' }))
      .finally(() => setLoading(false));
  }, []);

  const toggleExpand = (vtId: string) => {
    setExpandedVt(prev => prev === vtId ? null : vtId);
  };

  const addFrecuencia = (vtId: string) => {
    setEditFrecuencias(prev => ({
      ...prev,
      [vtId]: [...(prev[vtId] || []), { routeFrom: 'Loja', routeTo: 'Vilcabamba', time: '' }],
    }));
  };

  const removeFrecuencia = (vtId: string, index: number) => {
    setEditFrecuencias(prev => ({
      ...prev,
      [vtId]: (prev[vtId] || []).filter((_, i) => i !== index),
    }));
  };

  const updateFrecuencia = (vtId: string, index: number, field: string, value: string) => {
    setEditFrecuencias(prev => {
      const updated = [...(prev[vtId] || [])];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, [vtId]: updated };
    });
  };

  const handleSave = async (vtId: string) => {
    setSaving(vtId);
    try {
      const res = await fetch('/api/bus-vts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: vtId,
          frecuencias: editFrecuencias[vtId] || [],
        }),
      });
      if (!res.ok) throw new Error('Error al guardar');
      const updated = await res.json();
      setVts(prev => prev.map(v => v.id === vtId ? { ...v, frecuencias: updated.frecuencias } : v));
      toast({ title: 'Guardado', description: `Frecuencias de ${vts.find(v => v.id === vtId)?.codigo} actualizadas` });
    } catch {
      toast({ title: 'Error', description: 'No se pudo guardar', variant: 'destructive' });
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[100dvh] bg-white">
        <div className="w-10 h-10 border-4 border-[#D6D6D6] border-t-[#912D26] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#FAFAFA]">
      <header className="sticky top-0 z-10 bg-white border-b border-[#D6D6D6] px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="rounded-xl text-[#3A3A3A]">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-lg font-semibold text-[#3A3A3A]">Configurar VT</h1>
          <p className="text-xs text-[#3A3A3A]/60">Editar frecuencias de cada vehiculo tipo</p>
        </div>
        <div className="w-9 h-9 rounded-xl bg-[#912D26]/10 flex items-center justify-center">
          <Settings className="w-5 h-5 text-[#912D26]" />
        </div>
      </header>

      
      {/* ─── NAVEGACIÓN MODULAR POR PESTAÑAS (SUPERADMIN CONSOLE) ─── */}
      <div className="sticky top-[57px] z-10 bg-white border-b border-[#D6D6D6] px-4 py-2.5 shadow-xs">
        <div className="grid grid-cols-2 gap-2">
          {/* Fila 1 - Columna 1 */}
          <button
            type="button"
            onClick={() => setActiveTab('TURNOS')}
            className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition-all w-full text-center ${
              activeTab === 'TURNOS'
                ? 'bg-[#912D26] text-white shadow-sm ring-2 ring-[#912D26]/20'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200/60'
            }`}
          >
            <Bus className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">1. Turnos y VTs ({vts.length})</span>
          </button>

          {/* Fila 1 - Columna 2 */}
          <button
            type="button"
            onClick={() => setActiveTab('DESPACHO')}
            className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition-all w-full text-center ${
              activeTab === 'DESPACHO'
                ? 'bg-[#912D26] text-white shadow-sm ring-2 ring-[#912D26]/20'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200/60'
            }`}
          >
            <Clock className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">2. Despacho y Seguridad</span>
          </button>

          {/* Fila 2 - Columna 1 */}
          <button
            type="button"
            onClick={() => setActiveTab('KILOMETRAJE')}
            className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition-all w-full text-center ${
              activeTab === 'KILOMETRAJE'
                ? 'bg-blue-700 text-white shadow-sm ring-2 ring-blue-700/20'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200/60'
            }`}
          >
            <Gauge className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">3. Kilometraje y Km</span>
          </button>

          {/* Fila 2 - Columna 2 */}
          <button
            type="button"
            onClick={() => setActiveTab('MANTENIMIENTO')}
            className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition-all w-full text-center ${
              activeTab === 'MANTENIMIENTO'
                ? 'bg-amber-500 text-slate-950 shadow-sm ring-2 ring-amber-500/20'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200/60'
            }`}
          >
            <Wrench className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">4. Taller Hino AK (19)</span>
          </button>
        </div>
      </div>

      <main className="flex-1 overflow-y-auto pb-8 px-4 py-4 space-y-4">
        
        {/* ─── PESTAÑA 1: TURNOS Y FRECUENCIAS DE VEHÍCULOS TIPO (VT) ─── */}
        {activeTab === 'TURNOS' && (
          <div className="space-y-3">
            <div className="bg-white rounded-2xl p-3 border border-[#D6D6D6] flex items-center justify-between shadow-xs">
              <div>
                <p className="text-xs font-black text-slate-800 uppercase tracking-tight">
                  Matriz Operativa de Turnos Rotativos
                </p>
                <p className="text-[11px] text-gray-500">
                  Configura los horarios e itinerarios de salida de cada vehículo tipo
                </p>
              </div>
              <Badge className="bg-[#912D26] text-white text-[10px] font-bold">
                {vts.length} VTs en Cooperativa
              </Badge>
            </div>

            {vts.length === 0 && (
          <div className="text-center py-12 text-[#3A3A3A]/50">
            <p className="text-sm">No hay VTs configurados</p>
            <p className="text-xs mt-1">Ejecuta el seed de VTs primero</p>
          </div>
        )}

        {vts.map(vt => {
          const isExpanded = expandedVt === vt.id;
          const frecs = editFrecuencias[vt.id] || [];
          return (
            <Card key={vt.id} className="rounded-2xl border border-[#D6D6D6] bg-white overflow-hidden">
              <CardContent className="p-0">
                {/* VT Header */}
                <button
                  type="button"
                  onClick={() => toggleExpand(vt.id)}
                  className="w-full flex items-center justify-between p-4 hover:bg-[#F5F5F5] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold ${
                      vt.activo ? 'bg-[#912D26] text-white' : 'bg-[#D6D6D6] text-[#3A3A3A]/60'
                    }`}>
                      {vt.codigo.replace('VT', '')}
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-[#3A3A3A]">{vt.codigo}</p>
                      <p className="text-xs text-[#3A3A3A]/60">{frecs.length} frecuencias</p>
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-[#3A3A3A]/40" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-[#3A3A3A]/40" />
                  )}
                </button>

                {/* Expanded: Frecuencias list */}
                {isExpanded && (
                  <div className="border-t border-[#D6D6D6] p-4 space-y-3">
                    {frecs.length === 0 && (
                      <p className="text-sm text-[#3A3A3A]/50 text-center py-4">Sin frecuencias</p>
                    )}

                    {frecs.map((f, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-xs font-medium text-[#3A3A3A]/40 w-6">{i + 1}</span>
                        <div className="flex-1 flex items-center gap-2">
                          <Input
                            value={f.routeFrom}
                            onChange={e => updateFrecuencia(vt.id, i, 'routeFrom', e.target.value)}
                            className="h-9 rounded-lg text-xs border-[#D6D6D6] flex-1"
                            placeholder="Origen"
                          />
                          <span className="text-[#3A3A3A]/30">→</span>
                          <Input
                            value={f.routeTo}
                            onChange={e => updateFrecuencia(vt.id, i, 'routeTo', e.target.value)}
                            className="h-9 rounded-lg text-xs border-[#D6D6D6] flex-1"
                            placeholder="Destino"
                          />
                          <Input
                            value={f.time}
                            onChange={e => updateFrecuencia(vt.id, i, 'time', e.target.value)}
                            className="h-9 rounded-lg text-xs border-[#D6D6D6] w-20"
                            placeholder="HH:MM"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeFrecuencia(vt.id, i)}
                            className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50 flex-shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}

                    <div className="flex items-center gap-2 pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addFrecuencia(vt.id)}
                        className="h-9 rounded-xl text-xs border-dashed border-[#D6D6D6] text-[#3A3A3A]/60 flex-1"
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" />
                        Agregar frecuencia
                      </Button>
                      <Button
                        type="button"
                        onClick={() => handleSave(vt.id)}
                        disabled={saving === vt.id}
                        className="h-9 rounded-xl bg-[#912D26] hover:bg-[#7A2520] text-white text-xs font-semibold px-4"
                      >
                        <Save className="w-3.5 h-3.5 mr-1" />
                        {saving === vt.id ? '...' : 'Guardar'}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
        
          </div>
        )}

        {/* ─── PESTAÑA 2: REGLAS DE DESPACHO Y PROMOCIÓN COMERCIAL VIAJE GRATIS ─── */}
        {activeTab === 'DESPACHO' && (
          <div className="space-y-4">
            {/* Tiempos de Viaje y Bloqueo */}
            {/* ─── Control de Tiempos Límites de Venta por Frecuencia ─── */}
        <Card className="border border-[#D6D6D6] shadow-sm rounded-2xl">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center gap-2 text-[#912D26]">
              <Clock className="w-5 h-5" />
              <h2 className="text-base font-bold text-[#3A3A3A]">Tiempos Límites de Venta por Frecuencia</h2>
            </div>
            <p className="text-xs text-[#3A3A3A]/70 leading-relaxed">
              Desactiva automáticamente nuevas ventas al cumplirse el tiempo prudente de viaje para evitar mezclar boletos entre vueltas consecutivas. Cinco minutos antes del cierre se muestra una advertencia al ayudante. Las demás funciones (arqueo, consulta) permanecen siempre activas.
            </p>

            {/* Troncal Loja - Vilcabamba */}
            <div className="bg-gray-50 rounded-xl p-3 border border-gray-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-800">Ruta Loja ↔ Vilcabamba</span>
                <span className="text-[10px] font-semibold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">Troncal Corta</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-[#3A3A3A]/70">Minutos Advertencia</Label>
                  <Input
                    type="number"
                    min={30}
                    max={180}
                    value={tiempoConfig.tiempoAlertaCorta}
                    onChange={e => setTiempoConfig(prev => ({ ...prev, tiempoAlertaCorta: parseInt(e.target.value) || 85 }))}
                    className="h-10 rounded-lg text-sm border-[#D6D6D6]"
                  />
                  <span className="text-[10px] text-gray-400">Por defecto: 85 min</span>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-[#3A3A3A]/70">Minutos Bloqueo Venta</Label>
                  <Input
                    type="number"
                    min={35}
                    max={200}
                    value={tiempoConfig.tiempoLimiteCorta}
                    onChange={e => setTiempoConfig(prev => ({ ...prev, tiempoLimiteCorta: parseInt(e.target.value) || 90 }))}
                    className="h-10 rounded-lg text-sm border-[#D6D6D6]"
                  />
                  <span className="text-[10px] text-gray-400">Por defecto: 90 min</span>
                </div>
              </div>
            </div>

            {/* Rutas Extendidas */}
            <div className="bg-gray-50 rounded-xl p-3 border border-gray-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-800">Rutas Extendidas (Yangana, El Tambo, Zahuayco, La Elvira)</span>
                <span className="text-[10px] font-semibold bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">Larga Distancia</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-[#3A3A3A]/70">Minutos Advertencia</Label>
                  <Input
                    type="number"
                    min={60}
                    max={240}
                    value={tiempoConfig.tiempoAlertaExtendida}
                    onChange={e => setTiempoConfig(prev => ({ ...prev, tiempoAlertaExtendida: parseInt(e.target.value) || 135 }))}
                    className="h-10 rounded-lg text-sm border-[#D6D6D6]"
                  />
                  <span className="text-[10px] text-gray-400">Por defecto: 135 min</span>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-[#3A3A3A]/70">Minutos Bloqueo Venta</Label>
                  <Input
                    type="number"
                    min={65}
                    max={260}
                    value={tiempoConfig.tiempoLimiteExtendida}
                    onChange={e => setTiempoConfig(prev => ({ ...prev, tiempoLimiteExtendida: parseInt(e.target.value) || 140 }))}
                    className="h-10 rounded-lg text-sm border-[#D6D6D6]"
                  />
                  <span className="text-[10px] text-gray-400">Por defecto: 140 min</span>
                </div>
              </div>
            </div>

            {/* Guardar Tiempos */}
            <Button
              onClick={() => {
                saveTiempoVentaConfig(tiempoConfig);
                toast({ title: 'Guardado', description: 'Tiempos de viaje por frecuencia actualizados correctamente' });
              }}
              className="w-full h-10 rounded-xl bg-[#912D26] hover:bg-[#7A2520] text-white text-sm font-semibold"
            >
              <Save className="w-4 h-4 mr-1" />
              GUARDAR TIEMPOS DE VIAJE
            </Button>
          </CardContent>
        </Card>

        

            {/* Viaje Gratis y Ticket Térmico */}
            {/* ─── VIAJE GRATIS Config ─── */}
        <Card className="rounded-2xl border border-[#D6D6D6] bg-white overflow-hidden">
          <CardContent className="p-0">
            <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-[#912D26]/5 to-transparent">
              <div className="w-10 h-10 rounded-xl bg-[#912D26] text-white flex items-center justify-center">
                <Gift className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-[#3A3A3A]">VIAJE GRATIS</p>
                <p className="text-xs text-[#3A3A3A]/60">Promoción de pasaje gratuito por frecuencia</p>
              </div>
            </div>
            <div className="p-4 space-y-4">
              {/* Activar toggle */}
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium text-[#3A3A3A]">Promoción activa</Label>
                <Switch
                  checked={promoConfig.activa}
                  onCheckedChange={(checked) => setPromoConfig(prev => ({ ...prev, activa: checked }))}
                />
              </div>

              {/* Rango de posición ganadora */}
              {promoConfig.activa && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-[#3A3A3A]/60">Posición mínima</Label>
                      <Input
                        type="number"
                        min={1}
                        value={promoConfig.rangoMin ?? ''}
                        onChange={e => {
                          const val = e.target.value;
                          setPromoConfig(prev => ({
                            ...prev,
                            rangoMin: val === '' ? ('' as any) : parseInt(val, 10),
                          }));
                        }}
                        onBlur={() => {
                          setPromoConfig(prev => {
                            const parsed = parseInt(String(prev.rangoMin), 10);
                            return { ...prev, rangoMin: Math.max(1, isNaN(parsed) ? 1 : parsed) };
                          });
                        }}
                        className="h-10 rounded-lg text-sm border-[#D6D6D6]"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-[#3A3A3A]/60">Posición máxima</Label>
                      <Input
                        type="number"
                        min={1}
                        value={promoConfig.rangoMax ?? ''}
                        onChange={e => {
                          const val = e.target.value;
                          setPromoConfig(prev => ({
                            ...prev,
                            rangoMax: val === '' ? ('' as any) : parseInt(val, 10),
                          }));
                        }}
                        onBlur={() => {
                          setPromoConfig(prev => {
                            const minVal = parseInt(String(prev.rangoMin), 10) || 1;
                            const parsed = parseInt(String(prev.rangoMax), 10);
                            return { ...prev, rangoMax: Math.max(minVal, isNaN(parsed) ? 30 : parsed) };
                          });
                        }}
                        className="h-10 rounded-lg text-sm border-[#D6D6D6]"
                      />
                    </div>
                  </div>

                  {/* Texto publicidad SaaS Oficial */}
                  <div className="space-y-1.5 p-3 rounded-xl bg-amber-50/70 border border-amber-200">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-amber-950">
                        Texto Publicitario Oficial SaaS (Pie de Boleto Premiado)
                      </Label>
                      <Badge className="bg-amber-200 text-amber-900 text-[10px] py-0 px-2 font-bold">
                        Exclusivo SuperAdmin
                      </Badge>
                    </div>
                    <Textarea
                      value={promoConfig.textoPublicidad}
                      onChange={e => setPromoConfig(prev => ({ ...prev, textoPublicidad: e.target.value }))}
                      className="rounded-lg text-sm border-amber-300 bg-white min-h-[55px]"
                      rows={2}
                      placeholder="ej. Quieres RutaGo? 0997149000"
                    />
                    <span className="text-[10px] text-amber-800/80 block">
                      Canal de venta viral de suscripciones ($20/mes): este texto se imprime obligatoriamente al pie de los boletos ganadores en todas las unidades.
                    </span>
                  </div>

                  {/* Sonido ganador */}
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium text-[#3A3A3A]">Sonido al ganar</Label>
                    <Switch
                      checked={promoConfig.sonidoGanador}
                      onCheckedChange={(checked) => setPromoConfig(prev => ({ ...prev, sonidoGanador: checked }))}
                    />
                  </div>
                </>
              )}

              {/* Guardar */}
              <Button
                onClick={() => {
                  const minVal = Math.max(1, parseInt(String(promoConfig.rangoMin), 10) || 1);
                  const maxVal = Math.max(minVal, parseInt(String(promoConfig.rangoMax), 10) || 30);
                  const sanitized = { ...promoConfig, rangoMin: minVal, rangoMax: maxVal };
                  savePromoConfig(sanitized);
                  toast({ title: 'Guardado', description: `Configuración de Viaje Gratis actualizada (Pasajero ${minVal} al ${maxVal})` });
                }}
                className="w-full h-10 rounded-xl bg-[#912D26] hover:bg-[#7A2520] text-white text-sm font-semibold"
              >
                <Save className="w-4 h-4 mr-1" />
                GUARDAR
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ─── PENDIENTE CRÍTICO #1: SEGURIDAD Y VINCULACIÓN DE DISPOSITIVO FÍSICO (DEVICE BINDING) ─── */}
        <Card className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
          <CardContent className="p-0">
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                  <Smartphone className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="font-bold text-sm text-white">Vinculación de Dispositivo Físico</p>
                  <p className="text-[11px] text-slate-300">Device Binding para Ayudantes de Cobro</p>
                </div>
              </div>
              <Badge className={deviceBindingEnabled ? 'bg-emerald-500 text-white font-bold text-[10px]' : 'bg-slate-700 text-slate-300 font-normal text-[10px]'}>
                {deviceBindingEnabled ? 'ENFORCED (ACTIVO)' : 'LIBRE (DESACTIVADO)'}
              </Badge>
            </div>

            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="space-y-0.5 pr-3">
                  <Label htmlFor="switch-device-binding" className="text-xs font-bold text-slate-900 block cursor-pointer">
                    Exigir Teléfono Oficial Único por Ayudante
                  </Label>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    {deviceBindingEnabled
                      ? 'Activado: Cada ayudante queda bloqueado a su teléfono oficial. No se permiten inicios de sesión paralelos.'
                      : 'Desactivado (Por Defecto): Los ayudantes pueden acceder desde cualquier teléfono con solo su PIN de 4 dígitos.'}
                  </p>
                </div>
                <Switch
                  id="switch-device-binding"
                  checked={deviceBindingEnabled}
                  disabled={savingDeviceBinding}
                  onCheckedChange={handleToggleDeviceBinding}
                />
              </div>

              <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 text-[11px] text-emerald-950 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                  <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>¿Cómo opera este blindaje de seguridad?</span>
                </div>
                <p className="leading-relaxed text-emerald-900/90">
                  No requiere lector de huella dactilar física. Funciona mediante un identificador invisible generado en el almacenamiento local del teléfono del bus. Si alguien intenta abrir sesión desde otro equipo o computadora con el PIN del ayudante, el sistema rechaza el acceso con error 403 y alerta en pantalla.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
          </div>
        )}

        {/* ─── PESTAÑA 3: CALIBRACIÓN OFICIAL DE KILOMETRAJE Y TOLERANCIAS ─── */}
        {activeTab === 'KILOMETRAJE' && (
          <div className="space-y-4">
            {/* ─── FASE A: Calibración Oficial de Kilometraje por Ruta (Base Odómetro) ─── */}
        <Card className="rounded-2xl border border-[#D6D6D6] bg-white overflow-hidden">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-700 text-white flex items-center justify-center shrink-0">
                <Gauge className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-[#3A3A3A] text-sm">CALIBRACIÓN OFICIAL DE KILOMETRAJE</p>
                <p className="text-xs text-[#3A3A3A]/60">Base para validación semafórica de odómetro y mantenimientos</p>
              </div>
              <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full shrink-0">
                SuperAdmin
              </span>
            </div>

            <div className="space-y-3">
              {[
                { label: 'Loja ↔ Vilcabamba', idaId: 'LOJA_VILCA_IDA', retId: 'VILCA_LOJA_RET', origen: 'Loja', destino: 'Vilcabamba' },
                { label: 'Loja ↔ El Tambo', idaId: 'LOJA_TAMBO_IDA', retId: 'TAMBO_LOJA_RET', origen: 'Loja', destino: 'El Tambo' },
                { label: 'Loja ↔ Yangana', idaId: 'LOJA_YANG_IDA', retId: 'YANG_LOJA_RET', origen: 'Loja', destino: 'Yangana' },
                { label: 'Loja ↔ La Elvira', idaId: 'LOJA_ELVIRA_IDA', retId: 'ELVIRA_LOJA_RET', origen: 'Loja', destino: 'La Elvira' },
                { label: 'Loja ↔ Zahuayco', idaId: 'LOJA_ZAHU_IDA', retId: 'ZAHU_LOJA_RET', origen: 'Loja', destino: 'Zahuayco' },
              ].map(group => {
                const tramoIda = rutasKmConfig.tramos.find(t => t.id === group.idaId);
                const tramoRet = rutasKmConfig.tramos.find(t => t.id === group.retId);
                return (
                  <div key={group.idaId} className="bg-gray-50 rounded-xl p-3 border border-gray-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-800">{group.label}</span>
                      <button
                        type="button"
                        onClick={() => handleCopiarIdaARetorno(group.origen, group.destino)}
                        className="text-[10px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded border border-blue-200 active:scale-95 transition-all"
                      >
                        = Copiar Ida a Retorno
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[11px] font-medium text-gray-600 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span> [Ida] {group.origen} ➔ {group.destino}
                        </Label>
                        <div className="relative">
                          <Input
                            type="number"
                            step="0.1"
                            value={tramoIda?.distanciaKm ?? 0}
                            onChange={e => handleUpdateTramoKm(group.idaId, parseFloat(e.target.value) || 0)}
                            className="h-9 rounded-lg text-xs font-bold text-gray-800 bg-white pr-7 border-gray-300"
                          />
                          <span className="absolute right-2 top-2 text-[10px] text-gray-400 font-bold">km</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] font-medium text-gray-600 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span> [Retorno] {group.destino} ➔ {group.origen}
                        </Label>
                        <div className="relative">
                          <Input
                            type="number"
                            step="0.1"
                            value={tramoRet?.distanciaKm ?? 0}
                            onChange={e => handleUpdateTramoKm(group.retId, parseFloat(e.target.value) || 0)}
                            className="h-9 rounded-lg text-xs font-bold text-gray-800 bg-white pr-7 border-gray-300"
                          />
                          <span className="absolute right-2 top-2 text-[10px] text-gray-400 font-bold">km</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Parámetros Globales de Tolerancia y Anti-Outlier */}
            <div className="bg-blue-50/50 rounded-xl p-3 border border-blue-100 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-900">Parámetros Globales de Tolerancia</span>
                <span className="text-[10px] text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full font-medium">Anti-Error de Dedo</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] font-medium text-gray-700">Margen Elástico Superior</Label>
                  <div className="flex items-center gap-1">
                    {[15, 20, 25, 30].map(pct => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => setRutasKmConfig(prev => ({ ...prev, toleranciaDefectoPorciento: pct }))}
                        className={`text-[10px] font-bold px-1.5 py-1 rounded flex-1 transition-all ${
                          rutasKmConfig.toleranciaDefectoPorciento === pct
                            ? 'bg-blue-700 text-white'
                            : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        +{pct}%
                      </button>
                    ))}
                  </div>
                  <span className="text-[10px] text-gray-500">Umbral verde antes de advertencia</span>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-medium text-gray-700">Tope Máximo Jornada (km)</Label>
                  <Input
                    type="number"
                    value={rutasKmConfig.maxSaltoDiarioKm}
                    onChange={e => setRutasKmConfig(prev => ({ ...prev, maxSaltoDiarioKm: parseInt(e.target.value) || 600 }))}
                    className="h-8 rounded-lg text-xs font-bold bg-white border-gray-300"
                  />
                  <span className="text-[10px] text-gray-500">Candado rojo bloqueante (default: 600)</span>
                </div>
              </div>
            </div>

            {/* Botones de acción */}
            <div className="flex items-center gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={handleRestablecerRutasKm}
                className="h-10 rounded-xl text-xs font-bold border-gray-300 text-gray-600 hover:bg-gray-100 flex-1"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1 text-gray-500" />
                Fábrica
              </Button>
              <Button
                type="button"
                onClick={handleSaveRutasKm}
                disabled={savingRutasKm}
                className="h-10 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold px-4 flex-[2] shadow-sm active:scale-95"
              >
                <Save className="w-4 h-4 mr-1.5" />
                {savingRutasKm ? 'Guardando...' : 'GUARDAR Y REPLICAR FLOTA'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ─── FASE 1: Catálogo Maestro Institucional Hino AK (SuperAdmin 9999) ─── */}
        
          </div>
        )}

        {/* ─── PESTAÑA 4: BIBLIOTECA MAESTRA DE MANTENIMIENTO HINO AK (19 ÍTEMS) ─── */}
        {activeTab === 'MANTENIMIENTO' && (
          <div className="space-y-4">
            <SuperAdminMantenimientoTab />
          </div>
        )}
      </main>
    </div>
  );
}
