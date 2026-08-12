'use client';

import { useState, useEffect } from 'react';
import { type VTSession } from './types-boletos';
import { Bus, User, ArrowRight, Loader2, CheckCircle } from 'lucide-react';

interface Props {
  onSessionStart: (session: VTSession) => void;
}

interface VTOption {
  id: string;
  codigo: string;
  nombre: string;
}

interface AyudanteActivo {
  id: string;
  nombre: string;
  pin: string;
}

export function HomeScreenVT({ onSessionStart }: Props) {
  const [vts, setVts] = useState<VTOption[]>([]);
  const [ayudante, setAyudante] = useState<AyudanteActivo | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedVT, setSelectedVT] = useState<string>('');

  useEffect(() => {
    // Cargar VTs y ayudante activo en paralelo
    Promise.all([
      fetch('/api/bus-vts').then(res => res.json()),
      fetch('/api/personas?rol=AYUDANTE&esActual=true').then(res => res.json()),
    ])
      .then(([vtsData, ayudanteData]) => {
        if (Array.isArray(vtsData)) {
          setVts(vtsData.map((vt: any) => ({
            id: vt.id,
            codigo: vt.codigo,
            nombre: vt.nombre,
          })));
        }
        // Buscar ayudante activo en la respuesta
        const activos = Array.isArray(ayudanteData)
          ? ayudanteData.filter((p: any) => p.esActual)
          : [];
        if (activos.length > 0) {
          setAyudante({ id: activos[0].id, nombre: activos[0].nombre, pin: activos[0].pin });
        }
      })
      .catch(err => console.error('Error cargando datos:', err))
      .finally(() => setLoading(false));
  }, []);

  const handleStart = () => {
    if (!selectedVT || !ayudante) return;
    const vt = vts.find(v => v.codigo === selectedVT)!;
    onSessionStart({
      vtCode: vt.codigo,
      nombre: vt.nombre,
      ayudanteId: ayudante.id,
      ayudanteNombre: ayudante.nombre,
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-[100dvh] bg-gray-50 items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#912D26] animate-spin" />
        <p className="mt-3 text-[#3A3A3A] text-sm">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[100dvh] bg-gray-50">
      <div className="bg-[#912D26] text-white px-6 py-8 rounded-b-3xl shadow-lg">
        <div className="flex items-center gap-3 mb-2">
          <Bus className="w-8 h-8" />
          <h1 className="text-2xl font-bold">RutaGo</h1>
        </div>
        <p className="text-red-100 text-sm">TRANSPORTES VILCABAMBA</p>
      </div>
      <div className="flex-1 px-6 py-8 space-y-6">
        {/* Ayudante activo */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-[#3A3A3A] mb-3 flex items-center gap-2">
            <User className="w-5 h-5 text-[#912D26]" /> Ayudante
          </h2>
          {ayudante ? (
            <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
              <div>
                <p className="font-semibold text-green-800">{ayudante.nombre}</p>
                <p className="text-green-600 text-xs">Turno activo</p>
              </div>
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3">
              <p className="text-yellow-700 text-sm">No hay ayudante activo asignado</p>
              <p className="text-yellow-600 text-xs mt-1">Configure un ayudante desde el panel de administración</p>
            </div>
          )}
        </div>

        {/* Selector de VT */}
        {vts.length === 0 ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-5 text-center">
            <p className="text-yellow-700 font-medium">No hay unidades activas</p>
            <p className="text-yellow-600 text-sm mt-1">Ejecuta el seed: POST /api/seed-vts</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold text-[#3A3A3A] mb-4 flex items-center gap-2">
              <Bus className="w-5 h-5 text-[#912D26]" /> Unidad
            </h2>
            <div className="grid grid-cols-3 gap-3">
              {vts.map(vt => (
                <button key={vt.codigo} onClick={() => setSelectedVT(vt.codigo)}
                  className={`py-4 px-3 rounded-xl text-center transition-all ${selectedVT === vt.codigo ? 'bg-[#912D26] text-white shadow-md' : 'bg-gray-100 text-[#3A3A3A] hover:bg-gray-200'}`}>
                  <div className="text-sm font-bold">{vt.codigo}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        <button onClick={handleStart} disabled={!selectedVT || !ayudante}
          className={`w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all ${selectedVT && ayudante ? 'bg-[#912D26] text-white shadow-lg shadow-red-200 active:scale-[0.98]' : 'bg-[#D6D6D6] text-gray-400 cursor-not-allowed'}`}>
          Iniciar Turno <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
