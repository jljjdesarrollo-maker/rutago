'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { ArrowLeft, Save, Plus, Trash2, Camera, X, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { type RecordFormData, type TripData, type ExpenseData, createEmptyFormData, num, getCurrentConductor, getCurrentAyudante } from './types';
import { routes, getRouteLabel, getTimesForRoute } from '@/lib/routes';

interface RecordFormProps {
  saving: boolean;
  error: string | null;
  onBack: () => void;
  onSave: (data: RecordFormData, photoBase64: string | null) => void;
}

export function RecordForm({ saving, error, onBack, onSave }: RecordFormProps) {
  const [form, setForm] = useState<RecordFormData>(createEmptyFormData());
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loadedDefaults, setLoadedDefaults] = useState(false);
  const [vts, setVts] = useState<Array<{id: string; codigo: string; nombre: string; frecuencias: any[]}>>([]);
  const [selectedVtId, setSelectedVtId] = useState('');
  const [vtsLoaded, setVtsLoaded] = useState(false);

  // Load VTs from API (seed runs only from VTConfig screen)
  useEffect(() => {
    if (vtsLoaded) return;
    (async () => {
      try {
        const res = await fetch('/api/bus-vts');
        const data = await res.json();
        if (Array.isArray(data)) setVts(data);
      } catch { /* ignore */ }
      setVtsLoaded(true);
    })();
  }, [vtsLoaded]);

  // Load current conductor and ayudante from DB
  useEffect(() => {
    if (loadedDefaults) return;
    Promise.all([getCurrentConductor(), getCurrentAyudante()]).then(([conductor, ayudante]) => {
      if (conductor || ayudante) {
        setForm(prev => ({
          ...prev,
          ...(conductor ? { conductor } : {}),
          ...(ayudante ? { ayudanteNombre: ayudante } : {}),
        }));
      }
      setLoadedDefaults(true);
    });
  }, [loadedDefaults]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle VT selection - load frequencies into form
  const handleVtSelect = (vtId: string) => {
    setSelectedVtId(vtId);
    const vt = vts.find(v => v.id === vtId);
    if (vt && Array.isArray(vt.frecuencias)) {
      const newTrips = vt.frecuencias.map((f: any) => ({
        routeFrom: f.routeFrom || 'Loja',
        routeTo: f.routeTo || 'Vilcabamba',
        time: f.time || '',
        income: '0',
        boletos: '0',
      }));
      setForm(prev => ({ ...prev, vtCode: vt.codigo, trips: newTrips }));
    } else {
      setForm(prev => ({ ...prev, vtCode: '', trips: [] }));
    }
  };

  const updateField = (field: keyof RecordFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const addTrip = () => {
    setForm((prev) => ({
      ...prev,
      trips: [...prev.trips, { routeFrom: 'Loja', routeTo: 'Vilcabamba', time: '', income: '0', boletos: '0' }],
    }));
  };

  const removeTrip = (index: number) => {
    setForm((prev) => ({
      ...prev,
      trips: prev.trips.filter((_, i) => i !== index),
    }));
  };

  const updateTrip = (index: number, field: keyof TripData, value: string) => {
    setForm((prev) => {
      const newTrips = [...prev.trips];
      newTrips[index] = { ...newTrips[index], [field]: value };
      return { ...prev, trips: newTrips };
    });
  };

  const handleRouteSelect = (index: number, routeLabel: string) => {
    const route = routes.find((r) => getRouteLabel(r.from, r.to) === routeLabel);
    if (route) {
      setForm((prev) => {
        const newTrips = [...prev.trips];
        newTrips[index] = { ...newTrips[index], routeFrom: route.from, routeTo: route.to, time: '' };
        return { ...prev, trips: newTrips };
      });
    }
  };

  const addExpense = () => {
    setForm((prev) => ({
      ...prev,
      expenses: [...prev.expenses, { description: '', amount: '0' }],
    }));
  };

  const removeExpense = (index: number) => {
    setForm((prev) => ({
      ...prev,
      expenses: prev.expenses.filter((_, i) => i !== index),
    }));
  };

  const updateExpense = (index: number, field: keyof ExpenseData, value: string) => {
    setForm((prev) => {
      const newExp = [...prev.expenses];
      newExp[index] = { ...newExp[index], [field]: value };
      return { ...prev, expenses: newExp };
    });
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const totals = useMemo(() => {
    const tripIncome = form.trips.reduce((s, t) => s + num(t.income), 0);
    const cajaComun = form.trips.reduce((s, t) => s + num(t.boletos), 0);
    const sobrante = num(form.sobrante);
    const production = tripIncome + sobrante;
    const totalGastos = form.expenses.reduce((s, e) => s + num(e.amount), 0);
    const tickets = num(form.tickets);
    const entregaAyudante = production - totalGastos;
    const entregaCompania = cajaComun - tickets;
    return { production, cajaComun, sobrante, totalGastos, tickets, entregaAyudante, entregaCompania };
  }, [form]);

  const handleSave = () => {
    // Validaciones obligatorias
    const errors: string[] = [];
    if (!form.vtCode.trim()) errors.push('Selecciona un Vehiculo Tipo (VT)');
    if (!form.km.trim()) errors.push('Kilometraje es obligatorio');
    if (!photoPreview) errors.push('Foto del cuaderno es obligatoria');
    if (form.trips.length === 0) errors.push('No hay frecuencias cargadas');
    if (totals.totalGastos <= 0) errors.push('Total de gastos debe ser mayor a 0');
    if (totals.production <= 0) errors.push('Produccion total debe ser mayor a 0');
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }
    setValidationErrors([]);
    setShowConfirm(true);
  };

  const handleConfirmSave = () => {
    setShowConfirm(false);
    onSave(form, photoPreview);
  };

  const allRouteOptions = routes.map((r) => getRouteLabel(r.from, r.to));

  const isOddTrip = (index: number) => (index + 1) % 2 !== 0;

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#FAFAFA]">
      <header className="sticky top-0 z-10 bg-white border-b border-[#D6D6D6] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="rounded-xl text-[#3A3A3A]">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold text-[#3A3A3A]">Registro del Dia</h1>
          </div>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="h-10 px-4 rounded-xl bg-[#912D26] hover:bg-[#7A2520] text-white font-semibold text-sm"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
          {saving ? 'Guardando...' : 'Guardar'}
        </Button>
      </header>

      <main className="flex-1 overflow-y-auto pb-8">
        <div className="px-4 py-4 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}
          {validationErrors.length > 0 && (
            <div className="p-3 rounded-xl bg-[#912D26]/10 border border-[#912D26]/30 text-[#912D26] text-sm space-y-1">
              <p className="font-semibold flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" /> Campos obligatorios:</p>
              {validationErrors.map((e, i) => <p key={i}>- {e}</p>)}
            </div>
          )}

          {/* 0. Seleccion VT */}
          <Card className="rounded-2xl border-2 border-[#912D26]/30 bg-[#912D26]/5">
            <CardContent className="p-4 space-y-2">
              <Label className="text-sm font-semibold text-[#3A3A3A] flex items-center gap-1.5">
                Vehiculo Tipo (VT) del dia <span className="text-[#912D26]">*</span>
              </Label>
              {!vtsLoaded ? (
                <p className="text-sm text-[#3A3A3A]/50 mt-1">Cargando VTs...</p>
              ) : vts.length === 0 ? (
                <div className="text-center py-3">
                  <p className="text-sm text-[#912D26]">No hay VTs configurados</p>
                  <p className="text-xs text-[#3A3A3A]/50 mt-1">Ejecuta el seed: POST /api/seed-vts</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {vts.map(vt => (
                    <button
                      key={vt.id}
                      type="button"
                      onClick={() => handleVtSelect(vt.id)}
                      className={`py-2.5 px-2 rounded-xl text-sm font-semibold transition-all border ${
                        selectedVtId === vt.id
                          ? 'bg-[#912D26] text-white border-[#912D26] shadow-md'
                          : 'bg-white text-[#3A3A3A] border-[#D6D6D6] hover:border-[#912D26]/40'
                      }`}
                    >
                      {vt.codigo}
                    </button>
                  ))}
                </div>
              )}
              {selectedVtId && (
                <p className="text-xs text-[#912D26]/70 mt-1">
                  {form.trips.length} frecuencias cargadas - puedes editarlas abajo
                </p>
              )}
            </CardContent>
          </Card>

          {/* 1. Cabecera - Fechas y Km */}
          <Card className="rounded-2xl border border-[#D6D6D6] bg-white">
            <CardContent className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-[#3A3A3A]/60">Fecha de Registro</Label>
                  <Input
                    type="text"
                    value={new Date().toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    readOnly
                    className="rounded-xl h-11 bg-[#F5F5F5] text-[#3A3A3A]/50 cursor-not-allowed border-[#D6D6D6]"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-[#3A3A3A]/60">Fecha de Operacion</Label>
                  <Input
                    type="date"
                    value={form.date}
                    onChange={(e) => updateField('date', e.target.value)}
                    className="rounded-xl h-11 border-[#D6D6D6]"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-[#3A3A3A]/60 flex items-center gap-1">
                  Kilometraje <span className="text-[#912D26]">*</span>
                </Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="877604"
                  value={form.km}
                  onChange={(e) => updateField('km', e.target.value)}
                  className={`rounded-xl h-11 border-[#D6D6D6] ${!form.km.trim() && validationErrors.length > 0 ? 'border-[#912D26] bg-[#912D26]/5' : ''}`}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-[#3A3A3A]/60">Conductor</Label>
                  <Input
                    placeholder="Nombre del conductor"
                    value={form.conductor}
                    onChange={(e) => updateField('conductor', e.target.value)}
                    className="rounded-xl h-11 border-[#D6D6D6]"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-[#3A3A3A]/60">Ayudante</Label>
                  <Input
                    placeholder="Nombre del ayudante"
                    value={form.ayudanteNombre}
                    onChange={(e) => updateField('ayudanteNombre', e.target.value)}
                    className="rounded-xl h-11 border-[#D6D6D6]"
                  />
                </div>
              </div>

              {/* Foto obligatoria */}
              <div>
                <Label className="text-xs font-medium text-[#3A3A3A]/60 flex items-center gap-1">
                  Foto del Cuaderno <span className="text-[#912D26]">*</span>
                </Label>
                <div className="mt-1.5">
                  {photoPreview ? (
                    <div className="relative w-20 h-20 rounded-xl overflow-hidden border-2 border-[#912D26]">
                      <img src={photoPreview} alt="Foto" className="w-full h-full object-cover" />
                      <button
                        onClick={() => setPhotoPreview(null)}
                        className="absolute top-0 right-0 w-5 h-5 bg-[#912D26] text-white rounded-bl-lg flex items-center justify-center"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 px-4 rounded-xl text-xs border-[#D6D6D6] text-[#3A3A3A]"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Camera className="w-4 h-4 mr-1" />
                      Tomar/Adjuntar Foto
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 2. Frecuencias */}
          <Card className="rounded-2xl border border-[#D6D6D6] bg-white">
            <CardHeader className="pb-2 pt-4 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold text-[#3A3A3A]">Frecuencias del Dia</CardTitle>
                <Button onClick={addTrip} size="sm" variant="outline" className="h-8 rounded-lg text-xs border-dashed border-[#D6D6D6] text-[#3A3A3A]">
                  <Plus className="w-3.5 h-3.5 mr-1" /> Agregar
                </Button>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
              {form.trips.length === 0 && (
                <div className="text-center py-6 text-[#3A3A3A]/40 text-sm">
                  <p>Toca &quot;Agregar&quot; para registrar frecuencias</p>
                </div>
              )}
              {form.trips.map((trip, index) => {
                const tripTimes = getTimesForRoute(trip.routeFrom, trip.routeTo);
                const odd = isOddTrip(index);
                return (
                  <div key={index} className={`rounded-xl p-3 space-y-2 border-l-4 ${odd ? 'border-l-[#912D26] bg-[#912D26]/5' : 'border-l-[#3A3A3A] bg-[#3A3A3A]/5'}`}>
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold ${odd ? 'text-[#912D26]' : 'text-[#3A3A3A]'}`}>
                        Frecuencia #{index + 1} {odd ? '(Loja → Vilca)' : '(Vilca → Loja)'}
                      </span>
                      <Button onClick={() => removeTrip(index)} variant="ghost" size="icon" className="h-7 w-7 text-[#3A3A3A]/40 hover:text-red-500">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[10px] text-[#3A3A3A]/50">Ruta</Label>
                      <select
                        value={getRouteLabel(trip.routeFrom, trip.routeTo)}
                        onChange={(e) => handleRouteSelect(index, e.target.value)}
                        className="w-full h-9 rounded-lg border border-[#D6D6D6] bg-white px-2 text-sm text-[#3A3A3A]"
                      >
                        {allRouteOptions.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[10px] text-[#3A3A3A]/50">Hora de Salida</Label>
                      {tripTimes.length > 0 ? (
                        <select
                          value={trip.time}
                          onChange={(e) => updateTrip(index, 'time', e.target.value)}
                          className="w-full h-9 rounded-lg border border-[#D6D6D6] bg-white px-2 text-sm text-[#3A3A3A]"
                        >
                          <option value="">-- Seleccionar --</option>
                          {tripTimes.map((t) => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      ) : (
                        <Input
                          placeholder="HH:MM"
                          value={trip.time}
                          onChange={(e) => updateTrip(index, 'time', e.target.value)}
                          className="h-9 text-sm rounded-lg border-[#D6D6D6]"
                        />
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[10px] text-[#3A3A3A]/50">Ingreso (Produccion)</Label>
                        <Input
                          type="number"
                          inputMode="decimal"
                          value={trip.income}
                          onChange={(e) => updateTrip(index, 'income', e.target.value)}
                          className="h-9 text-sm rounded-lg border-[#D6D6D6]"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] text-[#3A3A3A]/50">Boletos (Caja Comun)</Label>
                        <Input
                          type="number"
                          inputMode="decimal"
                          value={trip.boletos}
                          onChange={(e) => updateTrip(index, 'boletos', e.target.value)}
                          className="h-9 text-sm rounded-lg border-[#D6D6D6]"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Sobrante / Ajuste */}
              <div className="pt-2 border-t border-[#D6D6D6]">
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-[#3A3A3A]/60">Sobrante / Ajuste</Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={form.sobrante}
                    onChange={(e) => updateField('sobrante', e.target.value)}
                    className="h-10 text-sm rounded-lg border-[#D6D6D6]"
                  />
                  <p className="text-[10px] text-[#3A3A3A]/40">Dinero sobrante al contar (positivo o negativo)</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 3. Gastos */}
          <Card className="rounded-2xl border border-[#D6D6D6] bg-white">
            <CardHeader className="pb-2 pt-4 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold text-red-600">Gastos</CardTitle>
                <Button onClick={addExpense} size="sm" variant="outline" className="h-8 rounded-lg text-xs border-dashed border-[#D6D6D6] text-[#3A3A3A]">
                  <Plus className="w-3.5 h-3.5 mr-1" /> Agregar
                </Button>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-2">
              {form.expenses.map((exp, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    placeholder="Descripcion"
                    value={exp.description}
                    onChange={(e) => updateExpense(index, 'description', e.target.value)}
                    className="h-10 text-sm rounded-lg flex-1 border-[#D6D6D6]"
                  />
                  <Input
                    type="number"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={exp.amount}
                    onChange={(e) => updateExpense(index, 'amount', e.target.value)}
                    className="h-10 text-sm rounded-lg w-24 border-[#D6D6D6]"
                  />
                  {index >= 4 && (
                    <Button onClick={() => removeExpense(index)} variant="ghost" size="icon" className="h-8 w-8 text-[#3A3A3A]/40 hover:text-red-500 shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              ))}
              <div className="pt-2 flex justify-between text-sm font-semibold text-red-600">
                <span>Total Gastos</span>
                <span>S/ {totals.totalGastos.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          {/* 4. Tickets - despues de Gastos, antes del Resumen */}
          <Card className="rounded-2xl border border-[#D6D6D6] bg-white">
            <CardContent className="p-4">
              <Label className="text-xs font-medium text-[#3A3A3A]/60 mb-3 block">Tickets</Label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => updateField('tickets', '4.50')}
                  className={`h-14 rounded-xl text-base font-bold border-2 transition-all active:scale-95 ${form.tickets === '4.50' ? 'bg-[#912D26] border-[#912D26] text-white shadow-lg shadow-[#912D26]/20' : 'bg-white border-[#D6D6D6] text-[#3A3A3A] hover:border-[#912D26]'}`}
                >
                  $4.50
                </button>
                <button
                  type="button"
                  onClick={() => updateField('tickets', '6.00')}
                  className={`h-14 rounded-xl text-base font-bold border-2 transition-all active:scale-95 ${form.tickets === '6.00' ? 'bg-[#912D26] border-[#912D26] text-white shadow-lg shadow-[#912D26]/20' : 'bg-white border-[#D6D6D6] text-[#3A3A3A] hover:border-[#912D26]'}`}
                >
                  $6.00
                </button>
                <button
                  type="button"
                  onClick={() => updateField('tickets', '')}
                  className={`h-14 rounded-xl text-base font-bold border-2 transition-all active:scale-95 ${form.tickets === '' ? 'bg-[#3A3A3A] border-[#3A3A3A] text-white' : 'bg-white border-[#D6D6D6] text-[#3A3A3A]/40 hover:border-[#3A3A3A]'}`}
                >
                  Ninguno
                </button>
              </div>
            </CardContent>
          </Card>

          {/* 5. Resumen - en zona inferior para one-handed */}
          <Card className="rounded-2xl bg-[#3A3A3A] text-white">
            <CardContent className="p-4 space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-white/50">Liquidacion del Dia</p>
              <div className="flex justify-between text-sm">
                <span className="text-white/60">Produccion</span>
                <span className="font-semibold">S/ {totals.production.toFixed(2)}</span>
              </div>
              {totals.sobrante !== 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">Sobrante</span>
                  <span className="font-semibold text-[#4ADE80]">S/ {totals.sobrante.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-white/60">Caja Comun (Boletos)</span>
                <span className="font-semibold">S/ {totals.cajaComun.toFixed(2)}</span>
              </div>
              <Separator className="bg-white/10" />
              <div className="flex justify-between text-sm">
                <span className="text-white/60">Total Gastos</span>
                <span className="font-semibold text-red-400">S/ {totals.totalGastos.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/60">Tickets</span>
                <span className="font-semibold">S/ {totals.tickets.toFixed(2)}</span>
              </div>
              <Separator className="bg-white/10" />
              <div className="flex justify-between">
                <span className="text-sm text-white/80">Entrega Ayudante</span>
                <span className={`font-bold ${totals.entregaAyudante >= 0 ? 'text-[#4ADE80]' : 'text-red-400'}`}>
                  S/ {totals.entregaAyudante.toFixed(2)}
                </span>
              </div>
              <p className="text-[10px] text-white/30">Produccion - Total Gastos</p>
              <div className="flex justify-between">
                <span className="text-sm text-white/80">Entrega Compania</span>
                <span className={`font-bold ${totals.entregaCompania >= 0 ? 'text-[#4ADE80]' : 'text-red-400'}`}>
                  S/ {totals.entregaCompania.toFixed(2)}
                </span>
              </div>
              <p className="text-[10px] text-white/30">Caja Comun - Tickets</p>
            </CardContent>
          </Card>

          {/* Boton Guardar - zona inferior */}
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full h-14 text-base font-semibold rounded-2xl bg-[#912D26] hover:bg-[#7A2520] text-white shadow-lg shadow-[#912D26]/20 active:scale-[0.98] transition-transform"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />}
            {saving ? 'Guardando...' : 'Guardar Registro'}
          </Button>
        </div>
      </main>

      {/* Dialogo de confirmacion antes de guardar */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent className="rounded-2xl max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#3A3A3A] text-lg">Confirmar Cierre de Caja</AlertDialogTitle>
            <AlertDialogDescription className="text-[#3A3A3A]/70 text-sm space-y-3 pt-2">
              <p>Revise los valores calculados antes de confirmar:</p>
              <div className="rounded-xl bg-[#F5F5F5] p-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-[#3A3A3A]/60">Produccion</span>
                  <span className="font-semibold text-[#3A3A3A]">S/ {totals.production.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#3A3A3A]/60">Caja Comun</span>
                  <span className="font-semibold text-[#3A3A3A]">S/ {totals.cajaComun.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#3A3A3A]/60">Total Gastos</span>
                  <span className="font-semibold text-red-600">S/ {totals.totalGastos.toFixed(2)}</span>
                </div>
              </div>
              <p className="font-medium text-[#912D26]">
                Va a entregar la Compania <strong>S/ {totals.entregaCompania.toFixed(2)}</strong> y valor a entregar el ayudante <strong>S/ {totals.entregaAyudante.toFixed(2)}</strong>. Es correcto?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl h-11">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmSave}
              className="rounded-xl h-11 bg-[#912D26] hover:bg-[#7A2520] text-white font-semibold"
            >
              Confirmar y Guardar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handlePhotoChange}
      />
    </div>
  );
}
