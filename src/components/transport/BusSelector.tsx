'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Bus, Check, Search, X, AlertTriangle, Sparkles, ChevronDown } from 'lucide-react';
import { BusItem, TipoOperacionBus } from '../../types/fleet';
import {
  getAllBuses,
  getActiveBus,
  setActiveBus,
  subscribeToActiveBus,
} from '../../lib/fleet-storage';

interface BusSelectorProps {
  /**
   * Circuito esperado del turno o frecuencia (opcional).
   * Se usa únicamente para emitir la advertencia informativa no bloqueante (Zero-Locking).
   */
  currentCircuitType?: TipoOperacionBus;
  /**
   * Callback invocado tras cambiar la unidad activa.
   */
  onBusChange?: (selectedBus: BusItem) => void;
  /**
   * Estilo compacto para cabeceras o barras superiores.
   */
  compact?: boolean;
  /**
   * Clases adicionales para el botón disparador.
   */
  className?: string;
}

export function BusSelector({
  currentCircuitType,
  onBusChange,
  compact = false,
  className = '',
}: BusSelectorProps) {
  const [activeBus, setActiveBusState] = useState<BusItem>(getActiveBus);
  const [isOpen, setIsOpen] = useState(false);
  const [buses, setBuses] = useState<BusItem[]>(getAllBuses);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | TipoOperacionBus>('ALL');
  const [zeroLockWarning, setZeroLockWarning] = useState<string | null>(null);

  // Suscribirse a cambios reactivos de la unidad activa
  useEffect(() => {
    const unsub = subscribeToActiveBus((bus) => {
      setActiveBusState(bus);
    });
    return () => unsub();
  }, []);

  // Actualizar lista de buses al abrir el modal
  const handleOpen = () => {
    setBuses(getAllBuses());
    setSearch('');
    setFilterType('ALL');
    setZeroLockWarning(null);
    setIsOpen(true);
  };

  const handleSelect = (bus: BusItem) => {
    // Regla Zero-Locking: verificar si hay discrepancia de circuito
    if (currentCircuitType && bus.tipoOperacion !== currentCircuitType) {
      const msg =
        bus.tipoOperacion === 'ALIMENTADOR_P'
          ? `Aviso Zero-Locking: Seleccionaste una unidad de circuito Alimentador P (${bus.numeroDisco}) para un turno Troncal VT. Puedes operar con normalidad sin bloqueos.`
          : `Aviso Zero-Locking: Seleccionaste una unidad Troncal de alta capacidad (${bus.numeroDisco}) para un turno con cruce de puente estrecho. Se permite la operación sin bloqueos.`;
      setZeroLockWarning(msg);
    } else {
      setZeroLockWarning(null);
    }

    const updated = setActiveBus(bus.id);
    setActiveBusState(updated);
    if (onBusChange) onBusChange(updated);
    setIsOpen(false);
  };

  // Filtrado de buses
  const filteredBuses = useMemo(() => {
    return buses.filter((b) => {
      const matchSearch =
        b.numeroDisco.toLowerCase().includes(search.toLowerCase()) ||
        b.placa.toLowerCase().includes(search.toLowerCase()) ||
        b.marca.toLowerCase().includes(search.toLowerCase()) ||
        (b.propietario && b.propietario.toLowerCase().includes(search.toLowerCase()));

      const matchFilter =
        filterType === 'ALL' || b.tipoOperacion === filterType;

      return matchSearch && matchFilter;
    });
  }, [buses, search, filterType]);

  return (
    <>
      {/* Botón Disparador Ergonómico (Thumb Zone) */}
      <button
        type="button"
        onClick={handleOpen}
        className={`group flex items-center justify-between gap-2.5 transition-all active:scale-[0.98] ${
          compact
            ? 'px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 border border-white/20 text-white text-xs font-semibold'
            : 'w-full p-3.5 rounded-2xl bg-white hover:bg-gray-50/80 border border-blue-200 shadow-sm text-left'
        } ${className}`}
        aria-label="Seleccionar autobús de la jornada"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`flex items-center justify-center rounded-xl flex-shrink-0 ${
              compact
                ? 'w-6 h-6 bg-white/20 text-white'
                : 'w-10 h-10 bg-blue-50 text-blue-700'
            }`}
          >
            <Bus className={compact ? 'w-3.5 h-3.5' : 'w-5 h-5'} />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span
                className={`font-black tracking-tight ${
                  compact ? 'text-xs text-white' : 'text-sm text-[#3A3A3A]'
                }`}
              >
                Bus {activeBus.numeroDisco}
              </span>
              <span
                className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded uppercase ${
                  compact
                    ? 'bg-white/20 text-white'
                    : 'bg-gray-100 text-gray-700 border border-gray-200'
                }`}
              >
                {activeBus.placa}
              </span>
              {activeBus.numeroDisco === '01' && (
                <span
                  className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded flex items-center gap-0.5 ${
                    compact
                      ? 'bg-amber-400 text-amber-950'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  <Sparkles className="w-2.5 h-2.5" /> Piloto
                </span>
              )}
            </div>

            {!compact && (
              <p className="text-[11px] text-gray-500 truncate mt-0.5">
                {activeBus.marca} •{' '}
                {activeBus.tipoOperacion === 'ALIMENTADOR_P'
                  ? 'Alimentador P'
                  : 'Troncal General VT'}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {!compact && (
            <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">
              Cambiar
            </span>
          )}
          <ChevronDown
            className={`w-4 h-4 text-gray-400 transition-transform ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </div>
      </button>

      {/* Modal / Bottom Sheet Ergonómico */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
          <div
            className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[85dvh] flex flex-col overflow-hidden border border-gray-100"
            role="dialog"
            aria-modal="true"
          >
            {/* Header del Modal */}
            <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center">
                  <Bus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[#3A3A3A]">
                    Seleccionar Autobús de Jornada
                  </h3>
                  <p className="text-xs text-gray-500">
                    Unidad física en la que opera la tripulación
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition-colors"
                aria-label="Cerrar selector"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Aviso Zero-Locking si aplica */}
            {zeroLockWarning && (
              <div className="mx-4 mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2 text-xs text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="leading-tight">{zeroLockWarning}</p>
              </div>
            )}

            {/* Buscador reactivo */}
            <div className="p-4 pb-2 space-y-2 flex-shrink-0">
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por disco (ej. 01), placa, Hino..."
                  className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm text-[#3A3A3A] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                  autoFocus
                />
              </div>

              {/* Chips de filtro por tipo de circuito */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                <button
                  type="button"
                  onClick={() => setFilterType('ALL')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                    filterType === 'ALL'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Todos ({buses.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('TRONCAL_VT')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                    filterType === 'TRONCAL_VT'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Troncal VT (45 pax)
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('ALIMENTADOR_P')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                    filterType === 'ALIMENTADOR_P'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Alimentadores P (Puente)
                </button>
              </div>
            </div>

            {/* Lista Scrollable de Unidades */}
            <div className="flex-1 overflow-y-auto p-4 pt-1 space-y-2.5">
              {filteredBuses.length === 0 ? (
                <div className="py-8 text-center">
                  <Bus className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-xs text-gray-500 font-semibold">
                    No se encontraron autobuses con ese criterio
                  </p>
                </div>
              ) : (
                filteredBuses.map((bus) => {
                  const isSelected = bus.id === activeBus.id;
                  const isPilot = bus.numeroDisco === '01';
                  const isAlimentador = bus.tipoOperacion === 'ALIMENTADOR_P';

                  return (
                    <button
                      key={bus.id}
                      type="button"
                      onClick={() => handleSelect(bus)}
                      className={`w-full text-left p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 active:scale-[0.99] ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50/70 ring-2 ring-blue-200 shadow-sm'
                          : 'border-gray-200 bg-white hover:bg-gray-50/90'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Disco Badge */}
                        <div
                          className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center flex-shrink-0 font-black ${
                            isSelected
                              ? 'bg-blue-600 text-white shadow-sm'
                              : isPilot
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : isAlimentador
                              ? 'bg-purple-100 text-purple-900 border border-purple-200'
                              : 'bg-gray-100 text-gray-800 border border-gray-200'
                          }`}
                        >
                          <span className="text-[9px] uppercase tracking-wider font-semibold opacity-70">
                            Disco
                          </span>
                          <span className="text-base leading-none">
                            {bus.numeroDisco}
                          </span>
                        </div>

                        {/* Detalles de Unidad */}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono text-xs font-bold text-[#3A3A3A]">
                              {bus.placa}
                            </span>
                            {isPilot && (
                              <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-amber-200 text-amber-900 flex items-center gap-0.5">
                                <Sparkles className="w-2.5 h-2.5" /> Socio Líder
                              </span>
                            )}
                            <span
                              className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded ${
                                isAlimentador
                                  ? 'bg-purple-100 text-purple-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {isAlimentador
                                ? 'Alimentador P'
                                : 'Troncal VT'}
                            </span>
                          </div>

                          <p className="text-xs text-gray-600 truncate mt-0.5">
                            {bus.marca} • {bus.capacidadAsientos || 45} asientos
                          </p>

                          {bus.propietario && (
                            <p className="text-[11px] text-gray-400 truncate">
                              {bus.propietario}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Check de Selección */}
                      <div className="flex-shrink-0">
                        {isSelected ? (
                          <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center">
                            <Check className="w-4 h-4 stroke-[3]" />
                          </div>
                        ) : (
                          <div className="w-6 h-6 rounded-full border border-gray-300 group-hover:border-gray-400" />
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Footer Informativo */}
            <div className="p-3 bg-gray-50 border-t border-gray-100 text-center flex-shrink-0">
              <p className="text-[11px] text-gray-500">
                La unidad seleccionada conservará su propio historial de odómetro y mantenimientos.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
