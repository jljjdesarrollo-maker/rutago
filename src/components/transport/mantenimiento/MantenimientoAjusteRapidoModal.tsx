'use client';

import React, { useState, useEffect } from 'react';
import {
  Settings2,
  X,
  WifiOff,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import type { MantenimientoBusItem } from '@/lib/mantenimiento-catalogo';
import { auditarYGuardarIntervaloEnBD } from '@/lib/mantenimiento-estaciones';

export interface MantenimientoAjusteRapidoModalProps {
  item: MantenimientoBusItem | null;
  onClose: () => void;
  activeBusDisco: string;
  activeBusId: string;
  isOnline: boolean;
  onIntervaloGuardado: (itemId: string, nuevoIntervalo: number) => void;
}

const SUGERENCIAS_KM = [4000, 5000, 6000, 7000];

export function MantenimientoAjusteRapidoModal({
  item,
  onClose,
  activeBusDisco,
  activeBusId,
  isOnline,
  onIntervaloGuardado,
}: MantenimientoAjusteRapidoModalProps) {
  const { toast } = useToast();
  const [nuevoIntervaloVal, setNuevoIntervaloVal] = useState<string>('');
  const [isGuardando, setIsGuardando] = useState(false);

  useEffect(() => {
    if (item) {
      setNuevoIntervaloVal(item.intervaloKm ? item.intervaloKm.toString() : '');
    }
  }, [item]);

  if (!item) return null;

  const handleGuardar = async () => {
    const valNum = parseInt(nuevoIntervaloVal, 10);
    if (!valNum || valNum <= 0) return;

    if (!isOnline) {
      toast({
        variant: 'destructive',
        title: 'Sin Conexión a Internet ⚠️',
        description: 'No se puede guardar el kilometraje sin conexión al servidor central.',
      });
      return;
    }

    setIsGuardando(true);
    try {
      const resAuditoria = await auditarYGuardarIntervaloEnBD(
        activeBusId,
        item.codigo || '',
        valNum
      );

      if (resAuditoria.confirmadoEnNube) {
        onIntervaloGuardado(item.id, valNum);
        toast({
          title: 'Auditoría en BD Exitosa 🛡️',
          description: `${item.nombre}: verificado y asentado en PostgreSQL a ${valNum.toLocaleString()} km.`,
        });
        onClose();
      } else {
        toast({
          variant: 'destructive',
          title: 'Error al Asentar en Servidor ❌',
          description:
            resAuditoria.mensaje ||
            'La base de datos central no confirmó el cambio. Intente nuevamente.',
        });
      }
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Fallo de Comunicación ❌',
        description: e?.message || 'Error al conectar con la base de datos.',
      });
    } finally {
      setIsGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-sm w-full p-5 sm:p-6 shadow-2xl space-y-4 border border-slate-200">
        {/* Cabecera */}
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/15 text-amber-700">
              <Settings2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900">
                Ajustar Ciclo de Servicio
              </h3>
              <p className="text-[11px] font-bold text-amber-700">
                Unidad {activeBusDisco} (Autonomía del Socio)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Cuerpo */}
        <div className="space-y-3">
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Mantenimiento:
            </span>
            <p className="text-xs font-black text-slate-900">
              {item.nombre}
            </p>
            <p className="text-[10px] text-slate-600">
              {item.repuestoDetalle || 'Parámetro de desgaste de unidad'}
            </p>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Cada cuántos kilómetros se debe renovar:
            </label>
            <div className="relative">
              <Input
                type="number"
                step="500"
                value={nuevoIntervaloVal}
                onChange={e => setNuevoIntervaloVal(e.target.value)}
                className="h-11 rounded-2xl text-base font-black text-center bg-amber-50/60 border-amber-300 text-slate-900 pr-10 focus-visible:ring-amber-500"
                autoFocus
              />
              <span className="absolute right-3.5 top-3 text-xs font-black text-amber-800">
                km
              </span>
            </div>
          </div>

          {/* Sugerencias Rápidas */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400">Sugerencias rápidas:</span>
            <div className="grid grid-cols-4 gap-1.5">
              {SUGERENCIAS_KM.map(kmVal => (
                <button
                  key={kmVal}
                  type="button"
                  onClick={() => setNuevoIntervaloVal(kmVal.toString())}
                  className={`py-1 text-[11px] font-black rounded-lg border transition-all cursor-pointer ${
                    nuevoIntervaloVal === kmVal.toString()
                      ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                      : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                  }`}
                >
                  {(kmVal / 1000).toFixed(0)}k km
                </button>
              ))}
            </div>
          </div>

          {!isOnline && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2 text-xs">
              <WifiOff className="w-4 h-4 text-rose-600 shrink-0 animate-pulse" />
              <span className="font-semibold text-[11px] leading-tight">
                Sin conexión al servidor central. Conéctese a internet para asentar este cambio en la base de datos.
              </span>
            </div>
          )}
          <p className="text-[10px] text-slate-500 leading-tight">
            🛡️ La base de datos central auditará y confirmará la actualización antes de asentarla.
          </p>
        </div>

        {/* Footer */}
        <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-xs font-bold text-slate-500"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={!isOnline || isGuardando}
            onClick={handleGuardar}
            className={`text-xs font-black text-white rounded-xl px-4 transition-all gap-1.5 cursor-pointer ${
              !isOnline || isGuardando
                ? 'bg-slate-400 cursor-not-allowed opacity-80'
                : 'bg-amber-600 hover:bg-amber-700'
            }`}
          >
            {isGuardando ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                Guardando en BD...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                Guardar en BD
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
