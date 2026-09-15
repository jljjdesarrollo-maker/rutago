'use client';

import { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CreditCard,
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowLeft,
  Search,
  Plus,
  Share2,
  Calendar,
  Bus as BusIcon,
  User,
  Phone,
  FileText,
  X,
  Save,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { SuscripcionSocio, Socio, EstadoSuscripcion } from '@/types/saas';
import { getSuscripciones, saveSuscripcion, getSocios } from '@/lib/saas-storage';
import { getAllBuses } from '@/lib/fleet-storage';

interface SaaSAdminScreenProps {
  onBack: () => void;
}

export function SaaSAdminScreen({ onBack }: SaaSAdminScreenProps) {
  const [suscripciones, setSuscripciones] = useState<SuscripcionSocio[]>([]);
  const [socios, setSocios] = useState<Socio[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstado, setFilterEstado] = useState<'TODAS' | EstadoSuscripcion>('TODAS');
  const [selectedSub, setSelectedSub] = useState<SuscripcionSocio | null>(null);
  const [showPayModal, setShowPayModal] = useState(false);
  const [pagoMonto, setPagoMonto] = useState('20.00');
  const [pagoComprobante, setPagoComprobante] = useState('');
  const [pagoNotas, setPagoNotas] = useState('');
  const { toast } = useToast();

  const loadData = () => {
    const subs = getSuscripciones();
    const socs = getSocios();
    const buses = getAllBuses();

    // Asegurar que existan suscripciones para todos los buses del catálogo
    const existingBusIds = new Set(subs.map(s => s.busId));
    const merged = [...subs];

    buses.forEach(b => {
      if (!existingBusIds.has(b.id)) {
        const newSub: SuscripcionSocio = {
          id: `SUB-${b.numeroDisco}`,
          socioId: b.socioId || 'SOCIO-PENDIENTE',
          busId: b.id,
          numeroDisco: b.numeroDisco,
          montoMensual: 20.00,
          diaPagoMensual: 5,
          fechaUltimoPago: '2026-09-01',
          fechaProximoCorte: '2026-10-05',
          estado: 'ACTIVA',
          notas: `Bus ${b.numeroDisco} - ${b.placa}`,
        };
        merged.push(newSub);
        saveSuscripcion(newSub);
      }
    });

    setSuscripciones(merged);
    setSocios(socs);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Métricas
  const totalBuses = suscripciones.length;
  const mrrProyectado = suscripciones.reduce((sum, s) => sum + s.montoMensual, 0);
  const activasCount = suscripciones.filter(s => s.estado === 'ACTIVA').length;
  const porVencerCount = suscripciones.filter(s => s.estado === 'POR_VENCER').length;
  const vencidasCount = suscripciones.filter(s => s.estado === 'VENCIDA' || s.estado === 'GRACIA').length;
  const recaudadoMes = suscripciones
    .filter(s => s.fechaUltimoPago && s.fechaUltimoPago.startsWith('2026-09'))
    .reduce((sum, s) => sum + s.montoMensual, 0);

  const handleOpenPayModal = (sub: SuscripcionSocio) => {
    setSelectedSub(sub);
    setPagoMonto(sub.montoMensual.toFixed(2));
    setPagoComprobante(sub.comprobanteUltimoPago || '');
    setPagoNotas('');
    setShowPayModal(true);
  };

  const handleRegistrarPago = () => {
    if (!selectedSub) return;
    const now = new Date();
    const fechaPago = now.toISOString().split('T')[0];
    
    // Próximo corte: mes siguiente
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, selectedSub.diaPagoMensual || 5);
    const fechaProximoCorte = nextMonth.toISOString().split('T')[0];

    const updated: SuscripcionSocio = {
      ...selectedSub,
      fechaUltimoPago: fechaPago,
      fechaProximoCorte,
      estado: 'ACTIVA',
      comprobanteUltimoPago: pagoComprobante.trim() || undefined,
      notas: pagoNotas.trim() ? `${pagoNotas.trim()} (Reg: ${fechaPago})` : selectedSub.notas,
    };

    saveSuscripcion(updated);
    toast({
      title: 'Pago Registrado con Éxito',
      description: `Unidad ${selectedSub.numeroDisco}: $${pagoMonto} registrado. Próximo corte: ${fechaProximoCorte}`,
    });

    setShowPayModal(false);
    setSelectedSub(null);
    loadData();
  };

  const handleShareWhatsApp = (sub: SuscripcionSocio) => {
    const socio = socios.find(s => s.id === sub.socioId);
    const mensaje = `*RutaGo - Estado de Suscripción SaaS*%0A` +
      `🚌 *Unidad:* Disco ${sub.numeroDisco}%0A` +
      `👤 *Socio:* ${socio ? socio.nombre : 'Socio Propietario'}%0A` +
      `💵 *Tarifa:* $${sub.montoMensual.toFixed(2)} USD/mes%0A` +
      `📅 *Último Pago:* ${sub.fechaUltimoPago || 'Pendiente'}%0A` +
      `🗓️ *Próximo Corte:* ${sub.fechaProximoCorte}%0A` +
      `📌 *Estado:* ${sub.estado}%0A%0A` +
      `_Gestión oficial de plataforma RutaGo Cooperativa Vilcabambaturis_`;
    
    window.open(`https://wa.me/?text=${mensaje}`, '_blank');
  };

  const filteredSubs = suscripciones.filter(s => {
    const matchesSearch = s.numeroDisco.includes(searchTerm) || (s.notas && s.notas.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesEstado = filterEstado === 'TODAS' || s.estado === filterEstado;
    return matchesSearch && matchesEstado;
  });

  return (
    <div className="flex flex-col min-h-[100dvh] bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-md px-4 py-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 flex items-center justify-center text-white transition"
              aria-label="Volver"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-black tracking-tight">Suscripciones SaaS</span>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-indigo-500 text-white shadow-xs">
                  $20 / Bus
                </span>
              </div>
              <p className="text-[11px] text-slate-300 font-medium">Control comercial de 19 autobuses</p>
            </div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-indigo-300" />
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 py-4 max-w-2xl mx-auto w-full flex flex-col gap-4">
        {/* Banner MRR Ejecutivo */}
        <Card className="rounded-3xl border-none bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 text-white shadow-lg overflow-hidden">
          <CardContent className="p-4.5">
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-400" />
                <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Ingreso Mensual Recurrente (MRR)
                </span>
              </div>
              <span className="text-xs font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                100% Cooperativa
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
                <span className="text-[10px] text-slate-300 uppercase font-semibold block">Proyección 19 Buses</span>
                <span className="text-2xl font-black text-white">${mrrProyectado.toFixed(2)}</span>
                <span className="text-[10px] text-emerald-300 block mt-0.5 font-medium">$20.00 x {totalBuses} unidades</span>
              </div>
              <div className="bg-emerald-500/15 rounded-2xl p-3 border border-emerald-400/30">
                <span className="text-[10px] text-emerald-200 uppercase font-semibold block">Cobrado este Mes</span>
                <span className="text-2xl font-black text-emerald-300">${recaudadoMes.toFixed(2)}</span>
                <span className="text-[10px] text-emerald-200 block mt-0.5 font-medium">{activasCount} buses al día</span>
              </div>
            </div>

            {/* Micro estados */}
            <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
              <div className="bg-white/5 rounded-xl py-1.5 px-2 border border-white/5">
                <span className="text-slate-300 block font-medium">Al Día</span>
                <span className="font-black text-emerald-400">{activasCount}</span>
              </div>
              <div className="bg-white/5 rounded-xl py-1.5 px-2 border border-white/5">
                <span className="text-slate-300 block font-medium">Por Vencer</span>
                <span className="font-black text-amber-400">{porVencerCount}</span>
              </div>
              <div className="bg-white/5 rounded-xl py-1.5 px-2 border border-white/5">
                <span className="text-slate-300 block font-medium">Mora / Gracia</span>
                <span className="font-black text-rose-400">{vencidasCount}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Barra de Filtros & Búsqueda */}
        <div className="flex flex-col gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por Disco (ej. 01, 04, 19)..."
              className="pl-10 h-11 rounded-2xl bg-white border-gray-200 shadow-xs text-sm"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            <button
              onClick={() => setFilterEstado('TODAS')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition ${
                filterEstado === 'TODAS'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-gray-600 border border-gray-200'
              }`}
            >
              Todas ({suscripciones.length})
            </button>
            <button
              onClick={() => setFilterEstado('ACTIVA')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition ${
                filterEstado === 'ACTIVA'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white text-emerald-700 border border-emerald-200'
              }`}
            >
              Al Día ({activasCount})
            </button>
            <button
              onClick={() => setFilterEstado('POR_VENCER')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition ${
                filterEstado === 'POR_VENCER'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white text-amber-700 border border-amber-200'
              }`}
            >
              Por Vencer ({porVencerCount})
            </button>
            <button
              onClick={() => setFilterEstado('VENCIDA')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition ${
                filterEstado === 'VENCIDA'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-white text-rose-700 border border-rose-200'
              }`}
            >
              En Mora ({vencidasCount})
            </button>
          </div>
        </div>

        {/* Listado de Suscripciones por Autobús */}
        <div className="flex flex-col gap-2.5 pb-24">
          {filteredSubs.map((sub) => {
            const socio = socios.find(s => s.id === sub.socioId);
            const isActiva = sub.estado === 'ACTIVA';
            const isPorVencer = sub.estado === 'POR_VENCER';

            return (
              <Card
                key={sub.id}
                className="rounded-2xl border border-gray-200 bg-white shadow-xs overflow-hidden"
              >
                <CardContent className="p-3.5">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-black text-sm border border-indigo-100">
                        {sub.numeroDisco}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-black text-sm text-gray-900">Unidad {sub.numeroDisco}</h4>
                          <span
                            className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                              isActiva
                                ? 'bg-emerald-100 text-emerald-800'
                                : isPorVencer
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {sub.estado}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 font-medium">
                          {socio ? socio.nombre : 'Socio Asignado'}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-base font-black text-gray-900 block leading-tight">
                        ${sub.montoMensual.toFixed(2)}
                      </span>
                      <span className="text-[10px] text-gray-400 font-medium">mensual</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 bg-slate-50 rounded-xl p-2 text-xs text-gray-600 mb-3">
                    <div>
                      <span className="text-[10px] text-gray-400 block font-semibold">Último Pago</span>
                      <span className="font-bold text-gray-800">{sub.fechaUltimoPago || 'Sin registro'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 block font-semibold">Próximo Corte</span>
                      <span className="font-bold text-indigo-900">{sub.fechaProximoCorte}</span>
                    </div>
                  </div>

                  {/* Acciones en la Zona del Pulgar */}
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => handleOpenPayModal(sub)}
                      size="sm"
                      className="flex-1 h-9 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold"
                    >
                      <CreditCard className="w-3.5 h-3.5 mr-1.5" />
                      Registrar Cobro
                    </Button>
                    <Button
                      onClick={() => handleShareWhatsApp(sub)}
                      size="sm"
                      variant="outline"
                      className="h-9 px-3 rounded-xl border-gray-200 text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 text-xs font-semibold"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>

      {/* Modal / Bottom Sheet para Registrar Cobro */}
      {showPayModal && selectedSub && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-black text-sm">
                  {selectedSub.numeroDisco}
                </div>
                <div>
                  <h3 className="font-black text-base text-gray-900">Cobro Mensualidad SaaS</h3>
                  <p className="text-xs text-gray-500">Unidad {selectedSub.numeroDisco} • RutaGo</p>
                </div>
              </div>
              <button
                onClick={() => setShowPayModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Monto a Cobrar ($ USD)</label>
                <Input
                  type="number"
                  step="0.50"
                  value={pagoMonto}
                  onChange={(e) => setPagoMonto(e.target.value)}
                  className="h-11 rounded-xl text-base font-black text-indigo-900"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">N° Comprobante / Referencia Bancaria</label>
                <Input
                  value={pagoComprobante}
                  onChange={(e) => setPagoComprobante(e.target.value)}
                  placeholder="Ej. TRANSF-098812 Pichincha / Efectivo"
                  className="h-11 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Observación / Nota</label>
                <Input
                  value={pagoNotas}
                  onChange={(e) => setPagoNotas(e.target.value)}
                  placeholder="Ej. Mensualidad Septiembre cancelada completa"
                  className="h-11 rounded-xl text-sm"
                />
              </div>

              <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-3 text-xs text-indigo-900 mt-1">
                <div className="flex items-center gap-1.5 font-bold mb-0.5">
                  <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                  <span>Actualización Automática de Vigencia</span>
                </div>
                <p className="text-indigo-800/80">
                  Al confirmar, la suscripción se marcará como <strong>AL DÍA</strong> y la fecha de corte se extenderá 30 días automáticamente.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Button
                  onClick={() => setShowPayModal(false)}
                  variant="ghost"
                  className="flex-1 h-12 rounded-xl text-gray-600 font-semibold"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleRegistrarPago}
                  className="flex-1 h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black"
                >
                  <Save className="w-4 h-4 mr-1.5" />
                  Confirmar Cobro
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
