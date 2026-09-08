'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { type FrecuenciaEstado, type VTSession, loadPromoConfig } from './types-boletos';
import { getTarifa, TARIFA_MINIMA, getParadasByRutaAndTipo, matchRuta, type TipoPasajero,
         getZonaParada, isParadaPrincipal, ZONA_COLORS, type ZonaColor, PARADA_ZONA } from '@/lib/tarifas-data';
import { saveVenta } from '@/lib/indexeddb';
import { type ConnectionInfo } from '@/hooks/use-connection';
import { Check, User, UserRound, Printer, Bluetooth } from 'lucide-react';
import { usePrinterStatus } from '@/hooks/use-printer-status';

interface Props {
  session: VTSession;
  estado: FrecuenciaEstado;
  connection: ConnectionInfo;
  onClose: () => void;
  ganadorPosicion?: number | null;
}

// ─── Helpers for paradas frecuentes (localStorage) ───
function getParadasFrecCount(vtCode: string): Record<string, number> {
  try {
    const raw = localStorage.getItem(`rg_paradas_freq_${vtCode}`);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function incrementParadaFrec(vtCode: string, parada: string) {
  try {
    const counts = getParadasFrecCount(vtCode);
    counts[parada] = (counts[parada] || 0) + 1;
    localStorage.setItem(`rg_paradas_freq_${vtCode}`, JSON.stringify(counts));
  } catch { /* ignore */ }
}

export function TicketScreen({ session, estado, connection, onClose, ganadorPosicion }: Props) {
  const [parada, setParada] = useState('');
  const [cobrado, setCobrado] = useState('');
  const [pasajeroTipo, setPasajeroTipo] = useState<TipoPasajero>('normal');
  const montoInputRef = useRef<HTMLInputElement>(null);
  const submitLockRef = useRef(false); // Anti double-tap + double viaje gratis
  const [lastSale, setLastSale] = useState<{ parada: string; monto: number; tipo: string; cantidad?: number } | null>(null);
  const [ventasHoy, setVentasHoy] = useState(0);
  const [totalHoy, setTotalHoy] = useState(0);
  const [esViajeGratis, setEsViajeGratis] = useState(false);
  const [contadorVentasFrecuencia, setContadorVentasFrecuencia] = useState(0);
  const [tab, setTab] = useState<'principal' | 'intermedia'>('principal');
  const [cantidad, setCantidad] = useState(1);
  const printer = usePrinterStatus();

  // ─── Autocomplete paradas ───
  const PARADAS_NOMBRES = Object.keys(PARADA_ZONA);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Cerrar sugerencias al tocar fuera
  useEffect(() => {
    if (!showSuggestions) return;
    const handler = (e: TouchEvent | MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [showSuggestions]);

  const tipo = estado.direccion as 'ida' | 'vuelta';
  const ruta = estado.ruta;
  const rutaMatched = matchRuta(ruta);
  const allParadas = getParadasByRutaAndTipo(rutaMatched, tipo);
  const tarifaAuto = parada ? getTarifa(rutaMatched, parada, tipo, pasajeroTipo) : 0;

  // ─── Separar paradas principales de intermedias ───
  const principales = allParadas.filter(p => isParadaPrincipal(p.parada));
  const intermedias = allParadas.filter(p => !isParadaPrincipal(p.parada));

  // ─── Paradas frecuentes: top 3 por uso (solo principales) ───
  const frecCounts = getParadasFrecCount(session.vtCode);
  const frecuentes = [...principales]
    .sort((a, b) => (frecCounts[b.parada] || 0) - (frecCounts[a.parada] || 0))
    .slice(0, 3);
  const hasFrecuentes = frecCounts && Object.values(frecCounts).some(c => c > 0);

  // Load existing ventas count to determine position for Viaje Gratis
  useEffect(() => {
    (async () => {
      try {
        const { getVentasByFrecuencia } = await import('@/lib/indexeddb');
        const ventas = await getVentasByFrecuencia(estado.estadoId);
        setContadorVentasFrecuencia(ventas.length);
      } catch { /* ignore */ }
    })();
  }, [estado.estadoId]);

  const loadStats = useCallback(async () => {
    try {
      const { getVentasByFrecuencia } = await import('@/lib/indexeddb');
      const ventas = await getVentasByFrecuencia(estado.estadoId);
      setVentasHoy(ventas.length);
      setTotalHoy(ventas.reduce((sum, v) => sum + v.cobrado, 0));
      setContadorVentasFrecuencia(ventas.length);
    } catch { /* ignore */ }
  }, [estado.estadoId]);

  useEffect(() => { loadStats(); }, [loadStats]);

  const handleQuickSelect = (paradaName: string, normal: number, media: number) => {
    setParada(paradaName);
    const tarifa = pasajeroTipo === 'media' ? media : normal;
    setCobrado(tarifa.toString());
  };

  const handleParadaManualChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setParada(val);

    // Autocomplete: filtrar paradas mientras escribe
    if (val.trim().length >= 2) {
      const query = val.trim().toLowerCase();
      const filtered = PARADAS_NOMBRES.filter(n =>
        n.toLowerCase().includes(query)
      ).slice(0, 5);
      setSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setShowSuggestions(false);
      setSuggestions([]);
    }

    const isKnownParada = allParadas.find(p => p.parada.toLowerCase() === val.toLowerCase());
    if (!isKnownParada) {
      setCobrado('');
      if (val.trim().length > 2) {
        setTimeout(() => montoInputRef.current?.focus(), 100);
      }
    }
  };

  const handleSuggestionSelect = (name: string) => {
    setParada(name);
    setShowSuggestions(false);
    setSuggestions([]);
    // El autocompletado es para paradas NO registradas en intermedios
    // Siempre dejar el precio vacío para que el ayudante ingrese el valor
    setCobrado('');
    setTimeout(() => montoInputRef.current?.focus(), 100);
  };

  const handleTipoChange = (nuevoTipo: TipoPasajero) => {
    setPasajeroTipo(nuevoTipo);
    if (parada) {
      const pData = allParadas.find(p => p.parada === parada);
      if (pData) {
        const tarifa = nuevoTipo === 'media' ? pData.media : pData.normal;
        setCobrado(tarifa.toString());
      }
    }
  };

  const handleVenta = async () => {
    if (submitLockRef.current) return; // Anti double-tap
    if (!parada.trim() || !cobrado.trim()) return;
    const cobradoNum = parseFloat(cobrado) || 0;
    if (cobradoNum <= 0) return; // No permitir ventas de $0

    submitLockRef.current = true;
    try {
    // ─── Viaje Gratis: check if this passenger is the winner ───
    const promoConfig = loadPromoConfig();
    // Optimistic increment to prevent double viaje gratis
    const nuevaPosicion = contadorVentasFrecuencia + 1;
    const esGanador = cantidad === 1 && promoConfig.activa && ganadorPosicion != null && nuevaPosicion === ganadorPosicion;
    const cantidadEfectiva = esGanador ? 1 : cantidad; // Viaje gratis siempre es 1

    if (esGanador) {
      setEsViajeGratis(true);
    }

    const now = new Date();
    const fechaCal = now.toISOString().split('T')[0];
    const fechaOperacion = session.fecha || fechaCal;
    const diaTurno = fechaCal > fechaOperacion ? 2 : 1;
    const hora = now.toTimeString().slice(0, 5);
    const fechaEmisionStr = now.toISOString();

    // ─── Crear N registros (uno por pasajero) ───
    const baseId = Date.now();
    for (let i = 0; i < cantidadEfectiva; i++) {
      const venta = {
        id: `local_${baseId}_${i}_${Math.random().toString(36).slice(2, 8)}`,
        fecha: fechaOperacion,
        fechaOperacion,
        diaTurno,
        vtCode: session.vtCode,
        frecuenciaId: estado.id,
        frecuenciaNombre: estado.nombre,
        estadoId: estado.estadoId,
        ruta: rutaMatched,
        parada: parada.trim(),
        tipo,
        pasajeroTipo,
        tarifaOficial: tarifaAuto || cobradoNum,
        esViajeGratis: esGanador,
        tarifaOriginal: esGanador ? tarifaAuto || cobradoNum : cobradoNum,
        cobrado: esGanador ? 0 : cobradoNum,
        hora,
        fechaEmision: fechaEmisionStr,
        createdAt: fechaEmisionStr,
        ayudanteId: session.ayudanteId,
        ayudanteNombre: session.ayudanteNombre,
        syncStatus: 'pending' as const,
      };
      await saveVenta(venta);
    }
    incrementParadaFrec(session.vtCode, parada.trim());

    // ─── Imprimir boleto (no bloquea la venta) ───
    const imprimirBoleto = async () => {
      try {
        const { isBluetoothAvailable, getPrinterDevice, printTicket } = await import('@/lib/printer');
        const { generateTicketBytes } = await import('@/lib/ticket-escpos');
        if (!isBluetoothAvailable()) return;
        const device = await getPrinterDevice();
        if (!device) return;
        const dateParts = fecha.split('-');
        const fechaImp = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}` : fecha;
        const bytes = generateTicketBytes({
          ruta: rutaMatched,
          horaFrecuencia: estado.hora,
          fecha: fechaImp,
          hora: hora,
          ayudanteNombre: session.ayudanteNombre,
          destino: parada.trim(),
          tipoPasajero: pasajeroTipo === 'normal' ? 'Entero' : 'Media',
          tarifa: cobradoNum,
          cantidad: cantidadEfectiva,
          boletoNum: contadorVentasFrecuencia + 1,
          esViajeGratis: esGanador,
          tarifaOriginal: esGanador ? tarifaAuto || cobradoNum : undefined,
          textoPublicidad: promoConfig.textoPublicidad,
        });
        await printTicket(device, bytes);
      } catch (e) {
        console.error('Error imprimiendo boleto:', e);
      }
    };
    imprimirBoleto();

    if (esGanador) {
      if (promoConfig.sonidoGanador) {
        try {
          const audio = new Audio('/audio/ganador.mp3');
          audio.volume = 1.0;
          audio.play().catch(() => {});
        } catch { /* ignore audio errors */ }
      }
      setLastSale({ parada: parada.trim(), monto: 0, tipo: 'VIAJE GRATIS!' });
      setTimeout(() => setEsViajeGratis(false), 3000);
    } else {
      setLastSale({ parada: parada.trim(), monto: cobradoNum * cantidadEfectiva, tipo: pasajeroTipo === 'normal' ? 'ENTERO' : 'MEDIA', cantidad: cantidadEfectiva });
    }
    // Optimistic counter increment (antes del async loadStats)
    setContadorVentasFrecuencia(prev => prev + cantidadEfectiva);
    setParada('');
    setCobrado('');
    setCantidad(1);
    loadStats();
    setTimeout(() => setLastSale(null), esGanador ? 2500 : 1200);
    } finally {
      setTimeout(() => { submitLockRef.current = false; }, 400); // Cooldown 400ms
    }
  };

  const direccionLabel = tipo === 'ida' ? 'IDA' : 'VUELTA';
  const direccionColor = tipo === 'ida' ? 'bg-[#912D26]' : 'bg-[#3A3A3A]';

  // ─── Botón de parada compacto para cuadrícula 3 columnas ───
  const ParadaGridBtn = ({ p }: { p: { parada: string; normal: number; media: number } }) => {
    const isSelected = parada === p.parada;
    const precio = pasajeroTipo === 'media' ? p.media : p.normal;
    const zona = getZonaParada(p.parada);
    const colors = ZONA_COLORS[zona];
    const isIntermedia = !isParadaPrincipal(p.parada);

    return (
      <button
        onClick={() => handleQuickSelect(p.parada, p.normal, p.media)}
        className={`rounded-xl text-left transition-all active:scale-95 px-2 py-2 min-h-[52px] flex flex-col justify-center ${
          isSelected
            ? `${colors.bgSelected} text-white shadow-lg ring-2 ring-white/50`
            : `${colors.bg} ${colors.text} ${colors.border} border shadow-sm`
        }`}
      >
        <div className="text-[11px] font-bold leading-tight truncate">
          {isIntermedia ? p.parada.replace('→', '→') : p.parada}
        </div>
        <div className={`font-black text-sm mt-0.5 ${isSelected ? 'text-white/90' : colors.price}`}>
          ${precio.toFixed(2)}
        </div>
      </button>
    );
  };

  const cobradoNum = cobrado ? parseFloat(cobrado) : 0;
  const totalCobrado = cobradoNum * cantidad;
  const canRegister = parada.trim() && cobrado.trim() && cobradoNum > 0;

  return (
    <div className="flex flex-col h-[100dvh] bg-gray-50">
      {/* Barra de conexión — internet + impresora */}
      <div className="bg-white border-b border-gray-100 px-3 py-1.5 flex items-center justify-between">
        <div className={`flex items-center gap-1.5 text-[10px] font-semibold ${connection.color}`}>
          <span>{connection.icon}</span>
          <span>{connection.label}</span>
          {connection.pendingCount > 0 && (
            <span className="bg-[#912D26]/10 text-[#912D26] px-1.5 py-0.5 rounded-full text-[9px] font-bold">{connection.pendingCount}</span>
          )}
        </div>
        {printer.status === 'connected' ? (
          <div className="flex items-center gap-1 text-[10px] font-semibold text-green-600">
            <Printer className="w-3 h-3" />
            <span>{printer.name.length > 14 ? printer.name.slice(0, 12) + '...' : printer.name}</span>
            <span className="text-green-500">✓</span>
          </div>
        ) : printer.status === 'unavailable' ? (
          <div className="flex items-center gap-1 text-[10px] text-gray-400">
            <Printer className="w-3 h-3" />
            <span>BT off</span>
          </div>
        ) : (
          <button onClick={printer.connect} className="flex items-center gap-1 text-[10px] font-semibold text-[#912D26] active:opacity-70 transition-opacity">
            <Bluetooth className="w-3 h-3" />
            <span>Conectar 🖨</span>
          </button>
        )}
      </div>

      {/* Header compacto */}
      <div className={`${direccionColor} text-white px-3 py-2`}>
        <div className="flex items-center justify-between">
          <button onClick={onClose} className="p-1 -ml-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div className="flex-1 text-center">
            <div className="text-sm font-bold leading-tight flex items-center justify-center gap-1.5">
              <span>{estado.hora} · {rutaMatched}</span>
              {(session.fecha && new Date().toISOString().split('T')[0] > session.fecha) && (
                <span className="bg-amber-400 text-amber-950 text-[9px] font-black px-1.5 py-0.2 rounded uppercase">Día 2</span>
              )}
            </div>
            <div className="inline-block px-2 py-0.5 rounded-full bg-white/20 text-[9px] font-bold uppercase">{direccionLabel}</div>
          </div>
          <div className="text-right">
            <div className="text-[11px] font-mono">{ventasHoy}t</div>
            <div className="text-[11px] font-mono">${totalHoy.toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* ENTERO / MEDIA toggle + CANTIDAD */}
      <div className="bg-white border-b border-gray-100 px-3 py-2 space-y-2">
        <div className="flex gap-2">
          <button
            onClick={() => handleTipoChange('normal')}
            className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-1.5 font-bold text-sm transition-all active:scale-95 ${
              pasajeroTipo === 'normal'
                ? 'bg-[#912D26] text-white shadow-lg shadow-red-200'
                : 'bg-gray-100 text-[#3A3A3A]'
            }`}
          >
            <User className="w-4 h-4" /> ENTERO
          </button>
          <button
            onClick={() => handleTipoChange('media')}
            className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-1.5 font-bold text-sm transition-all active:scale-95 ${
              pasajeroTipo === 'media'
                ? 'bg-[#912D26] text-white shadow-lg shadow-red-200'
                : 'bg-gray-100 text-[#3A3A3A]'
            }`}
          >
            <UserRound className="w-4 h-4" /> MEDIA
          </button>
        </div>
        {/* Selector de cantidad: [1] [2] [3] [4] */}
        <div className="flex gap-1.5">
          {[1, 2, 3, 4].map(n => (
            <button
              key={n}
              onClick={() => setCantidad(n)}
              className={`flex-1 py-1.5 rounded-lg font-black text-sm transition-all active:scale-95 ${
                cantidad === n
                  ? 'bg-[#912D26] text-white shadow-md'
                  : 'bg-gray-100 text-[#3A3A3A]'
              }`}
            >
              {n === 1 ? '1' : n}
            </button>
          ))}
        </div>
      </div>

      {/* ─── PESTAÑAS: PRINCIPAL / INTERMEDIA ─── */}
      <div className="flex bg-white border-b border-gray-100">
        <button
          onClick={() => setTab('principal')}
          className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${
            tab === 'principal'
              ? 'border-[#912D26] text-[#912D26]'
              : 'border-transparent text-gray-400'
          }`}
        >
          Paradas ({principales.length})
        </button>
        <button
          onClick={() => setTab('intermedia')}
          className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${
            tab === 'intermedia'
              ? 'border-[#912D26] text-[#912D26]'
              : 'border-transparent text-gray-400'
          }`}
        >
          Intermedios ({intermedias.length})
        </button>
      </div>

      {/* ─── ZONA SCROLLEABLE: Cuadrícula de paradas ─── */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {/* Flash de confirmación normal */}
        {lastSale && lastSale.tipo !== 'VIAJE GRATIS!' && (
          <div className="bg-green-500 text-white rounded-xl px-3 py-2 flex items-center gap-2 mb-2 animate-pulse">
            <Check className="w-4 h-4 flex-shrink-0" />
            <div className="text-xs font-bold">
              ✓ {lastSale.parada}{lastSale.cantidad && lastSale.cantidad > 1 ? ` x${lastSale.cantidad}` : ''} — ${lastSale.monto.toFixed(2)} ({lastSale.tipo})
            </div>
          </div>
        )}

        {/* Flash de VIAJE GRATIS */}
        {lastSale && lastSale.tipo === 'VIAJE GRATIS!' && esViajeGratis && (
          <div className="bg-gradient-to-r from-green-500 via-emerald-400 to-green-500 text-white rounded-xl px-3 py-3 flex flex-col items-center gap-1 mb-2 animate-bounce shadow-lg shadow-green-300">
            <div className="text-lg font-black">🎉 VIAJE GRATIS 🎉</div>
            <div className="text-xs font-bold">{lastSale.parada}</div>
          </div>
        )}

        {/* ═══ TAB PRINCIPAL ═══ */}
        {tab === 'principal' && (
          <div className="space-y-2">
            {/* Frecuentes: 3 columnas, 1 fila */}
            {hasFrecuentes && (
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#912D26]" />
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Frecuentes</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {frecuentes.map(p => (
                    <ParadaGridBtn key={`f-${p.parada}`} p={p} />
                  ))}
                </div>
              </div>
            )}

            {/* Todas las principales: cuadrícula 3 columnas con colores de zona */}
            <div>
              <div className="flex items-center gap-1 mb-1">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider ml-0.5">Por zona</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {principales.map(p => (
                  <ParadaGridBtn key={p.parada} p={p} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ═══ TAB INTERMEDIA ═══ */}
        {tab === 'intermedia' && (
          <div>
            <div className="flex items-center gap-1 mb-1">
              <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Tramos intermedios</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {intermedias.map(p => (
                <ParadaGridBtn key={p.parada} p={p} />
              ))}
            </div>
          </div>
        )}

        {/* Advertencia tarifa (dentro del scroll para no ensuciar la barra fija) */}
        {parada && allParadas.some(p => p.parada === parada) && tarifaAuto > 0 && cobrado && parseFloat(cobrado) !== tarifaAuto && (
          <div className="text-center text-[11px] text-amber-600 bg-amber-50 rounded-lg px-3 py-1.5 mt-1">
            Oficial: ${tarifaAuto.toFixed(2)} — Diff: ${Math.abs(parseFloat(cobrado || '0') - tarifaAuto).toFixed(2)}
          </div>
        )}
      </div>

      {/* ─── BARRA FIJA INFERIOR: Parada manual + Monto + REGISTRAR ─── */}
      <div className="bg-white border-t-2 border-gray-100 px-3 py-2 shadow-[0_-4px_12px_rgba(0,0,0,0.08)]">
        {/* Parada manual — siempre accesible sin scroll */}
        <div className="mb-2 relative" ref={suggestionsRef}>
          <input
            type="text"
            placeholder="Parada o destino..."
            value={parada}
            onChange={handleParadaManualChange}
            autoComplete="off"
            className="w-full px-3 py-2 rounded-lg bg-gray-50 text-sm text-[#3A3A3A] placeholder-gray-400 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#912D26]/30 focus:border-[#912D26]/40"
          />
          {/* Dropdown de sugerencias */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute bottom-full left-0 right-0 mb-1 bg-white rounded-lg border border-gray-200 shadow-lg z-50 max-h-40 overflow-y-auto">
              {suggestions.map(name => (
                <button
                  key={name}
                  type="button"
                  onClick={() => handleSuggestionSelect(name)}
                  className="w-full text-left px-3 py-2.5 text-sm text-[#3A3A3A] hover:bg-[#912D26]/10 active:bg-[#912D26]/20 transition-colors border-b border-gray-50 last:border-b-0"
                >
                  {name}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="relative mb-2">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-lg">$</span>
          <input
            ref={montoInputRef}
            type="number"
            inputMode="decimal"
            step="0.05"
            min={TARIFA_MINIMA}
            placeholder="0.00"
            value={cobrado}
            onChange={e => setCobrado(e.target.value)}
            className="w-full pl-8 pr-3 py-3 rounded-xl border-2 border-gray-200 bg-gray-50 text-2xl font-black text-[#3A3A3A] text-center focus:outline-none focus:ring-2 focus:ring-[#912D26]/30 focus:border-[#912D26]"
          />
        </div>

        <button
          onClick={handleVenta}
          disabled={!canRegister}
          className={`w-full py-4 rounded-xl font-black text-lg flex items-center justify-center gap-2 transition-all active:scale-95 ${
            canRegister
              ? 'bg-green-600 text-white shadow-lg shadow-green-200'
              : 'bg-[#D6D6D6] text-gray-400 cursor-not-allowed'
          }`}
        >
          <Check className="w-5 h-5" />
          REGISTRAR {cantidad > 1 ? `${cantidad}x $${cobrado ? parseFloat(cobrado).toFixed(2) : '0.00'} = $${totalCobrado.toFixed(2)}` : `$${cobrado ? parseFloat(cobrado).toFixed(2) : '0.00'}`}
        </button>

        {/* ─── Guía visual de vuelto (zero toques) ─── */}
        {canRegister && totalCobrado > 0 && (() => {
          const total = totalCobrado;
          const redondeo = Math.ceil(total);
          const billetes = [5, 10, 20].filter(b => b > total);
          const opciones: { paga: number; vuelto: number }[] = [];

          // Redondeo al dólar superior (si tiene decimales)
          if (redondeo > total) {
            opciones.push({ paga: redondeo, vuelto: parseFloat((redondeo - total).toFixed(2)) });
          }
          // Billetes estándar
          for (const b of billetes) {
            opciones.push({ paga: b, vuelto: parseFloat((b - total).toFixed(2)) });
          }

          if (opciones.length === 0) return null;
          return (
            <div className="mt-2 flex gap-1.5 justify-center">
              {opciones.map(o => (
                <div key={o.paga} className="bg-[#912D26]/10 rounded-lg px-2 py-1 flex flex-col items-center min-w-[60px]">
                  <span className="text-[10px] text-[#912D26] font-bold">${o.paga}</span>
                  <span className="text-sm font-black text-[#912D26]">${o.vuelto.toFixed(2)}</span>
                </div>
              ))}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
