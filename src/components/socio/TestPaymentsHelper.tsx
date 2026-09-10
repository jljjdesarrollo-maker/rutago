'use client';

import React from 'react';
import { Sparkles, Calendar, ArrowRight, CheckCircle2, RefreshCw } from 'lucide-react';
import { seedSampleExpenses } from '../../lib/owner-expenses-storage';

interface Props {
  busId: string;
  onDataReloaded: () => void;
  onSelectMonth: (month: string) => void;
}

export default function TestPaymentsHelper({
  busId,
  onDataReloaded,
  onSelectMonth,
}: Props) {
  const handleResetSampleData = () => {
    seedSampleExpenses(busId);
    onDataReloaded();
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white">
              Pruebas Rápidas de Pagos: Agosto vs. Septiembre
            </h4>
            <p className="text-[10px] text-neutral-400">
              Verifica cómo la fecha real asigna el gasto a su mes contable exacto
            </p>
          </div>
        </div>

        <button
          onClick={handleResetSampleData}
          className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs flex items-center gap-1 transition"
          title="Recargar pagos de ejemplo"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span className="text-[10px] hidden sm:inline">Recargar</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
        <div
          onClick={() => onSelectMonth('2026-08')}
          className="p-2.5 rounded-xl bg-neutral-950/60 border border-neutral-800 hover:border-neutral-700 cursor-pointer transition flex items-center justify-between"
        >
          <div>
            <span className="font-bold text-neutral-200 block">Mes de Agosto 2026</span>
            <span className="text-[11px] text-neutral-400">
              4 pagos ($410 pagados • $140 fiado en llantas)
            </span>
          </div>
          <span className="text-emerald-400 text-xs font-semibold">Ver Mes →</span>
        </div>

        <div
          onClick={() => onSelectMonth('2026-09')}
          className="p-2.5 rounded-xl bg-neutral-950/60 border border-neutral-800 hover:border-neutral-700 cursor-pointer transition flex items-center justify-between"
        >
          <div>
            <span className="font-bold text-neutral-200 block">Mes de Septiembre 2026</span>
            <span className="text-[11px] text-neutral-400">
              3 pagos ($225 pagados • Zapatas, Lavado, Cooperativa)
            </span>
          </div>
          <span className="text-emerald-400 text-xs font-semibold">Ver Mes →</span>
        </div>
      </div>
    </div>
  );
}
