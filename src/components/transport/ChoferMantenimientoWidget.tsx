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
  Zap,
  X,
  Wind,
  Receipt,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { getAllBuses, getActiveBusId, getLatestBusOdometer } from '@/lib/fleet-storage';
import { getCatalogoMaestroGlobal } from '@/lib/mantenimiento-catalogo';
import { saveOwnerExpense } from '@/lib/owner-expenses-storage';
import { type MantenimientoBusItem } from './MantenimientoScreen';
import { getBusModuloMantenimientoActivo } from '@/lib/mantenimiento-estaciones';

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

    // Si el socio no ha activado expresamente el mantenimiento, no cargar nada por defecto
    if (!getBusModuloMantenimientoActivo(busId)) {
      return [];
    }

    // Fallback si está activado
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

  // Modal de Registro Rápido de Lubricadora (Combo)
  const [isComboModalOpen, setIsComboModalOpen] = useState(false);
  const [comboKm, setComboKm] = useState<string>('');
  const [comboFacturaValor, setComboFacturaValor] = useState<string>('');
  const [comboFacturaNum, setComboFacturaNum] = useState<string>('');
  const [comboTaller, setComboTaller] = useState<string>('Lubricadora Vilcabamba');
  const [comboChecks, setComboChecks] = useState({
    aceite: true,
    filtroAceite: true,
    trampaAgua: true,
    filtroCombustible: true,
    filtroAireSecundario: false, // Desmarcado por defecto según indicación del usuario
    filtroAirePrimario: false,   // Desmarcado por defecto según indicación del usuario
  });

  const comboConfigItems = [
    {
      key: 'aceite' as const,
      codigo: 'MNT-ACEITE-MOT',
      icono: '🛢️',
      nombre: 'Aceite de Motor (Fluido / Galones)',
      detalle: 'Recambio de aceite multigrado SAE 15W-40',
      esFiltroAire: false,
    },
    {
      key: 'filtroAceite' as const,
      codigo: 'MNT-FILT-ACEITE',
      icono: '🔘',
      nombre: 'Filtro de Aceite de Motor',
      detalle: 'Elemento de flujo pleno (C1314 / C5002)',
      esFiltroAire: false,
    },
    {
      key: 'trampaAgua' as const,
      codigo: 'MNT-FILT-TRAMPA',
      icono: '⛽',
      nombre: 'Filtro Separador / Trampa Combustible',
      detalle: 'Cartucho trampa de agua con purga (SF1307)',
      esFiltroAire: false,
    },
    {
      key: 'filtroCombustible' as const,
      codigo: 'MNT-FILT-DIESEL-SEC',
      icono: '⛽',
      nombre: 'Filtro de Combustible (Secundario)',
      detalle: 'Filtro diésel fino de micras (EF1802)',
      esFiltroAire: false,
    },
    {
      key: 'filtroAireSecundario' as const,
      codigo: 'MNT-FILT-AIRE-SEC',
      icono: '💨',
      nombre: 'Filtro Aire Pequeño',
      detalle: 'Cartucho interior de seguridad (~20,000 km / cada 4 cambios)',
      esFiltroAire: true,
    },
    {
      key: 'filtroAirePrimario' as const,
      codigo: 'MNT-FILT-AIRE-GRANDE',
      icono: '💨',
      nombre: 'Filtro Aire Grande',
      detalle: 'Cartucho exterior cilíndrico principal (~40,000 km / cada 8 cambios)',
      esFiltroAire: true,
    },
  ];

  const handleGuardarComboLubricadora = () => {
    const km = parseInt(comboKm, 10);
    if (isNaN(km) || km <= 0) {
      toast({
        title: 'Kilometraje inválido',
        description: 'Ingresa la lectura actual que marca el tacómetro.',
        variant: 'destructive',
      });
      return;
    }

    const itemsSeleccionados = comboConfigItems.filter(ci => comboChecks[ci.key]);
    if (itemsSeleccionados.length === 0) {
      toast({
        title: 'Selecciona al menos un ítem',
        description: 'Debes marcar al menos una tarea realizada en la lubricadora.',
        variant: 'destructive',
      });
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const storageKey = `rg_mantenimientos_v2_${activeBusId}`;
    const catalogo = getCatalogoMaestroGlobal();

    let fullList: MantenimientoBusItem[] = [];
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) fullList = JSON.parse(saved);
    } catch {}

    const tallerStr = comboTaller.trim() || 'Lubricadora Vilcabamba';
    const facturaDetalle = comboFacturaNum.trim() ? `Fac: ${comboFacturaNum.trim()}` : '';
    const tallerCompleto = facturaDetalle ? `${tallerStr} (${facturaDetalle})` : tallerStr;
    const valorFactura = parseFloat(comboFacturaValor) || 0;
    const costoPorItem = valorFactura > 0 ? Math.round((valorFactura / itemsSeleccionados.length) * 100) / 100 : 0;

    itemsSeleccionados.forEach(ci => {
      const index = fullList.findIndex(
        it =>
          it.codigo === ci.codigo ||
          it.nombre.toLowerCase().includes(ci.nombre.toLowerCase()) ||
          (ci.key === 'aceite' && (it.nombre.toLowerCase().includes('aceite') && !it.nombre.toLowerCase().includes('filtro'))) ||
          (ci.key === 'filtroAceite' && it.nombre.toLowerCase().includes('filtro') && it.nombre.toLowerCase().includes('aceite')) ||
          (ci.key === 'trampaAgua' && (it.nombre.toLowerCase().includes('trampa') || it.nombre.toLowerCase().includes('separador'))) ||
          (ci.key === 'filtroCombustible' && it.nombre.toLowerCase().includes('combustible') && it.nombre.toLowerCase().includes('secundario')) ||
          (ci.key === 'filtroAireSecundario' && (it.nombre.toLowerCase().includes('aire pequeño') || it.nombre.toLowerCase().includes('aire secundario'))) ||
          (ci.key === 'filtroAirePrimario' && (it.nombre.toLowerCase().includes('aire grande') || it.nombre.toLowerCase().includes('admisión principal')))
      );

      if (index >= 0) {
        fullList[index] = {
          ...fullList[index],
          ultimoKm: km,
          fechaUltimo: today,
          tallerMecanico: tallerCompleto,
          costoEstimado: costoPorItem > 0 ? costoPorItem : fullList[index].costoEstimado,
        };
      } else {
        const catItem =
          catalogo.find(c => c.codigo === ci.codigo) ||
          catalogo.find(c => c.nombre.toLowerCase().includes(ci.nombre.toLowerCase()));

        fullList.push({
          id: `mbus-${ci.codigo}-${Date.now()}`,
          catalogoId: catItem?.id,
          codigo: ci.codigo,
          nombre: ci.nombre,
          categoria: (catItem?.categoria as any) || (ci.esFiltroAire ? 'SISTEMA_AIRE' : 'SISTEMA_COMBUSTIBLE'),
          intervaloKm:
            catItem?.intervaloKmOficial ||
            (ci.key === 'filtroAirePrimario' ? 40000 : ci.key === 'filtroAireSecundario' ? 20000 : 5000),
          ultimoKm: km,
          fechaUltimo: today,
          tallerMecanico: tallerCompleto,
          costoEstimado: costoPorItem,
          repuestoDetalle: catItem?.especificacionLubricanteRepuesto || ci.detalle,
          asignadoChofer: true,
          activo: true,
        });
      }
    });

    localStorage.setItem(storageKey, JSON.stringify(fullList));

    // Actualizar lista local del widget
    setItems(fullList.filter(it => it.asignadoChofer && it.activo));

    // Guardar en gastos de socio si se ingresó monto
    if (valorFactura > 0) {
      try {
        saveOwnerExpense({
          id: `gasto-lubricadora-${Date.now()}`,
          busId: activeBusId,
          category: 'ACEITES_FILTROS',
          amount: valorFactura,
          date: today,
          description: `Servicio Rápido Lubricadora [${itemsSeleccionados.map(i => i.nombre).join(', ')}]`,
          provider: tallerStr,
          invoiceNumber: comboFacturaNum.trim() || undefined,
          odometerKm: km,
          paidBy: 'CHOFER',
          isFinanced: false,
          createdAt: new Date().toISOString(),
        });
      } catch (err) {
        console.error('Error registrando gasto de socio:', err);
      }
    }

    toast({
      title: '⚡ Servicio de Lubricadora Asentado',
      description: `${itemsSeleccionados.length} ítems asentados con éxito en ${km.toLocaleString()} km (Bus ${disco}).`,
    });

    setIsComboModalOpen(false);
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

  // Si el módulo está apagado por el socio, no renderizar nada
  if (!getBusModuloMantenimientoActivo(activeBusId) || items.length === 0) return null;

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
                  Mantenimientos a Realizar (Conductor)
                </span>
                <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-[9px] px-1.5 py-0 font-extrabold">
                  Bus {disco}
                </Badge>
              </div>
              <p className="text-[10px] text-slate-500 font-medium">
                Tacómetro actual: <strong className="text-slate-800">{kmActual.toLocaleString()} km</strong> • Alimentado del arqueo de llegada
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

        {/* Botón Destacado: REGISTRO RÁPIDO DE LUBRICADORA */}
        <button
          type="button"
          onClick={() => {
            setComboKm(kmActual.toString());
            setComboFacturaValor('');
            setComboFacturaNum('');
            setComboTaller('Lubricadora Vilcabamba');
            setComboChecks({
              aceite: true,
              filtroAceite: true,
              trampaAgua: true,
              filtroCombustible: true,
              filtroAireSecundario: false, // Desmarcado por defecto según indicación del usuario
              filtroAirePrimario: false,   // Desmarcado por defecto según indicación del usuario
            });
            setIsComboModalOpen(true);
          }}
          className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-600 hover:to-amber-500 text-slate-950 font-black text-xs shadow-xs border border-amber-400 flex items-center justify-between transition-all active:scale-[0.99] cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-lg bg-slate-950 text-amber-400 flex items-center justify-center shadow-xs">
              <Zap className="w-3.5 h-3.5 fill-amber-400" />
            </span>
            <div className="text-left">
              <span className="uppercase tracking-tight font-black text-xs block leading-tight">
                Registro Rápido de Lubricadora
              </span>
              <span className="text-[10px] text-slate-800 font-semibold block leading-tight">
                Aceite + Tríada de Filtros en 1 toque
              </span>
            </div>
          </div>
          <Badge className="bg-slate-950 text-amber-400 text-[10px] px-2 py-0.5 font-black border-0 shrink-0">
            Combo ⚡
          </Badge>
        </button>

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

      {/* Modal: REGISTRO RÁPIDO DE LUBRICADORA */}
      {isComboModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            {/* Cabecera del Modal */}
            <div className="flex items-start justify-between border-b pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-xs">
                  <Zap className="w-5 h-5 fill-slate-950" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-black text-sm text-slate-900 uppercase tracking-tight">
                      Registro Rápido de Lubricadora
                    </h3>
                    <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-[9px] px-1.5 py-0 font-extrabold">
                      Bus {disco}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Asentamiento rápido en ruta para el Chofer
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsComboModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tacómetro / Odómetro actual */}
            <div className="bg-amber-50/70 p-3 rounded-2xl border border-amber-200 space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                  <Gauge className="w-3.5 h-3.5 text-amber-700" />
                  Odómetro actual del Tacómetro *
                </Label>
                <span className="text-[10px] text-amber-900 font-bold bg-amber-200/80 px-2 py-0.5 rounded-full">
                  Lectura en Tablero
                </span>
              </div>
              <div className="relative">
                <Input
                  type="number"
                  value={comboKm}
                  onChange={e => setComboKm(e.target.value)}
                  placeholder="ej. 187420"
                  className="h-11 rounded-xl text-lg font-black bg-white border-amber-300 pr-12 text-slate-900"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-extrabold text-slate-500">
                  KM
                </span>
              </div>
            </div>

            {/* Checklist: ¿Qué se realizó en este servicio? */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-900 uppercase tracking-tight">
                  ¿Qué se realizó en este servicio?
                </span>
                <span className="text-[10px] text-slate-500 font-medium">
                  Toca para marcar/desmarcar
                </span>
              </div>

              {/* Lista de Ítems */}
              <div className="space-y-1.5">
                {comboConfigItems.map(ci => {
                  const isChecked = comboChecks[ci.key];

                  return (
                    <div key={ci.key}>
                      {/* Separador visual antes de los filtros de aire */}
                      {ci.key === 'filtroAireSecundario' && (
                        <div className="pt-2 pb-1 flex items-center justify-between">
                          <span className="text-[10px] font-black text-sky-900 uppercase tracking-wider flex items-center gap-1">
                            <Wind className="w-3 h-3 text-sky-600" /> Filtros de Aire (Opcionales)
                          </span>
                          <Badge variant="outline" className="text-[9px] text-sky-700 border-sky-300 bg-sky-50 px-1.5 py-0 font-bold">
                            Desmarcados por defecto
                          </Badge>
                        </div>
                      )}

                      <div
                        onClick={() =>
                          setComboChecks(prev => ({
                            ...prev,
                            [ci.key]: !prev[ci.key],
                          }))
                        }
                        className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2.5 select-none ${
                          isChecked
                            ? ci.esFiltroAire
                              ? 'bg-sky-50/90 border-sky-400 shadow-xs ring-1 ring-sky-300/60'
                              : 'bg-emerald-50/90 border-emerald-400 shadow-xs ring-1 ring-emerald-300/60'
                            : 'bg-slate-50/80 border-slate-200 hover:bg-slate-100/70 text-slate-500'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div
                            className={`w-6 h-6 rounded-lg flex items-center justify-center font-black text-xs shrink-0 transition-all ${
                              isChecked
                                ? ci.esFiltroAire
                                  ? 'bg-sky-600 text-white'
                                  : 'bg-emerald-600 text-white'
                                : 'bg-white border-2 border-slate-300 text-transparent'
                            }`}
                          >
                            <Check className="w-4 h-4 stroke-[3]" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs">{ci.icono}</span>
                              <h5
                                className={`text-xs font-black truncate ${
                                  isChecked
                                    ? ci.esFiltroAire
                                      ? 'text-sky-950'
                                      : 'text-emerald-950'
                                    : 'text-slate-600'
                                }`}
                              >
                                {ci.nombre}
                              </h5>
                            </div>
                            <p className="text-[10px] text-slate-500 truncate mt-0.5">
                              {ci.detalle}
                            </p>
                          </div>
                        </div>

                        <Badge
                          className={`text-[9px] px-1.5 py-0 font-bold shrink-0 ${
                            isChecked
                              ? ci.esFiltroAire
                                ? 'bg-sky-200 text-sky-900 border-sky-300'
                                : 'bg-emerald-200 text-emerald-900 border-emerald-300'
                              : 'bg-slate-200 text-slate-600 border-slate-300'
                          }`}
                        >
                          {isChecked ? 'Incluido' : 'Omitido'}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Guía explicativa para el chofer */}
              <p className="text-[10px] text-slate-500 bg-slate-100 p-2 rounded-xl leading-relaxed">
                ℹ️ <strong>Regla Operativa:</strong> Los 4 ítems estándar de lubricadora vienen
                pre-marcados. Los 2 filtros de aire están <strong>desmarcados</strong>; márcalos con un
                toque si fueron reemplazados en este servicio.
              </p>
            </div>

            {/* Datos opcionales de comprobante / costo */}
            <div className="space-y-2 pt-1 border-t">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Valor Factura ($)
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={comboFacturaValor}
                    onChange={e => setComboFacturaValor(e.target.value)}
                    placeholder="ej. 175.50"
                    className="h-9 rounded-xl text-xs bg-slate-50 border-slate-300"
                  />
                </div>
                <div>
                  <Label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Nº Factura / Nota
                  </Label>
                  <Input
                    value={comboFacturaNum}
                    onChange={e => setComboFacturaNum(e.target.value)}
                    placeholder="ej. 001-002-1458"
                    className="h-9 rounded-xl text-xs bg-slate-50 border-slate-300"
                  />
                </div>
              </div>

              <div>
                <Label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Lugar / Lubricadora
                </Label>
                <Input
                  value={comboTaller}
                  onChange={e => setComboTaller(e.target.value)}
                  placeholder="ej. Lubricadora Vilcabamba / San Pedro"
                  className="h-9 rounded-xl text-xs bg-slate-50 border-slate-300"
                />
              </div>
            </div>

            {/* Botones de acción final */}
            <div className="flex items-center gap-2 pt-1">
              <Button
                type="button"
                onClick={() => setIsComboModalOpen(false)}
                variant="ghost"
                className="flex-1 h-11 rounded-xl text-gray-600 font-bold text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleGuardarComboLubricadora}
                className="flex-1 h-11 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shadow-md flex items-center justify-center gap-1.5"
              >
                <Zap className="w-4 h-4 fill-slate-950" />
                Asentar Servicio (1 Clic)
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
