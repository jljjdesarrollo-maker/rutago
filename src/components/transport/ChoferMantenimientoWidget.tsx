'use client';

import { useState, useMemo } from 'react';
import {
  Wrench,
  AlertTriangle,
  CheckCircle2,
  Clock,
  RotateCcw,
  Gauge,
  UserCheck,
  Save,
  Check,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { getAllBuses, getActiveBusId, getLatestBusOdometer } from '@/lib/fleet-storage';
import { getCatalogoMaestroGlobal } from '@/lib/mantenimiento-catalogo';
import { type MantenimientoBusItem } from './MantenimientoScreen';

export function ChoferMantenimientoWidget({ onVerMas }: { onVerMas?: () => void }) {
  const { toast } = useToast();

  const [activeBusId] = useState<string>(() => {
    if (typeof window === 'undefined') return 'BUS-01';
    return getActiveBusId();
  });

  const [kmActual, setKmActual] = useState<number>(() => {
    if (typeof window === 'undefined') return 187420;
    const busId = getActiveBusId();
    const busesList = getAllBuses();
    const current = busesList.find(b => b.id === busId);
    const disco = current?.numeroDisco || '01';

    const audited = getLatestBusOdometer(disco);
    if (audited && audited.kmFinal) {
      const num = parseInt(audited.kmFinal, 10);
      if (!isNaN(num) && num > 0) return num;
    }
    const savedKm = localStorage.getItem(`rg_last_km_${busId}`);
    if (savedKm) {
      const num = parseInt(savedKm, 10);
      if (!isNaN(num) && num > 0) return num;
    }
    return 187420;
  });

  // Tareas asignadas al Chofer
  const [items, setItems] = useState<MantenimientoBusItem[]>(() => {
    if (typeof window === 'undefined') return [];
    const busId = getActiveBusId();
    const storageKey = `rg_mantenimientos_v2_${busId}`;
    const saved = localStorage.getItem(storageKey);

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.filter((it: MantenimientoBusItem) => it.asignadoChofer && it.activo);
        }
      } catch (e) {
        console.error(e);
      }
    }

    // Fallback: items pre-asignados al chofer de la biblioteca Hino AK
    const catalogo = getCatalogoMaestroGlobal();
    return catalogo
      .filter(c => c.asignadoChoferPorDefecto)
      .slice(0, 5)
      .map(c => ({
        id: `mbus-${c.id}-default`,
        catalogoId: c.id,
        codigo: c.codigo,
        nombre: c.nombre,
        categoria: c.categoria,
        intervaloKm: c.intervaloKmOficial,
        ultimoKm: 185000,
        fechaUltimo: new Date().toISOString().split('T')[0],
        costoEstimado: 0,
        repuestoDetalle: c.especificacionLubricanteRepuesto,
        asignadoChofer: true,
        activo: true,
      }));
  });

  // Modal rápido de registro para el chofer
  const [modalItem, setModalItem] = useState<MantenimientoBusItem | null>(null);
  const [registroKm, setRegistroKm] = useState<string>('');
  const [registroTaller, setRegistroTaller] = useState<string>('');

  const handleGuardarRegistroChofer = () => {
    if (!modalItem) return;
    const km = parseInt(registroKm, 10);
    if (isNaN(km) || km <= 0) {
      toast({
        title: 'Kilometraje inválido',
        description: 'Ingresa la lectura que marca el velocímetro/tacómetro.',
        variant: 'destructive',
      });
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const storageKey = `rg_mantenimientos_v2_${activeBusId}`;

    // Actualizar en el storage completo del bus
    let fullList: MantenimientoBusItem[] = [];
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) fullList = JSON.parse(saved);
    } catch {}

    const updatedFull = fullList.map(it =>
      it.id === modalItem.id
        ? {
            ...it,
            ultimoKm: km,
            fechaUltimo: today,
            tallerMecanico: registroTaller.trim() || 'Servicio en Ruta (Chofer)',
          }
        : it
    );

    localStorage.setItem(storageKey, JSON.stringify(updatedFull));

    // Actualizar lista local de widget
    setItems(prev =>
      prev.map(it =>
        it.id === modalItem.id
          ? {
              ...it,
              ultimoKm: km,
              fechaUltimo: today,
              tallerMecanico: registroTaller.trim() || 'Servicio en Ruta (Chofer)',
            }
          : it
      )
    );

    toast({
      title: 'Mantenimiento Asentado',
      description: `${modalItem.nombre} registrado con éxito en ${km.toLocaleString()} km.`,
    });
    setModalItem(null);
  };

  const buses = getAllBuses();
  const currentBus = buses.find(b => b.id === activeBusId);
  const disco = currentBus?.numeroDisco || '01';

  // Cálculos semafóricos
  const tareasCalculadas = useMemo(() => {
    return items.map(item => {
      const kmRecorridos = kmActual - item.ultimoKm;
      const kmRestantes = item.intervaloKm - kmRecorridos;
      const esVencido = kmRestantes <= 0;
      const esUrgente = kmRestantes > 0 && kmRestantes <= 800;
      const porcentaje = Math.min(100, Math.max(0, (kmRecorridos / item.intervaloKm) * 100));

      return {
        ...item,
        kmRecorridos,
        kmRestantes,
        esVencido,
        esUrgente,
        porcentaje,
      };
    });
  }, [items, kmActual]);

  const criticosCount = tareasCalculadas.filter(t => t.esVencido).length;
  const proximosCount = tareasCalculadas.filter(t => t.esUrgente).length;

  if (items.length === 0) return null;

  return (
    <Card className="rounded-2xl border-2 border-amber-300/80 bg-gradient-to-br from-amber-50/50 via-white to-amber-50/20 shadow-xs overflow-hidden">
      <CardContent className="p-3.5 space-y-3">
        {/* Cabecera del Widget */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shadow-xs">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-xs text-slate-900 uppercase tracking-tight">
                  Checklist Mecánico Chofer
                </span>
                <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-[9px] px-1.5 py-0 font-extrabold">
                  Bus {disco}
                </Badge>
              </div>
              <p className="text-[10px] text-slate-500 font-medium">
                Tacómetro actual: <strong className="text-slate-800">{kmActual.toLocaleString()} km</strong>
              </p>
            </div>
          </div>

          {criticosCount > 0 ? (
            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-600 text-white flex items-center gap-1 animate-pulse">
              <AlertTriangle className="w-3 h-3" /> {criticosCount} Urgentes
            </span>
          ) : proximosCount > 0 ? (
            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 flex items-center gap-1">
              <Clock className="w-3 h-3" /> {proximosCount} Próximos
            </span>
          ) : (
            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Al Día
            </span>
          )}
        </div>

        {/* Lista de tareas tipo semáforo */}
        <div className="space-y-2">
          {tareasCalculadas.map(tarea => (
            <div
              key={tarea.id}
              className={`p-2.5 rounded-xl border transition-all ${
                tarea.esVencido
                  ? 'bg-rose-50/80 border-rose-300'
                  : tarea.esUrgente
                  ? 'bg-amber-50/60 border-amber-300'
                  : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    {/* Semáforo visual táctil */}
                    <span
                      className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                        tarea.esVencido
                          ? 'bg-rose-600 animate-ping'
                          : tarea.esUrgente
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                    />
                    <h5 className="font-bold text-xs text-slate-900 truncate">
                      {tarea.nombre}
                    </h5>
                  </div>
                  <p className="text-[10px] text-slate-500 pl-4 mt-0.5">
                    {tarea.esVencido ? (
                      <span className="text-rose-700 font-black">
                        ¡VENCIDO! Excedido por {Math.abs(tarea.kmRestantes).toLocaleString()} km
                      </span>
                    ) : (
                      <span>
                        Faltan <strong className="text-slate-800">{tarea.kmRestantes.toLocaleString()} km</strong> (de {tarea.intervaloKm.toLocaleString()} km)
                      </span>
                    )}
                  </p>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setModalItem(tarea);
                    setRegistroKm(kmActual.toString());
                    setRegistroTaller('');
                  }}
                  className={`h-7 px-2 text-[10px] font-black rounded-lg shrink-0 border ${
                    tarea.esVencido
                      ? 'bg-rose-600 text-white border-rose-600 hover:bg-rose-700'
                      : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  Realizado
                </Button>
              </div>

              {/* Micro barra de progreso */}
              <div className="w-full h-1.5 rounded-full bg-gray-100 overflow-hidden mt-2">
                <div
                  className={`h-full rounded-full ${
                    tarea.esVencido
                      ? 'bg-rose-600'
                      : tarea.esUrgente
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                  style={{ width: `${tarea.porcentaje}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {onVerMas && (
          <div className="pt-1 flex justify-end">
            <button
              type="button"
              onClick={onVerMas}
              className="text-[11px] font-bold text-amber-900 hover:text-amber-950 flex items-center gap-1"
            >
              Ver ficha completa del Socio <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </CardContent>

      {/* Modal táctil rápido para el Chofer */}
      {modalItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full max-w-sm bg-white rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="border-b pb-2">
              <div className="flex items-center gap-2">
                <Badge className="bg-amber-500 text-slate-950 text-[10px] font-black">
                  Chofer Bus {disco}
                </Badge>
                <h4 className="font-black text-sm text-slate-900">Registrar Mantenimiento</h4>
              </div>
              <p className="text-xs text-slate-600 mt-1 font-bold">{modalItem.nombre}</p>
            </div>

            <div className="space-y-3">
              <div>
                <Label className="text-xs font-bold text-slate-700 block mb-1">
                  Kilometraje del Tacómetro al Cambiar *
                </Label>
                <Input
                  type="number"
                  value={registroKm}
                  onChange={e => setRegistroKm(e.target.value)}
                  className="h-11 rounded-xl text-base font-black bg-slate-50 border-slate-300"
                />
              </div>

              <div>
                <Label className="text-xs font-bold text-slate-700 block mb-1">
                  Lugar o Taller (Opcional)
                </Label>
                <Input
                  value={registroTaller}
                  onChange={e => setRegistroTaller(e.target.value)}
                  placeholder="ej. Lubricadora Vilcabamba / Mecánica Central"
                  className="h-9 rounded-xl text-xs bg-slate-50 border-slate-300"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Button
                onClick={() => setModalItem(null)}
                variant="ghost"
                className="flex-1 h-11 rounded-xl text-gray-600 font-semibold text-xs"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleGuardarRegistroChofer}
                className="flex-1 h-11 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shadow-sm"
              >
                <Save className="w-4 h-4 mr-1" />
                Asentar Servicio
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
