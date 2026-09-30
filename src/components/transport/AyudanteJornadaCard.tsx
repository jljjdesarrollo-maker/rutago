'use client';

import { useState, useEffect } from 'react';
import { Ticket, ArrowRight, Play, Users, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import type { UserSession } from './types';
import type { VTSession, FrecuenciaEstado } from './types-boletos';

interface AyudanteJornadaCardProps {
  user: UserSession;
  busNumero: string;
  onGoToBoletos: () => void;
}

export function AyudanteJornadaCard({ user, busNumero, onGoToBoletos }: AyudanteJornadaCardProps) {
  const [activeSession, setActiveSession] = useState<VTSession | null>(null);
  const [resumenTurno, setResumenTurno] = useState<{
    totalRecaudado: number;
    totalBoletos: number;
    frecuenciasCerradas: number;
    frecuenciasTotal: number;
    proximaFrecuencia: string | null;
  } | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('rg_vt_session');
      if (stored) {
        const session: VTSession = JSON.parse(stored);
        if (session.vtCode && session.fecha) {
          setActiveSession(session);

          const estadosKey = `rg_estados_${session.vtCode}_${session.fecha}`;
          const estadosRaw = localStorage.getItem(estadosKey);
          if (estadosRaw) {
            const estados: FrecuenciaEstado[] = JSON.parse(estadosRaw);
            const cerradas = estados.filter(e => e.estado === 'cerrada' || e.estado === 'no_realizada').length;
            const abiertas = estados.find(e => e.estado === 'abierta');
            const pendientes = estados.find(e => e.estado === 'pendiente');
            const proxima = abiertas ? `${abiertas.hora} (${abiertas.nombre})` : pendientes ? `${pendientes.hora} (${pendientes.nombre})` : null;

            // Suma del dinero real determinado: efectivo contado en mano + valor retenido por caja común
            const totalEfectivoContado = estados.reduce((acc, curr) => {
              if (curr.estado === 'cerrada') {
                return acc + ((curr as any).arqueoEfectivo != null ? Number((curr as any).arqueoEfectivo) : (curr.totalRecaudado || 0));
              }
              if (curr.estado === 'no_realizada' && (curr.ingresoEspecialMonto || 0) > 0) {
                return acc + (curr.ingresoEspecialMonto || 0);
              }
              return acc + (curr.totalRecaudado || 0);
            }, 0);

            const totalCajaComun = estados.reduce((acc, curr) => acc + ((curr as any).cajaComunMonto || 0), 0);
            const totalProduccionDeterminado = totalEfectivoContado + totalCajaComun;
            const totalBoletos = estados.reduce((acc, curr) => acc + (curr.ventasCount || 0), 0);

            setResumenTurno({
              totalRecaudado: totalProduccionDeterminado,
              totalBoletos,
              frecuenciasCerradas: cerradas,
              frecuenciasTotal: estados.length,
              proximaFrecuencia: proxima,
            });
            return;
          }
        }
      }
      setActiveSession(null);
      setResumenTurno(null);
    } catch {
      setActiveSession(null);
      setResumenTurno(null);
    }
  }, []);

  const tieneTurnoActivo = !!activeSession && !!resumenTurno;

  return (
    <div
      onClick={onGoToBoletos}
      className="cursor-pointer bg-[#053225] hover:bg-[#073b2d] active:scale-[0.99] text-white rounded-3xl p-5 sm:p-6 shadow-xl border border-emerald-900/60 transition relative overflow-hidden"
    >
      {/* Glow de fondo institucional */}
      <div className="absolute top-0 right-0 w-44 h-44 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Cabecera de la Tarjeta Hero */}
      <div className="flex items-center justify-between mb-3 relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-emerald-300">
            <Ticket className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-emerald-300/90 block">
              {tieneTurnoActivo ? `Turno Activo • ${activeSession?.vtCode}` : 'Jornada Laboral'}
            </span>
            <span className="text-[11px] text-emerald-100/70 font-medium">
              {tieneTurnoActivo ? `Fecha: ${activeSession?.fecha}` : `Bus ${busNumero} • Coo. Vilcabambaturis`}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span
            className={`text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider ${
              user.esActual !== false
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
            }`}
          >
            {user.esActual !== false ? (tieneTurnoActivo ? 'En Ruta' : 'Autorizado') : 'Inactivo'}
          </span>
        </div>
      </div>

      {/* Número Rey: Dinero en Caja de Ruta o Iniciar Turno */}
      <div className="text-center py-2 sm:py-3 relative z-10">
        {tieneTurnoActivo ? (
          <>
            <div className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight drop-shadow-sm">
              ${resumenTurno.totalRecaudado.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-xs sm:text-sm font-black uppercase tracking-widest text-emerald-200/90 mt-1">
              EN CAJA DE RUTA
            </div>
          </>
        ) : (
          <>
            <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight drop-shadow-sm flex items-center justify-center gap-2">
              <Play className="w-6 h-6 fill-emerald-300 text-emerald-300" />
              <span>INICIAR JORNADA</span>
            </div>
            <div className="text-xs sm:text-sm font-black uppercase tracking-widest text-emerald-200/90 mt-1">
              SELECCIONAR DÍA Y GRUPO VT
            </div>
          </>
        )}
      </div>

      {/* Línea divisoria y Métricas Tácticas Inferiores */}
      <div className="mt-4 pt-3.5 border-t border-emerald-800/60 flex items-center justify-between text-xs text-emerald-200/90 px-1 relative z-10">
        {tieneTurnoActivo ? (
          <>
            <div className="flex items-center gap-1.5 truncate">
              <Users className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
              <span><strong>{resumenTurno.totalBoletos}</strong> pasajeros</span>
            </div>
            <div className="flex items-center gap-1.5 truncate">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
              <span><strong>{resumenTurno.frecuenciasCerradas}/{resumenTurno.frecuenciasTotal}</strong> vueltas</span>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 truncate text-[11px]">
              <Clock className="w-3 h-3 text-emerald-300 shrink-0" />
              <span className="truncate">{resumenTurno.proximaFrecuencia || 'Completado'}</span>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-1.5">
              <span>Unidad {busNumero} asignada</span>
            </div>
            <div className="flex items-center gap-1 text-emerald-300 font-bold">
              <span>Configurar turno</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
