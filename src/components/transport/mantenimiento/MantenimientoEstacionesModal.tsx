'use client';

import React, { useState, useEffect } from 'react';
import {
  Check,
  Plus,
  Trash2,
  ShieldCheck,
  RotateCcw,
  Save,
  AlertTriangle,
  Calendar,
  CheckCircle2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  ESTACIONES_SERVICIO_CONFIG,
  EstacionServicioId,
  getComboUnidad,
  saveComboUnidad,
  resetComboUnidad,
  isItemProtegidoReceta,
  getCategoriaContablePorEstacion,
  resolverCascadaEstacion,
  ComboUnidadItem,
} from '@/lib/mantenimiento-estaciones';
import {
  MantenimientoCatalogoItem,
  MantenimientoBusItem,
  getCatalogoMaestroGlobal,
} from '@/lib/mantenimiento-catalogo';
import { saveBusOdometer } from '@/lib/fleet-storage';
import { calcularDesgasteRegularizacion, saveParadaPago } from '@/lib/paradas-vt-storage';
import { saveOwnerExpense, saveOwnerExpenseToApi } from '@/lib/owner-expenses-storage';
import type { PaymentAbono, SocioModalidadPago } from '@/types/expenses';

export interface MantenimientoEstacionesModalProps {
  isOpen: boolean;
  estacionId: EstacionServicioId | null;
  onClose: () => void;
  activeBusDisco: string;
  activeBusPlaca: string;
  activeBusId: string;
  kmActual: number;
  items: MantenimientoBusItem[];
  saveItems: (newItems: MantenimientoBusItem[]) => void;
  isOnline: boolean;
  onServicioGuardado?: () => void;
}

export function MantenimientoEstacionesModal({
  isOpen,
  estacionId,
  onClose,
  activeBusDisco,
  activeBusId,
  kmActual,
  items,
  saveItems,
  isOnline,
  onServicioGuardado,
}: MantenimientoEstacionesModalProps) {
  const { toast } = useToast();

  const [modoConfigurarCombo, setModoConfigurarCombo] = useState<boolean>(false);
  const [comboUnidadItems, setComboUnidadItems] = useState<ComboUnidadItem[]>([]);
  const [comboUnidadChecks, setComboUnidadChecks] = useState<Record<string, boolean>>({});
  const [comboUnidadExtras, setComboUnidadExtras] = useState<string[]>([]);
  const [comboCodigosExcluidos, setComboCodigosExcluidos] = useState<string[]>([]);
  const [busquedaExtraModal, setBusquedaExtraModal] = useState<string>('');

  const [estacionCodigosSeleccionados, setEstacionCodigosSeleccionados] = useState<string[]>([]);
  const [estacionKm, setEstacionKm] = useState<string>('');
  const [estacionCosto, setEstacionCosto] = useState<string>('');
  const [estacionTaller, setEstacionTaller] = useState<string>('');
  const [estacionFactura, setEstacionFactura] = useState<string>('');
  const [estacionMetodoPago, setEstacionMetodoPago] = useState<'EFECTIVO' | 'TRANSFERENCIA'>('EFECTIVO');
  const [estacionModalidadPago, setEstacionModalidadPago] = useState<
    'PAGO_TOTAL' | 'PAGO_PARCIAL' | 'CREDITO_FIADO'
  >('PAGO_TOTAL');
  const [estacionMontoAbono, setEstacionMontoAbono] = useState<string>('');
  const [estacionModoRetroactivo, setEstacionModoRetroactivo] = useState<boolean>(false);
  const [estacionKmServicio, setEstacionKmServicio] = useState<string>('');
  const [estacionFechaServicio, setEstacionFechaServicio] = useState<string>(() =>
    new Date().toISOString().split('T')[0]
  );

  // Cargar configuración de la estación al abrir
  useEffect(() => {
    if (!isOpen || !estacionId) return;

    const config = ESTACIONES_SERVICIO_CONFIG[estacionId];
    if (!config) return;

    const comboData = getComboUnidad(activeBusId, estacionId);
    const checksMap: Record<string, boolean> = { ...(comboData.checks || {}) };
    if (Object.keys(checksMap).length === 0 && Array.isArray(comboData.items)) {
      comboData.items.forEach(it => {
        checksMap[it.codigo] = Boolean(it.preMarcado);
      });
    }

    setComboUnidadItems(comboData.items || []);
    setComboUnidadChecks(checksMap);
    setComboUnidadExtras(comboData.codigosExtras || []);
    setComboCodigosExcluidos(comboData.codigosExcluidos || []);
    setBusquedaExtraModal('');
    setModoConfigurarCombo(false);

    // Precargar ítems seleccionados para asentar
    const preMarcados = (comboData.items || [])
      .filter(it => Boolean(checksMap[it.codigo]))
      .map(it => it.codigo);
    setEstacionCodigosSeleccionados(preMarcados);

    setEstacionKm(kmActual ? kmActual.toString() : '');
    setEstacionCosto('');
    setEstacionFactura('');
    setEstacionModalidadPago('PAGO_TOTAL');
    setEstacionMontoAbono('');
    setEstacionMetodoPago('EFECTIVO');
    setEstacionModoRetroactivo(false);
    setEstacionKmServicio(kmActual ? kmActual.toString() : '');
    setEstacionFechaServicio(new Date().toISOString().split('T')[0]);

    // Taller sugerido
    const tallerDefault =
      estacionId === 'LUBRICADORA'
        ? 'Lubricadora La Fosa - Loja'
        : estacionId === 'FRENOS_RUEDAS'
        ? 'Taller de Frenos Don Fausto'
        : estacionId === 'MNT_MAYOR'
        ? 'Taller Especializado Hino (Mesías)'
        : estacionId === 'ADMISION_AIRE'
        ? 'Taller del Aire y Válvulas'
        : estacionId === 'ALINEACION'
        ? 'Serviteca Continental / Llantas'
        : estacionId === 'RADIADOR'
        ? 'Taller Radiadores Loja'
        : 'Terminal / Parada';
    setEstacionTaller(tallerDefault);
  }, [isOpen, estacionId, activeBusId, kmActual]);

  if (!isOpen || !estacionId) return null;

  const config = ESTACIONES_SERVICIO_CONFIG[estacionId];
  if (!config) return null;

  const totalSeleccionados = estacionCodigosSeleccionados.length;

  const handleToggleItemEstacion = (codigo: string) => {
    setEstacionCodigosSeleccionados(prev => {
      if (prev.includes(codigo)) {
        return prev.filter(c => c !== codigo);
      } else {
        const next = [...prev, codigo];
        return resolverCascadaEstacion(next);
      }
    });
  };

  const handleQuitarItemReceta = (codigo: string, nombreItem: string) => {
    if (isItemProtegidoReceta(estacionId, codigo)) {
      toast({
        title: 'Componente Vital Protegido 🛡️',
        description: `${nombreItem} es indispensable para la vida del motor Hino AK y no puede excluirse de la lubricadora.`,
        variant: 'destructive',
      });
      return;
    }

    setComboUnidadItems(prev => prev.filter(it => it.codigo !== codigo));
    setComboUnidadChecks(prev => {
      const next = { ...prev };
      delete next[codigo];
      return next;
    });
    setComboUnidadExtras(prev => prev.filter(c => c !== codigo));
    setComboCodigosExcluidos(prev => (!prev.includes(codigo) ? [...prev, codigo] : prev));
    setEstacionCodigosSeleccionados(prev => prev.filter(c => c !== codigo));

    toast({
      title: 'Componente Retirado de Receta',
      description: `${nombreItem} ya no aparecerá como parte de esta estación en tu unidad. Guarda la receta para confirmar.`,
    });
  };

  const handleAgregarItemExtraACombo = (codigo: string) => {
    const catalogo = getCatalogoMaestroGlobal();
    const catItem = catalogo.find(c => c.codigo === codigo);
    if (!catItem) return;

    if (comboUnidadItems.some(it => it.codigo === codigo)) {
      toast({
        title: 'Componente ya incluido',
        description: `${catItem.nombre} ya forma parte de esta estación.`,
      });
      return;
    }

    const nuevoComboItem: ComboUnidadItem = {
      codigo: catItem.codigo,
      nombre: catItem.nombre,
      categoria: catItem.categoria,
      intervaloKm: catItem.intervaloKmOficial,
      preMarcado: true,
      esProtegido: false,
    };

    setComboUnidadItems(prev => [...prev, nuevoComboItem]);
    setComboUnidadChecks(prev => ({ ...prev, [codigo]: true }));
    setComboUnidadExtras(prev => [...prev, codigo]);
    setComboCodigosExcluidos(prev => prev.filter(c => c !== codigo));
    setEstacionCodigosSeleccionados(prev => [...prev, codigo]);
    setBusquedaExtraModal('');

    toast({
      title: 'Repuesto Extra Añadido',
      description: `${catItem.nombre} se integró a la receta. Guarda la receta para asentar en el servidor.`,
    });
  };

  const handleRestablecerComboBase = () => {
    resetComboUnidad(activeBusId, estacionId);
    const recargado = getComboUnidad(activeBusId, estacionId);
    const checksMap: Record<string, boolean> = { ...(recargado.checks || {}) };
    if (Object.keys(checksMap).length === 0 && Array.isArray(recargado.items)) {
      recargado.items.forEach(it => {
        checksMap[it.codigo] = Boolean(it.preMarcado);
      });
    }

    setComboUnidadItems(recargado.items || []);
    setComboUnidadChecks(checksMap);
    setComboUnidadExtras(recargado.codigosExtras || []);
    setComboCodigosExcluidos(recargado.codigosExcluidos || []);
    setEstacionCodigosSeleccionados(
      (recargado.items || []).filter(it => Boolean(checksMap[it.codigo])).map(it => it.codigo)
    );

    toast({
      title: 'Receta Restablecida',
      description: `Se restauraron los componentes estándar de fábrica para ${config.nombre}.`,
    });
  };

  const handleGuardarRecetaCombo = async () => {
    if (!isOnline) {
      toast({
        variant: 'destructive',
        title: 'Sin Conexión a Internet ⚠️',
        description:
          'Se requiere conexión a internet para alterar recetas oficiales en la base de datos central.',
      });
      return;
    }

    saveComboUnidad(
      activeBusId,
      estacionId,
      comboUnidadChecks,
      comboUnidadExtras,
      comboCodigosExcluidos
    );

    // Auto-activación de repuestos extras en el inventario del bus
    if (comboUnidadExtras.length > 0) {
      const catalogo = getCatalogoMaestroGlobal();
      const mapCat = new Map<string, MantenimientoCatalogoItem>(catalogo.map(c => [c.codigo, c]));
      const codigosActualesEnBus = new Set(items.map(it => it.codigo));
      const repuestosExtrasParaBus: MantenimientoBusItem[] = [];

      comboUnidadExtras.forEach(cod => {
        if (!codigosActualesEnBus.has(cod)) {
          const catItem = mapCat.get(cod);
          if (catItem) {
            repuestosExtrasParaBus.push({
              id: `mbus-${catItem.id}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
              catalogoId: catItem.id,
              codigo: catItem.codigo,
              nombre: catItem.nombre,
              categoria: catItem.categoria,
              intervaloKm: catItem.intervaloKmOficial,
              ultimoKm: kmActual,
              fechaUltimo: new Date().toISOString().split('T')[0],
              costoEstimado: 40,
              repuestoDetalle: catItem.especificacionLubricanteRepuesto,
              tallerMecanico: estacionTaller,
              asignadoChofer: catItem.asignadoChoferPorDefecto,
              activo: true,
            });
          }
        }
      });

      if (repuestosExtrasParaBus.length > 0) {
        saveItems([...items, ...repuestosExtrasParaBus]);
      }
    }

    toast({
      title: 'Receta Oficial Guardada 🛡️',
      description: `Los ajustes para ${config.nombre} fueron guardados exclusivamente para la Unidad ${activeBusDisco}.`,
    });
    setModoConfigurarCombo(false);
  };

  const handleGuardarEstacionServicio = () => {
    if (estacionCodigosSeleccionados.length === 0) {
      toast({
        title: 'Selecciona al menos un ítem',
        description: 'Debes marcar al menos un componente realizado en esta estación.',
        variant: 'destructive',
      });
      return;
    }

    const kmTablero = parseInt(estacionKm || '', 10) || kmActual;
    const today = new Date().toISOString().split('T')[0];
    let kmServicio = kmTablero;
    let fechaFinal = today;
    let esRetro = false;

    if (estacionModoRetroactivo) {
      const odoHist = parseInt(estacionKmServicio || '', 10);
      if (isNaN(odoHist) || odoHist <= 0) {
        toast({
          title: 'Kilometraje histórico inválido',
          description: 'Ingresa el kilometraje en que se realizó el cambio en taller.',
          variant: 'destructive',
        });
        return;
      }
      if (odoHist > kmTablero) {
        toast({
          title: 'Kilometraje inconsistente',
          description: `El cambio (${odoHist.toLocaleString()} km) no puede ser mayor al odómetro actual (${kmTablero.toLocaleString()} km).`,
          variant: 'destructive',
        });
        return;
      }
      kmServicio = odoHist;
      fechaFinal = estacionFechaServicio || today;
      esRetro = odoHist < kmTablero || fechaFinal < today;
    }

    // Regla inmutable: el odómetro del bus nunca retrocede
    if (kmTablero > kmActual) {
      saveBusOdometer(activeBusDisco, kmTablero.toString(), 'Taller ' + config.nombre);
    }

    const costoTotal = parseFloat(estacionCosto) || 0;
    const tallerStr = estacionTaller.trim() || config.nombre;
    const facturaRef = estacionFactura.trim();

    const catalogo = getCatalogoMaestroGlobal();
    const mapCatalogo = new Map<string, MantenimientoCatalogoItem>(catalogo.map(c => [c.codigo, c]));
    const codigosSet = new Set(estacionCodigosSeleccionados);
    const codigosExistentesEnBus = new Set(items.map(it => it.codigo));

    // Actualizar ítems existentes
    const itemsActualizados = items.map(it => {
      if (it.codigo && codigosSet.has(it.codigo)) {
        return {
          ...it,
          ultimoKm: kmServicio,
          fechaUltimo: fechaFinal,
          tallerMecanico: tallerStr,
          costoEstimado: costoTotal > 0 ? Math.round(costoTotal / codigosSet.size) : it.costoEstimado,
        };
      }
      return it;
    });

    // Incorporar ítems seleccionados no existentes
    const itemsNuevosParaAgregar: MantenimientoBusItem[] = [];
    estacionCodigosSeleccionados.forEach(cod => {
      if (!codigosExistentesEnBus.has(cod)) {
        const catItem = mapCatalogo.get(cod);
        if (catItem) {
          itemsNuevosParaAgregar.push({
            id: `mbus-${catItem.id}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            catalogoId: catItem.id,
            codigo: catItem.codigo,
            nombre: catItem.nombre,
            categoria: catItem.categoria,
            intervaloKm: catItem.intervaloKmOficial,
            ultimoKm: kmServicio,
            fechaUltimo: fechaFinal,
            costoEstimado: costoTotal > 0 ? Math.round(costoTotal / codigosSet.size) : 40,
            repuestoDetalle: catItem.especificacionLubricanteRepuesto,
            tallerMecanico: tallerStr,
            asignadoChofer: catItem.asignadoChoferPorDefecto,
            activo: true,
          });
        }
      }
    });

    const listaFinal = [...itemsActualizados, ...itemsNuevosParaAgregar];
    saveItems(listaFinal);

    // Contabilidad y Parada
    try {
      const categoriaContable = getCategoriaContablePorEstacion(estacionId);
      const nombresRealizados = estacionCodigosSeleccionados
        .map(c => mapCatalogo.get(c)?.nombre || c)
        .slice(0, 3)
        .join(', ');

      const expenseId = `exp-mnt-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
      let paidAmount = 0;
      let pendingBalance = 0;
      let expenseStatus: 'PAGADO' | 'PENDIENTE' = 'PAGADO';
      let abonosList: PaymentAbono[] | undefined = undefined;
      let modalidadDesc = '';
      let socioModalidad: SocioModalidadPago = 'TRANSFERENCIA_TOTAL';

      if (costoTotal > 0) {
        if (estacionModalidadPago === 'PAGO_TOTAL') {
          paidAmount = costoTotal;
          pendingBalance = 0;
          expenseStatus = 'PAGADO';
          modalidadDesc = 'Pago Total 100%';
          socioModalidad = 'TRANSFERENCIA_TOTAL';
        } else if (estacionModalidadPago === 'PAGO_PARCIAL') {
          const abonoNum = parseFloat(estacionMontoAbono || '0') || 0;
          paidAmount = Math.min(costoTotal, Math.max(0, abonoNum));
          pendingBalance = Math.max(0, Math.round((costoTotal - paidAmount) * 100) / 100);
          expenseStatus = pendingBalance <= 0 ? 'PAGADO' : 'PENDIENTE';
          modalidadDesc = `Anticipo Abonado (${paidAmount.toFixed(2)})`;
          socioModalidad = 'TRANSFERENCIA_PARCIAL';
          if (paidAmount > 0) {
            abonosList = [
              {
                id: 'ABO-' + Date.now(),
                date: today,
                amount: paidAmount,
                paymentMethod: estacionMetodoPago,
                notes: 'Anticipo inicial registrado en parada de taller',
                createdAt: new Date().toISOString(),
              },
            ];
          }
        } else {
          // CREDITO_FIADO
          paidAmount = 0;
          pendingBalance = costoTotal;
          expenseStatus = 'PENDIENTE';
          modalidadDesc = 'Crédito Fiado Taller';
          socioModalidad = 'CREDITO_FIADO';
        }

        saveOwnerExpense({
          id: expenseId,
          busId: activeBusId,
          expenseDate: fechaFinal,
          createdAt: new Date().toISOString(),
          category: categoriaContable,
          description: `Taller ${config.nombre}: ${nombresRealizados}${
            estacionCodigosSeleccionados.length > 3 ? '...' : ''
          }`,
          totalAmount: costoTotal,
          paymentMethod: estacionMetodoPago,
          provider: tallerStr,
          comprobanteRef: facturaRef || undefined,
          status: expenseStatus,
          paidAmount,
          pendingBalance,
          abonos: abonosList,
          origenPago: 'SOCIO_DIRECTO',
          descontadoEnRuta: false,
        });

        saveOwnerExpenseToApi({
          id: expenseId,
          busId: activeBusId,
          expenseDate: fechaFinal,
          createdAt: new Date().toISOString(),
          category: categoriaContable,
          description: `Taller ${config.nombre}: ${nombresRealizados}${
            estacionCodigosSeleccionados.length > 3 ? '...' : ''
          }`,
          totalAmount: costoTotal,
          paymentMethod: estacionMetodoPago,
          provider: tallerStr,
          comprobanteRef: facturaRef || undefined,
          status: expenseStatus,
          paidAmount,
          pendingBalance,
          abonos: abonosList,
          origenPago: 'SOCIO_DIRECTO',
          descontadoEnRuta: false,
        }).catch(err => console.error('Error background sync expense:', err));
      }

      saveParadaPago({
        id: `parada-${Date.now()}`,
        disco: activeBusId.replace(/^BUS-/i, ''),
        busId: activeBusId,
        fecha: fechaFinal,
        estacionId,
        estacionNombre: config.nombre,
        costoTotal,
        taller: tallerStr,
        factura: facturaRef || undefined,
        socioModalidad,
        socioMontoTransferido: paidAmount,
        socioSaldoPendiente: pendingBalance,
        odometroKm: kmTablero,
        odometroServicio: kmServicio,
        odometroActualBus: kmTablero,
        esRetroactivo: esRetro,
        kmRodadosDesdeServicio: esRetro ? Math.max(0, kmTablero - kmServicio) : 0,
        codigosMantenimiento: estacionCodigosSeleccionados,
        itemsRealizados: nombresRealizados ? [nombresRealizados] : [],
        pagador: 'SOCIO',
        ownerExpenseId: expenseId,
        descontadoEnVT: false,
        createdAt: new Date().toISOString(),
      });

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('rg_paradas_pago_updated'));
        window.dispatchEvent(new Event('rg_owner_expenses_sync'));
      }
    } catch (err) {
      console.error('Error guardando parada de taller:', err);
    }

    toast({
      title: `Parada Asentada en ${config.nombre} 🛠️`,
      description: `Unidad ${activeBusDisco}: ${estacionCodigosSeleccionados.length} componentes actualizados a ${kmServicio.toLocaleString()} km.`,
    });

    if (onServicioGuardado) onServicioGuardado();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-200 border border-slate-200">
        {/* Header Modal Estación con Selector de Modo */}
        <div className="flex flex-col gap-2.5 border-b pb-3 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-slate-900 flex items-center justify-center text-xl shadow-xs text-white">
                {config.icono}
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 leading-tight">
                  Estación: {config.nombre}
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">
                  {modoConfigurarCombo
                    ? 'Configura los componentes que aplican por defecto a tu unidad'
                    : config.subtitulo}
                </p>
              </div>
            </div>
            <Badge className="bg-slate-900 text-amber-400 text-[10px] font-black border-0">
              {modoConfigurarCombo
                ? `${Object.values(comboUnidadChecks).filter(Boolean).length}/${comboUnidadItems.length} activos`
                : `${totalSeleccionados}/${comboUnidadItems.length} marcados`}
            </Badge>
          </div>

          {/* Tabs de Modo: Asentar Servicio vs Configurar Receta de Unidad */}
          <div className="flex p-1 bg-slate-100 rounded-xl gap-1">
            <button
              type="button"
              onClick={() => setModoConfigurarCombo(false)}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-black transition-all cursor-pointer ${
                !modoConfigurarCombo
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              🛠️ Asentar Parada de Taller
            </button>
            <button
              type="button"
              onClick={() => setModoConfigurarCombo(true)}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-black transition-all cursor-pointer ${
                modoConfigurarCombo
                  ? 'bg-amber-400 text-slate-950 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              ⚙️ Mi Receta Oficial (Socio)
            </button>
          </div>
        </div>

        {/* Contenido con scroll táctil */}
        <div className="space-y-4 flex-1 overflow-y-auto pr-1">
          {/* VISTA 1: MODO CONFIGURADOR DE RECETA DE UNIDAD (SOCIO) */}
          {modoConfigurarCombo ? (
            <div className="space-y-3.5 animate-in fade-in duration-150">
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-xs text-amber-950">
                <p className="font-extrabold flex items-center gap-1.5 text-amber-900">
                  <span>🚌</span> Receta Oficial para Unidad {activeBusDisco}
                </p>
                <p className="text-[11px] text-amber-800 mt-1 leading-relaxed">
                  Marca los ítems que <strong>exiges</strong> que se hagan en tu autobús al parar en esta estación. Los que dejes marcados le aparecerán preseleccionados al chofer en su celular.
                </p>
              </div>

              {/* Lista de Items con Checkbox editable para el socio */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] font-black text-slate-800 uppercase tracking-wider">
                    Componentes de la Estación ({comboUnidadItems.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const todosActivos = comboUnidadItems.every(it => comboUnidadChecks[it.codigo]);
                      const nuevoMap: Record<string, boolean> = {};
                      comboUnidadItems.forEach(it => {
                        nuevoMap[it.codigo] = !todosActivos;
                      });
                      setComboUnidadChecks(nuevoMap);
                    }}
                    className="text-[10px] font-bold text-amber-700 hover:text-amber-900 cursor-pointer"
                  >
                    {comboUnidadItems.every(it => comboUnidadChecks[it.codigo])
                      ? 'Desmarcar todos'
                      : 'Marcar todos'}
                  </button>
                </div>

                <div className="flex flex-col gap-1.5 max-h-60 overflow-y-auto p-1 bg-slate-50 rounded-2xl border border-slate-200">
                  {comboUnidadItems.map(it => {
                    const estaActivo = !!comboUnidadChecks[it.codigo];
                    const esExtra = comboUnidadExtras.includes(it.codigo);
                    const esProtegido = isItemProtegidoReceta(estacionId, it.codigo);
                    return (
                      <div
                        key={it.codigo}
                        className={`flex items-center gap-2 p-2 rounded-xl text-left transition-all border ${
                          estaActivo
                            ? 'bg-white border-amber-500/80 shadow-xs'
                            : 'bg-slate-100/50 border-slate-200 opacity-60 hover:opacity-100'
                        }`}
                      >
                        <div
                          onClick={() => {
                            setComboUnidadChecks(prev => ({
                              ...prev,
                              [it.codigo]: !prev[it.codigo],
                            }));
                          }}
                          className="flex items-start gap-2.5 flex-1 min-w-0 cursor-pointer"
                        >
                          <div
                            className={`w-4 h-4 rounded-md mt-0.5 flex items-center justify-center shrink-0 border ${
                              estaActivo
                                ? 'bg-amber-500 border-amber-500 text-slate-950 font-black'
                                : 'border-slate-300 bg-white'
                            }`}
                          >
                            {estaActivo && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <span
                                className={`text-xs font-bold truncate ${
                                  estaActivo ? 'text-slate-900' : 'text-slate-500'
                                }`}
                              >
                                {it.nombre}
                              </span>
                              <div className="flex items-center gap-1 shrink-0">
                                {esExtra ? (
                                  <Badge className="bg-purple-100 text-purple-900 border-0 text-[8px] py-0 px-1 font-black shrink-0">
                                    Añadido por Socio
                                  </Badge>
                                ) : esProtegido ? (
                                  <Badge className="bg-emerald-100 text-emerald-900 border border-emerald-300 text-[8px] py-0 px-1 font-black shrink-0">
                                    Vital Motor
                                  </Badge>
                                ) : it.preMarcado ? (
                                  <Badge className="bg-slate-200 text-slate-800 border-0 text-[8px] py-0 px-1 font-bold shrink-0">
                                    Base Taller
                                  </Badge>
                                ) : (
                                  <Badge className="bg-slate-100 text-slate-500 border-0 text-[8px] py-0 px-1 font-medium shrink-0">
                                    Opcional
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                              <span>Ciclo: {(it.intervaloKm || 0).toLocaleString()} km</span>
                              {it.opcionalTexto && (
                                <span className="text-slate-400 italic truncate">
                                  • {it.opcionalTexto}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Botón Quitar de la Receta */}
                        {esProtegido ? (
                          <div
                            title="Filtro vital para la vida del motor Hino AK (Protegido)"
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 shrink-0 cursor-not-allowed"
                          >
                            <ShieldCheck className="w-4 h-4 text-emerald-600/70" />
                          </div>
                        ) : (
                          <button
                            type="button"
                            title={`Quitar ${it.nombre} de la receta de esta unidad`}
                            onClick={e => {
                              e.stopPropagation();
                              handleQuitarItemReceta(it.codigo, it.nombre);
                            }}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-rose-500 hover:text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors shrink-0 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Añadir Ítem Adicional del Catálogo Maestro al Combo */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-[11px] font-black text-slate-800 flex items-center gap-1">
                    <Plus className="w-3 h-3 text-amber-600" />
                    ¿Deseas agregar otro ítem del catálogo a este combo?
                  </Label>
                </div>
                <div className="flex gap-1.5">
                  <Input
                    placeholder="Buscar repuesto o trabajo en catálogo..."
                    value={busquedaExtraModal}
                    onChange={e => setBusquedaExtraModal(e.target.value)}
                    className="h-8 rounded-xl text-xs bg-white border-slate-300"
                  />
                </div>

                {busquedaExtraModal.trim().length > 1 &&
                  (() => {
                    const catalogo = getCatalogoMaestroGlobal();
                    const q = busquedaExtraModal.toLowerCase().trim();
                    const resultados = catalogo
                      .filter(
                        c =>
                          c.nombre.toLowerCase().includes(q) ||
                          c.codigo.toLowerCase().includes(q)
                      )
                      .slice(0, 5);

                    if (resultados.length === 0) {
                      return (
                        <p className="text-[10px] text-slate-400 italic px-1">
                          No hay coincidencias en el catálogo maestro.
                        </p>
                      );
                    }

                    return (
                      <div className="flex flex-col gap-1 max-h-36 overflow-y-auto pt-1">
                        {resultados.map(cat => {
                          const yaEsta = comboUnidadItems.some(it => it.codigo === cat.codigo);
                          return (
                            <div
                              key={cat.codigo}
                              className="flex items-center justify-between p-1.5 bg-white rounded-lg border border-slate-200 text-xs"
                            >
                              <div className="min-w-0 pr-2">
                                <span className="font-bold text-slate-900 block truncate text-[11px]">
                                  {cat.nombre}
                                </span>
                                <span className="text-[9px] text-slate-400">
                                  {(cat.intervaloKmOficial || 5000).toLocaleString()} km •{' '}
                                  {cat.categoria}
                                </span>
                              </div>
                              <button
                                type="button"
                                disabled={yaEsta}
                                onClick={() => handleAgregarItemExtraACombo(cat.codigo)}
                                className={`py-1 px-2 rounded-md text-[10px] font-bold shrink-0 cursor-pointer ${
                                  yaEsta
                                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                    : 'bg-amber-400 hover:bg-amber-500 text-slate-950 shadow-xs'
                                }`}
                              >
                                {yaEsta ? 'Agregado' : '+ Agregar'}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
              </div>
            </div>
          ) : (
            /* VISTA 2: ASENTAMIENTO REGULAR DE PARADA DE TALLER */
            <>
              {/* Selector de Ítems / Checklist */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-black text-slate-900 uppercase tracking-wider">
                    Componentes Atendidos en esta Parada
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (totalSeleccionados === comboUnidadItems.length) {
                        setEstacionCodigosSeleccionados([]);
                      } else {
                        setEstacionCodigosSeleccionados(comboUnidadItems.map(it => it.codigo));
                      }
                    }}
                    className="text-[10px] font-bold text-blue-600 hover:text-blue-800 cursor-pointer"
                  >
                    {totalSeleccionados === comboUnidadItems.length
                      ? 'Desmarcar todos'
                      : 'Marcar todos'}
                  </button>
                </div>

                <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto p-1 bg-slate-50 rounded-2xl border border-slate-200">
                  {comboUnidadItems.map(it => {
                    const estaMarcado = estacionCodigosSeleccionados.includes(it.codigo);
                    return (
                      <button
                        key={it.codigo}
                        type="button"
                        onClick={() => handleToggleItemEstacion(it.codigo)}
                        className={`flex items-start gap-2.5 p-2 rounded-xl text-left transition-all cursor-pointer border ${
                          estaMarcado
                            ? 'bg-white border-emerald-500/80 shadow-xs'
                            : 'bg-transparent border-transparent hover:bg-slate-100/80 opacity-75'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded-md mt-0.5 flex items-center justify-center shrink-0 border ${
                            estaMarcado
                              ? 'bg-emerald-600 border-emerald-600 text-white'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {estaMarcado && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span
                              className={`text-xs font-bold truncate ${
                                estaMarcado ? 'text-slate-900' : 'text-slate-600'
                              }`}
                            >
                              {it.nombre}
                            </span>
                            {it.preMarcado && (
                              <Badge className="bg-amber-100 text-amber-900 border-0 text-[9px] py-0 px-1 font-black shrink-0">
                                Vital
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                            <span>Ciclo: {(it.intervaloKm || 0).toLocaleString()} km</span>
                            {it.opcionalTexto && (
                              <span className="text-slate-400 italic truncate">
                                • {it.opcionalTexto}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Formulario de Factura, Odómetro y Taller */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <Label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Odómetro Actual del Bus (Km)
                  </Label>
                  <Input
                    type="number"
                    value={estacionKm}
                    onChange={e => setEstacionKm(e.target.value)}
                    placeholder={kmActual.toString()}
                    className="h-10 rounded-xl text-xs bg-slate-50 border-slate-300 font-bold"
                  />
                </div>
                <div>
                  <Label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Costo Total Parada ($)
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={estacionCosto}
                    onChange={e => setEstacionCosto(e.target.value)}
                    placeholder="0.00"
                    className="h-10 rounded-xl text-xs bg-slate-50 border-slate-300 font-bold text-emerald-800"
                  />
                </div>
              </div>

              {/* Enlace sutil de regularización retroactiva (Socio) */}
              <div className="bg-amber-50/60 border border-amber-200/70 rounded-2xl p-2.5">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      const nuevo = !estacionModoRetroactivo;
                      setEstacionModoRetroactivo(nuevo);
                      if (nuevo && (!estacionKmServicio || estacionKmServicio === estacionKm)) {
                        setEstacionKmServicio(estacionKm || kmActual.toString());
                      }
                    }}
                    className="text-[11px] font-bold text-amber-900 hover:text-amber-950 flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <span>⏱️ ¿Se realizó antes?</span>
                    <span className="underline decoration-amber-600 underline-offset-2">
                      {estacionModoRetroactivo
                        ? 'Ocultar regularización (Hoy)'
                        : 'Toca aquí para regularizar fecha o km'}
                    </span>
                  </button>
                </div>

                {estacionModoRetroactivo &&
                  (() => {
                    const odoBus = parseInt(estacionKm || '', 10) || kmActual;
                    const odoServicio = parseInt(estacionKmServicio || '', 10) || 0;
                    const primerItem = comboUnidadItems[0];
                    const intervaloRef = primerItem?.intervaloKm || 5000;
                    const calculo = calcularDesgasteRegularizacion(
                      odoBus,
                      odoServicio,
                      intervaloRef
                    );

                    return (
                      <div className="mt-2 pt-2.5 border-t border-amber-300/60 space-y-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase tracking-wider text-amber-950 flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-amber-700" /> Regularizar Servicio Anterior
                          </span>
                          <Badge className="bg-amber-200 text-amber-900 border-amber-300 text-[9px] font-black">
                            Cálculo en Vivo
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-[10px] font-black text-slate-700 block mb-1">
                              Km al momento del cambio *
                            </Label>
                            <Input
                              type="number"
                              value={estacionKmServicio}
                              onChange={e => setEstacionKmServicio(e.target.value)}
                              placeholder="ej. 892491"
                              className="h-9 rounded-xl text-xs font-black bg-white border-amber-300"
                            />
                          </div>
                          <div>
                            <Label className="text-[10px] font-black text-slate-700 block mb-1">
                              Fecha del servicio *
                            </Label>
                            <Input
                              type="date"
                              value={estacionFechaServicio}
                              onChange={e => setEstacionFechaServicio(e.target.value)}
                              className="h-9 rounded-xl text-xs font-bold bg-white border-amber-300"
                            />
                          </div>
                        </div>

                        {odoServicio > 0 && (
                          <div
                            className={
                              'p-2.5 rounded-xl border text-xs leading-relaxed ' +
                              (calculo.esInvalido
                                ? 'bg-rose-50 border-rose-300 text-rose-900 font-bold'
                                : calculo.esVencido
                                ? 'bg-amber-100 border-amber-400 text-amber-950'
                                : 'bg-emerald-50 border-emerald-300 text-emerald-950')
                            }
                          >
                            {calculo.esInvalido ? (
                              <div className="flex items-start gap-1.5">
                                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                                <div>
                                  <p className="font-black text-[11px] text-rose-800">
                                    Kilometraje Inválido
                                  </p>
                                  <p className="text-[10px] text-rose-700 font-medium">
                                    {calculo.mensajeError}
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-1">
                                <div className="flex items-center justify-between font-black text-[11px]">
                                  <span className="flex items-center gap-1 text-emerald-800">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />✓ Hace{' '}
                                    {calculo.kmRodados.toLocaleString()} km
                                  </span>
                                  <span className="text-emerald-900 bg-emerald-200/80 px-2 py-0.5 rounded-full text-[10px]">
                                    Restan {calculo.kmRestantes.toLocaleString()} km (
                                    {calculo.porcentajeRestante}%)
                                  </span>
                                </div>
                                <p className="text-[10px] text-slate-600 font-medium">
                                  • El odómetro del autobús se mantendrá en{' '}
                                  <strong>{odoBus.toLocaleString()} km</strong>
                                </p>
                                {calculo.advertencia && (
                                  <p className="text-[10px] text-amber-800 font-bold mt-1">
                                    {calculo.advertencia}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <Label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Taller / Proveedor
                  </Label>
                  <Input
                    value={estacionTaller}
                    onChange={e => setEstacionTaller(e.target.value)}
                    placeholder="Nombre del taller o lubricadora"
                    className="h-9 rounded-xl text-xs bg-slate-50 border-slate-300"
                  />
                </div>
                <div>
                  <Label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Nº Factura / Nota Venta
                  </Label>
                  <Input
                    value={estacionFactura}
                    onChange={e => setEstacionFactura(e.target.value)}
                    placeholder="ej. 001-002-9842"
                    className="h-9 rounded-xl text-xs bg-slate-50 border-slate-300"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[11px] font-bold text-slate-700 block">
                  Modalidad Contable de Pago (Socio)
                </Label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setEstacionModalidadPago('PAGO_TOTAL')}
                    className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                      estacionModalidadPago === 'PAGO_TOTAL'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-950 ring-1 ring-emerald-500'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-1 font-bold text-xs">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      Pago Total
                    </div>
                    <span className="text-[10px] text-slate-500 leading-tight block mt-0.5">
                      100% Pagado
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEstacionModalidadPago('PAGO_PARCIAL')}
                    className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                      estacionModalidadPago === 'PAGO_PARCIAL'
                        ? 'bg-amber-50 border-amber-500 text-amber-950 ring-1 ring-amber-500'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-1 font-bold text-xs">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      Anticipo
                    </div>
                    <span className="text-[10px] text-slate-500 leading-tight block mt-0.5">
                      Parte Fiada
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEstacionModalidadPago('CREDITO_FIADO')}
                    className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                      estacionModalidadPago === 'CREDITO_FIADO'
                        ? 'bg-rose-50 border-rose-500 text-rose-950 ring-1 ring-rose-500'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-1 font-bold text-xs">
                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                      Saco Fiado
                    </div>
                    <span className="text-[10px] text-slate-500 leading-tight block mt-0.5">
                      100% Crédito
                    </span>
                  </button>
                </div>

                {estacionModalidadPago === 'PAGO_PARCIAL' && (
                  <div className="p-2.5 bg-amber-50/70 border border-amber-200 rounded-xl space-y-1.5">
                    <Label className="text-[11px] font-bold text-amber-900 block">
                      Monto que Transfieres / Pagas Hoy ($)
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={estacionMontoAbono}
                      onChange={e => setEstacionMontoAbono(e.target.value)}
                      placeholder="ej. 50.00"
                      className="h-8 rounded-xl text-xs bg-white border-amber-300 font-bold"
                    />
                    <p className="text-[10px] text-amber-800">
                      Saldo restante de $
                      {(
                        Math.max(
                          0,
                          (parseFloat(estacionCosto || '0') || 0) -
                            (parseFloat(estacionMontoAbono || '0') || 0)
                        )
                      ).toFixed(2)}{' '}
                      irá a tu Cartera de Deudas por Pagar con sello ámbar.
                    </p>
                  </div>
                )}

                {estacionModalidadPago !== 'CREDITO_FIADO' && (
                  <div>
                    <Label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Vía de Pago del Desembolso
                    </Label>
                    <div className="flex gap-2">
                      {(['EFECTIVO', 'TRANSFERENCIA'] as const).map(m => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setEstacionMetodoPago(m)}
                          className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                            estacionMetodoPago === m
                              ? 'bg-slate-900 text-white border-slate-900'
                              : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          {m === 'EFECTIVO' ? '💵 Efectivo' : '🏦 Transferencia Bancaria'}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Resumen Contable */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] text-slate-600 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-slate-900">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  Asentamiento de Datos:
                </div>
                <p>• Resetea {totalSeleccionados} componentes con el kilometraje ingresado.</p>
                <p>
                  • Se asienta contablemente en{' '}
                  <strong>{getCategoriaContablePorEstacion(estacionId)}</strong> y se sincroniza en
                  tu <strong>Cartera de Deudas con Talleres</strong>.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Botones de Acción Adaptables por Modo */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-100 shrink-0">
          {modoConfigurarCombo ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={handleRestablecerComboBase}
                className="h-10 rounded-xl text-xs font-bold text-slate-600 border-slate-300 hover:bg-slate-100 flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Por Defecto
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                className="flex-1 h-10 rounded-xl text-xs font-bold text-gray-600 cursor-pointer"
              >
                Cerrar
              </Button>
              <Button
                type="button"
                disabled={!isOnline}
                onClick={handleGuardarRecetaCombo}
                className={`flex-1 h-10 rounded-xl font-black text-xs shadow-md flex items-center justify-center gap-1.5 transition-all ${
                  !isOnline
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300 shadow-none'
                    : 'bg-amber-500 hover:bg-amber-600 text-slate-950 cursor-pointer'
                }`}
              >
                <Save className="w-4 h-4" />
                {isOnline ? 'Guardar Receta' : 'Sin Internet'}
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                className="flex-1 h-10 rounded-xl text-xs font-bold text-gray-600 cursor-pointer"
              >
                Cancelar
              </Button>
              {(() => {
                const odoBus = parseInt(estacionKm || '', 10) || kmActual;
                const odoServicio = parseInt(estacionKmServicio || '', 10) || 0;
                const esInvalido =
                  estacionModoRetroactivo && (odoServicio > odoBus || odoServicio <= 0);
                const primerItem = comboUnidadItems[0];
                const intervaloRef = primerItem?.intervaloKm || 5000;
                const calculo = estacionModoRetroactivo
                  ? calcularDesgasteRegularizacion(odoBus, odoServicio, intervaloRef)
                  : null;

                return (
                  <Button
                    type="button"
                    disabled={esInvalido}
                    onClick={handleGuardarEstacionServicio}
                    className={
                      'flex-1 h-10 rounded-xl font-black text-xs shadow-md flex items-center justify-center gap-1.5 cursor-pointer transition-all ' +
                      (esInvalido
                        ? 'bg-rose-300 text-rose-800 cursor-not-allowed'
                        : 'bg-slate-900 hover:bg-slate-800 text-white')
                    }
                  >
                    {esInvalido ? (
                      <>
                        <AlertTriangle className="w-4 h-4 text-rose-700" />
                        Km Mayor al Tablero (Bloqueado)
                      </>
                    ) : estacionModoRetroactivo && calculo && !calculo.esInvalido ? (
                      <>
                        <Save className="w-4 h-4 text-amber-400" />
                        Calibrar a {calculo.kmRestantes.toLocaleString()} km Restantes
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 text-amber-400" />
                        Asentar en {config.nombre.split(' ')[0]}
                      </>
                    )}
                  </Button>
                );
              })()}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
