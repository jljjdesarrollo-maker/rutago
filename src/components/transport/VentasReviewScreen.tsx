'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { deleteVentasByVT } from '@/lib/indexeddb';
import {
  ChevronLeft,
  Search,
  Filter,
  AlertTriangle,
  Download,
  Ticket,
  DollarSign,
  Users,
  Clock,
  Bus,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Zap,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Sparkles,
  Layers,
  Trash2
} from 'lucide-react';

interface VentasReviewScreenProps {
  onBack: () => void;
}

interface FrecuenciaRel {
  id: string;
  nombre: string;
  ruta: string;
  hora: string;
  direccion: string;
}

interface Venta {
  id: string;
  fecha: string;
  fechaOperacion?: string;
  diaTurno?: number;
  fechaEmision?: string;
  syncedAt?: string;
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
  frecuencia?: FrecuenciaRel | null;
}

interface FrecuenciaAgrupada {
  key: string;
  frecuenciaId: string | null;
  hora: string;
  titulo: string;
  ruta: string;
  tipo: string; // "ida" | "vuelta" | "especial"
  vtCode: string;
  ayudanteNombre: string;
  esPernoctaDia2: boolean;
  esHuerfano: boolean;
  totalBoletos: number;
  totalRecaudado: number;
  primeraEmision: string;
  ultimaEmision: string;
  boletos: Venta[];
  tieneSospechas: boolean;
  alertasCount: number;
}

function formatFechaOperacion(isoDate: string): string {
  if (!isoDate) return '';
  const parts = isoDate.split('-');
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    const dateObj = new Date(y, m, d);
    return dateObj.toLocaleDateString('es-EC', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }
  return isoDate;
}

// Formato de hora, minuto y segundo exacto (HH:MM:SS) para auditoría
function formatExactHMS(v: Venta): string {
  const ts = v.fechaEmision || v.createdAt;
  if (ts) {
    try {
      const d = new Date(ts);
      if (!isNaN(d.getTime())) {
        return d.toLocaleTimeString('es-EC', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        });
      }
    } catch { /* ignore */ }
  }
  return v.hora ? `${v.hora}:00` : '--:--:--';
}

export function VentasReviewScreen({ onBack }: VentasReviewScreenProps) {
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [selectedFecha, setSelectedFecha] = useState(todayStr);
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Filtros rápidos opcionales
  const [selectedVT, setSelectedVT] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedFrecuencias, setExpandedFrecuencias] = useState<Record<string, boolean>>({});

  // Estado para modal de purga/eliminación segura de boletos de prueba
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [vtToDelete, setVtToDelete] = useState<string>('');
  const [deleting, setDeleting] = useState(false);
  const [deleteSuccessMsg, setDeleteSuccessMsg] = useState('');

  // Estado para reasignación de frecuencias (PENDIENTE #3)
  const [showReasignarModal, setShowReasignarModal] = useState(false);
  const [frecuenciaToReasign, setFrecuenciaToReasign] = useState<FrecuenciaAgrupada | null>(null);
  const [catalogoFrecuencias, setCatalogoFrecuencias] = useState<FrecuenciaRel[]>([]);
  const [reasignando, setReasignando] = useState(false);
  const [reasignSuccessMsg, setReasignSuccessMsg] = useState('');

  const abrirReasignacion = async (frec: FrecuenciaAgrupada) => {
    setFrecuenciaToReasign(frec);
    setShowReasignarModal(true);
    try {
      const res = await fetch('/api/frecuencias?all=true');
      if (res.ok) {
        const data: FrecuenciaRel[] = await res.json();
        const filtered = frec.vtCode && frec.vtCode !== 'VT' && frec.vtCode !== 'GENERAL'
          ? data.filter(d => (d as any).vtCode === frec.vtCode)
          : data;
        setCatalogoFrecuencias(filtered.length > 0 ? filtered : data);
      }
    } catch (err) {
      console.error('Error cargando frecuencias:', err);
    }
  };

  const ejecutarReasignacion = async (targetFrecuenciaId: string) => {
    if (!frecuenciaToReasign) return;
    setReasignando(true);
    try {
      const ticketIds = frecuenciaToReasign.boletos.map(b => b.id);
      const res = await fetch('/api/ventas', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketIds,
          frecuenciaId: targetFrecuenciaId,
        }),
      });
      if (!res.ok) throw new Error('Error al reasignar boletos');
      const json = await res.json();
      setReasignSuccessMsg(json.message || 'Boletos reasignados con éxito');
      setTimeout(() => setReasignSuccessMsg(''), 4000);
      setShowReasignarModal(false);
      setFrecuenciaToReasign(null);
      await loadVentas(selectedFecha);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al reasignar boletos');
    } finally {
      setReasignando(false);
    }
  };

  // Cargar ventas de la fecha de operación
  const loadVentas = useCallback(async (fecha: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/ventas?fecha=${fecha}`);
      if (!res.ok) throw new Error('Error al obtener las ventas del servidor');
      const data: Venta[] = await res.json();
      setVentas(data);

      // Auto-expandir la primera frecuencia o todas si son pocas (<= 4)
      const initialExpanded: Record<string, boolean> = {};
      setExpandedFrecuencias(initialExpanded);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido al conectar');
      setVentas([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVentas(selectedFecha);
  }, [selectedFecha, loadVentas]);

  // Lista de VTs presentes en las ventas del día
  const vtsDisponibles = useMemo(() => {
    const list = [...new Set(ventas.map(v => v.vtCode).filter(Boolean))].sort();
    return list;
  }, [ventas]);

  // Conteo de boletos por VT
  const vtCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    ventas.forEach(v => {
      if (v.vtCode) counts[v.vtCode] = (counts[v.vtCode] || 0) + 1;
    });
    return counts;
  }, [ventas]);

  // Agrupación por Frecuencia Realizada (Lógica similar a Arqueo General)
  const frecuenciasAgrupadas = useMemo(() => {
    // 1. Filtrar por VT si el usuario seleccionó uno
    let data = selectedVT ? ventas.filter(v => v.vtCode === selectedVT) : ventas;

    // 2. Filtrar por término de búsqueda si existe (parada, ayudante, ruta)
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      data = data.filter(v =>
        v.parada?.toLowerCase().includes(term) ||
        v.ayudanteNombre?.toLowerCase().includes(term) ||
        v.ruta?.toLowerCase().includes(term) ||
        v.hora?.toLowerCase().includes(term)
      );
    }

    const map: Record<string, FrecuenciaAgrupada> = {};

    data.forEach(v => {
      let key = '';
      let hora = v.frecuencia?.hora || v.hora || '--:--';
      let ruta = v.frecuencia?.ruta || v.ruta || 'Ruta estándar';
      let tipo = v.frecuencia?.direccion || v.tipo || 'ida';
      let esHuerfano = false;

      // Agrupación estricta por frecuenciaId oficial que corresponde a la fecha de operación
      if (v.frecuenciaId) {
        key = `FREC_${v.vtCode || 'VT'}_${v.frecuenciaId}`;
        if (v.frecuencia) {
          hora = v.frecuencia.hora || hora;
          ruta = v.frecuencia.nombre || v.frecuencia.ruta || ruta;
          tipo = v.frecuencia.direccion || tipo;
        }
      } else if (v.ruta) {
        // Fallback inteligente: si aún no tiene frecuenciaId enlazado en BD pero tiene ruta y hora de venta,
        // se agrupa por su salida operativa real para NO esconder los boletos del día
        key = `RUTA_${v.vtCode || 'VT'}_${hora.slice(0, 5)}_${ruta}_${tipo}`;
      } else {
        // Boletos No Asignados a Frecuencia (Ventas registradas sin despacho oficial)
        key = `HUERFANOS_${v.vtCode || 'GENERAL'}`;
        esHuerfano = true;
        hora = '--:--';
        tipo = 'especial';
        ruta = 'Boletos No Asignados a Frecuencia';
      }

      if (!map[key]) {
        let titulo = '';
        if (esHuerfano) {
          titulo = '⚠️ Boletos No Asignados a Frecuencia';
        } else if (v.frecuencia) {
          titulo = `${hora} • ${ruta}`;
        } else {
          titulo = `${hora} • ${ruta}`;
        }

        map[key] = {
          key,
          frecuenciaId: v.frecuenciaId || null,
          hora,
          titulo,
          ruta,
          tipo,
          vtCode: v.vtCode || 'VT',
          ayudanteNombre: v.ayudanteNombre || 'Sin asignar',
          esPernoctaDia2: false,
          esHuerfano,
          totalBoletos: 0,
          totalRecaudado: 0,
          primeraEmision: '',
          ultimaEmision: '',
          boletos: [],
          tieneSospechas: false,
          alertasCount: 0,
        };
      }

      // Si algún boleto pertenece al día 2 del turno, marcar la frecuencia como pernocta
      if (v.diaTurno === 2 && !esHuerfano) {
        map[key].esPernoctaDia2 = true;
      }

      map[key].boletos.push(v);
      map[key].totalBoletos += 1;
      map[key].totalRecaudado += v.cobrado;
    });

    // Ordenar boletos cronológicamente (hora, min, seg) dentro de cada frecuencia
    const result = Object.values(map);
    result.forEach(frec => {
      frec.boletos.sort((a, b) => {
        const timeA = new Date(a.fechaEmision || a.createdAt).getTime();
        const timeB = new Date(b.fechaEmision || b.createdAt).getTime();
        if (!isNaN(timeA) && !isNaN(timeB) && timeA !== timeB) {
          return timeA - timeB;
        }
        return (a.hora || '').localeCompare(b.hora || '');
      });

      if (frec.boletos.length > 0) {
        frec.primeraEmision = formatExactHMS(frec.boletos[0]);
        frec.ultimaEmision = formatExactHMS(frec.boletos[frec.boletos.length - 1]);
      }

      // Detección de sospechas antifraude dentro de la frecuencia:
      // a) Emisiones ultra-rápidas en menos de 5 segundos
      // b) Tarifas > $10
      let alertas = 0;
      for (let i = 0; i < frec.boletos.length; i++) {
        const b = frec.boletos[i];
        if (b.cobrado > 10) alertas++;
        if (i > 0) {
          const prev = frec.boletos[i - 1];
          const tPrev = new Date(prev.fechaEmision || prev.createdAt).getTime();
          const tCurr = new Date(b.fechaEmision || b.createdAt).getTime();
          if (!isNaN(tPrev) && !isNaN(tCurr) && (tCurr - tPrev) >= 0 && (tCurr - tPrev) <= 4000) {
            alertas++;
          }
        }
      }
      frec.tieneSospechas = alertas > 0;
      frec.alertasCount = alertas;
    });

    // Ordenar frecuencias cronológicamente:
    // 1. Frecuencias oficiales primero (no huérfanas)
    // 2. Día 1 primero (por hora de salida), Día 2 (Pernocta) después
    // 3. Boletos no asignados a frecuencia al final como bandeja de auditoría
    result.sort((a, b) => {
      if (a.esHuerfano !== b.esHuerfano) {
        return a.esHuerfano ? 1 : -1;
      }
      if (a.esPernoctaDia2 !== b.esPernoctaDia2) {
        return a.esPernoctaDia2 ? 1 : -1;
      }
      return (a.hora || '').localeCompare(b.hora || '');
    });

    return result;
  }, [ventas, selectedVT, searchTerm]);

  // Totales globales del día
  const totalPasajeros = useMemo(() => ventas.reduce((acc, v) => acc + (selectedVT ? (v.vtCode === selectedVT ? 1 : 0) : 1), 0), [ventas, selectedVT]);
  const totalRecaudado = useMemo(() => ventas.reduce((acc, v) => acc + (selectedVT ? (v.vtCode === selectedVT ? v.cobrado : 0) : v.cobrado), 0), [ventas, selectedVT]);
  const totalFrecuencias = frecuenciasAgrupadas.length;

  const toggleFrecuencia = (key: string) => {
    setExpandedFrecuencias(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const expandAll = () => {
    const all: Record<string, boolean> = {};
    frecuenciasAgrupadas.forEach(f => { all[f.key] = true; });
    setExpandedFrecuencias(all);
  };

  const collapseAll = () => {
    setExpandedFrecuencias({});
  };

  const handleConfirmDelete = async () => {
    if (!vtToDelete) return;
    setDeleting(true);
    try {
      // 1. Purgar en la Base de Datos central (Vercel Postgres)
      const res = await fetch(`/api/ventas?vtCode=${vtToDelete}&fecha=${selectedFecha}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Error al eliminar en la base de datos');
      }
      const data = await res.json();

      // 2. Purgar en el almacenamiento local del teléfono (IndexedDB)
      try {
        await deleteVentasByVT(vtToDelete, selectedFecha);
      } catch (idbErr) {
        console.warn('Advertencia borrando en IndexedDB local:', idbErr);
      }

      // 3. Recargar datos frescos
      await loadVentas(selectedFecha);
      setShowDeleteModal(false);
      if (selectedVT === vtToDelete) {
        setSelectedVT('');
      }
      setDeleteSuccessMsg(`✓ Se eliminaron correctamente ${data.count} boletos de ${vtToDelete} para el ${selectedFecha}`);
      setTimeout(() => setDeleteSuccessMsg(''), 6000);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al eliminar boletos');
    } finally {
      setDeleting(false);
    }
  };

  // Exportar reporte de auditoría a CSV
  const exportCSV = () => {
    if (ventas.length === 0) return;
    const headers = '#_En_Frecuencia,Frecuencia_Hora,Ruta,Sentido,Grupo_VT,Dia_Turno,Hora_Minuto_Segundo,Fecha_Operacion,Timestamp_Emision_UTC,Parada_Destino,Tipo_Pasajero,Tarifa_Oficial,Monto_Cobrado,Ayudante,ID_Boleto';
    const rows: string[] = [];

    frecuenciasAgrupadas.forEach(f => {
      f.boletos.forEach((v, idx) => {
        const hms = formatExactHMS(v);
        const fechaOp = v.fechaOperacion || v.fecha;
        const diaT = v.diaTurno || (f.esPernoctaDia2 ? 2 : 1);
        const fEmision = v.fechaEmision || v.createdAt;
        rows.push(`${idx + 1},"${f.hora}","${f.ruta}","${f.tipo}","${v.vtCode}",${diaT},"${hms}","${fechaOp}","${fEmision}","${v.parada}","${v.pasajeroTipo || 'normal'}",${v.tarifaOficial.toFixed(2)},${v.cobrado.toFixed(2)},"${v.ayudanteNombre}","${v.id}"`);
      });
    });

    const csvContent = [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Auditoria_Boletos_${selectedFecha}_${selectedVT || 'TODOS'}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-[100dvh] bg-gray-50 flex flex-col">
      {/* ─── Cabecera Superior ─── */}
      <header className="bg-[#912D26] text-white px-4 py-3 shadow-md sticky top-0 z-30 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <button
            onClick={onBack}
            className="w-10 h-10 -ml-1 rounded-xl flex items-center justify-center text-white/90 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
            aria-label="Volver"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-base font-black tracking-tight leading-tight">
              Revisión de Boletos
            </h1>
            <p className="text-[11px] text-white/80 font-medium">
              Detalle por frecuencias realizadas
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => loadVentas(selectedFecha)}
            disabled={loading}
            className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/10 hover:bg-white/20 active:scale-95 transition-all"
            title="Refrescar datos"
          >
            <RefreshCw className={`w-4 h-4 text-white ${loading ? 'animate-spin' : ''}`} />
          </button>
          {ventas.length > 0 && (
            <button
              onClick={exportCSV}
              className="px-2.5 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold flex items-center gap-1 active:scale-95 transition-all shadow-sm"
              title="Descargar reporte en CSV con segundos"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Exportar</span>
            </button>
          )}
        </div>
      </header>

      {/* ─── Panel Principal de Control (Estilo Arqueo General) ─── */}
      <div className="p-3 sm:p-4 space-y-3 max-w-4xl mx-auto w-full flex-1">
        {/* Selector de Fecha de Operación */}
        <div className="bg-white rounded-2xl p-3.5 border border-gray-200/80 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#912D26]/10 text-[#912D26] flex items-center justify-center flex-shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                  Fecha de Operación
                </label>
                <div className="text-sm font-extrabold text-gray-800 capitalize">
                  {formatFechaOperacion(selectedFecha)}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="date"
                value={selectedFecha}
                onChange={e => setSelectedFecha(e.target.value)}
                className="h-10 px-3 rounded-xl border border-gray-300 text-xs font-bold text-gray-800 bg-gray-50 focus:bg-white focus:border-[#912D26] focus:outline-none shadow-inner"
              />
            </div>
          </div>

          {/* Filtro Rápido por Grupo VT (si hay más de 1) */}
          {vtsDisponibles.length > 1 && (
            <div className="pt-2 border-t border-gray-100 flex items-center gap-1.5 overflow-x-auto pb-0.5">
              <span className="text-[10px] font-bold uppercase text-gray-400 mr-1 flex-shrink-0">
                Grupo VT:
              </span>
              <button
                onClick={() => setSelectedVT('')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex-shrink-0 ${
                  selectedVT === ''
                    ? 'bg-[#912D26] text-white shadow-sm'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Todos ({ventas.length})
              </button>
              {vtsDisponibles.map(vt => (
                <button
                  key={vt}
                  onClick={() => setSelectedVT(vt)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex-shrink-0 ${
                    selectedVT === vt
                      ? 'bg-[#912D26] text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {vt} ({vtCounts[vt] || 0})
                </button>
              ))}

              {/* Botón de purga de boletos de prueba cuando se filtra por un VT */}
              {selectedVT && (vtCounts[selectedVT] || 0) > 0 && (
                <button
                  onClick={() => {
                    setVtToDelete(selectedVT);
                    setShowDeleteModal(true);
                  }}
                  className="ml-auto px-2.5 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold flex items-center gap-1.5 border border-red-200 transition-all flex-shrink-0 active:scale-95"
                  title={`Eliminar únicamente los ${vtCounts[selectedVT]} boletos de ${selectedVT}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Borrar boletos {selectedVT}</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* ─── Resumen General del Día ─── */}
        {!loading && (
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white border border-gray-200/80 rounded-2xl p-2.5 text-center shadow-sm">
              <div className="flex items-center justify-center gap-1 mb-0.5 text-gray-500">
                <Layers className="w-3.5 h-3.5 text-[#912D26]" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Frecuencias</span>
              </div>
              <span className="font-black text-lg text-gray-900">{totalFrecuencias}</span>
            </div>

            <div className="bg-white border border-gray-200/80 rounded-2xl p-2.5 text-center shadow-sm">
              <div className="flex items-center justify-center gap-1 mb-0.5 text-blue-600">
                <Ticket className="w-3.5 h-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Boletos</span>
              </div>
              <span className="font-black text-lg text-gray-900">{totalPasajeros}</span>
            </div>

            <div className="bg-white border border-gray-200/80 rounded-2xl p-2.5 text-center shadow-sm">
              <div className="flex items-center justify-center gap-1 mb-0.5 text-emerald-600">
                <DollarSign className="w-3.5 h-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Recaudado</span>
              </div>
              <span className="font-black text-lg text-emerald-700">
                ${totalRecaudado.toFixed(2)}
              </span>
            </div>
          </div>
        )}

        {/* Buscador y botones de expandir/contraer */}
        {frecuenciasAgrupadas.length > 0 && (
          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Buscar por parada, ayudante..."
                className="w-full h-9 pl-8 pr-3 rounded-xl border border-gray-300 text-xs text-gray-800 bg-white placeholder-gray-400 focus:border-[#912D26] focus:outline-none shadow-sm"
              />
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={expandAll}
                className="px-2 py-1.5 text-[11px] font-bold text-[#912D26] bg-[#912D26]/5 rounded-lg hover:bg-[#912D26]/10 active:scale-95"
              >
                Expandir
              </button>
              <button
                onClick={collapseAll}
                className="px-2 py-1.5 text-[11px] font-bold text-gray-500 bg-gray-100 rounded-lg hover:bg-gray-200 active:scale-95"
              >
                Colapsar
              </button>
            </div>
          </div>
        )}

        {/* ─── Mensaje de Carga / Error / Vacío ─── */}
        {loading && (
          <div className="bg-white rounded-2xl p-8 text-center border border-gray-200/80 shadow-sm">
            <RefreshCw className="w-8 h-8 text-[#912D26] animate-spin mx-auto mb-2.5" />
            <p className="text-xs font-bold text-gray-600">Cargando frecuencias y boletos...</p>
          </div>
        )}

        {error && !loading && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-xs font-semibold flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!loading && !error && frecuenciasAgrupadas.length === 0 && (
          <div className="bg-white rounded-2xl p-8 text-center border border-gray-200/80 shadow-sm space-y-2">
            <Ticket className="w-12 h-12 text-gray-300 mx-auto" />
            <h3 className="text-sm font-extrabold text-gray-700">
              No hay boletos registrados para esta fecha
            </h3>
            <p className="text-xs text-gray-400 max-w-sm mx-auto">
              Verifica si la jornada ya fue sincronizada o selecciona otra fecha en el calendario superior.
            </p>
          </div>
        )}

        {/* ─── LISTA DE FRECUENCIAS DEL DÍA (Tarjetas Estilo Arqueo) ─── */}
        {!loading && frecuenciasAgrupadas.map((frec, idx) => {
          const isExpanded = expandedFrecuencias[frec.key] ?? false;
          const isIda = frec.tipo === 'ida';

          return (
            <div
              key={frec.key}
              className="bg-white rounded-2xl border border-gray-200/90 shadow-sm overflow-hidden transition-all"
            >
              {/* Encabezado Clickeable de la Frecuencia (Thumb friendly) */}
              <button
                onClick={() => toggleFrecuencia(frec.key)}
                className="w-full text-left p-3 sm:p-3.5 flex items-center justify-between gap-2.5 hover:bg-gray-50/80 active:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  {/* Badge de Hora / Sentido */}
                  <div
                    className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center flex-shrink-0 font-bold ${
                      isIda
                        ? 'bg-blue-50 text-blue-800 border border-blue-200/80'
                        : 'bg-emerald-50 text-emerald-800 border border-emerald-200/80'
                    }`}
                  >
                    <span className="text-[13px] font-black leading-none">{frec.hora}</span>
                    <span className="text-[9px] uppercase tracking-wider font-extrabold mt-0.5">
                      {isIda ? 'Ida →' : '← Vlta'}
                    </span>
                  </div>

                  {/* Detalle de Ruta y Ayudante */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-extrabold text-gray-900 truncate">
                        {frec.ruta}
                      </span>
                      {frec.esPernoctaDia2 && (
                        <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[9px] font-black px-1.5 py-0.2 rounded-md uppercase tracking-tight flex items-center gap-1">
                          <span>🌙</span> Día 2 (Pernocta)
                        </span>
                      )}
                      {frec.tieneSospechas && (
                        <span
                          className="bg-red-100 text-red-800 text-[9px] font-bold px-1.5 py-0.2 rounded-md flex items-center gap-0.5"
                          title={`${frec.alertasCount} alerta(s) de posible emisión rápida o tarifa atípica`}
                        >
                          <AlertTriangle className="w-2.5 h-2.5" />
                          {frec.alertasCount} alerta(s)
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-1 text-[11px] text-gray-500 flex-wrap">
                      <span className="inline-flex items-center gap-1 font-semibold text-gray-700">
                        <Bus className="w-3 h-3 text-[#912D26]" />
                        {frec.vtCode}
                      </span>
                      <span>•</span>
                      <span className="truncate">
                        Ayudante: <strong className="text-gray-700">{frec.ayudanteNombre || 'Sin asignar'}</strong>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Subtotales y Chevron de despliegue */}
                <div className="flex items-center gap-2 flex-shrink-0 text-right">
                  <div>
                    <div className="text-sm font-black text-gray-900 leading-tight">
                      ${frec.totalRecaudado.toFixed(2)}
                    </div>
                    <div className="text-[10px] font-bold text-gray-400">
                      {frec.totalBoletos} boletos
                    </div>
                  </div>
                  <div className="w-7 h-7 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center">
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                </div>
              </button>

              {/* ─── DETALLE DESPLEGABLE DE BOLETOS CON HORA:MINUTO:SEGUNDO ─── */}
              {isExpanded && (
                <div className="border-t border-gray-100 bg-gray-50/50">
                  {frec.esHuerfano && (
                    <div className="p-3 bg-amber-50 border-b border-amber-200/80 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-xs text-amber-900 font-semibold">
                        <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                        <span>Boletos pendientes de asignación a frecuencia oficial.</span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          abrirReasignacion(frec);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-[#912D26] hover:bg-[#7a251f] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all flex-shrink-0"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Asignar Vuelta</span>
                      </button>
                    </div>
                  )}
                  {/* Barra informativa de la vuelta */}
                  <div className="px-3.5 py-2 bg-white border-b border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
                    <span className="font-semibold flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[#912D26]" />
                      Emisión: {frec.primeraEmision} a {frec.ultimaEmision}
                    </span>
                    <span className="font-mono text-gray-400 text-[10px]">
                      {frec.boletos.length} tickets emitidos
                    </span>
                  </div>

                  {/* Encabezado de columnas de auditoría */}
                  <div className="px-3.5 py-1.5 bg-gray-100/70 text-[10px] font-black text-gray-500 uppercase tracking-wider flex items-center">
                    <span className="w-20 font-mono">Hora (H:M:S)</span>
                    <span className="flex-1 px-1">Parada / Destino</span>
                    <span className="w-14 text-center">Tipo</span>
                    <span className="w-14 text-right">Monto</span>
                  </div>

                  {/* Filas de boletos */}
                  <div className="divide-y divide-gray-100 bg-white">
                    {frec.boletos.map((b, i) => {
                      const hms = formatExactHMS(b);
                      const esMedia = b.pasajeroTipo === 'media';
                      const isSospechoso = b.cobrado > 10;

                      // Control antifraude: calcular si se emitió en ráfaga (< 5 segs del anterior)
                      let esRafaga = false;
                      let segsDiferencia: number | null = null;
                      if (i > 0) {
                        const prev = frec.boletos[i - 1];
                        const tPrev = new Date(prev.fechaEmision || prev.createdAt).getTime();
                        const tCurr = new Date(b.fechaEmision || b.createdAt).getTime();
                        if (!isNaN(tPrev) && !isNaN(tCurr)) {
                          const diffSecs = Math.round((tCurr - tPrev) / 1000);
                          if (diffSecs >= 0 && diffSecs <= 4) {
                            esRafaga = true;
                            segsDiferencia = diffSecs;
                          }
                        }
                      }

                      return (
                        <div
                          key={b.id}
                          className={`px-3.5 py-2 flex items-center text-xs transition-colors ${
                            isSospechoso
                              ? 'bg-red-50/70 text-red-900'
                              : esRafaga
                              ? 'bg-amber-50/40 hover:bg-amber-50/70'
                              : 'hover:bg-gray-50'
                          }`}
                        >
                          {/* Hora Minuto Segundo Exacto */}
                          <div className="w-20 flex-shrink-0 font-mono">
                            <span className="text-[11px] font-black text-gray-900 block tracking-tight">
                              {hms}
                            </span>
                            <div className="flex items-center gap-1">
                              <span className="text-[9px] text-gray-400 font-bold">
                                #{i + 1}
                              </span>
                              {b.diaTurno === 2 && (
                                <span className="bg-amber-100 text-amber-900 font-black text-[8px] px-1 rounded">
                                  D2
                                </span>
                              )}
                              {esRafaga && (
                                <span
                                  className="text-amber-600 text-[10px]"
                                  title={`Emitido a ${segsDiferencia}s del ticket anterior`}
                                >
                                  ⚡
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Parada / Tramo */}
                          <div className="flex-1 min-w-0 px-1">
                            <div className="flex items-center gap-1 truncate">
                              <span className="font-bold text-gray-800 text-[11px] truncate">
                                {b.parada}
                              </span>
                            </div>
                            {b.tarifaOficial > 0 && b.tarifaOficial !== b.cobrado && (
                              <span className="text-[9px] text-gray-400 block truncate">
                                Oficial: ${b.tarifaOficial.toFixed(2)}
                              </span>
                            )}
                          </div>

                          {/* Tipo Pasajero */}
                          <div className="w-14 text-center flex-shrink-0">
                            <span
                              className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                                esMedia
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {esMedia ? 'Media' : 'Entero'}
                            </span>
                          </div>

                          {/* Monto Cobrado */}
                          <div className="w-14 text-right flex-shrink-0 font-mono">
                            <span
                              className={`font-black text-xs ${
                                b.cobrado === 0 ? 'text-green-600' : 'text-gray-900'
                              }`}
                            >
                              ${b.cobrado.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Subtotal de la Frecuencia al pie */}
                  <div className="px-3.5 py-2.5 bg-gray-100/90 border-t border-gray-200 flex items-center justify-between text-xs font-black text-gray-800">
                    <span>Subtotal Frecuencia {frec.hora}:</span>
                    <span className="font-mono text-sm text-[#912D26]">
                      {frec.totalBoletos} boletos • ${frec.totalRecaudado.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {/* Mensaje de éxito tras borrado */}
        {deleteSuccessMsg && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl p-3.5 text-xs font-bold flex items-center gap-2 shadow-sm animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{deleteSuccessMsg}</span>
          </div>
        )}

        {/* Modal de confirmación de eliminación segura */}
        {showDeleteModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3 sm:p-4 animate-fade-in">
            <div className="bg-white rounded-3xl p-5 w-full max-w-md shadow-2xl border border-gray-100 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6" />
              </div>

              <div className="text-center space-y-1">
                <h3 className="text-base font-black text-gray-900">
                  ¿Eliminar boletos de {vtToDelete}?
                </h3>
                <p className="text-xs text-gray-500">
                  Fecha de operación: <strong className="text-gray-800">{formatFechaOperacion(selectedFecha)}</strong>
                </p>
              </div>

              <div className="bg-red-50/70 border border-red-200/80 rounded-2xl p-3 text-xs text-red-900 space-y-1.5">
                <div className="font-bold flex items-center gap-1.5 text-red-800">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 text-red-600" />
                  <span>Detalle de registros a eliminar:</span>
                </div>
                <ul className="list-disc list-inside text-[11px] text-red-800/90 pl-1 space-y-0.5">
                  <li><strong>{vtCounts[vtToDelete] || 0} boletos vendidos</strong> del turno {vtToDelete}.</li>
                  <li>Se eliminarán tanto de la base de datos central como del teléfono móvil.</li>
                  <li><strong>Cero daño:</strong> No afecta frecuencias, ni personas, ni kilometraje, ni arqueos guardados de otros días.</li>
                </ul>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  disabled={deleting}
                  className="h-11 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold active:scale-95 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={deleting}
                  className="h-11 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black shadow-md active:scale-95 transition-all flex items-center justify-center gap-1.5"
                >
                  {deleting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Borrando...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>Sí, eliminar</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
