'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Save, Plus, Trash2, ChevronDown, ChevronUp, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

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

      <main className="flex-1 overflow-y-auto pb-8 px-4 py-4 space-y-3">
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
      </main>
    </div>
  );
}
