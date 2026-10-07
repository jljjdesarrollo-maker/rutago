'use client';

import { isSuperAdmin as checkIsSuperAdmin } from '@/lib/roles';

import { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  Phone,
  CreditCard,
  Smartphone,
  ShieldCheck,
  Unlock,
  Building2,
  Users,
  AlertCircle,
  Filter,
  RotateCcw,
  UserX,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import type { UserSession } from './types';

interface SocioItem {
  id: string;
  nombre: string;
  cedula: string;
  buses?: Array<{ numeroDisco: string }>;
}

interface PersonaItem {
  id: string;
  socioId?: string | null;
  nombre: string;
  cedula: string | null;
  telefono: string | null;
  rol: string;
  pin?: string;
  activo?: boolean;
  desactivadoAt?: string | null;
  esActual: boolean;
  deviceId?: string | null;
  deviceName?: string | null;
  deviceLinkedAt?: string | null;
  socio?: {
    id: string;
    nombre: string;
    cedula: string;
  } | null;
}

interface PersonalScreenProps {
  currentUser: UserSession | null;
  onBack: () => void;
}

export function PersonalScreen({ currentUser, onBack }: PersonalScreenProps) {
  const [personas, setPersonas] = useState<PersonaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState<'CONDUCTOR' | 'AYUDANTE' | null>(null);
  const [formNombre, setFormNombre] = useState('');
  const [formCedula, setFormCedula] = useState('');
  const [formTelefono, setFormTelefono] = useState('');
  const [formPin, setFormPin] = useState('');
  const [formSocioId, setFormSocioId] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [resetDevicePersona, setResetDevicePersona] = useState<PersonaItem | null>(null);
  const [tabEstado, setTabEstado] = useState<'ACTIVOS' | 'INACTIVOS'>('ACTIVOS');

  // Modo SuperAdmin vs Modo Socio
  const isSuperAdmin = checkIsSuperAdmin(currentUser);
  const isSocio = !isSuperAdmin;
  const socioIdActual = currentUser?.socioId || (isSocio ? currentUser?.id : null);

  // Lista de socios para filtro y asignación en modo SuperAdmin
  const [socios, setSocios] = useState<SocioItem[]>([]);
  const [filtroSocio, setFiltroSocio] = useState<string>('TODOS');

  // Cargar lista de socios si es SuperAdmin
  useEffect(() => {
    if (isSuperAdmin) {
      fetch('/api/saas/socios')
        .then((res) => (res.ok ? res.json() : []))
        .then((data) => setSocios(Array.isArray(data) ? data : []))
        .catch(() => {});
    }
  }, [isSuperAdmin]);

  const fetchPersonas = useCallback(async () => {
    setLoading(true);
    try {
      let url = '/api/personas';
      const params = new URLSearchParams();
      params.set('incluirInactivos', 'true');

      if (isSocio && socioIdActual) {
        params.set('socioId', socioIdActual);
      } else if (isSuperAdmin) {
        if (filtroSocio === 'SIN_SOCIO') {
          params.set('socioId', 'SIN_SOCIO');
        } else if (filtroSocio !== 'TODOS') {
          params.set('socioId', filtroSocio);
        }
      }

      const queryString = params.toString();
      if (queryString) {
        url += `?${queryString}`;
      }

      const res = await fetch(url);
      const data = await res.json();
      setPersonas(Array.isArray(data) ? data : []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [isSocio, isSuperAdmin, socioIdActual, filtroSocio]);

  useEffect(() => {
    fetchPersonas();
  }, [fetchPersonas]);

  const totalActivos = personas.filter((p) => p.activo !== false).length;
  const totalInactivos = personas.filter((p) => p.activo === false).length;

  const personasVisibles = personas.filter((p) =>
    tabEstado === 'ACTIVOS' ? p.activo !== false : p.activo === false
  );

  const conductores = personasVisibles.filter((p) => p.rol === 'CONDUCTOR');
  const ayudantes = personasVisibles.filter((p) => p.rol === 'AYUDANTE');

  const handleSetActive = async (persona: PersonaItem) => {
    try {
      await fetch(`/api/personas/${persona.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rol: persona.rol,
          esActual: true,
          socioId: persona.socioId,
        }),
      });
      fetchPersonas();
    } catch {
      /* ignore */
    }
  };

  const handleReactivar = async (persona: PersonaItem) => {
    setSaving(true);
    try {
      await fetch(`/api/personas/${persona.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activo: true,
        }),
      });
      fetchPersonas();
    } catch {
      /* ignore */
    } finally {
      setSaving(false);
    }
  };

  const handleAdd = async (rol: 'CONDUCTOR' | 'AYUDANTE') => {
    if (!formNombre.trim() || formPin.length < 4) {
      setFormError('Nombre y PIN de al menos 4 dígitos son obligatorios.');
      return;
    }
    setSaving(true);
    setFormError(null);

    try {
      // Determinación de socioId: socio en sesión o asignación manual de SuperAdmin
      const targetSocioId = isSocio ? socioIdActual : (formSocioId || null);

      // Si es el primer miembro de ese rol para este socio, activarlo por defecto
      const existentesMismoRol = (rol === 'CONDUCTOR' ? conductores : ayudantes).filter(
        (p) => p.socioId === targetSocioId
      );
      const isFirst = existentesMismoRol.length === 0;

      const res = await fetch('/api/personas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: formNombre.trim(),
          cedula: formCedula.trim() || null,
          telefono: formTelefono.trim() || null,
          rol,
          pin: formPin.trim(),
          socioId: targetSocioId,
          esActual: isFirst,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setFormError(data.error || 'Error al guardar personal.');
        setSaving(false);
        return;
      }

      setShowAdd(null);
      setFormNombre('');
      setFormCedula('');
      setFormTelefono('');
      setFormPin('');
      setFormSocioId('');
      setFormError(null);
      fetchPersonas();
    } catch {
      setFormError('Error de conexión al guardar.');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (id: string) => {
    if (!formNombre.trim()) {
      setFormError('El nombre no puede estar vacío.');
      return;
    }
    setSaving(true);
    setFormError(null);

    try {
      const payload: Record<string, unknown> = {
        nombre: formNombre.trim(),
        cedula: formCedula.trim() || null,
        telefono: formTelefono.trim() || null,
      };

      if (formPin.length >= 4) {
        payload.pin = formPin.trim();
      }

      if (isSuperAdmin) {
        payload.socioId = formSocioId || null;
      }

      const res = await fetch(`/api/personas/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        setFormError(data.error || 'Error al actualizar personal.');
        setSaving(false);
        return;
      }

      setEditingId(null);
      setFormError(null);
      fetchPersonas();
    } catch {
      setFormError('Error de conexión al actualizar.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/personas/${id}`, { method: 'DELETE' });
      setDeleteId(null);
      fetchPersonas();
    } catch {
      /* ignore */
    }
  };

  const handleConfirmResetDevice = async () => {
    if (!resetDevicePersona) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/personas/${resetDevicePersona.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resetDevice: true }),
      });
      if (res.ok) {
        fetchPersonas();
        setResetDevicePersona(null);
      }
    } catch {
      /* ignore */
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (p: PersonaItem) => {
    setEditingId(p.id);
    setFormNombre(p.nombre);
    setFormCedula(p.cedula || '');
    setFormTelefono(p.telefono || '');
    setFormPin('');
    setFormSocioId(p.socioId || '');
    setFormError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setShowAdd(null);
    setFormNombre('');
    setFormCedula('');
    setFormTelefono('');
    setFormPin('');
    setFormSocioId('');
    setFormError(null);
  };

  const renderCard = (p: PersonaItem) => {
    const isEditing = editingId === p.id;
    if (isEditing) {
      return (
        <Card key={p.id} className="rounded-2xl border-2 border-[#912D26] bg-white shadow-sm">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#912D26] uppercase">Editar Datos de Tripulación</span>
              <span className="text-[10px] text-gray-500">{p.rol}</span>
            </div>

            {formError && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="space-y-1">
              <Label className="text-[10px] font-semibold text-[#3A3A3A]/70">Nombre Completo *</Label>
              <Input
                value={formNombre}
                onChange={(e) => setFormNombre(e.target.value)}
                className="h-9 text-sm rounded-lg border-[#D6D6D6]"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[10px] font-semibold text-[#3A3A3A]/70">Cédula</Label>
                <Input
                  value={formCedula}
                  onChange={(e) => setFormCedula(e.target.value)}
                  className="h-9 text-sm rounded-lg border-[#D6D6D6]"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-semibold text-[#3A3A3A]/70">Teléfono</Label>
                <Input
                  value={formTelefono}
                  onChange={(e) => setFormTelefono(e.target.value)}
                  className="h-9 text-sm rounded-lg border-[#D6D6D6]"
                />
              </div>
            </div>

            {/* Asignación de Socio (Solo para SuperAdmin) */}
            {isSuperAdmin && (
              <div className="space-y-1">
                <Label className="text-[10px] font-semibold text-[#3A3A3A]/70">Socio Propietario Responsable</Label>
                <select
                  value={formSocioId}
                  onChange={(e) => setFormSocioId(e.target.value)}
                  className="w-full h-9 text-xs rounded-lg border border-[#D6D6D6] px-2.5 bg-white text-gray-800"
                >
                  <option value="">-- Sin Socio Asignado (General) --</option>
                  {socios.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nombre} {s.buses && s.buses.length > 0 ? `(Bus ${s.buses.map((b) => b.numeroDisco).join(', ')})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-1">
              <Label className="text-[10px] font-semibold text-[#3A3A3A]/70">
                Nuevo PIN (4 dígitos) <span className="text-gray-400 font-normal">- Opcional</span>
              </Label>
              <Input
                value={formPin}
                maxLength={4}
                inputMode="numeric"
                onChange={(e) => setFormPin(e.target.value.replace(/\D/g, ''))}
                className="h-9 text-sm rounded-lg border-[#D6D6D6]"
                placeholder="Dejar vacío para no cambiar"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <Button onClick={cancelEdit} variant="outline" className="flex-1 h-10 rounded-xl border-[#D6D6D6] text-[#3A3A3A]">
                <X className="w-4 h-4 mr-1" /> Cancelar
              </Button>
              <Button
                onClick={() => handleEdit(p.id)}
                disabled={saving}
                className="flex-1 h-10 rounded-xl bg-[#912D26] hover:bg-[#7A2520] text-white"
              >
                <Check className="w-4 h-4 mr-1" /> {saving ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    const esInactivo = p.activo === false;

    return (
      <Card
        key={p.id}
        className={`rounded-2xl border bg-white shadow-xs transition ${
          esInactivo
            ? 'border-dashed border-gray-300 opacity-80 bg-gray-50/50'
            : p.esActual
            ? 'border-[#912D26]/70 ring-1 ring-[#912D26]/20'
            : 'border-[#D6D6D6]'
        }`}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className={`font-bold text-sm truncate ${esInactivo ? 'text-gray-500 line-through' : 'text-[#3A3A3A]'}`}>
                  {p.nombre}
                </p>
                {esInactivo ? (
                  <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full shrink-0 bg-gray-200 text-gray-600 flex items-center gap-1">
                    <UserX className="w-2.5 h-2.5" /> DADO DE BAJA (INACTIVO)
                  </span>
                ) : (
                  <span
                    className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full shrink-0 ${
                      p.esActual ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {p.esActual ? 'EN RUTA (ACTIVO)' : 'RELEVO / EN ESPERA'}
                  </span>
                )}

                {/* Badge de Socio para SuperAdmin */}
                {isSuperAdmin && (
                  <span className="text-[9px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-semibold flex items-center gap-1 border border-slate-200">
                    <Building2 className="w-2.5 h-2.5" />
                    {p.socio ? p.socio.nombre : 'Sin socio asignado'}
                  </span>
                )}
              </div>

              {p.cedula && (
                <p className="text-xs text-[#3A3A3A]/60 flex items-center gap-1 mt-1">
                  <CreditCard className="w-3 h-3 text-gray-400" /> Cédula: {p.cedula}
                </p>
              )}
              {p.telefono && (
                <p className="text-xs text-[#3A3A3A]/60 flex items-center gap-1 mt-0.5">
                  <Phone className="w-3 h-3 text-gray-400" /> Tel: {p.telefono}
                </p>
              )}
              {esInactivo && p.desactivadoAt && (
                <p className="text-[10px] text-gray-400 mt-1 italic">
                  Dado de baja el: {new Date(p.desactivadoAt).toLocaleDateString('es-EC')}
                </p>
              )}

              {/* Indicador de Teléfono Vinculado (Device Binding para Ayudantes) */}
              {!esInactivo && p.rol === 'AYUDANTE' && (
                <div className="mt-2.5 pt-2 border-t border-gray-100 flex items-center justify-between text-[11px]">
                  {p.deviceId ? (
                    <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                      <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                      <span className="font-semibold truncate max-w-[150px]">
                        {p.deviceName || 'Teléfono Oficial Asignado'}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-slate-500 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-200">
                      <Smartphone className="w-3.5 h-3.5 shrink-0" />
                      <span>Sin teléfono fijo (Acceso Libre)</span>
                    </div>
                  )}

                  {p.deviceId && (
                    <button
                      type="button"
                      onClick={() => setResetDevicePersona(p)}
                      disabled={saving}
                      title="Desvincular teléfono para permitir login en otro equipo"
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold border border-rose-200 active:scale-95 transition text-[10px] cursor-pointer"
                    >
                      <Unlock className="w-3 h-3" />
                      <span>Desvincular</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between mt-3 pt-2 border-t border-[#D6D6D6]/50">
            <div className="flex items-center gap-1.5">
              {esInactivo ? (
                <Button
                  onClick={() => handleReactivar(p)}
                  disabled={saving}
                  size="sm"
                  className="h-8 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 font-semibold"
                >
                  <RotateCcw className="w-3 h-3 mr-1" /> Reactivar Personal
                </Button>
              ) : !p.esActual ? (
                <Button
                  onClick={() => handleSetActive(p)}
                  size="sm"
                  className="h-8 rounded-lg bg-[#912D26] hover:bg-[#7A2520] text-white text-xs px-3 font-semibold"
                >
                  <Check className="w-3 h-3 mr-1" /> Activar en Turno
                </Button>
              ) : (
                <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded-md">
                  <Check className="w-3 h-3 text-emerald-600" /> Asignado al Bus Hoy
                </span>
              )}
            </div>
            {!esInactivo && (
              <div className="flex items-center gap-1">
                <Button
                  onClick={() => startEdit(p)}
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 rounded-lg text-[#3A3A3A]/70 hover:bg-gray-100"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button
                  onClick={() => setDeleteId(p.id)}
                  variant="ghost"
                  size="sm"
                  title="Dar de baja lógica"
                  className="h-8 w-8 p-0 rounded-lg text-[#3A3A3A]/70 hover:text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderAddForm = (rol: 'CONDUCTOR' | 'AYUDANTE') => {
    if (showAdd !== rol) return null;
    return (
      <Card className="rounded-2xl border-2 border-dashed border-[#912D26]/40 bg-[#912D26]/5 shadow-xs">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-[#912D26]">
              Nuevo {rol === 'CONDUCTOR' ? 'Conductor' : 'Ayudante'}
            </p>
            {isSocio && (
              <span className="text-[10px] bg-[#912D26]/10 text-[#912D26] px-2 py-0.5 rounded-full font-bold">
                Vinculado a tu unidad
              </span>
            )}
          </div>

          {formError && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="space-y-1">
            <Label className="text-[10px] font-semibold text-[#3A3A3A]/70">Nombre completo *</Label>
            <Input
              value={formNombre}
              onChange={(e) => setFormNombre(e.target.value)}
              className="h-9 text-sm rounded-lg border-[#D6D6D6] bg-white"
              placeholder="Ej. Juan Pérez"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[10px] font-semibold text-[#3A3A3A]/70">Cédula</Label>
              <Input
                value={formCedula}
                onChange={(e) => setFormCedula(e.target.value)}
                className="h-9 text-sm rounded-lg border-[#D6D6D6] bg-white"
                placeholder="10 dígitos"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-semibold text-[#3A3A3A]/70">Teléfono</Label>
              <Input
                value={formTelefono}
                onChange={(e) => setFormTelefono(e.target.value)}
                className="h-9 text-sm rounded-lg border-[#D6D6D6] bg-white"
                placeholder="09..."
              />
            </div>
          </div>

          {/* Asignación de Socio (Solo para SuperAdmin) */}
          {isSuperAdmin && (
            <div className="space-y-1">
              <Label className="text-[10px] font-semibold text-[#3A3A3A]/70">Socio Propietario Responsable</Label>
              <select
                value={formSocioId}
                onChange={(e) => setFormSocioId(e.target.value)}
                className="w-full h-9 text-xs rounded-lg border border-[#D6D6D6] px-2.5 bg-white text-gray-800"
              >
                <option value="">-- Sin Socio Asignado (General) --</option>
                {socios.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre} {s.buses && s.buses.length > 0 ? `(Bus ${s.buses.map((b) => b.numeroDisco).join(', ')})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-1">
            <Label className="text-[10px] font-semibold text-[#3A3A3A]/70">PIN de Acceso (4 dígitos) *</Label>
            <Input
              value={formPin}
              maxLength={4}
              inputMode="numeric"
              onChange={(e) => setFormPin(e.target.value.replace(/\D/g, ''))}
              className="h-9 text-sm rounded-lg border-[#D6D6D6] bg-white font-mono tracking-widest text-center"
              placeholder="••••"
            />
            <p className="text-[9px] text-gray-400">Protegido con cifrado criptográfico SHA-256 y Salt único.</p>
          </div>

          <div className="flex gap-2 pt-1">
            <Button onClick={cancelEdit} variant="outline" className="flex-1 h-10 rounded-xl border-[#D6D6D6] text-[#3A3A3A]">
              Cancelar
            </Button>
            <Button
              onClick={() => handleAdd(rol)}
              disabled={saving || !formNombre.trim() || formPin.length < 4}
              className="flex-1 h-10 rounded-xl bg-[#912D26] hover:bg-[#7A2520] text-white font-semibold"
            >
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#FAFAFA]">
      <header className="sticky top-0 z-10 bg-white border-b border-[#D6D6D6] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="rounded-xl text-[#3A3A3A]">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-lg font-bold text-[#3A3A3A]">Tripulación y Personal</h1>
            <p className="text-xs text-[#3A3A3A]/60">
              {isSuperAdmin
                ? 'Consola de Gestión Global de Flota'
                : `Tripulación Exclusiva • ${currentUser?.nombre || 'Socio'}`}
            </p>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-12">
        <div className="px-4 py-4 space-y-4 max-w-xl mx-auto">
          {/* Banner de Aislamiento Multi-Tenant para Socio */}
          {isSocio && (
            <div className="bg-gradient-to-r from-[#912D26]/10 to-[#912D26]/5 rounded-2xl p-3 border border-[#912D26]/20 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#912D26] text-white flex items-center justify-center shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-[#912D26]">Panel Privado de Tripulación</p>
                <p className="text-[11px] text-gray-600 leading-tight mt-0.5">
                  Los choferes y ayudantes listados aquí pertenecen exclusivamente a tus unidades. Privacidad 100% aislada.
                </p>
              </div>
            </div>
          )}

          {/* Filtro por Socio exclusivo para SuperAdmin */}
          {isSuperAdmin && (
            <div className="bg-white rounded-2xl p-3 border border-gray-200 shadow-xs space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-gray-700">
                <Filter className="w-3.5 h-3.5 text-[#912D26]" />
                <span>Filtrar por Socio Propietario</span>
              </div>
              <select
                value={filtroSocio}
                onChange={(e) => {
                  setFiltroSocio(e.target.value);
                  setFormSocioId(e.target.value !== 'TODOS' && e.target.value !== 'SIN_SOCIO' ? e.target.value : '');
                }}
                className="w-full h-10 text-xs rounded-xl border border-gray-300 px-3 bg-white text-gray-800 font-medium"
              >
                <option value="TODOS">👥 Toda la Cooperativa (Todos los Socios)</option>
                <option value="SIN_SOCIO">⚠️ Sin Socio Asignado (General)</option>
                {socios.map((s) => (
                  <option key={s.id} value={s.id}>
                    👤 {s.nombre} {s.buses && s.buses.length > 0 ? `• Bus ${s.buses.map((b) => b.numeroDisco).join(', ')}` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {loading ? (
            <div className="text-center py-12 text-[#3A3A3A]/40 text-sm">Cargando personal...</div>
          ) : (
            <>
              {/* Selector de Pestañas: Personal Activo vs Histórico / Inactivos */}
              <div className="flex bg-gray-100 p-1 rounded-xl gap-1 mb-2">
                <button
                  type="button"
                  onClick={() => setTabEstado('ACTIVOS')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
                    tabEstado === 'ACTIVOS'
                      ? 'bg-white text-gray-900 shadow-xs'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  <Users className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Personal Activo ({totalActivos})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTabEstado('INACTIVOS')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
                    tabEstado === 'INACTIVOS'
                      ? 'bg-white text-gray-900 shadow-xs'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  <UserX className="w-3.5 h-3.5 text-rose-500" />
                  <span>Dados de Baja ({totalInactivos})</span>
                </button>
              </div>

              {/* Conductores */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-[#3A3A3A] uppercase tracking-wider">Conductores</h2>
                    <p className="text-[10px] text-gray-400">Responsables de ruta y odómetro</p>
                  </div>
                  <Button
                    onClick={() => {
                      setShowAdd('CONDUCTOR');
                      setEditingId(null);
                      setFormNombre('');
                      setFormCedula('');
                      setFormTelefono('');
                      setFormPin('');
                      setFormError(null);
                      if (isSuperAdmin && filtroSocio !== 'TODOS' && filtroSocio !== 'SIN_SOCIO') {
                        setFormSocioId(filtroSocio);
                      }
                    }}
                    size="sm"
                    className="h-8 rounded-lg text-xs bg-[#912D26] hover:bg-[#7A2520] text-white font-semibold"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Agregar
                  </Button>
                </div>
                {conductores.length === 0 && !showAdd && (
                  <div className="text-center py-6 bg-white rounded-2xl border border-dashed border-gray-200">
                    <p className="text-xs text-gray-400">No hay conductores registrados para esta unidad</p>
                  </div>
                )}
                {conductores.map(renderCard)}
                {renderAddForm('CONDUCTOR')}
              </div>

              {/* Ayudantes */}
              <div className="space-y-2.5 mt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-[#3A3A3A] uppercase tracking-wider">Ayudantes (Cobro)</h2>
                    <p className="text-[10px] text-gray-400">Control de boletos y arqueo con Device Binding</p>
                  </div>
                  <Button
                    onClick={() => {
                      setShowAdd('AYUDANTE');
                      setEditingId(null);
                      setFormNombre('');
                      setFormCedula('');
                      setFormTelefono('');
                      setFormPin('');
                      setFormError(null);
                      if (isSuperAdmin && filtroSocio !== 'TODOS' && filtroSocio !== 'SIN_SOCIO') {
                        setFormSocioId(filtroSocio);
                      }
                    }}
                    size="sm"
                    className="h-8 rounded-lg text-xs bg-[#3A3A3A] hover:bg-[#2A2A2A] text-white font-semibold"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Agregar
                  </Button>
                </div>
                {ayudantes.length === 0 && !showAdd && (
                  <div className="text-center py-6 bg-white rounded-2xl border border-dashed border-gray-200">
                    <p className="text-xs text-gray-400">No hay ayudantes registrados para esta unidad</p>
                  </div>
                )}
                {ayudantes.map(renderCard)}
                {renderAddForm('AYUDANTE')}
              </div>
            </>
          )}
        </div>
      </main>

      {/* Modal de confirmación de baja lógica */}
      {deleteId && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center px-6">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-lg font-bold text-[#3A3A3A]">Dar de Baja al Personal</h3>
            <p className="text-xs text-[#3A3A3A]/70 mt-2 leading-relaxed">
              Esta acción desactivará su acceso con PIN al sistema RutaGo (Baja Lógica). Su historial de boletos, turnos y arqueos pasados se mantendrá intacto para auditoría y podrás reactivarlo cuando sea necesario.
            </p>
            <div className="flex gap-2 mt-5">
              <Button onClick={() => setDeleteId(null)} variant="outline" className="flex-1 h-11 rounded-xl border-[#D6D6D6] text-xs font-semibold">
                Cancelar
              </Button>
              <Button onClick={() => handleDelete(deleteId)} className="flex-1 h-11 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs">
                Sí, Dar de Baja
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación de Reset de Device Binding */}
      {resetDevicePersona && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center px-6 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-100">
            <div className="flex items-center gap-2.5 text-amber-600 mb-2">
              <div className="p-2 rounded-xl bg-amber-50 border border-amber-200">
                <Unlock className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Desvincular Teléfono Oficial</h3>
            </div>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              ¿Deseas desvincular el teléfono <span className="font-semibold text-slate-800">({resetDevicePersona.deviceName || 'Oficial'})</span> de{' '}
              <span className="font-bold text-slate-900">{resetDevicePersona.nombre}</span>?
            </p>
            <p className="text-[11px] text-slate-500 mt-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              Esto liberará su PIN para que pueda registrar e iniciar sesión en el teléfono oficial o en un equipo de reemplazo ante emergencias.
            </p>
            <div className="flex gap-2 mt-5">
              <Button
                onClick={() => setResetDevicePersona(null)}
                variant="outline"
                disabled={saving}
                className="flex-1 h-10 rounded-xl border-slate-200 text-xs font-semibold"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleConfirmResetDevice}
                disabled={saving}
                className="flex-1 h-10 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs"
              >
                {saving ? 'Desvinculando...' : 'Sí, Desvincular'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
