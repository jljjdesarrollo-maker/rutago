'use client';

import React, { useState } from 'react';
import {
  Settings2,
  Search,
  X,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { MantenimientoBusItem } from '@/lib/mantenimiento-catalogo';

export interface MantenimientoPoliticasModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeBusDisco: string;
  activeBusId: string;
  items: MantenimientoBusItem[];
  onActualizarIntervalo: (
    itemId: string,
    itemCodigo: string | undefined,
    nuevoIntervalo: number
  ) => void;
  onRestablecerFabrica: () => void;
}

export function MantenimientoPoliticasModal({
  isOpen,
  onClose,
  activeBusDisco,
  items,
  onActualizarIntervalo,
  onRestablecerFabrica,
}: MantenimientoPoliticasModalProps) {
  const [busqueda, setBusqueda] = useState('');

  if (!isOpen) return null;

  const itemsFiltrados = items.filter(it => {
    if (!busqueda.trim()) return true;
    const q = busqueda.toLowerCase();
    return (
      it.nombre.toLowerCase().includes(q) ||
      (it.codigo && it.codigo.toLowerCase().includes(q)) ||
      (it.categoria && it.categoria.toLowerCase().includes(q))
    );
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col border border-slate-200">
        {/* Cabecera */}
        <div className="flex items-center justify-between border-b pb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-amber-500/15 text-amber-700">
              <Settings2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">
                Políticas de Servicio — Unidad {activeBusDisco}
              </h3>
              <p className="text-xs text-slate-500">
                Define los intervalos según las marcas y lubricantes que utilizas
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Contenido Scrolleable */}
        <div className="space-y-3 overflow-y-auto pr-1 flex-1 text-xs">
          <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 leading-relaxed">
            💡 <strong>Autonomía del Socio:</strong> Si utilizas aceite sintético de mayor duración (ej. 6,000 o 7,000 km) o lubricas zapatas con distinta frecuencia, ajusta los parámetros aquí. Los cambios se guardan exclusivamente para la <strong>Unidad {activeBusDisco}</strong> y se sincronizan en tiempo real con tu teléfono.
          </div>

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <Input
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar componente (aceite, filtro, chasis, frenos...)"
              className="h-9 pl-9 text-xs rounded-xl bg-slate-50 border-slate-200"
            />
          </div>

          <div className="space-y-2">
            {itemsFiltrados.map(it => (
              <div
                key={it.id}
                className="p-3 rounded-2xl border border-slate-200/80 bg-slate-50/70 flex items-center justify-between gap-3 hover:bg-white hover:shadow-xs transition-all"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[9px] font-mono font-bold bg-white text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">
                      {it.codigo || 'MNT'}
                    </span>
                    <span className="text-xs font-black text-slate-900 truncate">
                      {it.nombre}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 truncate">
                    {it.repuestoDetalle || it.categoria.replace('_', ' ')}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <Input
                    key={`${it.id}_${it.intervaloKm}`}
                    type="number"
                    step="500"
                    defaultValue={it.intervaloKm}
                    onBlur={e => {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val) && val > 0 && val !== it.intervaloKm) {
                        onActualizarIntervalo(it.id, it.codigo, val);
                      }
                    }}
                    className="w-24 h-8 text-xs font-black text-right rounded-xl bg-white border-slate-300 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                  <span className="text-slate-500 font-bold text-[11px]">km</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRestablecerFabrica}
            className="h-10 text-xs font-bold text-slate-600 rounded-xl hover:bg-slate-100 gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>Restablecer Fábrica</span>
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={onClose}
            className="h-10 px-5 text-xs font-black rounded-xl bg-slate-900 text-white hover:bg-slate-800 gap-1.5 shadow-xs"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Listo y Aplicar</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
