'use client';

import { useState, useEffect } from 'react';
import { Ticket, ArrowRight, Play, CheckCircle2, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
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

            const totalRecaudado = estados.reduce((acc, curr) => acc + (curr.totalRecaudado || 0), 0);
            const totalBoletos = estados.reduce((acc, curr) => acc + (curr.ventasCount || 0), 0);

            setResumenTurno({
              totalRecaudado,
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
    <Card
      onClick={onGoToBoletos}
      className={`cursor-pointer transition-all rounded-3xl border-2 hover:shadow-lg active:scale-[0.99] ${
        user.esActual !== false
          ? 'border-[#912D26] bg-gradient-to-br from-[#912D26] via-[#85251f] to-[#6d1b16] text-white shadow-md shadow-[#912D26]/20'
          : 'border-amber-300 bg-amber-50/70 text-amber-950'
      }`}
    >
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                user.esActual !== false
                  ? 'bg-white text-[#912D26] shadow-sm'
                  : 'bg-amber-500 text-white'
              }`}
            >
              <Ticket className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-sm uppercase tracking-wide">
                  {tieneTurnoActivo ? 'Jornada en Curso' : 'Venta de Boletos en Ruta'}
                </span>
                <span
                  className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                    user.esActual !== false
                      ? 'bg-emerald-400 text-emerald-950'
                      : 'bg-amber-200 text-amber-900'
                  }`}
                >
                  {user.esActual !== false ? 'TURNO ACTIVO' : 'INACTIVO'}
                </span>
              </div>
              <p
                className={`text-xs mt-0.5 leading-tight ${
                  user.esActual !== false ? 'text-white/80' : 'text-amber-800'
                }`}
              >
                {tieneTurnoActivo
                  ? `Grupo ${activeSession?.vtCode} • Fecha: ${activeSession?.fecha}`
                  : 'Seleccionar fecha, grupo VT y emitir boletos por frecuencia'}
              </p>
            </div>
          </div>

          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              user.esActual !== false ? 'bg-white/10 text-white' : 'bg-amber-200/50 text-amber-800'
            }`}
          >
            <ArrowRight className="w-5 h-5" />
          </div>
        </div>

        {/* Resumen dinámico si hay turno en curso */}
        {tieneTurnoActivo && resumenTurno && (
          <div className="grid grid-cols-3 gap-2 bg-black/20 rounded-2xl p-2.5 border border-white/10 text-center mb-3">
            <div>
              <span className="text-[9px] text-white/70 uppercase font-bold block">Recaudado</span>
              <span className="text-base font-black text-emerald-300">
                ${resumenTurno.totalRecaudado.toFixed(2)}
              </span>
            </div>
            <div>
              <span className="text-[9px] text-white/70 uppercase font-bold block">Pasajeros</span>
              <span className="text-base font-black text-white">
                {resumenTurno.totalBoletos}
              </span>
            </div>
            <div>
              <span className="text-[9px] text-white/70 uppercase font-bold block">Vueltas</span>
              <span className="text-base font-black text-amber-200">
                {resumenTurno.frecuenciasCerradas}/{resumenTurno.frecuenciasTotal}
              </span>
            </div>
          </div>
        )}

        {/* Botón de acción destacado */}
        <div
          className={`w-full py-3 px-4 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm ${
            user.esActual !== false
              ? 'bg-white text-[#912D26] hover:bg-slate-50'
              : 'bg-amber-600 text-white'
          }`}
        >
          {tieneTurnoActivo ? (
            <>
              <Play className="w-4 h-4 fill-current" />
              <span>
                Continuar Jornada {resumenTurno?.proximaFrecuencia ? `• ${resumenTurno.proximaFrecuencia}` : ''}
              </span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current" />
              <span>Iniciar Jornada Laboral (Seleccionar VT)</span>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
