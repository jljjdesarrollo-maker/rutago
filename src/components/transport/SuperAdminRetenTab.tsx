'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Calendar,
  Clock,
  Bus,
  Save,
  RotateCcw,
  Sparkles,
  Info,
  CheckCircle2,
  Wrench,
  Search,
  Zap,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import {
  getConfiguracionFlotaLocal,
  guardarConfiguracionLocal,
} from '@/lib/vt-ventanas-storage';
import { getAllBuses, BusItem } from '@/lib/fleet-storage';
import { FlotaConfiguracionCompleta } from '@/types/vt-ventanas';

interface SuperAdminRetenTabProps {
  onConfigSaved?: () => void;
}

export function SuperAdminRetenTab({ onConfigSaved }: SuperAdminRetenTabProps) {
  const { toast } = useToast();
  const [config, setConfig] = useState<FlotaConfiguracionCompleta>(() => getConfiguracionFlotaLocal());

  const [modoReten, setModoReten] = useState<boolean>(() => config.modoRetenActivo ?? false);
  const [fechaInicio, setFechaInicio] = useState<string>(() => config.fechaInicioReten || '2026-10-01');
  const [busAncla, setBusAncla] = useState<string>(() => config.busAnclaReten || 'BUS-01');
  const [busFiltro, setBusFiltro] = useState<string>('TODOS');
  const [guardando, setGuardando] = useState<boolean>(false);

  // Lista de buses registrados
  const buses: BusItem[] = useMemo(() => {
    return getAllBuses();
  }, []);

  // Generar simulación de los próximos 16 días
  const simulacionDias = useMemo(() => {
    if (!fechaInicio) return [];
    const resultados = [];
    const fechaBase = new Date(fechaInicio + 'T12:00:00');

    // Total de buses en rotación (16 unidades oficiales)
    const totalBuses = Math.max(16, buses.length);

    // Mapeo numérico del bus ancla (ej: BUS-01 -> 1)
    let indexAncla = 0;
    const match = busAncla.match(/\d+/);
    if (match) {
      indexAncla = Math.max(0, parseInt(match[0], 10) - 1);
    }

    for (let diaOffset = 0; diaOffset < 16; diaOffset++) {
      const fechaActual = new Date(fechaBase);
      fechaActual.setDate(fechaActual.getDate() + diaOffset);
      const fechaStr = fechaActual.toISOString().split('T')[0];

      // Índice del bus que descansa ese día (retén)
      const busRetenIndex = (indexAncla + diaOffset) % totalBuses;
      const busRetenNumero = busRetenIndex + 1;
      const busRetenCodigo = `BUS-${String(busRetenNumero).padStart(2, '0')}`;
      const busRetenDisco = String(busRetenNumero).padStart(2, '0');

      // Asignar los otros 15 buses a los 15 VTs (VT01 a VT15)
      const asignaciones = [];
      let vtNum = 1;
      for (let i = 0; i < totalBuses; i++) {
        const bIndex = (indexAncla + diaOffset + i) % totalBuses;
        if (bIndex === busRetenIndex) continue; // Este bus descansa
        const num = bIndex + 1;
        asignaciones.push({
          busId: `BUS-${String(num).padStart(2, '0')}`,
          disco: String(num).padStart(2, '0'),
          vtCodigo: `VT${String(vtNum).padStart(2, '0')}`,
        });
        vtNum++;
        if (vtNum > 15) break;
      }

      resultados.push({
        diaNumero: diaOffset + 1,
        fecha: fechaStr,
        diaSemana: fechaActual.toLocaleDateString('es-EC', { weekday: 'short' }),
        busReten: {
          id: busRetenCodigo,
          disco: busRetenDisco,
        },
        asignaciones,
      });
    }

    return resultados;
  }, [fechaInicio, busAncla, buses]);

  // Guardar y notificar a la flota vía API
  const handleGuardarReten = async () => {
    setGuardando(true);
    try {
      const res = await fetch('/api/config/vt-full', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modoRetenActivo: modoReten,
          fechaInicioReten: fechaInicio,
          busAnclaReten: busAncla,
        }),
      });

      if (!res.ok) throw new Error('Error al sincronizar con el servidor');

      const data = await res.json();
      if (data.success && data.data) {
        // Actualizar almacenamiento local instantáneamente (0ms)
        guardarConfiguracionLocal(data.data);
        setConfig(data.data);

        toast({
          title: '🚀 Flota Sincronizada Exitosamente',
          description: `Configuración actualizada a versión ${data.data.version}. Notificada a toda la flota en 0ms.`,
        });

        if (onConfigSaved) onConfigSaved();
      }
    } catch (err) {
      toast({
        title: 'Error de sincronización',
        description: err instanceof Error ? err.message : 'No se pudo guardar la configuración',
        variant: 'destructive',
      });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* ─── TARJETA PRINCIPAL DE CONTROL DE RETÉN ─── */}
      <Card className="rounded-3xl border-slate-200 shadow-sm overflow-hidden bg-white">
        <CardContent className="p-5 sm:p-6 space-y-5">
          {/* Cabecera con Badge de Versión */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                modoReten ? 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/20' : 'bg-slate-100 text-slate-600'
              }`}>
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                    Administración de Retén y Ciclo de Flota
                  </h3>
                  <Badge className="bg-slate-900 text-white font-mono text-[10px]">
                    v{config.version || 1}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Control centralizado del día de descanso y mantenimiento preventivo mayor
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border ${
                modoReten
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}>
                <span className={`w-2 h-2 rounded-full ${modoReten ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                {modoReten ? 'Ciclo Activo (16 Días)' : 'Ciclo Inactivo (15 Días)'}
              </span>
            </div>
          </div>

          {/* Formulario de Configuración del Modo Retén */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* 1. Switch Maestro */}
            <div className={`p-4 rounded-2xl border transition-all ${
              modoReten ? 'bg-emerald-50/60 border-emerald-200' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs font-black text-slate-900 block">
                    Modo Retén
                  </Label>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    {modoReten ? '1 bus descansa cada día' : '15 turnos continuos'}
                  </span>
                </div>
                <Switch
                  checked={modoReten}
                  onCheckedChange={setModoReten}
                />
              </div>
            </div>

            {/* 2. Fecha de Inicio */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <Label className="text-xs font-black text-slate-900 block">
                Fecha de Inicio del Retén
              </Label>
              <Input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="h-9 rounded-xl text-xs font-bold bg-white border-slate-300"
              />
              <span className="text-[10px] text-slate-400 block">
                Punto cero para el cálculo de la rotación
              </span>
            </div>

            {/* 3. Bus Ancla Inicial */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <Label className="text-xs font-black text-slate-900 block">
                Bus Ancla de Inicio
              </Label>
              <select
                value={busAncla}
                onChange={(e) => setBusAncla(e.target.value)}
                className="w-full h-9 px-3 rounded-xl text-xs font-bold bg-white border border-slate-300 text-slate-800 focus:outline-hidden"
              >
                {Array.from({ length: 16 }).map((_, i) => {
                  const num = String(i + 1).padStart(2, '0');
                  const codigo = `BUS-${num}`;
                  return (
                    <option key={codigo} value={codigo}>
                      Bus {num} (Disco {num})
                    </option>
                  );
                })}
              </select>
              <span className="text-[10px] text-slate-400 block">
                Unidad que inicia el primer Día de Retén
              </span>
            </div>
          </div>

          {/* Explicación Operativa (31 Normas Cooperativas) */}
          <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-2">
            <div className="flex items-center gap-2 text-xs font-black text-amber-400">
              <Sparkles className="w-4 h-4" />
              <span>Reglas Oficiales del Ciclo de Retén (Transportes Vilcabamba Turis)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-300 leading-relaxed">
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                <strong className="text-emerald-300 block mb-0.5">🟢 Mientras esté Inactivo (Actual):</strong>
                La cooperativa opera los 15 VTs de forma continua cada 15 días. Las unidades aprovechan las ventanas diurnas de 3h 10m en Loja para fosa y lubricadora sin perder carreras.
              </div>
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                <strong className="text-amber-300 block mb-0.5">🛡️ Al Activar el Retén (En 2 meses):</strong>
                La flota pasa al ciclo de 16 días. Cada día una unidad física tiene su <strong>Día de Retén Libre (0 km rodados)</strong> para paradas mayores de fosa (embrague 100k, muelles) o descanso del chofer.
              </div>
            </div>
          </div>

          {/* Botón de Guardado y Sincronización Global */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <div className="text-xs text-slate-500">
              Fingerprint: <strong className="font-mono text-slate-700">{config.hash || 'vt-default'}</strong>
            </div>
            <Button
              onClick={handleGuardarReten}
              disabled={guardando}
              className="h-11 px-5 rounded-2xl bg-[#053225] hover:bg-[#073b2d] text-white font-black text-xs shadow-md flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{guardando ? 'Sincronizando...' : 'Guardar y Sincronizar Flota (Bump Version)'}</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ─── SIMULADOR INTERACTIVO DEL CICLO (PRÓXIMOS 16 DÍAS) ─── */}
      <Card className="rounded-3xl border-slate-200 shadow-sm bg-white overflow-hidden">
        <CardContent className="p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h4 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-800" />
                <span>Simulador de Rotación del Ciclo (16 Días)</span>
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Proyección exacta de qué unidad física descansa y cuáles cubren los VTs oficiales
              </p>
            </div>

            {/* Filtro Rápido por Unidad */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-bold whitespace-nowrap">Resaltar Unidad:</span>
              <select
                value={busFiltro}
                onChange={(e) => setBusFiltro(e.target.value)}
                className="h-8 px-2.5 rounded-xl text-xs font-bold bg-slate-100 border border-slate-200 text-slate-800 focus:outline-hidden"
              >
                <option value="TODOS">Todas las Unidades</option>
                {Array.from({ length: 16 }).map((_, i) => {
                  const num = String(i + 1).padStart(2, '0');
                  return (
                    <option key={num} value={num}>
                      Bus {num}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Cuadrícula Interactiva de los 16 Días */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {simulacionDias.map((dia) => {
              const esBusFiltradoReten = busFiltro !== 'TODOS' && dia.busReten.disco === busFiltro;

              return (
                <div
                  key={dia.diaNumero}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    esBusFiltradoReten
                      ? 'bg-amber-500/10 border-amber-500 shadow-md ring-2 ring-amber-400'
                      : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
                    <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                      <span className="w-6 h-6 rounded-lg bg-slate-900 text-white flex items-center justify-center font-mono text-[11px]">
                        {dia.diaNumero}
                      </span>
                      <span>{dia.fecha}</span>
                      <span className="text-[10px] text-slate-400 capitalize">({dia.diaSemana})</span>
                    </span>
                  </div>

                  {/* Unidad en Retén */}
                  <div className="mt-2.5 p-2.5 rounded-xl bg-white border border-emerald-200/80 shadow-2xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1">
                        <Wrench className="w-3 h-3 text-emerald-600" />
                        Día de Retén Libre
                      </span>
                      <Badge className="bg-emerald-600 text-white font-mono text-[9px] px-1.5 py-0">
                        0 KM
                      </Badge>
                    </div>
                    <div className="text-sm font-black text-slate-900 flex items-center gap-2">
                      <span className="text-emerald-700">Bus {dia.busReten.disco}</span>
                      <span className="text-[10px] text-slate-500 font-medium">(Taller / Fosa)</span>
                    </div>
                  </div>

                  {/* Resumen de los otros 15 buses */}
                  <div className="mt-2 text-[10px] text-slate-500 flex items-center justify-between">
                    <span>15 unidades en ruta</span>
                    <span className="font-mono font-bold text-slate-700">VT01 a VT15</span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
