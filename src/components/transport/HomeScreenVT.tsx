'use client';

import { useState } from 'react';
import { type VTSession } from './types-boletos';
import { Bus, User, ArrowRight } from 'lucide-react';

interface Props {
  onSessionStart: (session: VTSession) => void;
}

const VT_OPTIONS = [
  { vtCode: 'BUS01', nombre: 'Bus 01' },
  { vtCode: 'BUS02', nombre: 'Bus 02' },
  { vtCode: 'BUS03', nombre: 'Bus 03' },
];

export function HomeScreenVT({ onSessionStart }: Props) {
  const [selectedVT, setSelectedVT] = useState<string>('');
  const [ayudanteNombre, setAyudanteNombre] = useState('');
  const [ayudanteId, setAyudanteId] = useState('');

  const handleStart = () => {
    if (!selectedVT || !ayudanteNombre.trim()) return;
    const vt = VT_OPTIONS.find(v => v.vtCode === selectedVT)!;
    onSessionStart({
      vtCode: vt.vtCode,
      nombre: vt.nombre,
      ayudanteId: ayudanteId.trim() || `ayu_${Date.now()}`,
      ayudanteNombre: ayudanteNombre.trim(),
    });
  };

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
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-[#3A3A3A] mb-4 flex items-center gap-2">
            <Bus className="w-5 h-5 text-[#912D26]" /> Unidad
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {VT_OPTIONS.map(vt => (
              <button key={vt.vtCode} onClick={() => setSelectedVT(vt.vtCode)}
                className={`py-4 px-3 rounded-xl text-center transition-all ${selectedVT === vt.vtCode ? 'bg-[#912D26] text-white shadow-md' : 'bg-gray-100 text-[#3A3A3A] hover:bg-gray-200'}`}>
                <div className="text-xs font-medium">{vt.nombre}</div>
              </button>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-[#3A3A3A] mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-[#912D26]" /> Ayudante
          </h2>
          <input type="text" placeholder="Nombre del ayudante" value={ayudanteNombre}
            onChange={e => setAyudanteNombre(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-[#3A3A3A] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#912D26]/30 focus:border-[#912D26]" />
          <input type="text" placeholder="ID ayudante (opcional)" value={ayudanteId}
            onChange={e => setAyudanteId(e.target.value)}
            className="w-full mt-3 px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-[#3A3A3A] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#912D26]/30 focus:border-[#912D26]" />
        </div>
        <button onClick={handleStart} disabled={!selectedVT || !ayudanteNombre.trim()}
          className={`w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all ${selectedVT && ayudanteNombre.trim() ? 'bg-[#912D26] text-white shadow-lg shadow-red-200 active:scale-[0.98]' : 'bg-[#D6D6D6] text-gray-400 cursor-not-allowed'}`}>
          Iniciar Turno <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}