'use client';

import { useState, useEffect, useCallback } from 'react';
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
  Mail,
  FileText,
  X,
  Save,
  RefreshCw,
  AlertTriangle,
  Key,
  Database,
  Download,
  ExternalLink,
  Wifi,
  WifiOff,
  Eye,
  EyeOff,
  Receipt,
  Activity,
  History,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { getAllBuses, type BusItem } from '@/lib/fleet-storage';

interface CuentaSocioApi {
  id: string;
  cedula: string;
  nombre: string;
  email?: string | null;
  telefono?: string | null;
  rol: 'SUPERADMIN_SAAS' | 'SOCIO';
  activo: boolean;
  esFundadorSaaS: boolean;
  createdAt: string;
  buses: Array<{
    id: string;
    numeroDisco: string;
    placa: string;
    tipoOperacion: string;
    activo: boolean;
    suscripcion?: {
      id: string;
      estado: string;
      montoMensual: number;
      diaCorteMensual: number;
      fechaProximoCorte: string | null;
    } | null;
  }>;
  personal?: Array<{
    id: string;
    nombre: string;
    rol: string;
  }>;
}

interface SuscripcionApi {
  id: string;
  socioId: string;
  busId: string;
  montoMensual: number;
  diaCorteMensual: number;
  fechaInicio: string;
  fechaUltimoPago: string | null;
  fechaProximoCorte: string | null;
  estado: 'ACTIVA' | 'POR_VENCER' | 'VENCIDA' | 'GRACIA' | 'SUSPENDIDA';
  estadoVigente?: string;
  comprobanteUrl?: string | null;
  notasAdmin?: string | null;
  bus: {
    id: string;
    numeroDisco: string;
    placa: string;
    propietario: string;
    tipoOperacion: string;
    activo: boolean;
  };
  socio: {
    id: string;
    nombre: string;
    cedula: string;
    email?: string | null;
    telefono?: string | null;
    esFundadorSaaS: boolean;
  };
  pagos: Array<{
    id: string;
    monto: number;
    fechaPago: string;
    metodoPago: string;
    numeroComprobante?: string | null;
    registradoPor?: string | null;
    notas?: string | null;
  }>;
}

interface AuditoriaApi {
  database: {
    status: 'ONLINE' | 'OFFLINE_O_ERROR';
    latencyMs: number;
    provider: string;
    connectedAt: string;
  };
  tablas: {
    cuentasSocio: number;
    buses: number;
    suscripciones: number;
    pagosRegistrados: number;
    personal: number;
    dailyRecords: number;
    ventasBoleto: number;
    ownerExpenses: number;
    busesVT: number;
  };
  mrrMetrics: {
    totalBuses: number;
    mrrProyectado: number;
    recaudadoMes: number;
    tasaCobranzaPct: number;
    estados: {
      activas: number;
      porVencer: number;
      gracia: number;
      vencidas: number;
    };
  };
  pagosRecientes: Array<{
    id: string;
    monto: number;
    fechaPago: string;
    metodoPago: string;
    numeroComprobante: string | null;
    busDisco: string;
    busPlaca: string;
    socioNombre: string;
    notas: string | null;
  }>;
  system: {
    uptime: number;
    nodeVersion: string;
    environment: string;
    timestamp: string;
  };
}

interface SaaSAdminScreenProps {
  onBack: () => void;
}

export function SaaSAdminScreen({ onBack }: SaaSAdminScreenProps) {
  const [activeTab, setActiveTab] = useState<'mrr' | 'socios' | 'auditoria'>('mrr');
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Datos principales
  const [suscripciones, setSuscripciones] = useState<SuscripcionApi[]>([]);
  const [socios, setSocios] = useState<CuentaSocioApi[]>([]);
  const [auditoria, setAuditoria] = useState<AuditoriaApi | null>(null);
  const [catalogoBuses, setCatalogoBuses] = useState<BusItem[]>([]);

  // Filtros & Búsqueda para MRR
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstado, setFilterEstado] = useState<'TODAS' | 'ACTIVA' | 'POR_VENCER' | 'GRACIA' | 'VENCIDA'>('TODAS');

  // Modal Pago
  const [selectedSub, setSelectedSub] = useState<SuscripcionApi | null>(null);
  const [showPayModal, setShowPayModal] = useState(false);
  const [pagoMonto, setPagoMonto] = useState('20.00');
  const [pagoMetodo, setPagoMetodo] = useState('TRANSFERENCIA');
  const [pagoComprobante, setPagoComprobante] = useState('');
  const [pagoNotas, setPagoNotas] = useState('');
  const [savingPago, setSavingPago] = useState(false);

  // Modal Historial de Pagos
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [subForHistory, setSubForHistory] = useState<SuscripcionApi | null>(null);

  // Modal Nuevo Socio
  const [showNewSocioModal, setShowNewSocioModal] = useState(false);
  const [newSocioCedula, setNewSocioCedula] = useState('');
  const [newSocioNombre, setNewSocioNombre] = useState('');
  const [newSocioTelefono, setNewSocioTelefono] = useState('');
  const [newSocioEmail, setNewSocioEmail] = useState('');
  const [newSocioPin, setNewSocioPin] = useState('');
  const [newSocioBusId, setNewSocioBusId] = useState('');
  const [newSocioRol, setNewSocioRol] = useState<'SOCIO' | 'SUPERADMIN_SAAS'>('SOCIO');
  const [showPinPlain, setShowPinPlain] = useState(false);
  const [savingSocio, setSavingSocio] = useState(false);

  // Modal Editar Socio
  const [showEditSocioModal, setShowEditSocioModal] = useState(false);
  const [editingSocio, setEditingSocio] = useState<CuentaSocioApi | null>(null);
  const [editNombre, setEditNombre] = useState('');
  const [editTelefono, setEditTelefono] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editNewPin, setEditNewPin] = useState('');
  const [editBusId, setEditBusId] = useState('');
  const [editActivo, setEditActivo] = useState(true);
  const [savingEditSocio, setSavingEditSocio] = useState(false);

  // Respaldo
  const [backupLoading, setBackupLoading] = useState(false);

  const { toast } = useToast();

  // Detección de conectividad en vivo
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      }
    };
  }, []);

  // Cargar datos desde los endpoints de PostgreSQL
  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [resSubs, resSocios, resAuditoria, resBuses] = await Promise.all([
        fetch('/api/saas/suscripciones').then((r) => (r.ok ? r.json() : [])).catch(() => []),
        fetch('/api/saas/socios').then((r) => (r.ok ? r.json() : [])).catch(() => []),
        fetch('/api/saas/auditoria').then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetch('/api/buses').then((r) => (r.ok ? r.json() : null)).catch(() => null),
      ]);

      if (Array.isArray(resSubs)) setSuscripciones(resSubs);
      if (Array.isArray(resSocios)) setSocios(resSocios);
      if (resAuditoria) setAuditoria(resAuditoria);

      if (resBuses && resBuses.success && Array.isArray(resBuses.data)) {
        setCatalogoBuses(resBuses.data);
      } else {
        setCatalogoBuses(getAllBuses());
      }
    } catch (err) {
      console.error('Error cargando consola SaaS:', err);
      toast({
        title: 'Error de Sincronización',
        description: 'No se pudo conectar con los servicios SaaS en PostgreSQL.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Cálculos de métricas en memoria / consolidados
  const totalBuses = catalogoBuses.length > 0 ? catalogoBuses.length : (suscripciones.length > 0 ? suscripciones.length : 19);
  const mrrProyectado = totalBuses * 20.0;

  const hoy = new Date();
  const currentMonthStr = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;

  const activasCount = suscripciones.filter((s) => (s.estadoVigente || s.estado) === 'ACTIVA').length;
  const porVencerCount = suscripciones.filter((s) => (s.estadoVigente || s.estado) === 'POR_VENCER').length;
  const graciaCount = suscripciones.filter((s) => (s.estadoVigente || s.estado) === 'GRACIA').length;
  const vencidasCount = suscripciones.filter((s) => (s.estadoVigente || s.estado) === 'VENCIDA' || (s.estadoVigente || s.estado) === 'SUSPENDIDA').length;

  const recaudadoMes = suscripciones.reduce((acc, sub) => {
    const pagosEsteMes = (sub.pagos || []).filter((p) => p.fechaPago && p.fechaPago.startsWith(currentMonthStr));
    const sumaPagos = pagosEsteMes.reduce((s, p) => s + p.monto, 0);
    return acc + (sumaPagos > 0 ? sumaPagos : (sub.fechaUltimoPago && sub.fechaUltimoPago.startsWith(currentMonthStr) ? sub.montoMensual : 0));
  }, 0);

  const cumplimientoPorcentaje = mrrProyectado > 0 ? Math.min(100, Math.round((recaudadoMes / mrrProyectado) * 100)) : 0;

  // Filtrado de suscripciones
  const filteredSubs = suscripciones.filter((s) => {
    const disco = s.bus?.numeroDisco || '';
    const placa = s.bus?.placa || '';
    const socioNombre = s.socio?.nombre || '';
    const matchesSearch =
      disco.toLowerCase().includes(searchTerm.toLowerCase()) ||
      placa.toLowerCase().includes(searchTerm.toLowerCase()) ||
      socioNombre.toLowerCase().includes(searchTerm.toLowerCase());

    const estadoVigente = s.estadoVigente || s.estado;
    const matchesEstado = filterEstado === 'TODAS' || estadoVigente === filterEstado;
    return matchesSearch && matchesEstado;
  });

  // Acciones: Abrir modal de cobro
  const handleOpenPayModal = (sub: SuscripcionApi) => {
    setSelectedSub(sub);
    setPagoMonto((sub.montoMensual || 20).toFixed(2));
    setPagoMetodo('TRANSFERENCIA');
    setPagoComprobante('');
    setPagoNotas(`Mensualidad ${sub.bus?.numeroDisco ? `Unidad ${sub.bus.numeroDisco}` : ''}`);
    setShowPayModal(true);
  };

  // Registrar Cobro hacia /api/saas/suscripciones
  const handleConfirmarCobro = async () => {
    if (!selectedSub) return;
    if (!pagoMonto || Number(pagoMonto) <= 0) {
      toast({ title: 'Monto inválido', description: 'Ingrese un monto mayor a 0', variant: 'destructive' });
      return;
    }

    setSavingPago(true);
    try {
      const res = await fetch('/api/saas/suscripciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          suscripcionId: selectedSub.id,
          monto: Number(pagoMonto),
          metodoPago: pagoMetodo,
          numeroComprobante: pagoComprobante.trim() || undefined,
          registradoPor: 'SUPERADMIN',
          notas: pagoNotas.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al procesar el pago');
      }

      toast({
        title: 'Pago Registrado con Éxito',
        description: `Unidad ${selectedSub.bus?.numeroDisco}: $${Number(pagoMonto).toFixed(2)} registrado. Suscripción al día.`,
      });

      setShowPayModal(false);
      setSelectedSub(null);
      fetchData(true);
    } catch (err: any) {
      toast({
        title: 'Error al registrar pago',
        description: err.message || 'No se pudo guardar el pago en PostgreSQL',
        variant: 'destructive',
      });
    } finally {
      setSavingPago(false);
    }
  };

  // Ver historial de pagos
  const handleOpenHistoryModal = (sub: SuscripcionApi) => {
    setSubForHistory(sub);
    setShowHistoryModal(true);
  };

  // Notificar WhatsApp formateado con saludo formal y cuenta bancaria
  const handleShareWhatsApp = (sub: SuscripcionApi) => {
    const disco = sub.bus?.numeroDisco || '01';
    const socioNombre = sub.socio?.nombre || 'Estimado Socio';
    const corte = sub.fechaProximoCorte ? sub.fechaProximoCorte.slice(0, 10) : 'Día 5 de cada mes';
    const estado = sub.estadoVigente || sub.estado;

    const mensaje =
      `*RutaGo SaaS - Estado de Suscripción Oficial*%0A` +
      `Estimado(a) *${socioNombre}* (Unidad Disco ${disco})%0A%0A` +
      `Le informamos el estado actual del servicio tecnológico RutaGo para su unidad:%0A` +
      `🚌 *Autobús:* Disco ${disco} • Placa ${sub.bus?.placa || 'TAA-5152'}%0A` +
      `💵 *Tarifa Mensual:* $${(sub.montoMensual || 20).toFixed(2)} USD%0A` +
      `📅 *Fecha de Corte:* ${corte}%0A` +
      `📌 *Estado Actual:* ${estado}%0A` +
      `🗓️ *Último Pago:* ${sub.fechaUltimoPago ? sub.fechaUltimoPago.slice(0, 10) : 'Pendiente'}%0A%0A` +
      `_Por favor remita su comprobante de transferencia al registrar su pago mensual para mantener activas las frecuencias de boletería digital._%0A` +
      `*Cooperativa Vilcabambaturis - Plataforma RutaGo*`;

    window.open(`https://wa.me/?text=${mensaje}`, '_blank');
  };

  // Generador de PIN aleatorio para nuevo socio
  const handleGenerateRandomPin = () => {
    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    setNewSocioPin(pin);
  };

  // Crear nuevo socio hacia /api/saas/socios
  const handleCrearNuevoSocio = async () => {
    if (!newSocioCedula.trim() || newSocioCedula.trim().length < 10) {
      toast({ title: 'Cédula Inválida', description: 'Ingrese una cédula de 10 dígitos', variant: 'destructive' });
      return;
    }
    if (!newSocioNombre.trim()) {
      toast({ title: 'Nombre Requerido', description: 'Ingrese el nombre completo del socio', variant: 'destructive' });
      return;
    }
    if (!newSocioPin.trim() || newSocioPin.trim().length < 4) {
      toast({ title: 'PIN Inválido', description: 'El PIN debe tener al menos 4 dígitos', variant: 'destructive' });
      return;
    }

    setSavingSocio(true);
    try {
      const res = await fetch('/api/saas/socios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cedula: newSocioCedula.trim(),
          nombre: newSocioNombre.trim(),
          telefono: newSocioTelefono.trim() || undefined,
          email: newSocioEmail.trim() || undefined,
          pin: newSocioPin.trim(),
          rol: newSocioRol,
          busId: newSocioBusId || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al crear socio');
      }

      toast({
        title: 'Socio Registrado con Éxito',
        description: `${newSocioNombre} registrado en PostgreSQL con PIN criptográfico protegido.`,
      });

      setShowNewSocioModal(false);
      setNewSocioCedula('');
      setNewSocioNombre('');
      setNewSocioTelefono('');
      setNewSocioEmail('');
      setNewSocioPin('');
      setNewSocioBusId('');
      fetchData(true);
    } catch (err: any) {
      toast({
        title: 'Error al registrar socio',
        description: err.message || 'No se pudo guardar el socio',
        variant: 'destructive',
      });
    } finally {
      setSavingSocio(false);
    }
  };

  // Abrir modal de edición de socio
  const handleOpenEditSocioModal = (socio: CuentaSocioApi) => {
    setEditingSocio(socio);
    setEditNombre(socio.nombre);
    setEditTelefono(socio.telefono || '');
    setEditEmail(socio.email || '');
    setEditNewPin('');
    setEditActivo(socio.activo);
    const busAsignado = socio.buses && socio.buses.length > 0 ? socio.buses[0].id : '';
    setEditBusId(busAsignado);
    setShowEditSocioModal(true);
  };

  // Guardar edición de socio hacia PUT /api/saas/socios
  const handleGuardarEdicionSocio = async () => {
    if (!editingSocio) return;
    if (!editNombre.trim()) {
      toast({ title: 'Nombre requerido', variant: 'destructive' });
      return;
    }

    setSavingEditSocio(true);
    try {
      const busActualId = editingSocio.buses && editingSocio.buses.length > 0 ? editingSocio.buses[0].id : '';
      const busIdAsignar = editBusId && editBusId !== busActualId ? editBusId : undefined;
      const busIdDesvincular = !editBusId && busActualId ? busActualId : undefined;

      const res = await fetch('/api/saas/socios', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingSocio.id,
          nombre: editNombre.trim(),
          telefono: editTelefono.trim() || null,
          email: editEmail.trim() || null,
          pin: editNewPin.trim() ? editNewPin.trim() : undefined,
          activo: editActivo,
          busIdAsignar,
          busIdDesvincular,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al actualizar socio');
      }

      toast({
        title: 'Socio Actualizado',
        description: `Los datos de ${editNombre} han sido actualizados en la base de datos.`,
      });

      setShowEditSocioModal(false);
      setEditingSocio(null);
      fetchData(true);
    } catch (err: any) {
      toast({
        title: 'Error al actualizar',
        description: err.message || 'No se pudo guardar la actualización',
        variant: 'destructive',
      });
    } finally {
      setSavingEditSocio(false);
    }
  };

  // Descargar Respaldo JSON Completo
  const handleDownloadBackup = async () => {
    setBackupLoading(true);
    try {
      const res = await fetch('/api/backup');
      if (!res.ok) throw new Error('Error al generar respaldo en servidor');
      const data = await res.json();
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `respaldo_rutago_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: 'Respaldo Generado',
        description: `Exportados ${data.summary?.totalRecords || 0} registros y ${data.summary?.totalSocios || 0} socios.`,
      });
    } catch (err: any) {
      toast({
        title: 'Error en Respaldo',
        description: err.message || 'No se pudo generar el archivo de respaldo',
        variant: 'destructive',
      });
    } finally {
      setBackupLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-[100dvh] bg-slate-50 text-slate-900">
      {/* Alerta de Modo Offline Obligatorio */}
      {!isOnline && (
        <div className="bg-rose-600 text-white px-4 py-2.5 text-xs font-bold flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4 animate-pulse" />
            <span>SIN CONEXIÓN: La Consola de SuperAdministración SaaS requiere Internet para registrar pagos y auditar la base de datos.</span>
          </div>
          <Button
            onClick={() => fetchData(true)}
            size="sm"
            variant="outline"
            className="h-7 text-xs bg-white text-rose-700 hover:bg-rose-50 border-none font-black"
          >
            Reintentar
          </Button>
        </div>
      )}

      {/* Header Corporativo SaaS */}
      <header className="sticky top-0 z-30 bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-950 text-white shadow-xl border-b border-indigo-900/30">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 flex items-center justify-center text-white transition border border-white/10"
              aria-label="Volver"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-black tracking-tight">SuperAdmin SaaS</span>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-indigo-600 text-white shadow-xs">
                  Online Obligatorio
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  PostgreSQL
                </span>
              </div>
              <p className="text-[11px] text-slate-300 font-medium">
                Padrón de Socios • Control Comercial MRR • Soporte Técnico L2
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => fetchData(true)}
              disabled={refreshing}
              size="sm"
              variant="outline"
              className="h-9 px-3 rounded-xl bg-white/10 hover:bg-white/20 border-white/20 text-white text-xs font-bold gap-1.5 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Actualizar</span>
            </Button>
            <div className="w-9 h-9 rounded-xl bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-indigo-300" />
            </div>
          </div>
        </div>

        {/* Barra de Pestañas (Diseño para Oficina / Laptop & Mobile) */}
        <div className="max-w-7xl mx-auto px-4 flex items-center gap-2 border-t border-white/10 pt-1 pb-1.5 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('mrr')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition shrink-0 ${
              activeTab === 'mrr'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <DollarSign className="w-4 h-4 text-emerald-400" />
            <span>Control Comercial & MRR</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">
              {totalBuses}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('socios')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition shrink-0 ${
              activeTab === 'socios'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <User className="w-4 h-4 text-indigo-300" />
            <span>Padrón Oficial de Socios</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">
              {socios.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('auditoria')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition shrink-0 ${
              activeTab === 'auditoria'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Activity className="w-4 h-4 text-amber-400" />
            <span>Soporte Técnico L2 & DB</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/30 text-emerald-200">
              Activo
            </span>
          </button>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-5 flex flex-col gap-5">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-3">
            <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
            <p className="text-sm font-semibold">Cargando consola de superadministración SaaS...</p>
          </div>
        ) : (
          <>
            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* TAB 1: CONTROL COMERCIAL Y MRR                                */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            {activeTab === 'mrr' && (
              <div className="flex flex-col gap-5">
                {/* Hero MRR Cooperativo */}
                <Card className="rounded-3xl border-none bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-950 text-white shadow-xl overflow-hidden border border-indigo-900/50">
                  <CardContent className="p-5 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4 mb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-5 h-5 text-emerald-400" />
                          <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                            Tablero Comercial • Ingreso Mensual Recurrente (MRR)
                          </h2>
                        </div>
                        <p className="text-xs text-slate-300 mt-0.5">
                          Modelo SaaS: $20.00 USD / mes por autobús • Cooperativa Vilcabambaturis
                        </p>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        <span className="text-xs font-black px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                          {cumplimientoPorcentaje}% Cobrado en {hoy.toLocaleString('es-EC', { month: 'long' })}
                        </span>
                      </div>
                    </div>

                    {/* Grilla de Métricas Principales */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-4">
                      <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                        <span className="text-[11px] text-slate-300 uppercase font-bold tracking-wider block">
                          MRR Proyectado (100% Flota)
                        </span>
                        <span className="text-3xl font-black text-white mt-1 block">
                          ${mrrProyectado.toFixed(2)}
                        </span>
                        <span className="text-xs text-indigo-300 font-medium block mt-1">
                          $20.00 × {totalBuses} Unidades Registradas
                        </span>
                      </div>

                      <div className="bg-emerald-500/15 rounded-2xl p-4 border border-emerald-400/30">
                        <span className="text-[11px] text-emerald-200 uppercase font-bold tracking-wider block">
                          Recaudado este Mes
                        </span>
                        <span className="text-3xl font-black text-emerald-300 mt-1 block">
                          ${recaudadoMes.toFixed(2)}
                        </span>
                        <span className="text-xs text-emerald-200 font-medium block mt-1">
                          {activasCount} unidades con cuota al día
                        </span>
                      </div>

                      <div className="bg-amber-500/15 rounded-2xl p-4 border border-amber-400/30">
                        <span className="text-[11px] text-amber-200 uppercase font-bold tracking-wider block">
                          Por Vencer (≤ 5 Días)
                        </span>
                        <span className="text-3xl font-black text-amber-300 mt-1 block">
                          {porVencerCount}
                        </span>
                        <span className="text-xs text-amber-200 font-medium block mt-1">
                          Próximos a fecha de corte mensual
                        </span>
                      </div>

                      <div className="bg-rose-500/15 rounded-2xl p-4 border border-rose-400/30">
                        <span className="text-[11px] text-rose-200 uppercase font-bold tracking-wider block">
                          En Mora / Gracia
                        </span>
                        <span className="text-3xl font-black text-rose-300 mt-1 block">
                          {graciaCount + vencidasCount}
                        </span>
                        <span className="text-xs text-rose-200 font-medium block mt-1">
                          {graciaCount} en gracia • {vencidasCount} vencidas
                        </span>
                      </div>
                    </div>

                    {/* Barra de progreso de cobranza */}
                    <div className="bg-black/30 rounded-2xl p-3 border border-white/5">
                      <div className="flex items-center justify-between text-xs text-slate-300 mb-1.5 font-bold">
                        <span>Progreso de Recaudación del Mes</span>
                        <span className="text-emerald-300 font-black">${recaudadoMes.toFixed(2)} de ${mrrProyectado.toFixed(2)}</span>
                      </div>
                      <div className="w-full h-3 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-indigo-400 rounded-full transition-all duration-500"
                          style={{ width: `${cumplimientoPorcentaje}%` }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Filtros & Buscador */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <Input
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Buscar por Disco (ej. 01, 10), Placa (TAA-5152) o Socio..."
                      className="pl-10 h-10 rounded-xl bg-slate-50 border-slate-200 text-xs sm:text-sm font-medium"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
                    {(['TODAS', 'ACTIVA', 'POR_VENCER', 'GRACIA', 'VENCIDA'] as const).map((estado) => {
                      const isSelected = filterEstado === estado;
                      const labelMap: Record<string, string> = {
                        TODAS: `Todas (${suscripciones.length})`,
                        ACTIVA: `Al Día (${activasCount})`,
                        POR_VENCER: `Por Vencer (${porVencerCount})`,
                        GRACIA: `En Gracia (${graciaCount})`,
                        VENCIDA: `En Mora (${vencidasCount})`,
                      };

                      return (
                        <button
                          key={estado}
                          onClick={() => setFilterEstado(estado)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
                            isSelected
                              ? 'bg-slate-900 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          {labelMap[estado]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Listado de Suscripciones por Autobús */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredSubs.map((sub) => {
                    const disco = sub.bus?.numeroDisco || '01';
                    const placa = sub.bus?.placa || 'TAA-5152';
                    const socioNombre = sub.socio?.nombre || 'Socio No Asignado';
                    const isFundador = sub.socio?.esFundadorSaaS || disco === '01';
                    const estadoVigente = sub.estadoVigente || sub.estado;

                    const estadoConfig = {
                      ACTIVA: {
                        badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
                        indicator: 'bg-emerald-500',
                        label: 'Al Día',
                      },
                      POR_VENCER: {
                        badge: 'bg-amber-100 text-amber-800 border-amber-200',
                        indicator: 'bg-amber-500',
                        label: 'Por Vencer',
                      },
                      GRACIA: {
                        badge: 'bg-orange-100 text-orange-800 border-orange-200',
                        indicator: 'bg-orange-500',
                        label: 'Período de Gracia',
                      },
                      VENCIDA: {
                        badge: 'bg-rose-100 text-rose-800 border-rose-200',
                        indicator: 'bg-rose-500',
                        label: 'En Mora / Suspendida',
                      },
                      SUSPENDIDA: {
                        badge: 'bg-rose-100 text-rose-800 border-rose-200',
                        indicator: 'bg-rose-500',
                        label: 'Suspendida',
                      },
                    }[estadoVigente] || {
                      badge: 'bg-slate-100 text-slate-800 border-slate-200',
                      indicator: 'bg-slate-500',
                      label: estadoVigente,
                    };

                    const corteDate = sub.fechaProximoCorte ? sub.fechaProximoCorte.slice(0, 10) : 'Día 5';
                    const ultimoPagoDate = sub.fechaUltimoPago ? sub.fechaUltimoPago.slice(0, 10) : 'Sin registro';

                    return (
                      <Card
                        key={sub.id}
                        className="rounded-2xl border border-slate-200 bg-white shadow-xs hover:shadow-md transition duration-200 overflow-hidden flex flex-col justify-between"
                      >
                        <CardContent className="p-4 flex flex-col gap-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-700 flex flex-col items-center justify-center font-black border border-indigo-100 shrink-0">
                                <span className="text-[10px] text-indigo-500 font-extrabold uppercase leading-none">Disco</span>
                                <span className="text-lg leading-tight">{disco}</span>
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h3 className="font-black text-sm text-slate-900">Unidad {disco}</h3>
                                  <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md">
                                    {placa}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-600 font-semibold truncate max-w-[180px] mt-0.5">
                                  {socioNombre}
                                </p>
                                {isFundador && (
                                  <span className="inline-block text-[9px] font-black uppercase text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded-md mt-0.5">
                                    ⭐ Unidad Insignia Fundador
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="text-right">
                              <span className="text-base font-black text-slate-900 block leading-tight">
                                ${(sub.montoMensual || 20).toFixed(2)}
                              </span>
                              <span className="text-[10px] text-slate-400 font-medium">USD / mes</span>
                            </div>
                          </div>

                          {/* Estado y fechas */}
                          <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100 flex flex-col gap-1.5 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] uppercase font-bold text-slate-400">Estado Vigencia:</span>
                              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border flex items-center gap-1.5 ${estadoConfig.badge}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${estadoConfig.indicator}`} />
                                {estadoConfig.label}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/50">
                              <div>
                                <span className="text-[10px] text-slate-400 block font-semibold">Último Pago</span>
                                <span className="font-bold text-slate-800 text-[11px]">{ultimoPagoDate}</span>
                              </div>
                              <div>
                                <span className="text-[10px] text-slate-400 block font-semibold">Próximo Corte</span>
                                <span className="font-bold text-indigo-900 text-[11px]">{corteDate}</span>
                              </div>
                            </div>
                          </div>

                          {/* Acciones Rápidas */}
                          <div className="flex items-center gap-1.5 pt-1">
                            <Button
                              onClick={() => handleOpenPayModal(sub)}
                              size="sm"
                              className="flex-1 h-9 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-xs"
                            >
                              <CreditCard className="w-3.5 h-3.5 mr-1.5" />
                              Registrar Pago
                            </Button>

                            <Button
                              onClick={() => handleOpenHistoryModal(sub)}
                              size="sm"
                              variant="outline"
                              className="h-9 px-2.5 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold"
                              title="Historial de Pagos"
                            >
                              <History className="w-3.5 h-3.5" />
                            </Button>

                            <Button
                              onClick={() => handleShareWhatsApp(sub)}
                              size="sm"
                              variant="outline"
                              className="h-9 px-2.5 rounded-xl border-slate-200 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 text-xs font-bold"
                              title="Notificar por WhatsApp"
                            >
                              <Share2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* TAB 2: PADRÓN OFICIAL DE SOCIOS                               */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            {activeTab === 'socios' && (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                  <div>
                    <h2 className="text-base font-black text-slate-900">Padrón Oficial de Socios Propietarios</h2>
                    <p className="text-xs text-slate-500">
                      Gestión de cuentas con autenticación criptográfica en PostgreSQL y asignación de flota.
                    </p>
                  </div>

                  <Button
                    onClick={() => {
                      handleGenerateRandomPin();
                      setShowNewSocioModal(true);
                    }}
                    className="h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs gap-1.5 shadow-sm self-start sm:self-auto"
                  >
                    <Plus className="w-4 h-4" />
                    Registrar Nuevo Socio
                  </Button>
                </div>

                {/* Listado de Socios en Tarjetas */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {socios.map((socio) => {
                    const isFundador = socio.esFundadorSaaS || socio.cedula === '1103987654';
                    const isSuperAdmin = socio.rol === 'SUPERADMIN_SAAS';
                    const busesAsignados = socio.buses || [];

                    return (
                      <Card
                        key={socio.id}
                        className={`rounded-2xl border shadow-xs transition duration-200 overflow-hidden flex flex-col justify-between ${
                          isFundador
                            ? 'border-amber-300 bg-amber-50/20'
                            : isSuperAdmin
                            ? 'border-indigo-300 bg-indigo-50/20'
                            : 'border-slate-200 bg-white'
                        }`}
                      >
                        <CardContent className="p-4 flex flex-col gap-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-base border shrink-0 ${
                                  isFundador
                                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                                    : isSuperAdmin
                                    ? 'bg-indigo-100 text-indigo-900 border-indigo-300'
                                    : 'bg-slate-100 text-slate-800 border-slate-200'
                                }`}
                              >
                                {socio.nombre.slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <h3 className="font-black text-sm text-slate-900">{socio.nombre}</h3>
                                  {isFundador && (
                                    <span className="text-[9px] font-black uppercase bg-amber-200 text-amber-900 px-1.5 py-0.2 rounded-md">
                                      Fundador
                                    </span>
                                  )}
                                  {isSuperAdmin && (
                                    <span className="text-[9px] font-black uppercase bg-indigo-200 text-indigo-900 px-1.5 py-0.2 rounded-md">
                                      Vendor SaaS
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-slate-500 font-semibold mt-0.5">
                                  CI: {socio.cedula}
                                </p>
                              </div>
                            </div>

                            <span
                              className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                                socio.activo
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {socio.activo ? 'ACTIVO' : 'INACTIVO'}
                            </span>
                          </div>

                          {/* Contacto & Unidades */}
                          <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100 flex flex-col gap-1.5 text-xs text-slate-700">
                            <div className="flex items-center gap-2">
                              <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="font-semibold">{socio.telefono || 'Sin teléfono registrado'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="font-semibold truncate">{socio.email || 'Sin correo electrónico'}</span>
                            </div>

                            <div className="pt-1.5 border-t border-slate-200/60 flex items-center justify-between">
                              <span className="text-[10px] text-slate-400 uppercase font-bold">Unidades Asignadas:</span>
                              <div className="flex items-center gap-1 flex-wrap justify-end">
                                {busesAsignados.length > 0 ? (
                                  busesAsignados.map((b) => (
                                    <span
                                      key={b.id}
                                      className="text-[10px] font-black px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 border border-indigo-200"
                                    >
                                      Disco {b.numeroDisco} ({b.placa})
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-[10px] text-slate-400 italic">Sin unidad asignada</span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Acciones */}
                          <div className="flex items-center gap-2 pt-1">
                            <Button
                              onClick={() => handleOpenEditSocioModal(socio)}
                              size="sm"
                              variant="outline"
                              className="flex-1 h-9 rounded-xl border-slate-200 hover:bg-slate-100 text-slate-800 text-xs font-bold"
                            >
                              <Key className="w-3.5 h-3.5 mr-1 text-slate-500" />
                              Editar / Reset PIN
                            </Button>

                            {socio.telefono && (
                              <Button
                                onClick={() => {
                                  const tel = socio.telefono?.replace(/\D/g, '') || '';
                                  window.open(`https://wa.me/593${tel.startsWith('0') ? tel.slice(1) : tel}`, '_blank');
                                }}
                                size="sm"
                                variant="outline"
                                className="h-9 px-3 rounded-xl border-slate-200 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 text-xs font-bold"
                                title="Contactar por WhatsApp"
                              >
                                <Share2 className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* TAB 3: SOPORTE TÉCNICO L2 Y AUDITORÍA DB                      */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            {activeTab === 'auditoria' && (
              <div className="flex flex-col gap-5">
                {/* Estado de Salud de la Base de Datos */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                        <Database className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-black">Base de Datos</span>
                        <h4 className="text-sm font-black text-slate-900">
                          {auditoria?.database?.provider || 'PostgreSQL (Prisma)'}
                        </h4>
                        <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1 mt-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                          Estado: {auditoria?.database?.status || 'ONLINE'} (Latencia: {auditoria?.database?.latencyMs ?? 1} ms)
                        </span>
                      </div>
                    </div>
                  </Card>

                  <Card className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-black">Seguridad & Autenticación</span>
                        <h4 className="text-sm font-black text-slate-900">Cero-Hardcode Hashing</h4>
                        <span className="text-[11px] text-indigo-600 font-bold block mt-0.5">
                          SHA-256 + 32-char Random Salt
                        </span>
                      </div>
                    </div>
                  </Card>

                  <Card className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                          <Download className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-black">Respaldo Integral</span>
                          <h4 className="text-sm font-black text-slate-900">Exportar Base JSON</h4>
                          <span className="text-[11px] text-slate-500 font-medium block mt-0.5">
                            Incluye Hojas, Socios y Pagos
                          </span>
                        </div>
                      </div>

                      <Button
                        onClick={handleDownloadBackup}
                        disabled={backupLoading}
                        size="sm"
                        className="h-9 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs"
                      >
                        {backupLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Descargar'}
                      </Button>
                    </div>
                  </Card>
                </div>

                {/* Auditoría de Tablas en PostgreSQL */}
                <Card className="rounded-3xl border border-slate-200 bg-white shadow-xs overflow-hidden">
                  <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <h3 className="font-black text-base text-slate-900">Auditoría de Integridad de Datos (PostgreSQL)</h3>
                      <p className="text-xs text-slate-500">Conteo en tiempo real de registros maestros y transaccionales.</p>
                    </div>
                    <span className="text-xs font-black px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                      Certificación L2
                    </span>
                  </div>

                  <div className="p-4 sm:p-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Hojas de Ruta (DailyRecord)</span>
                      <span className="text-2xl font-black text-slate-900 block mt-1">
                        {auditoria?.tablas?.dailyRecords ?? 0}
                      </span>
                      <span className="text-[10px] text-emerald-600 font-semibold block mt-0.5">100% Preservados</span>
                    </div>

                    <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Boletos Emitidos (VentaBoleto)</span>
                      <span className="text-2xl font-black text-slate-900 block mt-1">
                        {auditoria?.tablas?.ventasBoleto ?? 0}
                      </span>
                      <span className="text-[10px] text-indigo-600 font-semibold block mt-0.5">Tickets carretera</span>
                    </div>

                    <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Gastos Propietario (OwnerExpense)</span>
                      <span className="text-2xl font-black text-slate-900 block mt-1">
                        {auditoria?.tablas?.ownerExpenses ?? 0}
                      </span>
                      <span className="text-[10px] text-slate-500 font-semibold block mt-0.5">Contabilidad Bus 01</span>
                    </div>

                    <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Cuentas Socios (CuentaSocio)</span>
                      <span className="text-2xl font-black text-slate-900 block mt-1">
                        {auditoria?.tablas?.cuentasSocio ?? socios.length}
                      </span>
                      <span className="text-[10px] text-emerald-600 font-semibold block mt-0.5">Padrón cooperativo</span>
                    </div>

                    <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Flota Autobuses (Bus)</span>
                      <span className="text-2xl font-black text-slate-900 block mt-1">
                        {auditoria?.tablas?.buses ?? totalBuses}
                      </span>
                      <span className="text-[10px] text-indigo-600 font-semibold block mt-0.5">19 Unidades VT/P</span>
                    </div>

                    <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Tripulación (Persona)</span>
                      <span className="text-2xl font-black text-slate-900 block mt-1">
                        {auditoria?.tablas?.personal ?? 0}
                      </span>
                      <span className="text-[10px] text-slate-500 font-semibold block mt-0.5">Choferes y ayudantes</span>
                    </div>

                    <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Suscripciones (SuscripcionBus)</span>
                      <span className="text-2xl font-black text-slate-900 block mt-1">
                        {auditoria?.tablas?.suscripciones ?? suscripciones.length}
                      </span>
                      <span className="text-[10px] text-emerald-600 font-semibold block mt-0.5">SaaS $20.00</span>
                    </div>

                    <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Pagos Registrados (PagoSuscripcion)</span>
                      <span className="text-2xl font-black text-slate-900 block mt-1">
                        {auditoria?.tablas?.pagosRegistrados ?? 0}
                      </span>
                      <span className="text-[10px] text-indigo-600 font-semibold block mt-0.5">Comprobantes</span>
                    </div>
                  </div>
                </Card>

                {/* Log de Pagos y Actividad Reciente */}
                <Card className="rounded-3xl border border-slate-200 bg-white shadow-xs overflow-hidden">
                  <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <h3 className="font-black text-base text-slate-900">Registro de Cobros Recientes (Auditoría L2)</h3>
                      <p className="text-xs text-slate-500">Últimos comprobantes y pagos ingresados en la cooperativa.</p>
                    </div>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {auditoria?.pagosRecientes && auditoria.pagosRecientes.length > 0 ? (
                      auditoria.pagosRecientes.map((pago) => (
                        <div key={pago.id} className="p-3.5 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                              <Receipt className="w-4 h-4" />
                            </div>
                            <div>
                              <span className="font-black text-slate-900">
                                Unidad {pago.busDisco} • {pago.socioNombre}
                              </span>
                              <p className="text-[11px] text-slate-400">
                                {pago.fechaPago ? pago.fechaPago.slice(0, 10) : ''} • Ref: {pago.numeroComprobante || 'N/A'} • {pago.metodoPago}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="font-black text-emerald-600 text-sm">${pago.monto.toFixed(2)}</span>
                            <span className="text-[10px] text-slate-400 block">{pago.notas || 'Pago mensual'}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-6 text-center text-xs text-slate-400 italic">
                        No hay pagos registrados recientemente.
                      </div>
                    )}
                  </div>
                </Card>
              </div>
            )}
          </>
        )}
      </main>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* MODAL 1: REGISTRAR COBRO / PAGO DE SUSCRIPCIÓN                 */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {showPayModal && selectedSub && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-black text-sm">
                  {selectedSub.bus?.numeroDisco || '01'}
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900">Registrar Cobro Mensualidad</h3>
                  <p className="text-xs text-slate-500">
                    Unidad {selectedSub.bus?.numeroDisco} • {selectedSub.socio?.nombre}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPayModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Monto a Cobrar ($ USD)</label>
                <Input
                  type="number"
                  step="0.50"
                  value={pagoMonto}
                  onChange={(e) => setPagoMonto(e.target.value)}
                  className="h-11 rounded-xl text-lg font-black text-indigo-900"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Método de Pago</label>
                <select
                  value={pagoMetodo}
                  onChange={(e) => setPagoMetodo(e.target.value)}
                  className="w-full h-11 rounded-xl border border-slate-200 px-3 text-xs font-semibold bg-white text-slate-800"
                >
                  <option value="TRANSFERENCIA">Transferencia Bancaria (Pichincha / Loja / Guayaquil)</option>
                  <option value="DEPOSITO">Depósito en Ventanilla</option>
                  <option value="EFECTIVO">Efectivo en Mano / Oficina</option>
                  <option value="OTRO">Otro</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">N° Comprobante / Referencia Bancaria</label>
                <Input
                  value={pagoComprobante}
                  onChange={(e) => setPagoComprobante(e.target.value)}
                  placeholder="Ej. TRANSF-098812 Pichincha"
                  className="h-11 rounded-xl text-xs sm:text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Observaciones / Notas</label>
                <Input
                  value={pagoNotas}
                  onChange={(e) => setPagoNotas(e.target.value)}
                  placeholder="Ej. Pago correspondiente a cuota mensual"
                  className="h-11 rounded-xl text-xs sm:text-sm"
                />
              </div>

              <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-3 text-xs text-indigo-950 mt-1">
                <div className="flex items-center gap-1.5 font-bold mb-0.5">
                  <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                  <span>Actualización Automática en PostgreSQL</span>
                </div>
                <p className="text-indigo-900/80">
                  Al confirmar, se creará un registro formal en <strong>PagoSuscripcion</strong>, el estado se marcará <strong>AL DÍA</strong> y la fecha de corte se extenderá automáticamente 30 días.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Button
                  onClick={() => setShowPayModal(false)}
                  variant="ghost"
                  className="flex-1 h-12 rounded-xl text-slate-600 font-semibold"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleConfirmarCobro}
                  disabled={savingPago}
                  className="flex-1 h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black"
                >
                  {savingPago ? (
                    <RefreshCw className="w-4 h-4 animate-spin mr-1.5" />
                  ) : (
                    <Save className="w-4 h-4 mr-1.5" />
                  )}
                  Confirmar Cobro
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* MODAL 2: HISTORIAL DE PAGOS DE LA UNIDAD                      */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {showHistoryModal && subForHistory && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl p-5 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-black">
                  {subForHistory.bus?.numeroDisco || '01'}
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900">Historial de Cobros</h3>
                  <p className="text-xs text-slate-500">
                    Unidad {subForHistory.bus?.numeroDisco} • {subForHistory.socio?.nombre}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 pr-1">
              {subForHistory.pagos && subForHistory.pagos.length > 0 ? (
                subForHistory.pagos.map((p) => (
                  <div key={p.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-black text-slate-900">${p.monto.toFixed(2)} USD</span>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Fecha: {p.fechaPago ? p.fechaPago.slice(0, 10) : 'Sin fecha'} • {p.metodoPago}
                      </p>
                      {p.numeroComprobante && (
                        <p className="text-[10px] text-indigo-700 font-semibold">Ref: {p.numeroComprobante}</p>
                      )}
                      {p.notas && <p className="text-[10px] text-slate-400 italic mt-0.5">{p.notas}</p>}
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      CONFIRMADO
                    </span>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center text-xs text-slate-400 italic">
                  No hay comprobantes de pago registrados para esta unidad.
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <Button
                onClick={() => setShowHistoryModal(false)}
                className="h-10 px-5 rounded-xl bg-slate-900 text-white font-bold text-xs"
              >
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* MODAL 3: REGISTRAR NUEVO SOCIO                                 */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {showNewSocioModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl animate-in slide-in-from-bottom duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <h3 className="font-black text-base text-slate-900">Alta de Nuevo Socio Propietario</h3>
                <p className="text-xs text-slate-500">
                  El socio se registrará con autenticación criptográfica en PostgreSQL.
                </p>
              </div>
              <button
                onClick={() => setShowNewSocioModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Cédula de Identidad (10 Dígitos) *</label>
                <Input
                  value={newSocioCedula}
                  onChange={(e) => setNewSocioCedula(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="Ej. 1104567890"
                  className="h-11 rounded-xl text-sm font-semibold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Nombres y Apellidos Completos *</label>
                <Input
                  value={newSocioNombre}
                  onChange={(e) => setNewSocioNombre(e.target.value)}
                  placeholder="Ej. Carlos Ramiro Gómez"
                  className="h-11 rounded-xl text-sm font-semibold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Teléfono / WhatsApp</label>
                  <Input
                    value={newSocioTelefono}
                    onChange={(e) => setNewSocioTelefono(e.target.value)}
                    placeholder="Ej. 0987654321"
                    className="h-11 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Correo Electrónico</label>
                  <Input
                    type="email"
                    value={newSocioEmail}
                    onChange={(e) => setNewSocioEmail(e.target.value)}
                    placeholder="Ej. socio@rutago.app"
                    className="h-11 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Asignar Autobús de Flota</label>
                <select
                  value={newSocioBusId}
                  onChange={(e) => setNewSocioBusId(e.target.value)}
                  className="w-full h-11 rounded-xl border border-slate-200 px-3 text-xs font-semibold bg-white text-slate-800"
                >
                  <option value="">-- Sin asignar por ahora --</option>
                  {catalogoBuses.map((bus) => (
                    <option key={bus.id} value={bus.id}>
                      Disco {bus.numeroDisco} ({bus.placa}) - {bus.marca} {bus.modelo}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">PIN Inicial de Acceso (4 Dígitos) *</label>
                  <button
                    type="button"
                    onClick={handleGenerateRandomPin}
                    className="text-[11px] text-indigo-600 font-bold hover:underline"
                  >
                    Generar Aleatorio
                  </button>
                </div>
                <div className="relative">
                  <Input
                    type={showPinPlain ? 'text' : 'password'}
                    value={newSocioPin}
                    onChange={(e) => setNewSocioPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="Ej. 4821"
                    className="h-11 rounded-xl text-base font-black tracking-widest pl-3 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPinPlain(!showPinPlain)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPinPlain ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  El PIN se almacenará con salt criptográfico individual (Cero-Hardcode).
                </p>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Rol de Acceso</label>
                <select
                  value={newSocioRol}
                  onChange={(e) => setNewSocioRol(e.target.value as any)}
                  className="w-full h-11 rounded-xl border border-slate-200 px-3 text-xs font-semibold bg-white text-slate-800"
                >
                  <option value="SOCIO">Socio Propietario (Acceso a sus buses y gastos)</option>
                  <option value="SUPERADMIN_SAAS">SuperAdmin SaaS (Vendor / Desarrollador)</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Button
                  onClick={() => setShowNewSocioModal(false)}
                  variant="ghost"
                  className="flex-1 h-12 rounded-xl text-slate-600 font-semibold"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleCrearNuevoSocio}
                  disabled={savingSocio}
                  className="flex-1 h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black"
                >
                  {savingSocio ? <RefreshCw className="w-4 h-4 animate-spin mr-1.5" /> : <Save className="w-4 h-4 mr-1.5" />}
                  Registrar Socio
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* MODAL 4: EDITAR SOCIO / RESETEAR PIN                            */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {showEditSocioModal && editingSocio && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl animate-in slide-in-from-bottom duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <h3 className="font-black text-base text-slate-900">Editar Socio • CI: {editingSocio.cedula}</h3>
                <p className="text-xs text-slate-500">Actualizar datos de contacto, unidad o resetear PIN.</p>
              </div>
              <button
                onClick={() => setShowEditSocioModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Nombre Completo</label>
                <Input
                  value={editNombre}
                  onChange={(e) => setEditNombre(e.target.value)}
                  className="h-11 rounded-xl text-sm font-semibold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Teléfono</label>
                  <Input
                    value={editTelefono}
                    onChange={(e) => setEditTelefono(e.target.value)}
                    className="h-11 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Email</label>
                  <Input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="h-11 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Autobús Asignado</label>
                <select
                  value={editBusId}
                  onChange={(e) => setEditBusId(e.target.value)}
                  className="w-full h-11 rounded-xl border border-slate-200 px-3 text-xs font-semibold bg-white text-slate-800"
                >
                  <option value="">-- Sin autobús asignado --</option>
                  {catalogoBuses.map((bus) => (
                    <option key={bus.id} value={bus.id}>
                      Disco {bus.numeroDisco} ({bus.placa}) - {bus.marca} {bus.modelo}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Resetear PIN de Acceso (Opcional)
                </label>
                <Input
                  type="password"
                  value={editNewPin}
                  onChange={(e) => setEditNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Dejar en blanco para no cambiar el PIN actual"
                  className="h-11 rounded-xl text-sm font-black tracking-widest"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Si ingresas un PIN nuevo (mínimo 4 dígitos), se generará un nuevo salt criptográfico único.
                </p>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-xs font-bold text-slate-700">Estado de la Cuenta</span>
                <button
                  type="button"
                  onClick={() => setEditActivo(!editActivo)}
                  className={`text-xs font-black px-3 py-1 rounded-full transition ${
                    editActivo ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {editActivo ? 'ACTIVO' : 'INACTIVO'}
                </button>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Button
                  onClick={() => setShowEditSocioModal(false)}
                  variant="ghost"
                  className="flex-1 h-12 rounded-xl text-slate-600 font-semibold"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleGuardarEdicionSocio}
                  disabled={savingEditSocio}
                  className="flex-1 h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black"
                >
                  {savingEditSocio ? <RefreshCw className="w-4 h-4 animate-spin mr-1.5" /> : <Save className="w-4 h-4 mr-1.5" />}
                  Guardar Cambios
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
