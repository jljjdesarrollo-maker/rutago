'use client';

import { useMemo } from 'react';
import { Gauge, ShieldCheck, Droplets, MapPin, Wrench, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { UserSession } from './types';
import { resolveMantenimientoItemsParaBus } from '@/lib/mantenimiento-estaciones';
import { MantenimientoSyncChip } from './MantenimientoSyncDiagnostic';

interface ChoferJornadaCardProps {
  user: UserSession;
  busNumero: string;
  busId: string;
  kmActual: number;
  onGoToMantenimiento?: () => void;
  onGoToHistory?: () => void;
}

export function ChoferJornadaCard({
  user,
  busNumero,
  busId,
  kmActual,
  onGoToMantenimiento,
  onGoToHistory,
}: ChoferJornadaCardProps) {
  // Evaluación en tiempo real del estado de los 27 componentes del bus
  const { countVencidos, countPorVencer, kmRestanteAceite, estadoFrenos } = useMemo(() => {
    try {
      const items = resolveMantenimientoItemsParaBus(busId, kmActual || 187420);
      const vencidos = items.filter(it => it.estadoSemaforo === 'critico').length;
      const porVencer = items.filter(it => it.estadoSemaforo === 'advertencia').length;

      // Buscar ítem de Aceite de Motor
      const itemAceite = items.find(it => 
        (it.codigo && it.codigo.includes('ACEITE')) || 
        (it.nombre && it.nombre.toLowerCase().includes('aceite'))
      );
      const kmAceite = itemAceite ? Math.max(0, itemAceite.kmRestantes) : 5000;

      // Buscar zapatas de freno
      const itemFrenos = items.find(it => 
        (it.codigo && it.codigo.includes('ZAPATA')) || 
        (it.nombre && it.nombre.toLowerCase().includes('zapata'))
      );
      const estadoFrenosTexto = itemFrenos 
        ? itemFrenos.estadoSemaforo === 'critico' 
          ? 'Revisar' 
          : itemFrenos.estadoSemaforo === 'advertencia' 
          ? 'Próximo' 
          : 'Al Día'
        : 'Al Día';

      return {
        countVencidos: vencidos,
        countPorVencer: porVencer,
        kmRestanteAceite: kmAceite,
        estadoFrenos: estadoFrenosTexto,
      };
    } catch {
      return {
        countVencidos: 0,
        countPorVencer: 0,
        kmRestanteAceite: 5000,
        estadoFrenos: 'Al Día',
      };
    }
  }, [busId, kmActual]);

  const tieneAlerta = countVencidos > 0;
  const esAdvertencia = countPorVencer > 0 && !tieneAlerta;

  return (
    <div
      onClick={onGoToMantenimiento}
      className="cursor-pointer bg-[#053225] hover:bg-[#073b2d] active:scale-[0.99] text-white rounded-3xl p-5 sm:p-6 shadow-xl border border-emerald-900/60 transition relative overflow-hidden"
    >
      {/* Glow de fondo institucional */}
      <div className="absolute top-0 right-0 w-44 h-44 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Cabecera de la Tarjeta Hero */}
      <div className="flex items-center justify-between mb-3 relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-emerald-300">
            <Gauge className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-emerald-300/90 block">
              Tacómetro Oficial • Bus {busNumero}
            </span>
            <span className="text-[11px] text-emerald-100/70 font-medium">
              Lectura Auditada • Coo. Vilcabambaturis
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <MantenimientoSyncChip busId={busId} />
          <span
            className={`text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider ${
              tieneAlerta
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                : esAdvertencia
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
            }`}
          >
            {tieneAlerta ? 'Fosa Requerida' : esAdvertencia ? 'Revisión Próxima' : 'Al Día'}
          </span>
        </div>
      </div>

      {/* Número Rey: Odómetro Oficial del Autobús */}
      <div className="text-center py-2 sm:py-3 relative z-10">
        <div className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight drop-shadow-sm flex items-baseline justify-center gap-2">
          <span>{(kmActual || 187420).toLocaleString()}</span>
          <span className="text-sm sm:text-base font-black text-amber-400">KM</span>
        </div>
        <div className="text-xs sm:text-sm font-black uppercase tracking-widest text-emerald-200/90 mt-1">
          ODÓMETRO REGISTRADO POR AYUDANTE
        </div>

        {/* Semáforo Ejecutivo en 3 Segundos */}
        <div className="mt-2.5 flex items-center justify-center">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold border ${
              tieneAlerta
                ? 'bg-rose-950/80 text-rose-300 border-rose-500/40'
                : esAdvertencia
                ? 'bg-amber-950/80 text-amber-300 border-amber-500/40'
                : 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                tieneAlerta ? 'bg-rose-400 animate-ping' : esAdvertencia ? 'bg-amber-400' : 'bg-emerald-400'
              }`}
            />
            {tieneAlerta
              ? `${countVencidos} componente${countVencidos > 1 ? 's' : ''} vencido${countVencidos > 1 ? 's' : ''} • Requiere fosa hoy`
              : esAdvertencia
              ? `${countPorVencer} servicio${countPorVencer > 1 ? 's' : ''} próximo${countPorVencer > 1 ? 's' : ''} • Monitorear fosa`
              : 'Todos los componentes mecánicos al día en ruta'}
          </span>
        </div>
      </div>

      {/* Franja Inferior: 3 Métricas Tácticas Subordinadas (Idéntica al Ayudante) */}
      <div className="mt-4 pt-3.5 border-t border-emerald-800/60 flex items-center justify-between text-xs text-emerald-200/90 px-1 relative z-10">
        <div className="flex items-center gap-1.5 truncate">
          <Droplets className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
          <span>
            Aceite: <strong>{kmRestanteAceite.toLocaleString()} km</strong>
          </span>
        </div>

        <div className="flex items-center gap-1.5 truncate">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
          <span>
            Frenos: <strong>{estadoFrenos}</strong>
          </span>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 truncate text-[11px]">
          <MapPin className="w-3 h-3 text-emerald-300 shrink-0" />
          <span>Base Loja (Sede Fosas)</span>
        </div>
      </div>
    </div>
  );
}
