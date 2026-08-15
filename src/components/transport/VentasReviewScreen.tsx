'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, Search, Filter, AlertTriangle, Download, Ticket, DollarSign, Users, Clock } from 'lucide-react';

interface VentasReviewScreenProps {
  onBack: () => void;
}

interface Venta {
  id: string;
  fecha: string;
  vtCode: string;
  frecuenciaId: string | null;
  ruta: string;
  parada: string;
  tipo: string;
  tarifaOficial: number;
  cobrado: number;
  hora: string;
  ayudanteId: string;
  ayudanteNombre: string;
  pasajeroTipo?: string;
  createdAt: string;
}

export function VentasReviewScreen({ onBack }: VentasReviewScreenProps) {
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedFecha, setSelectedFecha] = useState(new Date().toISOString().split('T')[0]);
  const [selectedVT, setSelectedVT] = useState('');
  const [vts, setVts] = useState<string[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // Load available VTs from ventas
  useEffect(() => {
    const loadVTs = async () => {
      try {
        const res = await fetch(`/api/ventas?fecha=${selectedFecha}`);
        if (res.ok) {
          const data: Venta[] = await res.json();
          const uniqueVTs = [...new Set(data.map(v => v.vtCode))].sort();
          setVts(uniqueVTs);
        }
      } catch { /* ignore */ }
    };
    loadVTs();
  }, [selectedFecha]);

  // Load ventas when filters change
  const loadVentas = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      let url = `/api/ventas?fecha=${selectedFecha}`;
      if (selectedVT) url += `&vtCode=${selectedVT}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Error al cargar datos');
      const data: Venta[] = await res.json();
      setVentas(data);
      // Auto-expand all groups
      const groups = getGroups(data);
      const expanded: Record<string, boolean> = {};
      Object.keys(groups).forEach(k => { expanded[k] = true; });
      setExpandedGroups(expanded);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      setVentas([]);
    } finally {
      setLoading(false);
    }
  }, [selectedFecha, selectedVT]);

  useEffect(() => { loadVentas(); }, [loadVentas]);

  // Group ventas by time ranges (frequencies)
  const getGroups = (data: Venta[]) => {
    const groups: Record<string, Venta[]> = {};
    data.forEach(v => {
      const h = parseInt(v.hora.split(':')[0]) || 0;
      let group: string;
      if (h < 5) group = '00:00 - 04:59 (Madrugada)';
      else if (h < 8) group = '05:00 - 07:59 (Frecuencia 1)';
      else if (h < 10) group = '08:00 - 09:59 (Frecuencia 2)';
      else if (h < 12) group = '10:00 - 11:59 (Frecuencia 3)';
      else if (h < 14) group = '12:00 - 13:59 (Frecuencia 4)';
      else if (h < 16) group = '14:00 - 15:59 (Frecuencia 5)';
      else if (h < 18) group = '16:00 - 17:59 (Frecuencia 6)';
      else if (h < 20) group = '18:00 - 19:59 (Frecuencia 7)';
      else group = '20:00 - 23:59 (Noche)';
      if (!groups[group]) groups[group] = [];
      groups[group].push(v);
    });
    return groups;
  };

  const groups = getGroups(ventas);

  // Stats
  const totalPasajeros = ventas.length;
  const totalRecaudado = ventas.reduce((s, v) => s + v.cobrado, 0);
  const rutas = [...new Set(ventas.map(v => v.ruta))];
  const ayudantes = [...new Set(ventas.map(v => v.ayudanteNombre))];

  // Alert: suspicious prices
  const sospechosas = ventas.filter(v => v.cobrado > 10);

  const toggleGroup = (key: string) => {
    setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const exportCSV = () => {
    if (ventas.length === 0) return;
    const headers = '#,Hora,Ruta,Direccion,Parada,Tarifa Oficial,Cobrado,Tipo Pasajero,Ayudante';
    const rows = ventas.map((v, i) =>
      `${i + 1},${v.hora},"${v.ruta}",${v.tipo},"${v.parada}",${v.tarifaOficial.toFixed(2)},${v.cobrado.toFixed(2)},${v.pasajeroTipo || 'entero'},"${v.ayudanteNombre}"`
    );
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ventas_${selectedFecha}${selectedVT ? '_' + selectedVT : ''}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col min-h-[100dvh] bg-gray-50">
      {/* Header */}
      <div className="bg-[#912D26] text-white px-4 py-3">
        <div className="flex items-center justify-between">
          <button onClick={onBack} className="text-gray-300"><ChevronLeft className="w-6 h-6" /></button>
          <div className="text-center">
            <h2 className="text-lg font-bold">Revision de Ventas</h2>
            <p className="text-gray-300 text-xs">Boletos sincronizados</p>
          </div>
          <div className="w-6" />
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 space-y-3">
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-xs font-medium text-gray-500 mb-1 block">Fecha</label>
            <input
              type="date"
              value={selectedFecha}
              onChange={e => setSelectedFecha(e.target.value)}
              className="w-full h-11 rounded-xl border border-[#D6D6D6] px-3 text-sm font-semibold text-[#3A3A3A]"
            />
          </div>
          <div className="flex-1">
            <label className="text-xs font-medium text-gray-500 mb-1 block">Vehiculo (VT)</label>
            <select
              value={selectedVT}
              onChange={e => setSelectedVT(e.target.value)}
              className="w-full h-11 rounded-xl border border-[#D6D6D6] px-3 text-sm font-semibold text-[#3A3A3A] bg-white"
            >
              <option value="">Todos</option>
              {vts.map(vt => (
                <option key={vt} value={vt}>{vt}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Stats bar */}
        {!loading && ventas.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-[#912D26]/5 rounded-xl px-3 py-2 text-center">
              <div className="flex items-center justify-center gap-1 mb-0.5">
                <Ticket className="w-3 h-3 text-[#912D26]" />
              </div>
              <span className="font-black text-lg text-[#912D26]">{totalPasajeros}</span>
              <p className="text-[10px] text-gray-500">Pasajeros</p>
            </div>
            <div className="bg-green-50 rounded-xl px-3 py-2 text-center">
              <div className="flex items-center justify-center gap-1 mb-0.5">
                <DollarSign className="w-3 h-3 text-green-600" />
              </div>
              <span className="font-black text-lg text-green-700">${totalRecaudado.toFixed(2)}</span>
              <p className="text-[10px] text-gray-500">Recaudado</p>
            </div>
            <div className="bg-blue-50 rounded-xl px-3 py-2 text-center">
              <div className="flex items-center justify-center gap-1 mb-0.5">
                <Users className="w-3 h-3 text-blue-600" />
              </div>
              <span className="font-black text-lg text-blue-700">{ayudantes.length}</span>
              <p className="text-[10px] text-gray-500">Ayudante{ayudantes.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
        )}

        {/* Alerts */}
        {sospechosas.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-2.5 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-red-700">
              <p className="font-bold">{sospechosas.length} venta{sospechosas.length > 1 ? 's' : ''} con precio sospechoso (mayor a $10)</p>
              {sospechosas.map(v => (
                <p key={v.id} className="text-red-600 mt-0.5">{v.hora} | {v.parada} | <span className="font-bold">${v.cobrado.toFixed(2)}</span></p>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {loading && (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-[#912D26]/30 border-t-[#912D26] rounded-full animate-spin mx-auto mb-3" />
            <p className="text-gray-400 text-sm">Cargando ventas...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 rounded-xl p-4 text-center">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {!loading && !error && ventas.length === 0 && (
          <div className="text-center py-12">
            <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400">No hay ventas sincronizadas para esta fecha</p>
          </div>
        )}

        {/* Grouped ventas */}
        {!loading && Object.entries(groups).map(([groupName, items]) => {
          const groupTotal = items.reduce((s, v) => s + v.cobrado, 0);
          const isExpanded = expandedGroups[groupName] !== false;

          return (
            <div key={groupName} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {/* Group header */}
              <button
                onClick={() => toggleGroup(groupName)}
                className="w-full p-3 flex items-center justify-between bg-gray-50/50 active:bg-gray-100"
              >
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#912D26]" />
                  <span className="text-sm font-bold text-[#3A3A3A]">{groupName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">{items.length} boletos</span>
                  <span className="text-xs font-bold text-green-600">${groupTotal.toFixed(2)}</span>
                  <svg className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {/* Group content */}
              {isExpanded && (
                <div className="divide-y divide-gray-50">
                  {/* Column headers */}
                  <div className="px-3 py-1.5 flex items-center text-[10px] font-bold text-gray-400 uppercase">
                    <span className="w-6">#</span>
                    <span className="flex-1">Parada</span>
                    <span className="w-16 text-right">Precio</span>
                  </div>
                  {items.map((v, i) => (
                    <div key={v.id} className={`px-3 py-1.5 flex items-center text-xs ${v.cobrado > 10 ? 'bg-red-50' : ''}`}>
                      <span className="w-6 text-gray-400 font-bold">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <span className="text-[#3A3A3A] font-medium">{v.parada}</span>
                        <span className="text-gray-400 ml-1">{v.tipo === 'ida' ? '→' : '←'}</span>
                      </div>
                      <span className={`w-16 text-right font-bold ${v.cobrado > 10 ? 'text-red-600' : 'text-[#912D26]'}`}>
                        ${v.cobrado.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom bar */}
      {!loading && ventas.length > 0 && (
        <div className="bg-white border-t border-gray-200 px-4 py-3">
          <button
            onClick={exportCSV}
            className="w-full py-3 rounded-xl bg-[#912D26] text-white font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            <Download className="w-4 h-4" />
            Exportar CSV ({ventas.length} ventas)
          </button>
        </div>
      )}
    </div>
  );
}
