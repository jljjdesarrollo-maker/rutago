'use client';

import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Plus, Trash2, Pencil, Check, X, User, Phone, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';

interface PersonaItem {
  id: string;
  nombre: string;
  cedula: string | null;
  telefono: string | null;
  rol: string;
  pin: string;
  esActual: boolean;
}

interface PersonalScreenProps {
  currentUser: { id: string; nombre: string; rol: string } | null;
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
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchPersonas = useCallback(async () => {
    try {
      const res = await fetch('/api/personas');
      const data = await res.json();
      setPersonas(Array.isArray(data) ? data : []);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchPersonas(); }, [fetchPersonas]);

  const conductores = personas.filter(p => p.rol === 'CONDUCTOR');
  const ayudantes = personas.filter(p => p.rol === 'AYUDANTE');

  const handleSetActive = async (persona: PersonaItem) => {
    try {
      await fetch(`/api/personas/${persona.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rol: persona.rol, esActual: true }),
      });
      fetchPersonas();
    } catch { /* ignore */ }
  };

  const handleAdd = async (rol: 'CONDUCTOR' | 'AYUDANTE') => {
    if (!formNombre.trim() || formPin.length < 4) return;
    setSaving(true);
    try {
      // If it's the first one, set as current
      const isFirst = (rol === 'CONDUCTOR' ? conductores : ayudantes).length === 0;
      const res = await fetch('/api/personas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: formNombre.trim(),
          cedula: formCedula.trim() || null,
          telefono: formTelefono.trim() || null,
          rol,
          pin: formPin,
          esActual: isFirst,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Error al guardar');
        return;
      }
      setShowAdd(null);
      setFormNombre('');
      setFormCedula('');
      setFormTelefono('');
      setFormPin('');
      fetchPersonas();
    } catch { /* ignore */ }
    setSaving(false);
  };

  const handleEdit = async (id: string) => {
    if (!formNombre.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/personas/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: formNombre.trim(),
          cedula: formCedula.trim() || null,
          telefono: formTelefono.trim() || null,
          ...(formPin.length >= 4 ? { pin: formPin } : {}),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Error al actualizar');
        return;
      }
      setEditingId(null);
      fetchPersonas();
    } catch { /* ignore */ }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/personas/${id}`, { method: 'DELETE' });
      setDeleteId(null);
      fetchPersonas();
    } catch { /* ignore */ }
  };

  const startEdit = (p: PersonaItem) => {
    setEditingId(p.id);
    setFormNombre(p.nombre);
    setFormCedula(p.cedula || '');
    setFormTelefono(p.telefono || '');
    setFormPin('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setShowAdd(null);
    setFormNombre('');
    setFormCedula('');
    setFormTelefono('');
    setFormPin('');
  };

  const renderCard = (p: PersonaItem) => {
    const isEditing = editingId === p.id;
    if (isEditing) {
      return (
        <Card key={p.id} className="rounded-2xl border-2 border-[#912D26] bg-white">
          <CardContent className="p-4 space-y-3">
            <div className="space-y-1">
              <Label className="text-[10px] text-[#3A3A3A]/50">Nombre *</Label>
              <Input value={formNombre} onChange={e => setFormNombre(e.target.value)} className="h-9 text-sm rounded-lg border-[#D6D6D6]" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[10px] text-[#3A3A3A]/50">Cedula</Label>
                <Input value={formCedula} onChange={e => setFormCedula(e.target.value)} className="h-9 text-sm rounded-lg border-[#D6D6D6]" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-[#3A3A3A]/50">Telefono</Label>
                <Input value={formTelefono} onChange={e => setFormTelefono(e.target.value)} className="h-9 text-sm rounded-lg border-[#D6D6D6]" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-[#3A3A3A]/50">Nuevo PIN (4 digitos)</Label>
              <Input value={formPin} maxLength={4} inputMode="numeric" onChange={e => setFormPin(e.target.value.replace(/\D/g, ''))} className="h-9 text-sm rounded-lg border-[#D6D6D6]" placeholder="Dejar vacio para no cambiar" />
            </div>
            <div className="flex gap-2">
              <Button onClick={cancelEdit} variant="outline" className="flex-1 h-10 rounded-xl border-[#D6D6D6] text-[#3A3A3A]">
                <X className="w-4 h-4 mr-1" /> Cancelar
              </Button>
              <Button onClick={() => handleEdit(p.id)} disabled={saving} className="flex-1 h-10 rounded-xl bg-[#912D26] hover:bg-[#7A2520] text-white">
                <Check className="w-4 h-4 mr-1" /> Guardar
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card key={p.id} className={`rounded-2xl border bg-white ${p.esActual ? 'border-[#912D26]' : 'border-[#D6D6D6]'}`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-[#3A3A3A] truncate">{p.nombre}</p>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${p.esActual ? 'bg-[#912D26] text-white' : 'bg-[#D6D6D6] text-[#3A3A3A]/60'}`}>
                  {p.esActual ? 'ACTIVO' : 'INACTIVO'}
                </span>
              </div>
              {p.cedula && (
                <p className="text-xs text-[#3A3A3A]/50 flex items-center gap-1 mt-1"><CreditCard className="w-3 h-3" /> {p.cedula}</p>
              )}
              {p.telefono && (
                <p className="text-xs text-[#3A3A3A]/50 flex items-center gap-1"><Phone className="w-3 h-3" /> {p.telefono}</p>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between mt-3 pt-2 border-t border-[#D6D6D6]/50">
            <div className="flex gap-1.5">
              {!p.esActual && (
                <Button onClick={() => handleSetActive(p)} size="sm" className="h-8 rounded-lg bg-[#912D26] hover:bg-[#7A2520] text-white text-xs px-3">
                  <Check className="w-3 h-3 mr-1" /> Activar
                </Button>
              )}
              <Button onClick={() => startEdit(p)} variant="ghost" size="sm" className="h-8 rounded-lg text-[#3A3A3A]/60">
                <Pencil className="w-3.5 h-3.5" />
              </Button>
              <Button onClick={() => setDeleteId(p.id)} variant="ghost" size="sm" className="h-8 rounded-lg text-[#3A3A3A]/60 hover:text-red-500">
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderAddForm = (rol: 'CONDUCTOR' | 'AYUDANTE') => {
    if (showAdd !== rol) return null;
    return (
      <Card className="rounded-2xl border-2 border-dashed border-[#912D26]/40 bg-[#912D26]/5">
        <CardContent className="p-4 space-y-3">
          <p className="text-sm font-semibold text-[#912D26]">
            Nuevo {rol === 'CONDUCTOR' ? 'Conductor' : 'Ayudante'}
          </p>
          <div className="space-y-1">
            <Label className="text-[10px] text-[#3A3A3A]/50">Nombre completo *</Label>
            <Input value={formNombre} onChange={e => setFormNombre(e.target.value)} className="h-9 text-sm rounded-lg border-[#D6D6D6]" placeholder="Nombre" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[10px] text-[#3A3A3A]/50">Cedula</Label>
              <Input value={formCedula} onChange={e => setFormCedula(e.target.value)} className="h-9 text-sm rounded-lg border-[#D6D6D6]" placeholder="Cedula" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-[#3A3A3A]/50">Telefono</Label>
              <Input value={formTelefono} onChange={e => setFormTelefono(e.target.value)} className="h-9 text-sm rounded-lg border-[#D6D6D6]" placeholder="Telefono" />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-[#3A3A3A]/50">PIN (4 digitos) *</Label>
            <Input value={formPin} maxLength={4} inputMode="numeric" onChange={e => setFormPin(e.target.value.replace(/\D/g, ''))} className="h-9 text-sm rounded-lg border-[#D6D6D6]" placeholder="1234" />
          </div>
          <div className="flex gap-2">
            <Button onClick={cancelEdit} variant="outline" className="flex-1 h-10 rounded-xl border-[#D6D6D6] text-[#3A3A3A]">
              Cancelar
            </Button>
            <Button onClick={() => handleAdd(rol)} disabled={saving || !formNombre.trim() || formPin.length < 4} className="flex-1 h-10 rounded-xl bg-[#912D26] hover:bg-[#7A2520] text-white font-semibold">
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#FAFAFA]">
      <header className="sticky top-0 z-10 bg-white border-b border-[#D6D6D6] px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="rounded-xl text-[#3A3A3A]">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-lg font-semibold text-[#3A3A3A]">Personal</h1>
          <p className="text-xs text-[#3A3A3A]/50">Gestion de conductores y ayudantes</p>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-8">
        <div className="px-4 py-4 space-y-4">
          {loading ? (
            <div className="text-center py-12 text-[#3A3A3A]/40 text-sm">Cargando...</div>
          ) : (
            <>
              {/* Conductores */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-[#3A3A3A] uppercase tracking-wider">Conductores</h2>
                  <Button
                    onClick={() => { setShowAdd('CONDUCTOR'); setEditingId(null); setFormNombre(''); setFormCedula(''); setFormTelefono(''); setFormPin(''); }}
                    size="sm"
                    className="h-8 rounded-lg text-xs bg-[#912D26] hover:bg-[#7A2520] text-white"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Agregar
                  </Button>
                </div>
                {conductores.length === 0 && !showAdd && (
                  <p className="text-center text-[#3A3A3A]/40 text-xs py-4">No hay conductores registrados</p>
                )}
                {conductores.map(renderCard)}
                {renderAddForm('CONDUCTOR')}
              </div>

              {/* Ayudantes */}
              <div className="space-y-2 mt-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-[#3A3A3A] uppercase tracking-wider">Ayudantes</h2>
                  <Button
                    onClick={() => { setShowAdd('AYUDANTE'); setEditingId(null); setFormNombre(''); setFormCedula(''); setFormTelefono(''); setFormPin(''); }}
                    size="sm"
                    className="h-8 rounded-lg text-xs bg-[#3A3A3A] hover:bg-[#2A2A2A] text-white"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Agregar
                  </Button>
                </div>
                {ayudantes.length === 0 && !showAdd && (
                  <p className="text-center text-[#3A3A3A]/40 text-xs py-4">No hay ayudantes registrados</p>
                )}
                {ayudantes.map(renderCard)}
                {renderAddForm('AYUDANTE')}
              </div>
            </>
          )}
        </div>
      </main>

      {/* Delete confirmation overlay */}
      {deleteId && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center px-6">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold text-[#3A3A3A]">Eliminar personal</h3>
            <p className="text-sm text-[#3A3A3A]/60 mt-2">Esta accion no se puede deshacer.</p>
            <div className="flex gap-2 mt-4">
              <Button onClick={() => setDeleteId(null)} variant="outline" className="flex-1 h-11 rounded-xl border-[#D6D6D6]">Cancelar</Button>
              <Button onClick={() => handleDelete(deleteId)} className="flex-1 h-11 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold">Eliminar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
