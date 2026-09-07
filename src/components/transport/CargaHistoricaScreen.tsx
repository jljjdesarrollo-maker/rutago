'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import {
  ArrowLeft,
  Calendar,
  Bus,
  Save,
  RotateCcw,
  Camera,
  X,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Trash2,
  DollarSign,
  Ticket,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { num } from './types';

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

interface SystemFrecuencia {
  id: string;
  nombre: string;
  ruta: string;
  hora: string;
  direccion: string;
}

interface CargaHistoricaScreenProps {
  onBack: () => void;
  onSuccess: () => void;
}

export function CargaHistoricaScreen({ onBack, onSuccess }: CargaHistoricaScreenProps) {
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);
  const [km, setKm] = useState('');
  const [conductor, setConductor] = useState('');
  const [ayudanteNombre, setAyudanteNombre] = useState('');
  const [selectedVtCode, setSelectedVtCode] = useState('');
  const [vts, setVts] = useState<BusVTItem[]>([]);
  const [vtsLoading, setVtsLoading] = useState(true);

  // Frecuencias del día cargadas para el VT seleccionado
  const [frecuencias, setFrecuencias] = useState<FrecuenciaItem[]>([]);

  // Todas las frecuencias del sistema (para reasignar)
  const [allSystemFrecuencias, setAllSystemFrecuencias] = useState<SystemFrecuencia[]>([]);
  const [reassigningOrder, setReassigningOrder] = useState<number | null>(null);

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

  // Estado de envío
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cargar VTs al montar
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/bus-vts');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setVts(data);
          }
        }
      } catch (err) {
        console.error('Error cargando VTs:', err);
      } finally {
        setVtsLoading(false);
      }
    })();
  }, []);

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

  // Al seleccionar un VT, precargar sus frecuencias
  const handleSelectVT = (code: string) => {
    setSelectedVtCode(code);
    const vt = vts.find(v => v.codigo === code);
    if (vt && Array.isArray(vt.frecuencias) && vt.frecuencias.length > 0) {
      const sorted = [...vt.frecuencias].sort((a, b) => (a.time || '').localeCompare(b.time || ''));
      const items: FrecuenciaItem[] = sorted.map((f, idx) => ({
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

  // Manejo de foto del cuaderno
  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setPhotoPreview(result);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Cálculos de totales (idénticos a la regla de negocio y /api/records)
  const totals = useMemo(() => {
    const totalEfectivoReal = frecuencias.reduce(
      (sum, f) => (f.noRealizada ? sum : sum + num(f.efectivoReal)),
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

  // Guardar en la Base de Datos Central
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
      const trips = frecuencias.map(f => ({
        routeFrom: f.noRealizada ? '-' : f.routeFrom,
        routeTo: f.noRealizada ? '-' : f.routeTo,
        time: f.time || null,
        income: f.noRealizada ? 0 : num(f.efectivoReal),
        efectivoReal: f.noRealizada ? 0 : num(f.efectivoReal),
        boletos: 0,
        cajaComunPasajeros: f.noRealizada ? 0 : parseInt(f.cajaComunPasajeros, 10) || 0,
        cajaComunMonto: f.noRealizada ? 0 : num(f.cajaComunMonto),
        tipo: f.noRealizada ? 'no_realizada' : 'frecuencia',
        motivo: f.noRealizada ? f.motivoNoRealizada || 'otro' : null,
      }));

      const body = {
        date,
        km: km || null,
        conductor: conductor.trim() || null,
        ayudanteNombre: ayudanteNombre.trim() || null,
        vtCode: selectedVtCode,
        trips,
        expenses: expenses.filter(e => e.description.trim() !== '').map(e => ({
          description: e.description.trim(),
          amount: num(e.amount),
        })),
        tickets: num(tickets),
        cajaComun: totals.totalCajaComun,
        sobrante: num(sobrante),
        photoUrl: photoPreview || null,
      };

      const res = await fetch('/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'Error del servidor' }));
        throw new Error(errData.error || 'Error al guardar el registro histórico');
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
            <p className="text-[11px] text-red-200">Fase 1 · Alimentación Directa VT</p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-mono font-bold">
            v3.49.0
          </span>
        </div>
      </header>

      {/* Contenido scrolleable con zona del pulgar respetada */}
      <main className="flex-1 px-4 py-4 pb-32 max-w-lg mx-auto w-full space-y-4">
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
          <CardHeader className="py-3 px-4 bg-gray-50 border-b border-gray-100">
            <CardTitle className="text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-[#912D26]" />
              1. Identificación del Día y Unidad
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
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
                        {v.codigo} ({v.nombre})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-3.5 pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium text-gray-600">Chofer (Opcional)</Label>
                <Input
                  placeholder="Ej: Wilson"
                  value={conductor}
                  onChange={e => setConductor(e.target.value)}
                  className="mt-1 h-10 rounded-xl text-xs"
                />
              </div>
              <div>
                <Label className="text-xs font-medium text-gray-600">Ayudante (Opcional)</Label>
                <Input
                  placeholder="Ej: Carlos"
                  value={ayudanteNombre}
                  onChange={e => setAyudanteNombre(e.target.value)}
                  className="mt-1 h-10 rounded-xl text-xs"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-medium text-gray-600">Kilometraje Final (Opcional)</Label>
              <Input
                placeholder="Ej: 345200"
                value={km}
                onChange={e => setKm(e.target.value)}
                className="mt-1 h-10 rounded-xl text-xs"
              />
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
                f.noRealizada
                  ? 'bg-gray-100 border-gray-300 opacity-60'
                  : 'bg-white border-gray-200 shadow-sm'
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
                          {f.time || '--:--'}
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
                    <button
                      type="button"
                      onClick={() => updateFrecuencia(f.order, { noRealizada: !f.noRealizada })}
                      className={`px-2 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                        f.noRealizada
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-gray-100 hover:bg-red-50 text-gray-400 hover:text-red-600'
                      }`}
                      title={f.noRealizada ? 'Marcar como realizada' : 'Marcar no realizada'}
                    >
                      {f.noRealizada ? 'No se dio' : 'Anular'}
                    </button>
                  </div>
                </div>

                {/* Campos de captura rápida: Efectivo y Caja Común */}
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
                ) : (
                  <p className="text-xs text-amber-700 italic pt-1">
                    Esta frecuencia fue marcada como no realizada. No sumará ingresos.
                  </p>
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

        {/* 4. Tickets, Sobrante y Foto del Cuaderno */}
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

            {/* Foto del cuaderno */}
            <div>
              <Label className="text-xs font-semibold text-gray-700 mb-1.5 block">
                Foto de la Hoja de Cuaderno
              </Label>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                ref={fileInputRef}
                onChange={handlePhotoCapture}
                className="hidden"
              />
              {photoPreview ? (
                <div className="relative rounded-xl overflow-hidden border border-gray-200">
                  <img src={photoPreview} alt="Cuaderno" className="w-full h-48 object-cover" />
                  <button
                    type="button"
                    onClick={() => setPhotoPreview(null)}
                    className="absolute top-2 right-2 bg-black/70 text-white p-1.5 rounded-full hover:bg-black"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-12 rounded-xl border-dashed border-2 border-gray-300 text-gray-600 hover:border-[#912D26] hover:text-[#912D26]"
                >
                  <Camera className="w-5 h-5 mr-2" />
                  Subir o Tomar Foto del Cuaderno
                </Button>
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
              Selecciona la frecuencia real anotada en el cuaderno con salida desde{' '}
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
